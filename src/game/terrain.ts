import { ENVIRONMENTS } from './environments'
import type { Environment } from './environments'
import { BUILDINGS } from './catalog'
import { SIMULATION_CONFIG } from './simulationConfig'
import type { RngSource } from './rng'

export type TerrainTree = {
  id: string
  kind: 'tree'
  x: number
  z: number
  rotation: number
  elevation: number
  price: number
}

export const TERRAIN_MIN = SIMULATION_CONFIG.terrain.minHeight
export const TERRAIN_MAX = SIMULATION_CONFIG.terrain.maxHeight
export const WATER_HEIGHT = SIMULATION_CONFIG.terrain.waterHeight
export const MUD_HEIGHT = SIMULATION_CONFIG.terrain.mudHeight

export type TerrainSnapshot = {
  heights: Record<string, number>
}

export type TerrainEditMode = 'raise' | 'lower' | 'flatten'

export type TerrainChange = {
  x: number
  z: number
  from: number
  to: number
}

const NEIGHBORS = [
  { x: 0, z: 1 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
] as const

export function createEmptyTerrain(): TerrainSnapshot {
  return { heights: {} }
}

export function terrainCellKey(x: number, z: number): string {
  return `${x},${z}`
}

export function normalizeTerrain(
  source?: Partial<TerrainSnapshot> | null,
): TerrainSnapshot {
  const heights: Record<string, number> = {}
  if (source?.heights && typeof source.heights === 'object') {
    for (const [key, value] of Object.entries(source.heights)) {
      if (!Number.isFinite(value)) continue
      const height = Math.round(value)
      if (height === 0) continue
      heights[key] = Math.max(TERRAIN_MIN, Math.min(TERRAIN_MAX, height))
    }
  }
  return { heights }
}

export function getTerrainHeight(
  terrain: TerrainSnapshot | undefined,
  x: number,
  z: number,
): number {
  return terrain?.heights[terrainCellKey(x, z)] ?? 0
}

export function setTerrainHeight(
  terrain: TerrainSnapshot,
  x: number,
  z: number,
  height: number,
): void {
  const clamped = Math.max(TERRAIN_MIN, Math.min(TERRAIN_MAX, Math.round(height)))
  const key = terrainCellKey(x, z)
  if (clamped === 0) delete terrain.heights[key]
  else terrain.heights[key] = clamped
}

export function isWaterHeight(height: number): boolean {
  return height <= WATER_HEIGHT
}

export function isMudHeight(height: number): boolean {
  return height === MUD_HEIGHT
}

export function terrainFingerprint(terrain: TerrainSnapshot | undefined): string {
  if (!terrain) return ''
  return Object.entries(terrain.heights)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, height]) => `${key}:${height}`)
    .join('|')
}

export function isInTerrainWorld(
  x: number,
  z: number,
  worldSize: number,
): boolean {
  const half = worldSize / 2
  return x >= -half && x < half && z >= -half && z < half
}

function applyPendingHeight(
  terrain: TerrainSnapshot,
  pending: Map<string, number>,
  x: number,
  z: number,
): number {
  return pending.get(terrainCellKey(x, z)) ?? getTerrainHeight(terrain, x, z)
}

export function planTerrainEdit(
  terrain: TerrainSnapshot,
  worldSize: number,
  x: number,
  z: number,
  mode: TerrainEditMode,
  isProtected: (cellX: number, cellZ: number) => boolean,
): { ok: false; message: string } | { ok: true; changes: TerrainChange[] } {
  if (!isInTerrainWorld(x, z, worldSize)) {
    return { ok: false, message: 'Außerhalb des Geländes' }
  }
  const current = getTerrainHeight(terrain, x, z)
  const desired =
    mode === 'raise' ? current + 1 : mode === 'lower' ? current - 1 : 0
  if (desired < TERRAIN_MIN) {
    return { ok: false, message: 'Tiefer geht das Gelände nicht' }
  }
  if (desired > TERRAIN_MAX) {
    return { ok: false, message: 'Höher geht das Gelände nicht' }
  }
  if (desired === current) {
    return {
      ok: false,
      message:
        mode === 'flatten'
          ? 'Dieses Feld ist bereits eben'
          : 'Das Gelände ändert sich hier nicht',
    }
  }
  if (isProtected(x, z)) {
    return {
      ok: false,
      message: 'Unter bebauten Flächen kann das Gelände nicht verändert werden',
    }
  }

  const pending = new Map<string, number>()
  const queue: Array<{ x: number; z: number; target: number }> = [
    { x, z, target: desired },
  ]

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next || !isInTerrainWorld(next.x, next.z, worldSize)) continue
    const from = applyPendingHeight(terrain, pending, next.x, next.z)
    const target = Math.max(TERRAIN_MIN, Math.min(TERRAIN_MAX, next.target))
    if (target === from) continue
    if (isProtected(next.x, next.z)) continue
    pending.set(terrainCellKey(next.x, next.z), target)
    for (const offset of NEIGHBORS) {
      const neighborX = next.x + offset.x
      const neighborZ = next.z + offset.z
      if (!isInTerrainWorld(neighborX, neighborZ, worldSize)) continue
      const neighborHeight = applyPendingHeight(
        terrain,
        pending,
        neighborX,
        neighborZ,
      )
      if (neighborHeight < target - 1) {
        queue.push({ x: neighborX, z: neighborZ, target: target - 1 })
      } else if (neighborHeight > target + 1) {
        queue.push({ x: neighborX, z: neighborZ, target: target + 1 })
      }
    }
  }

  const startHeight = pending.get(terrainCellKey(x, z))
  if (startHeight === undefined || startHeight === current) {
    return {
      ok: false,
      message: 'Nachbarfelder blockieren diese Höhenänderung',
    }
  }

  const changes: TerrainChange[] = []
  pending.forEach((to, key) => {
    const [cellX, cellZ] = key.split(',').map(Number)
    if (!Number.isFinite(cellX) || !Number.isFinite(cellZ)) return
    const from = getTerrainHeight(terrain, cellX, cellZ)
    if (from === to) return
    changes.push({ x: cellX, z: cellZ, from, to })
  })
  if (changes.length === 0) {
    return { ok: false, message: 'Das Gelände ändert sich hier nicht' }
  }
  return { ok: true, changes }
}

