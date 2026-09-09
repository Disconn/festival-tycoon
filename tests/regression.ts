import { testMusicPlanning } from './musicPlanning'
import { testStageInteraction } from './stageInteraction'
import { testStageTickets } from './stageTickets'
import { SupplyChainView } from '../src/view/SupplyChainView'
import { transportMotionFactor } from '../src/view/transportMotion'
import { testOperations } from './operations'
import { CampingView } from '../src/view/CampingView'
import { readFileSync } from 'node:fs'
import { encodeSaveText, decodeSaveText } from '../src/game/saveText'
import { testEnvironments } from './environments'
import { testSupplyChain } from './supplyChain'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { GameState } from '../src/game/GameState'
import { findWeightedPath, createPathScratch } from '../src/game/pathfinding'
import { packWorld } from '../src/net/codec'
import { WorldUpdates } from '../src/net/worldUpdates'
import { MultiplayerSession } from '../src/net/session'
import { enableMultiplayerCommands } from '../src/net/bind'
import { WebSocket, WebSocketServer } from 'ws'
import { attachMultiplayer } from '../server/rooms'
import type { GameCommand } from '../src/net/protocol'
import { scenePixelRatio } from '../src/view/renderResolution'
import { testFestival } from './festival'

function test(name: string, run: () => void) {
  run()
  console.log(`PASS ${name}`)
}

function fixture(count = 20): GameState {
  const initial = structuredClone(new GameState().snapshot)
  initial.terrain = { heights: {} }
  initial.buildings = []
  initial.festival.planning = false
  initial.parkOpen = true
  initial.dayPlan.leadDays = 0
  initial.minute = 12 * 60
  initial.scenario.carArrivalShare = 0
  const game = new GameState(initial)
  for (let z = -24; z <= 8; z++) {
    for (let x = 2; x <= 4; x++) game.placePathSegment(x, z, 0)
  }
  for (let i = 0; i < count; i++) {
    // Use real generated visitors and routes; only bypass arrival timing for load tests.
    const visitor = (game as any).spawnVisitorMember('day', `group-${i}`, 'pedestrian', false)
    assert.ok(visitor)
  }
  return game
}

test('Base64 saves preserve Unicode and full worlds without overwriting local saves', () => {
  const original = fixture(2)
  original.snapshot.visitors[0]!.thought = 'Bühne, Spaß und Musik 🎵'
  const encoded = encodeSaveText(JSON.stringify(original.snapshot))
  const loaded = GameState.fromJSON(decodeSaveText(encoded))!
  assert.ok(loaded)
  assert.equal(loaded.snapshot.visitors[0]!.thought, original.snapshot.visitors[0]!.thought)
  assert.deepEqual(loaded.snapshot.festival, original.snapshot.festival)
  assert.equal(loaded.snapshot.buildings.length, original.snapshot.buildings.length)
  assert.equal(decodeSaveText('  ' + encoded + '\n'), decodeSaveText(encoded))
  assert.throws(() => decodeSaveText('not base64!'))
  assert.equal(GameState.fromJSON('{}'), null)
  assert.equal(GameState.fromJSON('null'), null)
})

test('camping visuals retain unaffected tents when one camper changes', () => {
  const game = fixture(2), snapshot = game.snapshot
  snapshot.visitors.forEach((visitor, index) => {
    visitor.campsite = { x: index, z: 0, elevation: 0 } as any
    visitor.campingPhase = 'ready'
  })
  const view = new CampingView()
  view.update(snapshot)
  const models = (view as any).propModels as Map<string, any>
  const firstKey = `visitor:${snapshot.visitors[0]!.id}`, secondKey = `visitor:${snapshot.visitors[1]!.id}`
  const first = models.get(firstKey).model, second = models.get(secondKey).model
  const batchRoot = (view as any).batchedProps.children[0]
  assert.ok(batchRoot.children.length < 14, 'repeated tent and cart parts share draw calls')
  let originalVisibleMeshes = 0
  ;(view as any).props.traverse((object: any) => { if (object.isMesh && object.visible) originalVisibleMeshes++ })
  assert.equal(originalVisibleMeshes, 0, 'original camp meshes are not drawn twice')
  const instanceCount = batchRoot.children.reduce((sum: number, batch: any) => sum + batch.count, 0)
  assert.equal(instanceCount, 14, 'batching retains every tent and handcart part')

  snapshot.visitors[0]!.color = 0xff0000
  view.update(snapshot)
  assert.notEqual(models.get(firstKey).model, first)
  assert.equal(models.get(secondKey).model, second, 'unaffected tent and cart are reused')
  snapshot.visitors[0]!.campingPhase = 'seeking'
  view.update(snapshot)
  assert.equal(models.has(firstKey), false)
  assert.equal(models.get(secondKey).model, second)
  view.invalidate()
  assert.equal(models.size, 0)
})

