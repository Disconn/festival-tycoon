import { SIMULATION_CONFIG } from './simulationConfig'

export type CrowdingCell = {
  x: number
  z: number
  elevation: number
  value: number
}

export type CrowdingSnapshot = {
  average: number
  maximum: number
  cells: CrowdingCell[]
}

type CrowdingVisitor = {
  id: string
  cellX: number
  cellZ: number
  cellElevation: number
  state: string
  campingPhase?: string
}

const EMPTY_CROWDING: CrowdingSnapshot = {
  average: 0,
  maximum: 0,
  cells: [],
}

function key(x: number, z: number, elevation: number): string {
  return `${x}:${z}:${elevation}`
}

function crowdingValue(weightedPeople: number): number {
  const config = SIMULATION_CONFIG.crowding
  return Math.max(
    0,
    Math.min(
      100,
      ((weightedPeople - config.peopleBaseline) / config.peopleRange) * 100,
    ),
  )
}

export class CrowdingSystem {
  calculate(
    visitors: readonly CrowdingVisitor[],
    relaxedCells?: ReadonlySet<string>,
    relaxedScale = SIMULATION_CONFIG.atmosphere.danceFloorCrowdingScale,
  ): {
    snapshot: CrowdingSnapshot
    visitorValues: Map<string, number>
  } {
    const active = visitors.filter(
      (visitor) =>
        visitor.state !== 'riding' &&
        visitor.state !== 'sleeping' &&
        !(visitor.state === 'camping' && visitor.campingPhase === 'resting'),
    )
    if (active.length === 0) {
      return { snapshot: { ...EMPTY_CROWDING, cells: [] }, visitorValues: new Map() }
    }

    const weightedCells = new Map<
      string,
      { x: number; z: number; elevation: number; weight: number }
    >()
    active.forEach((visitor) => {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
          const distance = Math.abs(offsetX) + Math.abs(offsetZ)
          const config = SIMULATION_CONFIG.crowding
          const weight =
            distance === 0
              ? config.ownCellWeight
              : distance === 1
                ? config.adjacentWeight
                : config.diagonalWeight
          const x = visitor.cellX + offsetX
          const z = visitor.cellZ + offsetZ
          const cellKey = key(x, z, visitor.cellElevation)
          const cell = weightedCells.get(cellKey)
          if (cell) cell.weight += weight
          else {
            weightedCells.set(cellKey, {
              x,
              z,
              elevation: visitor.cellElevation,
              weight,
            })
          }
        }
      }
    })

    const cells = [...weightedCells.values()]
      .map((cell) => {
        const raw = crowdingValue(cell.weight)
        const relaxed = relaxedCells?.has(key(cell.x, cell.z, cell.elevation))
        return {
          x: cell.x,
          z: cell.z,
          elevation: cell.elevation,
          value: relaxed ? raw * relaxedScale : raw,
        }
      })
      .filter((cell) => cell.value > SIMULATION_CONFIG.crowding.visibleThreshold)
    const valuesByCell = new Map(
      cells.map((cell) => [key(cell.x, cell.z, cell.elevation), cell.value]),
    )
    const visitorValues = new Map(
      active.map((visitor) => [
        visitor.id,
        valuesByCell.get(key(visitor.cellX, visitor.cellZ, visitor.cellElevation)) ?? 0,
      ]),
    )
    const values = [...visitorValues.values()]
    return {
      snapshot: {
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        maximum: cells.reduce((maximum, cell) => Math.max(maximum, cell.value), 0),
        cells,
      },
      visitorValues,
    }
  }
}
