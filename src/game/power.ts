import { stageStats, type StageDesign } from './stageDesign'
import type { BuildingKind } from './catalog'
import { SIMULATION_CONFIG } from './simulationConfig'

export type PowerCableCell = { x: number; z: number }

export type PowerSnapshot = {
  cableCells: PowerCableCell[]
  supply: number
  demand: number
  backupSupply: number
  backupActive: boolean
  poweredBuildingIds: string[]
  liveCableKeys: string[]
}

type PowerBuilding = {
  stageDesign?: StageDesign
  id: string
  kind: BuildingKind
  x: number
  z: number
}

const OFFSETS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const

const CONSUMER_PRIORITY: Record<string, number> = {
  foh: 100,
  stage: 95,
  delayTower: 90,
  directionalSpeaker: 88,
  omniSpeaker: 86,
  videoWall: 80,
  laserShow: 78,
  securityGate: 70,
  ride: 65,
  food: 55,
  alcohol: 50,
  fireworkBattery: 45,
  lighting: 40,
  ambulanceGarage: 30,
  busDepot: 25,
  wasteDepot: 22,
}

export function createEmptyPower(): PowerSnapshot {
  return {
    cableCells: [],
    supply: 0,
    demand: 0,
    backupSupply: 0,
    backupActive: false,
    poweredBuildingIds: [],
    liveCableKeys: [],
  }
}

export function normalizePower(
  source?: Partial<PowerSnapshot> | null,
): PowerSnapshot {
  const cables = Array.isArray(source?.cableCells)
    ? source.cableCells.filter(
        (cell) => Number.isFinite(cell.x) && Number.isFinite(cell.z),
      )
    : []
  return {
    ...createEmptyPower(),
    cableCells: cables,
  }
}

export function powerCellKey(x: number, z: number): string {
  return `${x}:${z}`
}

export function getPowerDemand(kind: BuildingKind): number {
  return SIMULATION_CONFIG.power.demand[kind] ?? 0
}

export function getPowerOutput(kind: BuildingKind): number {
  return SIMULATION_CONFIG.power.output[kind] ?? 0
}

export function consumesPower(kind: BuildingKind): boolean {
  return getPowerDemand(kind) > 0
}

export function producesPower(kind: BuildingKind): boolean {
  return getPowerOutput(kind) > 0
}

export class PowerSystem {
  calculate(
    cables: readonly PowerCableCell[],
    buildings: readonly PowerBuilding[],
  ): Omit<PowerSnapshot, 'cableCells'> & { cableCells: PowerCableCell[] } {
    const cableKeys = new Set(cables.map((cell) => powerCellKey(cell.x, cell.z)))
    const buildingsByCell = new Map<string, PowerBuilding[]>()
    buildings.forEach((building) => {
      const key = powerCellKey(building.x, building.z)
      const bucket = buildingsByCell.get(key)
      if (bucket) bucket.push(building)
      else buildingsByCell.set(key, [building])
    })

    const visitedCables = new Set<string>()
    const visitedBuildings = new Set<string>()
    const poweredBuildingIds: string[] = []
    const liveCableKeys: string[] = []
    let totalSupply = 0
    let totalDemand = 0
    let totalBackup = 0
    let backupActive = false

    const generators = buildings.filter((building) => producesPower(building.kind))
    for (const generator of generators) {
      if (visitedBuildings.has(generator.id)) continue
      const network = this.flood(
        generator,
        cableKeys,
        buildingsByCell,
        visitedCables,
        visitedBuildings,
      )
      const mains = network.buildings.filter(
        (building) => building.kind === 'generator',
      )
      const backups = network.buildings.filter(
        (building) => building.kind === 'backupGenerator',
      )
      const consumers = network.buildings
        .filter((building) => consumesPower(building.kind))
        .sort(
          (left, right) =>
            (CONSUMER_PRIORITY[right.kind] ?? 0) -
            (CONSUMER_PRIORITY[left.kind] ?? 0),
        )
      const mainSupply = mains.reduce(
        (sum, building) => sum + getPowerOutput(building.kind),
        0,
      )
      const backupSupply = backups.reduce(
        (sum, building) => sum + getPowerOutput(building.kind),
        0,
      )
      const demand = consumers.reduce(
        (sum, building) => sum + getPowerDemand(building.kind) + (building.stageDesign ? stageStats(building.stageDesign).power : 0),
        0,
      )
      const needsBackup = demand > mainSupply && backupSupply > 0
      const available = mainSupply + (needsBackup ? backupSupply : 0)
      let remaining = available
      for (const consumer of consumers) {
        const need = getPowerDemand(consumer.kind) + (consumer.stageDesign ? stageStats(consumer.stageDesign).power : 0)
        if (remaining >= need) {
          remaining -= need
          poweredBuildingIds.push(consumer.id)
        }
      }
      mains.forEach((building) => poweredBuildingIds.push(building.id))
      if (needsBackup) {
        backups.forEach((building) => poweredBuildingIds.push(building.id))
        backupActive = true
      }
      liveCableKeys.push(...network.cables)
      totalSupply += available
      totalDemand += demand
      totalBackup += backupSupply
    }

    return {
      cableCells: [...cables],
      supply: totalSupply,
      demand: totalDemand,
      backupSupply: totalBackup,
      backupActive,
      poweredBuildingIds,
      liveCableKeys,
    }
  }

