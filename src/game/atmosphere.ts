import { stageStats, type StageDesign } from './stageDesign'
import { WORLD_SIZE } from './catalog'
import type { BuildingKind } from './catalog'
import type { GroundIncident } from './incidents'
import type { CampInstallation } from './camping'
import type { WasteDumpCell } from './waste'
import { SIMULATION_CONFIG } from './simulationConfig'

export type AtmosphereCell = {
  x: number
  z: number
  elevation: number
  value: number
}

export type AtmosphereSnapshot = {
  average: number
  maximum: number
  minimum: number
  cells: AtmosphereCell[]
}

type AtmosphereBuilding = {
  stageDesign?: StageDesign
  id: string
  kind: BuildingKind
  x: number
  z: number
  elevation: number
  rotation: number
  wasteFill?: number
}

type AtmosphereVisitor = {
  id: string
  cellX: number
  cellZ: number
  cellElevation: number
  state: string
  isDancing: boolean
  route: readonly unknown[]
  isConversing: boolean
}

type Source = {
  x: number
  z: number
  elevation: number
  beauty: number
  party: number
  range: number
  rotation?: number
  directional?: boolean
}

export type AtmosphereResult = {
  attractiveness: AtmosphereSnapshot
  partyMood: AtmosphereSnapshot
  attractivenessValues: Map<string, number>
  partyMoodValues: Map<string, number>
}

const EMPTY: AtmosphereSnapshot = {
  average: 0,
  maximum: 0,
  minimum: 0,
  cells: [],
}

