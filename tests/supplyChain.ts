import { WAY_TYPES, wayInfo } from '../src/game/wayTypes'
import type { WayType } from '../src/game/wayTypes'
import assert from 'node:assert/strict'
import type { GameState, GameSnapshot } from '../src/game/GameState'
import { GameState as Game } from '../src/game/GameState'
import { updateSupplyChain, localStock } from '../src/game/supplyChain'
import { groundInfo, prepareGroundArea } from '../src/game/ground'
import { WorldUpdates } from '../src/net/worldUpdates'
import { packWorld } from '../src/net/codec'
import { hashStringSeed } from '../src/game/rng'

export function testSupplyChain(fixture: (count?: number) => GameState) {
  const game = fixture(0), s = game.snapshot as GameSnapshot
  game.addDebugMoney()
  const waysGame = fixture(0), ways = waysGame.snapshot as GameSnapshot
  waysGame.addDebugMoney()
  assert.equal(waysGame.manageFestival({ type: 'wayArea', from: { x: 0, z: 0 }, to: { x: 0, z: 0 }, kind: 'roadAsphalt' }).ok, false)
  const editorBefore = ways.money
  assert.ok(waysGame.placePathSegment(6, -8, 0, 'queue', 0, 0, 'footBoard').ok)
  const editorPath = ways.buildings.find(b => b.kind === 'path' && b.x === 6 && b.z === -8)!
  assert.equal(editorPath.wayType, 'footBoard')
  assert.equal(editorPath.pathType, 'queue', 'surface selection preserves queue behavior')
  assert.equal(editorBefore - ways.money, WAY_TYPES.footBoard.cost)
  assert.equal(wayInfo(ways, 6, -8, 'foot').capacity, 7)
  const previousEditorPath = structuredClone(editorPath)
  assert.ok(waysGame.placePathSegment(6, -8, 0, 'queue', 0, 0, 'footDirt').ok)
  assert.ok(waysGame.undoPathSegment(6, -8, 0, previousEditorPath).ok)
  assert.equal(wayInfo(ways, 6, -8, 'foot').capacity, 7, 'undo restores the previous surface properties')
  let coordinate = 7
  for (const [id, type] of Object.entries(WAY_TYPES)) {
    const cell = { x: coordinate++, z: -12 }
    if (type.bearing > 1) {
      waysGame.manageFestival({ type: 'ground', ...cell, kind: 'drain' })
      waysGame.manageFestival({ type: 'ground', ...cell, kind: 'compact' })
    }
    const before = ways.money
    assert.ok(waysGame.manageFestival({ type: 'wayArea', from: cell, to: cell, kind: id as WayType }).ok, id)
    assert.equal(before - ways.money, type.cost, `${id}: exact construction price`)
    const info = wayInfo(ways, cell.x, cell.z, type.mode)
    assert.equal(info.limit, type.limit)
    assert.equal(info.capacity, type.capacity)
    const charged = ways.money
    assert.equal(waysGame.manageFestival({ type: 'wayArea', from: cell, to: cell, kind: id as WayType }).ok, false)
    assert.equal(ways.money, charged)
  }
  ways.festival.wetness = 100
  assert.ok(wayInfo(ways, 9, -12, 'foot').speed > wayInfo(ways, 7, -12, 'foot').speed * 2, 'boardwalk remains useful in wet weather')
  assert.equal(wayInfo(ways, 13, -12, 'road').stuck, 0, 'road plates cannot get stuck on wet soil')
  assert.ok(wayInfo(ways, 11, -12, 'road').stuck > 0)
  assert.deepEqual(new Game(structuredClone(ways)).snapshot.festival.infrastructure.ground, ways.festival.infrastructure.ground)
  let notices = 0
  const unsubscribe = waysGame.subscribe(() => notices++)
  notices = 0
  assert.ok(waysGame.manageFestival({ type: 'wayArea', from: { x: 6, z: -10 }, to: { x: 8, z: -10 }, kind: 'footBoard' }).ok)
  assert.equal(notices, 1, 'an area build emits only one UI update')
  unsubscribe()
  assert.ok(waysGame.bulldoze(6, -10).ok)
  assert.equal(ways.festival.infrastructure.ground['6,-10']!.footway, undefined, 'demolition removes surface effects')
  const areaGame = fixture(0), area = areaGame.snapshot as GameSnapshot
  const beforeArea = structuredClone(area)
  const estimate = prepareGroundArea(area, { x: 7, z: 3 }, { x: 5, z: 1 }, 'drain', true)
  assert.equal(estimate.changed, 9, 'reverse dragging selects an inclusive rectangle')
  assert.equal(estimate.cost, 9 * 35)
  assert.deepEqual(area, beforeArea, 'area preview does not change finances or terrain')
  assert.ok(areaGame.manageFestival({ type: 'groundArea', from: { x: 7, z: 3 }, to: { x: 5, z: 1 }, kind: 'drain' }).ok)
  assert.equal(area.money, beforeArea.money - estimate.cost)
  const charged = area.money
  assert.equal(areaGame.manageFestival({ type: 'groundArea', from: { x: 5, z: 1 }, to: { x: 7, z: 3 }, kind: 'drain' }).ok, false)
  assert.equal(area.money, charged, 'repeating a prepared area never charges twice')
  assert.equal(areaGame.manageFestival({ type: 'groundArea', from: { x: -999, z: 1 }, to: { x: 7, z: 3 }, kind: 'drain' }).ok, false)
  area.money = 35
  const partial = prepareGroundArea(area, { x: 10, z: 10 }, { x: 11, z: 11 }, 'drain')
  assert.equal(partial.changed, 1); assert.equal(partial.skipped, 3); assert.equal(area.money, 0)

  const action = game.manageFestival.bind(game)
  assert.equal(action({ type: 'order', kind: 'food', quantity: 200, delay: 0 }).ok, false, 'orders require a placed depot')
  assert.equal(action({ type: 'ground', x: 0, z: 0, kind: 'pave' }).ok, false, 'paving requires preparation')
  assert.equal(action({ type: 'ground', x: 0, z: 0, kind: 'compact' }).ok, false, 'clay needs drainage')
  assert.ok(action({ type: 'ground', x: 0, z: 0, kind: 'drain' }).ok)
  assert.ok(action({ type: 'ground', x: 0, z: 0, kind: 'compact' }).ok)
  assert.ok(action({ type: 'ground', x: 0, z: 0, kind: 'pave' }).ok)
  const money = s.money
  assert.equal(action({ type: 'ground', x: 0, z: 0, kind: 'pave' }).ok, false)
  assert.equal(s.money, money, 'duplicate improvements do not charge')
  s.festival.wetness = 100
  assert.ok(groundInfo(s, 0, 0).speed > groundInfo(s, 1, 0).speed * 2, 'paved surfaces resist wet clay')
  s.festival.wetness = 0
  for (const kind of ['drain', 'compact'] as const) assert.ok(action({ type: 'ground', x: 1, z: -20, kind }).ok)
  assert.ok(action({ type: 'depot', x: 1, z: -20 }).ok)
  assert.equal(game.placePathSegment(1, -20, 0).ok, false, 'depot reserves its plot')
  assert.equal(game.editTerrain(1, -20, 'raise').ok, false, 'terrain under depots cannot move')
  assert.ok(game.place('food', 5, -20).ok)
  const shop = s.buildings.find(b => b.kind === 'food')!, depot = s.festival.infrastructure.depots[0]!
  assert.ok(action({ type: 'route', depotId: depot.id, targetId: shop.id, kind: 'food', minimum: 80, waypoints: [{ x: 3, z: -19, elevation: 0 }] }).ok)
  assert.ok(action({ type: 'order', depotId: depot.id, kind: 'food', quantity: 200, delay: 0 }).ok)
  const advance = (count: number, target = game) => {
    const snapshot = target.snapshot as GameSnapshot
    for (let n = 0; n < count; n++) { snapshot.minute += 1; updateSupplyChain(snapshot, (a, b) => (target as any).findPath(a, b)) }
  }
  advance(120)
  assert.equal(localStock(s, shop.id, 'food'), 0, 'no goods appear without a road to the depot')
  assert.equal(depot.stock.food, 0)
  assert.equal(s.festival.deliveries.length, 1)
  for (let z = -s.scenario.worldSize / 2; z <= -20; z++) if (!s.logistics.roadCells.some(c => c.x === 0 && c.z === z)) { const result = game.designateRoad([{ x: 0, z }]); assert.ok(result.ok, `${z}: ${result.message}`) }
  advance(1)
  assert.equal(s.festival.infrastructure.trucks.length, 1, 'physical truck enters at map edge')
  assert.equal(depot.stock.food, 0, 'dispatch does not credit depot stock')
  const copy = new Game(structuredClone(s))
  advance(60); advance(60, copy)
  assert.deepEqual(copy.snapshot.festival.infrastructure, s.festival.infrastructure, 'save/load in transit continues identically')
  assert.equal(localStock(s, shop.id, 'food'), 80)
  assert.equal(depot.stock.food, 120)
  assert.equal(s.festival.deliveries.length, 0)
  assert.equal(s.festival.infrastructure.trucks.length, 0, 'empty truck exits the map physically')
  s.festival.infrastructure.shops[shop.id]!.food = 0
  advance(1)
  const carrier = s.festival.infrastructure.routes[0]!, blocked = { ...carrier.path[0]! }
  assert.equal(carrier.cargo, 40)
  assert.ok(game.bulldoze(blocked.x, blocked.z).ok)
  const position = { ...carrier.position }
  advance(12)
  assert.deepEqual(carrier.position, position, 'removed path stops the carrier')
  assert.equal(carrier.cargo, 40, 'blocked carrier keeps all cargo')
  assert.equal(localStock(s, shop.id, 'food'), 0, 'blocked deliveries cannot supply the shop remotely')
  assert.ok(game.placePathSegment(blocked.x, blocked.z, blocked.elevation).ok)
  advance(60)
  assert.equal(localStock(s, shop.id, 'food'), 80, 'repairing the route resumes delivery')
  const depotBeforeOrder = depot.stock.food
  assert.ok(action({ type: 'minimum', depotId: depot.id, kind: 'food', quantity: 300 }).ok)
  advance(15)
  assert.equal(s.festival.deliveries.length, 1)
  assert.equal(s.festival.deliveries[0]!.quantity, 300 - depotBeforeOrder, 'automatic purchase accounts for stock and pending cargo')
  advance(15)
  assert.equal(s.festival.deliveries.length, 1, 'minimum stock does not duplicate pending purchases')

  const ingressGame = fixture(0), ingress = ingressGame.snapshot as GameSnapshot
  ingressGame.addDebugMoney()
  const edgeZ = -ingress.scenario.worldSize / 2
  for (const kind of ['drain', 'compact'] as const) assert.ok(ingressGame.manageFestival({ type: 'ground', x: 1, z: -20, kind }).ok)
  ingress.terrain.heights['1,-20'] = 2
  for (let z = edgeZ; z <= -20; z++) if (!ingress.logistics.roadCells.some(c => c.x === 0 && c.z === z)) {
    const result = ingressGame.designateRoad([{ x: 0, z }]); assert.ok(result.ok, `${z}: ${result.message}`)
  }
  assert.ok(ingressGame.manageFestival({ type: 'depot', x: 1, z: -20, role: 'delivery' }).ok)
  for (let x = -3; x <= 2; x += 1) {
    ingress.logistics.roadVehicles.push({
      id: `entry-car-${x}`, kind: 'visitorCar', position: { x, z: edgeZ }, cell: { x, z: edgeZ },
      route: [], state: 'waiting', speed: 0, passengerIds: [], groupId: null, parkingCell: null, target: null,
      facing: 0, waitMinutes: 0, resumeState: null, lineId: null, nextStopIndex: 0, cargo: 0,
    })
  }
  assert.ok(ingressGame.manageFestival({ type: 'order', kind: 'food', quantity: 50, delay: 0 }).ok)
  for (let n = 0; n < 91; n++) { ingress.minute += 1; updateSupplyChain(ingress, (a, b) => (ingressGame as any).findPath(a, b)) }
  const queued = ingress.festival.infrastructure.trucks.find(t => t.deliveryId)
  assert.ok(queued, 'occupied map-edge cells still spawn a delivery truck')
  assert.equal(queued!.z, edgeZ - 1, 'truck waits off-map instead of consuming the inbound lane')
  assert.ok(queued!.path.length > 0, 'off-map truck keeps a route onto the site')
  assert.equal(ingress.festival.infrastructure.depots[0]!.stock.food, 0)

  assert.ok(game.place('wasteBin', 4, -16).ok)
  const bin = s.buildings.find(b => b.kind === 'wasteBin')!
  bin.wasteFill = 12
  assert.equal(action({ type: 'route', depotId: depot.id, targetId: bin.id, kind: 'waste', minimum: 8, waypoints: [] }).ok, false, 'new waste routes belong to cleaning staff')
  s.festival.infrastructure.routes.push({ ...structuredClone(s.festival.infrastructure.routes[0]!), id:'legacy-waste', targetId:bin.id, kind:'waste', minimum:8, phase:'idle', cargo:0, path:[], waypoints:[] })
  const collector = s.festival.infrastructure.routes.find(r => r.kind === 'waste')!
  // Older saves may still have a waste cart in transit: finish its cargo, then retire.
  collector.phase = 'return'; collector.cargo = 12; bin.wasteFill = 0
  advance(40)
  assert.equal(bin.wasteFill, 0)
  assert.equal(collector.cargo, 12, 'collected waste stays on cart when no dump exists')
  assert.ok(game.designateWasteDump([{ x: 5, z: -17 }]).ok)
  advance(50)
  assert.equal(collector.cargo, 0)
  assert.equal(s.wasteDumpCells[0]!.stored, 12, 'waste is deposited only after cart arrival')
  assert.equal(collector.phase, 'idle')
  assert.ok(Math.abs(collector.position.x - depot.x) + Math.abs(collector.position.z - depot.z) === 1, 'cart returns to home depot')

  const updates = new WorldUpdates(), client = new Game()
  client.networkMode = 'client'
  client.applyNetworkWorld(JSON.parse(updates.encode(packWorld(s), true)).world)
  advance(10)
  const delta = JSON.parse(updates.encode(packWorld(s)))
  client.applyNetworkUpdate(delta.world, delta.visitors, delta.removed)
  assert.deepEqual(client.snapshot.festival.infrastructure, s.festival.infrastructure, 'network carries inventory, routes, cargo and ground upgrades')
  const frozen = structuredClone(client.snapshot.festival.infrastructure); client.tick(1)
  assert.deepEqual(client.snapshot.festival.infrastructure, frozen, 'clients cannot advance transports independently')

  const rainGame = fixture(0), rain = rainGame.snapshot as GameSnapshot
  rain.festival.wetness = 100
  let id = 'rain-0'
  for (let n = 0; hashStringSeed(`${id}:0,-24`) % 100 >= 35; n++) id = `rain-${n + 1}`
  rain.festival.infrastructure.trucks.push({ id, deliveryId: null, depotId: 'test', x: 0, z: -24, path: [{ x: 0, z: -23 }], phase: 'return', progress: 0, stuck: 0, testedCell: '', cargo: 0, kind: 'food' })
  advance(2, rainGame)
  const truck = rain.festival.infrastructure.trucks[0]!
  assert.equal(truck.stuck, 8, 'wet field road traps a susceptible vehicle')
  advance(7, rainGame)
  assert.equal(truck.stuck, 1)
  assert.equal(truck.z, -24, 'driver must finish pushing before the truck can move')
  const rainCopy = new Game(structuredClone(rain))
  advance(1, rainGame); advance(1, rainCopy)
  assert.deepEqual(rainCopy.snapshot.festival.infrastructure, rain.festival.infrastructure, 'push-out timer survives saves')

  const crowdGame = fixture(10), crowd = crowdGame.snapshot as GameSnapshot, walker = crowd.visitors[0]!
  for (const visitor of crowd.visitors) { visitor.x = 3.5; visitor.z = -19.5; visitor.cellX = 3; visitor.cellZ = -20; visitor.cellElevation = 0; visitor.route = []; visitor.state = 'exploring' }
  walker.x = 2.5; walker.cellX = 2; walker.route = [{ x: 3, z: -20, elevation: 0 }]
  walker.tileOffsetX = 0.5; walker.tileOffsetZ = 0.5
  ;(crowdGame as any).walkVisitors(0.1)
  const crowdedProgress = walker.x - 2.5
  assert.ok(crowdedProgress > 0 && crowdedProgress < 0.1, 'full tiles permit slow positive movement')
  for (let i = 0; i < 2000 && walker.route.length; i++) (crowdGame as any).walkVisitors(0.1)
  assert.equal(walker.cellX, 3, 'visitor eventually crosses even while all nine occupants remain')
  walker.route = [{ x: 4, z: -20, elevation: 0 }]
  ;(crowdGame as any).walkVisitors(0.1)
  const exitProgress = walker.x - 3.5
  assert.ok(exitProgress > crowdedProgress * 4, 'leaving a full tile for a free neighbor releases congestion quickly')
  crowd.visitors.splice(1)
  walker.x = 2.5; walker.cellX = 2; walker.route = [{ x: 3, z: -20, elevation: 0 }]
  ;(crowdGame as any).walkVisitors(0.1)
  assert.ok(walker.x - 2.5 > crowdedProgress * 4, 'uncrowded movement is substantially faster')

  const rerouteGame = fixture(1), rerouteState = rerouteGame.snapshot as GameSnapshot
  rerouteState.buildings = []
  const oldCells = [[2,-20], [3,-20], [3,-19], [3,-18], [4,-18], [5,-18], [5,-19], [5,-20]]
  for (const [x,z] of oldCells) assert.ok(rerouteGame.placePathSegment(x!, z!, 0).ok)
  const guest = rerouteState.visitors[0]!
  guest.cellX = 2; guest.cellZ = -20; guest.cellElevation = 0
  guest.x = 2.8; guest.z = -19.5; guest.state = 'exploring'; guest.targetId = null
  guest.route = (rerouteGame as any).findPath({x:2,z:-20,elevation:0}, [{x:5,z:-20,elevation:0}])
  assert.ok(guest.route.length > 3)
  assert.ok(rerouteGame.placePathSegment(4, -20, 0).ok)
  rerouteState.simTick = 100
  const guestPosition = [guest.x, guest.z], destination = {...guest.route.at(-1)!}, next = {...guest.route[0]!}
  ;(rerouteGame as any).reviewVisitorRoutes()
  assert.equal(guest.route.length, 3, 'existing journey adopts newly built shortcut')
  assert.deepEqual(guest.route[0], next, 'current segment is retained')
  assert.deepEqual(guest.route.at(-1), destination, 'destination remains unchanged')
  assert.deepEqual([guest.x, guest.z], guestPosition, 'replanning never teleports visitors')
  const saved = new Game(structuredClone(rerouteState))
  ;(saved as any).reviewVisitorRoutes()
  assert.deepEqual(saved.snapshot.visitors[0]!.route, guest.route, 'route review remains deterministic after loading')
  const bypassGame = fixture(10), bypassState = bypassGame.snapshot as GameSnapshot
  const traveler = bypassState.visitors[0]!
  const startCell = { x: 3, z: -20, elevation: 0 }, endCell = { x: 3, z: -16, elevation: 0 }
  const initialRoute = (bypassGame as any).findPath(startCell, [endCell])
  assert.ok(initialRoute.some((cell: any) => cell.x === 3 && cell.z === -18))
  for (const person of bypassState.visitors) {
    person.cellX = 3; person.cellZ = -18; person.cellElevation = 0
    person.x = 3.5; person.z = -17.5; person.route = []; person.state = 'exploring'
  }
  traveler.cellZ = -20; traveler.x = 3.5; traveler.z = -19.5
  traveler.tileOffsetX = 0.5; traveler.tileOffsetZ = 0.5; traveler.route = initialRoute
  bypassState.simTick = 100
  ;(bypassGame as any).walkVisitors(0.000001)
  assert.ok(traveler.route.some(cell => cell.x !== 3), 'traveler uses adjacent free path to avoid a crowd')
  assert.ok(!traveler.route.some(cell => cell.x === 3 && cell.z === -18), 'occupied bottleneck is avoided even with a cached direct route')
  assert.deepEqual(traveler.route.at(-1), endCell)
  const congestedRoute = (bypassGame as any).findPath(startCell, [endCell])
  assert.ok(!congestedRoute.some((cell: any) => cell.x === 3 && cell.z === -18), 'new journeys also avoid the bottleneck')
  bypassState.visitors.splice(1)
  ;(bypassGame as any).walkVisitors(0.000001)
  const clearedRoute = (bypassGame as any).findPath(startCell, [endCell])
  assert.equal(clearedRoute.length, 4, 'direct path becomes attractive again once the crowd clears')
  const transportState = structuredClone(s)
  transportState.visitors = structuredClone(fixture(9).snapshot.visitors)
  for (const person of transportState.visitors) {
    person.cellX = 3; person.cellZ = -20; person.cellElevation = 0
    person.x = 3.5; person.z = -19.5; person.state = 'exploring'; person.route = []
  }
  const transport = transportState.festival.infrastructure.routes[0]!
  transport.position = {x:2,z:-20,elevation:0}; transport.path = [{x:3,z:-20,elevation:0}]
  transport.phase = 'outbound'; transport.cargo = 40; transport.progress = 0
  const transportGame = new Game(transportState)
  advance(1, transportGame)
  const loaded = transportGame.snapshot.festival.infrastructure.routes[0]!
  assert.ok(loaded.progress > 0 && loaded.progress < 0.1, 'loaded cart creeps through full visitor tiles')
  assert.equal(loaded.position.x, 2)
  ;(transportGame as any).walkVisitors(0.000001)
  assert.equal((transportGame as any).movementOccupancy.get((transportGame as any).packCell(loaded.position)), 3, 'loaded cart occupies three visitor spaces')
  loaded.cargo = 0; loaded.progress = 0
  advance(1, transportGame)
  const emptyProgress = loaded.progress
  assert.ok(emptyProgress > 0, 'empty cart also keeps moving through crowds')
  transportGame.snapshot.visitors.forEach(person => person.cellElevation = 2)
  loaded.progress = 0
  advance(1, transportGame)
  assert.ok(loaded.position.x === 3 || loaded.progress > emptyProgress * 4, 'visitors on a bridge do not block the cart below')
  console.log('PASS congestion-aware detours, cached route invalidation and recovery after crowds clear')
  console.log('PASS physical delivery and distribution, minimum stock, waste conservation, soil requirements, in-transit saves and multiplayer')
}