test('transport rendering moves between cells smoothly and respects pause', () => {
  const game=fixture(0), snapshot=game.snapshot
  const carrier={id:'carrier-visual',depotId:'test',targetId:'',kind:'food' as const,minimum:40,waypoints:[],position:{x:2,z:-20,elevation:0},path:[],phase:'idle' as const,cargo:0,progress:0,status:''}
  snapshot.festival.infrastructure.routes.push(carrier)
  const view=new SupplyChainView()
  view.update(snapshot,false);view.animate(false,0)
  const model=(view as any).actors.get(carrier.id)
  const before=model.position.x
  carrier.position={x:3,z:-20,elevation:0}
  view.update(snapshot,false)
  assert.equal(model.position.x,before,'logic update does not teleport the model')
  view.animate(false,100)
  assert.ok(model.position.x>before&&model.position.x<3.5,'render frame places carrier between the two tiles')
  const paused=model.position.x
  view.animate(true,200)
  assert.equal(model.position.x,paused,'pause freezes visual movement')
  view.animate(false,300)
  assert.ok(model.position.x>paused)
  let at60=0,at144=0
  for(let n=0;n<60;n++)at60+=(1-at60)*transportMotionFactor(1/60)
  for(let n=0;n<144;n++)at144+=(1-at144)*transportMotionFactor(1/144)
  assert.ok(Math.abs(at60-at144)<1e-12,'movement rate is independent of FPS')
})

testEnvironments()
testSupplyChain(fixture)
testFestival(fixture)
testMusicPlanning(fixture)
testOperations(fixture)
testStageTickets(fixture)
testStageInteraction(fixture)

test('optional route searches have a strict expansion budget', () => {
  let expansions = 0
  const route = findWeightedPath({ start: 0, key: n => n, isGoal: n => n === 1000,
    neighbors: n => { expansions++; return [n + 1] }, movementCost: () => 1, maxVisited: 32 })
  assert.equal(route, null)
  assert.equal(expansions, 32)
})

test('path keys may be zero, including the goal and intermediate nodes', () => {
  const scratch = createPathScratch<number>()
  const search = (goal: number) => findWeightedPath({
    start: 2, key: n => n, isGoal: n => n === goal,
    neighbors: n => n > -1 ? [n - 1] : [], movementCost: () => 1,
  }, scratch)
  assert.deepEqual(search(0), [1, 0])
  assert.deepEqual(search(-1), [1, 0, -1])
  assert.equal(search(-2), null)
})

test('scene pixel grid stays capped at 1440x810 on Full HD, 4K and ultrawide displays', () => {
  for (const [width, height] of [[1280, 720], [1920, 1080], [3840, 2160], [5120, 1440], [7680, 4320]]) {
    const ratio = scenePixelRatio(width, height)
    assert.ok(width * ratio <= 1440 && height * ratio <= 810)
    assert.ok(ratio <= 0.75)
  }
  assert.equal(scenePixelRatio(1920, 1080), 0.75)
  assert.equal(scenePixelRatio(3840, 2160), 0.375)
})

test('campers reach their pitch, build a tent and enter it on returning', () => {
  for (const speed of [1, 2, 3]) {
    const game = fixture(0)
    game.designateCampingArea([{ x: 5, z: -23 }, { x: 5, z: -22 }, { x: 6, z: -23 }])
    const camper = (game as any).spawnVisitorMember('camping', 'camp-test', 'pedestrian', false)
    assert.ok(camper?.campsite, 'camper must have a reachable reserved pitch')
    game.setSpeed(speed)
    for (let i = 0; i < 300 && camper.hasHandcart; i++) game.tick(0.1)
    assert.equal(camper.hasHandcart, false, `tent construction must finish at speed ${speed}`)
    assert.notEqual(camper.campingPhase, 'seeking')
    assert.notEqual(camper.campingPhase, 'building')
    camper.state = 'camping'
    camper.campingPhase = 'returning'
    camper.route = []
    camper.targetId = null
    camper.needs.energy = 20
    game.tick(0.1)
    assert.equal(camper.campingPhase, 'resting')
  }
})

