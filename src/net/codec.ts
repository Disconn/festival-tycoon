import type { GameSnapshot, Visitor } from '../game/GameState'
import { hashStringSeed } from '../game/pathfinding'
import type { PackedVisitor, SimSnapshot, WorldSnapshot } from './protocol'

export function packWorld(snapshot: Readonly<GameSnapshot>): WorldSnapshot {
  const {
    selectedTool: _selectedTool,
    buildElevation: _buildElevation,
    buildRotation: _buildRotation,
    ...world
  } = snapshot
  return world
}

export function packSim(snapshot: Readonly<GameSnapshot>): SimSnapshot {
  return {
    money: snapshot.money,
    guests: snapshot.guests,
    reputation: snapshot.reputation,
    day: snapshot.day,
    minute: snapshot.minute,
    speed: snapshot.speed,
    parkOpen: snapshot.parkOpen,
    entryPrice: snapshot.entryPrice,
    visitors: snapshot.visitors.map(packVisitor),
    staff: snapshot.staff,
    vehicles: snapshot.logistics.roadVehicles,
    incidents: snapshot.incidents,
    cashEffects: snapshot.cashEffects,
    fireworkEffects: snapshot.fireworkEffects,
  }
}

function packVisitor(visitor: Visitor): PackedVisitor {
  const next = visitor.route[0]
  return {
    musicTaste: visitor.musicTaste,
    id: visitor.id,
    name: visitor.name,
    x: visitor.x,
    y: visitor.y,
    z: visitor.z,
    cellX: visitor.cellX,
    cellZ: visitor.cellZ,
    cellElevation: visitor.cellElevation,
    color: visitor.color,
    state: visitor.state,
    thought: visitor.thought,
    facing: visitor.facing,
    emotion: visitor.emotion,
    alcoholLevel: visitor.alcoholLevel,
    streakingMinutes: visitor.streakingMinutes,
    toplessMinutes: visitor.toplessMinutes,
    bungeeNude: visitor.bungeeNude,
    tileOffsetX: visitor.tileOffsetX,
    tileOffsetZ: visitor.tileOffsetZ,
    isDancing: visitor.isDancing,
    isConversing: visitor.isConversing,
    hasHandcart: visitor.hasHandcart,
    campActivity: visitor.campActivity,
    campActivityTarget: visitor.campActivityTarget,
    campActivitySlot: visitor.campActivitySlot,
    campActivityCapacity: visitor.campActivityCapacity,
    activityTarget: visitor.activityTarget,
    activitySlot: visitor.activitySlot,
    activityCapacity: visitor.activityCapacity,
    targetId: visitor.targetId,
    campingPhase: visitor.campingPhase,
    needs: visitor.needs,
    nausea: visitor.nausea,
    motivation: visitor.motivation,
    crowding: visitor.crowding,
    localAttractiveness: visitor.localAttractiveness,
    localPartyMood: visitor.localPartyMood,
    ticketType: visitor.ticketType,
    alcoholDisposition: visitor.alcoholDisposition,
    moving: visitor.route.length > 0,
    nextX: next?.x ?? visitor.cellX,
    nextZ: next?.z ?? visitor.cellZ,
  }
}

export function applyWorld(snapshot: GameSnapshot, world: WorldSnapshot): void {
  const tool = snapshot.selectedTool
  const elevation = snapshot.buildElevation
  const rotation = snapshot.buildRotation
  Object.assign(snapshot, world)
  snapshot.selectedTool = tool
  snapshot.buildElevation = elevation
  snapshot.buildRotation = rotation
}

export function applySim(snapshot: GameSnapshot, sim: SimSnapshot): void {
  snapshot.money = sim.money
  snapshot.guests = sim.guests
  snapshot.reputation = sim.reputation
  snapshot.day = sim.day
  snapshot.minute = sim.minute
  snapshot.speed = sim.speed
  snapshot.parkOpen = sim.parkOpen
  snapshot.entryPrice = sim.entryPrice
  snapshot.incidents = sim.incidents
  snapshot.cashEffects = sim.cashEffects
  snapshot.fireworkEffects = sim.fireworkEffects
  snapshot.staff = sim.staff
  snapshot.logistics.roadVehicles = sim.vehicles
  mergeVisitors(snapshot, sim.visitors)
}