const DIRECTIONS = [
  { x: 0, z: 1 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
]

function key(x: number, z: number, elevation: number): string {
  return `${x},${z},${elevation}`
}

export class AtmosphereSystem {
  calculate(
    buildings: readonly AtmosphereBuilding[],
    incidents: readonly GroundIncident[],
    visitors: readonly AtmosphereVisitor[],
    campInstallations: readonly CampInstallation[],
    wasteDumps: readonly WasteDumpCell[] = [],
    worldSize = WORLD_SIZE,
  ): AtmosphereResult {
    const sources = this.createSources(
      buildings,
      incidents,
      visitors,
      campInstallations,
      wasteDumps,
    )
    const beautyRaw = new Map<string, { x: number; z: number; elevation: number; positive: number; negative: number }>()
    const partyRaw = new Map<string, { x: number; z: number; elevation: number; positive: number; negative: number }>()
    sources.forEach((source) => {
      for (let dx = -source.range; dx <= source.range; dx += 1) {
        for (let dz = -source.range; dz <= source.range; dz += 1) {
          const contribution = this.getContribution(source, dx, dz)
          if (contribution === null) continue
          const x = source.x + dx
          const z = source.z + dz
          const half = worldSize / 2
          if (x < -half || x >= half || z < -half || z >= half) continue
          this.add(
            beautyRaw,
            x,
            z,
            source.elevation,
            source.beauty * contribution,
          )
          this.add(
            partyRaw,
            x,
            z,
            source.elevation,
            source.party * contribution,
          )
        }
      }
    })
    return {
      attractiveness: this.toSnapshot(beautyRaw, true),
      partyMood: this.toSnapshot(partyRaw, false),
      attractivenessValues: this.toValues(beautyRaw, true),
      partyMoodValues: this.toValues(partyRaw, false),
    }
  }

  private createSources(
    buildings: readonly AtmosphereBuilding[],
    incidents: readonly GroundIncident[],
    visitors: readonly AtmosphereVisitor[],
    campInstallations: readonly CampInstallation[],
    wasteDumps: readonly WasteDumpCell[],
  ): Source[] {
    const sourceConfig = SIMULATION_CONFIG.atmosphere.sources
    const sources: Source[] = []
    buildings.forEach((building) => {
      const definition =
        sourceConfig[building.kind as keyof typeof sourceConfig] ?? null
      if (!definition) return
      const fillRatio =
        building.kind === 'wasteBin'
          ? Math.min(
              1,
              (building.wasteFill ?? 0) / SIMULATION_CONFIG.waste.binCapacity,
            )
          : 0
      sources.push({
        x: building.x,
        z: building.z,
        elevation: building.elevation,
        beauty:
          building.kind === 'wasteBin'
            ? definition.beauty +
              fillRatio *
                (SIMULATION_CONFIG.waste.binFullBeauty - definition.beauty)
            : definition.beauty + (building.stageDesign ? stageStats(building.stageDesign).beauty * .2 : 0),
        party: definition.party + (building.stageDesign ? stageStats(building.stageDesign).party * .25 : 0),
        range: definition.range,
        rotation: building.rotation,
        directional: building.kind === 'directionalSpeaker',
      })
    })
    incidents.forEach((incident) => {
      const definition =
        incident.kind === 'vomit'
          ? sourceConfig.vomit
          : incident.kind === 'litter'
            ? sourceConfig.litter
            : sourceConfig.fire
      sources.push({
        x: incident.x,
        z: incident.z,
        elevation: incident.elevation,
        beauty: definition.beauty * incident.severity,
        party: definition.party * incident.severity,
        range: definition.range,
      })
    })
    wasteDumps.forEach((dump) => {
      const definition = sourceConfig.wasteDump
      sources.push({
        x: dump.x,
        z: dump.z,
        elevation: dump.elevation,
        beauty:
          definition.beauty +
          dump.stored * SIMULATION_CONFIG.waste.dumpStoredBeautyPerBag,
        party: definition.party,
        range: definition.range,
      })
    })
    visitors.forEach((visitor) => {
      const definition = visitor.isDancing && visitor.state === 'partying'
        ? sourceConfig.dancer
        : visitor.isConversing && visitor.route.length === 0
          ? sourceConfig.campConversation
        : visitor.state === 'sleeping'
          ? sourceConfig.sleeper
          : null
      if (!definition) return
      sources.push({
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
        ...definition,
      })
    })
    campInstallations
      .filter((installation) => installation.kind === 'musicBox')
      .forEach((installation) => {
        sources.push({
          x: installation.cell.x,
          z: installation.cell.z,
          elevation: installation.cell.elevation,
          ...sourceConfig.campMusicBox,
        })
      })
    return sources
  }

  private getContribution(source: Source, dx: number, dz: number): number | null {
    if (source.directional) {
      const direction = DIRECTIONS[(source.rotation ?? 0) % 4]!
      const forward = dx * direction.x + dz * direction.z
      const lateral = Math.abs(dx * direction.z - dz * direction.x)
      if (forward <= 0 || forward > source.range) return null
      if (lateral > Math.max(1, Math.floor(forward / 2))) return null
      if (forward === 1 && lateral === 0) {
        return SIMULATION_CONFIG.atmosphere.directionalSpeakerTooLoud /
          Math.max(1, source.party)
      }
      if (
        forward <
        SIMULATION_CONFIG.atmosphere.directionalSpeakerPositiveStart
      ) {
        return null
      }
      return Math.max(0, 1 - (forward - 1 + lateral * 0.5) / source.range)
    }
    const distance = Math.hypot(dx, dz)
    if (distance > source.range) return null
    return Math.max(0, 1 - distance / Math.max(1, source.range))
  }

  private add(
    map: Map<string, { x: number; z: number; elevation: number; positive: number; negative: number }>,
    x: number,
    z: number,
    elevation: number,
    contribution: number,
  ): void {
    if (Math.abs(contribution) < 0.001) return
    const cellKey = key(x, z, elevation)
    const value = map.get(cellKey) ?? {
      x,
      z,
      elevation,
      positive: 0,
      negative: 0,
    }
    if (contribution >= 0) value.positive += contribution
    else value.negative += Math.abs(contribution)
    map.set(cellKey, value)
  }

  private combined(
    value: { positive: number; negative: number },
    signed: boolean,
  ): number {
    const saturation = SIMULATION_CONFIG.atmosphere.diminishingSaturation
    const positive = 100 * (1 - Math.exp(-value.positive / saturation))
    const negative = 100 * (1 - Math.exp(-value.negative / saturation))
    const result = positive - negative
    return signed
      ? Math.max(-100, Math.min(100, result))
      : Math.max(0, Math.min(100, result))
  }

  private toValues(
    raw: Map<string, { positive: number; negative: number }>,
    signed: boolean,
  ): Map<string, number> {
    return new Map(
      [...raw].map(([cellKey, value]) => [
        cellKey,
        this.combined(value, signed),
      ]),
    )
  }

  private toSnapshot(
    raw: Map<string, { x: number; z: number; elevation: number; positive: number; negative: number }>,
    signed: boolean,
  ): AtmosphereSnapshot {
    const cells = [...raw.values()]
      .map((cell) => ({ ...cell, value: this.combined(cell, signed) }))
      .filter(
        (cell) =>
          Math.abs(cell.value) >= SIMULATION_CONFIG.atmosphere.visibleThreshold,
      )
      .map(({ x, z, elevation, value }) => ({ x, z, elevation, value }))
    if (cells.length === 0) return { ...EMPTY, cells: [] }
    return {
      average:
        cells.reduce((total, cell) => total + cell.value, 0) / cells.length,
      maximum: Math.max(...cells.map((cell) => cell.value)),
      minimum: Math.min(...cells.map((cell) => cell.value)),
      cells,
    }
  }
}