test('unfinished camper setup recovers from a saved exploring state', () => {
  const game = fixture(0)
  game.designateCampingArea([{ x: 5, z: -23 }, { x: 5, z: -22 }])
  const camper = (game as any).spawnVisitorMember('camping', 'saved-camper', 'pedestrian', false)
  assert.ok(camper?.campsite)
  camper.state = 'exploring'
  camper.route = []
  const loaded = new GameState(game.snapshot)
  const restored = loaded.getVisitor(camper.id)!
  for (let i = 0; i < 300 && restored.hasHandcart; i++) loaded.tick(0.1)
  assert.equal(restored.hasHandcart, false)
})

test('simulation is independent of render frame partition at all speeds', () => {
  const snapshot = fixture().snapshot
  for (const speed of [1, 2, 3]) {
    const a = new GameState(snapshot), b = new GameState(snapshot)
    a.setSpeed(speed); b.setSpeed(speed)
    for (let i = 0; i < 60; i++) {
      a.tick(0.1)
      for (let j = 0; j < 4; j++) b.tick(0.025)
    }
    assert.equal(JSON.stringify(packWorld(a.snapshot)), JSON.stringify(packWorld(b.snapshot)))
  }
})

test('authoritative deltas preserve nested state, arrivals, departures and client tools', () => {
  const host = fixture(), client = new GameState()
  client.networkMode = 'client'
  client.setTool('path')
  const updates = new WorldUpdates()
  client.applyNetworkWorld(JSON.parse(updates.encode(packWorld(host.snapshot), true)).world)
  assert.equal(client.snapshot.selectedTool, 'path')
  for (let i = 0; i < 30; i++) {
    host.tick(0.1)
    if (i === 5) (host as any).spawnVisitorMember('day', 'new', 'pedestrian', false)
    if (i === 10) (host.snapshot.visitors as any[]).splice(0, 1)
    const message = JSON.parse(updates.encode(packWorld(host.snapshot)))
    client.applyNetworkUpdate(message.world, message.visitors, message.removed)
    const before = JSON.stringify(packWorld(client.snapshot))
    client.tick(0.3)
    assert.equal(JSON.stringify(packWorld(client.snapshot)), before)
    assert.deepEqual(JSON.parse(JSON.stringify(packWorld(client.snapshot))), JSON.parse(JSON.stringify(packWorld(host.snapshot))))
  }
  const idle = JSON.parse(updates.encode(packWorld(host.snapshot)))
  assert.deepEqual(idle.world, {})
  assert.deepEqual(idle.visitors, [])
})

test('paused host executes commands and resumes without stranding queued commands', () => {
  const host = fixture(0)
  host.networkMode = 'host'
  host.schedulePublicCommand({ type: 'setSpeed', speed: 0 })
  host.schedulePublicCommand({ type: 'updateEntryPrice', price: 27 })
  assert.equal(host.snapshot.speed, 0, 'pause applies without a simulation tick')
  assert.equal(host.snapshot.entryPrice, 27, 'commands execute even while simulation is stopped')
  for (let i = 0; i < 6; i++) host.tick(0.1)
  assert.equal(host.snapshot.speed, 0)
  assert.equal(host.snapshot.entryPrice, 27)
  host.schedulePublicCommand({ type: 'setSpeed', speed: 1 })
  assert.equal(host.snapshot.speed, 1, 'resume cannot be stranded in a future tick')
  host.tick(0.1)
  assert.equal(host.snapshot.speed, 1)
})

test('network construction uses sender height and rotation while preserving host tools', () => {
  const host = fixture(0)
  host.setSpeed(0)
  host.networkMode = 'host'
  host.schedulePublicCommand({ type: 'place', kind: 'path', x: -4, z: 0,
    context: { buildElevation: 2, buildRotation: 3 } })
  const path = host.snapshot.buildings.find(building => building.x === -4 && building.z === 0)
  assert.ok(path)
  assert.equal(path.elevation, 2)
  assert.equal(path.rotation, 3)
  assert.equal(host.snapshot.buildElevation, 0)
  assert.equal(host.snapshot.buildRotation, 0)
})

