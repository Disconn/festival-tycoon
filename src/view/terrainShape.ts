import type { GameSnapshot } from '../game/GameState'
import { getTerrainHeight } from '../game/terrain'
import { buildingFootprint } from '../game/stageDesign'
import { isScenery } from '../game/scenery'

/** Flat building pads are presentation constraints; never alter saved terrain/navigation heights. */
export function terrainPads(s: Readonly<GameSnapshot>): Set<string> {
  const pads = new Set<string>()
  const add = (cell: { x: number; z: number }) => pads.add(`${cell.x},${cell.z}`)
  for (const b of s.buildings) if (!isScenery(b.kind)) buildingFootprint(b).forEach(add)
  for (const cells of [s.campingCells, s.medicalCells, s.stageForecourtCells, s.wasteDumpCells,
    s.logistics.roadCells, s.logistics.parkingCells, s.festival.infrastructure.depots]) cells.forEach(add)
  for (const installation of s.campInstallations) add(installation.cell)
  for (const [key, work] of Object.entries(s.festival.infrastructure.ground)) if (work.compacted || work.surface) pads.add(key)
  return pads
}

/** Cached triangle fan per cell: stable centre height, shared natural corners and flat building pads. */
export class TerrainShape {
  readonly size: number
  readonly half: number
  readonly heights: Float64Array
  readonly corners: Float64Array
  readonly flat: Uint8Array
  constructor(s: Readonly<GameSnapshot>, pads = terrainPads(s)) {
    this.size = s.scenario.worldSize; this.half = this.size / 2
    this.heights = new Float64Array(this.size * this.size)
    this.corners = new Float64Array(this.size * this.size * 4)
    this.flat = new Uint8Array(this.size * this.size)
    for (let z = -this.half; z < this.half; z++) for (let x = -this.half; x < this.half; x++) {
      const i = this.index(x, z)
      this.heights[i] = getTerrainHeight(s.terrain, x, z)
      this.flat[i] = pads.has(`${x},${z}`) ? 1 : 0
    }
    const vertices = new Float64Array((this.size + 1) ** 2)
    for (let z = -this.half; z <= this.half; z++) for (let x = -this.half; x <= this.half; x++) {
      let sum = 0, count = 0, padSum = 0, padCount = 0
      for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) {
        if (!this.contains(x + dx, z + dz)) continue
        const i = this.index(x + dx, z + dz), h = this.heights[i]!
        sum += h; count++
        if (this.flat[i]) { padSum += h; padCount++ }
      }
      vertices[(z + this.half) * (this.size + 1) + x + this.half] = padCount ? padSum / padCount : sum / count
    }
    for (let z = -this.half; z < this.half; z++) for (let x = -this.half; x < this.half; x++) {
      const i = this.index(x, z), v = (z + this.half) * (this.size + 1) + x + this.half
      for (const [corner, offset] of [0, this.size + 1, this.size + 2, 1].entries())
        this.corners[i * 4 + corner] = this.flat[i] ? this.heights[i]! : vertices[v + offset]!
    }
  }
  contains(x: number, z: number): boolean { return x >= -this.half && z >= -this.half && x < this.half && z < this.half }
  index(x: number, z: number): number { return (z + this.half) * this.size + x + this.half }
  sample(x: number, z: number): number {
    const cx = Math.floor(x), cz = Math.floor(z)
    if (!this.contains(cx, cz)) return 0
    const i = this.index(cx, cz), h = this.heights[i]!
    if (this.flat[i]) return h
    const u = x - cx, v = z - cz, c = i * 4, a = this.corners
    if (u <= v && u + v <= 1) return 2 * u * h + (1 - u - v) * a[c]! + (v - u) * a[c + 1]!
    if (u <= v) return 2 * (1 - v) * h + (v - u) * a[c + 1]! + (u + v - 1) * a[c + 2]!
    if (u + v >= 1) return 2 * (1 - u) * h + (u + v - 1) * a[c + 2]! + (u - v) * a[c + 3]!
    return 2 * v * h + (u - v) * a[c + 3]! + (1 - u - v) * a[c]!
  }
  actorHeight(x: number, z: number, elevation: number): number {
    const cx = Math.floor(x), cz = Math.floor(z)
    if (!this.contains(cx, cz)) return elevation
    const i = this.index(cx, cz)
    // Paths/buildings and elevated crossings keep their own authoritative surface.
    if (this.flat[i] || Math.abs(elevation - this.heights[i]!) > 1.05) return elevation
    return this.sample(x, z)
  }
}
