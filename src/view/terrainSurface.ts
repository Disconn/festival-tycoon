import { BufferGeometry, Color, DataTexture, Float32BufferAttribute, Mesh, MeshStandardMaterial, NearestFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import type { GameSnapshot } from '../game/GameState'
import { groundInfo } from '../game/ground'
import { getTerrainHeight, isMudHeight, isWaterHeight } from '../game/terrain'
import { TerrainShape } from './terrainShape'

export const TERRAIN_MATERIALS = ['field', 'clay', 'gravel', 'sand', 'grass', 'paved', 'compact', 'mud'] as const
export type TerrainMaterial = typeof TERRAIN_MATERIALS[number]
const PALETTE: Record<TerrainMaterial, number[]> = {
  field: [0x99915e, 0x887b51, 0xa89b6a, 0x7f8755],
  clay: [0xab8764, 0x997354, 0xb5936c, 0x9c8960],
  gravel: [0xa39879, 0x93886f, 0xb0a68a, 0x9b947b],
  sand: [0xd5bc85, 0xc6ac79, 0xe2cc98, 0xcfb67f],
  grass: [0x7d9d59, 0x718e50, 0x90a965, 0x839654],
  paved: [0xaca99b, 0x85877c, 0xbab7a9, 0xa19f91],
  compact: [0xa29473, 0x928365, 0xb0a180, 0x9a8c70],
  mud: [0x766149, 0x67543f, 0x806b51, 0x70624d],
}
const TILE = 64, VARIANTS = 4, WIDTH = TILE * VARIANTS, HEIGHT = TILE * TERRAIN_MATERIALS.length
const BASE_COLORS = Object.fromEntries(TERRAIN_MATERIALS.map(kind => [kind, new Color(PALETTE[kind][0])])) as Record<TerrainMaterial, Color>

function hash(x: number, z: number): number {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/** Continuous broad patches, shared by adjacent corners, avoid a checkerboard of tile tints. */
function patchShade(x: number, z: number): number {
  const gx = Math.floor(x / 5), gz = Math.floor(z / 5)
  const smooth = (v: number) => v * v * (3 - 2 * v)
  const tx = smooth(x / 5 - gx), tz = smooth(z / 5 - gz)
  const a = hash(gx, gz) * (1 - tx) + hash(gx + 1, gz) * tx
  const b = hash(gx, gz + 1) * (1 - tx) + hash(gx + 1, gz + 1) * tx
  return .94 + (a * (1 - tz) + b * tz) * .12
}

export function terrainMaterialAt(s: Readonly<GameSnapshot>, x: number, z: number): TerrainMaterial {
  if (isMudHeight(getTerrainHeight(s.terrain, x, z))) return 'mud'
  const g = groundInfo(s, x, z)
  return g.surface === 'paved' ? 'paved' : g.surface === 'gravel' ? 'gravel' : g.compacted ? 'compact' : g.type === 'urban' ? 'paved' : g.type
}

/** One small deterministic atlas; no DOM canvas, random state, or per-frame texture generation. */
export function createTerrainAtlas(): DataTexture {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4)
  TERRAIN_MATERIALS.forEach((kind, row) => {
    for (let variant = 0; variant < VARIANTS; variant++) {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const n = hash(x + variant * TILE, y + row * TILE)
        let tone = n > .95 ? 2 : n < .10 ? 3 : 0
        if (kind === 'field') {
          // Fine furrows with irregular stubble, not a grid around every tile.
          if (y % 16 === 2 && n > .16) tone = 1
          if (y % 16 === 4 && n > .5) tone = 2
          if (hash(Math.floor(x / 3) + variant * 22, Math.floor(y / 3)) > .89) tone = 3
        } else if (kind === 'grass') {
          const tuft = hash(Math.floor(x / 4) + variant * 16, Math.floor(y / 4))
          if (tuft > .79 && x % 4 === 1 && y % 4 < 3) tone = y % 4 === 0 ? 2 : 1
        } else if (kind === 'sand') {
          if ((y + Math.round(Math.sin(x / 10) * 2)) % 19 === 0) tone = 2
        } else if (kind === 'gravel') {
          tone = Math.floor(hash(Math.floor(x / 2) + variant * 32, Math.floor(y / 2)) * 4)
        } else if (kind === 'paved') {
          if (y % 32 === 0 || (x + (Math.floor(y / 32) % 2) * 16) % 32 === 0) tone = 1
          else if (y % 32 === 1) tone = 2
        } else if (kind === 'clay' || kind === 'mud') {
          if (hash(Math.floor(x / 6) + variant * 11, Math.floor(y / 5)) > .8 && n > .3) tone = 1
        } else if (kind === 'compact' && y % 16 === 0 && n > .6) tone = 1
        const rgb = PALETTE[kind][tone]!
        const at = ((row * TILE + y) * WIDTH + variant * TILE + x) * 4
        pixels[at] = rgb >>> 16; pixels[at + 1] = (rgb >>> 8) & 255; pixels[at + 2] = rgb & 255; pixels[at + 3] = 255
      }
    }
  })
  const texture = new DataTexture(pixels, WIDTH, HEIGHT)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  texture.userData.shared = true
  return texture
}