test('multiplayer clients build immediately and replay pending work after rejection sync', () => {
  const authoritative = fixture(0)
  const client = new GameState(authoritative.snapshot)
  enableMultiplayerCommands(client)
  client.networkMode = 'client'
  const sent: GameCommand[] = []
  client.commandOutbox = command => sent.push(command)

  const first = client.place('path', -4, 0)
  const second = client.place('path', -3, 0)
  assert.ok(first.ok && second.ok)
  assert.ok(client.snapshot.buildings.some(building => building.x === -4 && building.z === 0))
  assert.ok(client.snapshot.buildings.some(building => building.x === -3 && building.z === 0))
  assert.equal(sent.length, 2)

  const rejectedId = sent[0]!.clientCommandId
  assert.ok(rejectedId)
  assert.ok(client.resolveOptimisticCommand(rejectedId))
  client.applyNetworkWorld(packWorld(authoritative.snapshot))
  assert.ok(!client.snapshot.buildings.some(building => building.x === -4 && building.z === 0))
  assert.ok(client.snapshot.buildings.some(building => building.x === -3 && building.z === 0))
})

test('bulldozer removes rectangular areas with one multiplayer command', () => {
  const game = fixture(0)
  assert.ok(game.place('path', -5, 0).ok)
  assert.ok(game.place('path', -4, 0).ok)
  enableMultiplayerCommands(game)
  game.networkMode = 'client'
  const sent: GameCommand[] = []
  game.commandOutbox = command => sent.push(command)
  const result = game.bulldozeArea([
    { x: -5, z: 0 },
    { x: -4, z: 0 },
    { x: -3, z: 0 },
  ])
  assert.ok(result.ok)
  assert.equal(game.snapshot.buildings.filter(b => b.x >= -5 && b.x <= -4 && b.z === 0).length, 0)
  assert.equal(sent.length, 1)
  assert.equal(sent[0]!.type, 'bulldozeArea')
})

if (process.env.PROFILE_CROWD) {
  const game = process.env.PROFILE_SAVE ? GameState.fromJSON(readFileSync(process.env.PROFILE_SAVE, 'utf8'))! : fixture(2000)
  const totals = new Map<string, number>()
  for (const name of ['findPath', 'reviewVisitorRoutes', 'refreshPedestrianCongestion', 'walkVisitors', 'updateCrowdingAndMotivation', 'updateAtmosphere', 'updateVisitors', 'rebuildPedestrianNav', 'getCampingCellAt', 'getPedestrianNeighbors', 'getPedestrianSurfaceCost', 'flushVisitorDecisions', 'tryVisitConcert']) {
    const original = (game as any)[name]
    if (!original) continue
    ;(game as any)[name] = function(...args: any[]) { const start = performance.now(); try { return original.apply(this,args) } finally { totals.set(name, (totals.get(name) ?? 0) + performance.now() - start) } }
  }
  for (let tick = 0; tick < 300; tick++) game.tick(0.1)
  console.log('PROFILE', Object.fromEntries(totals))
  if (process.env.PROFILE_SAVE) {
    const previousDocument = globalThis.document
    const context = new Proxy({}, { get: () => () => {} })
    ;(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) }
    try {
      const campView = new CampingView()
      campView.update(game.snapshot)
      const batches = (campView as any).batchedProps.children[0].children
      console.log('CAMP DRAW CALLS', batches.reduce((sum: number, batch: any) => sum + batch.count, 0), 'individual mesh parts ->', batches.length, 'instanced batches (sprites separate)')
      campView.invalidate()
    } finally { (globalThis as any).document = previousDocument }
  }

}

for (const count of [500, 2000]) {
  const snapshot = fixture(count).snapshot
  for (const speed of [1, 3]) {
    const game = new GameState(snapshot)
    game.setSpeed(speed)
    const times: number[] = []
    for (let i = 0; i < 60; i++) {
      const start = performance.now(); game.tick(0.1); times.push(performance.now() - start)
    }
    times.sort((a, b) => a - b)
    const updates = new WorldUpdates()
    const full = updates.encode(packWorld(game.snapshot), true)
    game.tick(0.1)
    const start = performance.now()
    const delta = updates.encode(packWorld(game.snapshot))
    console.log(`BENCH ${count} guests speed=${speed === 3 ? '8x' : '1x'} tick median=${times[30].toFixed(1)}ms p95=${times[57].toFixed(1)}ms delta=${(delta.length / 1024).toFixed(0)}KiB full=${(full.length / 1024).toFixed(0)}KiB encode=${(performance.now() - start).toFixed(1)}ms`)
  }
}

