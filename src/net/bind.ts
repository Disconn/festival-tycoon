import type { GameState } from '../game/GameState'
import { applyGameCommand } from './commands'
import type { GameCommand } from './protocol'

function wrap<Args extends unknown[], Result>(
  game: GameState,
  original: (...args: Args) => Result,
  toCommand: (...args: Args) => GameCommand,
): (...args: Args) => Result {
  return (...args: Args) => {
    const command = toCommand(...args)
    command.context = {
      buildElevation: game.snapshot.buildElevation,
      buildRotation: game.snapshot.buildRotation,
    }
    const blocked = game.gate(command)
    if (blocked) return blocked as Result
    return original.apply(game, args)
  }
}

const boundGames = new WeakSet<GameState>()

export function enableMultiplayerCommands(game: GameState): void {
  if (boundGames.has(game)) return
  boundGames.add(game)
  game.place = wrap(game, game.place, (kind, x, z, decorationSlot) => ({
    type: 'place',
    kind,
    decorationSlot,
    x,
    z,
  }))
  game.placePathSegment = wrap(
    game,
    game.placePathSegment,
    (x, z, elevation, pathType = 'normal', queueDirection = 0, slope = 0, wayType) => ({
      type: 'placePath',
      x,
      z,
      elevation,
      pathType,
      queueDirection,
      slope,
      wayType,
    }),
  )
  game.undoPathSegment = wrap(
    game,
    game.undoPathSegment,
    (x, z, elevation, previousPath) => ({
      type: 'undoPath',
      x,
      z,
      elevation,
      previousPath,
    }),
  )
  game.bulldoze = wrap(game, game.bulldoze, (x, z, buildingId) => ({ type: 'bulldoze', x, z, buildingId }))
  game.bulldozeArea = wrap(game, game.bulldozeArea, (cells) => ({
    type: 'bulldozeArea',
    cells: [...cells],
  }))
  game.editTerrain = wrap(game, game.editTerrain, (x, z, mode) => ({
    type: 'editTerrain',
    x,
    z,
    mode,
  }))
  game.designateRoad = wrap(game, game.designateRoad, (cells) => ({
    type: 'designateRoad',
    cells: [...cells],
  }))
  game.designateParkingArea = wrap(game, game.designateParkingArea, (cells) => ({
    type: 'designateParking',
    cells: [...cells],
  }))
  game.designateCampingCell = wrap(
    game,
    game.designateCampingCell,
    (x, z, enabled = true) => ({ type: 'designateCampingCell', x, z, enabled }),
  )
  game.designateCampingArea = wrap(game, game.designateCampingArea, (cells) => ({
    type: 'designateCampingArea',
    cells: [...cells],
  }))
  game.designateMedicalArea = wrap(game, game.designateMedicalArea, (cells) => ({
    type: 'designateMedicalArea',
    cells: [...cells],
  }))
  game.designateWasteDump = wrap(game, game.designateWasteDump, (cells) => ({
    type: 'designateWasteDump',
    cells: [...cells],
  }))
  game.designateStageForecourt = wrap(
    game,
    game.designateStageForecourt,
    (cells) => ({ type: 'designateStageForecourt', cells: [...cells] }),
  )
  game.designatePowerCable = wrap(
    game,
    game.designatePowerCable,
    (x, z, enabled = true) => ({ type: 'designatePowerCable', x, z, enabled }),
  )
  game.designatePowerCableArea = wrap(
    game,
    game.designatePowerCableArea,
    (cells) => ({ type: 'designatePowerCableArea', cells: [...cells] }),
  )
  game.setRoadDirection = wrap(game, game.setRoadDirection, (x, z, direction) => ({
    type: 'setRoadDirection',
    x,
    z,
    direction,
  }))
  game.toggleRoadSeparator = wrap(
    game,
    game.toggleRoadSeparator,
    (x, z, direction) => ({ type: 'toggleRoadSeparator', x, z, direction }),
  )
  game.toggleCrosswalk = wrap(game, game.toggleCrosswalk, (x, z) => ({
    type: 'toggleCrosswalk',
    x,
    z,
  }))
  game.setRoadSpeed = wrap(game, game.setRoadSpeed, (x, z, speedLimit) => ({
    type: 'setRoadSpeed',
    x,
    z,
    speedLimit,
  }))
  game.setPathFlow = wrap(game, game.setPathFlow, (x, z, elevation, direction) => ({
    type: 'setPathFlow',
    x,
    z,
    elevation,
    direction,
  }))
  game.setParkOpen = wrap(game, game.setParkOpen, (open) => ({
    type: 'setParkOpen',
    open,
  }))
  game.setSpeed = wrap(game, game.setSpeed, (speed) => ({ type: 'setSpeed', speed }))
  game.hireStaff = wrap(game, game.hireStaff, (role) => ({ type: 'hireStaff', role }))
  game.fireStaff = wrap(game, game.fireStaff, (role) => ({ type: 'fireStaff', role }))
  game.buyAmbulance = wrap(game, game.buyAmbulance, (garageId) => ({
    type: 'buyAmbulance',
    garageId,
  }))
  game.buyBus = wrap(game, game.buyBus, (depotId) => ({ type: 'buyBus', depotId }))
  game.sellBus = wrap(game, game.sellBus, (depotId) => ({ type: 'sellBus', depotId }))
  game.buyGarbageTruck = wrap(game, game.buyGarbageTruck, (depotId) => ({
    type: 'buyGarbageTruck',
    depotId,
  }))
  game.sellGarbageTruck = wrap(game, game.sellGarbageTruck, (depotId) => ({
    type: 'sellGarbageTruck',
    depotId,
  }))
  game.createBusLine = wrap(
    game,
    game.createBusLine,
    (name, depotId, stopIds, busCount, headway) => ({
      type: 'createBusLine',
      name,
      depotId,
      stopIds,
      busCount,
      headway,
    }),
  )
  game.deleteBusLine = wrap(game, game.deleteBusLine, (lineId) => ({
    type: 'deleteBusLine',
    lineId,
  }))
  game.startCoaster = wrap(game, game.startCoaster, (typeId, x, z) => ({
    type: 'startCoaster',
    typeId,
    x,
    z,
  }))
  game.appendCoasterPiece = wrap(
    game,
    game.appendCoasterPiece,
    (coasterId, kind, chainLift, afterPieceIndex, options = {}) => ({
      type: 'appendCoasterPiece',
      coasterId,
      kind,
      chainLift,
      afterPieceIndex,
      options,
    }),
  )
  game.undoCoasterPiece = wrap(game, game.undoCoasterPiece, (coasterId) => ({
    type: 'undoCoasterPiece',
    coasterId,
  }))
  game.deleteCoasterPiece = wrap(
    game,
    game.deleteCoasterPiece,
    (coasterId, pieceIndex) => ({ type: 'deleteCoasterPiece', coasterId, pieceIndex }),
  )
  game.setCoasterAccess = wrap(
    game,
    game.setCoasterAccess,
    (coasterId, accessType, x, z) => ({
      type: 'setCoasterAccess',
      coasterId,
      accessType,
      x,
      z,
    }),
  )
  game.updateCoasterSettings = wrap(
    game,
    game.updateCoasterSettings,
    (coasterId, dispatchMode, intervalMinutes) => ({
      type: 'updateCoasterSettings',
      coasterId,
      dispatchMode,
      intervalMinutes,
    }),
  )
  game.updateCoasterPrice = wrap(game, game.updateCoasterPrice, (coasterId, price) => ({
    type: 'updateCoasterPrice',
    coasterId,
    price,
  }))
  game.setCoasterOperationMode = wrap(
    game,
    game.setCoasterOperationMode,
    (coasterId, mode) => ({ type: 'setCoasterOperationMode', coasterId, mode }),
  )
  game.recallCoasterTrain = wrap(game, game.recallCoasterTrain, (coasterId) => ({
    type: 'recallCoasterTrain',
    coasterId,
  }))
  game.updateBuildingPrice = wrap(
    game,
    game.updateBuildingPrice,
    (buildingId, price, allOfKind) => ({
      type: 'updateBuildingPrice',
      buildingId,
      price,
      allOfKind,
    }),
  )
  game.updateEntryPrice = wrap(game, game.updateEntryPrice, (price) => ({
    type: 'updateEntryPrice',
    price,
  }))
  game.updateSecurityGate = wrap(game, game.updateSecurityGate, (id, config) => ({
    type: 'updateSecurityGate',
    id,
    config,
  }))
  game.setDayPlanHour = wrap(game, game.setDayPlanHour, (offer, hour, active) => ({
    type: 'setDayPlanHour',
    offer,
    hour,
    active,
  }))
  game.updateDayVisitorWindow = wrap(
    game,
    game.updateDayVisitorWindow,
    (entryHour, exitHour) => ({ type: 'updateDayVisitorWindow', entryHour, exitHour }),
  )
  game.updateCampingCapacityBuffer = wrap(
    game,
    game.updateCampingCapacityBuffer,
    (percent) => ({ type: 'updateCampingCapacityBuffer', percent }),
  )
  game.updateFestivalCycle = wrap(
    game,
    game.updateFestivalCycle,
    (leadDays, festivalDays, breakDays) => ({
      type: 'updateFestivalCycle',
      leadDays,
      festivalDays,
      breakDays,
    }),
  )
  game.addDebugMoney = wrap(game, game.addDebugMoney, () => ({ type: 'addDebugMoney' }))
  game.removeVisitorCarsForDebug = wrap(game, game.removeVisitorCarsForDebug, () => ({
    type: 'removeVisitorCars',
  }))
}

export function executeNetworkCommand(game: GameState, command: GameCommand) {
  game.applyingCommand = true
  try {
    return applyGameCommand(game, command)
  } finally {
    game.applyingCommand = false
  }
}
