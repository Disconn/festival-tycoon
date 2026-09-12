import assert from 'node:assert/strict'
import { GameState, type GameSnapshot } from '../src/game/GameState'
import { defaultStageDesign, stageDesignIssue, stageStats, stagePhase } from '../src/game/stageDesign'
import { createStageModel, disposeStageModel } from '../src/view/stageModel'
import { Mesh } from 'three'
export function testStageTickets(fixture:(count?:number)=>GameState){
  const game=fixture(0),s=game.snapshot as GameSnapshot
  s.campingCells=[{x:7,z:-20,elevation:0},{x:8,z:-20,elevation:0},{x:9,z:-20,elevation:0}]
  assert.equal(game.manageFestival({type:'tickets',day:2,camping:100}).ok,false)
  assert.ok(game.manageFestival({type:'tickets',day:2,camping:1}).ok)
  assert.ok(game.manageFestival({type:'start'}).ok)
  const spawn=(kind:'day'|'camping')=>(game as any).spawnVisitorMember(kind,'test-group','pedestrian',false)
  assert.ok(spawn('day'));assert.ok(spawn('day'));assert.equal(spawn('day'),null)
  assert.ok(spawn('camping'));assert.equal(spawn('camping'),null)
  s.visitors=[];assert.equal(spawn('day'),null,'departures do not release sold tickets')
  const loaded=GameState.fromJSON(JSON.stringify(s))!
  assert.equal((loaded as any).spawnVisitorMember('day','test','pedestrian',false),null,'ticket use survives reload')
  s.day++;assert.ok(spawn('day'),'day tickets are available on the next festival day');assert.equal(spawn('camping'),null,'camping tickets remain limited across days')
  assert.equal(game.manageFestival({type:'tickets',day:9,camping:1}).ok,false)
  const legacy=fixture(0);delete (legacy.snapshot as GameSnapshot).festival.tickets
  assert.ok(legacy.manageFestival({type:'start'}).ok)
  assert.ok((legacy as any).spawnVisitorMember('day','legacy','pedestrian',false),'legacy saves keep arrivals')
  const build=fixture(0),bs=build.snapshot as GameSnapshot;build.addDebugMoney()
  const design=defaultStageDesign()
  design.parts.push({id:'truss',kind:'truss',brand:'touring',x:2,y:0,z:2,axis:'y',rotation:0,attachedTo:null,color:'#abcdef'},
    {id:'light',kind:'spot',brand:'premium',x:3,y:0,z:2,rotation:0,attachedTo:'truss',color:'#abcdef'},
    {id:'sound',kind:'speaker',brand:'touring',x:2,y:0,z:1,rotation:0,attachedTo:'truss',color:'#abcdef'})
  assert.equal(stageDesignIssue(design),null)
  const bad=structuredClone(design);bad.parts=bad.parts.filter(p=>p.kind!=='truss');assert.ok(stageDesignIssue(bad))
  const cost=stageStats(design).cost,money=bs.money
  assert.ok(build.manageFestival({type:'stageDesign',design,saveTemplate:true,selectForBuild:true}).ok)
  assert.equal(bs.money,money,'saving a template does not charge construction')
  for(let x=6;x<8;x++)for(let z=-20;z<-18;z++){build.manageFestival({type:'ground',x,z,kind:'drain'});build.manageFestival({type:'ground',x,z,kind:'compact'})}
  const before=bs.money
  assert.ok(build.place('stage',6,-20).ok)
  const stage=bs.buildings.find(b=>b.kind==='stage')!
  assert.deepEqual(stage.stageDesign,design);assert.ok(before-bs.money>cost,'placed stages charge base plus custom equipment')
  assert.equal(build.getAt(7,-19)?.id,stage.id,'all footprint cells select the same stage')
  assert.equal(build.canPlace('food',7,-19).ok,false)
  assert.equal(build.placePathSegment(7,-19,0).ok,false,'paths cannot cross secondary stage cells')
  assert.equal(build.designateRoad([{x:7,z:-19}]).ok,false)
  assert.equal(build.designateCampingCell(7,-19).ok,false)
  assert.equal(build.manageFestival({type:'depot',x:7,z:-19,role:'storage'}).ok,false)
  assert.equal((build as any).isPedestrianSolidAt(7,-19,0),true)
  const expanded=structuredClone(design);expanded.tileWidth=3;expanded.width=9
  const unchanged=bs.money
  assert.equal(build.manageFestival({type:'stageDesign',stageId:stage.id,design:expanded}).ok,false,'expansion needs a prepared foundation on every new cell')
  assert.equal(bs.money,unchanged);assert.deepEqual(stage.stageDesign,design)
  const rotated=structuredClone(design);rotated.tileWidth=3;rotated.tileDepth=1;rotated.width=9;rotated.depth=3
  for(let x=6;x<9;x++)for(let z=-20;z<-17;z++){build.manageFestival({type:'ground',x,z,kind:'drain'});build.manageFestival({type:'ground',x,z,kind:'compact'})}
  stage.rotation=1
  assert.ok(build.manageFestival({type:'stageDesign',stageId:stage.id,design:rotated}).ok)
  assert.equal(build.getAt(6,-18)?.id,stage.id,'rotated footprint occupies three rows')
  assert.equal(build.getAt(7,-19),undefined,'shrinking frees old cells even without building count changes')
  assert.ok(build.manageFestival({type:'stageDesign',stageId:stage.id,design}).ok)
  const restored=GameState.fromJSON(JSON.stringify(bs))!
  assert.equal(restored.getAt(7,-19)?.id,stage.id,'save/load restores the complete occupied footprint')
  const demolished=GameState.fromJSON(JSON.stringify(bs))!
  assert.ok(demolished.bulldoze(7,-19).ok,'secondary cells can demolish the entire stage')
  assert.equal(demolished.getAt(6,-20),undefined)
  const edgeDesign={...design,tileWidth:8,tileDepth:8,width:24,depth:24}
  assert.ok(build.manageFestival({type:'stageDesign',design:edgeDesign,selectForBuild:true}).ok)
  assert.equal(build.canPlace('stage',bs.scenario.worldSize/2-1,0).ok,false)
  assert.ok(build.manageFestival({type:'stageDesign',design,selectForBuild:true}).ok)
  const paid=bs.money
  assert.ok(build.manageFestival({type:'stageDesign',stageId:stage.id,design}).ok);assert.equal(bs.money,paid,'unchanged setup is not charged twice')
  assert.equal(build.manageFestival({type:'stageDesign',stageId:stage.id,design:bad}).ok,false)
  assert.equal(bs.money,paid)
  assert.deepEqual(GameState.fromJSON(JSON.stringify(bs))!.snapshot.festival.stageTemplates,[design])
  assert.deepEqual(GameState.fromJSON(JSON.stringify(bs))!.snapshot.buildings.find(b=>b.id===stage.id)!.stageDesign,design)
  assert.equal(stagePhase(design,.1),design.phases[0]);assert.equal(stagePhase(design,.5),design.phases[1]);assert.equal(stagePhase(design,.9),design.phases[2]);design.linked=true;assert.equal(stagePhase(design,.9),design.phases[0])
  const model=createStageModel(design);let meshes=0;model.traverse(o=>{if(o instanceof Mesh)meshes++});assert.ok(meshes<20,'stage geometry is batched by material');disposeStageModel(model)
  console.log('PASS ticket admission limits, camping capacity, per-day counters, legacy saves, stage mounting, construction costs, templates, show phases and batched geometry')
}
