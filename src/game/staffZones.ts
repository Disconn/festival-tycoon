// The map is globally partitioned into fixed 3x3-cell zones (independent of
// any single staff member), identified by a "zx:zz" key. Math.floor gives a
// correct partition for negative coordinates too, since the map is centered
// on (0,0) - see isInTerrainWorld in ./terrain.ts.
export const ZONE_SIZE = 3

export function zoneKey(x: number, z: number): string {
  return `${Math.floor(x / ZONE_SIZE)}:${Math.floor(z / ZONE_SIZE)}`
}

export function parseZoneKey(key: string): { zx: number; zz: number } {
  const [zx, zz] = key.split(':').map(Number)
  return { zx: zx ?? 0, zz: zz ?? 0 }
}

export function zoneCellRange(key: string): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const { zx, zz } = parseZoneKey(key)
  return {
    minX: zx * ZONE_SIZE,
    maxX: zx * ZONE_SIZE + ZONE_SIZE - 1,
    minZ: zz * ZONE_SIZE,
    maxZ: zz * ZONE_SIZE + ZONE_SIZE - 1,
  }
}

export function isInAnyZone(zones: string[] | undefined, x: number, z: number): boolean {
  return !zones?.length || zones.includes(zoneKey(x, z))
}

export function zoneNeighborKeys(key: string): string[] {
  const { zx, zz } = parseZoneKey(key)
  return [`${zx + 1}:${zz}`, `${zx - 1}:${zz}`, `${zx}:${zz + 1}`, `${zx}:${zz - 1}`]
}

export function isZoneAdjacentToAny(key: string, existing: string[]): boolean {
  const neighbors = new Set(zoneNeighborKeys(key))
  return existing.some((other) => neighbors.has(other))
}

export function zonesConnected(keys: string[]): boolean {
  if (keys.length <= 1) return true
  const set = new Set(keys)
  const visited = new Set<string>([keys[0]!])
  const queue = [keys[0]!]
  while (queue.length) {
    const current = queue.pop()!
    for (const neighbor of zoneNeighborKeys(current)) {
      if (set.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return visited.size === keys.length
}