// Real sockets exercise join ordering, command forwarding and baseline replacement.
test('stalled clients request recovery without flooding and busy hosts defer full snapshots', () => {
  const game = fixture(0)
  const session = new MultiplayerSession(game)
  const messages: string[] = []
  const socket = { readyState: 1, bufferedAmount: 0, send: (message: string) => messages.push(message) }
  Object.assign(globalThis, { WebSocket })
  const internal = session as any
  internal.socket = socket
  session.status.mode = 'client'
  internal.lastWorldAt = Date.now() - 6000
  for (let i = 0; i < 20; i++) session.tick(0.1)
  assert.equal(messages.length, 1)
  assert.equal(JSON.parse(messages[0]!).t, 'resync')
  internal.handleMessage({ t: 'sync', world: structuredClone(packWorld(game.snapshot)) })
  assert.equal(internal.needsResync, false)
  session.status.mode = 'host'
  session.status.players = [{ id: 'host', name: 'Host', role: 'host' }, { id: 'client', name: 'Client', role: 'client' }]
  socket.bufferedAmount = 1024 * 1024
  internal.pushSync()
  internal.pushSync()
  assert.equal(messages.length, 1, 'full worlds must not accumulate behind a congested socket')
  socket.bufferedAmount = 0
  session.tick(0.2)
  assert.equal(messages.length, 2)
  assert.equal(JSON.parse(messages[1]!).t, 'sync')
  assert.equal(internal.syncRequested, false)
})

const wss = new WebSocketServer({ port: 0 })
await new Promise<void>(resolve => wss.on('listening', resolve))
const port = (wss.address() as { port: number }).port
attachMultiplayer(wss, () => `127.0.0.1:${port}`)
Object.assign(globalThis, { WebSocket, location: { protocol: 'http:', host: `127.0.0.1:${port}` } })
const sessions: MultiplayerSession[] = []
async function until(condition: () => boolean) {
  const deadline = performance.now() + 3000
  while (!condition()) {
    assert.ok(performance.now() < deadline, 'WebSocket operation timed out')
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}
try {
  const host = fixture(20), client = new GameState(), late = new GameState()
  for (const game of [host, client, late]) enableMultiplayerCommands(game)
  const hs = new MultiplayerSession(host), cs = new MultiplayerSession(client), ls = new MultiplayerSession(late)
  sessions.push(hs, cs, ls)
  hs.host('Test host'); await until(() => hs.status.connected)
  cs.join(hs.status.code, 'Client'); await until(() => cs.status.connected && client.snapshot.visitors.length === 20)
  client.updateEntryPrice(31)
  await until(() => host.snapshot.entryPrice === 31)
  await until(() => (cs as any).pendingCommands.size === 0)
  await new Promise(resolve => setTimeout(resolve, 20))
  for (let i = 0; i < 8; i++) { host.tick(0.1); hs.tick(0.1) }
  await until(() => client.snapshot.entryPrice === 31)
  client.manageFestival({ type: 'start' })
  await new Promise(resolve => setTimeout(resolve, 20))
  for (let i = 0; i < 6; i++) { host.tick(0.1); hs.tick(0.1) }
  await until(() => client.snapshot.festival.enabled)
  ls.join(hs.status.code, 'Late client')
  await until(() => ls.status.connected && late.snapshot.entryPrice === 31)
  const contested = { x: -8, z: 0 }
  assert.ok(client.place('path', contested.x, contested.z).ok)
  assert.ok(late.place('tree', contested.x, contested.z).ok)
  assert.equal(client.snapshot.buildings.find(b => b.x === contested.x && b.z === contested.z)?.kind, 'path')
  assert.equal(late.snapshot.buildings.find(b => b.x === contested.x && b.z === contested.z)?.kind, 'tree')
  await new Promise(resolve => setTimeout(resolve, 20))
  for (let i = 0; i < 6; i++) { host.tick(0.1); hs.tick(0.1) }
  await until(() => {
    const expected = host.snapshot.buildings.find(b => b.x === contested.x && b.z === contested.z)?.kind
    return Boolean(expected) &&
      client.snapshot.buildings.find(b => b.x === contested.x && b.z === contested.z)?.kind === expected &&
      late.snapshot.buildings.find(b => b.x === contested.x && b.z === contested.z)?.kind === expected
  })
  host.tick(0.1); host.tick(0.1); hs.tick(0.2)
  await until(() => client.snapshot.simTick === host.snapshot.simTick && late.snapshot.simTick === host.snapshot.simTick)
  for (const game of [client, late]) {
    assert.deepEqual(JSON.parse(JSON.stringify(packWorld(game.snapshot))), JSON.parse(JSON.stringify(packWorld(host.snapshot))))
  }
  console.log('PASS real WebSocket host, commands, two clients, late join and shared delta baseline')
} finally {
  sessions.forEach(session => session.disconnect())
  wss.clients.forEach(socket => socket.terminate())
  await new Promise<void>(resolve => wss.close(() => resolve()))
}
