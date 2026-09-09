import type { WayType } from '../game/wayTypes'
import type { BuildingKind, Tool } from '../game/catalog'
import type { ActionResult, PlacedBuilding } from '../game/GameState'
import type { TerrainEditMode } from '../game/terrain'
import type { Direction, RoadPosition, SpeedLimit } from '../game/logistics'
import type { CoasterOperationMode, CoasterTypeId, DispatchMode, TrackBuildOptions, TrackPieceKind } from '../game/coasters'
import type { StaffRole } from '../game/staff'
import type { DayPlanOffer } from '../game/dayPlan'
import type { SecurityGateConfig } from '../game/security'
import type { CashEffect, GameSnapshot, Visitor } from '../game/GameState'
import type { StaffMember } from '../game/staff'
import type { RoadVehicle } from '../game/logistics'
import type { GroundIncident } from '../game/incidents'
import type { FireworkEffect } from '../game/fireworks'
import type { FestivalAction } from '../game/festivalManagement'

export type CellRef = { x: number; z: number }

export type GameCommand = GameCommandAction & {
  context?: { buildElevation: number; buildRotation: number }
}

type GameCommandAction =
  | { type: 'festival'; action: FestivalAction }
  | { type: 'place'; kind: BuildingKind; x: number; z: number }
  | {
      type: 'placePath'
      x: number
      z: number
      elevation: number
      wayType?: WayType
      pathType: 'normal' | 'queue'
      queueDirection: number
      slope: -1 | 0 | 1
    }
  | {
      type: 'undoPath'
      x: number
      z: number
      elevation: number
      previousPath?: PlacedBuilding
    }
  | { type: 'bulldoze'; x: number; z: number }
  | { type: 'editTerrain'; x: number; z: number; mode: TerrainEditMode }
  | { type: 'designateRoad'; cells: RoadPosition[] }
  | { type: 'designateParking'; cells: RoadPosition[] }
  | { type: 'designateCampingCell'; x: number; z: number; enabled: boolean }
  | { type: 'designateCampingArea'; cells: CellRef[] }
  | { type: 'designateMedicalArea'; cells: CellRef[] }
  | { type: 'designateWasteDump'; cells: CellRef[] }
  | { type: 'designateStageForecourt'; cells: CellRef[] }
  | { type: 'designatePowerCable'; x: number; z: number; enabled: boolean }
  | { type: 'designatePowerCableArea'; cells: CellRef[] }
  | { type: 'setRoadDirection'; x: number; z: number; direction: Direction }
  | { type: 'toggleRoadSeparator'; x: number; z: number; direction: Direction }
  | { type: 'toggleCrosswalk'; x: number; z: number }
  | { type: 'setRoadSpeed'; x: number; z: number; speedLimit: SpeedLimit }
  | { type: 'setPathFlow'; x: number; z: number; elevation: number; direction: number | null }
  | { type: 'setParkOpen'; open: boolean }
  | { type: 'setSpeed'; speed: number }
  | { type: 'hireStaff'; role: StaffRole }
  | { type: 'fireStaff'; role: StaffRole }
  | { type: 'buyAmbulance'; garageId: string }
  | { type: 'buyBus'; depotId: string }
  | { type: 'sellBus'; depotId: string }
  | { type: 'buyGarbageTruck'; depotId: string }
  | { type: 'sellGarbageTruck'; depotId: string }
  | {
      type: 'createBusLine'
      name: string
      depotId: string
      stopIds: string[]
      busCount: number
      headway: number
    }
  | { type: 'deleteBusLine'; lineId: string }
  | { type: 'startCoaster'; typeId: CoasterTypeId; x: number; z: number }
  | {
      type: 'appendCoasterPiece'
      coasterId: string
      kind: TrackPieceKind
      chainLift: boolean
      afterPieceIndex?: number
      options: TrackBuildOptions
    }
  | { type: 'undoCoasterPiece'; coasterId: string }
  | { type: 'deleteCoasterPiece'; coasterId: string; pieceIndex: number }
  | {
      type: 'setCoasterAccess'
      coasterId: string
      accessType: 'entrance' | 'exit'
      x: number
      z: number
    }
  | { type: 'updateCoasterSettings'; coasterId: string; dispatchMode: DispatchMode; intervalMinutes: number }
  | { type: 'updateCoasterPrice'; coasterId: string; price: number }
  | { type: 'setCoasterOperationMode'; coasterId: string; mode: CoasterOperationMode }
  | { type: 'recallCoasterTrain'; coasterId: string }
  | { type: 'updateBuildingPrice'; buildingId: string; price: number }
  | { type: 'updateEntryPrice'; price: number }
  | { type: 'updateSecurityGate'; id: string; config: Partial<SecurityGateConfig> }
  | { type: 'setDayPlanHour'; offer: DayPlanOffer; hour: number; active: boolean }
  | { type: 'updateDayVisitorWindow'; entryHour: number; exitHour: number }
  | { type: 'updateCampingCapacityBuffer'; percent: number }
  | { type: 'updateFestivalCycle'; leadDays: number; festivalDays: number; breakDays: number }
  | { type: 'addDebugMoney' }
  | { type: 'removeVisitorCars' }