  private flood(
    start: PowerBuilding,
    cableKeys: ReadonlySet<string>,
    buildingsByCell: ReadonlyMap<string, PowerBuilding[]>,
    visitedCables: Set<string>,
    visitedBuildings: Set<string>,
  ): { cables: string[]; buildings: PowerBuilding[] } {
    const cableQueue: Array<{ x: number; z: number }> = []
    const foundBuildings: PowerBuilding[] = []
    const foundCables: string[] = []

    const visitBuilding = (building: PowerBuilding): void => {
      if (visitedBuildings.has(building.id)) return
      visitedBuildings.add(building.id)
      foundBuildings.push(building)
      this.adjacentCells(building.x, building.z).forEach((cell) => {
        const key = powerCellKey(cell.x, cell.z)
        if (!cableKeys.has(key) || visitedCables.has(key)) return
        visitedCables.add(key)
        foundCables.push(key)
        cableQueue.push(cell)
      })
    }

    visitBuilding(start)
    this.adjacentCells(start.x, start.z).forEach((cell) => {
      buildingsByCell.get(powerCellKey(cell.x, cell.z))?.forEach(visitBuilding)
    })

    while (cableQueue.length > 0) {
      const cell = cableQueue.shift()!
      this.adjacentCells(cell.x, cell.z).forEach((neighbor) => {
        const key = powerCellKey(neighbor.x, neighbor.z)
        buildingsByCell.get(key)?.forEach(visitBuilding)
        if (!cableKeys.has(key) || visitedCables.has(key)) return
        visitedCables.add(key)
        foundCables.push(key)
        cableQueue.push(neighbor)
      })
    }

    return { cables: foundCables, buildings: foundBuildings }
  }

  private adjacentCells(
    x: number,
    z: number,
  ): Array<{ x: number; z: number }> {
    return [
      { x, z },
      ...OFFSETS.map(([dx, dz]) => ({ x: x + dx, z: z + dz })),
    ]
  }

  designateArea(
    existing: readonly PowerCableCell[],
    cells: ReadonlyArray<{ x: number; z: number }>,
    canPlace: (x: number, z: number) => boolean,
  ): { cells: PowerCableCell[]; placed: number } {
    const keys = new Set(existing.map((cell) => powerCellKey(cell.x, cell.z)))
    const next = [...existing]
    let placed = 0
    cells.forEach((cell) => {
      const key = powerCellKey(cell.x, cell.z)
      if (keys.has(key) || !canPlace(cell.x, cell.z)) return
      keys.add(key)
      next.push({ x: cell.x, z: cell.z })
      placed += 1
    })
    return { cells: next, placed }
  }
}
