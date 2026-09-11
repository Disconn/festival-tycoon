import { SIMULATION_CONFIG } from './simulationConfig'
import type { RngSource } from './rng'

export type CampingCell = { x: number; z: number; elevation: number }

export type CampingPhase =
  | 'none'
  | 'seeking'
  | 'building'
  | 'ready'
  | 'returning'
  | 'resting'
  | 'packing'

export type CampSetupKind = 'chairs' | 'pavilion' | 'musicBox' | 'tent'

export type CampInstallation = {
  id: string
  cell: CampingCell
  kind: CampSetupKind
  ownerId: string
  contributorIds: string[]
  decay?: number
}

export function installationIsClaimed(
  installation: CampInstallation,
  livingIds: ReadonlySet<string>,
): boolean {
  return livingIds.has(installation.ownerId) ||
    installation.contributorIds.some((id) => livingIds.has(id))
}

export function decayUnclaimedInstallations(
  installations: readonly CampInstallation[],
  livingIds: ReadonlySet<string>,
  minutes: number,
): CampInstallation[] {
  const rate = SIMULATION_CONFIG.camping.abandonDecayPerMinute
  return installations.map((installation) => {
    if (installationIsClaimed(installation, livingIds)) {
      return installation.decay ? { ...installation, decay: 0 } : installation
    }
    return {
      ...installation,
      decay: Math.min(100, (installation.decay ?? 0) + minutes * rate),
    }
  })
}

export function isCollectibleCamp(
  installation: CampInstallation,
  livingIds: ReadonlySet<string>,
): boolean {
  return !installationIsClaimed(installation, livingIds) &&
    (installation.decay ?? 0) >= SIMULATION_CONFIG.camping.abandonCollectibleDecay
}

export function abandonVisitorCamp(
  visitor: { id: string; campsite: CampingCell | null; campingPhase: CampingPhase },
  installations: readonly CampInstallation[],
  createId: () => string,
): CampInstallation[] {
  const next = installations.map((installation) => {
    const contributed = installation.contributorIds.includes(visitor.id)
    const owned = installation.ownerId === visitor.id
    if (!owned && !contributed) return installation
    const contributors = installation.contributorIds.filter((id) => id !== visitor.id)
    if (installation.kind === 'chairs' && contributors.length > 0) {
      return {
        ...installation,
        contributorIds: contributors,
        ownerId: owned ? contributors[0]! : installation.ownerId,
      }
    }
    return {
      ...installation,
      ownerId: '',
      contributorIds: [],
      decay: Math.max(installation.decay ?? 0, 20),
    }
  })
  if (
    !visitor.campsite ||
    visitor.campingPhase === 'none' ||
    visitor.campingPhase === 'seeking'
  ) {
    return next
  }
  if (
    next.some((installation) =>
      installation.kind === 'tent' &&
      installation.cell.x === visitor.campsite!.x &&
      installation.cell.z === visitor.campsite!.z,
    )
  ) {
    return next
  }
  return [
    ...next,
    {
      id: createId(),
      cell: { ...visitor.campsite },
      kind: 'tent',
      ownerId: '',
      contributorIds: [],
      decay: 20,
    },
  ]
}

export type CampingVisitor = {
  id: string
  cellX: number
  cellZ: number
  cellElevation: number
  state: string
  thought: string
  route: CampingCell[]
  targetId: string | null
  interactionRemaining: number
  campsite: CampingCell | null
  campingPhase: CampingPhase
  hasHandcart: boolean
  campActivityTarget: CampingCell | null
  campActivitySlot: number
  beautyPreference?: number
  partyPreference?: number
}

type CampingContext = {
  getCells: () => CampingCell[]
  setCells: (cells: CampingCell[]) => void
  getVisitors: () => CampingVisitor[]
  getInstallations: () => CampInstallation[]
  setInstallations: (installations: CampInstallation[]) => void
  getItemQuantity: (visitorId: string, kind: CampSetupKind) => number
  createId: () => string
  isInWorld: (x: number, z: number) => boolean
  isGroundOccupied: (x: number, z: number) => boolean
  findPath: (
    start: CampingCell,
    goals: CampingCell[],
    allowCamping?: boolean,
  ) => CampingCell[] | null
  hasPath: (cell: CampingCell) => boolean
  clearQueues: (visitorId: string) => void
  getAttractiveness: (x: number, z: number, elevation: number) => number
  getPartyMood: (x: number, z: number, elevation: number) => number
  rng: () => RngSource
}

export type CampingAreaResult = {
  ok: boolean
  message: string
  displacedVisitors: CampingVisitor[]
}

export type CampingPaintResult = {
  ok: boolean
  message: string
  placed: number
}