export type NetPlayer = {
  id: string
  name: string
  role: 'host' | 'client'
}

export type PackedVisitor = Pick<
  Visitor,
  | 'id'
  | 'name'
  | 'x'
  | 'y'
  | 'z'
  | 'cellX'
  | 'cellZ'
  | 'cellElevation'
  | 'color'
  | 'state'
  | 'thought'
  | 'facing'
  | 'emotion'
  | 'alcoholLevel'
  | 'streakingMinutes'
  | 'tileOffsetX'
  | 'tileOffsetZ'
  | 'isDancing'
  | 'isConversing'
  | 'hasHandcart'
  | 'campActivity'
  | 'campActivityTarget'
  | 'campActivitySlot'
  | 'campActivityCapacity'
  | 'activityTarget'
  | 'activitySlot'
  | 'activityCapacity'
  | 'targetId'
  | 'campingPhase'
  | 'needs'
  | 'nausea'
  | 'motivation'
  | 'crowding'
  | 'localAttractiveness'
  | 'localPartyMood'
  | 'ticketType'
  | 'musicTaste'
  | 'alcoholDisposition'
> & {
  moving: boolean
  nextX: number
  nextZ: number
}

export type SimSnapshot = {
  money: number
  guests: number
  reputation: number
  day: number
  minute: number
  speed: number
  parkOpen: boolean
  entryPrice: number
  visitors: PackedVisitor[]
  staff: StaffMember[]
  vehicles: RoadVehicle[]
  incidents: GroundIncident[]
  cashEffects: CashEffect[]
  fireworkEffects: FireworkEffect[]
}

export type WorldSnapshot = Omit<
  GameSnapshot,
  'selectedTool' | 'buildElevation' | 'buildRotation'
>

export type WorldUpdate = {
  t: 'state'
  world: Partial<WorldSnapshot>
  visitors: Array<{ id: string; changes: Partial<Visitor> }>
  removed: string[]
}

export type ClientMessage =
  | WorldUpdate
  | { t: 'host'; name: string }
  | { t: 'join'; code: string; name: string }
  | { t: 'command'; cmd: GameCommand }
  | { t: 'leave' }
  | { t: 'world'; rev: number; world: WorldSnapshot }
  | { t: 'sim'; sim: SimSnapshot }
  | { t: 'result'; ok: boolean; message: string }
  | { t: 'apply'; cmd: GameCommand; sim: SimSnapshot }
  | {
      t: 'turn'
      tick: number
      commands: GameCommand[]
      step: boolean
      hash: number
    }
  | { t: 'sync'; world: WorldSnapshot }
  | { t: 'resync' }

export type ServerMessage =
  | WorldUpdate
  | { t: 'hosted'; code: string; playerId: string; joinUrl: string; players: NetPlayer[] }
  | { t: 'joined'; code: string; playerId: string; role: 'host' | 'client'; players: NetPlayer[] }
  | { t: 'players'; players: NetPlayer[] }
  | { t: 'command'; cmd: GameCommand; from: string }
  | { t: 'result'; ok: boolean; message: string; extra?: ActionResult }
  | { t: 'world'; rev: number; world: WorldSnapshot }
  | { t: 'sim'; sim: SimSnapshot }
  | { t: 'apply'; cmd: GameCommand; sim: SimSnapshot }
  | {
      t: 'turn'
      tick: number
      commands: GameCommand[]
      step: boolean
      hash: number
    }
  | { t: 'sync'; world: WorldSnapshot }
  | { t: 'resync' }
  | { t: 'error'; message: string }
  | { t: 'closed'; message: string }

export type { Tool }
