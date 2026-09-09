import { SIMULATION_CONFIG } from './simulationConfig'

export type StageForecourtCell = {
  stageId?: string
  x: number
  z: number
  elevation: number
}

export class FestivalAreaSystem {
  getCellAt(
    cells: readonly StageForecourtCell[],
    x: number,
    z: number,
  ): StageForecourtCell | undefined {
    return cells.find((cell) => cell.x === x && cell.z === z)
  }

  designate(
    existing: readonly StageForecourtCell[],
    area: ReadonlyArray<{ x: number; z: number }>,
    canPlace: (x: number, z: number) => boolean,
    availableMoney: number,
  ): { cells: StageForecourtCell[]; placed: number; cost: number } {
    const keys = new Set(existing.map((cell) => `${cell.x}:${cell.z}`))
    const candidates = area.filter(
      (cell) => !keys.has(`${cell.x}:${cell.z}`) && canPlace(cell.x, cell.z),
    )
    const affordable = Math.min(
      candidates.length,
      Math.floor(
        availableMoney /
          SIMULATION_CONFIG.atmosphere.forecourtDesignationCost,
      ),
    )
    const additions = candidates.slice(0, affordable).map((cell) => ({
      ...cell,
      elevation: 0,
    }))
    return {
      cells: [...existing, ...additions],
      placed: additions.length,
      cost:
        additions.length *
        SIMULATION_CONFIG.atmosphere.forecourtDesignationCost,
    }
  }
}