export class CampingSystem {
  private readonly context: CampingContext
  private cellIndex = new Map<string, CampingCell>()
  private indexedCells: readonly CampingCell[] | null = null

  constructor(context: CampingContext) {
    this.context = context
  }

  getCellAt(x: number, z: number): CampingCell | undefined {
    this.refreshIndex()
    return this.cellIndex.get(`${x}:${z}`)
  }

  private refreshIndex(): void {
    const cells = this.context.getCells()
    if (cells === this.indexedCells) return
    this.indexedCells = cells
    this.cellIndex = new Map(
      cells.map((cell) => [`${cell.x}:${cell.z}`, cell]),
    )
  }

  designateCell(x: number, z: number, enabled = true): CampingAreaResult {
    if (!this.context.isInWorld(x, z)) {
      return { ok: false, message: 'Außerhalb des Geländes', displacedVisitors: [] }
    }
    const existing = this.getCellAt(x, z)
    if (!enabled) {
      if (!existing) {
        return { ok: false, message: 'Hier ist kein Zeltbereich', displacedVisitors: [] }
      }
      this.context.setCells(
        this.context.getCells().filter((cell) => cell.x !== x || cell.z !== z),
      )
      const visitors = this.context.getVisitors()
      this.context.setInstallations(
        this.context
          .getInstallations()
          .filter((installation) => installation.cell.x !== x || installation.cell.z !== z),
      )
      const displacedVisitors = visitors.filter(
        (visitor) => visitor.campsite?.x === x && visitor.campsite.z === z,
      )
      displacedVisitors.forEach((visitor) => {
        this.removeVisitorInstallations(visitor.id)
        visitor.campsite = null
        visitor.campingPhase = 'none'
        visitor.hasHandcart = false
        if (visitor.state === 'camping') {
          visitor.state = 'exploring'
          visitor.route = []
          visitor.thought = 'Mein Zeltplatz wurde aufgehoben.'
        }
      })
      return { ok: true, message: 'Zeltbereich aufgehoben', displacedVisitors }
    }
    if (existing) {
      return { ok: true, message: 'Hier ist bereits Zeltbereich', displacedVisitors: [] }
    }
    if (this.context.isGroundOccupied(x, z)) {
      return {
        ok: false,
        message: 'Zeltbereiche brauchen eine freie Bodenfläche',
        displacedVisitors: [],
      }
    }
    this.context.setCells([...this.context.getCells(), { x, z, elevation: 0 }])
    return { ok: true, message: 'Zeltbereich ausgewiesen', displacedVisitors: [] }
  }

  designateArea(cells: ReadonlyArray<{ x: number; z: number }>): CampingPaintResult {
    const existing = new Set(
      this.context.getCells().map((cell) => `${cell.x}:${cell.z}`),
    )
    const additions: CampingCell[] = []
    const visited = new Set<string>()
    for (const cell of cells) {
      const key = `${cell.x}:${cell.z}`
      if (visited.has(key) || existing.has(key)) continue
      visited.add(key)
      if (
        !this.context.isInWorld(cell.x, cell.z) ||
        this.context.isGroundOccupied(cell.x, cell.z)
      ) {
        continue
      }
      additions.push({ x: cell.x, z: cell.z, elevation: 0 })
    }
    if (additions.length === 0) {
      return {
        ok: false,
        message: 'In dieser Fläche gibt es keine freien Zeltfelder',
        placed: 0,
      }
    }
    this.context.setCells([...this.context.getCells(), ...additions])
    return {
      ok: true,
      message: `${additions.length} Felder als Zeltbereich ausgewiesen`,
      placed: additions.length,
    }
  }

  assignCampsite(visitor: CampingVisitor): boolean {
    const occupied = new Set([
      ...this.context
        .getVisitors()
        .filter((other) => other.id !== visitor.id && other.campsite)
        .map((other) => `${other.campsite!.x}:${other.campsite!.z}`),
      ...this.context
        .getInstallations()
        .map((installation) => `${installation.cell.x}:${installation.cell.z}`),
    ])
    const tentKeys = new Set(
      this.context
        .getVisitors()
        .filter((other) => other.id !== visitor.id && other.campsite)
        .map((other) => `${other.campsite!.x}:${other.campsite!.z}`),
    )
    const ranked = this.context
      .getCells()
      .filter((cell) => !occupied.has(`${cell.x}:${cell.z}`))
      .map((cell) => ({
        cell,
        score: this.scoreCampsite(visitor, cell, occupied, tentKeys),
      }))
      .sort((left, right) => right.score - left.score)
    const pathfindLimit = SIMULATION_CONFIG.camping.siteSelection.pathfindLimit
    let attempts = 0
    for (const candidate of ranked) {
      if (attempts >= pathfindLimit) break
      attempts += 1
      const route = this.findRouteToCampsite(visitor, candidate.cell)
      if (!route) continue
      visitor.campsite = { ...candidate.cell }
      visitor.campingPhase = 'seeking'
      visitor.state = 'camping'
      visitor.targetId = null
      visitor.route = route
      visitor.hasHandcart = true
      visitor.thought = 'Ich ziehe meine Campingsachen zum Zeltplatz.'
      return true
    }
    return false
  }

