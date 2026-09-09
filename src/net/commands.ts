import type { GameState, ActionResult } from '../game/GameState'
import type { GameCommand } from './protocol'

export function applyGameCommand(game: GameState, command: GameCommand): ActionResult {
  switch (command.type) {
    case 'festival':
      return game.manageFestival(command.action)
    case 'place':
      return game.place(command.kind, command.x, command.z)
    case 'placePath':
      return game.placePathSegment(
        command.x,
        command.z,
        command.elevation,
        command.pathType,
        command.queueDirection,
        command.slope,
        command.wayType,
      )
    case 'undoPath':
      return game.undoPathSegment(
        command.x,
        command.z,
        command.elevation,
        command.previousPath,
      )
    case 'bulldoze':
      return game.bulldoze(command.x, command.z)
    case 'bulldozeArea':
      return game.bulldozeArea(command.cells)
    case 'editTerrain':
      return game.editTerrain(command.x, command.z, command.mode)
    case 'designateRoad':
      return game.designateRoad(command.cells)
    case 'designateParking':
      return game.designateParkingArea(command.cells)
    case 'designateCampingCell':
      return game.designateCampingCell(command.x, command.z, command.enabled)
    case 'designateCampingArea':
      return game.designateCampingArea(command.cells)
    case 'designateMedicalArea':
      return game.designateMedicalArea(command.cells)
    case 'designateWasteDump':
      return game.designateWasteDump(command.cells)
    case 'designateStageForecourt':
      return game.designateStageForecourt(command.cells)
    case 'designatePowerCable':
      return game.designatePowerCable(command.x, command.z, command.enabled)
    case 'designatePowerCableArea':
      return game.designatePowerCableArea(command.cells)
    case 'setRoadDirection':
      return game.setRoadDirection(command.x, command.z, command.direction)
    case 'toggleRoadSeparator':
      return game.toggleRoadSeparator(command.x, command.z, command.direction)
    case 'toggleCrosswalk':
      return game.toggleCrosswalk(command.x, command.z)
    case 'setRoadSpeed':
      return game.setRoadSpeed(command.x, command.z, command.speedLimit)
    case 'setPathFlow':
      return game.setPathFlow(command.x, command.z, command.elevation, command.direction)
    case 'setParkOpen':
      return game.setParkOpen(command.open)
    case 'setSpeed':
      game.setSpeed(command.speed)
      return { ok: true, message: `Tempo ${command.speed}` }
    case 'hireStaff':
      return game.hireStaff(command.role)
    case 'fireStaff':
      return game.fireStaff(command.role)
    case 'buyAmbulance':
      return game.buyAmbulance(command.garageId)
    case 'buyBus':
      return game.buyBus(command.depotId)
    case 'sellBus':
      return game.sellBus(command.depotId)
    case 'buyGarbageTruck':
      return game.buyGarbageTruck(command.depotId)
    case 'sellGarbageTruck':
      return game.sellGarbageTruck(command.depotId)
    case 'createBusLine':
      return game.createBusLine(
        command.name,
        command.depotId,
        command.stopIds,
        command.busCount,
        command.headway,
      )
    case 'deleteBusLine':
      return game.deleteBusLine(command.lineId)
    case 'startCoaster':
      return game.startCoaster(command.typeId, command.x, command.z)
    case 'appendCoasterPiece':
      return game.appendCoasterPiece(
        command.coasterId,
        command.kind,
        command.chainLift,
        command.afterPieceIndex,
        command.options,
      )
    case 'undoCoasterPiece':
      return game.undoCoasterPiece(command.coasterId)
    case 'deleteCoasterPiece':
      return game.deleteCoasterPiece(command.coasterId, command.pieceIndex)
    case 'setCoasterAccess':
      return game.setCoasterAccess(
        command.coasterId,
        command.accessType,
        command.x,
        command.z,
      )
    case 'updateCoasterSettings':
      game.updateCoasterSettings(
        command.coasterId,
        command.dispatchMode,
        command.intervalMinutes,
      )
      return { ok: true, message: 'Achterbahn-Einstellungen gespeichert' }
    case 'updateCoasterPrice':
      game.updateCoasterPrice(command.coasterId, command.price)
      return { ok: true, message: 'Preis geändert' }
    case 'setCoasterOperationMode':
      return game.setCoasterOperationMode(command.coasterId, command.mode)
    case 'recallCoasterTrain':
      return game.recallCoasterTrain(command.coasterId)
    case 'updateBuildingPrice':
      game.updateBuildingPrice(command.buildingId, command.price)
      return { ok: true, message: 'Preis geändert' }
    case 'updateEntryPrice':
      game.updateEntryPrice(command.price)
      return { ok: true, message: 'Eintrittspreis geändert' }
    case 'updateSecurityGate':
      return game.updateSecurityGate(command.id, command.config)
    case 'setDayPlanHour':
      game.setDayPlanHour(command.offer, command.hour, command.active)
      return { ok: true, message: 'Tagesplan geändert' }
    case 'updateDayVisitorWindow':
      return game.updateDayVisitorWindow(command.entryHour, command.exitHour)
    case 'updateCampingCapacityBuffer':
      return game.updateCampingCapacityBuffer(command.percent)
    case 'updateFestivalCycle':
      return game.updateFestivalCycle(
        command.leadDays,
        command.festivalDays,
        command.breakDays,
      )
    case 'addDebugMoney':
      return game.addDebugMoney()
    case 'removeVisitorCars':
      return game.removeVisitorCarsForDebug()
  }
}