export function applyTerrainChanges(
  terrain: TerrainSnapshot,
  changes: readonly TerrainChange[],
): void {
  changes.forEach((change) => {
    setTerrainHeight(terrain, change.x, change.z, change.to)
  })
}

function randomInt(rng: RngSource, min: number, max: number): number {
  return min + rng.nextInt(max - min + 1)
}

export function generateTerrain(
  worldSize: number,
  rng: RngSource,
  unevenness = .5,
  environment: Environment = 'farmland',
): TerrainSnapshot {
  const terrain = createEmptyTerrain()
  if (unevenness <= 0) return terrain
  const half = worldSize / 2
  const blobCount = 5 + Math.floor(worldSize / 14)
  for (let index = 0; index < blobCount; index += 1) {
    const centerX = randomInt(rng, -half + 4, half - 5)
    const centerZ = randomInt(rng, -half + 6, half - 5)
    const peaks = [-3, -2, -2, -1, 1, 2, 2, 3, 4]
    const peak = peaks[randomInt(rng, 0, peaks.length - 1)] ?? 2
    const radius = randomInt(rng, 3, 8)
    for (let z = centerZ - radius; z <= centerZ + radius; z += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (!isInTerrainWorld(x, z, worldSize)) continue
        const distance = Math.hypot(x - centerX, z - centerZ)
        if (distance > radius) continue
        const strength = 1 - distance / radius
        const height = Math.round((environment === 'desert' || environment === 'urban' ? Math.abs(peak) : peak) * strength * Math.min(2, Math.max(0, unevenness * 2)))
        if (height === 0) continue
        const existing = getTerrainHeight(terrain, x, z)
        setTerrainHeight(
          terrain,
          x,
          z,
          peak > 0 ? Math.max(existing, height) : Math.min(existing, height),
        )
      }
    }
  }
  enforceSlope(terrain, worldSize)
  flattenEntrance(terrain, worldSize)
  return terrain
}

function enforceSlope(terrain: TerrainSnapshot, worldSize: number): void {
  const half = worldSize / 2
  let changed = true
  let guard = 0
  while (changed && guard < worldSize * 8) {
    changed = false
    guard += 1
    for (let z = -half; z < half; z += 1) {
      for (let x = -half; x < half; x += 1) {
        const height = getTerrainHeight(terrain, x, z)
        for (const offset of NEIGHBORS) {
          const neighborX = x + offset.x
          const neighborZ = z + offset.z
          if (!isInTerrainWorld(neighborX, neighborZ, worldSize)) continue
          const neighbor = getTerrainHeight(terrain, neighborX, neighborZ)
          if (height > neighbor + 1) {
            setTerrainHeight(terrain, neighborX, neighborZ, height - 1)
            changed = true
          } else if (neighbor > height + 1) {
            setTerrainHeight(terrain, x, z, neighbor - 1)
            changed = true
          }
        }
      }
    }
  }
}

function flattenEntrance(terrain: TerrainSnapshot, worldSize: number): void {
  const half = worldSize / 2
  const minZ = -half
  for (let z = minZ; z <= minZ + 2; z += 1) {
    for (let x = -4; x <= 4; x += 1) {
      if (isInTerrainWorld(x, z, worldSize)) {
        setTerrainHeight(terrain, x, z, 0)
      }
    }
  }
  enforceSlope(terrain, worldSize)
  for (let x = -4; x <= 4; x += 1) {
    setTerrainHeight(terrain, x, minZ, 0)
    if (isInTerrainWorld(x, minZ + 1, worldSize)) {
      setTerrainHeight(terrain, x, minZ + 1, 0)
    }
  }
}

export function scatterWildTrees(
  terrain: TerrainSnapshot,
  worldSize: number,
  reserved: ReadonlyArray<{ x: number; z: number }>,
  rng: RngSource,
  environment: Environment = 'farmland',
): TerrainTree[] {
  const reservedKeys = new Set(reserved.map((cell) => terrainCellKey(cell.x, cell.z)))
  const half = worldSize / 2
  const trees: TerrainTree[] = []
  const density = SIMULATION_CONFIG.terrain.treeDensity * ENVIRONMENTS[environment].trees
  for (let z = -half; z < half; z += 1) {
    for (let x = -half; x < half; x += 1) {
      if (reservedKeys.has(terrainCellKey(x, z))) continue
      const height = getTerrainHeight(terrain, x, z)
      if (height < 0) continue
      if (z <= -half + 2 && x >= -4 && x <= 4) continue
      if (rng.next() > density) continue
      trees.push({
        id: `wild-tree-${x}-${z}`,
        kind: 'tree',
        x,
        z,
        rotation: rng.nextInt(4),
        elevation: height,
        price: BUILDINGS.tree.defaultPrice,
      })
    }
  }
  return trees
}

export function describeTerrainHeight(height: number): string {
  if (isWaterHeight(height)) return 'Wasser'
  if (isMudHeight(height)) return 'Schlamm'
  if (height > 0) return `Hügel Ebene ${height}`
  return 'Ebenes Gelände'
}