  private scoreCampsite(
    visitor: CampingVisitor,
    cell: CampingCell,
    occupied: ReadonlySet<string>,
    tentKeys: ReadonlySet<string>,
  ): number {
    const config = SIMULATION_CONFIG.camping.siteSelection
    const beautyPref = visitor.beautyPreference ?? 0.5
    const partyPref = visitor.partyPreference ?? 0.5
    const beauty = this.context.getAttractiveness(cell.x, cell.z, cell.elevation)
    const party = this.context.getPartyMood(cell.x, cell.z, cell.elevation)
    let freeCampingNeighbors = 0
    let adjacentTents = 0
    let nearbyTents = 0
    const radius = config.nearbyTentRadius
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dz === 0) continue
        const key = `${cell.x + dx}:${cell.z + dz}`
        const chebyshev = Math.max(Math.abs(dx), Math.abs(dz))
        if (chebyshev === 1) {
          if (tentKeys.has(key) || occupied.has(key)) adjacentTents += 1
          else if (this.getCellAt(cell.x + dx, cell.z + dz)) {
            freeCampingNeighbors += 1
          }
        } else if (tentKeys.has(key)) {
          nearbyTents += 1
        }
      }
    }
    const distance =
      Math.abs(cell.x - visitor.cellX) + Math.abs(cell.z - visitor.cellZ)
    return (
      beauty * beautyPref * config.beautyWeight +
      party * partyPref * config.partyWeight +
      freeCampingNeighbors * config.freeCampingNeighborWeight -
      adjacentTents * config.adjacentTentPenalty -
      nearbyTents * config.nearbyTentPenalty -
      distance * config.distancePenalty +
      (this.context.rng().next() - 0.5) * config.scoreJitter
    )
  }

  findRouteToCampsite(
    visitor: CampingVisitor,
    campsite: CampingCell,
  ): CampingCell[] | null {
    return this.context.findPath(
      {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
      },
      [campsite],
      true,
    )
  }

  createCampSetup(visitor: CampingVisitor): CampInstallation[] {
    if (!visitor.campsite) return []
    const installations = [...this.context.getInstallations()]
    const created: CampInstallation[] = []
    const occupied = new Set([
      ...this.context
        .getVisitors()
        .filter((other) => other.campsite)
        .map((other) => `${other.campsite!.x}:${other.campsite!.z}`),
      ...installations.map(
        (installation) => `${installation.cell.x}:${installation.cell.z}`,
      ),
    ])
    const freeNeighbors = this.context.rng().shuffle(
      [
        { x: -1, z: 0 },
        { x: 1, z: 0 },
        { x: 0, z: -1 },
        { x: 0, z: 1 },
        { x: -1, z: -1 },
        { x: 1, z: -1 },
        { x: -1, z: 1 },
        { x: 1, z: 1 },
      ]
        .map((offset) => ({
          x: visitor.campsite!.x + offset.x,
          z: visitor.campsite!.z + offset.z,
          elevation: visitor.campsite!.elevation,
        }))
        .filter(
          (cell) =>
            this.getCellAt(cell.x, cell.z) &&
            !this.context.hasPath(cell) &&
            !occupied.has(`${cell.x}:${cell.z}`),
        ),
    )

    if (this.context.getItemQuantity(visitor.id, 'pavilion') > 0) {
      const cell = freeNeighbors.shift()
      if (cell) {
        const pavilion: CampInstallation = {
          id: this.context.createId(),
          cell,
          kind: 'pavilion',
          ownerId: visitor.id,
          contributorIds: [visitor.id],
        }
        installations.push(pavilion)
        created.push(pavilion)
        occupied.add(`${cell.x}:${cell.z}`)
      }
    }

    if (
      created.length < 2 &&
      this.context.getItemQuantity(visitor.id, 'musicBox') > 0
    ) {
      const cell = freeNeighbors.find(
        (candidate) => !occupied.has(`${candidate.x}:${candidate.z}`),
      )
      if (cell) {
        const musicBox: CampInstallation = {
          id: this.context.createId(),
          cell,
          kind: 'musicBox',
          ownerId: visitor.id,
          contributorIds: [visitor.id],
        }
        installations.push(musicBox)
        created.push(musicBox)
        occupied.add(`${cell.x}:${cell.z}`)
      }
    }

    if (this.context.getItemQuantity(visitor.id, 'chairs') > 0) {
      const sharedChairs = installations.find(
        (installation) =>
          installation.kind === 'chairs' &&
          installation.contributorIds.length <
            SIMULATION_CONFIG.camping.maximumSharedChairs &&
          !installation.contributorIds.includes(visitor.id) &&
          Math.max(
            Math.abs(installation.cell.x - visitor.campsite!.x),
            Math.abs(installation.cell.z - visitor.campsite!.z),
          ) <= SIMULATION_CONFIG.camping.sharedChairRange,
      )
      if (sharedChairs) {
        sharedChairs.contributorIds.push(visitor.id)
      } else if (created.length < 2) {
        const cell = freeNeighbors.find(
          (candidate) => !occupied.has(`${candidate.x}:${candidate.z}`),
        )
        if (cell) {
          const chairs: CampInstallation = {
            id: this.context.createId(),
            cell,
            kind: 'chairs',
            ownerId: visitor.id,
            contributorIds: [visitor.id],
          }
          installations.push(chairs)
          created.push(chairs)
        }
      }
    }
    this.context.setInstallations(installations)
    return created
  }

  findRouteToGathering(
    visitor: CampingVisitor,
  ): {
    route: CampingCell[]
    target: CampingCell
    kind: CampSetupKind
    slot: number
    capacity: number
  } | null {
    const installations = this.context.getInstallations()
    if (installations.length === 0) return null
    let best: {
      route: CampingCell[]
      target: CampingCell
      kind: CampSetupKind
      slot: number
      capacity: number
    } | null = null
    for (const setup of installations) {
      const capacity =
        setup.kind === 'chairs'
          ? setup.contributorIds.length
          : setup.kind === 'musicBox'
            ? SIMULATION_CONFIG.camping.musicBoxCapacity
            : SIMULATION_CONFIG.camping.pavilionCapacity
      const participants = this.context
        .getVisitors()
        .filter(
          (other) =>
            other.state === 'socializing' &&
            other.campActivityTarget?.x === setup.cell.x &&
            other.campActivityTarget.z === setup.cell.z,
        )
      if (participants.length >= capacity) continue
      const usedSlots = new Set(participants.map((participant) => participant.campActivitySlot))
      let slot = 0
      while (usedSlots.has(slot) && slot < capacity) slot += 1
      const route = this.context.findPath(
        {
          x: visitor.cellX,
          z: visitor.cellZ,
          elevation: visitor.cellElevation,
        },
        [setup.cell],
        true,
      )
      if (route && (!best || route.length < best.route.length)) {
        best = {
          route,
          target: setup.cell,
          kind: setup.kind,
          slot,
          capacity,
        }
      }
    }
    return best
  }

  removeVisitorInstallations(visitorId: string): void {
    const remaining: CampInstallation[] = []
    this.context.getInstallations().forEach((installation) => {
      if (
        installation.kind !== 'chairs' &&
        installation.ownerId === visitorId
      ) return
      const contributorIds = installation.contributorIds.filter(
        (contributorId) => contributorId !== visitorId,
      )
      if (installation.kind === 'chairs' && contributorIds.length === 0) return
      remaining.push({
        ...installation,
        ownerId:
          installation.ownerId === visitorId
            ? contributorIds[0] ?? installation.ownerId
            : installation.ownerId,
        contributorIds,
      })
    })
    this.context.setInstallations(remaining)
  }

  beginDeparture(visitor: CampingVisitor, entrance: CampingCell): void {
    if (visitor.state === 'vehicle-arrival') return
    this.context.clearQueues(visitor.id)
    visitor.targetId = null
    if (visitor.campsite) {
      const route = this.findRouteToCampsite(visitor, visitor.campsite)
      if (route) {
        visitor.state = 'camping'
        visitor.campingPhase = 'packing'
        visitor.interactionRemaining = 0
        visitor.route = route
        visitor.thought = 'Das Festival ist für mich vorbei. Ich gehe mein Zelt abbauen.'
        return
      }
    }
    visitor.campingPhase = 'none'
    visitor.hasHandcart = true
    visitor.state = 'leaving'
    visitor.route =
      this.context.findPath(
        {
          x: visitor.cellX,
          z: visitor.cellZ,
          elevation: visitor.cellElevation,
        },
        [entrance],
      ) ?? []
    visitor.thought = 'Ich mache mich auf den Heimweg.'
  }
}