function mergeVisitors(snapshot: GameSnapshot, packed: PackedVisitor[]): void {
  const current = new Map(snapshot.visitors.map((visitor) => [visitor.id, visitor]))
  snapshot.visitors = packed.map((item) => {
    const existing = current.get(item.id)
    const visitor = existing ?? createRemoteVisitor(item)
    visitor.name = item.name
    visitor.netX = item.x
    visitor.netY = item.y
    visitor.netZ = item.z
    visitor.netFacing = item.facing
    if (!existing) {
      visitor.x = item.x
      visitor.y = item.y
      visitor.z = item.z
      visitor.facing = item.facing
    }
    visitor.cellX = item.cellX
    visitor.cellZ = item.cellZ
    visitor.cellElevation = item.cellElevation
    visitor.color = item.color
    visitor.state = item.state
    visitor.thought = item.thought
    visitor.emotion = item.emotion
    visitor.alcoholLevel = item.alcoholLevel
    visitor.streakingMinutes = item.streakingMinutes
    visitor.toplessMinutes = item.toplessMinutes ?? 0
    visitor.bungeeNude = Boolean(item.bungeeNude)
    visitor.tileOffsetX = item.tileOffsetX
    visitor.tileOffsetZ = item.tileOffsetZ
    visitor.isDancing = item.isDancing
    visitor.isConversing = item.isConversing
    visitor.hasHandcart = item.hasHandcart
    visitor.campActivity = item.campActivity
    visitor.campActivityTarget = item.campActivityTarget
    visitor.campActivitySlot = item.campActivitySlot
    visitor.campActivityCapacity = item.campActivityCapacity
    visitor.activityTarget = item.activityTarget
    visitor.activitySlot = item.activitySlot
    visitor.activityCapacity = item.activityCapacity
    visitor.targetId = item.targetId
    visitor.campingPhase = item.campingPhase
    visitor.needs = item.needs
    visitor.nausea = item.nausea
    visitor.motivation = item.motivation
    visitor.crowding = item.crowding
    visitor.localAttractiveness = item.localAttractiveness
    visitor.localPartyMood = item.localPartyMood
    visitor.ticketType = item.ticketType
    visitor.alcoholDisposition = item.alcoholDisposition
    visitor.route = item.moving
      ? [{ x: item.nextX, z: item.nextZ, elevation: item.cellElevation }]
      : []
    return visitor
  })
}

function createRemoteVisitor(item: PackedVisitor): Visitor {
  return {
    id: item.id,
    name: item.name,
    x: item.x,
    y: item.y,
    z: item.z,
    cellX: item.cellX,
    cellZ: item.cellZ,
    cellElevation: item.cellElevation,
    color: item.color,
    state: item.state,
    thought: item.thought,
    needs: item.needs,
    route: [],
    targetId: item.targetId,
    interactionRemaining: 0,
    walkSpeed: 0.7,
    movementBoostMinutes: 0,
    avoidedCoasterId: null,
    avoidanceMinutes: 0,
    facing: item.facing,
    emotion: item.emotion,
    emotionMinutes: 0,
    budget: 0,
    alcoholLevel: item.alcoholLevel,
    alcoholDisposition: item.alcoholDisposition,
    alcoholDesire: 0,
    campsite: null,
    campingPhase: item.campingPhase,
    hasHandcart: item.hasHandcart,
    inventory: [],
    motivation: item.motivation,
    crowding: item.crowding,
    crowdStress: 0,
    isPanicking: false,
    panicRecoverMinutes: 0,
    tileOffsetX: item.tileOffsetX,
    tileOffsetZ: item.tileOffsetZ,
    campActivityTarget: item.campActivityTarget,
    campActivity: item.campActivity,
    campActivityKind: null,
    campActivitySlot: item.campActivitySlot,
    campActivityCapacity: item.campActivityCapacity,
    nausea: item.nausea,
    nauseaCooldown: 0,
    medicalCell: null,
    medicalSlot: null,
    securityGateId: null,
    securityResumeState: null,
    beautyPreference: 0.5,
    partyPreference: 0.5,
    localAttractiveness: item.localAttractiveness,
    localPartyMood: item.localPartyMood,
    activityTarget: item.activityTarget,
    activitySlot: item.activitySlot,
    activityCapacity: item.activityCapacity,
    isDancing: item.isDancing,
    preferredBedtime: 0,
    preferredWakeTime: 8,
    ticketType: item.ticketType,
    consumptionCooldown: 0,
    isConversing: item.isConversing,
    campingWaitMinutes: 0,
    campingWaitRetryMinutes: 0,
    entryFeePaid: 0,
    complaintsFiled: [],
    arrivalGroupId: null,
    arrivalMode: 'pedestrian',
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
    streakingMinutes: item.streakingMinutes,
    streakingCooldownMinutes: 0,
    toplessMinutes: item.toplessMinutes ?? 0,
    bungeeNude: Boolean(item.bungeeNude),
    pathSeed: hashStringSeed(item.id),
    wanderNonce: 0,
  }
}
