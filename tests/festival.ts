import assert from 'node:assert/strict'
import { GameState } from '../src/game/GameState'
import type { GameSnapshot } from '../src/game/GameState'
import { activeBookings, assignAudience, audienceMix, festivalTime, forecast, weatherAt, showIssue, updateFestival } from '../src/game/festivalManagement'
import { WorldUpdates } from '../src/net/worldUpdates'
import { packWorld } from '../src/net/codec'

export function testFestival(fixture: (count?: number) => GameState): void {
  const create = (guests = 0) => {
    const game = fixture(guests)
    game.addDebugMoney()
    ;(game.snapshot as GameSnapshot).dayPlan.leadDays = 1
    ;(game.snapshot as GameSnapshot).dayPlan.festivalDays = 2
    game.manageFestival({ type: 'ground', x: 6, z: -20, kind: 'drain' })
    game.manageFestival({ type: 'ground', x: 6, z: -20, kind: 'compact' })
    assert.ok(game.place('stage', 6, -20).ok)
    game.designateStageForecourt([{ x: 5, z: -20 }])
    assert.ok(game.manageFestival({ type: 'start' }).ok)
    return game
  }
  // The sandbox stage must provide meaningful fun even without booked-show bonuses.
  const danceGame = fixture(1), dancer = danceGame.snapshot.visitors[0]!
  ;(danceGame as any).visitorsAwaitingDecision.clear()
  ;(danceGame.snapshot as GameSnapshot).parkOpen = true
  dancer.state = 'partying'; dancer.route = []; dancer.interactionRemaining = 90
  dancer.localPartyMood = 80; dancer.partyPreference = 1; dancer.alcoholLevel = 0
  dancer.needs = { ...dancer.needs, fun: 20, energy: 90, hunger: 90, toilet: 90 }
  dancer.pendingWaste = 0
  ;(danceGame as any).updateVisitors(10)
  assert.equal(dancer.isDancing, true)
  assert.ok(dancer.needs.fun >= 30, 'ten minutes dancing gives a visible net fun gain without a booked concert')
  dancer.needs.fun = 99
  ;(danceGame as any).updateVisitors(2)
  assert.equal(dancer.needs.fun, 100, 'dance fun stays capped at 100')

  const game = create(20), s = game.snapshot as GameSnapshot, f = s.festival
  const stage = s.buildings.find(b => b.kind === 'stage')!
  const book = { type: 'book' as const, bandId: 'meadow', stageId: stage.id, day: f.startDay + 1, start: 840, duration: 90 }
  const before = s.money
  assert.ok(game.manageFestival(book).ok)
  assert.equal(s.money, before - 450)
  assert.equal(game.manageFestival(book).ok, false)
  assert.equal(game.manageFestival({ ...book, bandId: 'brass', start: 930 }).ok, false, '30 minute changeover required')
  assert.equal(game.manageFestival({ ...book, bandId: 'aurora', start: 1000 }).ok, false, 'headliner requires earned reputation')
  assert.equal(game.manageFestival({ ...book, day: f.startDay + 3 }).ok, false)
  const mix = audienceMix(f)
  assert.ok(mix.music > mix.family)
  assignAudience(s.visitors[0]!, f)
  assert.ok(s.visitors[0]!.audience)
  const clone = new GameState(s)
  assert.deepEqual(clone.snapshot.festival, f, 'save/load preserves bookings, finances and weather seed')
  const legacy = structuredClone(s) as any; delete legacy.festival
  assert.equal(new GameState(legacy).snapshot.festival.enabled, false)

  s.day = book.day; s.minute = 840; s.power.poweredBuildingIds.push(stage.id); f.weather = 'sun'
  assert.equal(activeBookings(s).length, 1)
  assert.equal(showIssue(s, f.bookings[0]!), null)
  f.weather = 'wind'; assert.ok(showIssue(s, f.bookings[0]!))
  assert.ok(game.manageFestival({ type: 'upgrade', kind: 'rigging' }).ok)
  assert.equal(showIssue(s, f.bookings[0]!), null)
  const campers = s.visitors.filter(v => v.ticketType === 'day')
  for (const visitor of campers) {
    visitor.route = []; visitor.targetId = null; visitor.state = 'exploring'
    visitor.cellX = 4; visitor.cellZ = -20; visitor.x = 4.5; visitor.z = -19.5
    ;(game as any).tryVisitConcert(visitor)
  }
  const reserved = s.visitors.filter(v => v.concertId)
  assert.equal(reserved.length, 9, 'one forecourt tile reserves no more than nine guests')
  assert.equal(new Set(reserved.map(v => v.activitySlot)).size, 9)
  assert.equal(game.manageFestival({ type: 'cancel', id: f.bookings[0]!.id }).ok, false, 'no refund after show starts')

  assert.equal(forecast(f, 5, 12), forecast(new GameState(s).snapshot.festival, 5, 12))

  const weather = create(1), ws = weather.snapshot as GameSnapshot
  for (let seed = 0; ; seed++) { ws.festival.seed = seed; if (weatherAt(ws.festival, ws.day, 12) === 'rain') break }
  ws.minute = 721; ws.festival.lastUpdate = festivalTime(ws) - 10
  updateFestival(ws); assert.ok(ws.festival.wetness > 0)
  const walker = ws.visitors[0]!; walker.cellX = 10; walker.cellZ = 0
  const wetSpeed = (weather as any).visitorTravelSpeed(walker)
  ws.festival.upgrades.drainage = true
  assert.ok((weather as any).visitorTravelSpeed(walker) > wetSpeed)

  const shop = create(1), shopState = shop.snapshot as GameSnapshot
  assert.ok(shop.place('food', 8, -20).ok)
  const food = shopState.buildings.find(b => b.kind === 'food')!, customer = shopState.visitors[0]!
  customer.targetId = food.id; customer.budget = 100; shopState.festival.supplies.food = 0
  const wallet = customer.budget
  ;(shop as any).finishInteraction(customer)
  assert.equal(customer.budget, wallet, 'empty stock must not charge the customer')
  customer.targetId = food.id; shopState.festival.infrastructure.shops[food.id] = { food: 2, drinks: 0, water: 0 }
  ;(shop as any).finishInteraction(customer)
  assert.equal(shopState.festival.infrastructure.shops[food.id]!.food, 1)
  assert.equal(customer.budget, wallet - food.price)

  const saved = new Map<string, string>()
  const oldStorage = globalThis.localStorage
  Object.assign(globalThis, { localStorage: { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) } })
  try {
    shop.save()
    assert.deepEqual(GameState.load()!.snapshot.festival, shopState.festival, 'public save/load retains the complete new mode')
    assert.equal(shop.saveSlot('Samstagabend').ok, true)
    assert.equal(shop.saveSlot('Nachtversion').ok, true)
    const slots = GameState.listSaveSlots()
    assert.equal(slots.length, 2)
    assert.equal(GameState.loadSlot(slots[0]!.id)!.snapshot.money, shopState.money, 'named save slots load full snapshots')
    assert.equal(shop.saveSlot('Aktualisierter Samstag', slots.find(slot => slot.name === 'Samstagabend')!.id).ok, true)
    assert.equal(GameState.listSaveSlots().length, 2, 'overwriting a slot does not create a duplicate')
    assert.equal(GameState.deleteSaveSlot(slots.find(slot => slot.name === 'Nachtversion')!.id).ok, true)
    assert.equal(GameState.listSaveSlots().length, 1)
  } finally {
    Object.assign(globalThis, { localStorage: oldStorage })
  }

  for (let day = f.startDay + 1; day <= f.startDay + 3; day++) {
    s.day = day; s.minute = 1; f.lastUpdate = festivalTime(s) - 2
    updateFestival(s)
  }
  assert.equal(f.reports.length, 3)
  assert.equal(f.finished, true)
  assert.equal(s.speed, 1)
  const reputation = { ...f.reputation }
  assert.ok(game.manageFestival({ type: 'start' }).ok)
  assert.equal(f.edition, 2)
  assert.deepEqual(f.reputation, reputation)

  const client = new GameState(), updates = new WorldUpdates()
  client.networkMode = 'client'
  client.applyNetworkWorld(JSON.parse(updates.encode(packWorld(s), true)).world)
  game.manageFestival({ type: 'upgrade', kind: 'water' })
  const delta = JSON.parse(updates.encode(packWorld(s)))
  client.applyNetworkUpdate(delta.world, delta.visitors, delta.removed)
  assert.deepEqual(client.snapshot.festival, f)
  const weekend = create()
  weekend.setSpeed(3)
  for (let tick = 0; tick < 2500 && !weekend.snapshot.festival.finished; tick++) weekend.tick(0.1)
  assert.equal(weekend.snapshot.festival.finished, true, 'complete weekend must reach its result through normal simulation ticks')
  assert.equal(weekend.snapshot.festival.reports.length, 3)
  assert.equal(weekend.snapshot.speed, 3)
  const completedTick = weekend.executedLogicTicks
  weekend.tick(0.1)
  assert.ok(weekend.executedLogicTicks > completedTick, 'post-festival cleanup continues ticking')
  let visitorUpdates = 0, staffUpdates = 0
  const updateVisitors = (weekend as any).updateVisitors.bind(weekend)
  const updateStaff = (weekend as any).updateStaff.bind(weekend)
  ;(weekend as any).updateVisitors = (minutes: number) => { visitorUpdates++; updateVisitors(minutes) }
  ;(weekend as any).updateStaff = (minutes: number) => { staffUpdates++; updateStaff(minutes) }
  for (let n = 0; n < 20; n++) weekend.tick(0.1)
  assert.ok(visitorUpdates > 0 && staffUpdates > 0, 'departures and staff keep updating after the festival ends')
  weekend.setSpeed(0)
  const pausedTick = weekend.executedLogicTicks
  weekend.tick(0.1)
  assert.equal(weekend.executedLogicTicks, pausedTick, 'manual pause remains respected')
  console.log('PASS festival booking rules, audience demand, concert capacity, weather, stock, deliveries, saves, reports, next edition and network deltas')
}
