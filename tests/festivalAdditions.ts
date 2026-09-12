import assert from 'node:assert/strict'
import { GameState } from '../src/game/GameState'
import { TRACK_PITCHES, createTrackPiece, computeTrackFrame, sampleCoasterTrack, type Coaster, type TrackAnchor } from '../src/game/coasters'
import { campingBoundary } from '../src/view/campingGround'
import { bungeeDrop, createBungeeModel, animateBungee, setBungeeJumper } from '../src/view/bungee'
import { rollsBungeeNude, visitorLooksFemale } from '../src/game/rng'
import { applyGameCommand } from '../src/net/commands'
import { enableMultiplayerCommands } from '../src/net/bind'
import type { GameCommand } from '../src/net/protocol'

export function testFestivalAdditions(fixture: (n?: number) => GameState): void {
  const a: TrackAnchor = { x: 0, z: 0, elevation: 5, heading: 0, pitch: 0, bank: 0 }
  for (const pitch of Object.values(TRACK_PITCHES)) {
    const p = createTrackPiece('transition', 'pitchTransition', a, true, { targetPitch: pitch })
    assert.ok(Number.isInteger(p.end.elevation))
    assert.equal(p.points.at(-1)!.y, p.end.elevation)
    const q = createTrackPiece('exit', 'pitchTransition', p.end, false, { targetPitch: 0 })
    assert.ok(Number.isInteger(q.end.elevation))
  }
  const up = createTrackPiece('up', 'halfLoopUp', a, false)
  assert.equal(up.end.bank, Math.PI); assert.equal(up.end.elevation, 9)
  const down = createTrackPiece('down', 'halfLoopDown', up.end, false)
  assert.equal(down.end.bank, 0); assert.equal(down.end.elevation, 5)
  const loop = createTrackPiece('loop', 'verticalLoop', a, false)
  assert.equal(loop.end.elevation, a.elevation)
  assert.ok(computeTrackFrame({ x: 0, y: 0, z: -1 }, 0, Math.PI).up.y < -.99)
  const track = { pieces: [loop], closed: false } as Coaster
  assert.equal(sampleCoasterTrack(track, 1)!.pieceKind, 'verticalLoop')
  const length = sampleCoasterTrack(track, 0)!.totalLength
  let previousUp = sampleCoasterTrack(track, 0)!.up
  for (let i = 1; i <= 128; i++) {
    const current = sampleCoasterTrack(track, length * i / 128)!
    assert.ok(previousUp.x * current.up.x + previousUp.y * current.up.y + previousUp.z * current.up.z > .9, 'loop frames must not flip at vertical tangents')
    previousUp = current.up
  }
  track.pieces.push(createTrackPiece('photo', 'photo', loop.end, false))
  assert.ok(sampleCoasterTrack(track, 0)!.totalLength > length)
  assert.equal(sampleCoasterTrack(track, length + 1)!.pieceKind, 'photo')
  const construction = fixture(0)
  construction.addDebugMoney()
  const started = construction.startCoaster('classicSteel', 10, -10)
  assert.ok(started.ok, started.message)
  for (const kind of ['verticalLoop', 'photo', 'splash', 'brakes', 'sBendLeft'] as const) {
    const result = construction.appendCoasterPiece(started.id!, kind, false)
    assert.ok(result.ok, `${kind}: ${result.message}`)
  }
  const physicalSpeed = (kind: 'straight' | 'brakes' | 'splash' | 'photo') => {
    const g = fixture(1), result = g.startCoaster('classicSteel', 10, -10), coaster = g.getCoaster(result.id!)!
    const piece = createTrackPiece('effect', kind, a, false)
    const tail = createTrackPiece('tail', 'straight', piece.end, false)
    tail.end.z += 60; tail.points.at(-1)!.z += 60
    coaster.pieces = [piece, tail]; coaster.closed = false
    coaster.train.state = 'running'; coaster.train.distance = .5; coaster.train.speed = 20
    coaster.train.passengerIds = [g.snapshot.visitors[0]!.id]; coaster.train.passengers = 1
    const before = g.snapshot.money
    ;(g as any).integrateTrainPhysics(coaster, .05)
    if (kind === 'photo') {
      assert.equal(g.snapshot.money, before + 2)
      ;(g as any).integrateTrainPhysics(coaster, .05)
      assert.equal(g.snapshot.money, before + 2, 'only one photo charge per passage')
    }
    return coaster.train.speed
  }
  const normalSpeed = physicalSpeed('straight')
  assert.ok(physicalSpeed('brakes') < normalSpeed)
  assert.ok(physicalSpeed('splash') < normalSpeed)
  physicalSpeed('photo')
  assert.equal(campingBoundary([{x:0,z:0},{x:1,z:0}]).length, 6)
  const ring = Array.from({length:9}, (_,i)=>({x:i%3,z:Math.floor(i/3)})).filter(c=>c.x!==1||c.z!==1)
  assert.equal(campingBoundary(ring).length, 12, 'no interior tile or enclosed-hole borders')

  const game = fixture(2), s = game.snapshot
  ;(s as any).money = 100000
  assert.ok(game.placeSceneryLine('bunting', [{x:10,z:0},{x:11,z:0},{x:10,z:0}], 2).ok)
  assert.equal(s.buildings.filter(b=>b.kind==='bunting').length, 2)
  assert.ok(s.buildings.filter(b=>b.kind==='bunting').every(b=>b.decorationSlot===2))
  assert.equal(game.placeSceneryLine('ride', [{x:12,z:0}], 0).ok, false)
  game.manageFestival({type:'ground',x:14,z:0,kind:'drain'})
  game.manageFestival({type:'ground',x:14,z:0,kind:'compact'})
  game.manageFestival({type:'ground',x:14,z:0,kind:'pave'})
  const built = game.placeBungee(14, 0, 32)
  assert.ok(built.ok, built.message)
  const tower = s.buildings.at(-1)!
  assert.equal(tower.rideType, 'bungee')
  assert.ok(game.setRideAccess(tower.id,'entrance',14,-1).ok)
  assert.ok(game.setRideAccess(tower.id,'exit',15,0).ok)
  assert.ok(game.placePathSegment(14,-2,0,'queue').ok)
  assert.ok(game.placePathSegment(16,0,0).ok)
  const money = s.money
  assert.ok(game.setBungeeHeight(tower.id, 40).ok)
  assert.equal(s.money, money - 200)
  assert.equal(game.setBungeeHeight(tower.id, Infinity).ok, false)
  const [v, w] = s.visitors
  v!.targetId = tower.id; w!.targetId = tower.id
  ;(game as any).startFacilityInteraction(v, tower)
  ;(game as any).startFacilityInteraction(w, tower)
  assert.equal(v!.state, 'using'); assert.equal(w!.state, 'queuing')
  assert.equal(game.setBungeeHeight(tower.id, 50).ok, false)
  ;(game as any).finishInteraction(v)
  assert.equal(v!.needs.fun, 100)
  assert.equal(v!.bungeeNude, false)
  ;(game as any).startFacilityInteraction(w, tower)
  assert.equal(w!.state, 'using')
  const restored = GameState.fromJSON(JSON.stringify(s))!
  assert.equal(restored.snapshot.buildings.find(b=>b.id===tower.id)!.bungeeHeight, 40)
  const model = createBungeeModel(40)
  assert.equal(model.children.length, 3, 'bounded tower draw calls')
  setBungeeJumper(model, { id: v!.id, color: v!.color })
  assert.ok(model.userData.bungee.jumper.children.length > 0, 'the rope carries the guest model')
  setBungeeJumper(model, { id: v!.id, color: v!.color, bungeeNude: true })
  assert.ok(model.userData.bungee.jumper.children.length > 0)
  setBungeeJumper(model, null)
  assert.equal(model.userData.bungee.jumper.children.length, 0)
  animateBungee(model, .25); const high = model.userData.bungee.jumper.position.y
  animateBungee(model, .48); assert.ok(model.userData.bungee.jumper.position.y < high - 5)
  animateBungee(model, null); assert.equal(model.userData.bungee.jumper.visible, false)
  assert.ok(bungeeDrop(.48) > bungeeDrop(.6), 'rope rebounds')
  const femaleId = Array.from({ length: 40 }, (_, index) => `guest-${index}`).find(visitorLooksFemale)
  const maleId = Array.from({ length: 40 }, (_, index) => `guest-${index}`).find((id) => !visitorLooksFemale(id))
  assert.equal(rollsBungeeNude(femaleId!, 0.05, 0.1), true)
  assert.equal(rollsBungeeNude(femaleId!, 0.5, 0.1), false)
  assert.equal(rollsBungeeNude(maleId!, 0, 1), false)

  s.incidents.push({id:'debug-trash',kind:'litter',x:0,z:0} as any, {id:'debug-fire',kind:'fire',x:1,z:1} as any)
  s.campInstallations.push({id:'old',ownerId:'missing',contributorIds:[],kind:'tent',cell:{x:1,z:1},decay:0} as any)
  v!.pendingWaste = 2
  assert.ok(applyGameCommand(game,{type:'clearWasteForDebug'}).ok)
  assert.equal(s.incidents.some(i=>i.id==='debug-trash'),false)
  assert.equal(s.incidents.some(i=>i.id==='debug-fire'),true)
  assert.equal(s.campInstallations.some(c=>c.id==='old'),false)
  assert.equal(v!.pendingWaste,0)
  const client = fixture(0), sent: GameCommand[] = []
  client.manageFestival({type:'ground',x:14,z:0,kind:'drain'})
  client.manageFestival({type:'ground',x:14,z:0,kind:'compact'})
  client.manageFestival({type:'ground',x:14,z:0,kind:'pave'})
  client.networkMode='client'; enableMultiplayerCommands(client); client.commandOutbox = c=>sent.push(c)
  client.placeBungee(14,0,24)
  assert.equal(sent.length,1); assert.equal(sent[0]!.type,'placeBungee')
  assert.equal(client.snapshot.buildings.at(-1)!.bungeeHeight,24)
  console.log('PASS grid-aligned coaster slopes and inversions, track cache edits, camping perimeter, scenery lines, bungee operation/save/multiplayer and debug cleanup')
}
