import assert from 'node:assert/strict'
import { GameState } from '../src/game/GameState'
import { enableMultiplayerCommands } from '../src/net/bind'
import { packWorld } from '../src/net/codec'
import type { GameCommand } from '../src/net/protocol'

export function testRideAccess(fixture: (n?:number)=>GameState): void {
  for (const bungee of [false,true]) {
    const game=fixture(2), s=game.snapshot
    game.addDebugMoney()
    for (const kind of ['drain','compact','pave'] as const) game.manageFestival({type:'ground',x:8,z:0,kind})
    const built=bungee?game.placeBungee(8,0,24):game.place('ride',8,0)
    assert.ok(built.ok,built.message)
    const ride=s.buildings.at(-1)!
    assert.match(game.getRideAccessIssue(ride)!,/Eingang fehlt/)
    assert.equal(game.isBuildingCurrentlyActive(ride),false)
    assert.equal(game.setRideAccess(ride.id,'entrance',7,-1).ok,false,'must be adjacent')
    assert.ok(game.setRideAccess(ride.id,'entrance',7,0).ok)
    assert.equal(game.setRideAccess(ride.id,'exit',7,0).ok,false,'distinct gates')
    assert.equal(game.placePathSegment(7,0,0).ok,false,'gate reserves its own cell')
    assert.equal(game.designateRoad([{x:7,z:0}]).ok,false,'road cannot overwrite gate')
    assert.equal(game.designateParkingArea([{x:7,z:0}]).ok,false,'parking cannot overwrite gate')
    assert.equal(game.getAt(7,0)!.id,ride.id,'clicking a gate selects its ride')
    assert.ok(game.setRideAccess(ride.id,'exit',9,0).ok)
    assert.match(game.getRideAccessIssue(ride)!,/Warteweg/)
    game.placePathSegment(6,0,0,'queue');game.placePathSegment(5,0,0,'queue')
    assert.match(game.getRideAccessIssue(ride)!,/normalen Gehweg/)
    game.placePathSegment(10,0,0)
    for (let x=4;x<=10;x++) game.placePathSegment(x,1,0)
    assert.equal(game.getRideAccessIssue(ride),null)
    assert.equal(game.getPathAt(6,0)!.queueDirection,1,'queue points toward selected gate')
    const queue=(game as any).getBuildingQueueCells(ride)
    assert.deepEqual(queue.map((c:any)=>[c.x,c.z]),[[6,0],[5,0]])
    s.dayPlan.offers.rides.fill(true)
    ;(game as any).poweredBuildingIds.add(ride.id)
    const v=s.visitors[0]!
    Object.assign(v,{x:4.5,y:0,z:.5,cellX:4,cellZ:0,cellElevation:0,route:[],targetId:ride.id})
    const destination=(game as any).findReachableFacility(v,'ride')
    assert.equal(destination?.building.id,ride.id)
    assert.deepEqual(destination.route.at(-1),{x:6,z:0,elevation:0})
    ;(game as any).startFacilityInteraction(v,ride)
    assert.equal(v.state,'using')
    assert.equal(game.setRideAccess(ride.id,'exit',8,1).ok,false,'cannot move access during a ride')
    assert.equal(game.bulldoze(9,0,ride.id).ok,false,'cannot demolish occupied ride exit')
    game.bulldoze(10,0)
    game.bulldoze(9,1)
    const budget=v.budget, money=s.money
    ;(game as any).finishInteraction(v);(game as any).finishInteraction(v)
    assert.equal(v.state,'using');assert.equal(v.budget,budget);assert.equal(s.money,money,'waiting does not repeatedly charge')
    game.placePathSegment(10,0,0)
    ;(game as any).finishInteraction(v)
    assert.equal(v.state,'exiting');assert.equal(v.cellX,9);assert.equal(v.cellZ,0)
    assert.deepEqual(v.route,[{x:10,z:0,elevation:0}])
    ;(game as any).moveVisitor(v,2,false)
    assert.equal(v.cellX,10,'guest actually walks from gate to exit path')
    const restored=GameState.fromJSON(JSON.stringify(s))!
    const saved=restored.snapshot.buildings.find(b=>b.id===ride.id)!
    assert.deepEqual(saved.rideEntrance,ride.rideEntrance);assert.deepEqual(saved.rideExit,ride.rideExit)
    assert.equal(restored.getRideAccessIssue(saved),null)
    assert.ok(restored.bulldoze(7,0,ride.id).ok)
    assert.ok(restored.snapshot.buildings.some(b=>b.id===ride.id),'gate removal preserves ride')
    assert.equal(restored.getAt(7,0),undefined,'removed gate leaves no stale spatial entry')

    const client=new GameState(structuredClone(s) as any),host=new GameState(structuredClone(s) as any),sent:GameCommand[]=[]
    client.networkMode='client';enableMultiplayerCommands(client);client.commandOutbox=c=>sent.push(c)
    assert.ok(client.setRideAccess(ride.id,'entrance',8,-1).ok)
    assert.equal(sent.length,1);assert.equal(sent[0]!.type,'setRideAccess')
    host.schedulePublicCommand(sent[0]!)
    assert.deepEqual(client.snapshot.buildings.find(b=>b.id===ride.id)!.rideEntrance,host.snapshot.buildings.find(b=>b.id===ride.id)!.rideEntrance)
    client.applyNetworkWorld(packWorld(host.snapshot))
    assert.equal(client.getAt(8,-1)!.id,ride.id)
  }
  console.log('PASS carousel/bungee gates: separate placement, queue routing, closed/missing access, exit recovery, collision/picking, saves and optimistic multiplayer')
}
