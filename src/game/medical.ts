import { SIMULATION_CONFIG } from './simulationConfig'

export const MEDICAL_BEDS_PER_CELL = SIMULATION_CONFIG.medical.bedsPerCell

export type MedicalCell = {
  x: number
  z: number
  elevation: number
  occupants: Array<string | null>
}

export class MedicalSystem {
  getCellAt(cells: readonly MedicalCell[], x: number, z: number): MedicalCell | undefined {
    return cells.find((cell) => cell.x === x && cell.z === z)
  }

  designate(
    cells: readonly MedicalCell[],
    area: ReadonlyArray<{ x: number; z: number }>,
    canPlace: (x: number, z: number) => boolean,
  ): { cells: MedicalCell[]; placed: number } {
    const keys = new Set(cells.map((cell) => `${cell.x}:${cell.z}`))
    const additions = area
      .filter((cell) => !keys.has(`${cell.x}:${cell.z}`) && canPlace(cell.x, cell.z))
      .map((cell) => ({
        x: cell.x,
        z: cell.z,
        elevation: 0,
        occupants: Array<string | null>(MEDICAL_BEDS_PER_CELL).fill(null),
      }))
    return { cells: [...cells, ...additions], placed: additions.length }
  }

  reserveBed(
    cells: readonly MedicalCell[],
    visitorId: string,
    preferredCell?: Pick<MedicalCell, 'x' | 'z' | 'elevation'>,
  ): { cell: MedicalCell; slot: number } | null {
    const orderedCells = preferredCell
      ? [
          ...cells.filter(
            (cell) =>
              cell.x === preferredCell.x &&
              cell.z === preferredCell.z &&
              cell.elevation === preferredCell.elevation,
          ),
          ...cells.filter(
            (cell) =>
              cell.x !== preferredCell.x ||
              cell.z !== preferredCell.z ||
              cell.elevation !== preferredCell.elevation,
          ),
        ]
      : cells
    for (const cell of orderedCells) {
      const slot = cell.occupants.findIndex((occupant) => occupant === null)
      if (slot < 0) continue
      cell.occupants[slot] = visitorId
      return { cell, slot }
    }
    return null
  }

  releaseBed(cells: readonly MedicalCell[], visitorId: string): void {
    cells.forEach((cell) => {
      cell.occupants = cell.occupants.map((occupant) =>
        occupant === visitorId ? null : occupant,
      )
    })
  }
}
