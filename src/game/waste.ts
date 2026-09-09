import { SIMULATION_CONFIG } from './simulationConfig'

export type WasteDumpCell = {
  x: number
  z: number
  elevation: number
  stored: number
}

export function wasteDumpId(cell: { x: number; z: number }): string {
  return `dump:${cell.x}:${cell.z}`
}

export function parseWasteDumpId(
  id: string,
): { x: number; z: number } | null {
  const match = /^dump:(-?\d+):(-?\d+)$/.exec(id)
  if (!match) return null
  return { x: Number(match[1]), z: Number(match[2]) }
}

export function designateWasteDumps(
  existing: readonly WasteDumpCell[],
  area: ReadonlyArray<{ x: number; z: number }>,
  canPlace: (x: number, z: number) => boolean,
  availableMoney: number,
): { cells: WasteDumpCell[]; placed: number; cost: number } {
  const keys = new Set(existing.map((cell) => `${cell.x}:${cell.z}`))
  const candidates = area.filter(
    (cell) => !keys.has(`${cell.x}:${cell.z}`) && canPlace(cell.x, cell.z),
  )
  const costPerCell = SIMULATION_CONFIG.waste.dumpDesignationCost
  const affordable = Math.min(
    candidates.length,
    Math.floor(availableMoney / costPerCell),
  )
  const additions = candidates.slice(0, affordable).map((cell) => ({
    ...cell,
    elevation: 0,
    stored: 0,
  }))
  return {
    cells: [...existing, ...additions],
    placed: additions.length,
    cost: additions.length * costPerCell,
  }
}

export function findNearestWasteDump(
  from: { x: number; z: number },
  dumps: readonly WasteDumpCell[],
): WasteDumpCell | null {
  return (
    dumps
      .slice()
      .sort(
        (left, right) =>
          Math.abs(left.x - from.x) +
          Math.abs(left.z - from.z) -
          (Math.abs(right.x - from.x) + Math.abs(right.z - from.z)),
      )[0] ?? null
  )
}

export type WasteBinInfo = {
  id: string
  x: number
  z: number
  elevation: number
  stored: number
}

export function findNearestWasteBin(
  from: { x: number; z: number },
  bins: readonly WasteBinInfo[],
  range: number,
  capacity: number,
): WasteBinInfo | null {
  return (
    bins
      .filter(
        (bin) =>
          bin.stored < capacity &&
          Math.abs(bin.x - from.x) + Math.abs(bin.z - from.z) <= range,
      )
      .sort(
        (left, right) =>
          Math.abs(left.x - from.x) +
          Math.abs(left.z - from.z) -
          (Math.abs(right.x - from.x) + Math.abs(right.z - from.z)),
      )[0] ?? null
  )
}

export function normalizeWasteDumpCell(value: unknown): WasteDumpCell | null {
  if (typeof value !== 'object' || value === null) return null
  const source = value as Record<string, unknown>
  if (!Number.isFinite(source.x) || !Number.isFinite(source.z)) return null
  return {
    x: Number(source.x),
    z: Number(source.z),
    elevation: Number.isFinite(source.elevation) ? Number(source.elevation) : 0,
    stored: Math.max(0, Number(source.stored) || 0),
  }
}