/** All ground detail is a single static mesh, rebuilt only for terrain/environment/ground-work edits. */
export function createTerrainSurface(s: Readonly<GameSnapshot>, material: MeshStandardMaterial, shape = new TerrainShape(s)): Mesh {
  const positions: number[] = [], colors: number[] = [], uv: number[] = [], indices: number[] = []
  const half = s.scenario.worldSize / 2
  const cells = new Map<string, { kind: TerrainMaterial; height: number; prepared: boolean }>()
  for (let z = -half; z < half; z++) for (let x = -half; x < half; x++) {
    const work = s.festival.infrastructure.ground[`${x},${z}`]
    cells.set(`${x},${z}`, { kind: terrainMaterialAt(s, x, z), height: getTerrainHeight(s.terrain, x, z), prepared: !!(work?.surface || work?.compacted) })
  }
  const tint = new Color()
  for (let z = -half; z < half; z++) for (let x = -half; x < half; x++) {
    const height = getTerrainHeight(s.terrain, x, z)
    const cell = cells.get(`${x},${z}`)!, kind = isWaterHeight(height) ? 'mud' : cell.kind, row = TERRAIN_MATERIALS.indexOf(kind)
    const variant = Math.floor(hash(x, z) * VARIANTS)
    const base = positions.length / 3
    for (const [corner, [dx, dz]] of [[0, 0], [0, 1], [1, 1], [1, 0], [.5, .5]].entries()) {
      const surfaceHeight = corner === 4 ? height : shape.corners[shape.index(x, z) * 4 + corner]!
      positions.push(x + dx!, surfaceHeight + .003, z + dz!)
      const shade = patchShade(x + dx!, z + dz!)
      // Natural soils meet softly at shared corners. Prepared surfaces retain exact construction edges.
      tint.copy(BASE_COLORS[kind])
      let samples = 1
      if (!cell.prepared && corner < 4) {
        for (let nz = z + dz! - 1; nz <= z + dz!; nz++) for (let nx = x + dx! - 1; nx <= x + dx!; nx++) {
          if (nx === x && nz === z) continue
          const neighbor = cells.get(`${nx},${nz}`)
          if (neighbor && !neighbor.prepared) { tint.add(BASE_COLORS[neighbor.kind]); samples++ }
        }
      }
      tint.multiplyScalar(shade / samples)
      const baseColor = BASE_COLORS[kind]
      colors.push(tint.r / baseColor.r, tint.g / baseColor.g, tint.b / baseColor.b)
      // Half-texel inset prevents neighboring atlas materials bleeding into the surface.
      uv.push((variant * TILE + .5 + dx! * (TILE - 1)) / WIDTH, (row * TILE + .5 + dz! * (TILE - 1)) / HEIGHT)
    }
    for (let corner = 0; corner < 4; corner++) indices.push(base + corner, base + (corner + 1) % 4, base + 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  const mesh = new Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

/** Only exposed world borders and unavoidable retaining edges; no cubes poking through slopes. */
export function createTerrainBase(shape: TerrainShape, material: MeshStandardMaterial): Mesh {
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  const edges = [
    { dx: -1, dz: 0, corners: [0, 1], other: [3, 2], points: [[0, 0], [0, 1]] },
    { dx: 0, dz: 1, corners: [1, 2], other: [0, 3], points: [[0, 1], [1, 1]] },
    { dx: 1, dz: 0, corners: [2, 3], other: [1, 0], points: [[1, 1], [1, 0]] },
    { dx: 0, dz: -1, corners: [3, 0], other: [2, 1], points: [[1, 0], [0, 0]] },
  ]
  for (let z = -shape.half; z < shape.half; z++) for (let x = -shape.half; x < shape.half; x++) {
    const i = shape.index(x, z)
    for (const edge of edges) {
      const inside = shape.contains(x + edge.dx, z + edge.dz)
      if (inside && (edge.dx < 0 || edge.dz < 0)) continue
      const neighbor = inside ? shape.index(x + edge.dx, z + edge.dz) : -1
      const a = shape.corners[i * 4 + edge.corners[0]!]!, b = shape.corners[i * 4 + edge.corners[1]!]!
      const c = inside ? shape.corners[neighbor * 4 + edge.other[1]!]! : -4.35
      const d = inside ? shape.corners[neighbor * 4 + edge.other[0]!]! : -4.35
      if (a === d && b === c) continue
      const base = positions.length / 3, p = edge.points[0]!, q = edge.points[1]!
      positions.push(x + p[0]!, a, z + p[1]!, x + q[0]!, b, z + q[1]!, x + q[0]!, c, z + q[1]!, x + p[0]!, d, z + p[1]!)
      uv.push(0, 1, 1, 1, 1, 0, 0, 0)
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  const mesh = new Mesh(geometry, material); mesh.receiveShadow = true
  return mesh
}

export function createTerrainMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ map: createTerrainAtlas(), color: new Color(0xffffff), vertexColors: true, roughness: .95 })
  material.userData.shared = true
  return material
}

export function createEarthTexture(): DataTexture {
  const pixels = new Uint8Array(32 * 32 * 4)
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    // Fine horizontal strata on exposed earth faces; no extra geometry along cliffs.
    const value = Math.round(233 + hash(x, y) * 17 - (y % 8 === 0 ? 16 : 0))
    const i = (y * 32 + x) * 4
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255
  }
  const texture = new DataTexture(pixels, 32, 32)
  texture.colorSpace = SRGBColorSpace; texture.magFilter = NearestFilter
  texture.minFilter = LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true
  return texture
}
