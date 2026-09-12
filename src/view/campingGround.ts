import { DataTexture, NearestFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { createTerrainAtlas, TERRAIN_MATERIALS } from './terrainSurface'

export function campingGrassTexture(): DataTexture {
  const atlas = createTerrainAtlas(), source = atlas.image.data!, pixels = new Uint8Array(64 * 64 * 4)
  const row = TERRAIN_MATERIALS.indexOf('grass') * 64
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) for (let c = 0; c < 4; c++) pixels[(y * 64 + x) * 4 + c] = source[((row + y) * 256 + x) * 4 + c]!
  atlas.dispose()
  const texture = new DataTexture(pixels, 64, 64)
  texture.colorSpace = SRGBColorSpace; texture.magFilter = NearestFilter; texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true; texture.needsUpdate = true
  return texture
}

/** Exterior of the complete area, excluding internal tile seams and enclosed holes. */
export function campingBoundary(cells: readonly { x: number; z: number }[]): Array<{ x: number; z: number; direction: number }> {
  if (!cells.length) return []
  const occupied = new Set(cells.map(c => `${c.x},${c.z}`))
  const minX = Math.min(...cells.map(c => c.x)) - 1, maxX = Math.max(...cells.map(c => c.x)) + 1
  const minZ = Math.min(...cells.map(c => c.z)) - 1, maxZ = Math.max(...cells.map(c => c.z)) + 1
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const
  const outside = new Set([`${minX},${minZ}`]), queue = [{ x: minX, z: minZ }]
  for (let head = 0; head < queue.length; head++) for (const [dx, dz] of directions) {
    const x = queue[head]!.x + dx, z = queue[head]!.z + dz, key = `${x},${z}`
    if (x < minX || x > maxX || z < minZ || z > maxZ || occupied.has(key) || outside.has(key)) continue
    outside.add(key); queue.push({ x, z })
  }
  return cells.flatMap(cell => directions.flatMap(([dx, dz], direction) => outside.has(`${cell.x + dx},${cell.z + dz}`) ? [{ ...cell, direction }] : []))
}
