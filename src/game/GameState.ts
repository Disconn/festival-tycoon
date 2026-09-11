import { musicTaste, musicAppeal, type MusicGenre } from './musicTaste'
import { syncStageAudience } from './stageAudience'
import { stageSiteIssue } from './stageSite'
import { isStageAudienceCell, stageDistance, buildingFootprint, occupiesBuildingCell, stageDesignIssue, stageStats, type StageDesign } from './stageDesign'
import { WAY_TYPES, wayInfo, wayIssue } from './wayTypes'
import type { WayType } from './wayTypes'
import { groundRectangle } from './ground'
import { createInfrastructure, updateSupplyChain, localStock, consumeLocal } from './supplyChain'
import { groundInfo, groundKey, buildingEfficiency, roadGroundLimit } from './ground'
import { BUILDINGS, SAVE_KEY, SAVE_SLOTS_KEY } from './catalog'
import { createFestivalManagement, festivalAction, updateFestival, assignAudience, activeBookings, showIssue, BANDS } from './festivalManagement'
import type { FestivalManagement, FestivalAction, Audience, Booking } from './festivalManagement'
import {
  createDefaultScenarioSettings,
  createScenarioEntrance,
  createScenarioRoadEntry,
  normalizeScenarioSettings,
  sampleBiasedPreference,
} from './scenario'
import type { ScenarioSettings } from './scenario'
import type { BuildingKind, Tool } from './catalog'
import {
  COASTER_TYPES,
  TRACK_BANK_ANGLE,
  TRACK_PIECES,
  createCoasterTelemetry,
  createTrackPiece,
  computeTrackFrame,
  isCoasterCircuitClosed,
  migrateTrackPiece,
  sampleCoasterTrack,
  snapTrackPieceToAnchor,
  trackAnchorsAlign,
} from './coasters'
import type {
  Coaster,
  CoasterOperationMode,
  CoasterTypeId,
  DispatchMode,
  TrackSample,
  TrackBuildOptions,
  TrackPiece,
  TrackPieceKind,
} from './coasters'
import {
  abandonVisitorCamp,
  CampingSystem,
  decayUnclaimedInstallations,
  isCollectibleCamp,
} from './camping'
import type {
  CampingCell,
  CampingPhase,
  CampInstallation,
  CampSetupKind,
} from './camping'
import {
  createFestivalInventory,
  addItem,
  consumeItem,
  getItemQuantity,
  INVENTORY_ITEMS,
  normalizeInventory,
} from './inventory'
import type { InventoryItem } from './inventory'
import { FireworksSystem } from './fireworks'
import type { FireworkEffect } from './fireworks'
import { CrowdingSystem } from './crowding'
import type { CrowdingSnapshot } from './crowding'
import {
  denseClusterSize,
  neighborhoodPeople,
  panicSpreadChance,
  spontaneousPanicChance,
} from './visitorBubbles'
import {
  createPathScratch,
  createSeededRng,
  findWeightedPath,
} from './pathfinding'
import { DeterministicRng, hashStringSeed } from './rng'
import { applyGameCommand } from '../net/commands'
import { allowsPathFlow, normalizeFlowDirection } from './pathFlow'
import { createStaffMember, STAFF_DEFINITIONS } from './staff'
import type { StaffMember, StaffRole } from './staff'
import { zonesConnected, isZoneAdjacentToAny } from './staffZones'
import { StaffSimulation } from './staffSimulation'
import { MedicalSystem } from './medical'
import type { MedicalCell } from './medical'
import { IncidentSystem } from './incidents'
import type {
  GroundIncident,
  GroundIncidentKind,
} from './incidents'
import { DEFAULT_SECURITY_CONFIG, SecuritySystem } from './security'
import type { SecurityGateConfig } from './security'
import { SIMULATION_CONFIG } from './simulationConfig'
import type { GameCommand, SimSnapshot, WorldSnapshot } from '../net/protocol'
import { applySim, applyWorld } from '../net/codec'
import { AtmosphereSystem } from './atmosphere'
import type { AtmosphereSnapshot } from './atmosphere'
import { FestivalAreaSystem } from './festivalAreas'
import type { StageForecourtCell } from './festivalAreas'
import {
  designateWasteDumps,
  findNearestWasteBin,
  normalizeWasteDumpCell,
} from './waste'
import type { WasteDumpCell } from './waste'
import {
  consumesPower,
  createEmptyPower,
  normalizePower,
  PowerSystem,
} from './power'
import type { PowerCableCell, PowerSnapshot } from './power'
import {
  createDefaultDayPlan,
  getFestivalCycleStatus,
  getOpenWindowHours,
  isDayVisitorAdmissionOpen,
  isFestivalOfferActive,
  normalizeDayPlan,
} from './dayPlan'
import type { DayPlan, DayPlanOffer } from './dayPlan'
import {
  createComplaintCounts,
  createComplaintSnapshot,
  normalizeComplaintSnapshot,
} from './complaints'
import type {
  ComplaintSnapshot,
  ComplaintTopic,
} from './complaints'
import {
  cellKey as roadCellKey,
  createDefaultLogisticsSnapshot,
  createRoadGraph,
  directionBit,
  findRoadRoute,
  isRoadDirectionAllowed,
  normalizeLogisticsSnapshot,
  oppositeDirection,
} from './logistics'
import type {
  ArrivalGroup,
  Direction,
  LogisticsSnapshot,
  ParkingCell,
  RoadCell,
  RoadPosition,
  RoadGraph,
  RoadVehicle,
  SpeedLimit,
} from './logistics'
import {
  applyTerrainChanges,
  createEmptyTerrain,
  generateTerrain,
  getTerrainHeight as readTerrainHeight,
  isMudHeight,
  isWaterHeight,
  normalizeTerrain,
  planTerrainEdit,
  scatterWildTrees,
  WATER_HEIGHT,
} from './terrain'
import type { TerrainEditMode, TerrainSnapshot } from './terrain'

export type Cell = { x: number; z: number; elevation: number }

export type PlacedBuilding = {
  id: string
  kind: BuildingKind
  x: number
  z: number
  rotation: number
  elevation: number
  stageDesign?: StageDesign
  staffOnly?: boolean
  wayType?: WayType
  pathType?: 'normal' | 'queue'
  queueDirection?: number
  queueEntryDirection?: number
  pathSlope?: -1 | 0 | 1
  pathSlopeDirection?: number
  price: number
  flowDirection?: number | null
  securityConfig?: SecurityGateConfig
  bandName?: string
  wasteFill?: number
}

export type VisitorNeeds = {
  hunger: number
  toilet: number
  fun: number
  energy: number
}

export type VisitorState =
  | 'entering'
  | 'exploring'
  | 'seeking'
  | 'using'
  | 'queuing'
  | 'riding'
  | 'sleeping'
  | 'camping'
  | 'socializing'
  | 'vomiting'
  | 'security-check'
  | 'medical-transport'
  | 'medical'
  | 'partying'
  | 'bench-resting'
  | 'relaxing'
  | 'camp-waiting'
  | 'vehicle-arrival'
  | 'bus-waiting'
  | 'bus-riding'
  | 'injured'
  | 'exiting'
  | 'leaving'
  | 'panicking'

export type VisitorEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited'

export type Visitor = {
  musicTaste?: MusicGenre
  audience?: Audience
  concertId?: string | null
  id: string
  name: string
  x: number
  y: number
  z: number
  cellX: number
  cellZ: number
  cellElevation: number
  color: number
  state: VisitorState
  thought: string
  needs: VisitorNeeds
  route: Cell[]
  targetId: string | null
  interactionRemaining: number
  walkSpeed: number
  movementBoostMinutes: number
  avoidedCoasterId: string | null
  avoidanceMinutes: number
  facing: number
  emotion: VisitorEmotion
  emotionMinutes: number
  budget: number
  alcoholLevel: number
  alcoholDisposition: 'calm' | 'aggressive'
  alcoholDesire: number
  campsite: Cell | null
  campingPhase: CampingPhase
  hasHandcart: boolean
  inventory: InventoryItem[]
  motivation: number
  crowding: number
  crowdStress: number
  isPanicking: boolean
  panicRecoverMinutes: number
  tileOffsetX: number
  tileOffsetZ: number
  campActivityTarget: Cell | null
  campActivity: 'standing' | 'sitting'
  campActivityKind: CampSetupKind | null
  campActivitySlot: number
  campActivityCapacity: number
  nausea: number
  nauseaCooldown: number
  medicalCell: Cell | null
  medicalSlot: number | null
  securityGateId: string | null
  securityResumeState: VisitorState | null
  beautyPreference: number
  partyPreference: number
  localAttractiveness: number
  localPartyMood: number
  activityTarget: Cell | null
  activitySlot: number
  activityCapacity: number
  isDancing: boolean
  preferredBedtime: number
  preferredWakeTime: number
  ticketType: 'day' | 'camping'
  consumptionCooldown: number
  isConversing: boolean
  campingWaitMinutes: number
  campingWaitRetryMinutes: number
  entryFeePaid: number
  complaintsFiled: ComplaintTopic[]
  arrivalGroupId: string | null
  arrivalMode: 'car' | 'pedestrian'
  injuryVehicleId: string | null
  rescueVehicleId: string | null
  busWaitMinutes: number
  busLineId: string | null
  busDestination: Cell | null
  busDestinationStopId: string | null
  busResumeState: VisitorState | null
  busResumeTargetId: string | null
  walkingToCampDistance: number
  pendingWaste: number
  streakingMinutes: number
  streakingCooldownMinutes: number
  pathSeed: number
  wanderNonce: number
  netX?: number
  netY?: number
  netZ?: number
  netFacing?: number
}

export type CashEffect = {
  id: string
  amount: number
  x: number
  y: number
  z: number
  age: number
}

export type SimTurn = {
  tick: number
  commands: GameCommand[]
  step: boolean
  hash: number
}

export type GameSnapshot = {
  festival: FestivalManagement
  version: 24
  simTick: number
  rngState: number
  money: number
  entryPrice: number
  parkOpen: boolean
  guests: number
  reputation: number
  day: number
  minute: number
  speed: number
  selectedTool: Tool
  buildElevation: number
  buildRotation: number
  buildings: PlacedBuilding[]
  campingCells: CampingCell[]
  campInstallations: CampInstallation[]
  visitors: Visitor[]
  coasters: Coaster[]
  cashEffects: CashEffect[]
  fireworkEffects: FireworkEffect[]
  crowding: CrowdingSnapshot
  staff: StaffMember[]
  medicalCells: MedicalCell[]
  wasteDumpCells: WasteDumpCell[]
  incidents: GroundIncident[]
  stageForecourtCells: StageForecourtCell[]
  attractiveness: AtmosphereSnapshot
  partyMood: AtmosphereSnapshot
  dayPlan: DayPlan
  complaints: ComplaintSnapshot
  logistics: LogisticsSnapshot
  scenario: ScenarioSettings
  terrain: TerrainSnapshot
  power: PowerSnapshot
}

export type ActionResult = {
  ok: boolean
  message: string
}

export type LocalSaveSlot = {
  id: string
  name: string
  savedAt: number
}

type StoredSaveSlot = LocalSaveSlot & { snapshot: string }

type Listener = (snapshot: Readonly<GameSnapshot>) => void

const ENTRANCE_PATH_ID = 'entrance-path'
const SIMULATION_SPEED_MULTIPLIERS = SIMULATION_CONFIG.time.speedMultipliers
const VISITOR_SPAWN_INTERVAL_MINUTES =
  SIMULATION_CONFIG.visitors.spawnIntervalMinutes
const BOARDING_MINUTES_PER_PERSON =
  SIMULATION_CONFIG.coasters.boardingMinutesPerPerson
const VISITOR_NAMES = [
  'Alex',
  'Mia',
  'Luca',
  'Emma',
  'Noah',
  'Lea',
  'Finn',
  'Lina',
  'Ben',
  'Sofia',
  'Elias',
  'Mila',
  'Jonas',
  'Nina',
  'Paul',
  'Marie',
]
const BAND_NAMES = ['Neon Echo', 'Festival Riot', 'Moonlight Avenue', 'Bassgarten']
const PEDESTRIAN_SOLID_KINDS = new Set<BuildingKind>([
  'food',
  'toilet',
  'ride',
  'alcohol',
  'tree',
  'hedge',
  'stage',
  'directionalSpeaker',
  'omniSpeaker',
  'ambulanceGarage',
  'busDepot',
  'wasteDepot',
  'generator',
  'backupGenerator',
  'foh',
  'delayTower',
  'videoWall',
  'laserShow',
  'fireworkBattery',
])
const PEDESTRIAN_OFFSETS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const

const NAV_PATH = 1
const NAV_ROAD = 2
const NAV_CAMPING = 4
const NAV_MEDICAL = 8
const NAV_FORECOURT = 16
const NAV_PARKING = 32
const NAV_WATER = 64
const NAV_GROUND = 128
const NAV_SOLID = 256
const NAV_PAVED = 512

type PedestrianNavLink = {
  node: PedestrianNavNode
  toPath?: PlacedBuilding
}

type PedestrianNavNode = {
  cell: Cell
  packed: number
  flags: number
  cost: number
  fenceMask: number
  roadBlocked: number
  path?: PlacedBuilding
  links: PedestrianNavLink[]
}

const PATH_COMPATIBLE_KINDS = new Set<BuildingKind>([
  'path',
  'fence',
  'bench',
  'lighting',
  'securityGate',
  'busStop',
  'wasteBin',
])

function createBlankSnapshot(
  scenario: ScenarioSettings = createDefaultScenarioSettings(),
): GameSnapshot {
  const settings = normalizeScenarioSettings(scenario)
  const entrance = createScenarioEntrance(settings.worldSize)
  return {
    festival: createFestivalManagement(),
    version: 24,
    simTick: 0,
    rngState: hashStringSeed(
      `festival-${settings.worldSize}-${settings.startingMoney}`,
    ),
    money: settings.startingMoney,
    entryPrice: SIMULATION_CONFIG.economy.defaultEntryPrice,
    parkOpen: true,
    guests: 0,
    reputation: SIMULATION_CONFIG.economy.startingReputation,
    day: 1,
    minute: SIMULATION_CONFIG.time.startMinute,
    speed: 1,
    selectedTool: 'inspect',
    buildElevation: 0,
    buildRotation: 0,
    buildings: [
      {
        id: ENTRANCE_PATH_ID,
        kind: 'path',
        x: entrance.x,
        z: entrance.z,
        rotation: 0,
        elevation: 0,
        pathType: 'normal',
        pathSlope: 0,
        pathSlopeDirection: 0,
        price: 0,
      },
    ],
    campingCells: [],
    campInstallations: [],
    visitors: [],
    coasters: [],
    cashEffects: [],
    fireworkEffects: [],
    crowding: { average: 0, maximum: 0, cells: [] },
    staff: [],
    medicalCells: [],
    wasteDumpCells: [],
    incidents: [],
    stageForecourtCells: [],
    attractiveness: { average: 0, maximum: 0, minimum: 0, cells: [] },
    partyMood: { average: 0, maximum: 0, minimum: 0, cells: [] },
    dayPlan: createDefaultDayPlan(),
    complaints: createComplaintSnapshot(),
    logistics: createDefaultLogisticsSnapshot(),
    scenario: settings,
    terrain: createEmptyTerrain(),
    power: createEmptyPower(),
  }
}

function createInitialSnapshot(
  scenario: ScenarioSettings = createDefaultScenarioSettings(),
): GameSnapshot {
  const snapshot = createBlankSnapshot(scenario)
  snapshot.parkOpen = false
  snapshot.festival.planning = true
  snapshot.festival.tickets = {day:150,camping:0,usedDay:{},usedCamping:0}
  const entrance = createScenarioEntrance(snapshot.scenario.worldSize)
  const rng = new DeterministicRng(snapshot.rngState)
  snapshot.terrain = generateTerrain(snapshot.scenario.worldSize, rng, snapshot.scenario.unevenness, snapshot.scenario.environment)
  snapshot.buildings.push(
    ...scatterWildTrees(
      snapshot.terrain,
      snapshot.scenario.worldSize,
      [entrance, createScenarioRoadEntry(snapshot.scenario.worldSize)],
      rng,
      snapshot.scenario.environment,
    ),
  )
  snapshot.rngState = rng.getState()
  return snapshot
}

export class GameState {
  private state: GameSnapshot
  private listeners = new Set<Listener>()
  private idCounter = 0
  private simulatedMinutes = 0
  private spawnMinutes = 0
  private uiRefreshSeconds = 0
  private crowdingMinutes = 0
  private camping: CampingSystem
  private fireworks = new FireworksSystem()
  private crowding = new CrowdingSystem()
  private crowdingCosts = new Map<string, number>()
  private buildingCellIndex = new Map<number, PlacedBuilding[]>()
  private pathExactIndex = new Map<number, PlacedBuilding>()
  private parkingIndex = new Map<number, true>()
  private medicalIndex = new Map<number, MedicalCell>()
  private wasteDumpIndex = new Map<number, WasteDumpCell>()
  private forecourtIndex = new Map<number, StageForecourtCell>()
  private coasterOccupancyIndex = new Map<
    number,
    Array<{ y: number; coasterId: string }>
  >()
  private indexedBuildingCount = -1
  private coasterIndexKey = ''
  private indexedParkingRef: readonly ParkingCell[] | null = null
  private indexedMedicalRef: readonly MedicalCell[] | null = null
  private indexedWasteDumpRef: readonly WasteDumpCell[] | null = null
  private indexedForecourtRef: readonly StageForecourtCell[] | null = null
  private terrainHeights: Int8Array | null = null
  private cachedWorldSize = 0
  private cachedWorldHalf = 0
  private crowdingCostPacked = new Map<number, number>()
  private attractivenessPacked = new Map<number, number>()
  private readonly neighborScratch: Cell[] = []
  private readonly neighborSeen = new Set<number>()
  private readonly pedestrianPathScratch = createPathScratch<Cell>()
  private readonly pedestrianPathCache = new Map<string, { path: readonly Cell[] | null; expires: number }>()
  private pedestrianNav = new Map<number, PedestrianNavNode>()
  private pedestrianNavKey = ''
  private visitorIndex = new Map<string, Visitor>()
  private indexedVisitorCount = -1
  private occupancyTick = -1
  private activityHeadcount = new Map<string, number>()
  private activitySlotBits = new Map<string, number>()
  private benchHeadcount = new Map<string, number>()
  private benchSlotBits = new Map<string, number>()
  private medical = new MedicalSystem()
  private incidents = new IncidentSystem()
  private security = new SecuritySystem()
  private staffSimulation = new StaffSimulation()
  private atmosphere = new AtmosphereSystem()
  private festivalAreas = new FestivalAreaSystem()
  private powerSystem = new PowerSystem()
  private poweredBuildingIds = new Set<string>()
  private showFireworkSlots = new Map<string, number>()
  private atmosphereMinutes = 0
  private attractivenessValues = new Map<string, number>()
  private partyMoodValues = new Map<string, number>()
  private roadGraph: RoadGraph | null = null
  private visitorsAwaitingDecision = new Set<string>()
  private processingSimulationStep = false
  private decisionBudget = 0
  private decidedThisTick = new Set<string>()
  private concertChoiceKey = ''
  private concertChoices:Array<{booking:Booking;band:(typeof BANDS)[number];stage:GameSnapshot['buildings'][number]}>=[]
  private concertSlotTick = -1
  private concertSlots = new Map<number, Set<number>>()
  /** Local diagnostic counter; deliberately excluded from saves and network state. */
  executedLogicTicks = 0
  networkMode: 'solo' | 'host' | 'client' = 'solo'
  commandOutbox: ((command: GameCommand) => void) | null = null
  onTurnCommit: ((turn: SimTurn) => void) | null = null
  onDesync: ((expected: number, actual: number) => void) | null = null
  onFestivalResult: ((result: ActionResult) => void) | null = null
  onCommandResult: ((command: GameCommand, result: ActionResult) => void) | null = null
  applyingCommand = false
  worldRevision = 0
  lockstepReady = true
  readonly rng: DeterministicRng = new DeterministicRng(1)
  private tickAccumulator = 0
  private lastNavRevision = -1
  private scheduledCommands = new Map<number, GameCommand[]>()
  private turnHashes = new Map<number, number>()
  private optimisticCommandSequence = 0
  private optimisticCommands = new Map<string, GameCommand>()

  constructor(snapshot?: GameSnapshot) {
    this.state = snapshot
      ? structuredClone(snapshot)
      : createInitialSnapshot()
    this.state.selectedTool = 'inspect'
    this.state.festival ??= createFestivalManagement()
    this.state.festival.infrastructure ??= createInfrastructure()
    this.state.scenario = normalizeScenarioSettings(this.state.scenario)
    this.camping = new CampingSystem({
      getCells: () => this.state.campingCells,
      setCells: (cells) => {
        this.state.campingCells = cells
      },
      getVisitors: () => this.state.visitors,
      getInstallations: () => this.state.campInstallations,
      setInstallations: (installations) => {
        this.state.campInstallations = installations
      },
      getItemQuantity: (visitorId, kind) => {
        const visitor = this.getVisitor(visitorId)
        return visitor ? getItemQuantity(visitor.inventory, kind) : 0
      },
      createId: () => this.nextId('camp-installation'),
      rng: () => this.rng,
      isInWorld: (x, z) => this.isInWorld(x, z),
      isGroundOccupied: (x, z) =>
        Boolean(
          this.getAt(x, z) ||
            this.getCoasterAt(x, z) ||
            this.getWasteDumpAt(x, z) ||
            this.isWaterTerrain(x, z),
        ),
      findPath: (start, goals, allowCamping) =>
        this.findPath(start, goals, false, allowCamping),
      hasPath: (cell) => Boolean(this.getPathAt(cell.x, cell.z, cell.elevation)),
      clearQueues: (visitorId) => this.removeVisitorFromCoasterQueues(visitorId),
      getAttractiveness: (x, z, elevation) =>
        this.getAtmosphereValue(this.attractivenessValues, x, z, elevation),
      getPartyMood: (x, z, elevation) =>
        this.getAtmosphereValue(this.partyMoodValues, x, z, elevation),
    })
    this.state.simTick ??= 0
    this.state.rngState ??= hashStringSeed('festival')
    this.rng.setState(this.state.rngState)
    this.state.entryPrice ??= SIMULATION_CONFIG.economy.defaultEntryPrice
    this.state.parkOpen ??= true
    this.state.campingCells ??= []
    this.state.campInstallations ??= []
    this.state.campInstallations.forEach((installation) => {
      installation.decay ??= 0
      installation.contributorIds ??= installation.ownerId ? [installation.ownerId] : []
    })
    this.state.staff ??= []
    this.state.medicalCells ??= []
    this.state.wasteDumpCells ??= []
    this.state.incidents ??= []
    this.state.incidents = this.mergeIncidentStacks(this.state.incidents)
    this.state.stageForecourtCells ??= []
    syncStageAudience(this.state)
    this.state.attractiveness ??= {
      average: 0,
      maximum: 0,
      minimum: 0,
      cells: [],
    }
    this.state.partyMood ??= {
      average: 0,
      maximum: 0,
      minimum: 0,
      cells: [],
    }
    this.state.dayPlan = normalizeDayPlan(this.state.dayPlan)
    this.state.complaints = normalizeComplaintSnapshot(
      this.state.complaints,
    )
    this.state.logistics = normalizeLogisticsSnapshot(
      this.state.logistics,
    )
    this.state.logistics.wasteDepots ??= []
    this.state.terrain = normalizeTerrain(this.state.terrain)
    this.state.power = normalizePower(this.state.power)
    this.rebuildTerrainCache()
    this.state.coasters ??= []
    this.state.cashEffects = []
    this.state.fireworkEffects = []
    this.state.crowding = { average: 0, maximum: 0, cells: [] }
    this.state.coasters.forEach((coaster) => {
      const track = sampleCoasterTrack(coaster, 0)
      coaster.train.distance ??= (coaster.train.progress ?? 0) * (track?.totalLength ?? 0)
      coaster.train.speed ??= 0
      coaster.train.passengerIds ??= []
      coaster.train.passengers = coaster.train.passengerIds.length
      coaster.queue ??= []
      coaster.operationMode ??= 'closed'
      coaster.ticketPrice ??= COASTER_TYPES[coaster.typeId].defaultTicketPrice
      coaster.pieces.forEach((piece) => migrateTrackPiece(piece))
      this.recalculateCoasterTrackState(coaster)
      coaster.telemetry ??= createCoasterTelemetry()
      coaster.telemetry.samples = Array.isArray(coaster.telemetry.samples)
        ? coaster.telemetry.samples
        : []
      coaster.telemetry.durationSeconds ??= 0
      coaster.telemetry.airtimeSeconds ??= 0
      coaster.telemetry.maxSpeedKmh ??= 0
      coaster.telemetry.minVerticalG =
        typeof coaster.telemetry.minVerticalG === 'number' &&
        Number.isFinite(coaster.telemetry.minVerticalG)
          ? coaster.telemetry.minVerticalG
          : Number.POSITIVE_INFINITY
      coaster.telemetry.maxVerticalG =
        typeof coaster.telemetry.maxVerticalG === 'number' &&
        Number.isFinite(coaster.telemetry.maxVerticalG)
          ? coaster.telemetry.maxVerticalG
          : Number.NEGATIVE_INFINITY
      coaster.telemetry.maxAbsLateralG ??= 0
      coaster.telemetry.maxAbsLongitudinalG ??= 0
      coaster.telemetry.completedRuns ??= 0
      coaster.telemetry.measuring ??= false
      coaster.telemetry.cumulativeDistanceMeters ??= 0
    })
    this.state.buildElevation ??= 0
    this.state.buildRotation ??= 0
    this.state.buildings.forEach((building) => {
      building.elevation ??= 0
      building.price ??= BUILDINGS[building.kind].defaultPrice
      if (building.kind === 'path') {
        building.pathType ??= 'normal'
        building.queueDirection ??= building.rotation
        building.queueEntryDirection ??= undefined
        building.pathSlope ??= 0
        building.pathSlopeDirection ??= building.rotation
        building.flowDirection ??= null
      }
      if (building.kind === 'securityGate') {
        building.securityConfig ??= structuredClone(DEFAULT_SECURITY_CONFIG)
      }
      if (building.kind === 'stage') {
        building.bandName ??=
          BAND_NAMES[Math.abs(building.x + building.z) % BAND_NAMES.length]
      }
      if (building.kind === 'wasteBin') {
        building.wasteFill ??= 0
      }
    })
    if (this.state.campInstallations.length === 0) {
      const legacyVisitors = this.state.visitors as Array<
        Visitor & { campSetup?: Array<{ cell: Cell; kind: CampSetupKind }> }
      >
      legacyVisitors.forEach((visitor) => {
        visitor.campSetup?.forEach((setup, index) => {
          const sharedChairs = this.state.campInstallations.find(
            (installation) =>
              installation.kind === 'chairs' &&
              installation.cell.x === setup.cell.x &&
              installation.cell.z === setup.cell.z,
          )
          if (sharedChairs) {
            if (!sharedChairs.contributorIds.includes(visitor.id)) {
              sharedChairs.contributorIds.push(visitor.id)
            }
            return
          }
          this.state.campInstallations.push({
            id: `legacy-camp-installation-${visitor.id}-${index}`,
            cell: { ...setup.cell },
            kind: setup.kind,
            ownerId: visitor.id,
            contributorIds: [visitor.id],
          })
        })
      })
    }
    this.state.visitors.forEach((visitor) => {
      visitor.y ??= this.getAt(visitor.cellX, visitor.cellZ)?.elevation ?? 0
      visitor.cellElevation ??= visitor.y
      visitor.walkSpeed ??=
        SIMULATION_CONFIG.visitors.walkSpeedMinimum +
        this.rng.next() * SIMULATION_CONFIG.visitors.walkSpeedRandomRange
      visitor.movementBoostMinutes ??= 0
      visitor.avoidedCoasterId ??= null
      visitor.avoidanceMinutes ??= 0
      visitor.facing ??= 0
      visitor.emotion ??= 'neutral'
      visitor.emotionMinutes ??= 0
      visitor.budget ??= SIMULATION_CONFIG.visitors.budget
      visitor.alcoholLevel ??= 0
      visitor.alcoholDisposition ??=
        this.rng.next() < SIMULATION_CONFIG.visitors.aggressiveProbability
          ? 'aggressive'
          : 'calm'
      visitor.alcoholDesire ??= 25 + this.rng.next() * 60
      visitor.campsite ??= null
      if ((visitor.campingPhase as string | undefined) === 'socializing') {
        visitor.state = 'socializing'
        visitor.campingPhase = visitor.campsite ? 'ready' : 'none'
      }
      visitor.campingPhase ??= visitor.campsite ? 'ready' : 'none'
      visitor.hasHandcart ??=
        visitor.campingPhase === 'seeking' ||
        visitor.campingPhase === 'building' ||
        visitor.campingPhase === 'packing'
      visitor.inventory = visitor.inventory
        ? normalizeInventory(visitor.inventory, Boolean(visitor.campsite))
        : normalizeInventory(createFestivalInventory(this.rng), Boolean(visitor.campsite))
      visitor.motivation ??= 100
      visitor.crowding ??= 0
      visitor.crowdStress ??= 0
      visitor.isPanicking ??= false
      visitor.panicRecoverMinutes ??= 0
      visitor.tileOffsetX ??= 0.1 + this.rng.next() * 0.8
      visitor.tileOffsetZ ??= 0.1 + this.rng.next() * 0.8
      visitor.campActivityTarget ??= null
      visitor.campActivity ??= 'standing'
      visitor.campActivityKind ??= null
      visitor.campActivitySlot ??= 0
      visitor.campActivityCapacity ??= 1
      visitor.nausea ??= 0
      visitor.nauseaCooldown ??= 0
      visitor.medicalCell ??= null
      visitor.medicalSlot ??= null
      visitor.securityGateId ??= null
      visitor.securityResumeState ??= null
      visitor.beautyPreference ??=
        SIMULATION_CONFIG.atmosphere.preferenceMinimum +
        this.rng.next() * SIMULATION_CONFIG.atmosphere.preferenceRandomRange
      visitor.partyPreference ??=
        SIMULATION_CONFIG.atmosphere.preferenceMinimum +
        this.rng.next() * SIMULATION_CONFIG.atmosphere.preferenceRandomRange
      visitor.localAttractiveness ??= 0
      visitor.localPartyMood ??= 0
      visitor.activityTarget ??= null
      visitor.activitySlot ??= 0
      visitor.activityCapacity ??= 1
      visitor.isDancing ??= false
      visitor.preferredBedtime ??= this.createPreferredBedtime()
      visitor.preferredWakeTime ??= this.createPreferredWakeTime()
      visitor.ticketType ??=
        getItemQuantity(visitor.inventory, 'tent') > 0
          ? 'camping'
          : 'day'
      visitor.consumptionCooldown ??= 0
      visitor.isConversing ??= false
      visitor.campingWaitMinutes ??= 0
      visitor.campingWaitRetryMinutes ??= 0
      visitor.entryFeePaid ??= this.state.entryPrice
      visitor.complaintsFiled ??= []
      visitor.arrivalGroupId ??= null
      visitor.arrivalMode ??= 'pedestrian'
      visitor.injuryVehicleId ??= null
      visitor.rescueVehicleId ??= null
      visitor.busWaitMinutes ??= 0
      visitor.busLineId ??= null
      visitor.busDestination ??= null
      visitor.busDestinationStopId ??= null
      visitor.busResumeState ??= null
      visitor.busResumeTargetId ??= null
      visitor.walkingToCampDistance ??= 0
      visitor.pendingWaste ??= 0
      visitor.streakingMinutes ??= 0
      visitor.streakingCooldownMinutes ??= 0
      visitor.pathSeed ??= hashStringSeed(visitor.id)
      visitor.wanderNonce ??= 0
      visitor.route = visitor.route.map((cell) => ({
        ...cell,
        elevation:
          cell.elevation ?? this.getPathAt(cell.x, cell.z)?.elevation ?? visitor.cellElevation,
      }))
    })
    this.state.staff.forEach((member) => {
      member.route ??= []
      member.targetId ??= null
      member.assignedBuildingId ??= null
      member.medicalCell ??= null
      member.medicalSlot ??= null
      member.workMinutes ??= 0
      member.carryingWaste ??= 0
    })
    this.ensureEntrancePath()
    this.ensureRoadIngress()
    this.migrateLegacyBusStopsToRoadside()
    this.recalculateQueueDirections()
    this.refreshPower()
    this.state.guests = this.state.visitors.length
    this.idCounter =
      this.state.buildings.length +
      this.state.visitors.length +
      this.state.campInstallations.length +
      this.state.coasters.reduce((total, coaster) => total + coaster.pieces.length + 1, 0)
  }

  static startNew(settings: ScenarioSettings): GameState {
    return new GameState(createInitialSnapshot(settings))
  }

  get snapshot(): Readonly<GameSnapshot> {
    return this.state
  }

  get renderAlpha(): number {
    if (this.state.speed === 0) return 1
    return Math.min(
      1,
      this.tickAccumulator / (this.networkMode === 'client' ? 0.2 : SIMULATION_CONFIG.time.tickSeconds),
    )
  }

  private getScenario(): ScenarioSettings {
    return this.state.scenario
  }

  private getWorldSize(): number {
    if (this.cachedWorldSize === 0) this.rebuildTerrainCache()
    return this.cachedWorldSize || this.getScenario().worldSize
  }

  private getEntrance(): Cell {
    const planned = createScenarioEntrance(this.getWorldSize())
    const path = this.state.buildings.find((building) => building.id === ENTRANCE_PATH_ID)
    if (path) return { x: path.x, z: path.z, elevation: path.elevation }
    return { x: planned.x, z: planned.z, elevation: this.getTerrainHeight(planned.x, planned.z) }
  }

  private getRoadEntry(): RoadPosition {
    return createScenarioRoadEntry(this.getWorldSize())
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  gate(command: GameCommand): ActionResult | null {
    if (this.applyingCommand) return null
    if (this.networkMode === 'solo') return null
    if (this.networkMode === 'host') return this.executeHostCommand(command)
    if (this.networkMode === 'client' && this.isOptimisticConstruction(command)) {
      const commandId = `client-${Date.now().toString(36)}-${++this.optimisticCommandSequence}`
      command.clientCommandId = commandId
      this.applyingCommand = true
      let result: ActionResult
      try {
        result = applyGameCommand(this, command)
      } finally {
        this.applyingCommand = false
      }
      if (!result.ok) return result
      this.optimisticCommands.set(commandId, structuredClone(command))
      this.commandOutbox?.(command)
      return result
    }
    this.commandOutbox?.(command)
    return { ok: true, message: 'Befehl eingeplant' }
  }

  private isOptimisticConstruction(command: GameCommand): boolean {
    if (command.type === 'festival') {
      return ['ground', 'groundArea', 'depot', 'removeDepot', 'staffGate', 'wayArea', 'stageDesign'].includes(command.action.type)
    }
    return [
      'place', 'placePath', 'undoPath', 'bulldoze', 'bulldozeArea', 'editTerrain',
      'designateRoad', 'designateParking', 'designateCampingCell',
      'designateCampingArea', 'designateMedicalArea', 'designateWasteDump',
      'designateStageForecourt', 'designatePowerCable', 'designatePowerCableArea',
      'setRoadDirection', 'toggleRoadSeparator', 'toggleCrosswalk', 'setRoadSpeed',
      'setPathFlow', 'startCoaster', 'appendCoasterPiece', 'undoCoasterPiece',
      'deleteCoasterPiece', 'setCoasterAccess',
    ].includes(command.type)
  }

  resolveOptimisticCommand(commandId: string): boolean {
    return this.optimisticCommands.delete(commandId)
  }

  private replayOptimisticCommands(): void {
    if (this.optimisticCommands.size === 0) return
    this.applyingCommand = true
    try {
      for (const command of this.optimisticCommands.values()) applyGameCommand(this, command)
    } finally {
      this.applyingCommand = false
    }
  }

  prepareClientLockstep(): void {
    this.lockstepReady = false
    this.scheduledCommands.clear()
    this.turnHashes.clear()
    this.optimisticCommands.clear()
  }

  receiveTurn(turn: SimTurn): void {
    if (turn.tick < this.state.simTick) {
      if (turn.commands.length > 0) this.onDesync?.(turn.hash, this.hashSim())
      return
    }
    if (turn.commands.length > 0) {
      const queued = this.scheduledCommands.get(turn.tick) ?? []
      queued.push(...turn.commands)
      this.scheduledCommands.set(turn.tick, queued)
    }
    if (turn.hash) this.turnHashes.set(turn.tick, turn.hash)
  }

  schedulePublicCommand(command: GameCommand): void {
    this.executeHostCommand(command)
  }

  private executeHostCommand(command: GameCommand): ActionResult {
    const elevation = this.state.buildElevation
    const rotation = this.state.buildRotation
    const applying = this.applyingCommand
    this.applyingCommand = true
    let result: ActionResult
    try {
      if (command.context) {
        this.state.buildElevation = command.context.buildElevation
        this.state.buildRotation = command.context.buildRotation
      }
      result = applyGameCommand(this, command)
    } finally {
      this.state.buildElevation = elevation
      this.state.buildRotation = rotation
      this.applyingCommand = applying
    }
    this.onCommandResult?.(command, result)
    if (command.type === 'festival' && !command.originPlayerId) this.onFestivalResult?.(result)
    return result
  }

  private nextId(prefix: string): string {
    this.idCounter += 1
    return `${prefix}-${this.state.simTick}-${this.idCounter}`
  }

  private takeScheduledCommands(tick: number): GameCommand[] {
    const commands = this.scheduledCommands.get(tick) ?? []
    this.scheduledCommands.delete(tick)
    return commands
  }

  private hashSim(): number {
    let hash = this.state.simTick >>> 0
    hash = Math.imul(hash ^ (this.state.money | 0), 16777619)
    hash = Math.imul(hash ^ this.state.guests, 16777619)
    hash = Math.imul(hash ^ ((this.state.minute * 1000) | 0), 16777619)
    hash = Math.imul(hash ^ this.rng.getState(), 16777619)
    hash = Math.imul(hash ^ this.state.speed, 16777619)
    const visitor = this.state.visitors[0]
    if (visitor) {
      hash = Math.imul(
        hash ^ (visitor.cellX * 1009 + visitor.cellZ * 9176 + visitor.cellElevation),
        16777619,
      )
    }
    return hash >>> 0
  }

  private applyTurnCommands(commands: readonly GameCommand[]): void {
    this.applyingCommand = true
    try {
      for (const command of commands) {
        const elevation = this.state.buildElevation
        const rotation = this.state.buildRotation
        try {
          if (command.context) {
            this.state.buildElevation = command.context.buildElevation
            this.state.buildRotation = command.context.buildRotation
          }
          const result = applyGameCommand(this, command)
          this.onCommandResult?.(command, result)
          if (command.type === 'festival') this.onFestivalResult?.(result)
        } finally {
          this.state.buildElevation = elevation
          this.state.buildRotation = rotation
        }
      }
    } finally {
      this.applyingCommand = false
    }
  }

  private advanceOne(step: boolean): void {
    const tick = this.state.simTick
    this.applyTurnCommands(this.takeScheduledCommands(tick))
    if (step) this.stepFixed()
    this.state.simTick += 1
    this.state.rngState = this.rng.getState()
    const expected = this.turnHashes.get(this.state.simTick)
    if (expected) {
      this.turnHashes.delete(this.state.simTick)
      const actual = this.hashSim()
      if (expected !== actual) this.onDesync?.(expected, actual)
    } else if (
      this.networkMode === 'host' &&
      this.state.simTick % SIMULATION_CONFIG.time.hashIntervalTicks === 0
    ) {
      this.onTurnCommit?.({
        tick: this.state.simTick,
        commands: [],
        step,
        hash: this.hashSim(),
      })
    }
    if (!step) this.emit('tick')
  }

  private runReadyTurns(): void {
    while (this.scheduledCommands.has(this.state.simTick) && this.state.speed === 0) {
      this.advanceOne(false)
    }
  }

  refreshAfterNetworkApply(): void {
    this.indexedBuildingCount = -1
    this.indexedVisitorCount = -1
    this.roadGraph = null
    this.pedestrianNav.clear()
    this.pedestrianNavKey = ''
    this.pedestrianPathCache.clear()
    this.rebuildTerrainCache()
    this.emit('tick')
  }

  applyNetworkWorld(world: WorldSnapshot): void {
    applyWorld(this.state, world)
    this.state.simTick ??= 0
    this.state.rngState ??= 1
    this.rng.setState(this.state.rngState)
    this.scheduledCommands.clear()
    this.turnHashes.clear()
    this.tickAccumulator = 0
    this.lastNavRevision = -1
    this.lockstepReady = true
    this.refreshAfterNetworkApply()
    this.replayOptimisticCommands()
  }

  applyNetworkSim(sim: SimSnapshot): void {
    applySim(this.state, sim)
    this.indexedVisitorCount = -1
    this.emit('tick')
  }

  manageFestival(action: FestivalAction): ActionResult {
    const blocked = this.gate({ type: 'festival', action })
    if (blocked) return blocked
    if (action.type === 'depot' && (this.isLogisticsBuildingCell(action.x, action.z) || this.coasterOccupiesVolume(action.x, action.z, this.getTerrainHeight(action.x, action.z), 1))) return { ok: false, message: 'Diese Fläche ist bereits bebaut' }
    if (action.type === 'stageDesign' && action.stageId) {
      const invalid = stageDesignIssue(action.design)
      if(invalid)return {ok:false,message:invalid}
      const stage=this.state.buildings.find(b=>b.id===action.stageId&&b.kind==='stage')
      if(stage){const issue=this.checkStageSite(action.design,stage.x,stage.z,stage.rotation,stage.elevation,stage.id);if(issue)return {ok:false,message:issue}}
    }
    let result: ActionResult
    this.wayBatch = action.type === 'wayArea'
    try { result = action.type === 'wayArea' ? this.buildWayArea(action.from, action.to, action.kind) : festivalAction(this.state, action) } finally { this.wayBatch = false }
    if (result.ok && action.type === 'stageDesign') { syncStageAudience(this.state); this.indexedBuildingCount=-1; this.refreshPower() }
    if (result.ok) { this.atmosphereMinutes = 999; this.worldRevision++; this.emit() }
    return result
  }

  private buildWayArea(from: { x: number; z: number }, to: { x: number; z: number }, kind: WayType): ActionResult {
    const type = WAY_TYPES[kind]
    if (!type) return { ok: false, message: 'Unbekannter Wegtyp' }
    const cells = groundRectangle(this.state, from, to)
    let changed = 0, reason = 'Keine geeigneten Felder'; const money = this.state.money
    for (const c of cells) {
      const key = groundKey(c.x, c.z), work = this.state.festival.infrastructure.ground[key]
      const property = type.mode === 'foot' ? 'footway' : 'roadway'
      const existing = type.mode === 'foot' ? this.getPathAt(c.x, c.z, this.getTerrainHeight(c.x, c.z)) : this.getRoadCellAt(c.x, c.z)
      if (existing && work?.[property] === kind) continue
      const issue = wayIssue(this.state, c.x, c.z, kind)
      if (issue) { reason = issue; continue }
      const base = type.mode === 'foot' ? BUILDINGS.path.cost : SIMULATION_CONFIG.logistics.roadBuildCost
      const extra = existing ? type.cost : type.cost - base
      const clear = existing ? 0 : this.getTreeClearCost(c.x, c.z, this.getTerrainHeight(c.x, c.z), 1)
      if (this.state.money < type.cost + clear) { reason = 'Budget erschöpft'; continue }
      if (!existing) {
        const result = type.mode === 'foot' ? this.placePathSegment(c.x, c.z, this.getTerrainHeight(c.x, c.z)) : this.designateRoad([c])
        if (!result.ok) { reason = result.message; continue }
      }
      const path = type.mode === 'foot' ? this.getPathAt(c.x, c.z, this.getTerrainHeight(c.x, c.z)) : undefined
      const road = type.mode === 'road' ? this.getRoadCellAt(c.x, c.z) : undefined
      if (!path && !road) { reason = 'Weg konnte an dieser Stelle nicht angelegt werden'; continue }
      this.state.money -= extra
      const cell = this.state.festival.infrastructure.ground[key] ??= {}
      cell[property] = kind
      if (path) path.wayType = kind
      if (road) road.speedLimit = type.limit as SpeedLimit
      changed++
    }
    if (changed) this.invalidateRoadGraph()
    return { ok: changed > 0, message: changed ? `${changed} × ${type.name} · ${money - this.state.money} €${cells.length > changed ? ` · ${cells.length - changed} übersprungen: ${reason}` : ''}` : reason }
  }

  applyNetworkUpdate(
    world: Partial<WorldSnapshot>,
    visitors: Array<{ id: string; changes: Partial<Visitor> }> = [],
    removed: string[] = [],
  ): void {
    Object.assign(this.state, world)
    const byId = new Map(this.state.visitors.map(visitor => [visitor.id, visitor]))
    for (const id of removed) byId.delete(id)
    for (const patch of visitors) {
      const existing = byId.get(patch.id)
      if (existing) Object.assign(existing, patch.changes)
      else byId.set(patch.id, patch.changes as Visitor)
    }
    this.state.visitors = [...byId.values()]
    this.tickAccumulator = 0
    this.indexedVisitorCount = -1
    if (world.buildings || world.terrain || world.scenario || world.logistics ||
        world.campingCells || world.medicalCells || world.stageForecourtCells) {
      this.refreshAfterNetworkApply()
    } else {
      this.emit('tick')
    }
  }

  setTool(tool: Tool): void {
    this.state.selectedTool = tool
    this.emit('local')
  }

  getTerrainHeight(x: number, z: number): number {
    if (!this.terrainHeights) this.rebuildTerrainCache()
    const heights = this.terrainHeights
    if (!heights) return 0
    const size = this.cachedWorldSize
    const ix = x + this.cachedWorldHalf
    const iz = z + this.cachedWorldHalf
    if (ix < 0 || iz < 0 || ix >= size || iz >= size) return 0
    return heights[(iz * size + ix) | 0]!
  }

  isWaterTerrain(x: number, z: number): boolean {
    return isWaterHeight(this.getTerrainHeight(x, z))
  }

  isMudTerrain(x: number, z: number): boolean {
    return isMudHeight(this.getTerrainHeight(x, z))
  }

  editTerrain(x: number, z: number, mode: TerrainEditMode): ActionResult {
    const planned = planTerrainEdit(
      this.state.terrain,
      this.getWorldSize(),
      x,
      z,
      mode,
      (cellX, cellZ) => this.isTerrainProtected(cellX, cellZ),
    )
    if (!planned.ok) return planned
    const cost = planned.changes.length * SIMULATION_CONFIG.terrain.editCost
    if (this.state.money < cost) {
      return {
        ok: false,
        message: `Nicht genug Geld (${cost} € für ${planned.changes.length} Felder)`,
      }
    }
    this.state.money -= cost
    applyTerrainChanges(this.state.terrain, planned.changes)
    for (const c of planned.changes) delete this.state.festival.infrastructure.ground[groundKey(c.x, c.z)]
    this.terrainHeights = null
    planned.changes.forEach((change) => {
      this.state.buildings.forEach((building) => {
        if (building.kind !== 'tree') return
        if (building.x !== change.x || building.z !== change.z) return
        building.elevation = change.to
      })
      this.state.visitors.forEach((visitor) => {
        if (visitor.cellX !== change.x || visitor.cellZ !== change.z) return
        if (this.getPathAt(visitor.cellX, visitor.cellZ, visitor.cellElevation)) {
          return
        }
        visitor.y = change.to
        visitor.cellElevation = change.to
      })
    })
    this.emit()
    const verb =
      mode === 'raise' ? 'erhöht' : mode === 'lower' ? 'abgesenkt' : 'eingeebnet'
    return {
      ok: true,
      message: `Gelände ${verb} (${planned.changes.length} Feld${
        planned.changes.length === 1 ? '' : 'er'
      }, ${cost} €)`,
    }
  }

  adjustBuildElevation(delta: number): void {
    this.state.buildElevation = Math.max(
      0,
      Math.min(6, this.state.buildElevation + Math.sign(delta)),
    )
    this.emit('local')
  }

  rotateBuild(): void {
    this.state.buildRotation = (this.state.buildRotation + 1) % 4
    this.emit('local')
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.max(0, Math.min(3, Math.floor(speed)))
    this.emit()
  }

  setParkOpen(open: boolean): ActionResult {
    if (open && (this.state.festival.planning || this.state.festival.finished)) return { ok: false, message: 'Zuerst das Festival im Festivalmenü starten' }
    if (this.state.parkOpen === open) {
      return { ok: true, message: open ? 'Der Park ist bereits geöffnet' : 'Der Park ist bereits geschlossen' }
    }
    this.state.parkOpen = open
    if (!open) {
      this.state.visitors.forEach((visitor) => {
        if (visitor.state !== 'riding') this.beginVisitorDeparture(visitor)
      })
    }
    this.emit()
    return {
      ok: true,
      message: open
        ? 'Der Park ist wieder geöffnet'
        : 'Der Park ist geschlossen – die Besucher reisen ab',
    }
  }

  private isVisitorInDepartureVehicle(visitor: Visitor): boolean {
    return (
      visitor.state === 'vehicle-arrival' &&
      Boolean(
        this.state.logistics.roadVehicles.find(
          (vehicle) =>
            vehicle.kind === 'visitorCar' &&
            vehicle.passengerIds.includes(visitor.id),
        ),
      )
    )
  }

  private beginVisitorDeparture(visitor: Visitor): void {
    if (this.isVisitorInDepartureVehicle(visitor)) return
    if ((visitor.pendingWaste ?? 0) > 0 && visitor.campingPhase !== 'packing') {
      this.tryDisposeWaste(visitor)
      if (visitor.state === 'seeking' && visitor.pendingWaste > 0) return
    }
    this.clearVisitorActivity(visitor)
    this.removeVisitorFromCoasterQueues(visitor.id)
    visitor.streakingMinutes = 0
    this.medical.releaseBed(this.state.medicalCells, visitor.id)
    visitor.medicalCell = null
    visitor.medicalSlot = null
    visitor.securityResumeState = null
    this.state.staff.forEach((member) => {
      if (member.targetId !== visitor.id) return
      member.targetId = null
      member.route = []
      member.medicalCell = null
      member.medicalSlot = null
      member.state = 'patrolling'
    })
    this.camping.beginDeparture(visitor, this.getEntrance())
    if (visitor.state === 'leaving') this.leaveVisitorCampBehind(visitor)
    if (visitor.ticketType === 'day') visitor.hasHandcart = false
    this.ensureExitRoute(visitor)
  }

  private ensureExitRoute(visitor: Visitor): void {
    if (
      visitor.state !== 'leaving' ||
      this.isAtEntrance(visitor)
    ) {
      return
    }
    if (this.routeVisitorToParkedCar(visitor)) return
    if (visitor.route.length > 0) return
    visitor.route =
      this.findPath(
        {
          x: visitor.cellX,
          z: visitor.cellZ,
          elevation: visitor.cellElevation,
        },
        [this.getEntrance()],
        true,
        true,
        true,
        true,
      ) ?? [this.getEntrance()]
    visitor.thought = 'Der Park ist geschlossen – ich gehe jetzt zum Ausgang.'
  }

  private routeVisitorToParkedCar(visitor: Visitor): boolean {
    if (!visitor.arrivalGroupId) return false
    const group = this.state.logistics.arrivalGroups.find(
      (candidate) => candidate.id === visitor.arrivalGroupId,
    )
    const vehicle = group?.vehicleId
      ? this.state.logistics.roadVehicles.find(
          (candidate) =>
            candidate.id === group.vehicleId &&
            candidate.kind === 'visitorCar' &&
            candidate.state === 'parked' &&
            candidate.parkingCell,
        )
      : undefined
    if (!vehicle?.parkingCell) return false
    if (visitor.targetId === vehicle.id) return true
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const route = this.getAdjacentRoadPositions(vehicle.parkingCell)
      .flatMap((access) => {
        const path = this.findPath(start, [{ ...access, elevation: 0 }])
        return path ? [{ path, access }] : []
      })
      .sort((left, right) => left.path.length - right.path.length)[0]
    if (!route) return false
    visitor.targetId = vehicle.id
    visitor.route = route.path
    visitor.thought = 'Ich gehe zurück zu unserem Auto.'
    return true
  }

  private tryBoardDepartureCar(visitor: Visitor): boolean {
    if (!visitor.targetId) return false
    const vehicle = this.state.logistics.roadVehicles.find(
      (candidate) =>
        candidate.id === visitor.targetId &&
        candidate.kind === 'visitorCar' &&
        candidate.state === 'parked',
    )
    if (!vehicle) return false
    if (!vehicle.passengerIds.includes(visitor.id)) {
      vehicle.passengerIds.push(visitor.id)
    }
    visitor.state = 'vehicle-arrival'
    visitor.route = []
    visitor.x = vehicle.position.x + 0.5
    visitor.z = vehicle.position.z + 0.5
    visitor.cellX = vehicle.position.x
    visitor.cellZ = vehicle.position.z
    visitor.thought = 'Ich sitze im Auto und warte auf die Abfahrt.'
    return true
  }

  hireStaff(role: StaffRole): ActionResult {
    const definition = STAFF_DEFINITIONS[role]
    if (this.state.money < definition.hireCost) {
      return { ok: false, message: 'Nicht genug Geld für diese Einstellung' }
    }
    this.state.money -= definition.hireCost
    const member = createStaffMember(this.nextId('staff'), role, this.getEntrance())
    const usedNumbers = new Set(
      this.state.staff
        .filter((p) => p.role === role)
        .map((p) => Number(/(\d+)$/.exec(p.name)?.[1]))
        .filter((n) => Number.isInteger(n)),
    )
    let number = 1
    while (usedNumbers.has(number)) number += 1
    member.name = `${definition.name} ${number}`
    member.hiredDay = this.state.day
    member.hiredMinute = this.state.minute
    this.state.staff.push(member)
    this.emit()
    return { ok: true, message: `${definition.name} eingestellt` }
  }

  toggleStaffZone(staffId: string, key: string): ActionResult {
    const member = this.state.staff.find((p) => p.id === staffId)
    if (!member) return { ok: false, message: 'Personal nicht gefunden' }
    const zones = member.workZones ?? []
    const has = zones.includes(key)
    if (has) {
      const next = zones.filter((z) => z !== key)
      if (!zonesConnected(next)) {
        return { ok: false, message: 'Bereiche müssen zusammenhängend bleiben - zuerst die trennende Seite entfernen' }
      }
      member.workZones = next
    } else {
      if (zones.length && !isZoneAdjacentToAny(key, zones)) {
        return { ok: false, message: 'Bereiche müssen zusammenhängend sein' }
      }
      member.workZones = [...zones, key]
    }
    if (member.state === 'patrolling') member.route = []
    this.emit()
    return { ok: true, message: has ? 'Bereich entfernt' : 'Bereich zugewiesen' }
  }

  placeStaffAt(staffId: string, x: number, z: number): ActionResult {
    const member = this.state.staff.find((p) => p.id === staffId)
    if (!member) return { ok: false, message: 'Personal nicht gefunden' }
    const half = this.getWorldSize() / 2
    if (!Number.isInteger(x) || !Number.isInteger(z) || x < -half || x >= half || z < -half || z >= half) {
      return { ok: false, message: 'Ziel liegt außerhalb der Karte' }
    }
    if (this.isWaterTerrain(x, z)) return { ok: false, message: 'Dort ist Wasser' }
    const elevation = this.getTerrainHeight(x, z)
    member.cellX = x
    member.cellZ = z
    member.cellElevation = elevation
    member.x = x + 0.5
    member.y = elevation
    member.z = z + 0.5
    member.route = []
    member.targetId = null
    this.emit()
    return { ok: true, message: `${member.name} platziert` }
  }

  fireStaff(role: StaffRole): ActionResult {
    let index = -1
    for (let cursor = this.state.staff.length - 1; cursor >= 0; cursor -= 1) {
      const member = this.state.staff[cursor]
      if (
        member?.role === role &&
        member.state !== 'carrying' &&
        (member.carryingWaste ?? 0) <= 0
      ) {
        index = cursor
        break
      }
    }
    if (index < 0) return { ok: false, message: 'Kein verfügbares Personal dieser Rolle' }
    const [removed] = this.state.staff.splice(index, 1)
    if (removed?.medicalCell && removed.targetId) {
      this.medical.releaseBed(this.state.medicalCells, removed.targetId)
    }
    this.emit()
    return { ok: true, message: `${STAFF_DEFINITIONS[role].name} entlassen` }
  }

  fireStaffMember(staffId: string): ActionResult {
    const index = this.state.staff.findIndex((p) => p.id === staffId)
    if (index < 0) return { ok: false, message: 'Personal nicht gefunden' }
    const member = this.state.staff[index]!
    if (member.state === 'carrying' || (member.carryingWaste ?? 0) > 0) {
      return { ok: false, message: 'Person trägt noch Fracht und kann gerade nicht entlassen werden' }
    }
    const [removed] = this.state.staff.splice(index, 1)
    if (removed?.medicalCell && removed.targetId) {
      this.medical.releaseBed(this.state.medicalCells, removed.targetId)
    }
    this.emit()
    return { ok: true, message: `${removed!.name} entlassen` }
  }

  designateMedicalArea(
    cells: ReadonlyArray<{ x: number; z: number }>,
  ): ActionResult {
    const result = this.medical.designate(
      this.state.medicalCells,
      cells,
      (x, z) =>
        this.isInWorld(x, z) &&
        !this.isWaterTerrain(x, z) &&
        (!this.getAt(x, z) || this.getAt(x, z)?.kind === 'tree') &&
        !this.getCampingCellAt(x, z) &&
        !this.getWasteDumpAt(x, z) &&
        !this.getCoasterAt(x, z),
    )
    result.cells.forEach((cell) => {
      this.clearTreesAt(cell.x, cell.z, 0, 1)
      cell.elevation = this.getTerrainHeight(cell.x, cell.z)
    })
    this.state.medicalCells = result.cells
    this.emit()
    return {
      ok: result.placed > 0,
      message:
        result.placed > 0
          ? `${result.placed} Felder als Krankenbereich ausgewiesen`
          : 'Keine freien Felder für den Krankenbereich',
    }
  }

  getMedicalCellAt(x: number, z: number): MedicalCell | undefined {
    this.ensureSpatialIndexes()
    return this.medicalIndex.get(this.packXZ(x, z))
  }

  getWasteDumpAt(x: number, z: number): WasteDumpCell | undefined {
    this.ensureSpatialIndexes()
    return this.wasteDumpIndex.get(this.packXZ(x, z))
  }

  designateWasteDump(
    cells: ReadonlyArray<{ x: number; z: number }>,
  ): ActionResult {
    const result = designateWasteDumps(
      this.state.wasteDumpCells,
      cells,
      (x, z) =>
        this.isInWorld(x, z) &&
        !this.isWaterTerrain(x, z) &&
        (!this.getAt(x, z) || this.getAt(x, z)?.kind === 'tree') &&
        !this.getCampingCellAt(x, z) &&
        !this.getMedicalCellAt(x, z) &&
        !this.getStageForecourtCellAt(x, z) &&
        !this.getWasteDumpAt(x, z) &&
        !this.getRoadCellAt(x, z) &&
        !this.hasParkingAt(x, z) &&
        !this.getCoasterAt(x, z),
      this.state.money,
    )
    result.cells.forEach((cell) => {
      this.clearTreesAt(cell.x, cell.z, 0, 1)
      cell.elevation = this.getTerrainHeight(cell.x, cell.z)
    })
    this.state.money -= result.cost
    this.state.wasteDumpCells = result.cells
    this.emit()
    return {
      ok: result.placed > 0,
      message:
        result.placed > 0
          ? `${result.placed} Felder als Müllablage ausgewiesen`
          : this.state.money < SIMULATION_CONFIG.waste.dumpDesignationCost
            ? 'Nicht genug Geld für eine Müllablage'
            : 'Keine freien Felder für eine Müllablage',
    }
  }

  getStageForecourtCellAt(
    x: number,
    z: number,
  ): StageForecourtCell | undefined {
    this.ensureSpatialIndexes()
    return this.forecourtIndex.get(this.packXZ(x, z))
  }

  designateStageForecourt(
    cells: ReadonlyArray<{ x: number; z: number }>,
  ): ActionResult {
    const result = this.festivalAreas.designate(
      this.state.stageForecourtCells,
      cells,
      (x, z) =>
        this.isInWorld(x, z) &&
        !this.isWaterTerrain(x, z) &&
        (!this.getAt(x, z) || this.getAt(x, z)?.kind === 'tree') &&
        !this.getCampingCellAt(x, z) &&
        !this.getMedicalCellAt(x, z) &&
        !this.getWasteDumpAt(x, z) &&
        !this.getCoasterAt(x, z),
      this.state.money,
    )
    result.cells.forEach((cell) => {
      this.clearTreesAt(cell.x, cell.z, 0, 1)
      cell.elevation = this.getTerrainHeight(cell.x, cell.z)
    })
    this.state.stageForecourtCells = result.cells
    this.state.money -= result.cost
    this.emit()
    return {
      ok: result.placed > 0,
      message:
        result.placed > 0
          ? `${result.placed} Bühnenvorplatz-Felder ausgewiesen`
          : 'Keine freien oder bezahlbaren Felder für den Bühnenvorplatz',
    }
  }

  setPathFlow(
    x: number,
    z: number,
    elevation: number,
    direction: number | null,
  ): ActionResult {
    const path = this.getPathAt(x, z, elevation)
    if (!path || path.pathType !== 'normal') {
      return { ok: false, message: 'Nur normale Wege können eine Laufrichtung erhalten' }
    }
    path.flowDirection = normalizeFlowDirection(direction)
    this.emit()
    return {
      ok: true,
      message:
        path.flowDirection == null
          ? 'Bewegungsrichtung entfernt'
          : 'Bewegungsrichtung des Weges gesetzt',
    }
  }

  updateSecurityGate(
    id: string,
    config: Partial<SecurityGateConfig>,
  ): ActionResult {
    const gate = this.state.buildings.find(
      (building) => building.id === id && building.kind === 'securityGate',
    )
    if (!gate) return { ok: false, message: 'Sicherheitsschleuse nicht gefunden' }
    gate.securityConfig = {
      ...(gate.securityConfig ?? DEFAULT_SECURITY_CONFIG),
      ...config,
      thoroughness: Math.max(
        0,
        Math.min(1, config.thoroughness ?? gate.securityConfig?.thoroughness ?? 0.5),
      ),
    }
    this.emit()
    return { ok: true, message: 'Sicherheitseinstellungen gespeichert' }
  }

  getAt(x: number, z: number, elevation?: number): PlacedBuilding | undefined {
    const matches = this.getBuildingsAtCell(x, z).filter(
      (item) =>
        elevation === undefined || this.volumesOverlap(item, elevation, 0.01),
    )
    return matches.sort((a, b) => {
      const elevationDifference = b.elevation - a.elevation
      if (elevationDifference !== 0) return elevationDifference
      if (a.kind === 'path' && b.kind !== 'path') return 1
      if (b.kind === 'path' && a.kind !== 'path') return -1
      return 0
    })[0]
  }

  getPathAt(x: number, z: number, elevation?: number): PlacedBuilding | undefined {
    this.ensureSpatialIndexes()
    if (elevation !== undefined) {
      return this.pathExactIndex.get(this.packCell({ x, z, elevation }))
    }
    let best: PlacedBuilding | undefined
    for (const item of this.getBuildingsAtCell(x, z)) {
      if (item.kind !== 'path') continue
      if (!best || item.elevation > best.elevation) best = item
    }
    return best
  }

  private getSecurityGateAt(
    x: number,
    z: number,
    elevation?: number,
  ): PlacedBuilding | undefined {
    for (const building of this.getBuildingsAtCell(x, z)) {
      if (building.kind !== 'securityGate') continue
      if (
        elevation === undefined ||
        Math.abs(building.elevation - elevation) < 0.01
      ) {
        return building
      }
    }
    return undefined
  }

  getCampingCellAt(x: number, z: number): CampingCell | undefined {
    return this.camping.getCellAt(x, z)
  }

  designateCampingCell(x: number, z: number, enabled = true): ActionResult {
    if (enabled && this.isWaterTerrain(x, z)) {
      return { ok: false, message: 'Im Wasser kann kein Zeltbereich entstehen' }
    }
    if (enabled) {
      const clearCost = this.getTreeClearCost(x, z, 0, 1)
      if (this.state.money < clearCost) {
        return { ok: false, message: 'Nicht genug Geld, um den Baum zu entfernen' }
      }
      this.clearTreesAt(x, z, 0, 1)
    }
    const result = this.camping.designateCell(x, z, enabled)
    const cell = this.getCampingCellAt(x, z)
    if (cell) cell.elevation = this.getTerrainHeight(x, z)
    result.displacedVisitors.forEach((visitor) => {
      const current = this.getVisitor(visitor.id)
      if (current) this.decideNextAction(current)
    })
    this.emit()
    return { ok: result.ok, message: result.message }
  }

  designateCampingArea(cells: ReadonlyArray<{ x: number; z: number }>): ActionResult {
    const landCells = cells.filter((cell) => !this.isWaterTerrain(cell.x, cell.z))
    const clearCost = landCells.reduce(
      (total, cell) => total + this.getTreeClearCost(cell.x, cell.z, 0, 1),
      0,
    )
    if (this.state.money < clearCost) {
      return { ok: false, message: 'Nicht genug Geld, um Bäume zu entfernen' }
    }
    landCells.forEach((cell) => this.clearTreesAt(cell.x, cell.z, 0, 1))
    const result = this.camping.designateArea(landCells)
    this.state.campingCells.forEach((cell) => {
      cell.elevation = this.getTerrainHeight(cell.x, cell.z)
    })
    this.emit()
    return { ok: result.ok, message: result.message }
  }

  getVisitor(id: string): Visitor | undefined {
    if (this.indexedVisitorCount !== this.state.visitors.length) {
      this.visitorIndex = new Map(
        this.state.visitors.map((visitor) => [visitor.id, visitor]),
      )
      this.indexedVisitorCount = this.state.visitors.length
    }
    return this.visitorIndex.get(id)
  }

  getCoaster(id: string): Coaster | undefined {
    return this.state.coasters.find((coaster) => coaster.id === id)
  }

  getCoasterQueueCapacity(coasterId: string): number {
    const coaster = this.getCoaster(coasterId)
    return coaster
      ? this.getCoasterQueueCells(coaster).length *
          SIMULATION_CONFIG.coasters.queueSlotsPerCell
      : 0
  }

  getCoasterAt(x: number, z: number): Coaster | undefined {
    return this.state.coasters.find(
      (coaster) =>
        coaster.entrance && Math.round(coaster.entrance.x) === x && Math.round(coaster.entrance.z) === z ||
        coaster.exit && Math.round(coaster.exit.x) === x && Math.round(coaster.exit.z) === z ||
        coaster.pieces.some((piece) =>
          piece.points.some(
            (point) => Math.round(point.x) === x && Math.round(point.z) === z,
          ),
        ),
    )
  }

  startCoaster(typeId: CoasterTypeId, x: number, z: number): ActionResult & { id?: string } {
    const type = COASTER_TYPES[typeId]
    const piece = createTrackPiece(
      this.nextId('track'),
      'station',
      {
        x,
        z,
        elevation: this.getPlaceElevation(x, z),
        heading: this.state.buildRotation,
        pitch: 0,
        bank: 0,
      },
      false,
    )
    if (!this.canBuildTrackPiece(piece)) {
      return { ok: false, message: 'Für die Startplattform ist nicht genug Platz' }
    }
    if (this.state.money < TRACK_PIECES.station.cost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }

    const id = this.nextId('coaster')
    this.state.money -= TRACK_PIECES.station.cost
    this.state.coasters.push({
      id,
      typeId,
      name: `${type.name} ${this.state.coasters.length + 1}`,
      pieces: [piece],
      entrance: null,
      exit: null,
      settings: {
        dispatchMode: 'full-or-timed',
        dispatchIntervalMinutes:
          SIMULATION_CONFIG.coasters.defaultDispatchIntervalMinutes,
      },
      operationMode: 'closed',
      ticketPrice: type.defaultTicketPrice,
      train: {
        state: 'boarding',
        cars: 1,
        passengers: 0,
        passengerIds: [],
        capacity: type.carCapacity,
        waitMinutes: 0,
        boardingProgress: 0,
        progress: 0,
        distance: 0,
        speed: 0,
        x,
        y: this.state.buildElevation,
        z,
      },
      telemetry: createCoasterTelemetry(),
      queue: [],
      closed: false,
    })
    this.emit()
    return { ok: true, message: 'Startplattform gebaut', id }
  }

  appendCoasterPiece(
    coasterId: string,
    kind: TrackPieceKind,
    chainLift: boolean,
    afterPieceIndex?: number,
    options: TrackBuildOptions = {},
  ): ActionResult {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return { ok: false, message: 'Achterbahn nicht gefunden' }
    if (!COASTER_TYPES[coaster.typeId].supportedPieces.includes(kind)) {
      return { ok: false, message: 'Dieser Achterbahntyp unterstützt das Element nicht' }
    }
    const anchorIndex = Math.max(
      0,
      Math.min(coaster.pieces.length - 1, afterPieceIndex ?? coaster.pieces.length - 1),
    )
    const anchorPiece = coaster.pieces[anchorIndex]
    if (!anchorPiece) return { ok: false, message: 'Startplattform fehlt' }
    const definition = TRACK_PIECES[kind]
    if (
      kind === 'pitchTransition' &&
      Math.abs((options.targetPitch ?? anchorPiece.end.pitch) - anchorPiece.end.pitch) >
        Math.atan(0.5) + 0.001
    ) {
      return { ok: false, message: 'Neigungsstufen müssen nacheinander überführt werden' }
    }
    if (
      kind === 'bankTransition' &&
      Math.abs((options.targetBank ?? anchorPiece.end.bank) - anchorPiece.end.bank) >
        TRACK_BANK_ANGLE + 0.001
    ) {
      return { ok: false, message: 'Die Seitenneigung muss zuerst neutral ausgeleitet werden' }
    }
    if (
      kind === 'station' &&
      (Math.abs(anchorPiece.end.pitch) > 0.001 || Math.abs(anchorPiece.end.bank) > 0.001)
    ) {
      return {
        ok: false,
        message: 'Vor einer Station müssen Steigung und Seitenneigung ausgeleitet werden',
      }
    }
    if (definition.turn) {
      if (Math.abs(anchorPiece.end.bank) < 0.001) {
        return {
          ok: false,
          message: 'Vor einer Kurve muss eine passende Seitenneigung eingeleitet werden',
        }
      }
      if (Math.sign(anchorPiece.end.bank) !== definition.turn) {
        return {
          ok: false,
          message: 'Die Seitenneigung zeigt für diese Kurve in die falsche Richtung',
        }
      }
    }
    const piece = createTrackPiece(
      this.nextId('track'),
      kind,
      anchorPiece.end,
      chainLift,
      options,
    )
    if (
      piece.points.some(
        (point) => point.y < 0 || point.y > 10 || !this.isInWorld(point.x, point.z),
      )
    ) {
      return { ok: false, message: 'Das Schienenelement liegt außerhalb des Baubereichs' }
    }
    if (
      !this.canBuildTrackPiece(piece, {
        coasterId: coaster.id,
        attachPieceIndex: anchorIndex,
      })
    ) {
      return { ok: false, message: 'Das Schienenelement kollidiert mit einem Bauwerk' }
    }
    const cost =
      TRACK_PIECES[kind].cost +
      (piece.chainLift ? SIMULATION_CONFIG.economy.chainLiftCost : 0)
    if (this.state.money < cost) return { ok: false, message: 'Nicht genug Geld' }

    this.state.money -= cost
    coaster.pieces.splice(anchorIndex + 1, 0, piece)
    const stations = coaster.pieces.filter((item) => item.kind === 'station').length
    coaster.train.cars = stations
    coaster.train.capacity = stations * COASTER_TYPES[coaster.typeId].carCapacity
    this.recalculateCoasterTrackState(coaster)
    coaster.telemetry = createCoasterTelemetry()
    coaster.operationMode = 'closed'
    this.recallCoasterTrainInternal(coaster)
    this.emit()
    return {
      ok: true,
      message: coaster.closed
        ? `${TRACK_PIECES[kind].name} gebaut – Strecke geschlossen`
        : piece.chainLift
          ? `${TRACK_PIECES[kind].name} mit Kettenzug gebaut`
          : `${TRACK_PIECES[kind].name} gebaut`,
    }
  }

  undoCoasterPiece(coasterId: string): ActionResult {
    const coaster = this.getCoaster(coasterId)
    if (!coaster || coaster.pieces.length <= 1) {
      return { ok: false, message: 'Die Startplattform kann nicht entfernt werden' }
    }
    const piece = coaster.pieces.pop()
    if (!piece) return { ok: false, message: 'Kein Element vorhanden' }
    this.state.money +=
      TRACK_PIECES[piece.kind].cost +
      (piece.chainLift ? SIMULATION_CONFIG.economy.chainLiftCost : 0)
    this.recalculateCoasterTrackState(coaster)
    coaster.telemetry = createCoasterTelemetry()
    coaster.operationMode = 'closed'
    const stations = coaster.pieces.filter((item) => item.kind === 'station').length
    coaster.train.cars = stations
    coaster.train.capacity = stations * COASTER_TYPES[coaster.typeId].carCapacity
    this.recallCoasterTrainInternal(coaster)
    this.emit()
    return { ok: true, message: 'Letztes Schienenelement entfernt' }
  }

  setCoasterAccess(
    coasterId: string,
    accessType: 'entrance' | 'exit',
    x: number,
    z: number,
  ): ActionResult {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return { ok: false, message: 'Achterbahn nicht gefunden' }
    const stations = coaster.pieces.filter((piece) => piece.kind === 'station')
    const station = stations.find(
      (piece) => Math.abs(piece.start.x - x) + Math.abs(piece.start.z - z) === 1,
    )
    if (!station) {
      return { ok: false, message: 'Ein- und Ausgang müssen neben einer Stationsplattform liegen' }
    }
    if (this.findCollision('path', x, z, station.start.elevation)) {
      return { ok: false, message: 'Dieses Feld ist belegt' }
    }
    const other = accessType === 'entrance' ? coaster.exit : coaster.entrance
    if (other && Math.round(other.x) === x && Math.round(other.z) === z) {
      return { ok: false, message: 'Ein- und Ausgang benötigen getrennte Felder' }
    }
    const accessCost = coaster[accessType]
      ? 0
      : SIMULATION_CONFIG.economy.coasterAccessCost
    if (this.state.money < accessCost) return { ok: false, message: 'Nicht genug Geld' }
    coaster[accessType] = { x, y: station.start.elevation, z }
    this.state.money -= accessCost
    this.recalculateQueueDirections()
    this.emit()
    return {
      ok: true,
      message: accessType === 'entrance' ? 'Eingang angebaut' : 'Ausgang angebaut',
    }
  }

  updateCoasterSettings(
    coasterId: string,
    dispatchMode: DispatchMode,
    intervalMinutes: number,
  ): void {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return
    coaster.settings.dispatchMode = dispatchMode
    coaster.settings.dispatchIntervalMinutes = Math.max(
      SIMULATION_CONFIG.coasters.minimumDispatchIntervalMinutes,
      Math.min(
        SIMULATION_CONFIG.coasters.maximumDispatchIntervalMinutes,
        intervalMinutes,
      ),
    )
    this.emit()
  }

  updateBuildingPrice(buildingId: string, price: number): void {
    const building = this.state.buildings.find((item) => item.id === buildingId)
    if (
      !building ||
      (building.kind !== 'food' &&
        building.kind !== 'ride' &&
        building.kind !== 'alcohol')
    ) {
      return
    }
    building.price = this.normalizePrice(price)
    this.emit()
  }

  updateEntryPrice(price: number): void {
    this.state.entryPrice = this.normalizePrice(price)
    this.emit()
  }

  updateDayVisitorWindow(entryHour: number, exitHour: number): ActionResult {
    const entry = Math.max(0, Math.min(23, Math.floor(entryHour)))
    const exit = Math.max(0, Math.min(23, Math.floor(exitHour)))
    const openHours = getOpenWindowHours(entry, exit)
    if (openHours < 1 || openHours > 23) {
      return {
        ok: false,
        message:
          'Tagesgäste benötigen ein Einlassfenster und mindestens eine geschlossene Stunde.',
      }
    }
    this.state.dayPlan.dayVisitorEntryHour = entry
    this.state.dayPlan.dayVisitorExitHour = exit
    this.enforceDayPlan()
    this.emit()
    return {
      ok: true,
      message: `Tagesgäste dürfen von ${String(entry).padStart(2, '0')}:00 bis ${String(exit).padStart(2, '0')}:00 bleiben.`,
    }
  }

  updateFestivalCycle(
    leadDays: number,
    festivalDays: number,
    breakDays: number,
  ): ActionResult {
    const lead = Math.max(0, Math.min(14, Math.floor(leadDays)))
    const festival = Math.max(1, Math.min(14, Math.floor(festivalDays)))
    const pause = Math.max(1, Math.min(30, Math.floor(breakDays)))
    this.state.dayPlan.leadDays = lead
    this.state.dayPlan.festivalDays = festival
    this.state.dayPlan.breakDays = pause
    this.state.dayPlan.cycleStartDay = this.state.day
    this.enforceDayPlan()
    this.updateAtmosphere()
    this.emit()
    return {
      ok: true,
      message: `Neuer Zyklus: ${lead} Vorlauf-, ${festival} Festival- und ${pause} Pausentage.`,
    }
  }

  updateCampingCapacityBuffer(percent: number): ActionResult {
    this.state.dayPlan.campingCapacityBufferPercent = Math.max(
      0,
      Math.min(50, Math.floor(percent)),
    )
    this.emit()
    return {
      ok: true,
      message: `Camping-Sicherheitsabschlag: ${this.state.dayPlan.campingCapacityBufferPercent}% · ${this.getBookableCampingCapacity()} Plätze buchbar.`,
    }
  }

  getBookableCampingCapacity(): number {
    return Math.max(
      0,
      Math.floor(
        this.state.campingCells.length *
          (1 -
            this.state.dayPlan.campingCapacityBufferPercent / 100),
      ),
    )
  }

  addDebugMoney(): ActionResult {
    const amount = 100_000
    this.state.money += amount
    this.state.cashEffects.push({
      id: this.nextId('debug-cash'),
      amount,
      x: this.getEntrance().x + 0.5,
      y: 1.1,
      z: this.getEntrance().z + 0.5,
      age: 0,
    })
    this.emit()
    return { ok: true, message: 'Debug: 100.000 € hinzugefügt' }
  }

  removeVisitorCarsForDebug(): ActionResult {
    const cars = this.state.logistics.roadVehicles.filter(
      (vehicle) => vehicle.kind === 'visitorCar',
    )
    const carIds = new Set(cars.map((vehicle) => vehicle.id))
    const groupIds = new Set(
      cars.flatMap((vehicle) => (vehicle.groupId ? [vehicle.groupId] : [])),
    )
    const visitorIds = new Set(
      this.state.logistics.arrivalGroups
        .filter((group) => group.mode === 'car' || groupIds.has(group.id))
        .flatMap((group) => group.memberIds),
    )
    this.state.visitors
      .filter(
        (visitor) =>
          visitor.arrivalMode === 'car' || visitorIds.has(visitor.id),
      )
      .forEach((visitor) => {
        visitorIds.add(visitor.id)
        const transport = this.state.logistics.roadVehicles.find((vehicle) =>
          vehicle.passengerIds.includes(visitor.id),
        )
        const position = transport?.cell ?? transport?.position
        if (position) {
          visitor.x = position.x + visitor.tileOffsetX
          visitor.z = position.z + visitor.tileOffsetZ
          visitor.cellX = position.x
          visitor.cellZ = position.z
          visitor.cellElevation = 0
        }
        visitor.arrivalMode = 'pedestrian'
        visitor.arrivalGroupId = null
        visitor.injuryVehicleId = null
        visitor.rescueVehicleId = null
        visitor.busLineId = null
        visitor.busDestination = null
        visitor.busDestinationStopId = null
        visitor.busResumeState = null
        visitor.busResumeTargetId = null
        this.beginVisitorDeparture(visitor)
        visitor.thought =
          'Mein Auto wurde entfernt. Ich gehe zu Fuß nach Hause.'
      })
    this.state.logistics.parkingCells.forEach((cell) => {
      cell.occupiedBy = null
    })
    this.state.logistics.roadVehicles =
      this.state.logistics.roadVehicles
        .filter((vehicle) => !carIds.has(vehicle.id))
        .map((vehicle) => ({
          ...vehicle,
          passengerIds: vehicle.passengerIds.filter(
            (visitorId) => !visitorIds.has(visitorId),
          ),
        }))
    this.state.logistics.arrivalGroups =
      this.state.logistics.arrivalGroups.filter(
        (group) => group.mode !== 'car' && !groupIds.has(group.id),
      )
    this.emit()
    return {
      ok: true,
      message: `Debug: ${cars.length} Autos entfernt, alle Parkplätze freigegeben; die Gäste gehen zu Fuß nach Hause`,
    }
  }

  getRoadCellAt(x: number, z: number): RoadCell | undefined {
    return this.getRoadGraph().byKey.get(roadCellKey(x, z))
  }

  private getRoadGraph(): RoadGraph {
    this.roadGraph ??= createRoadGraph(
      this.state.logistics.roadCells,
      this.getWorldSize(),
    )
    return this.roadGraph
  }

  private invalidateRoadGraph(): void {
    this.roadGraph = null
  }

  designateRoad(cells: readonly RoadPosition[]): ActionResult {
    let placed = 0
    for (const cell of cells) {
      if (!this.isInWorld(cell.x, cell.z) || this.getRoadCellAt(cell.x, cell.z)) {
        continue
      }
      if (this.isWaterTerrain(cell.x, cell.z)) continue
      if (
        this.state.buildings.some(
          (building) =>
            occupiesBuildingCell(building,cell.x,cell.z) &&
            building.kind !== 'tree' &&
            building.elevation < 1,
        ) ||
        this.isLogisticsBuildingCell(cell.x, cell.z) ||
        this.getCampingCellAt(cell.x, cell.z) ||
        this.getMedicalCellAt(cell.x, cell.z) ||
        this.getStageForecourtCellAt(cell.x, cell.z)
      ) {
        continue
      }
      const clearCost = this.getTreeClearCost(cell.x, cell.z, 0, 1)
      const roadCost = SIMULATION_CONFIG.logistics.roadBuildCost + clearCost
      if (this.state.money < roadCost) break
      this.clearTreesAt(cell.x, cell.z, 0, 1)
      this.state.money -= SIMULATION_CONFIG.logistics.roadBuildCost
      this.state.logistics.roadCells.push({
        ...cell,
        allowedDirections: null,
        blockedEdges: 0,
        speedLimit: SIMULATION_CONFIG.logistics.defaultSpeedLimit,
        crosswalk: false,
      })
      placed += 1
    }
    if (placed > 0) this.invalidateRoadGraph()
    this.emit()
    return {
      ok: placed > 0,
      message:
        placed > 0
          ? `${placed} Straßenfeld${placed === 1 ? '' : 'er'} gebaut`
          : 'Hier konnte keine Straße gebaut werden',
    }
  }

  designateParkingArea(cells: readonly RoadPosition[]): ActionResult {
    let placed = 0
    for (const cell of cells) {
      if (
        !this.isInWorld(cell.x, cell.z) ||
        this.state.logistics.parkingCells.some(
          (existing) => existing.x === cell.x && existing.z === cell.z,
        ) ||
        this.getRoadCellAt(cell.x, cell.z) ||
        this.isWaterTerrain(cell.x, cell.z) ||
        this.state.buildings.some(
          (building) =>
            occupiesBuildingCell(building,cell.x,cell.z) &&
            building.kind !== 'tree' &&
            building.elevation < 1,
        ) ||
        this.isLogisticsBuildingCell(cell.x, cell.z) ||
        this.getCampingCellAt(cell.x, cell.z) ||
        this.getMedicalCellAt(cell.x, cell.z) ||
        this.getStageForecourtCellAt(cell.x, cell.z)
      ) {
        continue
      }
      const clearCost = this.getTreeClearCost(cell.x, cell.z, 0, 1)
      if (
        this.state.money <
        SIMULATION_CONFIG.logistics.parkingDesignationCost + clearCost
      ) {
        break
      }
      this.clearTreesAt(cell.x, cell.z, 0, 1)
      this.state.money -=
        SIMULATION_CONFIG.logistics.parkingDesignationCost
      this.state.logistics.parkingCells.push({
        ...cell,
        occupiedBy: null,
      })
      placed += 1
    }
    this.emit()
    return {
      ok: placed > 0,
      message:
        placed > 0
          ? `${placed} Parkplatz${placed === 1 ? '' : 'felder'} ausgewiesen`
          : 'Hier konnte kein Parkplatz ausgewiesen werden',
    }
  }

  setRoadDirection(
    x: number,
    z: number,
    direction: Direction,
  ): ActionResult {
    const road = this.getRoadCellAt(x, z)
    if (!road) return { ok: false, message: 'Hier liegt keine Straße' }
    road.allowedDirections =
      road.allowedDirections === directionBit(direction)
        ? null
        : directionBit(direction)
    this.invalidateRoadGraph()
    this.emit()
    return {
      ok: true,
      message:
        road.allowedDirections === null
          ? 'Straße wieder in beide Richtungen freigegeben'
          : 'Fahrtrichtung gesetzt',
    }
  }

  toggleRoadSeparator(
    x: number,
    z: number,
    direction: Direction,
  ): ActionResult {
    const road = this.getRoadCellAt(x, z)
    if (!road) return { ok: false, message: 'Hier liegt keine Straße' }
    const bit = directionBit(direction)
    road.blockedEdges ^= bit
    const offset = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ][direction]!
    const neighbor = this.getRoadCellAt(x + offset.x, z + offset.z)
    if (neighbor) {
      neighbor.blockedEdges =
        road.blockedEdges & bit
          ? neighbor.blockedEdges | directionBit(oppositeDirection(direction))
          : neighbor.blockedEdges & ~directionBit(oppositeDirection(direction))
    }
    this.invalidateRoadGraph()
    this.emit()
    return { ok: true, message: 'Straßentrennlinie geändert' }
  }

  setRoadSpeed(x: number, z: number, speedLimit: SpeedLimit): ActionResult {
    const road = this.getRoadCellAt(x, z)
    if (!road) return { ok: false, message: 'Hier liegt keine Straße' }
    if (speedLimit > roadGroundLimit(this.state, x, z)) return { ok: false, message: speedLimit === 50 ? 'Tempo 50 benötigt eine gepflasterte Fahrbahn' : 'Tempo 30 benötigt mindestens eine Schotterdecke' }
    road.speedLimit = speedLimit
    this.invalidateRoadGraph()
    this.emit()
    return { ok: true, message: `Geschwindigkeitszone ${speedLimit} gesetzt` }
  }

  toggleCrosswalk(x: number, z: number): ActionResult {
    const road = this.getRoadCellAt(x, z)
    if (!road) return { ok: false, message: 'Hier liegt keine Straße' }
    road.crosswalk = !road.crosswalk
    this.emit()
    return {
      ok: true,
      message: road.crosswalk
        ? 'Zebrastreifen gebaut'
        : 'Zebrastreifen entfernt',
    }
  }

  setDayPlanHour(
    offer: DayPlanOffer,
    hour: number,
    active: boolean,
  ): void {
    if (!this.state.dayPlan.offers[offer]) return
    const normalizedHour = Math.max(0, Math.min(23, Math.floor(hour)))
    this.state.dayPlan.offers[offer][normalizedHour] = active
    this.enforceDayPlan()
    this.updateAtmosphere()
    this.emit()
  }

  isOfferCurrentlyActive(offer: DayPlanOffer): boolean {
    return isFestivalOfferActive(
      this.state.dayPlan,
      offer,
      this.state.minute,
      this.state.day,
    )
  }

  isBuildingCurrentlyActive(building: PlacedBuilding): boolean {
    const offer = this.getBuildingDayPlanOffer(building.kind)
    if (offer && !this.isOfferCurrentlyActive(offer)) return false
    if (consumesPower(building.kind) && !this.poweredBuildingIds.has(building.id)) {
      return false
    }
    if (building.kind === 'stage' && this.state.festival.enabled) {
      return activeBookings(this.state).some(b => b.stageId === building.id && !showIssue(this.state, b))
    }
    return building.kind !== 'stage' || this.isStagePerforming()
  }

  isBuildingPowered(buildingId: string): boolean {
    return this.poweredBuildingIds.has(buildingId)
  }

  getPowerCableAt(x: number, z: number): PowerCableCell | undefined {
    return this.state.power.cableCells.find(
      (cell) => cell.x === x && cell.z === z,
    )
  }

  designatePowerCable(x: number, z: number, enabled = true): ActionResult {
    if (!this.isInWorld(x, z)) {
      return { ok: false, message: 'Außerhalb des Geländes' }
    }
    if (enabled && this.isWaterTerrain(x, z)) {
      return { ok: false, message: 'Im Wasser können keine Kabel liegen' }
    }
    const existing = this.getPowerCableAt(x, z)
    if (!enabled) {
      if (!existing) return { ok: false, message: 'Hier liegt kein Kabel' }
      this.state.power.cableCells = this.state.power.cableCells.filter(
        (cell) => cell.x !== x || cell.z !== z,
      )
      this.refreshPower()
      this.emit()
      return { ok: true, message: 'Kabel entfernt' }
    }
    if (existing) return { ok: true, message: 'Hier liegt bereits ein Kabel' }
    const cost = SIMULATION_CONFIG.power.cableCost
    if (this.state.money < cost) {
      return { ok: false, message: `Nicht genug Geld (${cost} €)` }
    }
    this.state.money -= cost
    this.state.power.cableCells = [
      ...this.state.power.cableCells,
      { x, z },
    ]
    this.refreshPower()
    this.emit()
    return { ok: true, message: 'Stromkabel verlegt' }
  }

  designatePowerCableArea(
    cells: ReadonlyArray<{ x: number; z: number }>,
  ): ActionResult {
    const costEach = SIMULATION_CONFIG.power.cableCost
    const result = this.powerSystem.designateArea(
      this.state.power.cableCells,
      cells,
      (x, z) => this.isInWorld(x, z) && !this.isWaterTerrain(x, z),
    )
    const cost = result.placed * costEach
    if (result.placed === 0) {
      return { ok: false, message: 'In dieser Fläche gibt es keine freien Kabelfelder' }
    }
    if (this.state.money < cost) {
      return {
        ok: false,
        message: `Nicht genug Geld (${cost} € für ${result.placed} Felder)`,
      }
    }
    this.state.money -= cost
    this.state.power.cableCells = result.cells
    this.refreshPower()
    this.emit()
    return {
      ok: true,
      message: `${result.placed} Kabel verlegt (${cost} €)`,
    }
  }

  isStagePerforming(): boolean {
    if (!this.isOfferCurrentlyActive('stages')) return false
    const performanceMinutes =
      SIMULATION_CONFIG.atmosphere.stagePerformanceMinutes
    const cycleMinutes =
      performanceMinutes +
      SIMULATION_CONFIG.atmosphere.stageBreakMinutes
    return this.state.minute % cycleMinutes < performanceMinutes
  }

  updateCoasterPrice(coasterId: string, price: number): void {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return
    coaster.ticketPrice = this.normalizePrice(price)
    this.emit()
  }

  setCoasterOperationMode(
    coasterId: string,
    mode: CoasterOperationMode,
  ): ActionResult {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return { ok: false, message: 'Achterbahn nicht gefunden' }
    if (mode !== 'closed' && !coaster.closed) {
      return { ok: false, message: 'Die Strecke muss zuerst vollständig geschlossen werden' }
    }
    if (mode === 'open' && (!coaster.entrance || !coaster.exit)) {
      return { ok: false, message: 'Für den Betrieb fehlen Eingang oder Ausgang' }
    }
    if (coaster.operationMode !== mode) this.recallCoasterTrainInternal(coaster)
    coaster.operationMode = mode
    this.emit()
    return {
      ok: true,
      message:
        mode === 'open'
          ? 'Achterbahn geöffnet'
          : mode === 'test'
            ? 'Testbetrieb gestartet'
            : 'Achterbahn geschlossen',
    }
  }

  recallCoasterTrain(coasterId: string): ActionResult {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return { ok: false, message: 'Achterbahn nicht gefunden' }
    this.recallCoasterTrainInternal(coaster)
    this.emit()
    return { ok: true, message: 'Wagen sicher zur Station zurückgeholt' }
  }

  deleteCoasterPiece(coasterId: string, pieceIndex: number): ActionResult {
    const coaster = this.getCoaster(coasterId)
    if (!coaster) return { ok: false, message: 'Achterbahn nicht gefunden' }
    if (pieceIndex <= 0 || pieceIndex >= coaster.pieces.length) {
      return { ok: false, message: 'Die erste Startplattform kann nicht gelöscht werden' }
    }
    const removed = coaster.pieces.splice(pieceIndex, 1)[0]
    if (!removed) return { ok: false, message: 'Schienenelement nicht gefunden' }
    const refund =
      TRACK_PIECES[removed.kind].cost +
      (removed.chainLift ? SIMULATION_CONFIG.economy.chainLiftCost : 0)
    this.state.money += refund
    this.recalculateCoasterTrackState(coaster)
    coaster.telemetry = createCoasterTelemetry()
    coaster.operationMode = 'closed'
    const stations = coaster.pieces.filter((piece) => piece.kind === 'station').length
    coaster.train.cars = stations
    coaster.train.capacity = stations * COASTER_TYPES[coaster.typeId].carCapacity
    this.recallCoasterTrainInternal(coaster)
    this.emit()
    return {
      ok: true,
      message: `${TRACK_PIECES[removed.kind].name} entfernt`,
    }
  }

  private checkStageSite(design:StageDesign,x:number,z:number,rotation:number,elevation:number,ignoreId?:string):string|null {
    const issue=stageSiteIssue(this.state,design,x,z,rotation,ignoreId)
    if(issue)return issue
    if(design.audience?.length&&Math.abs(elevation-this.getTerrainHeight(x,z))>.01)return 'Bühnen mit Zuschauerflächen müssen auf Geländehöhe stehen'
    for(const c of buildingFootprint({x,z,rotation,stageDesign:design})){
      if(this.isWaterTerrain(c.x,c.z))return 'Bühnenfläche darf nicht im Wasser liegen'
      if(this.isLogisticsBuildingCell(c.x,c.z)||this.coasterOccupiesVolume(c.x,c.z,elevation,BUILDINGS.stage.height))return 'Bühnenfläche überschneidet sich mit einer Anlage'
    }
    return null
  }

  canPlace(kind: BuildingKind, x: number, z: number): ActionResult {
    const selected = kind==='stage' ? this.state.festival.stageTemplates?.find(t=>t.name===this.state.festival.selectedStageTemplate) : undefined
    if(selected){const issue=this.checkStageSite(selected,x,z,this.state.buildRotation,this.getPlaceElevation(x,z));if(issue)return {ok:false,message:issue}}

    if (!this.isInWorld(x, z)) return { ok: false, message: 'Außerhalb des Geländes' }
    if (this.state.festival.infrastructure.depots.some(d => d.x === x && d.z === z)) return { ok: false, message: 'Hier steht ein Warendepot' }
    if (kind === 'stage' && groundInfo(this.state, x, z).bearing < 2) return { ok: false, message: 'Bühnen brauchen tragfähigen Untergrund: zuerst verdichten' }
    if (kind === 'ride' && groundInfo(this.state, x, z).bearing < 3) return { ok: false, message: 'Große Fahrgeschäfte brauchen ein entwässertes, gepflastertes Fundament' }
    if (
      (this.getRoadCellAt(x, z) &&
        !(kind === 'path' && this.state.buildElevation >= 1)) ||
      (kind !== 'fence' &&
        this.state.logistics.parkingCells.some(
          (cell) => cell.x === x && cell.z === z,
        )) ||
      this.isLogisticsBuildingCell(x, z)
    ) {
      return { ok: false, message: 'Diese Fläche wird für die Logistik genutzt' }
    }
    if (this.getCampingCellAt(x, z) && this.state.buildElevation < 1.2 && kind !== 'fence') {
      return { ok: false, message: 'Diese Fläche ist als Zeltbereich ausgewiesen' }
    }
    if (this.getMedicalCellAt(x, z) && this.state.buildElevation < 1.2 && kind !== 'fence') {
      return { ok: false, message: 'Diese Fläche gehört zum Krankenbereich' }
    }
    if (this.getStageForecourtCellAt(x, z) && this.state.buildElevation < 1.2 && kind !== 'fence') {
      return { ok: false, message: 'Diese Fläche gehört zum Bühnenvorplatz' }
    }
    if (this.getWasteDumpAt(x, z) && this.state.buildElevation < 1.2 && kind !== 'fence') {
      return { ok: false, message: 'Diese Fläche ist als Müllablage ausgewiesen' }
    }
    const placeElevation = this.getPlaceElevation(x, z)
    if (this.isWaterTerrain(x, z) && placeElevation <= WATER_HEIGHT) {
      return { ok: false, message: 'Im Wasser kann nicht gebaut werden' }
    }
    const collision = this.findCollision(kind, x, z, placeElevation)
    if (
      (kind === 'securityGate' || kind === 'bench' || kind === 'wasteBin') &&
      this.state.buildings.some(
        (building) => building.kind === kind && building.x === x && building.z === z,
      )
    ) {
      return {
        ok: false,
        message:
          kind === 'wasteBin'
            ? 'Hier steht bereits ein Mülleimer'
            : kind === 'bench'
              ? 'Hier steht bereits eine Bank'
              : 'Hier steht bereits eine Sicherheitsschleuse',
      }
    }
    if (
      kind === 'fence' &&
      this.state.buildings.some(
        (building) =>
          building.kind === 'fence' &&
          building.x === x &&
          building.z === z &&
          building.rotation === this.state.buildRotation &&
          Math.abs(building.elevation - placeElevation) < 0.01,
      )
    ) {
      return { ok: false, message: 'Auf dieser Seite steht bereits ein Bauzaun' }
    }
    if (
      (kind === 'securityGate' || kind === 'bench') &&
      collision?.kind !== 'path'
    ) {
      return {
        ok: false,
        message:
          kind === 'bench'
            ? 'Eine Bank muss an einem Weg aufgestellt werden'
            : 'Eine Sicherheitsschleuse muss auf einem Weg stehen',
      }
    }
    if (kind === 'bench' && this.findBenchRotation(x, z) === null) {
      return {
        ok: false,
        message: 'An diesem Weg ist keine freie Außenkante für eine Bank',
      }
    }
    const allowedOverlap =
      ((kind === 'securityGate' ||
        kind === 'bench' ||
        kind === 'fence' ||
        kind === 'wasteBin') &&
        collision?.kind === 'path') ||
      (kind === 'fence' && collision?.kind === 'fence') ||
      collision?.kind === 'tree'
    if (
      (collision && !allowedOverlap) ||
      this.coasterOccupiesVolume(x, z, placeElevation, BUILDINGS[kind].height)
    ) {
      return { ok: false, message: 'Auf dieser Höhe ist nicht genug Platz' }
    }
    const clearCost = this.getTreeClearCost(
      x,
      z,
      placeElevation,
      BUILDINGS[kind].height,
    )
    const design = kind === 'stage' ? this.state.festival.stageTemplates?.find(t=>t.name===this.state.festival.selectedStageTemplate) : undefined
    if (this.state.money < BUILDINGS[kind].cost + clearCost + (design ? stageStats(design).cost : 0)) {
      return { ok: false, message: 'Nicht genug Geld' }
    }
    if (design) return {ok:true,message:`${design.name} bauen · ${BUILDINGS[kind].cost + clearCost + stageStats(design).cost} €`}
    return {
      ok: true,
      message:
        clearCost > 0
          ? `${BUILDINGS[kind].name} bauen und Baum entfernen (${
              BUILDINGS[kind].cost + clearCost
            } €)`
          : `${BUILDINGS[kind].name} auf Ebene ${placeElevation} bauen`,
    }
  }

  place(kind: BuildingKind, x: number, z: number): ActionResult {
    if (kind === 'ambulanceGarage') {
      return this.placeAmbulanceGarage(x, z)
    }
    if (kind === 'busDepot') return this.placeBusDepot(x, z)
    if (kind === 'wasteDepot') return this.placeWasteDepot(x, z)
    if (kind === 'busStop') return this.placeBusStop(x, z)
    const result = this.canPlace(kind, x, z)
    if (!result.ok) return result

    const placeElevation = this.getPlaceElevation(x, z)
    this.clearTreesAt(x, z, placeElevation, BUILDINGS[kind].height)
    const design = kind === 'stage' ? this.state.festival.stageTemplates?.find(t=>t.name===this.state.festival.selectedStageTemplate) : undefined
    this.state.money -= BUILDINGS[kind].cost + (design ? stageStats(design).cost : 0)
    this.state.buildings.push({
      stageDesign: design ? structuredClone(design) : undefined,
      id: this.nextId('building'),
      kind,
      x,
      z,
      rotation:
        kind === 'bench'
          ? (this.findBenchRotation(x, z) ?? this.state.buildRotation)
          : this.state.buildRotation,
      elevation: placeElevation,
      pathType: kind === 'path' ? 'normal' : undefined,
      pathSlope: kind === 'path' ? 0 : undefined,
      pathSlopeDirection: kind === 'path' ? this.state.buildRotation : undefined,
      price: BUILDINGS[kind].defaultPrice,
      securityConfig:
        kind === 'securityGate' ? structuredClone(DEFAULT_SECURITY_CONFIG) : undefined,
      bandName:
        kind === 'stage'
          ? BAND_NAMES[this.idCounter % BAND_NAMES.length]
          : undefined,
      wasteFill: kind === 'wasteBin' ? 0 : undefined,
    })
    if(design)syncStageAudience(this.state)
    this.recalculatePark()
    this.refreshPower()
    this.emit()
    return { ok: true, message: `${BUILDINGS[kind].name} gebaut` }
  }

  private placeAmbulanceGarage(x: number, z: number): ActionResult {
    const footprint = this.createFootprint(x, z, 2)
    const result = this.canPlaceLogisticsFootprint(
      footprint,
      BUILDINGS.ambulanceGarage.cost,
    )
    if (!result.ok) return result
    footprint.forEach((cell) => this.clearTreesAt(cell.x, cell.z, 0, 1))
    const id = this.nextId('ambulance-garage')
    this.state.money -= BUILDINGS.ambulanceGarage.cost
    this.state.logistics.ambulanceGarages.push({
      id,
      x,
      z,
      bays: [null, null],
    })
    this.state.buildings.push({
      id,
      kind: 'ambulanceGarage',
      x,
      z,
      rotation: this.state.buildRotation,
      elevation: 0,
      price: 0,
    })
    this.emit()
    return { ok: true, message: '2×2-Krankenwagengarage gebaut' }
  }

  private placeBusDepot(x: number, z: number): ActionResult {
    const footprint = this.createFootprint(x, z, 3)
    const result = this.canPlaceLogisticsFootprint(
      footprint,
      BUILDINGS.busDepot.cost,
    )
    if (!result.ok) return result
    footprint.forEach((cell) => this.clearTreesAt(cell.x, cell.z, 0, 1))
    const id = this.nextId('bus-depot')
    this.state.money -= BUILDINGS.busDepot.cost
    this.state.logistics.busDepots.push({ id, x, z, busIds: [] })
    this.state.buildings.push({
      id,
      kind: 'busDepot',
      x,
      z,
      rotation: this.state.buildRotation,
      elevation: 0,
      price: 0,
    })
    this.emit()
    return { ok: true, message: '3×3-Busdepot gebaut' }
  }

  private placeWasteDepot(x: number, z: number): ActionResult {
    const footprint = this.createFootprint(x, z, 2)
    const result = this.canPlaceLogisticsFootprint(
      footprint,
      BUILDINGS.wasteDepot.cost,
    )
    if (!result.ok) return result
    footprint.forEach((cell) => this.clearTreesAt(cell.x, cell.z, 0, 1))
    const id = this.nextId('waste-depot')
    this.state.money -= BUILDINGS.wasteDepot.cost
    this.state.logistics.wasteDepots.push({ id, x, z, truckIds: [] })
    this.state.buildings.push({
      id,
      kind: 'wasteDepot',
      x,
      z,
      rotation: this.state.buildRotation,
      elevation: 0,
      price: 0,
    })
    this.refreshPower()
    this.emit()
    return { ok: true, message: '2×2-Mülldepot gebaut' }
  }

  private placeBusStop(x: number, z: number): ActionResult {
    const sidewalk = this.getPathAt(x, z, 0)
    if (
      this.getRoadCellAt(x, z) ||
      !sidewalk ||
      sidewalk.pathType !== 'normal'
    ) {
      return {
        ok: false,
        message: 'Eine Haltestelle muss auf einem Gehweg neben einer Straße stehen',
      }
    }
    const adjacentRoads = this.getAdjacentRoadPositions({ x, z })
    if (adjacentRoads.length === 0) {
      return {
        ok: false,
        message: 'Direkt neben der Haltestelle muss eine Straße verlaufen',
      }
    }
    if (
      this.state.logistics.busStops.some(
        (stop) => stop.x === x && stop.z === z,
      )
    ) {
      return { ok: false, message: 'Hier steht bereits eine Haltestelle' }
    }
    if (this.state.money < BUILDINGS.busStop.cost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }
    const id = this.nextId('bus-stop')
    this.state.money -= BUILDINGS.busStop.cost
    this.state.logistics.busStops.push({
      id,
      x,
      z,
      name: `Haltestelle ${this.state.logistics.busStops.length + 1}`,
      roadCell: { ...adjacentRoads[0]! },
    })
    this.emit()
    return { ok: true, message: 'Bushaltestelle gebaut' }
  }

  private createFootprint(
    x: number,
    z: number,
    size: number,
  ): RoadPosition[] {
    return Array.from({ length: size * size }, (_, index) => ({
      x: x + (index % size),
      z: z + Math.floor(index / size),
    }))
  }

  private isLogisticsBuildingCell(x: number, z: number): boolean {
    return (
      this.state.festival.infrastructure.depots.some(d => d.x === x && d.z === z) ||
      this.state.logistics.ambulanceGarages.some(
        (garage) =>
          x >= garage.x &&
          x < garage.x + 2 &&
          z >= garage.z &&
          z < garage.z + 2,
      ) ||
      this.state.logistics.busDepots.some(
        (depot) =>
          x >= depot.x &&
          x < depot.x + 3 &&
          z >= depot.z &&
          z < depot.z + 3,
      ) ||
      this.state.logistics.wasteDepots.some(
        (depot) =>
          x >= depot.x &&
          x < depot.x + 2 &&
          z >= depot.z &&
          z < depot.z + 2,
      )
    )
  }

  private canPlaceLogisticsFootprint(
    footprint: readonly RoadPosition[],
    cost: number,
  ): ActionResult {
    const clearCost = footprint.reduce(
      (total, cell) => total + this.getTreeClearCost(cell.x, cell.z, 0, 1),
      0,
    )
    if (this.state.money < cost + clearCost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }
    if (
      footprint.some(
        (cell) =>
          !this.isInWorld(cell.x, cell.z) ||
          this.getRoadCellAt(cell.x, cell.z) ||
          this.state.logistics.parkingCells.some(
            (parking) => parking.x === cell.x && parking.z === cell.z,
          ) ||
          this.isWaterTerrain(cell.x, cell.z) ||
          this.state.buildings.some(
            (building) =>
              occupiesBuildingCell(building,cell.x,cell.z) &&
              building.kind !== 'tree' &&
              building.elevation < 1,
          ) ||
          Boolean(this.getCampingCellAt(cell.x, cell.z)) ||
          Boolean(this.getMedicalCellAt(cell.x, cell.z)) ||
          Boolean(this.getStageForecourtCellAt(cell.x, cell.z)) ||
          Boolean(this.getWasteDumpAt(cell.x, cell.z)),
      )
    ) {
      return { ok: false, message: 'Die gesamte Fläche muss frei sein' }
    }
    const adjacentRoad = footprint.some((cell) =>
      [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ].some(([dx, dz]) => this.getRoadCellAt(cell.x + dx!, cell.z + dz!)),
    )
    return adjacentRoad
      ? { ok: true, message: 'Bau möglich' }
      : { ok: false, message: 'Das Gebäude benötigt einen Straßenanschluss' }
  }

  buyAmbulance(garageId: string): ActionResult {
    const garage = this.state.logistics.ambulanceGarages.find(
      (candidate) => candidate.id === garageId,
    )
    if (!garage) return { ok: false, message: 'Garage nicht gefunden' }
    const bay = garage.bays.findIndex((vehicleId) => vehicleId === null)
    if (bay < 0) return { ok: false, message: 'In dieser Garage stehen bereits zwei Krankenwagen' }
    if (this.state.money < SIMULATION_CONFIG.logistics.ambulanceCost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }
    const access = this.getLogisticsBuildingAccess(garage, 2)
    if (!access) return { ok: false, message: 'Die Garage hat keinen befahrbaren Anschluss' }
    const id = this.nextId('ambulance')
    this.state.money -= SIMULATION_CONFIG.logistics.ambulanceCost
    garage.bays[bay] = id
    this.state.logistics.roadVehicles.push(
      this.createRoadVehicle(id, 'ambulance', access),
    )
    this.emit()
    return { ok: true, message: `Krankenwagen ${bay + 1} gekauft` }
  }

  buyBus(depotId: string): ActionResult {
    const depot = this.state.logistics.busDepots.find(
      (candidate) => candidate.id === depotId,
    )
    if (!depot) return { ok: false, message: 'Busdepot nicht gefunden' }
    if (depot.busIds.length >= 3) {
      return { ok: false, message: 'Dieses Depot besitzt bereits drei Busse' }
    }
    if (this.state.money < SIMULATION_CONFIG.logistics.busCost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }
    const access = this.getLogisticsBuildingAccess(depot, 3)
    if (!access) return { ok: false, message: 'Das Depot hat keinen befahrbaren Anschluss' }
    const id = this.nextId('bus')
    this.state.money -= SIMULATION_CONFIG.logistics.busCost
    depot.busIds.push(id)
    this.state.logistics.roadVehicles.push(
      this.createRoadVehicle(id, 'bus', access),
    )
    this.emit()
    return { ok: true, message: `Bus ${depot.busIds.length} gekauft` }
  }

  buyGarbageTruck(depotId: string): ActionResult {
    const depot = this.state.logistics.wasteDepots.find(
      (candidate) => candidate.id === depotId,
    )
    if (!depot) return { ok: false, message: 'Mülldepot nicht gefunden' }
    if (depot.truckIds.length >= 2) {
      return { ok: false, message: 'Dieses Depot besitzt bereits zwei Müllfahrzeuge' }
    }
    if (this.state.money < SIMULATION_CONFIG.logistics.garbageTruckCost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }
    const access = this.getLogisticsBuildingAccess(depot, 2)
    if (!access) return { ok: false, message: 'Das Depot hat keinen befahrbaren Anschluss' }
    const id = this.nextId('garbage')
    this.state.money -= SIMULATION_CONFIG.logistics.garbageTruckCost
    depot.truckIds.push(id)
    this.state.logistics.roadVehicles.push(
      this.createRoadVehicle(id, 'garbageTruck', access),
    )
    this.emit()
    return { ok: true, message: `Müllfahrzeug ${depot.truckIds.length} gekauft` }
  }

  sellGarbageTruck(depotId: string): ActionResult {
    const depot = this.state.logistics.wasteDepots.find(
      (candidate) => candidate.id === depotId,
    )
    if (!depot) return { ok: false, message: 'Mülldepot nicht gefunden' }
    const truckId = depot.truckIds.at(-1)
    if (!truckId) return { ok: false, message: 'In diesem Depot gibt es kein Müllfahrzeug' }
    const truck = this.state.logistics.roadVehicles.find(
      (vehicle) => vehicle.id === truckId && vehicle.kind === 'garbageTruck',
    )
    if (!truck || truck.state !== 'idle' || truck.cargo > 0) {
      return { ok: false, message: 'Das Müllfahrzeug ist unterwegs oder noch beladen' }
    }
    depot.truckIds = depot.truckIds.filter((id) => id !== truckId)
    this.state.logistics.roadVehicles =
      this.state.logistics.roadVehicles.filter((vehicle) => vehicle.id !== truckId)
    this.state.money += Math.floor(
      SIMULATION_CONFIG.logistics.garbageTruckCost *
        SIMULATION_CONFIG.logistics.busResaleFraction,
    )
    this.emit()
    return { ok: true, message: 'Müllfahrzeug verkauft' }
  }

  sellBus(depotId: string): ActionResult {
    const depot = this.state.logistics.busDepots.find(
      (candidate) => candidate.id === depotId,
    )
    if (!depot) return { ok: false, message: 'Busdepot nicht gefunden' }
    const busId = depot.busIds.at(-1)
    if (!busId) return { ok: false, message: 'In diesem Depot gibt es keinen Bus' }
    const bus = this.state.logistics.roadVehicles.find(
      (vehicle) => vehicle.id === busId && vehicle.kind === 'bus',
    )
    if (!bus) {
      depot.busIds = depot.busIds.filter((id) => id !== busId)
      this.emit()
      return { ok: false, message: 'Der Bus war nicht mehr vorhanden und wurde bereinigt' }
    }
    const position = bus.cell ?? bus.position
    bus.passengerIds.forEach((visitorId) => {
      const visitor = this.getVisitor(visitorId)
      if (!visitor) return
      visitor.x = position.x + visitor.tileOffsetX
      visitor.z = position.z + visitor.tileOffsetZ
      visitor.cellX = position.x
      visitor.cellZ = position.z
      visitor.cellElevation = 0
      const destination = visitor.busDestination
      const resumeState = visitor.busResumeState
      const resumeTargetId = visitor.busResumeTargetId
      visitor.busLineId = null
      visitor.busWaitMinutes = 0
      visitor.busDestination = null
      visitor.busDestinationStopId = null
      visitor.busResumeState = null
      visitor.busResumeTargetId = null
      const route = destination
        ? this.findPath(
            { x: position.x, z: position.z, elevation: 0 },
            [destination],
          )
        : null
      if (destination && route) {
        visitor.state = resumeState ?? 'exploring'
        visitor.targetId = resumeTargetId
        visitor.route = route
        visitor.thought =
          'Der Bus wurde verkauft. Ich gehe den Rest des Weges zu Fuß.'
      } else {
        visitor.state = 'exploring'
        visitor.route = []
        this.decideNextAction(visitor)
      }
    })
    depot.busIds = depot.busIds.filter((id) => id !== busId)
    this.state.logistics.busLines.forEach((line) => {
      line.busIds = line.busIds.filter((id) => id !== busId)
    })
    this.state.logistics.roadVehicles =
      this.state.logistics.roadVehicles.filter((vehicle) => vehicle.id !== busId)
    const refund = Math.round(
      SIMULATION_CONFIG.logistics.busCost *
        SIMULATION_CONFIG.logistics.busResaleFraction,
    )
    this.state.money += refund
    this.state.cashEffects.push({
      id: this.nextId('bus-sale'),
      amount: refund,
      x: depot.x + 1.5,
      y: 1.4,
      z: depot.z + 1.5,
      age: 0,
    })
    this.emit()
    return { ok: true, message: `Bus für ${refund.toLocaleString('de-DE')} € verkauft` }
  }

  createBusLine(
    name: string,
    depotId: string,
    stopIds: string[],
    busCount: number,
    headway: number,
  ): ActionResult {
    const depot = this.state.logistics.busDepots.find(
      (candidate) => candidate.id === depotId,
    )
    const validStops = stopIds.filter((id) =>
      this.state.logistics.busStops.some((stop) => stop.id === id),
    )
    if (!depot || validStops.length < 2) {
      return {
        ok: false,
        message: 'Eine Linie benötigt ein Depot und mindestens zwei Haltestellen',
      }
    }
    const alreadyAssigned = new Set(
      this.state.logistics.busLines.flatMap((line) => line.busIds),
    )
    const buses = depot.busIds
      .filter((id) => !alreadyAssigned.has(id))
      .slice(0, Math.max(1, Math.min(3, Math.floor(busCount))))
    if (buses.length === 0) {
      return { ok: false, message: 'Im Depot ist kein freier Bus verfügbar' }
    }
    const id = this.nextId('bus-line')
    this.state.logistics.busLines.push({
      id,
      name: name.trim() || `Buslinie ${this.state.logistics.busLines.length + 1}`,
      depotId,
      stopIds: validStops,
      busIds: buses,
      headway: Math.max(2, Math.min(120, Math.floor(headway))),
      active: true,
      lastDepartureMinute: null,
    })
    buses.forEach((busId) => {
      const bus = this.state.logistics.roadVehicles.find(
        (vehicle) => vehicle.id === busId,
      )
      if (bus) bus.lineId = id
    })
    this.emit()
    return { ok: true, message: 'Buslinie angelegt' }
  }

  deleteBusLine(lineId: string): ActionResult {
    const line = this.state.logistics.busLines.find(
      (candidate) => candidate.id === lineId,
    )
    if (!line) return { ok: false, message: 'Buslinie nicht gefunden' }
    line.busIds.forEach((busId) => {
      const bus = this.state.logistics.roadVehicles.find(
        (vehicle) => vehicle.id === busId,
      )
      if (bus) {
        bus.lineId = null
        bus.state = 'idle'
        bus.route = []
      }
    })
    this.state.logistics.busLines =
      this.state.logistics.busLines.filter(
        (candidate) => candidate.id !== lineId,
      )
    this.emit()
    return { ok: true, message: 'Buslinie gelöscht' }
  }

  private createRoadVehicle(
    id: string,
    kind: 'ambulance' | 'bus' | 'garbageTruck',
    position: RoadPosition,
  ): RoadVehicle {
    return {
      id,
      kind,
      position: { ...position },
      cell: { ...position },
      route: [],
      state: 'idle',
      speed: 0,
      passengerIds: [],
      groupId: null,
      parkingCell: null,
      target: null,
      facing: 0,
      waitMinutes: 0,
      lineId: null,
      nextStopIndex: 0,
      resumeState: null,
      cargo: 0,
    }
  }

  private getLogisticsBuildingAccess(
    building: RoadPosition,
    size: number,
  ): RoadPosition | null {
    return this.createFootprint(building.x, building.z, size)
      .flatMap((cell) => this.getAdjacentRoadPositions(cell))[0] ?? null
  }

  placePathSegment(
    x: number,
    z: number,
    elevation: number,
    pathType: 'normal' | 'queue' = 'normal',
    queueDirection = 0,
    slope: -1 | 0 | 1 = 0,
    wayType?: WayType,
  ): ActionResult {
    if (wayType && WAY_TYPES[wayType]?.mode !== 'foot') return { ok: false, message: 'Gültigen Fußwegbelag wählen' }
    if (wayType && elevation <= this.getTerrainHeight(x, z)) { const issue = wayIssue(this.state, x, z, wayType); if (issue) return { ok: false, message: issue } }
    const pathCost = wayType ? WAY_TYPES[wayType].cost : BUILDINGS.path.cost
    if (!this.isInWorld(x, z)) return { ok: false, message: 'Außerhalb des Geländes' }
    if (
      elevation < this.getTerrainHeight(x, z) + 1 &&
      (this.getRoadCellAt(x, z) ||
        this.state.logistics.parkingCells.some(
          (cell) => cell.x === x && cell.z === z,
        ) ||
        this.isLogisticsBuildingCell(x, z))
    ) {
      return { ok: false, message: 'Hier liegt bereits eine Logistikfläche' }
    }
    if (this.getCampingCellAt(x, z) && elevation < 1.2) {
      return { ok: false, message: 'Durch einen Zeltplatz kann kein Weg führen' }
    }
    if (this.getMedicalCellAt(x, z) && elevation < 1.2) {
      return { ok: false, message: 'Durch den Krankenbereich kann kein Weg führen' }
    }
    if (this.getStageForecourtCellAt(x, z) && elevation < 1.2) {
      return { ok: false, message: 'Durch den Bühnenvorplatz kann kein Weg führen' }
    }
    const rampStartElevation = elevation - slope
    const candidateBase = Math.min(elevation, rampStartElevation)
    const candidateTop =
      Math.max(elevation, rampStartElevation) + BUILDINGS.path.height
    const occupants = this.state.buildings.filter((building) => {
      if (!occupiesBuildingCell(building,x,z)) return false
      const bounds = this.getBuildingVerticalBounds(building)
      return bounds.base < candidateTop && candidateBase < bounds.top
    })
    const existingPath = occupants.find((building) => building.kind === 'path')
    const blocking = occupants.find(
      (building) =>
        building.kind !== 'tree' && !PATH_COMPATIBLE_KINDS.has(building.kind),
    )
    if (
      blocking ||
      this.coasterOccupiesVolume(
        x,
        z,
        candidateBase,
        candidateTop - candidateBase,
      )
    ) {
      return { ok: false, message: 'Auf dieser Höhe ist nicht genug Platz' }
    }
    if (this.isWaterTerrain(x, z) && elevation <= WATER_HEIGHT) {
      return { ok: false, message: 'Im Wasser kann kein Weg gebaut werden' }
    }
    if (elevation < WATER_HEIGHT || elevation > 6) {
      return { ok: false, message: 'Diese Bauhöhe ist nicht möglich' }
    }
    const directions = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ]
    const direction = directions[queueDirection]
    if (
      slope !== 0 &&
      (!direction ||
        !this.getPathAt(
          x - direction.x,
          z - direction.z,
          elevation - slope,
        ))
    ) {
      return { ok: false, message: 'Eine Rampe muss an einen bestehenden Weg anschließen' }
    }
    const clearCost = this.getTreeClearCost(x, z, candidateBase, candidateTop - candidateBase)
    if (this.state.money < pathCost + clearCost) {
      return { ok: false, message: 'Nicht genug Geld' }
    }

    this.clearTreesAt(x, z, candidateBase, candidateTop - candidateBase)
    this.state.money -= pathCost
    const pathData: Omit<PlacedBuilding, 'id'> = {
      kind: 'path',
      x,
      z,
      rotation: queueDirection,
      elevation,
      pathType,
      wayType,
      queueDirection: pathType === 'queue' ? queueDirection : undefined,
      queueEntryDirection: undefined,
      pathSlope: slope,
      pathSlopeDirection: queueDirection,
      price: 0,
    }
    if (existingPath) {
      Object.assign(existingPath, pathData)
    } else {
      this.state.buildings.push({
        id: this.nextId('building'),
        ...pathData,
      })
    }
    if (wayType && elevation === this.getTerrainHeight(x, z)) {
      const cell = this.state.festival.infrastructure.ground[groundKey(x, z)] ??= {}
      cell.footway = wayType
    }
    // Replacing a tree or moving an existing path can leave the count unchanged.
    // Invalidate before queue recalculation and any immediate path lookup.
    this.indexedBuildingCount = -1
    const overRoad =
      Boolean(this.getRoadCellAt(x, z)) &&
      elevation >= this.getTerrainHeight(x, z) + 1
    this.recalculateQueueDirections()
    this.emit()
    return {
      ok: true,
      message:
        existingPath
          ? `${pathType === 'queue' ? 'Warteschlange' : 'Weg'} ersetzt`
          : overRoad
            ? 'Gehweg über die Straße gebaut'
          : slope === 0
          ? `Weg auf Ebene ${elevation} gebaut`
          : `${slope > 0 ? 'Aufwärts-' : 'Abwärts-'}Rampe gebaut`,
    }
  }

  undoPathSegment(
    x: number,
    z: number,
    elevation: number,
    previousPath?: PlacedBuilding,
  ): ActionResult {
    const path = this.getPathAt(x, z, elevation)
    if (
      !path ||
      path.kind !== 'path' ||
      (path.id === ENTRANCE_PATH_ID && !previousPath)
    ) {
      return { ok: false, message: 'Dieses Wegstück kann nicht zurückgenommen werden' }
    }
    if (previousPath) {
      const index = this.state.buildings.findIndex((building) => building.id === path.id)
      if (index >= 0) this.state.buildings[index] = structuredClone(previousPath)
    } else {
      this.relocateVisitorsFromPath(path)
      this.state.buildings = this.state.buildings.filter((building) => building.id !== path.id)
    }
    this.state.money += BUILDINGS.path.cost
    this.recalculateQueueDirections()
    if (elevation === this.getTerrainHeight(x, z)) {
      const ground = this.state.festival.infrastructure.ground[groundKey(x, z)]
      if (ground) { if (previousPath?.wayType) ground.footway = previousPath.wayType; else delete ground.footway }
    }
    this.emit()
    return {
      ok: true,
      message: previousPath ? 'Vorheriger Weg wiederhergestellt' : 'Letztes Wegstück zurückgenommen',
    }
  }

  bulldoze(x: number, z: number): ActionResult {
    const result = this.bulldozeAt(x, z)
    const cell = this.state.festival.infrastructure.ground[groundKey(x, z)]
    if (result.ok && cell) {
      if (!this.state.buildings.some(b => b.kind === 'path' && b.x === x && b.z === z)) delete cell.footway
      if (!this.state.logistics.roadCells.some(b => b.x === x && b.z === z)) delete cell.roadway
      this.emit()
    }
    return result
  }

  bulldozeArea(cells: ReadonlyArray<{ x: number; z: number }>): ActionResult {
    const unique = new Map(cells.map(cell => [`${cell.x},${cell.z}`, cell]))
    let removed = 0
    let lastIssue = 'Auf der Fläche gibt es nichts abzureißen'
    for (const cell of unique.values()) {
      const result = this.bulldoze(cell.x, cell.z)
      if (result.ok) removed += 1
      else if (result.message !== 'Hier gibt es nichts abzureißen') lastIssue = result.message
    }
    return removed > 0
      ? {
          ok: true,
          message: `${removed} ${removed === 1 ? 'Element' : 'Elemente'} entfernt`,
        }
      : { ok: false, message: lastIssue }
  }

  private bulldozeAt(x: number, z: number): ActionResult {
    const busStop = this.state.logistics.busStops.find(
      (stop) => stop.x === x && stop.z === z,
    )
    if (busStop) {
      this.state.logistics.busStops =
        this.state.logistics.busStops.filter(
          (stop) => stop.id !== busStop.id,
        )
      this.state.logistics.busLines =
        this.state.logistics.busLines.filter(
          (line) => !line.stopIds.includes(busStop.id),
        )
      this.emit()
      return { ok: true, message: 'Bushaltestelle entfernt' }
    }
    const building = this.getAt(x, z)
    if (!building) {
      const parking = this.state.logistics.parkingCells.find(
        (cell) => cell.x === x && cell.z === z,
      )
      if (parking) {
        if (parking.occupiedBy) {
          return { ok: false, message: 'Der Parkplatz ist noch belegt' }
        }
        this.state.logistics.parkingCells =
          this.state.logistics.parkingCells.filter(
            (cell) => cell !== parking,
          )
        this.emit()
        return { ok: true, message: 'Parkplatz aufgehoben' }
      }
      const road = this.getRoadCellAt(x, z)
      if (road) {
        if (
          z === -this.getWorldSize() / 2 &&
          x >= -3 &&
          x <= 2
        ) {
          return { ok: false, message: 'Die Einfahrtsstraße kann nicht entfernt werden' }
        }
        if (
          this.state.logistics.roadVehicles.some(
            (vehicle) =>
              vehicle.cell?.x === x && vehicle.cell.z === z,
          )
        ) {
          return { ok: false, message: 'Auf der Straße befindet sich ein Fahrzeug' }
        }
        this.state.logistics.roadCells =
          this.state.logistics.roadCells.filter((cell) => cell !== road)
        this.invalidateRoadGraph()
        this.emit()
        return { ok: true, message: 'Straße entfernt' }
      }
      if (this.getCampingCellAt(x, z)) return this.designateCampingCell(x, z, false)
      const medicalCell = this.getMedicalCellAt(x, z)
      if (medicalCell && medicalCell.occupants.every((occupant) => occupant === null)) {
        this.state.medicalCells = this.state.medicalCells.filter(
          (cell) => cell.x !== x || cell.z !== z,
        )
        this.emit()
        return { ok: true, message: 'Krankenbereich aufgehoben' }
      }
      if (this.getPowerCableAt(x, z)) {
        this.state.power.cableCells = this.state.power.cableCells.filter(
          (cell) => cell.x !== x || cell.z !== z,
        )
        this.refreshPower()
        this.emit()
        return { ok: true, message: 'Kabel entfernt' }
      }
      const wasteDump = this.getWasteDumpAt(x, z)
      if (wasteDump) {
        if (wasteDump.stored > 0) {
          return {
            ok: false,
            message: 'Die Müllablage ist noch beladen und kann nicht aufgehoben werden',
          }
        }
        this.state.wasteDumpCells = this.state.wasteDumpCells.filter(
          (cell) => cell.x !== x || cell.z !== z,
        )
        this.emit()
        return { ok: true, message: 'Müllablage aufgehoben' }
      }
      if (this.getStageForecourtCellAt(x, z)) {
        this.state.stageForecourtCells =
          this.state.stageForecourtCells.filter(
            (cell) => cell.x !== x || cell.z !== z,
          )
        this.state.visitors.forEach((visitor) => {
          if (
            visitor.activityTarget?.x === x &&
            visitor.activityTarget.z === z
          ) {
            this.clearVisitorActivity(visitor)
            this.decideNextAction(visitor)
          }
        })
        this.emit()
        return { ok: true, message: 'Bühnenvorplatz aufgehoben' }
      }
      return { ok: false, message: 'Hier gibt es nichts abzureißen' }
    }
    if (building.id === ENTRANCE_PATH_ID) {
      return { ok: false, message: 'Der Parkeingang kann nicht abgerissen werden' }
    }
    if (
      building.kind === 'tree' &&
      this.state.money < SIMULATION_CONFIG.economy.treeClearCost
    ) {
      return { ok: false, message: 'Nicht genug Geld, um den Baum zu entfernen' }
    }

    if (building.kind === 'path') this.relocateVisitorsFromPath(building)
    if (building.kind === 'ambulanceGarage') {
      const garage = this.state.logistics.ambulanceGarages.find(
        (candidate) => candidate.id === building.id,
      )
      if (garage?.bays.some(Boolean)) {
        return { ok: false, message: 'Vor dem Abriss müssen alle Krankenwagen entfernt werden' }
      }
      this.state.logistics.ambulanceGarages =
        this.state.logistics.ambulanceGarages.filter(
          (candidate) => candidate.id !== building.id,
        )
    }
    if (building.kind === 'busDepot') {
      const depot = this.state.logistics.busDepots.find(
        (candidate) => candidate.id === building.id,
      )
      if (depot?.busIds.length) {
        return { ok: false, message: 'Vor dem Abriss müssen alle Busse entfernt werden' }
      }
      this.state.logistics.busDepots =
        this.state.logistics.busDepots.filter(
          (candidate) => candidate.id !== building.id,
        )
    }
    if (building.kind === 'wasteDepot') {
      const depot = this.state.logistics.wasteDepots.find(
        (candidate) => candidate.id === building.id,
      )
      if (depot?.truckIds.length) {
        return { ok: false, message: 'Vor dem Abriss müssen alle Müllfahrzeuge entfernt werden' }
      }
      this.state.logistics.wasteDepots =
        this.state.logistics.wasteDepots.filter(
          (candidate) => candidate.id !== building.id,
        )
    }
    this.state.buildings = this.state.buildings.filter((item) => item.id !== building.id)
    if(building.stageDesign)syncStageAudience(this.state)
    if (building.kind === 'path') this.recalculateQueueDirections()
    if (building.kind === 'tree') {
      this.state.money -= SIMULATION_CONFIG.economy.treeClearCost
    } else {
      this.state.money += Math.floor(
        BUILDINGS[building.kind].cost *
          SIMULATION_CONFIG.economy.demolitionRefundRate,
      )
    }
    this.state.visitors.forEach((visitor) => {
      if (visitor.targetId === building.id) {
        visitor.targetId = null
        visitor.route = []
        visitor.state = 'exploring'
        visitor.thought = 'Mein Ziel ist verschwunden.'
      }
    })
    this.recalculatePark()
    this.refreshPower()
    this.emit()
    return { ok: true, message: `${BUILDINGS[building.kind].name} abgerissen` }
  }

  tick(realSeconds: number): void {
    // Only the host advances the world. Clients display authoritative snapshots.
    if (this.networkMode === 'client') {
      this.tickAccumulator = Math.min(0.2, this.tickAccumulator + realSeconds)
      return
    }
    if (!Number.isFinite(realSeconds) || realSeconds <= 0) return
    this.runReadyTurns()
    if (this.state.speed === 0) {
      this.tickAccumulator = 0
      return
    }
    const tickSeconds = SIMULATION_CONFIG.time.tickSeconds
    this.tickAccumulator = Math.min(this.tickAccumulator + realSeconds, tickSeconds * 4)
    const maxSteps = SIMULATION_CONFIG.time.maxStepsPerFrame
    let steps = 0
    while (this.tickAccumulator >= tickSeconds && steps < maxSteps) {
      this.tickAccumulator -= tickSeconds
      this.advanceOne(true)
      steps += 1
      if (this.state.speed === 0) { this.tickAccumulator = 0; break }
    }
  }

  private toSimulationMinutes(realSeconds: number): number {
    const speed = SIMULATION_SPEED_MULTIPLIERS[this.state.speed] ?? 1
    return (
      realSeconds *
      speed *
      (SIMULATION_CONFIG.time.minutesPerDay /
        SIMULATION_CONFIG.time.normalDayDurationSeconds)
    )
  }

  private stepFixed(): void {
    if (this.state.speed === 0 || this.state.festival.planning) return
    this.processingSimulationStep = true
    this.decisionBudget = SIMULATION_CONFIG.pathfinding.decisionsPerTick
    this.decidedThisTick.clear()
    try {
      this.simulateFixedStep()
    } finally {
      this.processingSimulationStep = false
    }
  }

  private simulateFixedStep(): void {
    this.executedLogicTicks += 1
    const speed = SIMULATION_SPEED_MULTIPLIERS[this.state.speed] ?? 1
    const realSeconds = SIMULATION_CONFIG.time.tickSeconds
    const wetBucket = Math.floor(this.state.festival.wetness / 20)
    if (wetBucket !== this.groundWetBucket) { this.groundWetBucket = wetBucket; this.worldRevision++ }
    if (this.worldRevision !== this.lastNavRevision) {
      this.lastNavRevision = this.worldRevision
      this.ensurePedestrianNav(true)
    } else {
      this.ensurePedestrianNav(false)
    }
    this.walkVisitors(this.toSimulationMinutes(realSeconds))
    const simulationSeconds =
      realSeconds * speed * SIMULATION_CONFIG.time.movementSimulationRate
    const minutes = this.toSimulationMinutes(realSeconds)
    this.state.minute += minutes
    this.simulatedMinutes += minutes
    this.spawnMinutes += minutes

    while (this.state.minute >= SIMULATION_CONFIG.time.minutesPerDay) {
      this.state.minute -= SIMULATION_CONFIG.time.minutesPerDay
      this.state.day += 1
      if (
        getFestivalCycleStatus(this.state.dayPlan, this.state.day)
          .cycleDay === 0
      ) {
        this.rotateComplaintSession()
      }
    }
    this.enforceDayPlan()
    updateFestival(this.state)
    updateSupplyChain(this.state, (start, goals) => this.findPath(start, goals, false, false, false, false, false, undefined, true), (a, b) => !this.isPedestrianEdgeBlocked(a, b) && !this.isPedestrianSolidAt(b.x, b.z, b.elevation) && this.canTraversePath(this.getPathAt(a.x, a.z, a.elevation), this.getPathAt(b.x, b.z, b.elevation)!, a.x, a.z, false))

    while (this.spawnMinutes >= VISITOR_SPAWN_INTERVAL_MINUTES) {
      this.spawnMinutes -= VISITOR_SPAWN_INTERVAL_MINUTES
      const hour = Math.floor(this.state.minute / 60) % 24
      const baseArrivals =
        (SIMULATION_CONFIG.visitors.arrivalsPerIntervalByHour[hour] ?? 0) *
        (this.state.festival.enabled ? 0.7 + Math.min(2, this.state.festival.bookings
          .filter(b => b.day === this.state.day)
          .reduce((sum, b) => sum + (BANDS.find(band => band.id === b.bandId)?.draw ?? 0), 0) / 100) +
          Object.values(this.state.festival.reputation).reduce((a, b) => a + b, 0) / 800 : 1)
      const phase = getFestivalCycleStatus(
        this.state.dayPlan,
        this.state.day,
      )
      const tuning = SIMULATION_CONFIG.visitors.festivalArrivals
      if (phase.phase === 'lead') {
        const campers = this.samplePoisson(
          baseArrivals * tuning.leadDayCamperMultiplier,
        )
        for (let index = 0; index < campers; index += 1) {
          this.trySpawnVisitor('camping')
        }
      } else if (phase.phase === 'festival') {
        const dayGuests = this.samplePoisson(
          baseArrivals * tuning.festivalDayGuestMultiplier,
        )
        for (let index = 0; index < dayGuests; index += 1) {
          this.trySpawnVisitor('day')
        }
        const camperMultiplier = phase.firstFestivalDay
          ? tuning.firstFestivalDayCamperMultiplier
          : tuning.laterFestivalDayCamperMultiplier
        const campers = this.samplePoisson(baseArrivals * camperMultiplier)
        for (let index = 0; index < campers; index += 1) {
          this.trySpawnVisitor('camping')
        }
      }
    }

    this.state.incidents.forEach((incident) => {
      incident.ageMinutes += minutes
    })
    this.updateLogistics(minutes)
    this.updateAbandonedCamps(minutes)
    this.updateStaff(minutes)
    this.atmosphereMinutes += minutes
    if (
      this.atmosphereMinutes >=
      SIMULATION_CONFIG.atmosphere.updateIntervalMinutes
    ) {
      this.updateAtmosphere()
      this.atmosphereMinutes = 0
    }
    this.crowdingMinutes += minutes
    if (
      this.crowdingMinutes >=
      SIMULATION_CONFIG.crowding.updateIntervalMinutes
    ) {
      this.updateCrowdingAndMotivation(this.crowdingMinutes)
      this.crowdingMinutes = 0
    }
    this.updateVisitors(minutes)
    this.updateVisitorFireworks(minutes)
    this.updateCoasters(minutes, simulationSeconds)

    if (this.simulatedMinutes >= SIMULATION_CONFIG.time.economyIntervalMinutes) {
      const hours = Math.floor(
        this.simulatedMinutes / SIMULATION_CONFIG.time.economyIntervalMinutes,
      )
      this.simulatedMinutes %= SIMULATION_CONFIG.time.economyIntervalMinutes
      this.runEconomy(hours)
    }

    this.state.cashEffects.forEach((effect) => {
      effect.age += realSeconds
    })
    this.state.cashEffects = this.state.cashEffects.filter(
      (effect) => effect.age < SIMULATION_CONFIG.time.cashEffectLifetimeSeconds,
    )
    this.state.fireworkEffects.forEach((effect) => {
      effect.age += realSeconds
    })
    this.state.fireworkEffects = this.state.fireworkEffects.filter(
      (effect) => effect.age < SIMULATION_CONFIG.time.fireworkEffectLifetimeSeconds,
    )
    this.uiRefreshSeconds += realSeconds
    if (
      this.uiRefreshSeconds >= SIMULATION_CONFIG.time.uiRefreshIntervalSeconds
    ) {
      this.uiRefreshSeconds = 0
      this.emit('tick')
    }
  }

  private updateLogistics(minutes: number): void {
    const logistics = this.state.logistics
    const occupied = new Map<string, string>()
    const removedVehicles = new Set<string>()
    const removedGroups = new Set<string>()
    const removedVisitors = new Set<string>()
    const vehicleIds = new Set(
      logistics.roadVehicles.map((vehicle) => vehicle.id),
    )
    const vehiclesById = new Map(
      logistics.roadVehicles.map((vehicle) => [vehicle.id, vehicle]),
    )
    const roadsByCell = new Map(
      logistics.roadCells.map((road) => [
        roadCellKey(road.x, road.z),
        road,
      ]),
    )
    const pedestriansByCell = new Map<string, Visitor[]>()
    let parkingSearches = 0
    this.state.visitors.forEach((visitor) => {
      if (
        visitor.state === 'vehicle-arrival' ||
        visitor.state === 'bus-riding' ||
        visitor.state === 'riding' ||
        visitor.state === 'medical'
      ) {
        return
      }
      const key = roadCellKey(visitor.cellX, visitor.cellZ)
      const pedestrians = pedestriansByCell.get(key) ?? []
      pedestrians.push(visitor)
      pedestriansByCell.set(key, pedestrians)
    })
    logistics.parkingCells.forEach((parking) => {
      if (parking.occupiedBy && !vehicleIds.has(parking.occupiedBy)) {
        parking.occupiedBy = null
      }
    })
    logistics.roadVehicles.forEach((vehicle) => {
      if (
        vehicle.kind === 'visitorCar' &&
        vehicle.state === 'parked'
      ) {
        const group = logistics.arrivalGroups.find(
          (candidate) => candidate.id === vehicle.groupId,
        )
        if (!group) {
          if (vehicle.parkingCell) {
            const parking = logistics.parkingCells.find(
              (cell) =>
                cell.x === vehicle.parkingCell?.x &&
                cell.z === vehicle.parkingCell?.z,
            )
            if (parking) parking.occupiedBy = null
          }
          removedVehicles.add(vehicle.id)
          return
        }
        if (this.canParkedCarDepart(vehicle, group)) {
          this.startParkedCarDeparture(vehicle, group, occupied)
          if (vehicle.state === 'parked') {
            vehicle.waitMinutes = Math.min(vehicle.waitMinutes + minutes, 2)
          }
        }
      }
      if (vehicle.cell && vehicle.state !== 'parked') {
        occupied.set(
          roadCellKey(vehicle.cell.x, vehicle.cell.z),
          vehicle.id,
        )
      }
    })

    logistics.roadVehicles.forEach((vehicle) => {
      if (removedVehicles.has(vehicle.id)) return
      if (vehicle.kind === 'ambulance' && vehicle.state === 'idle') {
        this.dispatchAmbulance(vehicle)
      }
      if (vehicle.kind === 'bus') {
        this.updateBusAtStop(vehicle, minutes)
        if (vehicle.state === 'idle') this.dispatchBus(vehicle)
      }
      if (vehicle.kind === 'garbageTruck') {
        if (vehicle.state === 'idle') this.dispatchGarbageTruck(vehicle)
        if (vehicle.state === 'waiting') {
          vehicle.waitMinutes -= minutes
          if (vehicle.waitMinutes <= 0) {
            this.continueGarbageTruck(vehicle)
          }
          return
        }
      }
      if (vehicle.kind === 'visitorCar' && vehicle.state === 'waiting') {
        if (
          this.state.visitors.some(
            (visitor) =>
              visitor.injuryVehicleId === vehicle.id &&
              visitor.state === 'injured',
          )
        ) {
          return
        }
        if (vehicle.route.length > 0) {
          vehicle.state =
            vehicle.resumeState === 'returning' ||
            vehicle.resumeState === 'responding'
              ? vehicle.resumeState
              : vehicle.target?.kind === 'parking'
                ? 'driving'
                : vehicle.resumeState ?? 'driving'
          vehicle.resumeState = null
          vehicle.waitMinutes = 0
        } else if (vehicle.parkingCell && vehicle.target?.kind === 'parking') {
          vehicle.state = 'parking'
          vehicle.resumeState = null
          vehicle.waitMinutes = 0
        } else {
          this.assignVisitorCarParking(
            vehicle,
            minutes,
            removedVisitors,
            removedGroups,
            removedVehicles,
            parkingSearches < 1,
          )
          if (
            vehicle.state === 'waiting' &&
            !vehicle.parkingCell &&
            parkingSearches < 1
          ) {
            parkingSearches += 1
          }
          return
        }
      }

      if (
        vehicle.state !== 'driving' &&
        vehicle.state !== 'responding' &&
        vehicle.state !== 'returning'
      ) {
        if (vehicle.state === 'parking') this.finishVehicleParking(vehicle)
        return
      }
      const mudSlowdown = vehicle.cell && this.isMudTerrain(vehicle.cell.x, vehicle.cell.z)
        ? SIMULATION_CONFIG.terrain.mudMoveMultiplier
        : 1
      if ((vehicle.stuckMinutes ?? 0) > 0) { vehicle.stuckMinutes = Math.max(0, vehicle.stuckMinutes! - minutes); return }
      const ground = vehicle.cell ? groundInfo(this.state, vehicle.cell.x, vehicle.cell.z) : null
      const groundCell = vehicle.cell ? groundKey(vehicle.cell.x, vehicle.cell.z) : ''
      if (vehicle.testedGroundCell !== groundCell) {
        vehicle.testedGroundCell = groundCell
        if (ground && ground.wet > .5 && hashStringSeed(`${vehicle.id}:${groundCell}`) % 100 < ground.wet * wayInfo(this.state, vehicle.cell!.x, vehicle.cell!.z, 'road').stuck * 100) { vehicle.stuckMinutes = 8; return }
      }
      vehicle.speed += minutes * mudSlowdown * (vehicle.cell ? wayInfo(this.state, vehicle.cell.x, vehicle.cell.z, 'road').speed : 1)
      const currentRoad = vehicle.cell
        ? roadsByCell.get(roadCellKey(vehicle.cell.x, vehicle.cell.z))
        : undefined
      const interval =
        SIMULATION_CONFIG.logistics.vehicleMoveIntervalMinutes *
        (30 / Math.min(currentRoad?.speedLimit ?? 30, vehicle.cell ? roadGroundLimit(this.state, vehicle.cell.x, vehicle.cell.z) : 30))
      if (vehicle.speed < interval) return
      vehicle.speed %= interval
      const next = vehicle.route[0]
      if (!next) {
        if (vehicle.kind === 'ambulance') {
          this.finishAmbulanceLeg(vehicle)
        } else if (vehicle.kind === 'garbageTruck') {
          this.finishGarbageTruckLeg(vehicle)
        } else if (
          vehicle.kind === 'bus' &&
          vehicle.target?.kind === 'busStop'
        ) {
          vehicle.state = 'at-stop'
          vehicle.waitMinutes = 0
        } else if (vehicle.state === 'returning') {
          vehicle.passengerIds.forEach((visitorId) => {
            removedVisitors.add(visitorId)
          })
          removedVehicles.add(vehicle.id)
          if (vehicle.groupId) removedGroups.add(vehicle.groupId)
        } else if (vehicle.kind === 'visitorCar') {
          this.finishVehicleParking(vehicle)
        } else {
          vehicle.state = 'idle'
        }
        return
      }
      const nextKey = roadCellKey(next.x, next.z)
      if (this.state.festival.infrastructure.trucks.some(t => t.x === next.x && t.z === next.z)) return
      const blocker = occupied.get(nextKey)
      if (blocker && blocker !== vehicle.id) {
        vehicle.speed = 0
        vehicle.waitMinutes += minutes
        if (
          vehicle.waitMinutes >=
          SIMULATION_CONFIG.logistics.vehicleUnstickMinutes
        ) {
          this.unstickVehicle(vehicle, occupied, removedVehicles, removedGroups, removedVisitors)
        }
        return
      }
      if (
        vehicle.waitMinutes < 2 &&
        this.mustYieldToVehicleFromRight(
          vehicle,
          next,
          occupied,
          vehiclesById,
        )
      ) {
        vehicle.speed = 0
        vehicle.waitMinutes += minutes
        return
      }
      const road = roadsByCell.get(nextKey)
      const pedestrians = (pedestriansByCell.get(nextKey) ?? []).filter(
        (visitor) =>
          this.isAtTerrainLevel(
            visitor.cellX,
            visitor.cellZ,
            visitor.cellElevation,
          ),
      )
      if (
        pedestrians.length > 0 &&
        vehicle.kind !== 'ambulance'
      ) {
        const blockingInjured = pedestrians.some(
          (visitor) =>
            visitor.state === 'injured' &&
            visitor.injuryVehicleId === vehicle.id,
        )
        const brakingChance = road?.crosswalk
          ? 1
          : SIMULATION_CONFIG.logistics.brakingChanceBySpeed[
              road?.speedLimit ?? 30
            ]
        if (
          !blockingInjured &&
          vehicle.waitMinutes <
            SIMULATION_CONFIG.logistics.vehicleUnstickMinutes &&
          this.rng.next() < brakingChance
        ) {
          vehicle.speed = 0
          vehicle.waitMinutes += minutes
          return
        }
        if (
          !blockingInjured &&
          vehicle.waitMinutes <
            SIMULATION_CONFIG.logistics.vehicleUnstickMinutes
        ) {
          const victim = pedestrians[0]!
          victim.needs.energy = 0
          victim.state = 'injured'
          victim.route = []
          victim.streakingMinutes = 0
          victim.injuryVehicleId = vehicle.id
          victim.thought = 'Ich wurde von einem Fahrzeug angefahren!'
          this.recordComplaint(victim, 'traffic-accident')
          vehicle.resumeState = vehicle.state
          vehicle.state = 'waiting'
          vehicle.speed = 0
          return
        }
      }
      if (vehicle.cell) {
        occupied.delete(roadCellKey(vehicle.cell.x, vehicle.cell.z))
      }
      vehicle.cell = { ...next }
      vehicle.facing = Math.atan2(
        next.x - vehicle.position.x,
        next.z - vehicle.position.z,
      )
      vehicle.position = { ...next }
      vehicle.passengerIds.forEach((visitorId) => {
        const passenger = this.getVisitor(visitorId)
        if (!passenger) return
        passenger.x = next.x + 0.5
        passenger.z = next.z + 0.5
        passenger.cellX = next.x
        passenger.cellZ = next.z
      })
      vehicle.route.shift()
      vehicle.waitMinutes = 0
      occupied.set(nextKey, vehicle.id)
      if (vehicle.route.length === 0 && vehicle.kind === 'visitorCar') {
        if (vehicle.state === 'returning') {
          vehicle.passengerIds.forEach((visitorId) => {
            removedVisitors.add(visitorId)
          })
          removedVehicles.add(vehicle.id)
          if (vehicle.groupId) removedGroups.add(vehicle.groupId)
        } else {
          this.finishVehicleParking(vehicle)
        }
      }
    })

    if (removedVisitors.size > 0) {
      this.state.visitors.forEach((visitor) => {
        if (removedVisitors.has(visitor.id)) this.leaveVisitorCampBehind(visitor)
      })
      this.state.visitors = this.state.visitors.filter(
        (visitor) => !removedVisitors.has(visitor.id),
      )
      this.indexedVisitorCount = -1
      this.state.guests = this.state.visitors.length
    }
    logistics.roadVehicles = logistics.roadVehicles.filter(
      (vehicle) => !removedVehicles.has(vehicle.id),
    )
    logistics.arrivalGroups = logistics.arrivalGroups.filter(
      (group) => !removedGroups.has(group.id),
    )
  }

  private mustYieldToVehicleFromRight(
    vehicle: RoadVehicle,
    target: RoadPosition,
    occupied: ReadonlyMap<string, string>,
    vehiclesById: ReadonlyMap<string, RoadVehicle>,
  ): boolean {
    if (!vehicle.cell) return false
    const neighbors = this.getAdjacentRoadPositions(target)
    if (neighbors.length < 3) return false
    const direction = this.getDirectionIndex(
      target.x - vehicle.cell.x,
      target.z - vehicle.cell.z,
    ) as Direction
    const rightSide = (direction + 3) % 4
    const offset = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ][rightSide]!
    const candidateId = occupied.get(
      roadCellKey(target.x + offset.x, target.z + offset.z),
    )
    const candidate = candidateId ? vehiclesById.get(candidateId) : undefined
    return Boolean(
      candidate &&
        candidate.id !== vehicle.id &&
        candidate.route[0]?.x === target.x &&
        candidate.route[0]?.z === target.z,
    )
  }

  private getVehicleDirection(vehicle: RoadVehicle): Direction {
    return ((Math.round(vehicle.facing / (Math.PI / 2)) % 4 + 4) %
      4) as Direction
  }

  private assignVisitorCarParking(
    vehicle: RoadVehicle,
    minutes: number,
    removedVisitors: Set<string>,
    removedGroups: Set<string>,
    removedVehicles: Set<string>,
    canSearch: boolean,
  ): void {
    const group = this.state.logistics.arrivalGroups.find(
      (candidate) => candidate.id === vehicle.groupId,
    )
    if (!group) {
      removedVehicles.add(vehicle.id)
      return
    }
    if (!canSearch) return
    if (group.state === 'waiting-for-parking') {
      group.parkingWaitMinutes += minutes
      vehicle.waitMinutes += minutes
      if (
        group.parkingWaitMinutes >=
        SIMULATION_CONFIG.logistics.parkingSearchTimeoutMinutes
      ) {
        group.memberIds.forEach((visitorId) => {
          const visitor = this.getVisitor(visitorId)
          if (!visitor) return
          this.refundEntryFee(visitor)
          this.recordComplaint(visitor, 'no-parking')
          removedVisitors.add(visitor.id)
        })
        removedGroups.add(group.id)
        removedVehicles.add(vehicle.id)
        return
      }
      if (
        vehicle.waitMinutes <
        SIMULATION_CONFIG.logistics.parkingRetryMinutes
      ) {
        return
      }
      vehicle.waitMinutes = 0
    }
    const parking = this.findReachableParking(vehicle)
    if (parking) {
      parking.cell.occupiedBy = vehicle.id
      vehicle.parkingCell = {
        x: parking.cell.x,
        z: parking.cell.z,
      }
      vehicle.target = {
        kind: 'parking',
        parkingCell: { ...vehicle.parkingCell },
      }
      vehicle.route = parking.route.map((cell) => ({
        x: cell.x,
        z: cell.z,
      }))
      vehicle.state = vehicle.route.length > 0 ? 'driving' : 'parking'
      vehicle.waitMinutes = 0
      group.state = 'approaching'
      return
    }
    group.state = 'waiting-for-parking'
    vehicle.waitMinutes = 0
    group.memberIds.forEach((visitorId) => {
      const visitor = this.getVisitor(visitorId)
      if (visitor) {
        visitor.motivation = Math.max(
          0,
          visitor.motivation - minutes * 0.018,
        )
        visitor.thought = 'Wir finden einfach keinen freien Parkplatz.'
      }
    })
  }

  private unstickVehicle(
    vehicle: RoadVehicle,
    occupied: ReadonlyMap<string, string>,
    removedVehicles: Set<string>,
    removedGroups: Set<string>,
    removedVisitors: Set<string>,
  ): void {
    const blockedCells = new Set(
      [...occupied.entries()]
        .filter(([, id]) => id !== vehicle.id)
        .map(([key]) => key),
    )
    if (vehicle.state === 'returning') {
      const start = vehicle.cell ?? vehicle.position
      const exit = this.findReachableRoadExit(
        start,
        this.getVehicleDirection(vehicle),
        blockedCells,
        true,
      )
      if (exit) {
        vehicle.route = exit.route.map((cell) => ({ x: cell.x, z: cell.z }))
        vehicle.waitMinutes = 0
        return
      }
      if (
        vehicle.waitMinutes >=
        SIMULATION_CONFIG.logistics.vehicleAbandonMinutes
      ) {
        vehicle.passengerIds.forEach((visitorId) => {
          removedVisitors.add(visitorId)
        })
        removedVehicles.add(vehicle.id)
        if (vehicle.groupId) removedGroups.add(vehicle.groupId)
      }
      return
    }
    if (vehicle.kind === 'visitorCar' && vehicle.parkingCell) {
      const reroute = this.findReachableParking(vehicle, blockedCells, true)
      if (reroute) {
        if (
          vehicle.parkingCell.x !== reroute.cell.x ||
          vehicle.parkingCell.z !== reroute.cell.z
        ) {
          const previous = this.state.logistics.parkingCells.find(
            (cell) =>
              cell.x === vehicle.parkingCell?.x &&
              cell.z === vehicle.parkingCell?.z &&
              cell.occupiedBy === vehicle.id,
          )
          if (previous) previous.occupiedBy = null
          reroute.cell.occupiedBy = vehicle.id
          vehicle.parkingCell = { x: reroute.cell.x, z: reroute.cell.z }
          vehicle.target = {
            kind: 'parking',
            parkingCell: { ...vehicle.parkingCell },
          }
        }
        vehicle.route = reroute.route.map((cell) => ({
          x: cell.x,
          z: cell.z,
        }))
        vehicle.waitMinutes = 0
        return
      }
    }
    vehicle.waitMinutes = 0
  }

  private startParkedCarDeparture(
    vehicle: RoadVehicle,
    group: ArrivalGroup,
    occupied: ReadonlyMap<string, string>,
  ): void {
    if (!vehicle.parkingCell) return
    const accesses = this.getAdjacentRoadPositions(vehicle.parkingCell).filter(
      (cell) => !occupied.has(roadCellKey(cell.x, cell.z)),
    )
    const departure = this.findDepartureFromAccesses(vehicle, accesses, true)
    if (!departure) return
    const { access, exit, initialDirection } = departure
    const parking = this.state.logistics.parkingCells.find(
      (cell) =>
        cell.x === vehicle.parkingCell?.x &&
        cell.z === vehicle.parkingCell?.z,
    )
    if (parking) parking.occupiedBy = null
    vehicle.cell = { ...access }
    vehicle.position = { ...access }
    vehicle.facing = initialDirection * (Math.PI / 2)
    vehicle.parkingCell = null
    vehicle.route = exit.route.map((cell) => ({
      x: cell.x,
      z: cell.z,
    }))
    vehicle.state = 'returning'
    vehicle.waitMinutes = 0
    group.state = 'leaving'
  }

  private findDepartureFromAccesses(
    vehicle: RoadVehicle,
    accesses: readonly RoadPosition[],
    allowUTurn: boolean,
  ): {
    access: RoadPosition
    exit: { position: RoadPosition; route: RoadCell[] }
    initialDirection: Direction
  } | null {
    for (const access of accesses) {
      const initialDirection = this.getDirectionIndex(
        access.x - vehicle.parkingCell!.x,
        access.z - vehicle.parkingCell!.z,
      ) as Direction
      const exit = this.findReachableRoadExit(
        access,
        initialDirection,
        undefined,
        allowUTurn,
      )
      if (exit) return { access, exit, initialDirection }
    }
    return null
  }

  private findReachableRoadExit(
    start: RoadPosition,
    initialDirection: Direction,
    blockedCells?: ReadonlySet<string>,
    allowUTurn = false,
  ): { position: RoadPosition; route: RoadCell[] } | null {
    const exits = this.state.logistics.roadCells.filter(
      (road) =>
        road.z === -this.getWorldSize() / 2 &&
        road.x >= -3 &&
        road.x <= 2 &&
        isRoadDirectionAllowed(road, 2),
    )
    if (exits.length === 0) return null
    const route = findRoadRoute({
      roadCells: this.state.logistics.roadCells,
      graph: this.getRoadGraph(),
      start,
      targets: exits,
      initialDirection,
      blockedCells,
      allowUTurn,
    })
    if (!route) return null
    const last = route.at(-1) ?? start
    return {
      position: { x: last.x, z: last.z },
      route,
    }
  }

  private dispatchGarbageTruck(vehicle: RoadVehicle): void {
    if (!vehicle.cell) return
    const claimed = new Set(
      this.state.logistics.roadVehicles
        .filter(
          (candidate) =>
            candidate.kind === 'garbageTruck' &&
            candidate.id !== vehicle.id &&
            candidate.state !== 'idle',
        )
        .map((candidate) =>
          candidate.target?.kind === 'wasteDump'
            ? `${candidate.target.x}:${candidate.target.z}`
            : '',
        ),
    )
    const dumps = this.state.wasteDumpCells.filter(
      (cell) =>
        cell.stored > 0 && !claimed.has(`${cell.x}:${cell.z}`),
    )
    const totalStored = dumps.reduce((sum, cell) => sum + cell.stored, 0)
    if (totalStored < SIMULATION_CONFIG.waste.truckDispatchThreshold) return
    const accesses = this.getWasteDumpRoadAccesses(dumps)
    if (accesses.length === 0) return
    const alreadyThere = accesses.some(
      (access) =>
        access.road.x === vehicle.cell?.x && access.road.z === vehicle.cell.z,
    )
    if (alreadyThere) {
      const dump =
        accesses.find(
          (access) =>
            access.road.x === vehicle.cell?.x &&
            access.road.z === vehicle.cell.z,
        )?.dump ?? dumps[0]
      if (!dump) return
      vehicle.target = { kind: 'wasteDump', x: dump.x, z: dump.z }
      vehicle.route = []
      vehicle.state = 'responding'
      this.finishGarbageTruckLeg(vehicle)
      return
    }
    const route = this.findGarbageTruckRoute(
      vehicle,
      accesses.map((access) => access.road),
    )
    if (!route) return
    const last = route.at(-1) ?? vehicle.cell
    const dump =
      accesses.find(
        (access) => access.road.x === last.x && access.road.z === last.z,
      )?.dump ?? dumps[0]
    if (!dump) return
    vehicle.target = { kind: 'wasteDump', x: dump.x, z: dump.z }
    vehicle.route = route.map((cell) => ({ x: cell.x, z: cell.z }))
    vehicle.state = 'responding'
  }

  private getWasteDumpRoadAccesses(
    dumps: readonly { x: number; z: number; stored: number }[],
  ): Array<{ dump: { x: number; z: number; stored: number }; road: RoadPosition }> {
    const dumpArea =
      dumps.length > 0
        ? this.state.wasteDumpCells
        : []
    const seeds = dumps.length > 0 ? dumpArea : dumps
    const seen = new Set<string>()
    const accesses: Array<{
      dump: { x: number; z: number; stored: number }
      road: RoadPosition
    }> = []
    seeds.forEach((dump) => {
      this.getAdjacentRoadPositions(dump).forEach((road) => {
        const key = `${road.x}:${road.z}`
        if (seen.has(key)) return
        seen.add(key)
        accesses.push({ dump, road })
      })
    })
    return accesses.sort((left, right) => right.dump.stored - left.dump.stored)
  }

  private findGarbageTruckRoute(
    vehicle: RoadVehicle,
    targets: readonly RoadPosition[],
  ): RoadPosition[] | null {
    if (!vehicle.cell || targets.length === 0) return null
    const graph = this.getRoadGraph()
    const attempts: Array<{
      initialDirection?: Direction
      allowUTurn: boolean
    }> = [
      { initialDirection: this.getVehicleDirection(vehicle), allowUTurn: true },
      { allowUTurn: true },
      { initialDirection: this.getVehicleDirection(vehicle), allowUTurn: false },
    ]
    for (const attempt of attempts) {
      const route = findRoadRoute({
        roadCells: this.state.logistics.roadCells,
        graph,
        start: vehicle.cell,
        targets,
        initialDirection: attempt.initialDirection,
        allowUTurn: attempt.allowUTurn,
      })
      if (route) return route.map((cell) => ({ x: cell.x, z: cell.z }))
    }
    return null
  }

  private finishGarbageTruckLeg(vehicle: RoadVehicle): void {
    if (vehicle.state === 'responding') {
      let room = Math.max(
        0,
        SIMULATION_CONFIG.logistics.garbageTruckCapacity - vehicle.cargo,
      )
      const dumps = this.state.wasteDumpCells
        .filter((cell) => cell.stored > 0)
        .sort((left, right) => {
          const truck = vehicle.cell ?? vehicle.position
          return (
            Math.abs(left.x - truck.x) +
            Math.abs(left.z - truck.z) -
            (Math.abs(right.x - truck.x) + Math.abs(right.z - truck.z))
          )
        })
      dumps.forEach((dump) => {
        if (room <= 0) return
        const taken = Math.min(dump.stored, room)
        dump.stored -= taken
        vehicle.cargo += taken
        room -= taken
      })
      vehicle.state = 'waiting'
      vehicle.waitMinutes = SIMULATION_CONFIG.waste.truckLoadMinutes
      vehicle.resumeState = 'returning'
      return
    }
    if (vehicle.state === 'returning' && vehicle.cargo > 0) {
      if (!this.isOffMapRoadExit(vehicle.cell ?? vehicle.position)) {
        const offMap = this.getOffMapRoadExit(vehicle.cell ?? vehicle.position)
        vehicle.route = [offMap]
        vehicle.target = { kind: 'cell', ...offMap }
        vehicle.facing = Math.PI
        return
      }
      vehicle.cargo = 0
      vehicle.state = 'waiting'
      vehicle.waitMinutes = SIMULATION_CONFIG.waste.truckUnloadMinutes
      vehicle.resumeState = 'returning'
      return
    }
    if (this.isOffMapRoadExit(vehicle.cell ?? vehicle.position)) {
      this.reenterGarbageTruck(vehicle)
      return
    }
    vehicle.state = 'idle'
    vehicle.target = null
    vehicle.route = []
    vehicle.resumeState = null
  }

  private continueGarbageTruck(vehicle: RoadVehicle): void {
    if (!vehicle.cell) {
      vehicle.state = 'idle'
      return
    }
    if (vehicle.cargo > 0) {
      if (
        this.isRoadExitCell(vehicle.cell) ||
        this.isOffMapRoadExit(vehicle.cell)
      ) {
        const offMap = this.getOffMapRoadExit(vehicle.cell)
        vehicle.route = this.isOffMapRoadExit(vehicle.cell) ? [] : [offMap]
        vehicle.target = { kind: 'cell', ...offMap }
        vehicle.state = 'returning'
        vehicle.resumeState = null
        vehicle.facing = Math.PI
        if (vehicle.route.length === 0) this.finishGarbageTruckLeg(vehicle)
        return
      }
      const exit = this.findReachableRoadExit(
        vehicle.cell,
        this.getVehicleDirection(vehicle),
        undefined,
        true,
      )
      if (!exit) {
        vehicle.state = 'idle'
        return
      }
      const offMap = this.getOffMapRoadExit(exit.position)
      vehicle.route = [
        ...exit.route.map((cell) => ({ x: cell.x, z: cell.z })),
        offMap,
      ]
      vehicle.target = { kind: 'cell', ...offMap }
      vehicle.state = 'returning'
      vehicle.resumeState = null
      return
    }
    if (this.isOffMapRoadExit(vehicle.cell)) {
      this.reenterGarbageTruck(vehicle)
      return
    }
    const depot = this.state.logistics.wasteDepots.find((candidate) =>
      candidate.truckIds.includes(vehicle.id),
    )
    const access = depot ? this.getLogisticsBuildingAccess(depot, 2) : null
    if (!depot || !access) {
      vehicle.state = 'idle'
      return
    }
    if (access.x === vehicle.cell.x && access.z === vehicle.cell.z) {
      vehicle.state = 'idle'
      vehicle.target = { kind: 'depot', depotId: depot.id }
      vehicle.route = []
      vehicle.resumeState = null
      return
    }
    const route = this.findGarbageTruckRoute(vehicle, [access])
    if (!route) {
      vehicle.state = 'idle'
      return
    }
    vehicle.route = route
    vehicle.target = { kind: 'depot', depotId: depot.id }
    vehicle.state = 'returning'
    vehicle.resumeState = null
  }

  private reenterGarbageTruck(vehicle: RoadVehicle): void {
    const entry = this.findAvailableRoadEntry() ?? this.getRoadEntry()
    const occupied = this.state.logistics.roadVehicles.some(
      (candidate) =>
        candidate.id !== vehicle.id &&
        candidate.cell?.x === entry.x &&
        candidate.cell.z === entry.z &&
        candidate.state !== 'parked',
    )
    if (occupied) {
      vehicle.state = 'waiting'
      vehicle.waitMinutes = 1
      vehicle.resumeState = 'returning'
      return
    }
    vehicle.cell = { ...entry }
    vehicle.position = { ...entry }
    vehicle.facing = 0
    vehicle.cargo = 0
    vehicle.target = null
    vehicle.route = []
    const depot = this.state.logistics.wasteDepots.find((candidate) =>
      candidate.truckIds.includes(vehicle.id),
    )
    const access = depot ? this.getLogisticsBuildingAccess(depot, 2) : null
    if (!depot || !access) {
      vehicle.state = 'idle'
      return
    }
    const route = this.findGarbageTruckRoute(vehicle, [access])
    vehicle.target = { kind: 'depot', depotId: depot.id }
    vehicle.route = route ?? []
    vehicle.state = route ? 'returning' : 'idle'
    vehicle.resumeState = null
  }

  private getWorldSouthEdge(): number {
    return -this.getWorldSize() / 2
  }

  private isRoadExitCell(position: RoadPosition): boolean {
    return (
      position.z === this.getWorldSouthEdge() &&
      position.x >= -3 &&
      position.x <= 2
    )
  }

  private isOffMapRoadExit(position: RoadPosition): boolean {
    return position.z < this.getWorldSouthEdge()
  }

  private getOffMapRoadExit(position: RoadPosition): RoadPosition {
    return {
      x: Math.max(-3, Math.min(2, position.x)),
      z: this.getWorldSouthEdge() - 1,
    }
  }

  private dispatchAmbulance(vehicle: RoadVehicle): void {
    const claimed = new Set(
      this.state.logistics.roadVehicles
        .filter(
          (candidate) =>
            candidate.kind === 'ambulance' &&
            candidate.id !== vehicle.id,
        )
        .flatMap((candidate) => candidate.passengerIds),
    )
    const victim = this.state.visitors.find(
      (visitor) =>
        visitor.state === 'injured' && !claimed.has(visitor.id),
    )
    if (!victim || !vehicle.cell) return
    const target = { x: victim.cellX, z: victim.cellZ }
    const route = findRoadRoute({
      roadCells: this.state.logistics.roadCells,
      graph: this.getRoadGraph(),
      start: vehicle.cell,
      target,
      initialDirection: this.getVehicleDirection(vehicle),
    })
    if (!route) return
    vehicle.target = { kind: 'cell', ...target }
    victim.rescueVehicleId = vehicle.id
    vehicle.route = route.map((cell) => ({ x: cell.x, z: cell.z }))
    vehicle.state = 'responding'
  }

  private finishAmbulanceLeg(vehicle: RoadVehicle): void {
    if (vehicle.state === 'responding' && vehicle.cell) {
      const victims = this.state.visitors
        .filter(
          (visitor) =>
            visitor.state === 'injured' &&
            visitor.cellX === vehicle.cell?.x &&
            visitor.cellZ === vehicle.cell?.z,
        )
        .slice(0, SIMULATION_CONFIG.logistics.ambulanceCapacity)
      victims.forEach((visitor) => {
        visitor.state = 'medical-transport'
        visitor.injuryVehicleId = null
        visitor.rescueVehicleId = null
        vehicle.passengerIds.push(visitor.id)
      })
      const garage = this.state.logistics.ambulanceGarages.find((candidate) =>
        candidate.bays.includes(vehicle.id),
      )
      const access = garage
        ? this.getLogisticsBuildingAccess(garage, 2)
        : null
      if (!access || vehicle.passengerIds.length === 0) {
        vehicle.state = 'idle'
        return
      }
      const route = findRoadRoute({
        roadCells: this.state.logistics.roadCells,
        graph: this.getRoadGraph(),
        start: vehicle.cell,
        target: access,
        initialDirection: this.getVehicleDirection(vehicle),
      })
      if (!route) {
        vehicle.state = 'idle'
        return
      }
      vehicle.route = route.map((cell) => ({ x: cell.x, z: cell.z }))
      vehicle.state = 'returning'
      vehicle.target = garage
        ? { kind: 'garage', garageId: garage.id }
        : null
      return
    }
    if (vehicle.state === 'returning') {
      vehicle.passengerIds.forEach((visitorId) => {
        const visitor = this.getVisitor(visitorId)
        if (!visitor || !vehicle.cell) return
        visitor.state = 'sleeping'
        visitor.x = vehicle.cell.x + visitor.tileOffsetX
        visitor.z = vehicle.cell.z + visitor.tileOffsetZ
        visitor.cellX = vehicle.cell.x
        visitor.cellZ = vehicle.cell.z
        visitor.thought =
          'Der Krankenwagen hat mich an der Garage an die Sanitäter übergeben.'
      })
      vehicle.passengerIds = []
      vehicle.state = 'idle'
      vehicle.target = null
    }
  }

  private dispatchBus(vehicle: RoadVehicle): void {
    const line = this.state.logistics.busLines.find(
      (candidate) => candidate.id === vehicle.lineId && candidate.active,
    )
    if (!line || !vehicle.cell || line.stopIds.length < 2) return
    const absoluteMinute = this.state.day * 1440 + this.state.minute
    if (
      line.lastDepartureMinute !== null &&
      absoluteMinute - line.lastDepartureMinute < line.headway
    ) {
      return
    }
    vehicle.nextStopIndex = 0
    if (this.routeBusToStop(vehicle, line, 0)) {
      line.lastDepartureMinute = absoluteMinute
    }
  }

  private updateBusAtStop(vehicle: RoadVehicle, minutes: number): void {
    if (vehicle.kind !== 'bus' || vehicle.state !== 'at-stop') return
    const line = this.state.logistics.busLines.find(
      (candidate) => candidate.id === vehicle.lineId,
    )
    const stopId =
      vehicle.target?.kind === 'busStop'
        ? vehicle.target.stopId
        : null
    const stop =
      stopId
        ? this.state.logistics.busStops.find(
            (candidate) => candidate.id === stopId,
          )
        : undefined
    if (!line || !stop) {
      vehicle.state = 'idle'
      return
    }
    if (vehicle.waitMinutes > 0) {
      vehicle.waitMinutes += minutes
      if (vehicle.waitMinutes < 2) return
      const nextIndex =
        (vehicle.nextStopIndex + 1) % line.stopIds.length
      this.routeBusToStop(vehicle, line, nextIndex)
      return
    }
    const disembarkingIds = new Set(
      vehicle.passengerIds.filter((visitorId) => {
        const visitor = this.getVisitor(visitorId)
        return (
          !visitor?.busDestinationStopId ||
          visitor.busDestinationStopId === stop.id
        )
      }),
    )
    disembarkingIds.forEach((visitorId) => {
      const visitor = this.getVisitor(visitorId)
      if (!visitor) return
      visitor.x = stop.x + visitor.tileOffsetX
      visitor.z = stop.z + visitor.tileOffsetZ
      visitor.cellX = stop.x
      visitor.cellZ = stop.z
      visitor.cellElevation = 0
      visitor.busLineId = null
      visitor.busWaitMinutes = 0
      const destination = visitor.busDestination
      const resumeState = visitor.busResumeState
      const resumeTargetId = visitor.busResumeTargetId
      visitor.busDestination = null
      visitor.busDestinationStopId = null
      visitor.busResumeState = null
      visitor.busResumeTargetId = null
      const route = destination
        ? this.findPath(
            { x: stop.x, z: stop.z, elevation: 0 },
            [destination],
          )
        : null
      if (destination && route) {
        visitor.state = resumeState ?? 'exploring'
        visitor.targetId = resumeTargetId
        visitor.route = route
        visitor.thought = 'Nach der Busfahrt gehe ich den Rest des Weges zu Fuß.'
      } else {
        this.decideNextAction(visitor)
      }
    })
    vehicle.passengerIds = vehicle.passengerIds.filter(
      (visitorId) => !disembarkingIds.has(visitorId),
    )
    const waiting = this.state.visitors.filter(
      (visitor) =>
        visitor.state === 'bus-waiting' &&
        visitor.busLineId === line.id &&
        visitor.cellX === stop.x &&
        visitor.cellZ === stop.z,
    )
    const freeSeats =
      SIMULATION_CONFIG.logistics.busCapacity - vehicle.passengerIds.length
    waiting.slice(0, freeSeats).forEach((visitor) => {
      visitor.state = 'bus-riding'
      visitor.route = []
      vehicle.passengerIds.push(visitor.id)
    })
    waiting.slice(freeSeats).forEach((visitor) => {
      this.recordComplaint(visitor, 'bus-full')
      visitor.emotion = 'angry'
    })
    vehicle.waitMinutes += minutes
    if (vehicle.waitMinutes < 2) return
    const nextIndex = (vehicle.nextStopIndex + 1) % line.stopIds.length
    this.routeBusToStop(vehicle, line, nextIndex)
  }

  private routeBusToStop(
    vehicle: RoadVehicle,
    line: { stopIds: string[] },
    stopIndex: number,
  ): boolean {
    const stop = this.state.logistics.busStops.find(
      (candidate) => candidate.id === line.stopIds[stopIndex],
    )
    if (!stop || !vehicle.cell) return false
    const route = findRoadRoute({
      roadCells: this.state.logistics.roadCells,
      graph: this.getRoadGraph(),
      start: vehicle.cell,
      target: stop.roadCell,
      initialDirection: this.getVehicleDirection(vehicle),
    })
    if (!route) return false
    vehicle.nextStopIndex = stopIndex
    vehicle.target = { kind: 'busStop', stopId: stop.id }
    vehicle.route = route.map((cell) => ({ x: cell.x, z: cell.z }))
    vehicle.state = route.length > 0 ? 'driving' : 'at-stop'
    vehicle.waitMinutes = 0
    return true
  }

  private findReachableParking(
    vehicle: RoadVehicle,
    blockedCells?: ReadonlySet<string>,
    allowUTurn = false,
  ): { cell: ParkingCell; route: RoadCell[] } | null {
    const start = vehicle.cell ?? vehicle.position
    const approaches = new Map<string, ParkingCell>()
    this.state.logistics.parkingCells
      .filter(
        (cell) =>
          cell.occupiedBy === null || cell.occupiedBy === vehicle.id,
      )
      .sort(
        (left, right) =>
          Math.abs(left.x - start.x) +
          Math.abs(left.z - start.z) -
          (Math.abs(right.x - start.x) +
            Math.abs(right.z - start.z)),
      )
      .slice(0, SIMULATION_CONFIG.logistics.parkingRouteCandidateLimit)
      .forEach((cell) => {
        this.getAdjacentRoadPositions(cell).forEach((approach) => {
          const key = roadCellKey(approach.x, approach.z)
          if (!approaches.has(key)) approaches.set(key, cell)
        })
      })
    if (approaches.size === 0) return null
    const route = findRoadRoute({
      roadCells: this.state.logistics.roadCells,
      graph: this.getRoadGraph(),
      start,
      targets: [...approaches.keys()].map((key) => {
        const [x, z] = key.split(':')
        return { x: Number(x), z: Number(z) }
      }),
      initialDirection: this.getVehicleDirection(vehicle),
      blockedCells,
      allowUTurn,
    })
    if (!route) return null
    const last = route.at(-1) ?? start
    const cell = approaches.get(roadCellKey(last.x, last.z))
    return cell ? { cell, route } : null
  }

  private getAdjacentRoadPositions(position: RoadPosition): RoadPosition[] {
    return [
      { x: position.x, z: position.z + 1 },
      { x: position.x + 1, z: position.z },
      { x: position.x, z: position.z - 1 },
      { x: position.x - 1, z: position.z },
    ].filter((cell) => Boolean(this.getRoadCellAt(cell.x, cell.z)))
  }

  private finishVehicleParking(vehicle: RoadVehicle): void {
    if (!vehicle.parkingCell) {
      vehicle.state = 'waiting'
      return
    }
    vehicle.state = 'parked'
    vehicle.waitMinutes = 0
    vehicle.position = { ...vehicle.parkingCell }
    vehicle.cell = null
    const group = this.state.logistics.arrivalGroups.find(
      (candidate) => candidate.id === vehicle.groupId,
    )
    if (group) group.state = 'arrived'
    const access =
      this.getAdjacentRoadPositions(vehicle.parkingCell)[0] ?? this.getEntrance()
    const remainingPassengers: string[] = []
    vehicle.passengerIds.forEach((visitorId) => {
      const visitor = this.getVisitor(visitorId)
      if (!visitor) return
      if (
        visitor.state === 'leaving' ||
        visitor.state === 'vehicle-arrival' &&
          visitor.motivation <= 0
      ) {
        remainingPassengers.push(visitorId)
        return
      }
      visitor.x = access.x + visitor.tileOffsetX
      visitor.z = access.z + visitor.tileOffsetZ
      visitor.cellX = access.x
      visitor.cellZ = access.z
      visitor.state = 'entering'
      if (getItemQuantity(visitor.inventory, 'tent') > 0) {
        if (!this.camping.assignCampsite(visitor)) {
          visitor.state = 'camp-waiting'
          visitor.campingWaitRetryMinutes =
            SIMULATION_CONFIG.camping.unplacedRetryIntervalMinutes
        }
      } else {
        visitor.hasHandcart = false
        this.decideNextAction(visitor)
      }
    })
    vehicle.passengerIds = remainingPassengers
  }

  private canParkedCarDepart(
    vehicle: RoadVehicle,
    group: ArrivalGroup,
  ): boolean {
    const remaining = group.memberIds
      .map((visitorId) => this.getVisitor(visitorId))
      .filter((visitor): visitor is Visitor => Boolean(visitor))
    if (remaining.length === 0) return true
    const goingToThisCar = remaining.filter(
      (visitor) =>
        visitor.state === 'vehicle-arrival' ||
        visitor.campingPhase === 'packing' ||
        (visitor.state === 'leaving' && visitor.targetId === vehicle.id),
    )
    if (goingToThisCar.length === 0) return false
    return goingToThisCar.every(
      (visitor) =>
        visitor.state === 'vehicle-arrival' &&
        vehicle.passengerIds.includes(visitor.id),
    )
  }

  private updateVisitorFireworks(minutes: number): void {
    const launches = this.fireworks.update(
      this.state.visitors,
      minutes,
      () => this.nextId('firework'),
      this.rng,
    )
    launches.forEach(({ visitorId, effect, startsFire }) => {
      const visitor = this.getVisitor(visitorId)
      if (visitor) {
        visitor.thought = 'Ich habe einen Feuerwerkskörper gezündet!'
        visitor.emotion = 'excited'
        visitor.emotionMinutes = SIMULATION_CONFIG.fireworks.emotionMinutes
        visitor.needs.fun = Math.min(
          100,
          visitor.needs.fun + SIMULATION_CONFIG.fireworks.funGain,
        )
        this.giveWaste(visitor, 1)
      }
      this.state.fireworkEffects.push(effect)
      if (startsFire) {
        this.addGroundIncident(
          'fire',
          {
            x: Math.floor(effect.x),
            z: Math.floor(effect.z),
            elevation: Math.max(0, Math.floor(effect.y)),
          },
          SIMULATION_CONFIG.fireworks.fireSeverity,
        )
      }
    })
    this.updateShowFireworks()
  }

  private updateShowFireworks(): void {
    if (!this.isStagePerforming()) return
    const interval = SIMULATION_CONFIG.power.showFireworkIntervalMinutes
    const slot = Math.floor(this.state.minute / interval)
    const colors = [0xff5964, 0xffca3a, 0x8ac926, 0x38bdf8, 0xc77dff]
    this.state.buildings.forEach((building) => {
      if (building.kind !== 'fireworkBattery') return
      if (!this.poweredBuildingIds.has(building.id)) return
      if (this.showFireworkSlots.get(building.id) === slot) return
      this.showFireworkSlots.set(building.id, slot)
      for (let index = 0; index < SIMULATION_CONFIG.power.showFireworkBurst; index += 1) {
        this.state.fireworkEffects.push({
          id: `show-firework-${building.id}-${slot}-${index}`,
          x: building.x + 0.5 + (index - 1) * 0.28,
          y: building.elevation + 0.7,
          z: building.z + 0.5,
          color: colors[(slot + index) % colors.length]!,
          age: index * 0.08,
        })
      }
    })
  }

  private refreshPower(): void {
    const hasPlant = this.state.buildings.some(
      (building) =>
        building.kind === 'generator' || building.kind === 'backupGenerator',
    )
    if (!hasPlant) {
      const demand = this.state.buildings.reduce(
        (total, building) =>
          total + (SIMULATION_CONFIG.power.demand[building.kind] ?? 0) + (building.stageDesign ? stageStats(building.stageDesign).power : 0),
        0,
      )
      const poweredBuildingIds = this.state.buildings
        .filter((building) => (SIMULATION_CONFIG.power.demand[building.kind] ?? 0) > 0)
        .map((building) => building.id)
      this.state.power = {
        ...normalizePower(this.state.power),
        demand,
        supply: 0,
        poweredBuildingIds,
        liveCableKeys: [],
      }
      this.poweredBuildingIds = new Set(poweredBuildingIds)
      return
    }
    const next = this.powerSystem.calculate(
      this.state.power.cableCells,
      this.state.buildings,
    )
    this.state.power = next
    this.poweredBuildingIds = new Set(next.poweredBuildingIds)
  }

  private addGroundIncident(
    kind: GroundIncidentKind,
    cell: { x: number; z: number; elevation: number },
    severity = 1,
  ): void {
    const existing = this.state.incidents.find(
      (incident) =>
        incident.kind === kind &&
        incident.x === cell.x &&
        incident.z === cell.z &&
        incident.elevation === cell.elevation,
    )
    if (existing) {
      existing.severity = Math.min(
        SIMULATION_CONFIG.incidents.maximumSeverityPerCell,
        existing.severity + severity,
      )
      existing.ageMinutes = 0
      return
    }
    this.state.incidents.push(
      this.incidents.createIncident(
        this.nextId('incident'),
        kind,
        cell,
        Math.min(
          SIMULATION_CONFIG.incidents.maximumSeverityPerCell,
          severity,
        ),
      ),
    )
  }

  private mergeIncidentStacks(
    incidents: readonly GroundIncident[],
  ): GroundIncident[] {
    const merged = new Map<string, GroundIncident>()
    incidents.forEach((incident) => {
      const key = `${incident.kind}:${incident.x}:${incident.z}:${incident.elevation}`
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, {
          ...incident,
          severity: Math.min(
            SIMULATION_CONFIG.incidents.maximumSeverityPerCell,
            incident.severity,
          ),
        })
        return
      }
      existing.severity = Math.min(
        SIMULATION_CONFIG.incidents.maximumSeverityPerCell,
        existing.severity + incident.severity,
      )
      existing.ageMinutes = Math.min(
        existing.ageMinutes,
        incident.ageMinutes,
      )
    })
    return [...merged.values()]
  }

  private updateAtmosphere(): void {
    this.updateVisitorConversations()
    const result = this.atmosphere.calculate(
      this.state.buildings
        .filter((building) => this.isBuildingCurrentlyActive(building))
        .map((building) => ({
          id: building.id,
          kind: building.kind,
          x: building.x,
          z: building.z,
          elevation: building.elevation,
          rotation: building.rotation,
          wasteFill: building.wasteFill,
          stageDesign: building.stageDesign,
        })),
      this.state.incidents,
      this.state.visitors,
      this.state.campInstallations,
      this.state.wasteDumpCells,
      this.getWorldSize(),
    )
    this.state.attractiveness = result.attractiveness
    this.state.partyMood = result.partyMood
    this.attractivenessValues = result.attractivenessValues
    this.partyMoodValues = result.partyMoodValues
    this.attractivenessPacked.clear()
    result.attractivenessValues.forEach((value, key) => {
      const packed = this.packAtmosphereKey(key)
      if (packed !== null) this.attractivenessPacked.set(packed, value)
    })
    this.state.visitors.forEach((visitor) => {
      const cellKey = this.cellKey(
        visitor.cellX,
        visitor.cellZ,
        visitor.cellElevation,
      )
      visitor.localAttractiveness =
        this.attractivenessValues.get(cellKey) ?? 0
      visitor.localPartyMood = this.partyMoodValues.get(cellKey) ?? 0
    })
  }

  private updateVisitorConversations(): void {
    const stationary = new Map<string, Visitor[]>()
    this.state.visitors.forEach((visitor) => {
      visitor.isConversing = false
      if (
        visitor.route.length > 0 ||
        (visitor.state !== 'relaxing' &&
          visitor.state !== 'socializing' &&
          visitor.state !== 'partying')
      ) {
        return
      }
      const cellKey = this.cellKey(
        visitor.cellX,
        visitor.cellZ,
        visitor.cellElevation,
      )
      const group = stationary.get(cellKey) ?? []
      group.push(visitor)
      stationary.set(cellKey, group)
    })
    stationary.forEach((visitors, cellKey) => {
      if (visitors.length < 2) return
      visitors.forEach((visitor) => {
        visitor.isConversing = true
      })
      stationary.set(cellKey, visitors)
    })
  }

  private updateStaff(minutes: number): void {
    this.staffSimulation.update(
      {
        staff: this.state.staff,
        visitors: this.state.visitors,
        incidents: this.state.incidents,
        medicalCells: this.state.medicalCells,
        wasteDumps: this.state.wasteDumpCells,
        wasteBins: this.state.buildings
          .filter((building) => building.kind === 'wasteBin')
          .map((building) => ({
            id: building.id,
            x: building.x,
            z: building.z,
            elevation: building.elevation,
            stored: building.wasteFill ?? 0,
          })),
        securityGates: this.state.buildings
          .filter((building) => building.kind === 'securityGate')
          .map((building) => ({
            id: building.id,
            x: building.x,
            z: building.z,
            elevation: building.elevation,
          })),
        findPath: (start, goals, allowGround) =>
          this.findPath(start, goals, false, true, allowGround, false, true, undefined, true),
        pathNeighbors: (cell) =>
          this.getPedestrianNeighbors(cell, {
            allowStaff: true,
            allowCamping: true,
            allowMedical: true,
            allowFestival: true,
          }),
        rng: this.rng,
        reserveBed: (visitorId, preferredCell) =>
          this.medical.reserveBed(
            this.state.medicalCells,
            visitorId,
            preferredCell,
          ),
        removeIncident: (id) => {
          const target = this.state.incidents.find((incident) => incident.id === id)
          this.state.incidents = this.state.incidents.filter(
            (incident) =>
              incident.id !== id &&
              !(
                target &&
                (target.kind === 'vomit' || target.kind === 'litter') &&
                incident.kind === target.kind &&
                incident.x === target.x &&
                incident.z === target.z &&
                Math.abs(incident.elevation - target.elevation) < 0.01
              ),
          )
        },
        depositWaste: (x, z, amount) => {
          const dump = this.getWasteDumpAt(x, z)
          if (!dump || amount <= 0) return 0
          dump.stored += amount
          return amount
        },
        fillBin: (id, amount) => {
          const bin = this.state.buildings.find(b => b.id === id && b.kind === 'wasteBin')
          if (!bin) return 0
          const added = Math.min(amount, Math.max(0, SIMULATION_CONFIG.waste.binCapacity - (bin.wasteFill ?? 0)))
          bin.wasteFill = (bin.wasteFill ?? 0) + added
          return added
        },
        emptyBin: (id, amount) => {
          const bin = this.state.buildings.find(
            (building) => building.id === id && building.kind === 'wasteBin',
          )
          if (!bin || amount <= 0) return 0
          const taken = Math.min(bin.wasteFill ?? 0, amount)
          bin.wasteFill = (bin.wasteFill ?? 0) - taken
          return taken
        },
        abandonedCamps: this.collectibleAbandonedCamps(),
        removeAbandonedCamp: (id) => {
          const before = this.state.campInstallations.length
          this.state.campInstallations = this.state.campInstallations.filter(
            (installation) => installation.id !== id,
          )
          return this.state.campInstallations.length < before
        },
      },
      minutes,
    )
  }

  private collectibleAbandonedCamps(): Array<{
    id: string
    x: number
    z: number
    elevation: number
  }> {
    const living = new Set(this.state.visitors.map((visitor) => visitor.id))
    return this.state.campInstallations
      .filter((installation) => isCollectibleCamp(installation, living))
      .map((installation) => {
        const access = this.campCleanupAccess(installation.cell)
        return {
          id: `camp:${installation.id}`,
          x: access.x,
          z: access.z,
          elevation: access.elevation,
        }
      })
  }

  private campCleanupAccess(cell: { x: number; z: number; elevation: number }): {
    x: number
    z: number
    elevation: number
  } {
    const pitch = this.getCampingCellAt(cell.x, cell.z)
    const here = {
      x: cell.x,
      z: cell.z,
      elevation: pitch?.elevation ?? this.getTerrainHeight(cell.x, cell.z),
    }
    const adjacent = [
      { x: cell.x + 1, z: cell.z },
      { x: cell.x - 1, z: cell.z },
      { x: cell.x, z: cell.z + 1 },
      { x: cell.x, z: cell.z - 1 },
    ]
    for (const neighbor of adjacent) {
      const path =
        this.getPathAt(neighbor.x, neighbor.z, this.getTerrainHeight(neighbor.x, neighbor.z)) ??
        this.getPathAt(neighbor.x, neighbor.z)
      if (path) {
        return { x: path.x, z: path.z, elevation: path.elevation }
      }
    }
    return here
  }

  private updateAbandonedCamps(minutes: number): void {
    const living = new Set(this.state.visitors.map((visitor) => visitor.id))
    this.state.campInstallations = decayUnclaimedInstallations(
      this.state.campInstallations,
      living,
      minutes,
    )
  }

  private leaveVisitorCampBehind(visitor: Visitor): void {
    this.state.campInstallations = abandonVisitorCamp(
      visitor,
      this.state.campInstallations,
      () => this.nextId('camp'),
    )
    visitor.campsite = null
    if (visitor.campingPhase !== 'packing') visitor.campingPhase = 'none'
  }

  private updateCrowdingAndMotivation(minutes: number): void {
    const config = SIMULATION_CONFIG.crowding
    const result = this.crowding.calculate(this.state.visitors)
    this.state.crowding = result.snapshot
    this.crowdingCosts = new Map(
      result.snapshot.cells.map((cell) => [
        this.cellKey(cell.x, cell.z, cell.elevation),
        cell.value,
      ]),
    )
    this.crowdingCostPacked.clear()
    result.snapshot.cells.forEach((cell) => {
      this.crowdingCostPacked.set(this.packCell(cell), cell.value)
    })
    const vomitCells = new Set(
      this.state.incidents
        .filter((incident) => incident.kind === 'vomit')
        .map((incident) =>
          this.cellKey(incident.x, incident.z, incident.elevation),
        ),
    )
    const peopleByCell = new Map<string, number>()
    const panicByCell = new Map<string, number>()
    for (const visitor of this.state.visitors) {
      const key = this.cellKey(visitor.cellX, visitor.cellZ, visitor.cellElevation)
      peopleByCell.set(key, (peopleByCell.get(key) ?? 0) + 1)
      if (visitor.isPanicking || visitor.state === 'panicking') {
        panicByCell.set(key, (panicByCell.get(key) ?? 0) + 1)
      }
    }
    this.state.visitors.forEach((visitor) => {
      visitor.crowding = result.visitorValues.get(visitor.id) ?? 0
      if (visitor.state === 'medical' || visitor.state === 'medical-transport') {
        visitor.motivation = Math.min(
          100,
          visitor.motivation +
            minutes * config.medicalMotivationRecoveryPerMinute,
        )
        return
      }
      this.updateCrowdPanicStress(visitor, minutes, this.countOnTouchingCells(visitor, peopleByCell))
      const crowdingPressure = Math.max(
        0,
        (visitor.crowding - config.pressureStart) / config.pressureRange,
      )
      const hungerPressure = Math.max(
        0,
        (config.lowNeedThreshold - visitor.needs.hunger) /
          config.lowNeedThreshold,
      )
      const toiletPressure = Math.max(
        0,
        (config.lowNeedThreshold - visitor.needs.toilet) /
          config.lowNeedThreshold,
      )
      const energyPressure =
        visitor.campsite || visitor.state === 'sleeping'
          ? 0
          : Math.max(
              0,
              (config.lowEnergyThreshold - visitor.needs.energy) /
                config.lowEnergyThreshold,
            )
      const litterPressure = vomitCells.has(
        this.cellKey(
          visitor.cellX,
          visitor.cellZ,
          visitor.cellElevation,
        ),
      )
        ? config.vomitPressure
        : 0
      const atmosphere = SIMULATION_CONFIG.atmosphere
      const beautyDeficit =
        Math.max(
          0,
          atmosphere.preferenceDeficitThreshold -
            visitor.localAttractiveness,
        ) / atmosphere.preferenceDeficitThreshold
      const partyDeficit =
        Math.max(
          0,
          atmosphere.preferenceDeficitThreshold - visitor.localPartyMood,
        ) / atmosphere.preferenceDeficitThreshold
      const atmospherePressure =
        (beautyDeficit * visitor.beautyPreference +
          partyDeficit * visitor.partyPreference) *
        atmosphere.preferenceMotivationLossPerMinute /
        config.motivationLossPerMinute
      const forecourtOvercrowding =
        this.getStageForecourtCellAt(visitor.cellX, visitor.cellZ) &&
        visitor.crowding >= atmosphere.overcrowdingStart
          ? atmosphere.overcrowdingMotivationLossPerMinute /
            config.motivationLossPerMinute
          : 0
      if (beautyDeficit + partyDeficit > 0.7) {
        visitor.needs.fun = Math.max(
          0,
          visitor.needs.fun -
            minutes * atmosphere.preferenceFunLossPerMinute,
        )
      }
      const badConditions = Math.min(
        config.maximumBadConditions,
        crowdingPressure +
          hungerPressure * config.hungerPressureWeight +
          toiletPressure * config.toiletPressureWeight +
          energyPressure * config.energyPressureWeight +
          litterPressure +
          atmospherePressure +
          forecourtOvercrowding,
      )
      const needsFulfilled =
        visitor.needs.hunger >= config.fulfilledNeedThreshold &&
        visitor.needs.toilet >= config.fulfilledNeedThreshold &&
        visitor.needs.fun >= config.fulfilledNeedThreshold &&
        visitor.needs.energy >= config.fulfilledEnergyThreshold
      const recoveryPerMinute =
        (badConditions === 0 ? config.motivationRecoveryPerMinute : 0) +
        (needsFulfilled ? config.fulfilledNeedsRecoveryPerMinute : 0)
      visitor.motivation = Math.min(
        100,
        Math.max(
          0,
          visitor.motivation +
            minutes *
              (recoveryPerMinute -
                config.motivationLossPerMinute * badConditions),
        ),
      )
      if (
        visitor.motivation === 0 &&
        !visitor.isPanicking &&
        visitor.state !== 'riding' &&
        visitor.state !== 'sleeping' &&
        visitor.state !== 'leaving' &&
        visitor.state !== 'vehicle-arrival' &&
        visitor.state !== 'bus-riding' &&
        visitor.campingPhase !== 'packing'
      ) {
        visitor.emotion = 'sad'
        visitor.emotionMinutes = 60
        visitor.thought = 'Unter diesen Bedingungen habe ich keine Lust mehr.'
        if (visitor.crowding >= 70) {
          this.recordComplaint(visitor, 'overcrowding')
        }
        if (litterPressure > 0 || visitor.localAttractiveness < -20) {
          this.recordComplaint(visitor, 'dirty-grounds')
        }
        this.beginVisitorDeparture(visitor)
      }
    })
    this.resolveCrowdPanic(minutes, peopleByCell, panicByCell)
  }

  private canEnterCrowdPanic(visitor: Visitor): boolean {
    return (
      !visitor.isPanicking &&
      visitor.state !== 'riding' &&
      visitor.state !== 'sleeping' &&
      visitor.state !== 'leaving' &&
      visitor.state !== 'vehicle-arrival' &&
      visitor.state !== 'bus-riding' &&
      visitor.state !== 'medical' &&
      visitor.state !== 'medical-transport' &&
      visitor.state !== 'injured' &&
      visitor.campingPhase !== 'packing' &&
      visitor.campingPhase !== 'resting'
    )
  }

  private updateCrowdPanicStress(visitor: Visitor, minutes: number, nearbyPeople: number): void {
    const crowd = SIMULATION_CONFIG.crowding
    if (visitor.crowding >= crowd.denseThreshold) {
      const intensity = Math.min(
        1,
        (visitor.crowding - crowd.denseThreshold) / Math.max(1, 100 - crowd.denseThreshold),
      )
      visitor.crowdStress = Math.min(
        100,
        visitor.crowdStress +
          minutes * crowd.stressGainPerMinute * (0.4 + intensity * 0.6) *
            (1 + Math.min(crowd.panicNearbyCap, nearbyPeople) / 80),
      )
      return
    }
    if (visitor.crowding <= crowd.calmThreshold) {
      visitor.crowdStress = Math.max(0, visitor.crowdStress - minutes * crowd.stressDecayPerMinute)
    }
  }

  private countOnTouchingCells(
    visitor: { cellX: number; cellZ: number; cellElevation: number },
    counts: Map<string, number>,
  ): number {
    const x = visitor.cellX
    const z = visitor.cellZ
    const elevation = visitor.cellElevation
    return (
      (counts.get(this.cellKey(x, z, elevation)) ?? 0) +
      (counts.get(this.cellKey(x + 1, z, elevation)) ?? 0) +
      (counts.get(this.cellKey(x - 1, z, elevation)) ?? 0) +
      (counts.get(this.cellKey(x, z + 1, elevation)) ?? 0) +
      (counts.get(this.cellKey(x, z - 1, elevation)) ?? 0)
    )
  }

  private markPanicCell(visitor: Visitor, panicByCell: Map<string, number>): void {
    const key = this.cellKey(visitor.cellX, visitor.cellZ, visitor.cellElevation)
    panicByCell.set(key, (panicByCell.get(key) ?? 0) + 1)
  }

  private resolveCrowdPanic(
    minutes: number,
    peopleByCell: Map<string, number>,
    panicByCell: Map<string, number>,
  ): void {
    const crowd = SIMULATION_CONFIG.crowding
    const crowdingAt = (x: number, z: number, elevation: number) =>
      this.crowdingCosts.get(this.cellKey(x, z, elevation)) ?? 0
    const peopleAt = (x: number, z: number, elevation: number) =>
      peopleByCell.get(this.cellKey(x, z, elevation)) ?? 0
    this.state.visitors.forEach((visitor) => {
      if (!this.canEnterCrowdPanic(visitor) || visitor.crowding < crowd.denseThreshold) return
      const denseCells = denseClusterSize(visitor, crowdingAt, crowd.denseThreshold)
      const clusterPeople = neighborhoodPeople(visitor, peopleAt)
      const nearby = this.countOnTouchingCells(visitor, peopleByCell)
      const chance =
        spontaneousPanicChance(visitor.crowding, visitor.crowdStress, nearby, denseCells, clusterPeople) *
        minutes
      if (this.rng.next() < chance) {
        this.beginCrowdPanic(visitor)
        this.markPanicCell(visitor, panicByCell)
      }
    })
    this.state.visitors.forEach((visitor) => {
      if (!this.canEnterCrowdPanic(visitor) || visitor.crowding < crowd.denseThreshold) return
      const denseCells = denseClusterSize(visitor, crowdingAt, crowd.denseThreshold)
      const nearbyPanic = this.countOnTouchingCells(visitor, panicByCell)
      if (this.rng.next() < panicSpreadChance(visitor.crowding, nearbyPanic, denseCells) * minutes) {
        this.beginCrowdPanic(visitor)
        this.markPanicCell(visitor, panicByCell)
      }
    })
    this.state.visitors.forEach((visitor) => {
      if (!visitor.isPanicking) return
      const alcohol = visitor.alcoholLevel
      visitor.needs.hunger = Math.max(0, visitor.needs.hunger - minutes * crowd.panicNeedLossPerMinute)
      visitor.needs.toilet = Math.max(0, visitor.needs.toilet - minutes * crowd.panicNeedLossPerMinute)
      visitor.needs.fun = Math.max(0, visitor.needs.fun - minutes * crowd.panicNeedLossPerMinute)
      visitor.needs.energy = Math.max(0, visitor.needs.energy - minutes * crowd.panicNeedLossPerMinute)
      visitor.alcoholLevel = alcohol
      visitor.motivation = Math.max(0, visitor.motivation - minutes * crowd.panicMotivationLossPerMinute)
      visitor.emotion = 'angry'
      visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 8)
      if (visitor.crowding <= crowd.calmThreshold) {
        visitor.panicRecoverMinutes += minutes
        if (visitor.panicRecoverMinutes >= crowd.panicRecoverMinutes) {
          this.endCrowdPanic(visitor)
        }
        return
      }
      visitor.panicRecoverMinutes = 0
      this.ensurePanicFleeRoute(visitor)
      if (visitor.motivation === 0 && visitor.crowding >= crowd.denseThreshold) {
        this.recordComplaint(visitor, 'overcrowding')
        this.beginVisitorDeparture(visitor)
      }
    })
  }

  private beginCrowdPanic(visitor: Visitor): void {
    this.clearVisitorActivity(visitor)
    this.removeVisitorFromCoasterQueues(visitor.id)
    visitor.isPanicking = true
    visitor.panicRecoverMinutes = 0
    visitor.crowdStress = Math.max(visitor.crowdStress, 70)
    visitor.isConversing = false
    visitor.state = 'panicking'
    visitor.targetId = null
    visitor.concertId = null
    visitor.emotion = 'angry'
    visitor.emotionMinutes = 20
    visitor.thought = 'Massenpanik! Ich muss hier raus!'
    this.ensurePanicFleeRoute(visitor)
  }

  private endCrowdPanic(visitor: Visitor): void {
    visitor.isPanicking = false
    visitor.panicRecoverMinutes = 0
    visitor.crowdStress = Math.min(visitor.crowdStress, 24)
    visitor.motivation = Math.min(100, Math.max(visitor.motivation, 32))
    visitor.state = 'exploring'
    visitor.targetId = null
    visitor.route = []
    visitor.emotion = 'happy'
    visitor.emotionMinutes = 10
    visitor.thought = 'Das Gedränge lässt nach. Kurz durchatmen, dann geht es weiter.'
  }

  private ensurePanicFleeRoute(visitor: Visitor): void {
    if (this.isAtParkExit(visitor)) {
      visitor.route = []
      return
    }
    if (visitor.route.length > 0) return
    const current = this.crowdingCosts.get(
      this.cellKey(visitor.cellX, visitor.cellZ, visitor.cellElevation),
    ) ?? visitor.crowding
    const quieter = [
      { x: visitor.cellX + 1, z: visitor.cellZ },
      { x: visitor.cellX - 1, z: visitor.cellZ },
      { x: visitor.cellX, z: visitor.cellZ + 1 },
      { x: visitor.cellX, z: visitor.cellZ - 1 },
    ]
      .map((cell) => ({
        x: cell.x,
        z: cell.z,
        elevation: visitor.cellElevation,
        crowding: this.crowdingCosts.get(
          this.cellKey(cell.x, cell.z, visitor.cellElevation),
        ) ?? 0,
      }))
      .filter((cell) => {
        const path = this.getPathAt(cell.x, cell.z, cell.elevation)
        return Boolean(path) && !path?.staffOnly && cell.crowding < current - 6
      })
      .sort((left, right) => left.crowding - right.crowding)
    if (quieter[0]) {
      visitor.route = [quieter[0]]
      return
    }
    visitor.route =
      this.findPath(
        { x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation },
        [this.getEntrance()],
        true,
        true,
        true,
        true,
      ) ?? []
  }

  save(): ActionResult {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state))
    return { ok: true, message: 'Spiel gespeichert' }
  }

  saveSlot(name: string, id?: string): ActionResult {
    const trimmed = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!trimmed) return { ok: false, message: 'Bitte einen Namen für den Spielstand eingeben' }
    try {
      const slots = GameState.readSaveSlots()
      const target = id ? slots.find(slot => slot.id === id) : undefined
      if (!target && slots.length >= 20) return { ok: false, message: 'Maximal 20 lokale Spielstände möglich' }
      const savedAt = Date.now()
      const next: StoredSaveSlot = {
        id: target?.id ?? `slot-${savedAt}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        savedAt,
        snapshot: JSON.stringify(this.state),
      }
      const updated = target
        ? slots.map(slot => slot.id === target.id ? next : slot)
        : [...slots, next]
      localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(updated))
      return { ok: true, message: `Spielstand „${trimmed}“ gespeichert` }
    } catch {
      return { ok: false, message: 'Lokaler Spielstandsspeicher ist nicht verfügbar' }
    }
  }

  static listSaveSlots(): LocalSaveSlot[] {
    return GameState.readSaveSlots()
      .map(({ id, name, savedAt }) => ({ id, name, savedAt }))
      .sort((a, b) => b.savedAt - a.savedAt)
  }

  static loadSlot(id: string): GameState | null {
    const slot = GameState.readSaveSlots().find(candidate => candidate.id === id)
    return slot ? GameState.fromJSON(slot.snapshot) : null
  }

  static deleteSaveSlot(id: string): ActionResult {
    try {
      const slots = GameState.readSaveSlots()
      if (!slots.some(slot => slot.id === id)) return { ok: false, message: 'Spielstand nicht gefunden' }
      localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots.filter(slot => slot.id !== id)))
      return { ok: true, message: 'Spielstand gelöscht' }
    } catch {
      return { ok: false, message: 'Lokaler Spielstandsspeicher ist nicht verfügbar' }
    }
  }

  private static readSaveSlots(): StoredSaveSlot[] {
    try {
      const raw = localStorage.getItem(SAVE_SLOTS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((slot): slot is StoredSaveSlot =>
        slot && typeof slot.id === 'string' && typeof slot.name === 'string' &&
        typeof slot.savedAt === 'number' && typeof slot.snapshot === 'string' &&
        GameState.fromJSON(slot.snapshot) !== null,
      )
    } catch {
      return []
    }
  }

  static load(): GameState | null {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? GameState.fromJSON(raw) : null
  }

  static fromJSON(raw: string): GameState | null {
    try {
      const data = JSON.parse(raw) as Partial<GameSnapshot> & { version?: number }
      if (!Array.isArray(data.buildings)) return null
      const migrated: GameSnapshot = {
        ...createBlankSnapshot(),
        ...data,
        version: 24,
        terrain: normalizeTerrain(data.terrain),
        buildings: data.buildings,
        campingCells: Array.isArray(data.campingCells) ? data.campingCells : [],
        campInstallations: Array.isArray(data.campInstallations)
          ? data.campInstallations
          : [],
        staff: Array.isArray(data.staff) ? data.staff : [],
        medicalCells: Array.isArray(data.medicalCells) ? data.medicalCells : [],
        wasteDumpCells: Array.isArray(data.wasteDumpCells)
          ? data.wasteDumpCells
              .map(normalizeWasteDumpCell)
              .filter((cell): cell is WasteDumpCell => cell !== null)
          : [],
        incidents: Array.isArray(data.incidents) ? data.incidents : [],
        logistics: normalizeLogisticsSnapshot(data.logistics),
        scenario: normalizeScenarioSettings(data.scenario),
        stageForecourtCells: Array.isArray(data.stageForecourtCells)
          ? data.stageForecourtCells
          : [],
        visitors: Array.isArray(data.visitors) ? data.visitors : [],
        coasters: Array.isArray(data.coasters) ? data.coasters : [],
        power: normalizePower(data.power),
      }
      return new GameState(migrated)
    } catch {
      return null
    }
  }

  private trySpawnVisitor(forcedTicketType?: 'day' | 'camping'): void {
    if (!this.state.parkOpen) return
    const mode =
      this.rng.next() < this.getScenario().carArrivalShare
        ? 'car'
        : 'pedestrian'
    const roadEntry =
      mode === 'car' ? this.findAvailableRoadEntry() : this.getRoadEntry()
    if (mode === 'car' && !roadEntry) return
    const requestedSize =
      mode === 'car' ? this.sampleArrivalGroupSize() : 1
    const groupId = this.nextId('arrival')
    const members: Visitor[] = []
    for (let index = 0; index < requestedSize; index += 1) {
      const visitor = this.spawnVisitorMember(
        forcedTicketType,
        groupId,
        mode,
        mode === 'car',
      )
      if (visitor) members.push(visitor)
    }
    if (members.length === 0) return
    const group: ArrivalGroup = {
      id: groupId,
      memberIds: members.map((visitor) => visitor.id),
      vehicleId: null,
      mode,
      state: mode === 'car' ? 'approaching' : 'arrived',
      arrivedMinute: this.state.day * 1440 + this.state.minute,
      parkingWaitMinutes: 0,
      entryFeesPaid: members.every((visitor) => visitor.entryFeePaid > 0),
    }
    this.state.logistics.arrivalGroups.push(group)
    if (mode === 'car') {
      const vehicleEntry = roadEntry ?? this.getRoadEntry()
      const vehicle: RoadVehicle = {
        id: this.nextId('car'),
        kind: 'visitorCar',
        position: { ...vehicleEntry },
        cell: { ...vehicleEntry },
        route: [],
        state: 'waiting',
        speed: 0,
        passengerIds: [...group.memberIds],
        groupId,
        parkingCell: null,
        target: null,
        facing: 0,
        waitMinutes: 0,
        resumeState: null,
        lineId: null,
        nextStopIndex: 0,
        cargo: 0,
      }
      group.vehicleId = vehicle.id
      this.state.logistics.roadVehicles.push(vehicle)
      members.forEach((visitor) => {
        visitor.thought = 'Wir suchen mit dem Auto einen Parkplatz.'
      })
    }
  }

  private spawnVisitorMember(
    forcedTicketType: 'day' | 'camping' | undefined,
    groupId: string,
    arrivalMode: 'car' | 'pedestrian',
    deferArrival: boolean,
  ): Visitor | null {
    if (!this.state.parkOpen) return null
    let inventory = createFestivalInventory(this.rng)
    if (forcedTicketType === 'camping' && getItemQuantity(inventory, 'tent') === 0) {
      addItem(inventory, 'tent')
    } else if (forcedTicketType === 'day') {
      inventory = inventory.filter(
        (item) =>
          item.kind !== 'tent' &&
          item.kind !== 'chairs' &&
          item.kind !== 'pavilion' &&
          item.kind !== 'musicBox',
      )
    }
    const ticketType =
      forcedTicketType ??
      (getItemQuantity(inventory, 'tent') > 0 ? 'camping' : 'day')
    const tickets = this.state.festival.enabled ? this.state.festival.tickets : undefined
    if (tickets && (ticketType === 'camping' ? tickets.usedCamping >= tickets.camping : (tickets.usedDay[this.state.day] ?? 0) >= tickets.day)) return null
    if (ticketType === 'camping') {
      const admittedCampers = this.state.visitors.filter(
        (visitor) => visitor.ticketType === 'camping',
      ).length
      if (admittedCampers >= this.getBookableCampingCapacity()) return null
    }
    if (
      ticketType === 'day' &&
      (getFestivalCycleStatus(this.state.dayPlan, this.state.day).phase !==
        'festival' ||
        !isDayVisitorAdmissionOpen(this.state.dayPlan, this.state.minute))
    ) {
      return null
    }

    const id = this.nextId('visitor')
    const nameIndex = (this.idCounter + this.state.day) % VISITOR_NAMES.length
    const tileOffsetX =
      SIMULATION_CONFIG.visitors.tileOffsetMinimum +
      this.rng.next() * SIMULATION_CONFIG.visitors.tileOffsetRandomRange
    const tileOffsetZ =
      SIMULATION_CONFIG.visitors.tileOffsetMinimum +
      this.rng.next() * SIMULATION_CONFIG.visitors.tileOffsetRandomRange
    const initialNeeds = SIMULATION_CONFIG.visitors.initialNeeds
    const visitor: Visitor = {
      id,
      name: `${VISITOR_NAMES[nameIndex]} ${this.idCounter}`,
      x: this.getEntrance().x + tileOffsetX,
      y: this.getEntrance().elevation,
      z: this.getEntrance().z + tileOffsetZ,
      cellX: this.getEntrance().x,
      cellZ: this.getEntrance().z,
      cellElevation: this.getEntrance().elevation,
      color: Math.floor(this.rng.next() * 0xffffff),
      state: 'entering',
      thought: 'Ich bin gespannt auf den Park!',
      needs: {
        hunger: initialNeeds.hungerMinimum + this.rng.next() * initialNeeds.hungerRandomRange,
        toilet: initialNeeds.toiletMinimum + this.rng.next() * initialNeeds.toiletRandomRange,
        fun: initialNeeds.funMinimum + this.rng.next() * initialNeeds.funRandomRange,
        energy: initialNeeds.energyMinimum + this.rng.next() * initialNeeds.energyRandomRange,
      },
      route: [],
      targetId: null,
      interactionRemaining: 0,
      walkSpeed:
        SIMULATION_CONFIG.visitors.walkSpeedMinimum +
        this.rng.next() * SIMULATION_CONFIG.visitors.walkSpeedRandomRange,
      movementBoostMinutes: 0,
      avoidedCoasterId: null,
      avoidanceMinutes: 0,
      facing: 0,
      emotion: 'neutral',
      emotionMinutes: 0,
      budget: SIMULATION_CONFIG.visitors.budget,
      alcoholLevel: 0,
      alcoholDisposition:
        this.rng.next() < this.getScenario().aggressiveShare
          ? 'aggressive'
          : 'calm',
      alcoholDesire:
        SIMULATION_CONFIG.visitors.alcoholDesireMinimum +
        this.rng.next() * SIMULATION_CONFIG.visitors.alcoholDesireRandomRange,
      campsite: null,
      campingPhase: 'none',
      hasHandcart: ticketType === 'camping',
      inventory,
      motivation: 100,
      crowding: 0,
      crowdStress: 0,
      isPanicking: false,
      panicRecoverMinutes: 0,
      tileOffsetX,
      tileOffsetZ,
      campActivityTarget: null,
      campActivity: 'standing',
      campActivityKind: null,
      campActivitySlot: 0,
      campActivityCapacity: 1,
      nausea: 0,
      nauseaCooldown: 0,
      medicalCell: null,
      medicalSlot: null,
      securityGateId: null,
      securityResumeState: null,
      beautyPreference: sampleBiasedPreference(
        this.getScenario().beautyAffinity,
        this.rng,
      ),
      partyPreference: sampleBiasedPreference(
        this.getScenario().partyAffinity,
        this.rng,
      ),
      localAttractiveness: 0,
      localPartyMood: 0,
      activityTarget: null,
      activitySlot: 0,
      activityCapacity: 1,
      isDancing: false,
      preferredBedtime: this.createPreferredBedtime(),
      preferredWakeTime: this.createPreferredWakeTime(),
      ticketType,
      consumptionCooldown: 0,
      isConversing: false,
      campingWaitMinutes: 0,
      campingWaitRetryMinutes: 0,
      entryFeePaid: 0,
      complaintsFiled: [],
      arrivalGroupId: groupId,
      arrivalMode,
      injuryVehicleId: null,
      rescueVehicleId: null,
      busWaitMinutes: 0,
      busLineId: null,
      busDestination: null,
      busDestinationStopId: null,
      busResumeState: null,
      busResumeTargetId: null,
      walkingToCampDistance: 0,
      pendingWaste: 0,
      streakingMinutes: 0,
      streakingCooldownMinutes: 0,
      pathSeed: hashStringSeed(id),
      wanderNonce: 0,
    }
    if (this.state.festival.enabled) assignAudience(visitor, this.state.festival)
    const paidEntry = this.chargeVisitor(visitor, this.state.entryPrice, {
      x: (arrivalMode === 'car' ? this.getRoadEntry().x : this.getEntrance().x) + 0.5,
      y: 0.85,
      z: (arrivalMode === 'car' ? this.getRoadEntry().z : this.getEntrance().z) + 0.5,
    })
    if (paidEntry) visitor.entryFeePaid = this.state.entryPrice
    this.state.visitors.push(visitor)
    if (tickets) { if (ticketType === 'camping') tickets.usedCamping++; else tickets.usedDay[this.state.day] = (tickets.usedDay[this.state.day] ?? 0) + 1 }
    if (this.state.festival.enabled) { this.state.festival.admissions++; this.state.festival.metrics.guests++ }
    this.indexedVisitorCount = -1
    this.state.guests = this.state.visitors.length
    if (deferArrival) {
      visitor.state = 'vehicle-arrival'
      visitor.x = this.getRoadEntry().x + tileOffsetX
      visitor.z = this.getRoadEntry().z + tileOffsetZ
      visitor.cellX = this.getRoadEntry().x
      visitor.cellZ = this.getRoadEntry().z
      return visitor
    }
    if (getItemQuantity(visitor.inventory, 'tent') === 0) {
      visitor.hasHandcart = false
      this.queueVisitorDecision(visitor)
    } else if (!this.camping.assignCampsite(visitor)) {
      visitor.state = 'camp-waiting'
      visitor.route = []
      visitor.campingWaitMinutes = 0
      visitor.campingWaitRetryMinutes =
        SIMULATION_CONFIG.camping.unplacedRetryIntervalMinutes
      visitor.emotion = 'sad'
      visitor.thought =
        'Alle Campingflächen wirken belegt. Ich warte auf einen freien Platz.'
    }
    return visitor
  }

  private sampleArrivalGroupSize(): number {
    let roll = this.rng.next()
    const weights = SIMULATION_CONFIG.logistics.groupSizeWeights
    for (let index = 0; index < weights.length; index += 1) {
      roll -= weights[index] ?? 0
      if (roll <= 0) return index + 1
    }
    return 1
  }

  private findAvailableRoadEntry(): RoadPosition | null {
    for (let x = -3; x <= 2; x += 1) {
      const road = this.getRoadCellAt(x, -this.getWorldSize() / 2)
      if (!road || !isRoadDirectionAllowed(road, 0)) continue
      const occupied = this.state.logistics.roadVehicles.some(
        (vehicle) =>
          vehicle.cell?.x === x &&
          vehicle.cell.z === -this.getWorldSize() / 2 &&
          vehicle.state !== 'parked',
      )
      if (!occupied) return { x, z: -this.getWorldSize() / 2 }
    }
    return null
  }

  private queueVisitorDecision(visitor: Visitor): void {
    // Camping arrivals belong to the camping state machine, not destination selection.
    if (visitor.state === 'camping') return
    this.visitorsAwaitingDecision.add(visitor.id)
  }

  private flushVisitorDecisions(limit = 2): void {
    let decided = 0
    while (decided < limit && this.visitorsAwaitingDecision.size > 0) {
      const visitorId = this.visitorsAwaitingDecision.values().next().value
      if (!visitorId) break
      this.visitorsAwaitingDecision.delete(visitorId)
      decided += 1
      const visitor = this.getVisitor(visitorId)
      if (
        !visitor ||
        visitor.state === 'camping' ||
        visitor.state === 'vehicle-arrival' ||
        visitor.state === 'riding' ||
        visitor.state === 'leaving'
      ) {
        continue
      }
      if (visitor.route.length > 0 || visitor.targetId) continue
      this.decideNextAction(visitor)
    }
  }

  private updateVisitors(minutes: number): void {
    this.flushVisitorDecisions(SIMULATION_CONFIG.pathfinding.decisionsPerTick)
    const leavingIds = new Set<string>()

    this.state.visitors.forEach((visitor) => {
      visitor.alcoholLevel = Math.max(
        0,
        visitor.alcoholLevel -
          minutes * SIMULATION_CONFIG.alcohol.decayPerMinute,
      )
      visitor.alcoholDesire = Math.min(
        100,
        visitor.alcoholDesire +
          minutes * SIMULATION_CONFIG.alcohol.desireGainPerMinute,
      )
      if (
        !this.state.parkOpen &&
        visitor.state !== 'riding' &&
        visitor.state !== 'vehicle-arrival' &&
        visitor.state !== 'bus-riding'
      ) {
        if (visitor.state === 'leaving') {
          this.ensureExitRoute(visitor)
        } else if (
          visitor.state !== 'camping' ||
          visitor.campingPhase !== 'packing'
        ) {
          this.beginVisitorDeparture(visitor)
        }
      }
      if (visitor.state === 'leaving') {
        this.ensureExitRoute(visitor)
      }
      if (visitor.state === 'leaving' && this.tryBoardDepartureCar(visitor)) {
        return
      }
      if (
        (visitor.state === 'leaving' || visitor.isPanicking || visitor.state === 'panicking') &&
        this.isAtParkExit(visitor)
      ) {
        leavingIds.add(visitor.id)
        return
      }
      if (visitor.isPanicking || visitor.state === 'panicking') {
        if (visitor.state !== 'leaving') visitor.state = 'panicking'
        if (visitor.route.length === 0) this.ensurePanicFleeRoute(visitor)
      }
      if (visitor.state === 'medical') {
        const medical = SIMULATION_CONFIG.medical
        visitor.alcoholLevel = Math.max(
          0,
          visitor.alcoholLevel - minutes * medical.alcoholDecayPerMinute,
        )
        visitor.nausea = Math.max(
          0,
          visitor.nausea - minutes * medical.nauseaRecoveryPerMinute,
        )
        visitor.needs.energy = Math.min(
          100,
          visitor.needs.energy + minutes * medical.energyRecoveryPerMinute,
        )
        visitor.motivation = Math.min(
          100,
          visitor.motivation + minutes * medical.motivationRecoveryPerMinute,
        )
        if (
          visitor.alcoholLevel < medical.dischargeAlcoholBelow &&
          visitor.needs.energy >= medical.dischargeEnergy
        ) {
          this.medical.releaseBed(this.state.medicalCells, visitor.id)
          visitor.medicalCell = null
          visitor.medicalSlot = null
          visitor.state = 'exploring'
          visitor.thought = 'Mir geht es wieder besser.'
          this.decideNextAction(visitor)
        }
        return
      }
      if (visitor.state === 'medical-transport') return
      if (visitor.state === 'sleeping') {
        const camping = SIMULATION_CONFIG.camping
        visitor.needs.energy = Math.min(
          100,
          visitor.needs.energy + minutes * camping.groundSleepEnergyPerMinute,
        )
        visitor.needs.hunger = Math.max(
          0,
          visitor.needs.hunger -
            minutes * camping.sleepingHungerDecayPerMinute,
        )
        visitor.needs.toilet = Math.max(
          0,
          visitor.needs.toilet -
            minutes * camping.sleepingToiletDecayPerMinute,
        )
        if (
          visitor.alcoholLevel < camping.wakeAlcoholBelow &&
          visitor.needs.energy >= camping.wakeEnergy
        ) {
          visitor.state = 'exploring'
          visitor.emotion = 'sad'
          visitor.emotionMinutes = 30
          visitor.thought = 'Ich bin wieder wach. Mein Kopf brummt.'
          this.decideNextAction(visitor)
        }
        return
      }
      this.decayNeeds(visitor, minutes)
      if (this.state.parkOpen && this.incidents.updateNausea(visitor, minutes)) {
        const path = this.getPathAt(
          visitor.cellX,
          visitor.cellZ,
          visitor.cellElevation,
        )
        if (path) {
          this.addGroundIncident('vomit', {
            x: visitor.cellX,
            z: visitor.cellZ,
            elevation: visitor.cellElevation,
          })
          visitor.state = 'vomiting'
          visitor.route = []
          visitor.targetId = null
          visitor.interactionRemaining =
            SIMULATION_CONFIG.needs.interactionMinutes.vomiting
          visitor.emotion = 'sad'
          visitor.emotionMinutes = 30
          visitor.thought = 'Mir ist richtig übel!'
        }
      }
      this.updateVisitorEmotion(visitor, minutes)
      if (this.state.parkOpen && this.updateAlcoholBehavior(visitor)) return
      if (this.state.parkOpen) this.updateStreaking(visitor, minutes)
      if (
        this.state.parkOpen &&
        visitor.campsite &&
        visitor.campingPhase === 'ready' &&
        visitor.needs.energy <=
          SIMULATION_CONFIG.visitors.decisions.exhaustedEnergy &&
        visitor.state !== 'riding' &&
        visitor.state !== 'camping' &&
        visitor.state !== 'bench-resting' &&
        !this.visitorsAwaitingDecision.has(visitor.id)
      ) {
        this.removeVisitorFromCoasterQueues(visitor.id)
        visitor.targetId = null
        visitor.route = []
        this.decideNextAction(visitor)
      } else if (
        this.state.parkOpen &&
        !visitor.campsite &&
        visitor.needs.energy <=
          SIMULATION_CONFIG.visitors.decisions.exhaustedEnergy &&
        visitor.state !== 'riding' &&
        visitor.state !== 'leaving' &&
        visitor.state !== 'bench-resting' &&
        !this.visitorsAwaitingDecision.has(visitor.id)
      ) {
        this.removeVisitorFromCoasterQueues(visitor.id)
        visitor.targetId = null
        visitor.route = []
        this.decideNextAction(visitor)
      }
      visitor.movementBoostMinutes = Math.max(0, visitor.movementBoostMinutes - minutes)
      visitor.avoidanceMinutes = Math.max(0, visitor.avoidanceMinutes - minutes)
      if (visitor.avoidanceMinutes === 0) visitor.avoidedCoasterId = null

      if (visitor.state === 'camp-waiting') {
        visitor.campingWaitMinutes += minutes
        visitor.campingWaitRetryMinutes -= minutes
        visitor.motivation = Math.max(
          0,
          visitor.motivation -
            minutes *
              SIMULATION_CONFIG.camping.unplacedMotivationLossPerMinute,
        )
        visitor.emotion = 'sad'
        visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 20)
        if (visitor.campingWaitRetryMinutes <= 0) {
          visitor.campingWaitRetryMinutes =
            SIMULATION_CONFIG.camping.unplacedRetryIntervalMinutes
          if (this.camping.assignCampsite(visitor)) {
            visitor.thought =
              'Endlich ist ein Campingplatz frei geworden!'
            return
          }
        }
        if (
          visitor.campingWaitMinutes >=
          SIMULATION_CONFIG.camping.unplacedWaitMaximumMinutes
        ) {
          this.refundEntryFee(visitor)
          this.recordComplaint(visitor, 'no-campsite')
          this.beginVisitorDeparture(visitor)
          visitor.thought =
            'Ich habe einen Tag vergeblich gewartet. Ich verlange mein Geld zurück!'
          return
        }
        visitor.thought = `Ich warte seit ${Math.floor(visitor.campingWaitMinutes / 60)} Stunden auf einen Campingplatz.`
        return
      }

      if (visitor.state === 'camping' && visitor.route.length === 0) {
        if (visitor.campingPhase === 'seeking' || visitor.campingPhase === 'returning') {
          this.visitorsAwaitingDecision.delete(visitor.id)
          this.arriveOrDecide(visitor)
        }
        if (
          visitor.campingPhase === 'packing' &&
          visitor.interactionRemaining <= 0
        ) {
          visitor.interactionRemaining =
            SIMULATION_CONFIG.camping.tentPackMinutes
          visitor.thought = 'Ich packe Zelt und Campingsachen ein.'
        }
        if (
          (visitor.campingPhase === 'building' || visitor.campingPhase === 'packing') &&
          visitor.interactionRemaining > 0
        ) {
          visitor.interactionRemaining -= minutes
          if (visitor.interactionRemaining <= 0) {
            if (visitor.campingPhase === 'building') {
              visitor.campingPhase = 'ready'
              this.camping.createCampSetup(visitor)
              visitor.hasHandcart = false
              visitor.state = 'exploring'
              visitor.emotion = 'happy'
              visitor.emotionMinutes = 40
              visitor.thought = 'Mein Zelt steht – jetzt kann das Festival beginnen!'
              this.decideNextAction(visitor)
            } else {
              this.camping.removeVisitorInstallations(visitor.id)
              visitor.campsite = null
              visitor.campingPhase = 'none'
              visitor.hasHandcart = true
              if (this.rng.next() < SIMULATION_CONFIG.waste.tentPackLitterChance) {
                this.giveWaste(visitor, 1)
              }
              if (visitor.pendingWaste > 0 && visitor.route.length > 0) {
                visitor.thought =
                  'Vor dem Heimweg werfe ich den Zeltmüll noch in den Eimer.'
                return
              }
              visitor.state = 'leaving'
              visitor.thought = 'Alles eingepackt. Zeit für den Heimweg.'
              visitor.route = []
              this.ensureExitRoute(visitor)
            }
          }
          return
        }
        if (visitor.campingPhase === 'resting') {
          visitor.needs.energy = Math.min(
            100,
            visitor.needs.energy +
              minutes * SIMULATION_CONFIG.camping.restEnergyPerMinute,
          )
          if (
            visitor.needs.energy >=
              SIMULATION_CONFIG.camping.restCompleteEnergy &&
            !this.isVisitorSleepTime(visitor)
          ) {
            visitor.campingPhase = 'ready'
            visitor.state = 'exploring'
            visitor.thought = 'Im Zelt habe ich mich gut erholt.'
            this.decideNextAction(visitor)
          }
          return
        }
      }

      if (visitor.state === 'socializing' && visitor.route.length === 0) {
        visitor.interactionRemaining -= minutes
        this.consumeWhileStationary(visitor, minutes)
        if (visitor.pendingWaste > 0 && visitor.route.length > 0) return
        visitor.needs.fun = Math.min(
          100,
          visitor.needs.fun +
            minutes * SIMULATION_CONFIG.camping.socialFunPerMinute,
        )
        visitor.emotion = 'happy'
        visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 10)
        if (visitor.interactionRemaining <= 0) {
          visitor.state = 'exploring'
          visitor.campActivityTarget = null
          visitor.campActivity = 'standing'
          visitor.campActivityKind = null
          visitor.campActivitySlot = 0
          visitor.campActivityCapacity = 1
          visitor.thought = 'Das Treffen am Zeltplatz war schön.'
          this.decideNextAction(visitor)
        }
        return
      }

      if (visitor.state === 'partying' && visitor.route.length === 0) {
        const atmosphere = SIMULATION_CONFIG.atmosphere
        visitor.interactionRemaining -= minutes
        const consumed = this.consumeWhileStationary(visitor, minutes)
        if (visitor.pendingWaste > 0 && visitor.route.length > 0) return
        visitor.isDancing =
          visitor.localPartyMood >= atmosphere.danceMoodThreshold &&
          visitor.partyPreference >= atmosphere.dancePreferenceThreshold
        visitor.needs.fun = Math.min(
          100,
          visitor.needs.fun + minutes * (atmosphere.partyFunPerMinute +
            (visitor.isDancing ? atmosphere.dancingFunBonusPerMinute : 0)),
        )
        visitor.needs.energy = Math.max(
          0,
          visitor.needs.energy -
            minutes * atmosphere.partyEnergyCostPerMinute,
        )
        visitor.emotion = 'excited'
        visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 10)
        if (!consumed) {
          visitor.thought = visitor.isDancing
            ? 'Die Stimmung ist großartig – ich tanze!'
            : 'Ich genieße die Musik und die Atmosphäre.'
        }
        if (
          visitor.interactionRemaining <= 0 ||
          (visitor.concertId&&!this.availableConcerts().some(show=>show.booking.id===visitor.concertId)) ||
          (visitor.localPartyMood < atmosphere.partyDestinationMinimumMood * 0.5 &&
            !activeBookings(this.state).some(b => b.id === visitor.concertId && !showIssue(this.state, b))) ||
          visitor.needs.energy <
            SIMULATION_CONFIG.visitors.decisions.lowEnergy
        ) {
          this.clearVisitorActivity(visitor)
          visitor.state = 'exploring'
          this.decideNextAction(visitor)
        }
        return
      }

      if (visitor.state === 'bench-resting' && visitor.route.length === 0) {
        visitor.interactionRemaining -= minutes
        const consumed = this.consumeWhileStationary(visitor, minutes)
        if (visitor.pendingWaste > 0 && visitor.route.length > 0) return
        visitor.needs.energy = Math.min(
          100,
          visitor.needs.energy +
            minutes *
              SIMULATION_CONFIG.atmosphere.benchRestEnergyPerMinute,
        )
        visitor.emotion = 'happy'
        visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 10)
        if (!consumed) {
          visitor.thought = 'Auf der Bank kann ich mich kurz erholen.'
        }
        if (visitor.interactionRemaining <= 0) {
          this.clearVisitorActivity(visitor)
          visitor.state = 'exploring'
          this.decideNextAction(visitor)
        }
        return
      }

      if (visitor.state === 'relaxing' && visitor.route.length === 0) {
        const atmosphere = SIMULATION_CONFIG.atmosphere
        visitor.interactionRemaining -= minutes
        const consumed = this.consumeWhileStationary(visitor, minutes)
        if (visitor.pendingWaste > 0 && visitor.route.length > 0) return
        visitor.needs.fun = Math.min(
          100,
          visitor.needs.fun +
            minutes *
              (atmosphere.leisureFunPerMinute +
                (visitor.isConversing
                  ? atmosphere.conversationFunPerMinute
                  : 0)),
        )
        visitor.emotion = visitor.isConversing ? 'happy' : 'neutral'
        visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 8)
        if (!consumed) {
          visitor.thought = visitor.isConversing
            ? 'Hier gefällt es mir – wir unterhalten uns.'
            : 'Hier ist es schön. Ich bleibe eine Weile.'
        }
        if (
          visitor.interactionRemaining <= 0 ||
          visitor.needs.energy <
            SIMULATION_CONFIG.visitors.decisions.lowEnergy
        ) {
          this.clearVisitorActivity(visitor)
          visitor.state = 'exploring'
          this.decideNextAction(visitor)
        }
        return
      }

      if (visitor.state === 'security-check') {
        visitor.interactionRemaining -= minutes
        if (visitor.interactionRemaining <= 0) {
          visitor.state = visitor.securityResumeState ?? 'exploring'
          visitor.securityResumeState = null
          if (visitor.route.length === 0) this.arriveOrDecide(visitor)
        }
        return
      }

      if (visitor.state === 'vomiting') {
        visitor.interactionRemaining -= minutes
        if (visitor.interactionRemaining <= 0) {
          visitor.state = 'exploring'
          this.decideNextAction(visitor)
        }
        return
      }

      if (visitor.state === 'using') {
        const facility = visitor.targetId ? this.state.buildings.find(b => b.id === visitor.targetId) : null
        visitor.interactionRemaining -= minutes * (facility ? buildingEfficiency(this.state, facility.x, facility.z) : 1)
        if (visitor.interactionRemaining <= 0) this.finishInteraction(visitor)
        return
      }
      if (visitor.state === 'bus-waiting') {
        visitor.busWaitMinutes += minutes
        if (
          visitor.busWaitMinutes >=
          SIMULATION_CONFIG.logistics.busMaximumWaitMinutes
        ) {
          this.recordComplaint(visitor, 'bus-wait')
          visitor.emotion = 'angry'
          visitor.thought = 'Ich warte schon viel zu lange auf den Bus.'
        }
        if (visitor.route.length === 0) return
      }
      if (
        visitor.state === 'queuing' ||
        visitor.state === 'riding' ||
        visitor.state === 'bus-riding' ||
        visitor.state === 'vehicle-arrival' ||
        visitor.state === 'injured'
      ) {
        return
      }

      if (visitor.route.length > 0) return
      if (
        visitor.state === 'leaving' &&
        this.tryBoardDepartureCar(visitor)
      ) {
        return
      }
      if (
        (visitor.state === 'leaving' || visitor.isPanicking || visitor.state === 'panicking') &&
        this.isAtParkExit(visitor)
      ) {
        leavingIds.add(visitor.id)
      } else if (visitor.targetId) {
        this.arriveOrDecide(visitor)
      } else {
        this.queueVisitorDecision(visitor)
      }
    })

    if (leavingIds.size > 0) {
      this.state.visitors.forEach((visitor) => {
        if (leavingIds.has(visitor.id)) this.leaveVisitorCampBehind(visitor)
      })
      this.state.visitors = this.state.visitors.filter((visitor) => !leavingIds.has(visitor.id))
      this.indexedVisitorCount = -1
      this.state.guests = this.state.visitors.length
    }
  }

  private updateCoasters(minutes: number, physicsSeconds: number): void {
    this.state.coasters.forEach((coaster) => {
      this.scrubCoasterQueue(coaster)
      const train = coaster.train
      const canRun =
        coaster.closed &&
        (coaster.operationMode === 'test' ||
          (coaster.operationMode === 'open' &&
            Boolean(coaster.entrance) &&
            Boolean(coaster.exit)))
      if (!canRun) {
        if (
          coaster.queue.length > 0 ||
          train.passengerIds.length > 0 ||
          train.state !== 'boarding' ||
          train.distance !== 0
        ) {
          this.recallCoasterTrainInternal(coaster)
        }
        this.positionTrain(coaster)
        return
      }

      if (coaster.operationMode === 'test') {
        if (train.state === 'boarding') {
          coaster.telemetry.measuring = false
          train.state = 'running'
          train.distance = 0
          train.progress = 0
          train.speed = COASTER_TYPES[coaster.typeId].physics.stationLaunchSpeed
        } else if (train.state === 'unloading') {
          train.state = 'boarding'
        } else {
          this.integrateTrainPhysics(coaster, physicsSeconds)
        }
        this.positionTrain(coaster)
        return
      }

      if (
        !this.isOfferCurrentlyActive('rides') &&
        train.state === 'boarding'
      ) {
        if (train.passengerIds.length === 0) {
          this.positionTrain(coaster)
          return
        }
        coaster.telemetry.measuring = false
        train.state = 'running'
        train.progress = 0
        train.distance = 0
        train.speed =
          COASTER_TYPES[coaster.typeId].physics.stationLaunchSpeed
      }

      this.positionCoasterQueue(coaster, minutes)

      if (train.state === 'boarding') {
        const frontVisitor = this.getVisitor(coaster.queue[0] ?? '')
        const frontQueueCell = this.getCoasterQueueCells(coaster)[0]
        const frontIsReady =
          frontVisitor?.state === 'queuing' &&
          frontQueueCell?.x === frontVisitor.cellX &&
          frontQueueCell?.z === frontVisitor.cellZ &&
          frontQueueCell?.elevation === frontVisitor.cellElevation
        train.boardingProgress =
          frontIsReady ? train.boardingProgress + minutes : 0
        while (
          train.boardingProgress >= BOARDING_MINUTES_PER_PERSON &&
          train.passengerIds.length < train.capacity
        ) {
          const visitorId = coaster.queue[0]
          const visitor = visitorId ? this.getVisitor(visitorId) : undefined
          if (
            !visitorId ||
            visitor?.state !== 'queuing' ||
            visitor.cellX !== frontQueueCell?.x ||
            visitor.cellZ !== frontQueueCell?.z ||
            visitor.cellElevation !== frontQueueCell?.elevation
          ) {
            break
          }
          coaster.queue.shift()
          train.boardingProgress -= BOARDING_MINUTES_PER_PERSON
          const paymentPosition = coaster.entrance ?? {
            x: coaster.pieces[0]?.start.x ?? 0,
            y: coaster.pieces[0]?.start.elevation ?? 0,
            z: coaster.pieces[0]?.start.z ?? 0,
          }
          const paid = this.chargeVisitor(visitor, coaster.ticketPrice, {
            x: paymentPosition.x + 0.5,
            y: paymentPosition.y + 0.85,
            z: paymentPosition.z + 0.5,
          })
          if (!paid) {
            visitor.state = 'exploring'
            visitor.targetId = null
            visitor.avoidedCoasterId = coaster.id
            visitor.avoidanceMinutes =
              SIMULATION_CONFIG.coasters.paymentAvoidanceMinutes
            visitor.emotion = 'sad'
            visitor.emotionMinutes = 45
            visitor.thought = 'Dafür reicht mein Budget nicht.'
            continue
          }
          train.passengerIds.push(visitor.id)
          train.passengers = train.passengerIds.length
          visitor.state = 'riding'
          visitor.thought = `Ich fahre mit ${coaster.name}!`
        }
        train.waitMinutes = train.passengers > 0 ? train.waitMinutes + minutes : 0
        const full = train.passengers >= train.capacity
        const timed = train.waitMinutes >= coaster.settings.dispatchIntervalMinutes
        const shouldDispatch =
          coaster.settings.dispatchMode === 'full-only'
            ? full
            : coaster.settings.dispatchMode === 'timed'
              ? timed
              : full || timed
        if (shouldDispatch && train.passengers > 0) {
          coaster.telemetry.measuring = false
          train.state = 'running'
          train.progress = 0
          train.distance = 0
          train.speed = COASTER_TYPES[coaster.typeId].physics.stationLaunchSpeed
        }
      } else if (train.state === 'unloading') {
        train.boardingProgress += minutes
        while (
          train.boardingProgress >= BOARDING_MINUTES_PER_PERSON &&
          train.passengerIds.length > 0
        ) {
          train.boardingProgress -= BOARDING_MINUTES_PER_PERSON
          const visitorId = train.passengerIds.shift()
          if (!visitorId) continue
          const visitor = this.getVisitor(visitorId)
          if (visitor) this.releaseCoasterPassenger(coaster, visitor)
          train.passengers = train.passengerIds.length
        }
        if (train.passengerIds.length === 0) {
          train.state = 'boarding'
          train.waitMinutes = 0
          train.boardingProgress = 0
        }
      } else {
        this.integrateTrainPhysics(coaster, physicsSeconds)
      }
      this.positionTrain(coaster)
    })
  }

  private positionCoasterQueue(coaster: Coaster, minutes: number): void {
    if (!coaster.entrance || coaster.queue.length === 0) return
    const directions = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ]
    const queueCells = this.getCoasterQueueCells(coaster)

    coaster.queue.forEach((visitorId, index) => {
      const visitor = this.getVisitor(visitorId)
      if (!visitor || visitor.state !== 'queuing') return
      const precedingVisitorIds = coaster.queue.slice(0, index)
      if (
        precedingVisitorIds.some(
          (precedingId) => this.getVisitor(precedingId)?.state === 'seeking',
        )
      ) {
        return
      }
      const desiredCellIndex = Math.min(
        queueCells.length - 1,
        Math.floor(index / 2),
      )
      const currentCellIndex = queueCells.findIndex(
        (cell) =>
          cell.x === visitor.cellX &&
          cell.z === visitor.cellZ &&
          cell.elevation === visitor.cellElevation,
      )
      const targetCellIndex =
        currentCellIndex > desiredCellIndex ? currentCellIndex - 1 : desiredCellIndex
      const cell = queueCells[targetCellIndex]
      if (!cell) return
      const path = this.getPathAt(cell.x, cell.z, cell.elevation)
      const direction = directions[path?.queueDirection ?? 0] ?? directions[0]!
      const side = { x: -direction.z, z: direction.x }
      const atAssignedRow = targetCellIndex === desiredCellIndex
      const queueSlotOffset = SIMULATION_CONFIG.coasters.queueSlotOffset
      const slotOffset = atAssignedRow
        ? index % 2 === 0
          ? -queueSlotOffset
          : queueSlotOffset
        : 0
      const targetX = cell.x + 0.5 + side.x * slotOffset
      const targetZ = cell.z + 0.5 + side.z * slotOffset
      const deltaX = targetX - visitor.x
      const deltaZ = targetZ - visitor.z
      const distance = Math.hypot(deltaX, deltaZ)
      const movement =
        minutes * SIMULATION_CONFIG.coasters.queueMovementPerMinute
      visitor.facing = Math.atan2(deltaX || direction.x, deltaZ || direction.z)
      if (distance <= movement || distance < 0.001) {
        visitor.x = targetX
        visitor.y = this.getPathSurfaceElevation(path)
        visitor.z = targetZ
        visitor.cellX = cell.x
        visitor.cellZ = cell.z
        visitor.cellElevation = cell.elevation
      } else {
        visitor.x += (deltaX / distance) * movement
        visitor.y +=
          (this.getPathSurfaceElevation(path) - visitor.y) * (movement / distance)
        visitor.z += (deltaZ / distance) * movement
      }
    })
  }

  private getCoasterQueueCells(coaster: Coaster): Cell[] {
    if (!coaster.entrance) return []
    const fronts = this.getAccessPathNeighbors(coaster.entrance).filter((cell) => {
      const path = this.getPathAt(cell.x, cell.z, cell.elevation)
      const directionToEntrance = this.getDirectionIndex(
        coaster.entrance!.x - cell.x,
        coaster.entrance!.z - cell.z,
      )
      return path?.pathType === 'queue' && path.queueDirection === directionToEntrance
    })
    if (fronts.length === 0) return []
    const queueCells: Cell[] = []
    const visited = new Set<string>()
    const pending = [...fronts]
    while (pending.length > 0) {
      const current = pending.shift()
      if (!current) continue
      const key = this.cellKey(current.x, current.z, current.elevation)
      if (visited.has(key)) continue
      visited.add(key)
      queueCells.push(current)
      const currentPath = this.getPathAt(current.x, current.z, current.elevation)
      if (!currentPath) continue
      this.getAdjacentQueuePaths(currentPath).forEach((candidate) => {
        const directionToCurrent = this.getDirectionIndex(
          currentPath.x - candidate.x,
          currentPath.z - candidate.z,
        )
        if (candidate.queueDirection !== directionToCurrent) return
        pending.push({
          x: candidate.x,
          z: candidate.z,
          elevation: candidate.elevation,
        })
      })
    }
    return queueCells
  }

  private integrateTrainPhysics(coaster: Coaster, elapsedSeconds: number): void {
    const train = coaster.train
    const physics = COASTER_TYPES[coaster.typeId].physics
    const tuning = SIMULATION_CONFIG.coasters.physicsSimulation
    const steps = Math.max(
      1,
      Math.ceil(elapsedSeconds / tuning.integrationStepSeconds),
    )
    const deltaSeconds = elapsedSeconds / steps

    for (let step = 0; step < steps && train.state === 'running'; step += 1) {
      const sample = sampleCoasterTrack(coaster, train.distance)
      if (!sample) return
      const carSamples = Array.from({ length: train.cars }, (_, index) =>
        sampleCoasterTrack(coaster, train.distance + index * physics.carSpacing),
      ).filter((carSample) => carSample !== null)
      const averageSlope =
        carSamples.reduce((total, carSample) => total + carSample.tangent.y, 0) /
        Math.max(1, carSamples.length)
      const chainEngaged = carSamples.some(
        (carSample) => carSample.chainLift && carSample.tangent.y > 0,
      )
      const stationDriveEngaged = carSamples.some((carSample) => carSample.stationDrive)
      const mass =
        train.cars * physics.carMassKg + train.passengers * physics.passengerMassKg
      const slopeCosine = Math.sqrt(Math.max(0, 1 - averageSlope ** 2))
      const gravityAcceleration = -tuning.gravity * averageSlope
      const direction = Math.abs(train.speed) < 0.01 ? 1 : Math.sign(train.speed)
      const rollingAcceleration =
        -direction * physics.rollingResistance * tuning.gravity * slopeCosine
      const aerodynamicAcceleration =
        -direction *
        (0.5 * tuning.airDensity * physics.dragArea * train.speed ** 2) /
        mass
      let acceleration =
        gravityAcceleration + rollingAcceleration + aerodynamicAcceleration
      const remainingMeters =
        (sample.totalLength - train.distance) * physics.worldUnitMeters

      if (chainEngaged) {
        if (train.speed < 0) train.speed = 0
        if (train.speed <= physics.chainSpeed) {
          acceleration = Math.max(
            0,
            (physics.chainSpeed - train.speed) *
              tuning.chainAccelerationFactor,
          )
        }
      }

      if (stationDriveEngaged) {
        if (train.speed < 0) train.speed = 0
        const approachDistance =
          train.cars * physics.carSpacing * physics.worldUnitMeters +
          tuning.stationApproachBufferMeters
        const brakingDistance =
          (train.speed * train.speed) /
            (2 * tuning.stationBrakingDeceleration) +
          tuning.stationBrakingBufferMeters
        const targetSpeed =
          remainingMeters <= Math.max(approachDistance, brakingDistance)
            ? Math.min(
                physics.stationDriveSpeed,
                Math.sqrt(
                  Math.max(
                    0,
                    2 * tuning.stationBrakingDeceleration * remainingMeters,
                  ),
                ),
              )
            : physics.stationLaunchSpeed
        acceleration = Math.max(
          -tuning.stationDriveAccelerationLimit,
          Math.min(
            tuning.stationDriveAccelerationLimit,
            (targetSpeed - train.speed) * tuning.stationDriveResponse,
          ),
        )
      } else if (
        remainingMeters < tuning.endBrakeDistanceMeters &&
        train.speed > 0
      ) {
        const safeSpeed = Math.sqrt(
          Math.max(0, 2 * tuning.endBrakeDeceleration * remainingMeters),
        )
        if (train.speed > safeSpeed) {
          acceleration -= tuning.endBrakeDeceleration
        }
      }

      if (!coaster.telemetry.measuring && !stationDriveEngaged) {
        coaster.telemetry.measuring = true
      }
      if (coaster.telemetry.measuring) {
        this.recordCoasterTelemetry(coaster, sample, acceleration, deltaSeconds)
      }
      train.speed = Math.max(
        tuning.minimumSpeed,
        Math.min(
          tuning.maximumSpeed,
          train.speed + acceleration * deltaSeconds,
        ),
      )
      train.distance += (train.speed / physics.worldUnitMeters) * deltaSeconds

      if (
        train.distance >= sample.totalLength &&
        stationDriveEngaged &&
        Math.abs(train.speed) >= tuning.stationStopSpeed
      ) {
        train.distance =
          sample.totalLength - tuning.stationOvershootDistance
        train.speed *= tuning.stationOvershootDamping
      } else if (
        train.distance >= sample.totalLength ||
        (stationDriveEngaged &&
          remainingMeters < tuning.stationStopDistanceMeters &&
          Math.abs(train.speed) < tuning.stationStopSpeed)
      ) {
        this.finishTrainRide(coaster, true)
      } else if (train.distance < 0) {
        this.finishTrainRide(coaster, false)
      } else {
        train.progress = train.distance / sample.totalLength
      }
    }
  }

  private scrubCoasterQueue(coaster: Coaster): void {
    const seen = new Set<string>()
    coaster.queue = coaster.queue.filter((visitorId) => {
      if (seen.has(visitorId)) return false
      const visitor = this.getVisitor(visitorId)
      const valid =
        visitor?.targetId === coaster.id &&
        (visitor.state === 'seeking' ||
          visitor.state === 'queuing' ||
          visitor.state === 'security-check')
      if (!valid) return false
      seen.add(visitorId)
      return true
    })
  }

  private recordCoasterTelemetry(
    coaster: Coaster,
    sample: TrackSample,
    longitudinalAcceleration: number,
    elapsedSeconds: number,
  ): void {
    const telemetry = coaster.telemetry
    const physics = COASTER_TYPES[coaster.typeId].physics
    const train = coaster.train
    const smoothingDistance = 0.35
    const before = sampleCoasterTrack(coaster, train.distance - smoothingDistance)
    const after = sampleCoasterTrack(coaster, train.distance + smoothingDistance)
    if (!before || !after) return

    const forward = sample.tangent
    const right = sample.right
    const up = sample.up
    const curvatureScale =
      (train.speed * train.speed) /
      (2 * smoothingDistance * physics.worldUnitMeters)
    const acceleration = {
      x:
        forward.x * longitudinalAcceleration +
        (after.tangent.x - before.tangent.x) * curvatureScale,
      y:
        forward.y * longitudinalAcceleration +
        (after.tangent.y - before.tangent.y) * curvatureScale,
      z:
        forward.z * longitudinalAcceleration +
        (after.tangent.z - before.tangent.z) * curvatureScale,
    }
    const properAcceleration = {
      x: acceleration.x,
      y: acceleration.y + 9.81,
      z: acceleration.z,
    }
    const verticalG = this.clampForce(this.dotVector(properAcceleration, up) / 9.81)
    const lateralG = this.clampForce(this.dotVector(properAcceleration, right) / 9.81)
    const longitudinalG = this.clampForce(
      this.dotVector(properAcceleration, forward) / 9.81,
    )
    const speedKmh = Math.abs(train.speed) * 3.6

    telemetry.durationSeconds += elapsedSeconds
    telemetry.cumulativeDistanceMeters += Math.abs(train.speed) * elapsedSeconds
    if (verticalG < 0.2) telemetry.airtimeSeconds += elapsedSeconds
    telemetry.maxSpeedKmh = Math.max(telemetry.maxSpeedKmh, speedKmh)
    telemetry.minVerticalG = Math.min(telemetry.minVerticalG, verticalG)
    telemetry.maxVerticalG = Math.max(telemetry.maxVerticalG, verticalG)
    telemetry.maxAbsLateralG = Math.max(
      telemetry.maxAbsLateralG,
      Math.abs(lateralG),
    )
    telemetry.maxAbsLongitudinalG = Math.max(
      telemetry.maxAbsLongitudinalG,
      Math.abs(longitudinalG),
    )

    const distance = train.distance * physics.worldUnitMeters
    const existingSampleIndex = telemetry.samples.findIndex(
      (existing) => Math.abs(existing.distance - distance) < 0.3,
    )
    if (existingSampleIndex >= 0) {
      const existing = telemetry.samples[existingSampleIndex]
      if (existing) {
        telemetry.samples[existingSampleIndex] = {
          distance,
          speedKmh: existing.speedKmh * 0.7 + speedKmh * 0.3,
          verticalG: existing.verticalG * 0.7 + verticalG * 0.3,
          lateralG: existing.lateralG * 0.7 + lateralG * 0.3,
          longitudinalG: existing.longitudinalG * 0.7 + longitudinalG * 0.3,
        }
      }
    } else {
      telemetry.samples.push({
        distance,
        speedKmh,
        verticalG,
        lateralG,
        longitudinalG,
      })
      telemetry.samples.sort((left, right) => left.distance - right.distance)
      if (telemetry.samples.length > 600) {
        telemetry.samples = telemetry.samples.filter((_, index) => index % 2 === 0)
      }
    }
  }

  private dotVector(
    left: { x: number; y: number; z: number },
    right: { x: number; y: number; z: number },
  ): number {
    return left.x * right.x + left.y * right.y + left.z * right.z
  }

  private clampForce(value: number): number {
    return Math.max(-8, Math.min(8, value))
  }

  private finishTrainRide(coaster: Coaster, _completed: boolean): void {
    const train = coaster.train
    if (_completed) coaster.telemetry.completedRuns += 1
    coaster.telemetry.measuring = false
    train.state = 'unloading'
    train.waitMinutes = 0
    train.boardingProgress = 0
    train.progress = 0
    train.distance = 0
    train.speed = 0
  }

  private recallCoasterTrainInternal(coaster: Coaster): void {
    coaster.telemetry.measuring = false
    coaster.queue.forEach((visitorId) => {
      const visitor = this.getVisitor(visitorId)
      if (!visitor) return
      visitor.state = 'exploring'
      visitor.targetId = null
      visitor.avoidedCoasterId = coaster.id
      visitor.avoidanceMinutes =
        SIMULATION_CONFIG.coasters.recallAvoidanceMinutes
      visitor.thought = 'Die Achterbahn ist derzeit nicht verfügbar.'
    })
    coaster.queue = []

    coaster.train.passengerIds.forEach((visitorId) => {
      const visitor = this.getVisitor(visitorId)
      if (!visitor) return
      if (coaster.exit) {
        this.releaseCoasterPassenger(coaster, visitor)
      } else {
        visitor.state = 'exploring'
        visitor.targetId = null
        visitor.thought = 'Die Fahrt wurde sicher beendet.'
      }
    })
    coaster.train.passengerIds = []
    coaster.train.passengers = 0
    coaster.train.state = 'boarding'
    coaster.train.waitMinutes = 0
    coaster.train.boardingProgress = 0
    coaster.train.progress = 0
    coaster.train.distance = 0
    coaster.train.speed = 0
    this.positionTrain(coaster)
  }

  private releaseCoasterPassenger(coaster: Coaster, visitor: Visitor): void {
    const exit = coaster.exit
    if (!exit) return
    const nextPath =
      this.getAccessPathNeighbors(exit).find(
        (cell) => this.getPathAt(cell.x, cell.z, cell.elevation)?.pathType !== 'queue',
      ) ?? this.getEntrance()
    visitor.x = exit.x + 0.5
    visitor.y = exit.y
    visitor.z = exit.z + 0.5
    visitor.cellX = Math.round(exit.x)
    visitor.cellZ = Math.round(exit.z)
    visitor.cellElevation = exit.y
    visitor.route = [nextPath]
    visitor.targetId = null
    visitor.state = 'exiting'
    visitor.needs.fun = 100
    visitor.needs.energy = Math.max(
      0,
      visitor.needs.energy - SIMULATION_CONFIG.coasters.rideEnergyCost,
    )
    this.incidents.addRideNausea(
      visitor,
      SIMULATION_CONFIG.nausea.coasterIntensity,
    )
    visitor.emotion = 'excited'
    visitor.emotionMinutes = 90
    visitor.thought = `${coaster.name} war großartig!`
  }

  private positionTrain(coaster: Coaster): void {
    const sample = sampleCoasterTrack(coaster, coaster.train.distance)
    if (!sample) return
    coaster.train.x = sample.point.x
    coaster.train.y = sample.point.y
    coaster.train.z = sample.point.z
    coaster.train.progress =
      sample.totalLength === 0 ? 0 : coaster.train.distance / sample.totalLength
  }

  private visitorTravelSpeed(visitor: Visitor): number {
    const movement = SIMULATION_CONFIG.visitors.movement
    const emotionSpeed =
      visitor.emotion === 'angry'
        ? movement.angryMultiplier
        : visitor.emotion === 'sad'
          ? movement.sadMultiplier
          : visitor.emotion === 'excited'
            ? movement.excitedMultiplier
            : visitor.emotion === 'happy'
              ? movement.happyMultiplier
              : 1
    const speedMultiplier =
      movement.baseMultiplier *
      (visitor.streakingMinutes > 0
        ? SIMULATION_CONFIG.alcohol.streaking.speedMultiplier
        : (visitor.movementBoostMinutes > 0 ? movement.boostMultiplier : 1) *
          emotionSpeed *
          (visitor.alcoholLevel >= movement.veryDrunkThreshold
            ? movement.veryDrunkMultiplier
            : visitor.alcoholLevel >= movement.moderatelyDrunkThreshold
              ? movement.moderatelyDrunkMultiplier
              : 1)) *
      (this.isMudTerrain(visitor.cellX, visitor.cellZ)
        ? SIMULATION_CONFIG.terrain.mudMoveMultiplier
        : 1)
    const ground = wayInfo(this.state, visitor.cellX, visitor.cellZ, 'foot', this.getPathAt(visitor.cellX, visitor.cellZ, visitor.cellElevation)?.wayType)
    const surface = visitor.cellElevation > this.getTerrainHeight(visitor.cellX, visitor.cellZ) ? 1 : ground.speed
    const crowdSlowdown = visitor.isPanicking
      ? 1 + Math.max(0, visitor.crowding - 50) / 90
      : 1 + Math.max(0, visitor.crowding - 35) / 55
    return visitor.walkSpeed * speedMultiplier * (visitor.isPanicking ? SIMULATION_CONFIG.crowding.panicFleeBoost : 1) * surface / crowdSlowdown
  }

  private groundWetBucket = -1
  private movementOccupancy = new Map<number, number>()
  private pedestrianCongestionCosts = new Map<number, number>()

  private refreshPedestrianCongestion(): void {
    const costs = new Map<number, number>()
    const visited = new Set<number>()
    const consider = (x: number, z: number, elevation: number): void => {
      const key = this.packCell({ x, z, elevation })
      if (visited.has(key)) return
      visited.add(key)
      const count = this.movementOccupancy.get(key) ?? 0
      const capacity = wayInfo(this.state, x, z, 'foot', this.getPathAt(x, z, elevation)?.wayType).capacity
      const density = count / capacity
      const penalty = Math.min(24, Math.floor(7 * Math.pow(Math.max(0, density - 0.5) * 2, 2)))
      if (penalty > 0) costs.set(key, penalty)
    }
    for (const visitor of this.state.visitors) {
      consider(visitor.cellX, visitor.cellZ, visitor.cellElevation)
    }
    for (const route of this.state.festival.infrastructure.routes) {
      consider(route.position.x, route.position.z, route.position.elevation)
    }
    if (costs.size !== this.pedestrianCongestionCosts.size ||
      [...costs].some(([key, value]) => this.pedestrianCongestionCosts.get(key) !== value)) {
      this.pedestrianCongestionCosts = costs
      // Congestion actually changed: cached routes may no longer reflect it, so
      // invalidate immediately instead of waiting out their gradual expiry.
      this.pedestrianPathCache.clear()
    }
  }
  /** Keep the current segment and destination; only reconsider the journey between them.
   * The tick-based schedule survives saves and bounds searches even in large crowds. */
  private reviewVisitorRoutes(): void {
    const visitors = this.state.visitors
    const period = Math.max(100, Math.ceil(visitors.length / 4))
    const first = (this.state.simTick % period) * 4
    for (let index = first; index < Math.min(first + 4, visitors.length); index++) {
      const visitor = visitors[index]!
      if (visitor.route.length < 3 || ['security-check', 'vomiting', 'using', 'queuing', 'riding', 'bus-riding', 'vehicle-arrival', 'injured'].includes(visitor.state)) continue
      const next = visitor.route[0]!
      const goal = visitor.route.at(-1)!
      const atCellCenter = Math.hypot(visitor.x - visitor.cellX - visitor.tileOffsetX, visitor.z - visitor.cellZ - visitor.tileOffsetZ) < 0.001
      const start = atCellCenter ? { x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation } : next
      this.ensurePedestrianNav(this.lastNavRevision !== this.worldRevision)
      let access = 0, allowQueue = false
      for (const cell of visitor.route) {
        access |= this.pedestrianNav.get(this.packCell(cell))?.flags ?? 0
        if (!allowQueue) allowQueue = this.getPathAt(cell.x, cell.z, cell.elevation)?.pathType === 'queue'
      }
      // Reuse indexed navigation flags rather than searching every area four times per route.
      const route = this.findPath(start, [goal],
        allowQueue,
        Boolean(access & NAV_CAMPING),
        Boolean(access & NAV_MEDICAL),
        false,
        Boolean(access & NAV_FORECOURT),
        512,
      )
      if (route) visitor.route = atCellCenter ? route : [{ ...next }, ...route]
    }
  }

  private walkVisitors(minutes: number): void {
    if (minutes <= 0) return
    this.movementOccupancy.clear()
    for (const v of this.state.visitors) {
      if (['riding', 'bus-riding', 'vehicle-arrival'].includes(v.state)) continue
      const key = this.packCell({ x: v.cellX, z: v.cellZ, elevation: v.cellElevation })
      this.movementOccupancy.set(key, (this.movementOccupancy.get(key) ?? 0) + 1)
    }
    for (const route of this.state.festival.infrastructure.routes) {
      if (route.phase === 'idle' && !route.path.length) continue
      const key = this.packCell(route.position)
      this.movementOccupancy.set(key, (this.movementOccupancy.get(key) ?? 0) + (route.cargo > 0 ? 3 : 2))
    }
    // Occupancy for movement stays live; route costs update once per simulated second.
    // Keep the shared A* cache useful between updates instead of flushing every step.
    if (this.state.simTick % 10 === 0) this.refreshPedestrianCongestion()
    this.reviewVisitorRoutes()
    this.state.visitors.forEach((visitor) => {
      if (
        visitor.state === 'security-check' ||
        visitor.state === 'vomiting' ||
        visitor.state === 'using' ||
        visitor.state === 'queuing' ||
        visitor.state === 'riding' ||
        visitor.state === 'bus-riding' ||
        visitor.state === 'vehicle-arrival' ||
        visitor.state === 'injured'
      ) {
        return
      }
      if (visitor.route.length === 0) return
      this.moveVisitor(
        visitor,
        minutes * this.visitorTravelSpeed(visitor),
        false,
      )
    })
  }

  private moveVisitor(
    visitor: Visitor,
    distance: number,
    decideOnArrival = true,
  ): void {
    while (distance > 0 && visitor.route.length > 0) {
      const next = visitor.route[0]
      const nextKey = this.packCell(next)
      const oldKey = this.packCell({ x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation })
      const capacity = wayInfo(this.state, next.x, next.z, 'foot', this.getPathAt(next.x, next.z, next.elevation)?.wayType).capacity
      const density = Math.max(0, (this.movementOccupancy.get(nextKey) ?? 0) - (nextKey === oldKey ? 1 : 0)) / capacity
      // Destination occupancy controls flow: leaving a packed tile for a free one must stay easy.
      // At capacity retain 12.5% speed, and at least 4% even in extreme crowds.
      const crowdSpeed = Math.max(0.04, 1 / (1 + 7 * Math.pow(Math.max(0, density - 0.5) * 2, 2)))
      if (density >= 1) visitor.thought = 'Hier ist es eng – ich komme nur langsam voran.'
      const nextPath = this.getPathAt(next.x, next.z, next.elevation)
      const nextCampingCell = this.getCampingCellAt(next.x, next.z)
      const nextMedicalCell = this.getMedicalCellAt(next.x, next.z)
      const nextFestivalCell = this.getStageForecourtCellAt(next.x, next.z)
      const currentCell = {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
      }
      if (
        nextPath?.staffOnly ||
        !this.isInWorld(next.x, next.z) ||
        this.isPedestrianSolidAt(next.x, next.z, next.elevation) ||
        this.isPedestrianEdgeBlocked(currentCell, next)
      ) {
        this.removeVisitorFromCoasterQueues(visitor.id)
        visitor.route = []
        visitor.targetId = null
        visitor.state = 'exploring'
        visitor.thought = 'Der Weg ist versperrt.'
        return
      }

      const targetX = next.x + visitor.tileOffsetX
      const targetY = nextPath
        ? this.getPathSurfaceElevation(nextPath)
        : nextCampingCell?.elevation ??
          nextMedicalCell?.elevation ??
          nextFestivalCell?.elevation ??
          this.getTerrainHeight(next.x, next.z)
      const targetZ = next.z + visitor.tileOffsetZ
      const deltaX = targetX - visitor.x
      const deltaZ = targetZ - visitor.z
      const remaining = Math.hypot(deltaX, deltaZ)
      visitor.facing = Math.atan2(deltaX, deltaZ)

      if (remaining <= distance * crowdSpeed) {
        visitor.x = targetX
        visitor.y = targetY
        visitor.z = targetZ
        if (nextKey !== oldKey) {
          this.movementOccupancy.set(oldKey, Math.max(0, (this.movementOccupancy.get(oldKey) ?? 0) - 1))
          this.movementOccupancy.set(nextKey, (this.movementOccupancy.get(nextKey) ?? 0) + 1)
        }
        visitor.cellX = next.x
        visitor.cellZ = next.z
        visitor.cellElevation = next.elevation
        const atmosphereKey = this.cellKey(next.x, next.z, next.elevation)
        visitor.localAttractiveness =
          this.attractivenessValues.get(atmosphereKey) ?? 0
        visitor.localPartyMood =
          this.partyMoodValues.get(atmosphereKey) ?? 0
        visitor.route.shift()
        distance -= remaining / crowdSpeed
        this.applyCampWalkPenalty(visitor, remaining)
        const gate = this.getSecurityGateAt(next.x, next.z, next.elevation)
        if (!gate) visitor.securityGateId = null
        const staffed =
          gate &&
          this.state.staff.some(
            (member) =>
              member.role === 'security' && member.assignedBuildingId === gate.id,
          )
        if (gate && staffed && visitor.securityGateId !== gate.id) {
          const inspection = this.security.inspect(
            visitor.inventory,
            gate.securityConfig ?? DEFAULT_SECURITY_CONFIG,
            this.rng,
          )
          visitor.securityResumeState = visitor.state
          visitor.state = 'security-check'
          visitor.securityGateId = gate.id
          visitor.interactionRemaining = inspection.durationMinutes
          visitor.needs.fun = Math.max(0, visitor.needs.fun - inspection.funPenalty)
          visitor.motivation = Math.max(
            0,
            visitor.motivation - inspection.motivationPenalty,
          )
          visitor.emotion = inspection.confiscated.length > 0 ? 'angry' : 'sad'
          visitor.emotionMinutes = 35
          visitor.thought =
            inspection.confiscated.length > 0
              ? `Beschlagnahmt: ${inspection.confiscated.map((kind) => INVENTORY_ITEMS[kind].name).join(', ')}.`
              : 'Diese Kontrolle dauert ganz schön lange.'
          if (inspection.confiscated.length > 0) {
            this.recordComplaint(visitor, 'security-confiscation')
          }
          return
        }
      } else {
        distance *= crowdSpeed
        visitor.x += (deltaX / remaining) * distance
        visitor.y += (targetY - visitor.y) * (distance / remaining)
        visitor.z += (deltaZ / remaining) * distance
        this.applyCampWalkPenalty(visitor, distance)
        distance = 0
      }
    }

    if (visitor.route.length === 0 && decideOnArrival) {
      this.arriveOrDecide(visitor)
    }
  }

  private applyCampWalkPenalty(visitor: Visitor, distance: number): void {
    if (visitor.campingPhase !== 'returning' || visitor.needs.energy >= 35) {
      return
    }
    visitor.walkingToCampDistance += distance
    visitor.needs.fun = Math.max(
      0,
      visitor.needs.fun -
        distance *
          SIMULATION_CONFIG.logistics.longCampWalkFunLossPerTile,
    )
    if (
      visitor.walkingToCampDistance >=
      SIMULATION_CONFIG.logistics.longCampWalkComplaintTiles
    ) {
      this.recordComplaint(visitor, 'long-walk-to-camp')
    }
  }

  private arriveOrDecide(visitor: Visitor): void {
    if (this.visitorsAwaitingDecision.has(visitor.id)) return
    if (visitor.state === 'leaving' || visitor.isPanicking || visitor.state === 'panicking') return
    if (visitor.state === 'bus-waiting') {
      visitor.thought = 'Ich warte an der Haltestelle auf den Bus.'
      return
    }

    if (visitor.state === 'socializing') {
      visitor.thought = 'Wir sitzen zusammen, essen, trinken und unterhalten uns.'
      return
    }
    if (
      visitor.state === 'partying' ||
      visitor.state === 'bench-resting' ||
      visitor.state === 'relaxing'
    ) {
      return
    }

    if (visitor.campsite && visitor.state === 'camping') {
      if (visitor.campingPhase === 'seeking') {
        visitor.campingPhase = 'building'
        visitor.interactionRemaining =
          SIMULATION_CONFIG.camping.tentBuildMinutes
        visitor.thought = 'Ich baue mein Zelt auf.'
        return
      }
      if (visitor.campingPhase === 'returning') {
        visitor.campingPhase = 'resting'
        visitor.thought = 'Ich ruhe mich in meinem Zelt aus.'
        return
      }
      if (visitor.campingPhase === 'packing') {
        visitor.interactionRemaining =
          SIMULATION_CONFIG.camping.tentPackMinutes
        visitor.thought = 'Ich packe Zelt und Campingsachen ein.'
        return
      }
    }

    if (visitor.targetId) {
      const target = this.state.buildings.find((building) => building.id === visitor.targetId)
      if (target?.kind === 'wasteBin') {
        this.depositPendingWaste(visitor, target.id)
        visitor.targetId = null
        if (visitor.campingPhase === 'none' && visitor.hasHandcart) {
          visitor.state = 'leaving'
          visitor.route = []
          this.ensureExitRoute(visitor)
          return
        }
        visitor.state = 'exploring'
        this.decideNextAction(visitor)
        return
      }
      if (target) {
        if (!this.isBuildingCurrentlyActive(target)) {
          visitor.targetId = null
          visitor.state = 'exploring'
          visitor.thought = 'Dieses Angebot hat inzwischen geschlossen.'
          this.decideNextAction(visitor)
          return
        }
        visitor.state = 'using'
        const interaction = SIMULATION_CONFIG.needs.interactionMinutes
        visitor.interactionRemaining =
          target.kind === 'ride'
            ? interaction.ride
            : target.kind === 'alcohol'
              ? interaction.alcohol
              : target.kind === 'toilet'
                ? interaction.toilet
                : interaction.food
        visitor.thought = `Ich besuche ${BUILDINGS[target.kind].name}.`
        return
      }
      const coaster = this.getCoaster(visitor.targetId)
      if (
        coaster?.closed &&
        coaster.operationMode === 'open' &&
        this.isOfferCurrentlyActive('rides') &&
        coaster.entrance &&
        coaster.exit
      ) {
        const queueCapacity = this.getCoasterQueueCapacity(coaster.id)
        const hasReservation = coaster.queue.includes(visitor.id)
        if (
          !hasReservation &&
          (queueCapacity === 0 || coaster.queue.length >= queueCapacity)
        ) {
          visitor.avoidedCoasterId = coaster.id
          visitor.avoidanceMinutes =
            SIMULATION_CONFIG.coasters.fullQueueAvoidanceMinutes
          visitor.emotion = 'angry'
          visitor.emotionMinutes = 35
          visitor.targetId = null
          visitor.state = 'exploring'
          visitor.thought = 'Die Warteschlange ist voll. Ich gehe erst einmal weiter.'
          this.decideNextAction(visitor)
          return
        }
        if (!hasReservation) coaster.queue.push(visitor.id)
        visitor.state = 'queuing'
        visitor.thought = `Ich warte bei ${coaster.name}.`
        return
      }
    }
    this.decideNextAction(visitor)
  }

  private decideNextAction(visitor: Visitor): void {
    if (this.processingSimulationStep) {
      if (this.decisionBudget <= 0 || this.decidedThisTick.has(visitor.id)) {
        this.queueVisitorDecision(visitor)
        return
      }
      this.decisionBudget--
      this.decidedThisTick.add(visitor.id)
      this.visitorsAwaitingDecision.delete(visitor.id)
    }
    if (visitor.streakingMinutes > 0) {
      this.continueStreakingRun(visitor)
      return
    }
    if ((visitor.pendingWaste ?? 0) > 0) {
      this.tryDisposeWaste(visitor)
      if (visitor.state === 'seeking' && visitor.pendingWaste > 0) return
    }
    const decisions = SIMULATION_CONFIG.visitors.decisions
    if (visitor.isPanicking || visitor.state === 'panicking') {
      this.ensurePanicFleeRoute(visitor)
      return
    }
    if (!this.state.parkOpen || visitor.motivation <= 0) {
      this.beginVisitorDeparture(visitor)
      return
    }
    const festivalPhase = getFestivalCycleStatus(
      this.state.dayPlan,
      this.state.day,
    )
    if (festivalPhase.phase === 'break') {
      this.beginVisitorDeparture(visitor)
      visitor.thought = 'Das Festival ist beendet. Ich reise ab.'
      return
    }
    if (
      visitor.ticketType === 'day' &&
      (festivalPhase.phase !== 'festival' ||
        !isDayVisitorAdmissionOpen(this.state.dayPlan, this.state.minute))
    ) {
      this.beginVisitorDeparture(visitor)
      visitor.thought =
        'Meine Zeit als Tagesgast ist vorbei. Ich gehe nach Hause.'
      return
    }
    // Resume unfinished setup in saves made while camping arrivals were misrouted.
    if (visitor.campsite && visitor.campingPhase === 'seeking') {
      const route = this.camping.findRouteToCampsite(visitor, visitor.campsite)
      if (route) {
        visitor.state = 'camping'
        visitor.targetId = null
        visitor.route = route
        return
      }
    }
    if (
      visitor.campsite &&
      visitor.campingPhase === 'ready' &&
      this.isVisitorSleepTime(visitor) &&
      visitor.needs.energy <
        SIMULATION_CONFIG.camping.sleepSchedule
          .scheduledSleepEnergyBelow
    ) {
      const route = this.camping.findRouteToCampsite(
        visitor,
        visitor.campsite,
      )
      if (route) {
        visitor.state = 'camping'
        visitor.campingPhase = 'returning'
        visitor.walkingToCampDistance = 0
        visitor.targetId = null
        if (this.tryBeginBusJourney(visitor, visitor.campsite, route)) return
        visitor.route = route
        visitor.thought = `Es ist Schlafenszeit. Ich gehe zu meinem Zelt.`
        return
      }
    }
    if (
      !visitor.campsite &&
      this.isVisitorSleepTime(visitor) &&
      visitor.needs.energy <
        SIMULATION_CONFIG.camping.sleepSchedule
          .nonCamperDepartureEnergyBelow
    ) {
      this.beginVisitorDeparture(visitor)
      visitor.thought = 'Es ist spät und ich brauche Schlaf. Ich gehe nach Hause.'
      return
    }
    if (
      (visitor.needs.hunger < decisions.seekFoodBelow &&
        getItemQuantity(visitor.inventory, 'food') > 0) ||
      (visitor.alcoholDesire >= decisions.seekAlcoholDesire &&
        getItemQuantity(visitor.inventory, 'alcohol') > 0)
    ) {
      this.beginStationaryBreak(
        visitor,
        'Ich suche mir kurz einen Platz zum Essen oder Trinken.',
      )
      return
    }
    if (
      visitor.needs.energy <
      SIMULATION_CONFIG.atmosphere.benchRestEnergyThreshold
    ) {
      const bench = this.findBenchDestination(visitor)
      if (bench) {
        visitor.state = 'bench-resting'
        visitor.targetId = bench.building.id
        visitor.route = bench.route
        visitor.activityTarget = {
          x: bench.building.x,
          z: bench.building.z,
          elevation: bench.building.elevation,
        }
        visitor.activitySlot = bench.slot
        visitor.activityCapacity =
          SIMULATION_CONFIG.atmosphere.benchCapacity
        this.adjustVisitorOccupancy(visitor, 1)
        visitor.interactionRemaining =
          SIMULATION_CONFIG.atmosphere.benchRestMinutes
        if (
          this.tryBeginBusJourney(
            visitor,
            visitor.activityTarget,
            bench.route,
          )
        ) {
          return
        }
        visitor.thought = 'Ich suche mir eine freie Bank zum Ausruhen.'
        return
      }
    }
    if (visitor.needs.energy < decisions.lowEnergy) {
      if (visitor.campsite && visitor.campingPhase === 'ready') {
        const route = this.camping.findRouteToCampsite(visitor, visitor.campsite)
        if (route) {
          visitor.state = 'camping'
          visitor.campingPhase = 'returning'
          visitor.walkingToCampDistance = 0
          visitor.targetId = null
          if (this.tryBeginBusJourney(visitor, visitor.campsite, route)) return
          visitor.route = route
          visitor.thought = 'Ich gehe zu meinem Zelt und ruhe mich aus.'
          return
        }
      }
      const route = this.findPath(
        { x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation },
        [this.getEntrance()],
      )
      visitor.state = 'leaving'
      visitor.thought = 'Ich bin müde und gehe nach Hause.'
      visitor.targetId = null
      visitor.route = route ?? []
      return
    }

    const desiredKinds: BuildingKind[] = []
    if (visitor.needs.toilet < decisions.seekToiletBelow) desiredKinds.push('toilet')
    if (visitor.needs.hunger < decisions.seekFoodBelow) desiredKinds.push('food')
    if (
      visitor.alcoholDesire >= decisions.seekAlcoholDesire &&
      visitor.alcoholLevel < decisions.maximumAlcoholForPurchase &&
      visitor.needs.energy > decisions.minimumEnergyForAlcohol
    ) {
      desiredKinds.push('alcohol')
    }
    if (visitor.needs.fun < decisions.seekFunBelow) desiredKinds.push('ride')

    const urgentNeed = desiredKinds.some(
      (kind) => kind === 'toilet' || kind === 'food',
    )
    if (!urgentNeed && this.tryVisitConcert(visitor)) return
    const decisionRng = this.visitorDecisionRng(visitor)
    const searchAtmosphere =
      visitor.wanderNonce %
        SIMULATION_CONFIG.pathfinding.exploreSearchEvery ===
      0
    if (
      !urgentNeed &&
      searchAtmosphere &&
      decisionRng() <
        SIMULATION_CONFIG.atmosphere.partyDecisionProbability *
          (0.45 +
            visitor.partyPreference *
              SIMULATION_CONFIG.atmosphere.partyPreferenceDecisionWeight)
    ) {
      const party = this.findPartyDestination(visitor)
      if (party) {
        this.beginPartyVisit(visitor, party)
        return
      }
    }

    for (const kind of desiredKinds) {
      if (kind === 'ride') {
        const coasterDestination = this.findReachableCoaster(visitor)
        if (coasterDestination) {
          if (!coasterDestination.coaster.queue.includes(visitor.id)) {
            coasterDestination.coaster.queue.push(visitor.id)
          }
          visitor.state = 'seeking'
          visitor.targetId = coasterDestination.coaster.id
          visitor.route = coasterDestination.route
          visitor.thought = `Ich möchte ${coasterDestination.coaster.name} fahren!`
          return
        }
        const fullCoaster = this.state.coasters.find((coaster) => {
          const capacity = this.getCoasterQueueCapacity(coaster.id)
          return (
            coaster.operationMode === 'open' &&
            this.isOfferCurrentlyActive('rides') &&
            coaster.id !== visitor.avoidedCoasterId &&
            capacity > 0 &&
            coaster.queue.length >= capacity
          )
        })
        if (fullCoaster) {
          visitor.avoidedCoasterId = fullCoaster.id
          visitor.avoidanceMinutes =
            SIMULATION_CONFIG.coasters.fullQueueAvoidanceMinutes
          visitor.emotion = 'angry'
          visitor.emotionMinutes = 35
        }
      }
      const destination = this.findReachableFacility(visitor, kind)
      if (destination) {
        visitor.state = 'seeking'
        visitor.targetId = destination.building.id
        if (
          this.tryBeginBusJourney(
            visitor,
            {
              x: destination.building.x,
              z: destination.building.z,
              elevation: destination.building.elevation,
            },
            destination.route,
          )
        ) {
          return
        }
        visitor.route = destination.route
        visitor.thought =
          kind === 'food'
            ? 'Ich habe Hunger.'
            : kind === 'alcohol'
              ? 'Ich hole mir etwas zu trinken.'
            : kind === 'toilet'
              ? 'Ich brauche dringend eine Toilette.'
              : 'Ich möchte etwas Spannendes erleben!'
        return
      }
    }

    if (
      searchAtmosphere &&
      decisionRng() < SIMULATION_CONFIG.atmosphere.partyDecisionProbability
    ) {
      const party = this.findPartyDestination(visitor)
      if (party) {
        this.beginPartyVisit(visitor, party)
        return
      }
    }

    if (
      searchAtmosphere &&
      visitor.needs.fun < decisions.socializingFunBelow &&
      decisionRng() < decisions.socializingProbability
    ) {
      const gathering = this.camping.findRouteToGathering(visitor)
      if (gathering) {
        visitor.state = 'socializing'
        visitor.targetId = null
        if (
          this.tryBeginBusJourney(
            visitor,
            gathering.target,
            gathering.route,
          )
        ) {
          return
        }
        visitor.route = gathering.route
        visitor.interactionRemaining =
          decisions.socializingMinutesMinimum +
          this.rng.next() * decisions.socializingMinutesRandomRange
        visitor.campActivityTarget = gathering.target
        visitor.campActivityKind = gathering.kind
        visitor.campActivitySlot = gathering.slot
        visitor.campActivityCapacity = gathering.capacity
        visitor.campActivity =
          gathering.kind === 'chairs' ? 'sitting' : 'standing'
        visitor.thought =
          gathering.kind === 'pavilion'
            ? 'Ich gehe zu den anderen unter den Pavillon.'
            : gathering.kind === 'musicBox'
              ? 'Ich gehe zur Musikbox am Zeltplatz.'
              : 'Ich setze mich zu den anderen Campern.'
        return
      }
    }

    if (searchAtmosphere) {
      const leisure = this.findLeisureDestination(visitor)
      if (leisure) {
        visitor.state = 'relaxing'
        visitor.targetId = null
        if (this.tryBeginBusJourney(visitor, leisure.cell, leisure.route)) return
        visitor.route = leisure.route
        visitor.activityTarget = leisure.cell
        visitor.activitySlot = leisure.slot
        visitor.activityCapacity = leisure.capacity
        this.adjustVisitorOccupancy(visitor, 1)
        visitor.interactionRemaining =
          SIMULATION_CONFIG.atmosphere.leisureDurationMinimum +
          this.rng.next() *
            SIMULATION_CONFIG.atmosphere.leisureDurationRandomRange
        visitor.isDancing = false
        visitor.thought =
          leisure.party > leisure.beauty
            ? 'Dort ist gute Stimmung. Ich gehe zu den anderen.'
            : 'Dort sieht es schön aus. Da möchte ich mich aufhalten.'
        return
      }
    }

    this.assignDeterministicWander(visitor, decisionRng)
    visitor.thought =
      desiredKinds.length > 0
        ? 'Ich finde hier nicht, was ich brauche.'
        : 'Ich schaue mich ein wenig um.'
  }

  private tryBeginBusJourney(
    visitor: Visitor,
    destination: Cell,
    directRoute?: readonly Cell[],
  ): boolean {
    const routeToDestination =
      directRoute ??
      this.findPath(
        {
          x: visitor.cellX,
          z: visitor.cellZ,
          elevation: visitor.cellElevation,
        },
        [destination],
      )
    if (
      !routeToDestination ||
      routeToDestination.length <
        SIMULATION_CONFIG.logistics.busMinimumJourneyTiles ||
      this.state.logistics.busLines.length === 0
    ) {
      return false
    }
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const choices = this.state.logistics.busLines
      .filter(
        (line) =>
          line.active &&
          line.stopIds.length >= 2 &&
          line.busIds.some((busId) =>
            this.state.logistics.roadVehicles.some(
              (vehicle) => vehicle.id === busId && vehicle.kind === 'bus',
            ),
          ),
      )
      .flatMap((line) =>
        line.stopIds.flatMap((stopId, boardingIndex) => {
          const stop = this.state.logistics.busStops.find(
            (candidate) => candidate.id === stopId,
          )
          if (!stop) return []
          const route = this.findPath(start, [
            { x: stop.x, z: stop.z, elevation: 0 },
          ])
          if (!route) return []
          return Array.from(
            { length: line.stopIds.length - 1 },
            (_, index) => index + 1,
          ).flatMap((rideStops) => {
            const destinationStopId =
              line.stopIds[
                (boardingIndex + rideStops) % line.stopIds.length
              ]
            const destinationStop = this.state.logistics.busStops.find(
              (candidate) => candidate.id === destinationStopId,
            )
            if (!destinationStop) return []
            const finalRoute = this.findPath(
              { x: destinationStop.x, z: destinationStop.z, elevation: 0 },
              [destination],
            )
            if (!finalRoute) return []
            const walkingDistance = route.length + finalRoute.length
            const requiredSaving =
              visitor.needs.energy <=
              SIMULATION_CONFIG.logistics.busPreferenceEnergyThreshold
                ? 0
                : SIMULATION_CONFIG.logistics.busMinimumWalkSavingsTiles
            if (
              walkingDistance + requiredSaving >=
              routeToDestination.length
            ) {
              return []
            }
            return [{
              line,
              stop,
              destinationStop,
              route,
              score:
                walkingDistance +
                rideStops *
                  SIMULATION_CONFIG.logistics.busStopRideCostTiles +
                line.headway /
                  SIMULATION_CONFIG.logistics.busHeadwayCostDivisor,
            }]
          })
        }),
      )
      .sort((left, right) => left.score - right.score)
    const choice = choices[0]
    if (!choice) return false
    visitor.busDestination = { ...destination }
    visitor.busDestinationStopId = choice.destinationStop.id
    visitor.busResumeState = visitor.state
    visitor.busResumeTargetId = visitor.targetId
    visitor.state = 'bus-waiting'
    visitor.busLineId = choice.line.id
    visitor.busWaitMinutes = 0
    visitor.route = choice.route
    visitor.targetId = choice.stop.id
    visitor.thought = `Ich fahre mit ${choice.line.name}, damit ich nicht so weit laufen muss.`
    return true
  }

  private beginPartyVisit(
    visitor: Visitor,
    party: {
      cell: Cell
      route: Cell[]
      slot: number
      capacity: number
      forecourt: boolean
    },
  ): void {
    visitor.state = 'partying'
    visitor.targetId = null
    visitor.route = party.route
    visitor.activityTarget = party.cell
    visitor.activitySlot = party.slot
    visitor.activityCapacity = party.capacity
    this.adjustVisitorOccupancy(visitor, 1)
    const partyKey = this.cellKey(
      party.cell.x,
      party.cell.z,
      party.cell.elevation,
    )
    if (party.route.length === 0) {
      visitor.localAttractiveness =
        this.attractivenessValues.get(partyKey) ?? 0
      visitor.localPartyMood = this.partyMoodValues.get(partyKey) ?? 0
    }
    visitor.interactionRemaining =
      SIMULATION_CONFIG.atmosphere.partyDurationMinimum +
      this.rng.next() * SIMULATION_CONFIG.atmosphere.partyDurationRandomRange
    visitor.isDancing = false
    visitor.isConversing = false
    visitor.thought = party.forecourt
      ? 'Ich gehe zum Bühnenvorplatz!'
      : 'Dort scheint gute Stimmung zu sein!'
    this.tryBeginBusJourney(visitor, party.cell, party.route)
  }

  private availableConcerts(){
    const key=`${this.state.simTick}:${this.worldRevision}`
    if(key!==this.concertChoiceKey){this.concertChoiceKey=key;this.concertChoices=activeBookings(this.state).filter(b=>!showIssue(this.state,b)).map(booking=>({booking,band:BANDS.find(b=>b.id===booking.bandId)!,stage:this.state.buildings.find(b=>b.id===booking.stageId)!}))}
    return this.concertChoices
  }
  private avoidsConcertAt(visitor:Visitor,cell:{x:number;z:number}){
    if(!this.state.festival.enabled)return false
    const nearby=this.availableConcerts().filter(show=>stageDistance(show.stage,cell)<=8)
    if(!nearby.length)return false
    visitor.musicTaste??=musicTaste(visitor.id,this.state.festival)
    return !nearby.some(show=>musicAppeal(visitor.musicTaste!,show.band.id)>=.3)
  }

  private tryVisitConcert(visitor: Visitor): boolean {
    if (!this.state.festival.enabled) return false
    if (this.concertSlotTick !== this.state.simTick) {
      this.concertSlotTick = this.state.simTick
      this.concertSlots.clear()
      for (const guest of this.state.visitors) {
        if (!guest.activityTarget || !['partying', 'relaxing'].includes(guest.state)) continue
        const key = this.packCell(guest.activityTarget)
        const slots = this.concertSlots.get(key) ?? new Set<number>()
        slots.add(guest.activitySlot); this.concertSlots.set(key, slots)
      }
    }
    visitor.musicTaste??=musicTaste(visitor.id,this.state.festival)
    const shows = this.availableConcerts()
      .filter(show=>musicAppeal(visitor.musicTaste!,show.band.id)>=.3)
      .sort((a,b)=> (musicAppeal(visitor.musicTaste!,b.band.id)*120+b.band.draw*.25-stageDistance(b.stage,visitor)*.5)-(musicAppeal(visitor.musicTaste!,a.band.id)*120+a.band.draw*.25-stageDistance(a.stage,visitor)*.5))
    for (const show of shows.slice(0, 2)) {
      if (visitor.audience === 'family' && this.state.minute >= 21 * 60) continue
      const cells = this.state.stageForecourtCells.filter(c => stageDistance(show.stage,c) <= 8)
        .sort((a, b) => Math.hypot(a.x - visitor.x, a.z - visitor.z) - Math.hypot(b.x - visitor.x, b.z - visitor.z))
      for (const cell of cells.slice(0, 8)) {
        const key = this.packCell(cell), used = this.concertSlots.get(key) ?? new Set<number>()
        const slot = [4, 0, 2, 6, 8, 1, 3, 5, 7].find(n => !used.has(n))
        if (slot === undefined) continue
        const route = this.findPath({ x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation }, [cell], false, true, false, false, true)
        if (!route) continue
        used.add(slot); this.concertSlots.set(key, used)
        this.beginPartyVisit(visitor, { cell, route, slot, capacity: 9, forecourt: true })
        visitor.concertId = show.booking.id
        visitor.interactionRemaining = show.booking.start + show.booking.duration - this.state.minute
        visitor.thought = `Ich möchte ${show.band.name} sehen!`
        return true
      }
    }
    return false
  }

  private giveWaste(visitor: Visitor, amount: number): void {
    if (amount <= 0) return
    visitor.pendingWaste = (visitor.pendingWaste ?? 0) + amount
    this.tryDisposeWaste(visitor)
  }

  private tryDisposeWaste(visitor: Visitor): void {
    if ((visitor.pendingWaste ?? 0) <= 0) return
    if (
      visitor.state === 'vehicle-arrival' ||
      visitor.state === 'bus-riding' ||
      visitor.state === 'riding' ||
      visitor.state === 'medical' ||
      visitor.state === 'medical-transport'
    ) {
      return
    }
    const config = SIMULATION_CONFIG.waste
    const bins = this.state.buildings
      .filter((building) => building.kind === 'wasteBin')
      .map((building) => ({
        id: building.id,
        x: building.x,
        z: building.z,
        elevation: building.elevation,
        stored: building.wasteFill ?? 0,
      }))
    const bin = findNearestWasteBin(
      { x: visitor.cellX, z: visitor.cellZ },
      bins,
      config.binRange,
      config.binCapacity,
    )
    if (!bin) {
      this.dropPendingWaste(visitor)
      return
    }
    const distance =
      Math.abs(bin.x - visitor.cellX) + Math.abs(bin.z - visitor.cellZ)
    if (distance <= 1) {
      this.depositPendingWaste(visitor, bin.id)
      return
    }
    const route = this.findPath(
      {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
      },
      [{ x: bin.x, z: bin.z, elevation: bin.elevation }],
      false,
      true,
      true,
    )
    if (!route) {
      this.dropPendingWaste(visitor)
      return
    }
    this.clearVisitorActivity(visitor)
    visitor.targetId = bin.id
    visitor.state = 'seeking'
    visitor.route = route
    visitor.thought = 'Ich gehe zum Mülleimer.'
  }

  private depositPendingWaste(visitor: Visitor, binId: string): void {
    const bin = this.state.buildings.find(
      (building) => building.id === binId && building.kind === 'wasteBin',
    )
    if (!bin) {
      this.dropPendingWaste(visitor)
      return
    }
    const room = Math.max(
      0,
      SIMULATION_CONFIG.waste.binCapacity - (bin.wasteFill ?? 0),
    )
    const stored = Math.min(visitor.pendingWaste, room)
    bin.wasteFill = (bin.wasteFill ?? 0) + stored
    visitor.pendingWaste -= stored
    visitor.thought =
      stored > 0
        ? 'Ich werfe den Müll in den Eimer.'
        : 'Der Mülleimer ist voll.'
    if (visitor.pendingWaste > 0) this.dropPendingWaste(visitor)
  }

  private dropPendingWaste(visitor: Visitor): void {
    if (visitor.pendingWaste <= 0) return
    this.addGroundIncident(
      'litter',
      {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
      },
      visitor.pendingWaste,
    )
    visitor.pendingWaste = 0
    visitor.thought = 'Hier liegt jetzt mein Müll. Ein Eimer wäre besser gewesen.'
  }

  private beginStationaryBreak(visitor: Visitor, thought: string): void {
    visitor.state = 'relaxing'
    visitor.targetId = null
    visitor.route = []
    visitor.activityTarget = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    visitor.activityCapacity =
      SIMULATION_CONFIG.atmosphere.leisureCapacityPerPathCell
    visitor.activitySlot = this.getFreeActivitySlot(
      visitor.activityTarget,
      visitor.activityCapacity,
      visitor.id,
    )
    this.adjustVisitorOccupancy(visitor, 1)
    visitor.interactionRemaining =
      SIMULATION_CONFIG.atmosphere.leisureDurationMinimum
    visitor.consumptionCooldown = 0
    visitor.thought = thought
  }

  private consumeWhileStationary(
    visitor: Visitor,
    minutes: number,
  ): boolean {
    visitor.consumptionCooldown = Math.max(
      0,
      visitor.consumptionCooldown - minutes,
    )
    if (visitor.consumptionCooldown > 0) return false
    const config = SIMULATION_CONFIG.needs.stationaryConsumption
    if (
      visitor.needs.hunger < config.foodConsumeBelow &&
      consumeItem(visitor.inventory, 'food')
    ) {
      visitor.needs.hunger = Math.min(
        100,
        visitor.needs.hunger + config.foodGain,
      )
      visitor.needs.toilet = Math.max(
        0,
        visitor.needs.toilet - config.foodToiletCost,
      )
      visitor.consumptionCooldown =
        config.cooldownMinimumMinutes +
        this.rng.next() * config.cooldownRandomMinutes
      visitor.thought = 'Ich bleibe stehen und esse mein gekauftes Essen.'
      this.giveWaste(visitor, 1)
      return true
    }
    if (
      visitor.alcoholDesire >= config.drinkDesireAbove &&
      visitor.alcoholLevel < config.maximumAlcohol &&
      consumeItem(visitor.inventory, 'alcohol')
    ) {
      visitor.alcoholLevel = Math.min(
        100,
        visitor.alcoholLevel + config.alcoholGain,
      )
      visitor.alcoholDesire = 0
      visitor.needs.fun = Math.min(
        100,
        visitor.needs.fun + config.drinkFunGain,
      )
      visitor.needs.energy = Math.max(
        0,
        visitor.needs.energy - config.drinkEnergyCost,
      )
      visitor.needs.toilet = Math.max(
        0,
        visitor.needs.toilet - config.drinkToiletCost,
      )
      this.incidents.addDrinkNausea(visitor)
      visitor.consumptionCooldown =
        config.cooldownMinimumMinutes +
        this.rng.next() * config.cooldownRandomMinutes
      visitor.thought = 'Ich bleibe hier und trinke mein Getränk.'
      this.giveWaste(visitor, 1)
      return true
    }
    return false
  }

  private createPreferredBedtime(): number {
    const schedule = SIMULATION_CONFIG.camping.sleepSchedule
    return (
      schedule.bedtimeMinimum +
      this.rng.next() * schedule.bedtimeRandomRange
    ) % SIMULATION_CONFIG.time.minutesPerDay
  }

  private samplePoisson(expected: number): number {
    if (expected <= 0) return 0
    const limit = Math.exp(-expected)
    let product = 1
    let count = 0
    do {
      count += 1
      product *= this.rng.next()
    } while (product > limit)
    return count - 1
  }

  private createPreferredWakeTime(): number {
    const schedule = SIMULATION_CONFIG.camping.sleepSchedule
    return (
      schedule.wakeTimeMinimum +
      this.rng.next() * schedule.wakeTimeRandomRange
    ) % SIMULATION_CONFIG.time.minutesPerDay
  }

  private isVisitorSleepTime(visitor: Visitor): boolean {
    const minute = this.state.minute
    if (visitor.preferredBedtime > visitor.preferredWakeTime) {
      return (
        minute >= visitor.preferredBedtime ||
        minute < visitor.preferredWakeTime
      )
    }
    return (
      minute >= visitor.preferredBedtime &&
      minute < visitor.preferredWakeTime
    )
  }

  private getBuildingDayPlanOffer(
    kind: BuildingKind,
  ): DayPlanOffer | null {
    if (kind === 'food') return 'food'
    if (kind === 'alcohol') return 'drinks'
    if (kind === 'toilet') return 'toilets'
    if (kind === 'ride') return 'rides'
    if (
      kind === 'stage' ||
      kind === 'directionalSpeaker' ||
      kind === 'omniSpeaker' ||
      kind === 'delayTower' ||
      kind === 'videoWall' ||
      kind === 'laserShow' ||
      kind === 'fireworkBattery' ||
      kind === 'foh'
    ) {
      return 'stages'
    }
    if (kind === 'lighting') return 'lights'
    return null
  }

  private adjustVisitorOccupancy(visitor: Visitor, delta: -1 | 1): void {
    if (this.occupancyTick !== this.state.simTick) return
    if (
      (visitor.state === 'relaxing' || visitor.state === 'partying') &&
      visitor.activityTarget
    ) {
      const key = this.cellKey(
        visitor.activityTarget.x,
        visitor.activityTarget.z,
        visitor.activityTarget.elevation,
      )
      const next = Math.max(0, (this.activityHeadcount.get(key) ?? 0) + delta)
      if (next) this.activityHeadcount.set(key, next)
      else this.activityHeadcount.delete(key)
      if (delta > 0) {
        this.activitySlotBits.set(
          key,
          (this.activitySlotBits.get(key) ?? 0) | (1 << (visitor.activitySlot & 31)),
        )
      } else {
        this.activitySlotBits.set(
          key,
          (this.activitySlotBits.get(key) ?? 0) & ~(1 << (visitor.activitySlot & 31)),
        )
      }
    } else if (visitor.state === 'bench-resting' && visitor.targetId) {
      const next = Math.max(0, (this.benchHeadcount.get(visitor.targetId) ?? 0) + delta)
      if (next) this.benchHeadcount.set(visitor.targetId, next)
      else this.benchHeadcount.delete(visitor.targetId)
      if (delta > 0) {
        this.benchSlotBits.set(
          visitor.targetId,
          (this.benchSlotBits.get(visitor.targetId) ?? 0) |
            (1 << (visitor.activitySlot & 31)),
        )
      } else {
        this.benchSlotBits.set(
          visitor.targetId,
          (this.benchSlotBits.get(visitor.targetId) ?? 0) &
            ~(1 << (visitor.activitySlot & 31)),
        )
      }
    }
  }

  private ensureVisitorOccupancy(): void {
    if (this.occupancyTick === this.state.simTick) return
    this.occupancyTick = this.state.simTick
    this.activityHeadcount.clear()
    this.activitySlotBits.clear()
    this.benchHeadcount.clear()
    this.benchSlotBits.clear()
    for (const visitor of this.state.visitors) {
      if (
        (visitor.state === 'relaxing' || visitor.state === 'partying') &&
        visitor.activityTarget
      ) {
        const key = this.cellKey(
          visitor.activityTarget.x,
          visitor.activityTarget.z,
          visitor.activityTarget.elevation,
        )
        this.activityHeadcount.set(key, (this.activityHeadcount.get(key) ?? 0) + 1)
        this.activitySlotBits.set(
          key,
          (this.activitySlotBits.get(key) ?? 0) | (1 << (visitor.activitySlot & 31)),
        )
      } else if (visitor.state === 'bench-resting' && visitor.targetId) {
        this.benchHeadcount.set(
          visitor.targetId,
          (this.benchHeadcount.get(visitor.targetId) ?? 0) + 1,
        )
        this.benchSlotBits.set(
          visitor.targetId,
          (this.benchSlotBits.get(visitor.targetId) ?? 0) | (1 << (visitor.activitySlot & 31)),
        )
      }
    }
  }

  private activityOccupantsAt(cell: Cell, excluded: Visitor): number {
    this.ensureVisitorOccupancy()
    let count =
      this.activityHeadcount.get(this.cellKey(cell.x, cell.z, cell.elevation)) ?? 0
    if (
      (excluded.state === 'relaxing' || excluded.state === 'partying') &&
      excluded.activityTarget?.x === cell.x &&
      excluded.activityTarget.z === cell.z &&
      excluded.activityTarget.elevation === cell.elevation
    ) {
      count -= 1
    }
    return count
  }

  private getFreeActivitySlot(
    cell: Cell,
    capacity: number,
    excludedVisitorId: string,
  ): number {
    this.ensureVisitorOccupancy()
    const key = this.cellKey(cell.x, cell.z, cell.elevation)
    let used = this.activitySlotBits.get(key) ?? 0
    const excluded = this.getVisitor(excludedVisitorId)
    if (
      excluded &&
      (excluded.state === 'relaxing' || excluded.state === 'partying') &&
      excluded.activityTarget?.x === cell.x &&
      excluded.activityTarget.z === cell.z &&
      excluded.activityTarget.elevation === cell.elevation
    ) {
      used &= ~(1 << (excluded.activitySlot & 31))
    }
    const order = [4, 0, 2, 6, 8, 1, 3, 5, 7].slice(0, capacity)
    return order.find((slot) => (used & (1 << slot)) === 0) ?? 4
  }

  private findLeisureDestination(visitor: Visitor): {
    cell: Cell
    route: Cell[]
    slot: number
    capacity: number
    beauty: number
    party: number
  } | null {
    const config = SIMULATION_CONFIG.atmosphere
    const candidates = new Map<string, Cell>()
    ;[...this.state.attractiveness.cells, ...this.state.partyMood.cells].forEach(
      (cell) => {
        if (
          !this.getPathAt(cell.x, cell.z, cell.elevation) ||
          (this.attractivenessValues.get(
            this.cellKey(cell.x, cell.z, cell.elevation),
          ) ?? 0) < config.leisureMinimumFieldValue &&
            (this.partyMoodValues.get(
              this.cellKey(cell.x, cell.z, cell.elevation),
            ) ?? 0) < config.leisureMinimumFieldValue
        ) {
          return
        }
        candidates.set(
          this.cellKey(cell.x, cell.z, cell.elevation),
          { x: cell.x, z: cell.z, elevation: cell.elevation },
        )
      },
    )
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const scored = [...candidates.values()]
      .filter(cell=>!this.avoidsConcertAt(visitor,cell))
      .map((cell) => {
        const cellKey = this.cellKey(cell.x, cell.z, cell.elevation)
        const beauty = this.attractivenessValues.get(cellKey) ?? 0
        const party = this.partyMoodValues.get(cellKey) ?? 0
        const occupantCount = this.activityOccupantsAt(cell, visitor)
        if (occupantCount >= config.leisureCapacityPerPathCell) return null
        const distance =
          Math.abs(cell.x - visitor.cellX) +
          Math.abs(cell.z - visitor.cellZ)
        return {
          cell,
          beauty,
          party,
          occupants: occupantCount,
          score:
            beauty * visitor.beautyPreference +
            party * visitor.partyPreference -
            occupantCount * config.occupancyScorePenalty -
            distance * config.leisureDecisionDistancePenalty -
            (this.crowdingCosts.get(cellKey) ?? 0) *
              config.crowdingScorePenalty,
        }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, SIMULATION_CONFIG.pathfinding.maxScoredPathChecks)
    for (const candidate of scored) {
      const route = this.findPath(start, [candidate.cell])
      if (!route) continue
      return {
        cell: candidate.cell,
        route,
        slot: this.getFreeActivitySlot(
          candidate.cell,
          config.leisureCapacityPerPathCell,
          visitor.id,
        ),
        capacity: config.leisureCapacityPerPathCell,
        beauty: candidate.beauty,
        party: candidate.party,
      }
    }
    return null
  }

  private enforceDayPlan(): void {
    const festivalPhase = getFestivalCycleStatus(
      this.state.dayPlan,
      this.state.day,
    )
    const dayVisitorsAllowed =
      festivalPhase.phase === 'festival' &&
      isDayVisitorAdmissionOpen(this.state.dayPlan, this.state.minute)
    const ridesActive = this.isOfferCurrentlyActive('rides')
    const stagesActive = this.isOfferCurrentlyActive('stages')
    this.state.visitors.forEach((visitor) => {
      if (
        festivalPhase.phase === 'break' &&
        visitor.state !== 'leaving' &&
        visitor.state !== 'riding' &&
        visitor.state !== 'vehicle-arrival' &&
        visitor.state !== 'bus-riding' &&
        visitor.campingPhase !== 'packing'
      ) {
        this.beginVisitorDeparture(visitor)
        visitor.thought =
          'Das Festival ist vorbei. Jetzt beginnt die Veranstaltungspause.'
        return
      }
      if (
        visitor.ticketType === 'day' &&
        !dayVisitorsAllowed &&
        visitor.state !== 'leaving' &&
        visitor.state !== 'riding' &&
        visitor.state !== 'vehicle-arrival' &&
        visitor.state !== 'bus-riding' &&
        visitor.campingPhase !== 'packing'
      ) {
        this.beginVisitorDeparture(visitor)
        visitor.thought =
          'Die Besuchszeit für Tagesgäste ist vorbei. Ich gehe nach Hause.'
        return
      }
      if (visitor.state === 'queuing' && !ridesActive) {
        this.removeVisitorFromCoasterQueues(visitor.id)
        visitor.state = 'exploring'
        visitor.targetId = null
        visitor.route = []
        visitor.thought = 'Die Fahrgeschäfte schließen für heute.'
        this.decideNextAction(visitor)
        return
      }
      if (
        visitor.state === 'partying' &&
        !stagesActive &&
        visitor.activityTarget &&
        this.getStageForecourtCellAt(
          visitor.activityTarget.x,
          visitor.activityTarget.z,
        )
      ) {
        this.clearVisitorActivity(visitor)
        visitor.state = 'exploring'
        visitor.thought = 'Das Bühnenprogramm ist für heute beendet.'
        this.decideNextAction(visitor)
        return
      }
      if (visitor.state !== 'seeking' || !visitor.targetId) return
      const targetBuilding = this.state.buildings.find(
        (building) => building.id === visitor.targetId,
      )
      const targetCoaster = this.getCoaster(visitor.targetId)
      const targetActive = targetBuilding
        ? this.isBuildingCurrentlyActive(targetBuilding)
        : targetCoaster
          ? ridesActive
          : true
      if (targetActive) return
      this.removeVisitorFromCoasterQueues(visitor.id)
      visitor.state = 'exploring'
      visitor.targetId = null
      visitor.route = []
      visitor.thought = 'Dieses Angebot ist gerade geschlossen.'
      this.decideNextAction(visitor)
    })
  }

  private findBenchDestination(visitor: Visitor): {
    building: PlacedBuilding
    route: Cell[]
    slot: number
  } | null {
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const candidates = this.state.buildings
      .filter((building) => building.kind === 'bench')
      .map((building) => {
        this.ensureVisitorOccupancy()
        let occupantCount = this.benchHeadcount.get(building.id) ?? 0
        let usedBits = this.benchSlotBits.get(building.id) ?? 0
        if (visitor.state === 'bench-resting' && visitor.targetId === building.id) {
          occupantCount -= 1
          usedBits &= ~(1 << (visitor.activitySlot & 31))
        }
        if (occupantCount >= SIMULATION_CONFIG.atmosphere.benchCapacity) {
          return null
        }
        const slot =
          Array.from(
            { length: SIMULATION_CONFIG.atmosphere.benchCapacity },
            (_, index) => index,
          ).find((index) => (usedBits & (1 << index)) === 0) ?? 0
        return {
          building,
          slot,
          access: {
            x: building.x,
            z: building.z,
            elevation: building.elevation,
          },
          distance:
            Math.abs(building.x - start.x) + Math.abs(building.z - start.z),
        }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .sort((left, right) => left.distance - right.distance)
      .slice(0, SIMULATION_CONFIG.pathfinding.maxFacilityCandidates)
    if (candidates.length === 0) return null
    const route = this.findPath(
      start,
      candidates.map((candidate) => candidate.access),
    )
    if (!route) return null
    const end = route.at(-1) ?? start
    const match =
      candidates.find(
        (candidate) =>
          candidate.access.x === end.x &&
          candidate.access.z === end.z &&
          Math.abs(candidate.access.elevation - end.elevation) < 0.01,
      ) ?? candidates[0]
    return match
      ? { building: match.building, route, slot: match.slot }
      : null
  }

  private findPartyDestination(visitor: Visitor): {
    cell: Cell
    route: Cell[]
    slot: number
    capacity: number
    forecourt: boolean
  } | null {
    const atmosphere = SIMULATION_CONFIG.atmosphere
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const candidates = [
      ...this.state.stageForecourtCells
        .filter(
          (cell) =>
            this.isOfferCurrentlyActive('stages') &&
            (this.partyMoodValues.get(
              this.cellKey(cell.x, cell.z, cell.elevation),
            ) ?? 0) >= atmosphere.partyDestinationMinimumMood,
        )
        .map((cell) => ({
          cell,
          capacity: atmosphere.forecourtCapacityPerCell,
          forecourt: true,
        })),
      ...this.state.partyMood.cells
        .filter(
          (cell) =>
            cell.value >= atmosphere.partyDestinationMinimumMood &&
            Boolean(this.getPathAt(cell.x, cell.z, cell.elevation)),
        )
        .map((cell) => ({
          cell,
          capacity: atmosphere.hotspotCapacity,
          forecourt: false,
        })),
    ]
    const scored = candidates
      .filter(candidate=>!this.avoidsConcertAt(visitor,candidate.cell))
      .map((candidate) => {
        const occupantCount = this.activityOccupantsAt(candidate.cell, visitor)
        if (occupantCount >= candidate.capacity) return null
        const cellKey = this.cellKey(
          candidate.cell.x,
          candidate.cell.z,
          candidate.cell.elevation,
        )
        const beauty = this.attractivenessValues.get(cellKey) ?? 0
        const party = this.partyMoodValues.get(cellKey) ?? 0
        const distance =
          Math.abs(candidate.cell.x - visitor.cellX) +
          Math.abs(candidate.cell.z - visitor.cellZ)
        const crowding = this.crowdingCosts.get(cellKey) ?? 0
        return {
          ...candidate,
          occupantCount,
          score:
            beauty * visitor.beautyPreference +
            party * visitor.partyPreference -
            occupantCount * atmosphere.occupancyScorePenalty -
            distance * atmosphere.distanceScorePenalty -
            crowding * atmosphere.crowdingScorePenalty +
            (candidate.forecourt ? atmosphere.forecourtScoreBonus : 0),
        }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, SIMULATION_CONFIG.pathfinding.maxScoredPathChecks)
    for (const candidate of scored) {
      const route = this.findPath(
        start,
        [candidate.cell],
        false,
        false,
        false,
        false,
        candidate.forecourt,
      )
      if (!route) continue
      const slot = this.getFreeActivitySlot(
        candidate.cell,
        candidate.capacity,
        visitor.id,
      )
      return {
        cell: { ...candidate.cell },
        route,
        slot,
        capacity: candidate.capacity,
        forecourt: candidate.forecourt,
      }
    }
    return null
  }

  private clearVisitorActivity(visitor: Visitor): void {
    this.adjustVisitorOccupancy(visitor, -1)
    visitor.concertId = null
    visitor.activityTarget = null
    visitor.activitySlot = 0
    visitor.activityCapacity = 1
    visitor.isDancing = false
    if (visitor.state === 'bench-resting') visitor.targetId = null
  }

  private findReachableFacility(
    visitor: Visitor,
    kind: BuildingKind,
  ): { building: PlacedBuilding; route: Cell[] } | null {
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const candidates = this.state.buildings
      .filter(
        (building) =>
          building.kind === kind && this.isBuildingCurrentlyActive(building),
      )
      .map((building) => {
        const access = this.getAccessCell(
          building.x,
          building.z,
          building.elevation,
          building.rotation,
        )
        return {
          building,
          access,
          distance:
            Math.abs(access.x - start.x) + Math.abs(access.z - start.z),
        }
      })
      .filter((candidate) =>
        Boolean(this.getPathAt(candidate.access.x, candidate.access.z, candidate.access.elevation)),
      )
      .sort((left, right) => left.distance - right.distance)
      .slice(0, SIMULATION_CONFIG.pathfinding.maxFacilityCandidates)
    if (candidates.length === 0) return null
    const route = this.findPath(
      start,
      candidates.map((candidate) => candidate.access),
    )
    if (!route) return null
    const end = route.at(-1) ?? start
    const match =
      candidates.find(
        (candidate) =>
          candidate.access.x === end.x &&
          candidate.access.z === end.z &&
          Math.abs(candidate.access.elevation - end.elevation) < 0.01,
      ) ?? candidates[0]
    return match ? { building: match.building, route } : null
  }

  private findReachableCoaster(
    visitor: Visitor,
  ): { coaster: Coaster; route: Cell[] } | null {
    const start = {
      x: visitor.cellX,
      z: visitor.cellZ,
      elevation: visitor.cellElevation,
    }
    const candidates = this.state.coasters
      .filter(
        (coaster) =>
          coaster.closed &&
          this.isOfferCurrentlyActive('rides') &&
          coaster.operationMode === 'open' &&
          coaster.entrance &&
          coaster.exit &&
          coaster.id !== visitor.avoidedCoasterId &&
          this.getCoasterQueueCapacity(coaster.id) > coaster.queue.length &&
          this.getAccessPathNeighbors(coaster.exit).some(
            (cell) =>
              this.getPathAt(cell.x, cell.z, cell.elevation)?.pathType !== 'queue',
          ),
      )
      .map((coaster) => {
        const queueEntrance = this.getCoasterQueueCells(coaster).at(-1)
        return queueEntrance
          ? {
              coaster,
              queueEntrance,
              distance:
                Math.abs(queueEntrance.x - start.x) +
                Math.abs(queueEntrance.z - start.z),
            }
          : null
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .sort((left, right) => left.distance - right.distance)
      .slice(0, SIMULATION_CONFIG.pathfinding.maxFacilityCandidates)
    if (candidates.length === 0) return null
    const route = this.findPath(
      start,
      candidates.map((candidate) => candidate.queueEntrance),
      true,
    )
    if (!route) return null
    const end = route.at(-1) ?? start
    const match =
      candidates.find(
        (candidate) =>
          candidate.queueEntrance.x === end.x &&
          candidate.queueEntrance.z === end.z &&
          Math.abs(candidate.queueEntrance.elevation - end.elevation) < 0.01,
      ) ?? candidates[0]
    return match ? { coaster: match.coaster, route } : null
  }

  private findPath(
    start: Cell,
    goals: Cell[],
    allowQueue = false,
    allowCamping = false,
    allowMedical = false,
    ignoreDirectionalRestrictions = false,
    allowFestival = false,
    maxVisited?: number,
    allowStaff = false,
  ): Cell[] | null {
    if (goals.length === 0) return null
    this.ensurePedestrianNav(this.lastNavRevision !== this.worldRevision)
    const startOnCamping = Boolean(this.getCampingCellAt(start.x, start.z))
    const startOnMedical = Boolean(this.getMedicalCellAt(start.x, start.z))
    const startOnFestival = Boolean(this.getStageForecourtCellAt(start.x, start.z))
    const campingAllowed = allowCamping || startOnCamping
    const medicalAllowed = allowMedical || startOnMedical
    const festivalAllowed = allowFestival || startOnFestival
    const cacheKey = this.getPedestrianPathCacheKey(start, goals, {
      allowQueue,
      allowCamping: campingAllowed,
      allowMedical: medicalAllowed,
      allowFestival: festivalAllowed,
      ignoreDirectionalRestrictions,
    })
    const accessCacheKey = `${cacheKey}:${allowStaff ? 'staff' : 'guest'}`
    const cached = this.pedestrianPathCache.get(accessCacheKey)
    if (cached && cached.expires > this.state.simTick) return this.clonePedestrianPath(cached.path)
    if (cached) this.pedestrianPathCache.delete(accessCacheKey)
    const goalKeys = new Set(goals.map((cell) => this.packCell(cell)))
    const movementCost = (_from: Cell, to: Cell): number => {
      const key = this.packCell(to)
      const surface = this.pedestrianNav.get(key)?.cost ?? this.getPedestrianSurfaceCost(to)
      return surface * (1 + (this.pedestrianCongestionCosts.get(key) ?? 0)) + Math.min(1, (this.crowdingCostPacked.get(key) ?? 0) / 100) *
        SIMULATION_CONFIG.pathfinding.crowdingCostWeight
    }
    const heuristic =
      goals.length === 1
        ? (cell: Cell) =>
            Math.abs(goals[0]!.x - cell.x) + Math.abs(goals[0]!.z - cell.z)
        : (cell: Cell) => {
            let minimum = Number.POSITIVE_INFINITY
            for (const goal of goals) {
              const distance =
                Math.abs(goal.x - cell.x) + Math.abs(goal.z - cell.z)
              if (distance < minimum) minimum = distance
            }
            return minimum
          }
    let nearestGoal = Number.POSITIVE_INFINITY
    for (const goal of goals) {
      const distance =
        Math.abs(goal.x - start.x) + Math.abs(goal.z - start.z)
      if (distance < nearestGoal) nearestGoal = distance
    }
    const search = (allowGrass: boolean, maxCost?: number) =>
      findWeightedPath(
        {
          start,
          key: (cell) => this.packCell(cell),
          isGoal: (cell) => goalKeys.has(this.packCell(cell)),
          neighbors: (cell) =>
            this.getPedestrianNeighbors(cell, {
              allowQueue,
              allowCamping: campingAllowed,
              allowMedical: medicalAllowed,
              allowFestival: festivalAllowed,
              ignoreDirectionalRestrictions,
              allowGrass,
              allowStaff,
            }),
          movementCost,
          maxVisited,
          heuristic,
          maxCost,
        },
        this.pedestrianPathScratch,
      )
    const result =
      search(false) ??
      (maxVisited === undefined ? search(
        true,
        nearestGoal * SIMULATION_CONFIG.pathfinding.grassCostMultiplier * 1.6 +
          24,
      ) : null)
    if (
      this.pedestrianPathCache.size >=
      SIMULATION_CONFIG.pathfinding.pathCacheLimit
    ) {
      // Evict one entry, not every route used by the crowd.
      this.pedestrianPathCache.delete(this.pedestrianPathCache.keys().next().value!)
    }
    // A budget-limited miss says nothing about reachability; never cache it.
    if (maxVisited === undefined || result) this.pedestrianPathCache.set(
      accessCacheKey,
      {
        path: result ? result.map((cell) => ({ ...cell })) : null,
        expires: this.state.simTick + SIMULATION_CONFIG.pathfinding.pathCacheLifetimeTicks +
          (this.packCell(start) % SIMULATION_CONFIG.pathfinding.pathCacheLifetimeTicks),
      },
    )
    return this.clonePedestrianPath(result)
  }

  private getPedestrianPathCacheKey(
    start: Cell,
    goals: readonly Cell[],
    flags: {
      allowQueue: boolean
      allowCamping: boolean
      allowMedical: boolean
      allowFestival: boolean
      ignoreDirectionalRestrictions: boolean
    },
  ): string {
    const packedGoals = goals
      .map((cell) => this.packCell(cell))
      .sort((left, right) => left - right)
    const flagBits =
      (flags.allowQueue ? 1 : 0) |
      (flags.allowCamping ? 2 : 0) |
      (flags.allowMedical ? 4 : 0) |
      (flags.allowFestival ? 8 : 0) |
      (flags.ignoreDirectionalRestrictions ? 16 : 0)
    return `${this.packCell(start)}:${packedGoals.join(',')}:${flagBits}`
  }

  private clonePedestrianPath(path: readonly Cell[] | null): Cell[] | null {
    return path ? path.map((cell) => ({ ...cell })) : null
  }

  private visitorDecisionRng(visitor: Visitor): () => number {
    return createSeededRng(
      (visitor.pathSeed + visitor.wanderNonce * 0x9e3779b9) >>> 0,
    )
  }

  private assignDeterministicWander(
    visitor: Visitor,
    rng = this.visitorDecisionRng(visitor),
  ): void {
    const config = SIMULATION_CONFIG.pathfinding
    const span = config.wanderMaxSteps - config.wanderMinSteps + 1
    const steps = config.wanderMinSteps + Math.floor(rng() * span)
    visitor.route = this.pickSeededWalk(
      {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
      },
      steps,
      rng,
      {
        allowCamping: Boolean(this.getCampingCellAt(visitor.cellX, visitor.cellZ)),
        allowMedical: Boolean(this.getMedicalCellAt(visitor.cellX, visitor.cellZ)),
        allowFestival: Boolean(
          this.getStageForecourtCellAt(visitor.cellX, visitor.cellZ),
        ),
      },
    )
    visitor.state = 'exploring'
    visitor.targetId = null
    visitor.wanderNonce += 1
  }

  private pickSeededWalk(
    start: Cell,
    steps: number,
    rng: () => number,
    options: {
      allowCamping?: boolean
      allowMedical?: boolean
      allowFestival?: boolean
    },
    previous: Cell | null = null,
  ): Cell[] {
    const route: Cell[] = []
    let current: Cell = { ...start }
    let last = previous ? { ...previous } : null
    for (let step = 0; step < steps; step += 1) {
      const neighbors = this.getPedestrianNeighbors(current, {
        allowCamping:
          options.allowCamping ??
          Boolean(this.getCampingCellAt(current.x, current.z)),
        allowMedical: options.allowMedical ?? false,
        allowFestival:
          options.allowFestival ??
          Boolean(this.getStageForecourtCellAt(current.x, current.z)),
      })
      if (neighbors.length === 0) break
      const forward = last
        ? neighbors.filter(
            (cell) => cell.x !== last!.x || cell.z !== last!.z,
          )
        : neighbors
      const choices = forward.length > 0 ? forward : neighbors
      const next = choices[Math.floor(rng() * choices.length)]
      if (!next) break
      const copied = {
        x: next.x,
        z: next.z,
        elevation: next.elevation,
      }
      route.push(copied)
      last = current
      current = copied
    }
    return route
  }

  private finishInteraction(visitor: Visitor): void {
    const target = this.state.buildings.find((building) => building.id === visitor.targetId)
    const supply = target?.kind === 'food' ? 'food' : target?.kind === 'alcohol' ? 'drinks' : null
    const available = !supply || !!target && localStock(this.state, target.id, supply) >= 1
    if (!available) this.state.festival.metrics.stockouts++
    const paid =
      target && available &&
      this.chargeVisitor(visitor, target.price, {
        x: target.x + 0.5,
        y: target.elevation + BUILDINGS[target.kind].height,
        z: target.z + 0.5,
      })
    if (paid && supply && target) consumeLocal(this.state, target.id, supply)
    if (target?.kind === 'food' && paid) {
      addItem(visitor.inventory, 'food')
      visitor.thought = 'Ich habe Essen gekauft und suche einen Platz zum Essen.'
    } else if (target?.kind === 'toilet' && paid) {
      visitor.needs.toilet = SIMULATION_CONFIG.needs.toilet.toilet
      visitor.thought = 'Das war dringend nötig.'
    } else if (target?.kind === 'ride' && paid) {
      visitor.needs.fun = SIMULATION_CONFIG.needs.ride.fun
      visitor.needs.energy = Math.max(
        0,
        visitor.needs.energy - SIMULATION_CONFIG.needs.ride.energyCost,
      )
      this.incidents.addRideNausea(
        visitor,
        SIMULATION_CONFIG.nausea.carouselIntensity,
      )
      visitor.thought = 'Das Karussell war großartig!'
    } else if (target?.kind === 'alcohol' && paid) {
      addItem(visitor.inventory, 'alcohol')
      visitor.thought = 'Ich habe ein Getränk gekauft und trinke es gleich in Ruhe.'
    } else if (target && !paid) {
      visitor.thought = available ? 'Dafür reicht mein Budget nicht.' : 'Ausverkauft! Hier fehlt Nachschub.'
      visitor.emotion = 'sad'
      visitor.emotionMinutes = 45
    }

    const purchasedConsumable =
      Boolean(paid) &&
      (target?.kind === 'food' || target?.kind === 'alcohol')
    visitor.targetId = null
    if (purchasedConsumable) {
      // Clear the counter before eating or drinking; avoid occupying the service tile.
      const route: Cell[] = []
      let cell = { x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation }
      const visited = new Set([this.packCell(cell)])
      for (let step = 0; step < 4; step++) {
        const candidates = [...this.getPedestrianNeighbors(cell, { allowGrass: false })]
          .filter(next => !visited.has(this.packCell(next)))
          .sort((a, b) => (this.movementOccupancy.get(this.packCell(a)) ?? 0) - (this.movementOccupancy.get(this.packCell(b)) ?? 0))
        if (!candidates.length) break
        cell = { ...candidates[0]! }; route.push(cell); visited.add(this.packCell(cell))
      }
      if (route.length) {
        this.clearVisitorActivity(visitor)
        visitor.state = 'exploring'; visitor.route = route
        visitor.thought = 'Ich mache den Stand frei und suche einen Platz zum Essen oder Trinken.'
      } else this.beginStationaryBreak(visitor, visitor.thought)
      return
    }
    visitor.state = 'exploring'
    visitor.interactionRemaining = 0
    this.decideNextAction(visitor)
  }

  private decayNeeds(visitor: Visitor, minutes: number): void {
    const config = SIMULATION_CONFIG.needs
    visitor.needs.hunger = Math.max(
      0,
      visitor.needs.hunger - minutes * config.hungerDecayPerMinute,
    )
    visitor.needs.toilet = Math.max(
      0,
      visitor.needs.toilet - minutes * config.toiletDecayPerMinute,
    )
    visitor.needs.fun = Math.max(
      0,
      visitor.needs.fun - minutes * config.funDecayPerMinute,
    )
    const alcoholEnergyDrain =
      (visitor.alcoholLevel / 100) * config.alcoholEnergyDecayPerMinute
    visitor.needs.energy = Math.max(
      0,
      visitor.needs.energy -
        minutes * (config.baseEnergyDecayPerMinute + alcoholEnergyDrain),
    )
  }

  private canBeginStreaking(visitor: Visitor): boolean {
    const config = SIMULATION_CONFIG.alcohol.streaking
    if (visitor.streakingMinutes > 0 || visitor.streakingCooldownMinutes > 0) {
      return false
    }
    if (
      visitor.alcoholLevel < config.minimumAlcohol ||
      visitor.alcoholLevel > config.maximumAlcohol ||
      visitor.needs.energy < config.minimumEnergy
    ) {
      return false
    }
    if (visitor.hasHandcart) return false
    return (
      visitor.state === 'exploring' ||
      visitor.state === 'seeking' ||
      visitor.state === 'partying' ||
      visitor.state === 'socializing' ||
      visitor.state === 'relaxing' ||
      visitor.state === 'bench-resting' ||
      visitor.state === 'entering'
    )
  }

  private updateStreaking(visitor: Visitor, minutes: number): void {
    const config = SIMULATION_CONFIG.alcohol.streaking
    visitor.streakingCooldownMinutes = Math.max(
      0,
      visitor.streakingCooldownMinutes - minutes,
    )
    if (visitor.streakingMinutes > 0) {
      visitor.streakingMinutes = Math.max(0, visitor.streakingMinutes - minutes)
      visitor.emotion = 'excited'
      visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 6)
      visitor.needs.fun = Math.min(
        100,
        visitor.needs.fun + minutes * config.selfFunPerMinute,
      )
      visitor.thought = 'Nackt durchs Festival! Wer macht mit?'
      this.spreadStreakingFun(visitor, minutes)
      if (visitor.streakingMinutes <= 0) {
        visitor.streakingCooldownMinutes = config.cooldownMinutes
        visitor.emotion = 'happy'
        visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 18)
        visitor.thought = 'Okay, das war vielleicht etwas zu viel.'
      }
      return
    }
    if (!this.canBeginStreaking(visitor)) return
    if (this.rng.next() >= Math.min(1, minutes * config.chancePerMinute)) return
    this.beginStreaking(visitor)
  }

  private beginStreaking(visitor: Visitor): void {
    const config = SIMULATION_CONFIG.alcohol.streaking
    this.removeVisitorFromCoasterQueues(visitor.id)
    this.clearVisitorActivity(visitor)
    visitor.state = 'exploring'
    visitor.targetId = null
    visitor.isConversing = false
    visitor.streakingMinutes =
      config.durationMinimum + this.rng.next() * config.durationRandomRange
    visitor.emotion = 'excited'
    visitor.emotionMinutes = visitor.streakingMinutes + 8
    visitor.thought = 'Nackt durchs Festival! Wer macht mit?'
    this.continueStreakingRun(visitor)
  }

  private continueStreakingRun(visitor: Visitor): void {
    visitor.state = 'exploring'
    visitor.targetId = null
    visitor.isDancing = false
    visitor.route = this.pickStreakingRoute(visitor)
  }

  private pickStreakingRoute(visitor: Visitor): Cell[] {
    const rng = this.visitorDecisionRng(visitor)
    visitor.wanderNonce += 1
    return this.pickSeededWalk(
      {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
      },
      6 + Math.floor(rng() * 5),
      rng,
      {
        allowCamping: Boolean(this.getCampingCellAt(visitor.cellX, visitor.cellZ)),
        allowMedical: false,
        allowFestival: true,
      },
      visitor.route[0] ?? null,
    )
  }

  private spreadStreakingFun(source: Visitor, minutes: number): void {
    const config = SIMULATION_CONFIG.alcohol.streaking
    this.state.visitors.forEach((other) => {
      if (other.id === source.id) return
      if (
        other.state === 'sleeping' ||
        other.state === 'riding' ||
        other.state === 'medical' ||
        other.state === 'injured' ||
        other.state === 'vehicle-arrival' ||
        other.state === 'bus-riding'
      ) {
        return
      }
      const distance =
        Math.abs(other.cellX - source.cellX) +
        Math.abs(other.cellZ - source.cellZ)
      if (distance > config.auraRadius) return
      other.needs.fun = Math.min(
        100,
        other.needs.fun + minutes * config.nearbyFunPerMinute,
      )
      if (other.emotion !== 'angry' && other.emotion !== 'sad') {
        other.emotion = distance <= 1 ? 'excited' : 'happy'
        other.emotionMinutes = Math.max(other.emotionMinutes, 8)
      }
    })
  }

  private updateAlcoholBehavior(visitor: Visitor): boolean {
    const config = SIMULATION_CONFIG.alcohol
    if (
      visitor.alcoholLevel >= config.passOutThreshold &&
      visitor.needs.energy <= config.passOutEnergyThreshold &&
      !visitor.campsite &&
      visitor.state !== 'riding' &&
      visitor.state !== 'camping'
    ) {
      this.removeVisitorFromCoasterQueues(visitor.id)
      visitor.streakingMinutes = 0
      visitor.state = 'sleeping'
      visitor.route = []
      visitor.targetId = null
      visitor.thought = 'Ich muss mich kurz hinlegen …'
      visitor.emotion = 'sad'
      visitor.emotionMinutes = 60
      return true
    }
    if (
      visitor.alcoholLevel < config.drunkBehaviorThreshold ||
      visitor.state === 'riding'
    ) {
      return false
    }
    if (visitor.alcoholDisposition === 'aggressive') {
      visitor.emotion = 'angry'
      visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 12)
      if (visitor.alcoholLevel >= config.veryDrunkBehaviorThreshold) {
        visitor.thought = 'Lasst mich durch!'
      }
    } else {
      visitor.emotion =
        visitor.alcoholLevel >= config.veryDrunkBehaviorThreshold
          ? 'excited'
          : 'happy'
      visitor.emotionMinutes = Math.max(visitor.emotionMinutes, 12)
      if (visitor.alcoholLevel >= config.veryDrunkBehaviorThreshold) {
        visitor.thought = 'Was für ein großartiges Festival!'
      }
    }
    return false
  }

  private updateVisitorEmotion(visitor: Visitor, minutes: number): void {
    if (visitor.emotionMinutes > 0) {
      visitor.emotionMinutes = Math.max(0, visitor.emotionMinutes - minutes)
      return
    }
    const values = Object.values(visitor.needs)
    const minimum = Math.min(...values)
    const average = values.reduce((total, value) => total + value, 0) / values.length
    const emotions = SIMULATION_CONFIG.visitors.emotions
    visitor.emotion =
      minimum < emotions.angryNeedBelow
        ? 'angry'
        : average < emotions.sadAverageBelow
          ? 'sad'
          : average > emotions.happyAverageAbove
            ? 'happy'
            : 'neutral'
  }

  private runEconomy(hours: number): void {
    const hourlyUpkeep = this.state.buildings.reduce(
      (total, item) => total + BUILDINGS[item.kind].upkeep + (item.stageDesign ? stageStats(item.stageDesign).upkeep : 0),
      0,
    )
    const staffWages = this.state.staff.reduce(
      (total, member) => total + STAFF_DEFINITIONS[member.role].hourlyWage,
      0,
    )
    this.state.money -= (hourlyUpkeep + staffWages) * hours
    if (this.state.power.backupActive) {
      this.state.money -= SIMULATION_CONFIG.power.backupFuelPerHour * hours
    }
    this.recalculatePark()
  }

  private recalculatePark(): void {
    if (this.state.visitors.length === 0) {
      this.state.reputation = Math.min(
        100,
        SIMULATION_CONFIG.economy.emptyParkBaseReputation +
          this.getTotalAppeal(),
      )
      return
    }
    const averageSatisfaction =
      this.state.visitors.reduce((total, visitor) => {
        const needs = Object.values(visitor.needs)
        return total + needs.reduce((sum, need) => sum + need, 0) / needs.length
      }, 0) / this.state.visitors.length
    this.state.reputation = Math.round(Math.min(100, averageSatisfaction))
  }

  private getTotalAppeal(): number {
    const buildingAppeal = this.state.buildings.reduce(
      (total, building) => total + BUILDINGS[building.kind].appeal,
      0,
    )
    return (
      buildingAppeal +
      this.state.coasters.length * SIMULATION_CONFIG.economy.coasterAppeal
    )
  }

  private getPedestrianNeighbors(
    cell: Cell,
    options: {
      allowQueue?: boolean
      allowCamping?: boolean
      allowMedical?: boolean
      allowFestival?: boolean
      ignoreDirectionalRestrictions?: boolean
      allowGrass?: boolean
      allowStaff?: boolean
    } = {},
  ): Cell[] {
    const node = this.getPedestrianNavNode(cell)
    const neighbors = this.neighborScratch
    neighbors.length = 0
    if (!node) return neighbors
    const allowQueue = options.allowQueue ?? false
    const allowCamping = Boolean(options.allowCamping)
    const allowMedical = Boolean(options.allowMedical)
    const allowGrass = options.allowGrass ?? true
    const ignoreDirectional = options.ignoreDirectionalRestrictions ?? false
    const campingHere = (node.flags & NAV_CAMPING) !== 0
    const seen = this.neighborSeen
    seen.clear()
    for (let index = 0; index < node.links.length; index += 1) {
      const link = node.links[index]!
      const dest = link.node
      if (dest.path?.staffOnly && !options.allowStaff) continue
      if ((dest.flags & NAV_SOLID) !== 0) continue
      if ((dest.flags & NAV_WATER) !== 0 && (dest.flags & NAV_PATH) === 0) continue
      if (!allowCamping && (dest.flags & NAV_CAMPING) !== 0) continue
      if (!allowMedical && (dest.flags & NAV_MEDICAL) !== 0) continue
      if (!allowGrass && (dest.flags & NAV_PAVED) === 0) continue
      if (campingHere && Math.abs(dest.cell.elevation - node.cell.elevation) >= 0.01) {
        continue
      }
      if (
        link.toPath &&
        !this.canTraversePath(
          node.path,
          link.toPath,
          node.cell.x,
          node.cell.z,
          allowQueue,
          ignoreDirectional,
        )
      ) {
        continue
      }
      if (this.isCachedEdgeBlocked(node, dest)) continue
      if (seen.has(dest.packed)) continue
      seen.add(dest.packed)
      neighbors.push(dest.cell)
    }
    return neighbors
  }

  private isCachedEdgeBlocked(
    from: PedestrianNavNode,
    to: PedestrianNavNode,
  ): boolean {
    const direction = this.getDirectionIndex(
      to.cell.x - from.cell.x,
      to.cell.z - from.cell.z,
    )
    if (direction < 0) return false
    const bit = directionBit(direction as Direction)
    const opposite = directionBit(oppositeDirection(direction as Direction))
    if ((from.flags & NAV_GROUND) !== 0 && (from.roadBlocked & bit) !== 0) {
      return true
    }
    if ((to.flags & NAV_GROUND) !== 0 && (to.roadBlocked & opposite) !== 0) {
      return true
    }
    return (from.fenceMask & bit) !== 0 || (to.fenceMask & opposite) !== 0
  }

  private getPedestrianNavNode(cell: Cell): PedestrianNavNode | undefined {
    this.ensurePedestrianNav(false)
    return this.pedestrianNav.get(this.packCell(cell))
  }

  private getPedestrianNavKey(): string {
    let structure = 0
    for (const building of this.state.buildings) {
      if (
        building.kind !== 'path' &&
        building.kind !== 'fence' &&
        !PEDESTRIAN_SOLID_KINDS.has(building.kind)
      ) {
        continue
      }
      structure =
        (structure +
          this.packXZ(building.x, building.z) +
          building.rotation +
          Math.round(building.elevation * 8) +
          (building.pathType === 'queue' ? 5 : 1) +
          (building.pathSlope ?? 0) * 11) |
        0
    }
    for (const road of this.state.logistics.roadCells) {
      structure = (structure + road.x * 13 + road.z * 17 + road.blockedEdges) | 0
    }
    return [
      this.state.buildings.length,
      this.state.logistics.roadCells.length,
      this.state.logistics.parkingCells.length,
      this.state.campingCells.length,
      this.state.medicalCells.length,
      this.state.stageForecourtCells.length,
      this.cachedWorldSize,
      this.terrainHeights?.byteLength ?? 0,
      structure,
    ].join(':')
  }

  private ensurePedestrianNav(revalidate: boolean): void {
    if (revalidate) {
      const key = `${this.worldRevision}:${this.getPedestrianNavKey()}`
      if (key === this.pedestrianNavKey && this.pedestrianNav.size > 0) return
      this.pedestrianNavKey = key
      this.rebuildPedestrianNav()
      this.lastNavRevision = this.worldRevision
      return
    }
    if (this.pedestrianNav.size === 0) this.rebuildPedestrianNav()
  }

  private rebuildPedestrianNav(): void {
    this.ensureSpatialIndexes()
    this.pedestrianNav.clear()
    this.pedestrianPathCache.clear()
    const size = this.getWorldSize()
    const half = size / 2
    const addNode = (x: number, z: number, elevation: number): void => {
      const packed = this.packCell({ x, z, elevation })
      if (this.pedestrianNav.has(packed)) return
      const path = this.getPathAt(x, z, elevation)
      const height = this.getTerrainHeight(x, z)
      const ground = Math.abs(elevation - height) < 0.51
      const road = ground ? this.getRoadCellAt(x, z) : undefined
      const camping = this.getCampingCellAt(x, z)
      const medical = this.getMedicalCellAt(x, z)
      const forecourt = this.getStageForecourtCellAt(x, z)
      const parking = this.hasParkingAt(x, z)
      const water = isWaterHeight(height) && !path
      let flags = 0
      if (path) flags |= NAV_PATH
      if (road) flags |= NAV_ROAD
      if (camping) flags |= NAV_CAMPING
      if (medical) flags |= NAV_MEDICAL
      if (forecourt) flags |= NAV_FORECOURT
      if (parking) flags |= NAV_PARKING
      if (water) flags |= NAV_WATER
      if (ground) flags |= NAV_GROUND
      if (this.isPedestrianSolidAt(x, z, elevation)) flags |= NAV_SOLID
      if (path || road || camping || medical || forecourt || parking) flags |= NAV_PAVED
      let fenceMask = 0
      for (const building of this.getBuildingsAtCell(x, z)) {
        if (
          building.kind === 'fence' &&
          Math.abs(building.elevation - elevation) < 0.51
        ) {
          fenceMask |= directionBit(building.rotation as Direction)
        }
      }
      this.pedestrianNav.set(packed, {
        cell: { x, z, elevation },
        packed,
        flags,
        cost: this.getPedestrianSurfaceCost({ x, z, elevation }),
        fenceMask,
        roadBlocked: road ? road.blockedEdges : 0,
        path,
        links: [],
      })
    }
    for (let z = -half; z < half; z += 1) {
      for (let x = -half; x < half; x += 1) {
        addNode(x, z, this.getTerrainHeight(x, z))
      }
    }
    this.state.buildings.forEach((building) => {
      if (building.kind === 'path') addNode(building.x, building.z, building.elevation)
    })
    this.pedestrianNav.forEach((node) => {
      for (const [dx, dz] of PEDESTRIAN_OFFSETS) {
        const nx = node.cell.x + dx
        const nz = node.cell.z + dz
        for (const building of this.getBuildingsAtCell(nx, nz)) {
          if (building.kind !== 'path') continue
          if (Math.abs(building.elevation - node.cell.elevation) > 1) continue
          const dest = this.pedestrianNav.get(
            this.packCell({
              x: building.x,
              z: building.z,
              elevation: building.elevation,
            }),
          )
          if (!dest) continue
          node.links.push({ node: dest, toPath: building })
        }
        if ((node.flags & NAV_GROUND) === 0) continue
        const neighborGround = this.getTerrainHeight(nx, nz)
        if (Math.abs(neighborGround - node.cell.elevation) > 1) continue
        const dest = this.pedestrianNav.get(
          this.packCell({ x: nx, z: nz, elevation: neighborGround }),
        )
        if (!dest) continue
        node.links.push({ node: dest })
      }
    })
  }

  private isPedestrianSolidAt(x: number, z: number, elevation: number): boolean {
    if (this.state.festival.infrastructure.depots.some(d => d.x === x && d.z === z) && elevation < this.getTerrainHeight(x, z) + 1) return true
    for (const building of this.getBuildingsAtCell(x, z)) {
      if (
        PEDESTRIAN_SOLID_KINDS.has(building.kind) &&
        !isStageAudienceCell(building,x,z) &&
        this.volumesOverlap(building, elevation, 0.28)
      ) {
        return true
      }
    }
    return (
      this.state.coasters.length > 0 &&
      this.coasterOccupiesVolume(x, z, elevation, 0.28)
    )
  }

  private isPedestrianEdgeBlocked(from: Cell, to: Cell): boolean {
    const direction = this.getDirectionIndex(to.x - from.x, to.z - from.z) as Direction
    const opposite = oppositeDirection(direction)
    const fromRoad = this.getRoadCellAt(from.x, from.z)
    const toRoad = this.getRoadCellAt(to.x, to.z)
    if (
      fromRoad &&
      this.isAtTerrainLevel(from.x, from.z, from.elevation) &&
      (fromRoad.blockedEdges & directionBit(direction)) !== 0
    ) {
      return true
    }
    if (
      toRoad &&
      this.isAtTerrainLevel(to.x, to.z, to.elevation) &&
      (toRoad.blockedEdges & directionBit(opposite)) !== 0
    ) {
      return true
    }
    return (
      this.hasFenceToward(from.x, from.z, from.elevation, direction) ||
      this.hasFenceToward(to.x, to.z, to.elevation, opposite)
    )
  }

  private hasFenceToward(
    x: number,
    z: number,
    elevation: number,
    direction: Direction,
  ): boolean {
    for (const building of this.getBuildingsAtCell(x, z)) {
      if (
        building.kind === 'fence' &&
        building.rotation === direction &&
        Math.abs(building.elevation - elevation) < 0.51
      ) {
        return true
      }
    }
    return false
  }

  private getPedestrianSurfaceCost(cell: Cell): number {
    const speed = cell.elevation > this.getTerrainHeight(cell.x, cell.z) ? 1 : wayInfo(this.state, cell.x, cell.z, 'foot', this.getPathAt(cell.x, cell.z, cell.elevation)?.wayType).speed
    return this.getBasePedestrianSurfaceCost(cell) / Math.min(1, speed)
  }

  private getBasePedestrianSurfaceCost(cell: Cell): number {
    const path = this.getPathAt(cell.x, cell.z, cell.elevation)
    const height = this.getTerrainHeight(cell.x, cell.z)
    if (isWaterHeight(height) && !path) return Number.POSITIVE_INFINITY
    const mud = isMudHeight(height)
    const road = this.getRoadCellAt(cell.x, cell.z)
    if (path && road) {
      return mud ? SIMULATION_CONFIG.terrain.mudPavedCostMultiplier : 1
    }
    if (road) {
      const roadCost = road.crosswalk
        ? SIMULATION_CONFIG.logistics.crosswalkRoadCostMultiplier
        : SIMULATION_CONFIG.logistics.pedestrianRoadCostMultiplier
      return mud
        ? roadCost * SIMULATION_CONFIG.terrain.mudPavedCostMultiplier
        : roadCost
    }
    if (path) {
      return mud ? SIMULATION_CONFIG.terrain.mudPavedCostMultiplier : 1
    }
    if (this.hasParkingAt(cell.x, cell.z)) {
      return mud
        ? SIMULATION_CONFIG.terrain.mudPathCostMultiplier
        : SIMULATION_CONFIG.pathfinding.parkingCostMultiplier
    }
    return mud
      ? SIMULATION_CONFIG.terrain.mudPathCostMultiplier
      : SIMULATION_CONFIG.pathfinding.grassCostMultiplier
  }

  private canTraversePath(
    from: PlacedBuilding | undefined,
    to: PlacedBuilding,
    fromX: number,
    fromZ: number,
    allowQueue: boolean,
    ignoreDirectionalRestrictions = false,
  ): boolean {
    if (!allowQueue && (from?.pathType === 'queue' || to.pathType === 'queue')) return false
    const direction = this.getDirectionIndex(to.x - fromX, to.z - fromZ)
    if (!ignoreDirectionalRestrictions && !allowsPathFlow(from, to, direction)) return false
    const fromGate = this.getSecurityGateAt(fromX, fromZ, from?.elevation)
    const toGate = this.getSecurityGateAt(to.x, to.z, to.elevation)
    if (
      !ignoreDirectionalRestrictions &&
      ((fromGate && fromGate.rotation !== direction) ||
        (toGate && toGate.rotation !== direction))
    ) {
      return false
    }
    const elevationDelta = to.elevation - (from?.elevation ?? to.elevation)
    if (elevationDelta !== 0) {
      const entersBuiltRamp =
        to.pathSlope === elevationDelta && to.pathSlopeDirection === direction
      const leavesBuiltRampBackwards =
        from?.pathSlope === -elevationDelta &&
        from.pathSlopeDirection === (direction + 2) % 4
      if (!entersBuiltRamp && !leavesBuiltRampBackwards) return false
    }
    if (!ignoreDirectionalRestrictions && from?.pathType === 'queue') {
      return from.queueDirection === direction
    }
    if (!ignoreDirectionalRestrictions && to.pathType === 'queue') {
      return to.queueEntryDirection === direction
    }
    return true
  }

  private recalculateQueueDirections(): void {
    const queuePaths = this.state.buildings.filter(
      (building) => building.kind === 'path' && building.pathType === 'queue',
    )
    queuePaths.forEach((path) => {
      path.queueDirection = undefined
      path.queueEntryDirection = undefined
    })
    const claimed = new Set<string>()

    this.state.coasters.forEach((coaster) => {
      if (!coaster.entrance) return
      const pending: Array<{
        path: PlacedBuilding
        target: { x: number; z: number }
      }> = this.getAccessPathNeighbors(coaster.entrance)
        .map((cell) => this.getPathAt(cell.x, cell.z, cell.elevation))
        .filter(
          (path): path is PlacedBuilding =>
            Boolean(path && path.pathType === 'queue' && !claimed.has(path.id)),
        )
        .map((path) => ({
          path,
          target: { x: coaster.entrance!.x, z: coaster.entrance!.z },
        }))

      while (pending.length > 0) {
        const entry = pending.shift()
        if (!entry || claimed.has(entry.path.id)) continue
        entry.path.queueDirection = this.getDirectionIndex(
          entry.target.x - entry.path.x,
          entry.target.z - entry.path.z,
        )
        claimed.add(entry.path.id)
        this.getAdjacentQueuePaths(entry.path).forEach((neighbor) => {
          if (claimed.has(neighbor.id)) return
          pending.push({
            path: neighbor,
            target: { x: entry.path.x, z: entry.path.z },
          })
        })
      }
    })

    queuePaths.forEach((path) => {
      if (!claimed.has(path.id) || path.queueDirection === undefined) return
      const hasIncomingQueue = this.getAdjacentQueuePaths(path).some((candidate) => {
        const directionToPath = this.getDirectionIndex(
          path.x - candidate.x,
          path.z - candidate.z,
        )
        return candidate.queueDirection === directionToPath
      })
      if (hasIncomingQueue) return

      const normalNeighbors = this.state.buildings
        .filter(
          (candidate) =>
            candidate.kind === 'path' &&
            candidate.pathType !== 'queue' &&
            Math.abs(candidate.x - path.x) + Math.abs(candidate.z - path.z) === 1 &&
            this.pathsShareEdge(candidate, path),
        )
        .map((candidate) => ({
          candidate,
          entryDirection: this.getDirectionIndex(
            path.x - candidate.x,
            path.z - candidate.z,
          ),
          queueToPathDirection: this.getDirectionIndex(
            candidate.x - path.x,
            candidate.z - path.z,
          ),
        }))
        .filter((entry) => entry.queueToPathDirection !== path.queueDirection)
        .sort((left, right) => {
          const preferred = (path.queueDirection! + 2) % 4
          return (
            Number(right.queueToPathDirection === preferred) -
            Number(left.queueToPathDirection === preferred)
          )
        })
      path.queueEntryDirection = normalNeighbors[0]?.entryDirection
    })
  }

  private getAdjacentQueuePaths(path: PlacedBuilding): PlacedBuilding[] {
    return this.state.buildings.filter(
      (candidate) =>
        candidate.kind === 'path' &&
        candidate.pathType === 'queue' &&
        Math.abs(candidate.x - path.x) + Math.abs(candidate.z - path.z) === 1 &&
        this.pathsShareEdge(path, candidate),
    )
  }

  private pathsShareEdge(from: PlacedBuilding, to: PlacedBuilding): boolean {
    const elevationDelta = to.elevation - from.elevation
    if (elevationDelta === 0) return true
    const direction = this.getDirectionIndex(to.x - from.x, to.z - from.z)
    return (
      (to.pathSlope === elevationDelta && to.pathSlopeDirection === direction) ||
      (from.pathSlope === -elevationDelta &&
        from.pathSlopeDirection === (direction + 2) % 4)
    )
  }

  private getDirectionIndex(deltaX: number, deltaZ: number): number {
    if (deltaZ > 0) return 0
    if (deltaX > 0) return 1
    if (deltaZ < 0) return 2
    return 3
  }

  private getAccessPathNeighbors(access: { x: number; y: number; z: number }): Cell[] {
    const positions = [
      { x: access.x - 1, z: access.z },
      { x: access.x + 1, z: access.z },
      { x: access.x, z: access.z - 1 },
      { x: access.x, z: access.z + 1 },
    ]
    return this.state.buildings
      .filter(
        (building) =>
          building.kind === 'path' &&
          building.elevation === access.y &&
          positions.some(
            (position) => position.x === building.x && position.z === building.z,
          ),
      )
      .map((building) => ({
        x: building.x,
        z: building.z,
        elevation: building.elevation,
      }))
  }

  private relocateVisitorsFromPath(path: PlacedBuilding): void {
    const nearestPath = this.state.buildings
      .filter(
        (building) =>
          building.kind === 'path' &&
          building.id !== path.id &&
          building.pathType !== 'queue',
      )
      .sort(
        (left, right) =>
          Math.hypot(
            left.x - path.x,
            left.z - path.z,
            left.elevation - path.elevation,
          ) -
          Math.hypot(
            right.x - path.x,
            right.z - path.z,
            right.elevation - path.elevation,
          ),
      )[0]
    const fallback: Cell = nearestPath
      ? { x: nearestPath.x, z: nearestPath.z, elevation: nearestPath.elevation }
      : this.getEntrance()
    this.state.visitors.forEach((visitor) => {
      if (
        visitor.cellX !== path.x ||
        visitor.cellZ !== path.z ||
        visitor.cellElevation !== path.elevation
      ) {
        return
      }
      if (visitor.state === 'riding') return
      this.state.coasters.forEach((coaster) => {
        coaster.queue = coaster.queue.filter((visitorId) => visitorId !== visitor.id)
      })
      visitor.route = [fallback]
      visitor.targetId = null
      visitor.state = 'exiting'
      visitor.movementBoostMinutes =
        SIMULATION_CONFIG.visitors.movement.evacuationBoostMinutes
      visitor.thought = 'Der Weg ist weg – ich suche schnell sicheren Boden!'
    })
  }

  private removeVisitorFromCoasterQueues(visitorId: string): void {
    this.state.coasters.forEach((coaster) => {
      coaster.queue = coaster.queue.filter((queuedId) => queuedId !== visitorId)
    })
  }

  private getAccessCell(
    x: number,
    z: number,
    elevation: number,
    rotation: number,
  ): Cell {
    const directions = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ]
    const direction = directions[rotation % directions.length] ?? directions[0]
    if (!direction) return { x, z: z + 1, elevation }
    return { x: x + direction.x, z: z + direction.z, elevation }
  }

  private findBenchRotation(x: number, z: number): number | null {
    const directions = [
      { x: 0, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: -1, z: 0 },
    ]
    for (let rotation = 0; rotation < directions.length; rotation += 1) {
      const direction = directions[rotation]!
      const edgeX = x + direction.x
      const edgeZ = z + direction.z
      if (
        !this.getAt(edgeX, edgeZ) &&
        !this.getCampingCellAt(edgeX, edgeZ) &&
        !this.getMedicalCellAt(edgeX, edgeZ) &&
        !this.getStageForecourtCellAt(edgeX, edgeZ)
      ) {
        return rotation
      }
    }
    return null
  }

  private isAtEntrance(visitor: Visitor): boolean {
    return this.isAtParkExit(visitor)
  }

  private isAtParkExit(visitor: Visitor): boolean {
    const entrance = this.getEntrance()
    if (visitor.cellX === entrance.x && visitor.cellZ === entrance.z) return true
    const path =
      this.getPathAt(visitor.cellX, visitor.cellZ, visitor.cellElevation) ??
      this.getPathAt(visitor.cellX, visitor.cellZ)
    if (path?.id === ENTRANCE_PATH_ID) return true
    return Boolean(path) && visitor.cellZ === -this.getWorldSize() / 2
  }

  private packXZ(x: number, z: number): number {
    return ((x + 128) & 255) | (((z + 128) & 255) << 8)
  }

  private packCell(cell: { x: number; z: number; elevation: number }): number {
    return this.packXZ(cell.x, cell.z) | ((Math.round(cell.elevation) + 16) << 16)
  }

  private getBuildingsAtCell(x: number, z: number): readonly PlacedBuilding[] {
    this.ensureSpatialIndexes()
    return this.buildingCellIndex.get(this.packXZ(x, z)) ?? []
  }

  private hasParkingAt(x: number, z: number): boolean {
    this.ensureSpatialIndexes()
    return this.parkingIndex.has(this.packXZ(x, z))
  }

  private ensureSpatialIndexes(): void {
    if (this.indexedBuildingCount !== this.state.buildings.length) {
      this.buildingCellIndex.clear()
      this.pathExactIndex.clear()
      this.state.buildings.forEach((building) => {
        for(const cell of buildingFootprint(building)) {
          const key = this.packXZ(cell.x, cell.z)
          const bucket = this.buildingCellIndex.get(key)
          if (bucket) bucket.push(building)
          else this.buildingCellIndex.set(key, [building])
        }
        if (building.kind === 'path') {
          this.pathExactIndex.set(
            this.packCell({
              x: building.x,
              z: building.z,
              elevation: building.elevation,
            }),
            building,
          )
        }
      })
      this.indexedBuildingCount = this.state.buildings.length
    }
    if (this.indexedParkingRef !== this.state.logistics.parkingCells) {
      this.indexedParkingRef = this.state.logistics.parkingCells
      this.parkingIndex.clear()
      this.state.logistics.parkingCells.forEach((cell) => {
        this.parkingIndex.set(this.packXZ(cell.x, cell.z), true)
      })
    }
    if (this.indexedMedicalRef !== this.state.medicalCells) {
      this.indexedMedicalRef = this.state.medicalCells
      this.medicalIndex.clear()
      this.state.medicalCells.forEach((cell) => {
        this.medicalIndex.set(this.packXZ(cell.x, cell.z), cell)
      })
    }
    if (this.indexedWasteDumpRef !== this.state.wasteDumpCells) {
      this.indexedWasteDumpRef = this.state.wasteDumpCells
      this.wasteDumpIndex.clear()
      this.state.wasteDumpCells.forEach((cell) => {
        this.wasteDumpIndex.set(this.packXZ(cell.x, cell.z), cell)
      })
    }
    if (this.indexedForecourtRef !== this.state.stageForecourtCells) {
      this.indexedForecourtRef = this.state.stageForecourtCells
      this.forecourtIndex.clear()
      this.state.stageForecourtCells.forEach((cell) => {
        this.forecourtIndex.set(this.packXZ(cell.x, cell.z), cell)
      })
    }
  }

  private rebuildTerrainCache(): void {
    const size = this.getScenario().worldSize
    this.cachedWorldSize = size
    this.cachedWorldHalf = size / 2
    const heights = new Int8Array(size * size)
    const half = size / 2
    for (let z = -half; z < half; z += 1) {
      for (let x = -half; x < half; x += 1) {
        heights[(z + half) * size + (x + half)] = readTerrainHeight(
          this.state.terrain,
          x,
          z,
        )
      }
    }
    this.terrainHeights = heights
  }

  private getPlaceElevation(x: number, z: number): number {
    return this.getTerrainHeight(x, z) + this.state.buildElevation
  }

  private isAtTerrainLevel(x: number, z: number, elevation: number): boolean {
    return Math.abs(elevation - this.getTerrainHeight(x, z)) < 0.51
  }

  private isTerrainProtected(x: number, z: number): boolean {
    const entrance = this.getEntrance()
    if (x === entrance.x && z === entrance.z) return true
    if (
      this.state.buildings.some(
        (building) =>
          building.x === x &&
          building.z === z &&
          building.kind !== 'tree',
      )
    ) {
      return true
    }
    return (
      Boolean(this.getRoadCellAt(x, z)) ||
      this.state.logistics.parkingCells.some(
        (cell) => cell.x === x && cell.z === z,
      ) ||
      this.isLogisticsBuildingCell(x, z) ||
      Boolean(this.getCampingCellAt(x, z)) ||
      Boolean(this.getMedicalCellAt(x, z)) ||
      Boolean(this.getWasteDumpAt(x, z)) ||
      Boolean(this.getStageForecourtCellAt(x, z)) ||
      this.coasterOccupiesVolume(x, z, this.getTerrainHeight(x, z), 0.8)
    )
  }

  private getOverlappingTrees(
    x: number,
    z: number,
    elevation: number,
    height = 0.4,
  ): PlacedBuilding[] {
    return this.state.buildings.filter(
      (building) =>
        building.kind === 'tree' &&
        occupiesBuildingCell(building,x,z) &&
        this.volumesOverlap(building, elevation, height),
    )
  }

  private getTreeClearCost(
    x: number,
    z: number,
    elevation = this.getPlaceElevation(x, z),
    height = 0.4,
  ): number {
    return (
      this.getOverlappingTrees(x, z, elevation, height).length *
      SIMULATION_CONFIG.economy.treeClearCost
    )
  }

  private clearTreesAt(
    x: number,
    z: number,
    elevation = this.getPlaceElevation(x, z),
    height = 1.8,
  ): number {
    const trees = this.getOverlappingTrees(x, z, elevation, height)
    if (trees.length === 0) return 0
    const ids = new Set(trees.map((tree) => tree.id))
    this.state.buildings = this.state.buildings.filter(
      (building) => !ids.has(building.id),
    )
    const cost = trees.length * SIMULATION_CONFIG.economy.treeClearCost
    this.state.money -= cost
    return cost
  }

  private isInWorld(x: number, z: number): boolean {
    if (this.cachedWorldSize === 0) this.rebuildTerrainCache()
    const half = this.cachedWorldHalf
    return x >= -half && x < half && z >= -half && z < half
  }

  private packAtmosphereKey(key: string): number | null {
    const first = key.indexOf(',')
    const second = key.indexOf(',', first + 1)
    if (first < 0 || second < 0) return null
    const x = Number(key.slice(0, first))
    const z = Number(key.slice(first + 1, second))
    const elevation = Number(key.slice(second + 1))
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(elevation)) {
      return null
    }
    return this.packCell({ x, z, elevation })
  }

  private cellKey(x: number, z: number, elevation: number): string {
    return `${x},${z},${elevation}`
  }

  private getAtmosphereValue(
    values: Map<string, number>,
    x: number,
    z: number,
    elevation: number,
  ): number {
    const terrain = this.getTerrainHeight(x, z)
    return (
      values.get(this.cellKey(x, z, elevation)) ??
      values.get(this.cellKey(x, z, terrain)) ??
      values.get(this.cellKey(x, z, 0)) ??
      0
    )
  }

  private ensureEntrancePath(): void {
    const planned = createScenarioEntrance(this.getWorldSize())
    const elevation = this.getTerrainHeight(planned.x, planned.z)
    const existing =
      this.state.buildings.find((building) => building.id === ENTRANCE_PATH_ID) ??
      this.getPathAt(planned.x, planned.z, planned.elevation) ??
      this.getPathAt(planned.x, planned.z)
    if (existing) {
      const liftLegacy =
        existing.x === planned.x &&
        existing.z === planned.z &&
        (existing.elevation === 0 || existing.elevation === planned.elevation) &&
        existing.elevation !== elevation
      existing.id = ENTRANCE_PATH_ID
      existing.kind = 'path'
      existing.x = planned.x
      existing.z = planned.z
      if (liftLegacy) existing.elevation = elevation
      existing.pathType = 'normal'
      existing.pathSlope = 0
      if (liftLegacy) this.indexedBuildingCount = -1
      return
    }
    this.state.buildings.unshift({
      id: ENTRANCE_PATH_ID,
      kind: 'path',
      x: planned.x,
      z: planned.z,
      rotation: 0,
      elevation,
      pathType: 'normal',
      pathSlope: 0,
      pathSlopeDirection: 0,
      price: 0,
    })
  }

  private ensureRoadIngress(): void {
    for (let x = -3; x <= 2; x += 1) {
      if (this.getRoadCellAt(x, -this.getWorldSize() / 2)) continue
      this.state.logistics.roadCells.push({
        x,
        z: -this.getWorldSize() / 2,
        allowedDirections: null,
        blockedEdges: 0,
        speedLimit: SIMULATION_CONFIG.logistics.defaultSpeedLimit,
        crosswalk: false,
      })
      this.invalidateRoadGraph()
    }
  }

  private migrateLegacyBusStopsToRoadside(): void {
    this.state.logistics.busStops.forEach((stop) => {
      if (!this.getRoadCellAt(stop.x, stop.z)) return
      const sidewalk = [
        { x: stop.x, z: stop.z + 1 },
        { x: stop.x + 1, z: stop.z },
        { x: stop.x, z: stop.z - 1 },
        { x: stop.x - 1, z: stop.z },
      ].find(
        (cell) => {
          const path = this.getPathAt(cell.x, cell.z, 0)
          return (
          path?.pathType === 'normal' &&
          !this.getRoadCellAt(cell.x, cell.z) &&
          !this.state.logistics.busStops.some(
            (other) =>
              other.id !== stop.id &&
              other.x === cell.x &&
              other.z === cell.z,
          )
          )
        },
      )
      if (!sidewalk) return
      stop.roadCell = { x: stop.x, z: stop.z }
      stop.x = sidewalk.x
      stop.z = sidewalk.z
      this.state.visitors
        .filter(
          (visitor) =>
            visitor.state === 'bus-waiting' &&
            visitor.targetId === stop.id,
        )
        .forEach((visitor) => {
          visitor.route =
            this.findPath(
              {
                x: visitor.cellX,
                z: visitor.cellZ,
                elevation: visitor.cellElevation,
              },
              [{ ...sidewalk, elevation: 0 }],
            ) ?? []
        })
    })
  }

  private findCollision(
    kind: BuildingKind,
    x: number,
    z: number,
    elevation: number,
  ): PlacedBuilding | undefined {
    const height = BUILDINGS[kind].height
    return this.state.buildings.find(
      (building) =>
        occupiesBuildingCell(building,x,z) &&
        this.volumesOverlap(building, elevation, height),
    )
  }

  private recalculateCoasterTrackState(coaster: Coaster): void {
    const first = coaster.pieces[0]
    const last = coaster.pieces.at(-1)
    if (first && last && trackAnchorsAlign(last.end, first.start)) {
      snapTrackPieceToAnchor(last, first.start)
    }
    coaster.closed = isCoasterCircuitClosed(coaster)
    this.coasterIndexKey = ''
  }

  private canBuildTrackPiece(
    piece: TrackPiece,
    context: { coasterId?: string; attachPieceIndex?: number } = {},
  ): boolean {
    const points = context.coasterId ? piece.points.slice(1) : piece.points
    return points.every((point, index) => {
      const previous = points[Math.max(0, index - 1)] ?? point
      const next = points[Math.min(points.length - 1, index + 1)] ?? point
      const frame = computeTrackFrame(
        { x: next.x - previous.x, y: next.y - previous.y, z: next.z - previous.z },
        point.bank ?? 0,
      )
      return [-0.28, 0, 0.28].every((offset) => {
        const x = Math.round(point.x + frame.right.x * offset)
        const y = point.y + frame.right.y * offset
        const z = Math.round(point.z + frame.right.z * offset)
        if (y < 1.2 && this.getCampingCellAt(x, z)) return false
        if (
          this.state.buildings.some(
            (building) =>
              occupiesBuildingCell(building,x,z) &&
              this.volumesOverlap(building, y, 0.28),
          )
        ) {
          return false
        }
        return !this.trackVolumeBlocked(x, z, y, 0.28, piece, context)
      })
    })
  }

  private trackVolumeBlocked(
    x: number,
    z: number,
    elevation: number,
    height: number,
    newPiece: TrackPiece,
    context: { coasterId?: string; attachPieceIndex?: number },
  ): boolean {
    return this.state.coasters.some((coaster) =>
      coaster.pieces.some((piece, pieceIndex) => {
        const first = coaster.pieces[0]
        const closesOwnCircuit =
          Boolean(context.coasterId) &&
          coaster.id === context.coasterId &&
          first &&
          trackAnchorsAlign(newPiece.end, first.start)
        return piece.points.some((point) => {
          if (Math.round(point.x) !== x || Math.round(point.z) !== z) return false
          if (!(point.y < elevation + height && elevation < point.y + 0.22)) {
            return false
          }
          if (coaster.id !== context.coasterId) return true
          if (
            pieceIndex === context.attachPieceIndex &&
            this.nearTrackAnchor(point, piece.end)
          ) {
            return false
          }
          if (
            closesOwnCircuit &&
            pieceIndex === 0 &&
            this.nearTrackAnchor(point, first!.start)
          ) {
            return false
          }
          return true
        })
      }),
    )
  }

  private nearTrackAnchor(
    point: { x: number; y: number; z: number },
    anchor: { x: number; z: number; elevation: number },
  ): boolean {
    return (
      Math.hypot(point.x - anchor.x, point.z - anchor.z) < 0.7 &&
      Math.abs(point.y - anchor.elevation) < 0.4
    )
  }

  private ensureCoasterIndex(): void {
    const key = this.state.coasters
      .map((coaster) => `${coaster.id}:${coaster.pieces.length}:${coaster.pieces.at(-1)?.id ?? ''}`)
      .join('|')
    if (key === this.coasterIndexKey) return
    this.coasterIndexKey = key
    this.coasterOccupancyIndex.clear()
    this.state.coasters.forEach((coaster) => {
      coaster.pieces.forEach((piece) => {
        piece.points.forEach((point) => {
          const cellKey = this.packXZ(Math.round(point.x), Math.round(point.z))
          const bucket = this.coasterOccupancyIndex.get(cellKey)
          const entry = { y: point.y, coasterId: coaster.id }
          if (bucket) bucket.push(entry)
          else this.coasterOccupancyIndex.set(cellKey, [entry])
        })
      })
    })
  }

  private coasterOccupiesVolume(
    x: number,
    z: number,
    elevation: number,
    height: number,
    ignoreCoasterId?: string,
  ): boolean {
    if (this.state.coasters.length === 0) return false
    this.ensureCoasterIndex()
    const hits = this.coasterOccupancyIndex.get(this.packXZ(x, z))
    if (!hits) return false
    const top = elevation + height
    for (const hit of hits) {
      if (ignoreCoasterId && hit.coasterId === ignoreCoasterId) continue
      if (hit.y < top && elevation < hit.y + 0.22) return true
    }
    return false
  }

  private volumesOverlap(
    building: PlacedBuilding,
    elevation: number,
    height: number,
  ): boolean {
    const bounds = this.getBuildingVerticalBounds(building)
    const candidateTop = elevation + height
    return bounds.base < candidateTop && elevation < bounds.top
  }

  private getBuildingVerticalBounds(
    building: PlacedBuilding,
  ): { base: number; top: number } {
    if (building.kind === 'path' && building.pathSlope) {
      const startElevation = building.elevation - building.pathSlope
      return {
        base: Math.min(building.elevation, startElevation),
        top:
          Math.max(building.elevation, startElevation) +
          BUILDINGS.path.height,
      }
    }
    return {
      base: building.elevation,
      top: building.elevation + BUILDINGS[building.kind].height,
    }
  }

  private getPathSurfaceElevation(path: PlacedBuilding | undefined): number {
    if (!path) return 0
    return path.elevation - (path.pathSlope ?? 0) / 2
  }

  private normalizePrice(price: number): number {
    return Math.round(
      Math.max(
        0,
        Math.min(
          SIMULATION_CONFIG.economy.maximumPrice,
          Number.isFinite(price) ? price : 0,
        ),
      ),
    )
  }

  private recordComplaint(
    visitor: Visitor,
    topic: ComplaintTopic,
  ): void {
    if (visitor.complaintsFiled.includes(topic)) return
    visitor.complaintsFiled.push(topic)
    this.state.complaints.currentSession[topic] += 1
  }

  private rotateComplaintSession(): void {
    this.state.complaints.previousSession = {
      ...this.state.complaints.currentSession,
    }
    this.state.complaints.currentSession = createComplaintCounts()
    this.state.complaints.sessionNumber += 1
    this.state.visitors.forEach((visitor) => {
      visitor.complaintsFiled = []
    })
  }

  private refundEntryFee(visitor: Visitor): void {
    const refund = Math.max(0, visitor.entryFeePaid)
    if (refund <= 0) return
    visitor.entryFeePaid = 0
    visitor.budget += refund
    this.state.money -= refund
    this.state.cashEffects.push({
      id: this.nextId('refund'),
      amount: -refund,
      x: visitor.x,
      y: visitor.y + 0.9,
      z: visitor.z,
      age: 0,
    })
  }

  private chargeVisitor(
    visitor: Visitor,
    amount: number,
    position: { x: number; y: number; z: number },
  ): boolean {
    const price = this.normalizePrice(amount)
    if (visitor.budget < price) return false
    visitor.budget -= price
    if (price > 0) {
      this.state.money += price
      this.state.cashEffects.push({
        id: this.nextId('cash'),
        amount: price,
        ...position,
        age: 0,
      })
    }
    return true
  }

  private wayBatch = false
  private emit(reason: 'mutate' | 'tick' | 'local' = 'mutate'): void {
    if (reason === 'mutate' && this.networkMode !== 'client') {
      this.worldRevision += 1
    }
    if (!this.wayBatch) this.listeners.forEach((listener) => listener(this.state))
  }
}

