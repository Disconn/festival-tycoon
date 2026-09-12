import assert from 'node:assert/strict'
import { FEMALE_VISITOR_NAMES, GameState, MALE_VISITOR_NAMES } from '../src/game/GameState'
import type { GameSnapshot } from '../src/game/GameState'
import { activeBookings, assignAudience, audienceMix, festivalTime, forecast, weatherAt, showIssue, updateFestival, watchableBookings } from '../src/game/festivalManagement'
import { visitorLooksFemale } from '../src/game/rng'
import { CONCERT_TOPLESS_CROWD_THOUGHT, CONCERT_TOPLESS_THOUGHT, groupVisitorsByThought } from '../src/game/visitorThoughts'
import { visitorIsFemale } from '../src/view/pixelPeople'
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
  const danceGame = fixture(1), sandboxDancer = danceGame.snapshot.visitors[0]!
  ;(danceGame as any).visitorsAwaitingDecision.clear()
  ;(danceGame.snapshot as GameSnapshot).parkOpen = true
  sandboxDancer.state = 'partying'; sandboxDancer.route = []; sandboxDancer.interactionRemaining = 90
  sandboxDancer.localPartyMood = 80; sandboxDancer.partyPreference = 1; sandboxDancer.alcoholLevel = 0
  sandboxDancer.needs = { ...sandboxDancer.needs, fun: 20, energy: 90, hunger: 90, toilet: 90 }
  sandboxDancer.pendingWaste = 0
  ;(danceGame as any).updateVisitors(10)
  assert.equal(sandboxDancer.isDancing, true)
  assert.ok(sandboxDancer.needs.fun >= 30, 'ten minutes dancing gives a visible net fun gain without a booked concert')
  sandboxDancer.needs.fun = 99
  ;(danceGame as any).updateVisitors(2)
  assert.equal(sandboxDancer.needs.fun, 100, 'dance fun stays capped at 100')

  const floorDance = create(1)
  const floorGuest = floorDance.snapshot.visitors[0]!
  ;(floorDance as any).visitorsAwaitingDecision.clear()
  floorGuest.state = 'partying'
  floorGuest.route = []
  floorGuest.interactionRemaining = 90
  floorGuest.localPartyMood = 12
  floorGuest.partyPreference = 0.2
  floorGuest.cellX = 5
  floorGuest.cellZ = -20
  floorGuest.cellElevation = 0
  floorGuest.alcoholLevel = 0
  floorGuest.needs = { ...floorGuest.needs, fun: 20, energy: 90, hunger: 90, toilet: 90 }
  floorGuest.pendingWaste = 0
  ;(floorDance as any).updateVisitors(1)
  assert.equal(floorGuest.isDancing, true, 'stage floors invite dancing even with modest party taste')

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

  const ring = create(24), rs = ring.snapshot as GameSnapshot
  const ringStage = rs.buildings.find(b => b.kind === 'stage')!
  assert.ok(ring.manageFestival({ type: 'book', bandId: 'meadow', stageId: ringStage.id, day: rs.festival.startDay + 1, start: 840, duration: 90 }).ok)
  assert.ok(ring.designateStageForecourt([
    { x: 5, z: -21 }, { x: 5, z: -19 }, { x: 6, z: -19 }, { x: 6, z: -21 },
    { x: 7, z: -20 }, { x: 7, z: -19 }, { x: 7, z: -21 },
  ]).ok)
  rs.day = book.day
  rs.minute = 840
  rs.power.poweredBuildingIds.push(ringStage.id)
  rs.festival.weather = 'sun'
  for (const visitor of rs.visitors) {
    visitor.route = []
    visitor.targetId = null
    visitor.state = 'exploring'
    visitor.musicTaste = 'indie'
    visitor.audience = 'music'
    visitor.cellX = 4
    visitor.cellZ = -20
    visitor.x = 4.5
    visitor.z = -19.5
    ;(ring as any).tryVisitConcert(visitor)
  }
  const ringGuests = rs.visitors.filter(v => v.concertId)
  const ringTiles = new Map<string, number>()
  for (const visitor of ringGuests) {
    const key = `${visitor.activityTarget!.x},${visitor.activityTarget!.z}`
    ringTiles.set(key, (ringTiles.get(key) ?? 0) + 1)
  }
  assert.ok(ringGuests.length >= 12, 'a ring of dance-floor tiles seats more than one packed tile')
  assert.ok(ringTiles.size >= 4, 'concert guests spread around the connected stage')
  assert.ok(
    Math.max(...ringTiles.values()) <= Math.ceil(ringGuests.length / ringTiles.size) + 2,
    'occupancy stays even around the dance floor',
  )

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

  const show = create(4), ss = show.snapshot as GameSnapshot
  const showStage = ss.buildings.find(b => b.kind === 'stage')!
  assert.ok(show.manageFestival({ type: 'book', bandId: 'meadow', stageId: showStage.id, day: ss.festival.startDay + 1, start: 840, duration: 90 }).ok)
  ss.day = ss.festival.startDay + 1
  ss.minute = 810
  ss.parkOpen = true
  ss.power.poweredBuildingIds.push(showStage.id)
  ss.festival.weather = 'sun'
  ss.festival.upgrades.rigging = true
  assert.equal(activeBookings(ss).length, 0, 'the set has not started yet')
  assert.equal(watchableBookings(ss).length, 1, 'guests can walk in during the last half hour')
  const earlyGuest = ss.visitors[0]!
  earlyGuest.audience = 'music'
  earlyGuest.musicTaste = 'indie'
  earlyGuest.state = 'exploring'
  earlyGuest.route = []
  earlyGuest.cellX = 4
  earlyGuest.cellZ = -20
  earlyGuest.cellElevation = 0
  earlyGuest.x = 4.5
  earlyGuest.z = -19.5
  earlyGuest.needs = { ...earlyGuest.needs, energy: 8, fun: 40, hunger: 90, toilet: 90 }
  earlyGuest.pendingWaste = 0
  earlyGuest.consumptionCooldown = 999
  assert.equal((show as any).tryVisitConcert(earlyGuest), true)
  assert.equal(earlyGuest.concertId, ss.festival.bookings[0]!.id)
  assert.match(earlyGuest.thought, /schon/)
  earlyGuest.route = []
  earlyGuest.state = 'partying'
  earlyGuest.localPartyMood = 0
  earlyGuest.pendingWaste = 0
  earlyGuest.inventory = []
  earlyGuest.interactionRemaining = 1
  earlyGuest.pendingWaste = 0
  // This fixture directly stages attendance; discard the pre-start decision requests.
  ;(show as any).visitorsAwaitingDecision.clear()
  ;(show as any).updateVisitors(1)
  assert.equal(earlyGuest.state, 'partying')
  assert.equal(earlyGuest.concertId, ss.festival.bookings[0]!.id)
  ss.minute = 850
  earlyGuest.needs.energy = 4
  ;(show as any).updateVisitors(1)
  assert.equal(earlyGuest.state, 'partying', 'low energy does not end a booked show')
  assert.equal(earlyGuest.concertId, ss.festival.bookings[0]!.id)
  ss.minute = 930
  ;(show as any).updateVisitors(1)
  assert.equal(earlyGuest.concertId, null, 'guests leave after the last song')

  const femaleId = Array.from({ length: 80 }, (_, index) => `concert-fan-${index}`).find(visitorLooksFemale)
  assert.ok(femaleId)
  assert.equal(visitorIsFemale(femaleId), true)
  const dancer = ss.visitors[1]!
  const neighbor = ss.visitors[2]!
  dancer.id = femaleId
  dancer.audience = 'music'
  dancer.musicTaste = 'indie'
  dancer.state = 'partying'
  dancer.route = []
  dancer.concertId = ss.festival.bookings[0]!.id
  dancer.cellX = 5
  dancer.cellZ = -20
  dancer.x = 5.5
  dancer.z = -19.5
  dancer.needs = { ...dancer.needs, fun: 20, energy: 80, hunger: 90, toilet: 90 }
  dancer.pendingWaste = 0
  dancer.consumptionCooldown = 999
  neighbor.state = 'partying'
  neighbor.route = []
  neighbor.concertId = ss.festival.bookings[0]!.id
  neighbor.cellX = 5
  neighbor.cellZ = -20
  neighbor.x = 5.4
  neighbor.z = -19.6
  neighbor.needs = { ...neighbor.needs, fun: 20, energy: 80, hunger: 90, toilet: 90 }
  neighbor.pendingWaste = 0
  neighbor.consumptionCooldown = 999
  ss.minute = 850
  ss.parkOpen = true
  const neighborFun = neighbor.needs.fun
  for (let n = 0; n < 40 && dancer.toplessMinutes <= 0; n += 1) (show as any).updateVisitors(1)
  assert.ok(dancer.toplessMinutes > 0, 'female guests may go topless during a live set')
  ;(show as any).updateVisitors(1)
  assert.equal(dancer.thought, CONCERT_TOPLESS_THOUGHT)
  assert.ok(neighbor.needs.fun > neighborFun, 'nearby guests enjoy the topless cheer')
  assert.equal(neighbor.thought, CONCERT_TOPLESS_CROWD_THOUGHT)
  ss.festival.lastUpdate = festivalTime(ss) - 1
  updateFestival(ss)
  assert.equal(dancer.thought, CONCERT_TOPLESS_THOUGHT, 'live-set flavor text does not hide going topless')
  const thoughtGroups = groupVisitorsByThought([dancer, neighbor, { ...neighbor, id: 'extra', thought: neighbor.thought }])
  assert.equal(thoughtGroups.length, 2)
  assert.equal(thoughtGroups.find(group => group.thought === CONCERT_TOPLESS_CROWD_THOUGHT)?.count, 2)

  const named = create(16)
  for (const visitor of named.snapshot.visitors) {
    const given = visitor.name.split(' ')[0]!
    if (visitorLooksFemale(visitor.id)) {
      assert.ok(FEMALE_VISITOR_NAMES.includes(given), `${visitor.name} must be a female given name`)
    } else {
      assert.ok(MALE_VISITOR_NAMES.includes(given), `${visitor.name} must be a male given name`)
    }
  }

  console.log('PASS festival booking rules, audience demand, concert capacity, weather, stock, deliveries, saves, reports, next edition and network deltas')
}
