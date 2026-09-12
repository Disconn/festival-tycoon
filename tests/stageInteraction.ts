import { bandPositions, bandRoles, updateStageBand } from '../src/view/stageBand'
import assert from 'node:assert/strict'
import { Vector3, LineSegments, SpotLight } from 'three'
import { GameState, type GameSnapshot } from '../src/game/GameState'
import { stagePlacement } from '../src/game/stagePlacement'
import { defaultStageDesign, stageDesignIssue, partHeight, removeStagePart, stageAudienceCells } from '../src/game/stageDesign'
import { createStageModel, animateStageModel, disposeStageModel } from '../src/view/stageModel'
import { showIssue } from '../src/game/festivalManagement'
export function testStageInteraction(fixture:(count?:number)=>GameState){
  const performerDesign=defaultStageDesign()
  assert.equal(bandPositions(performerDesign).length,0,'bare stage floor is not a performer podium')
  for(let x=1;x<=4;x++)performerDesign.parts.push({id:`deck-${x}`,kind:'deck',x,z:4,rotation:0,mount:null,brand:'budget',color:'#ffffff'})
  assert.equal(bandPositions(performerDesign).length,4)
  for(const pos of bandPositions(performerDesign))assert.ok(performerDesign.parts.some(p=>p.x===pos.x+performerDesign.width/2-.5&&p.z===pos.z+performerDesign.depth/2-.5))
  const performanceStage=createStageModel(performerDesign)
  updateStageBand(performanceStage,'meadow',0,false);assert.equal(performanceStage.userData.band,undefined)
  updateStageBand(performanceStage,'meadow',0,true,performerDesign);const performers=performanceStage.userData.band;assert.equal(performers.children.length,4)
  assert.ok(performers.children.every((p:any)=>p.position.y>=.54),'musicians stand on top of podiums')
  const arm=performers.children[1].userData.arms[0],angle=arm.rotation.x
  updateStageBand(performanceStage,'meadow',.4,true,performerDesign);assert.equal(performanceStage.userData.band,performers);assert.notEqual(arm.rotation.x,angle)
  updateStageBand(performanceStage,'meadow',.4,false);assert.equal(performers.visible,false)
  updateStageBand(performanceStage,'neon',1,true,performerDesign);assert.equal(performanceStage.userData.band.children.length,2);assert.equal(performers.parent,null)
  assert.ok(bandRoles('brass').includes('brass'));assert.ok(bandRoles('campfire').includes('guitar'))
  const occupied=defaultStageDesign();occupied.tileWidth=2;occupied.tileDepth=2;occupied.audience=[{x:0,z:1}];occupied.parts=[{id:'motor',kind:'motorTruss',x:5,z:4,rotation:0,mount:null,brand:'budget',color:'#ffffff'}]
  for(const pos of bandPositions(occupied)){const x=pos.x+occupied.width/2-.5,z=pos.z+occupied.depth/2-.5;assert.ok(!(x<4&&z>=3));assert.ok(!(z===4&&Math.abs(x-5)<=1))}
  occupied.parts=[];for(let x=0;x<occupied.width;x++)for(let z=0;z<occupied.depth;z++)occupied.parts.push({id:`${x}-${z}`,kind:'speaker',x,z,rotation:0,mount:null,brand:'budget',color:'#ffffff'})
  assert.equal(bandPositions(occupied).length,0);disposeStageModel(performanceStage)
  const d=defaultStageDesign(),settings={kind:'speaker' as const,brand:'touring' as const,rotation:0,color:'#ff88cc'}
  let first=stagePlacement(d,settings,{x:1,z:1});first.id='box1';d.parts.push(first)
  for(let n=2;n<=4;n++){const next=stagePlacement(d,settings,{x:1,z:1},`box${n-1}`);next.id=`box${n}`;d.parts.push(next);assert.equal(stageDesignIssue(d),null);assert.ok(Math.abs(partHeight(d,next)-(.3+(n-1)*.8))<.001)}
  const tooHigh=stagePlacement(d,settings,{x:1,z:1},'box4');assert.ok(stageDesignIssue({...d,parts:[...d.parts,tooHigh]}))
  const removed=removeStagePart(d,'box2');assert.deepEqual(removed.parts.map(p=>p.id),['box1'],'removing support also removes all higher speakers')
  const rig=defaultStageDesign();rig.parts.push({id:'truss',kind:'truss',brand:'budget',x:3,z:2,rotation:0,mount:null,color:'#ffffff'})
  const hanging=stagePlacement(rig,{...settings,kind:'spot'},{x:3,z:2},'truss');hanging.id='hanging';rig.parts.push(hanging)
  assert.equal(hanging.mount,'truss');assert.equal(stageDesignIssue(rig),null)
  const floor=stagePlacement(rig,{...settings,kind:'spot'},{x:5,z:4},'truss',true);floor.id='floor';rig.parts.push(floor);assert.equal(floor.mount,null)
  rig.parts.push({...settings,id:'laser',kind:'laser',x:6,z:4,mount:null},{...settings,id:'fog',kind:'fog',x:1,z:4,mount:null})
  assert.equal(removeStagePart(rig,'truss').parts.some(p=>p.id==='hanging'),false)
  const model=createStageModel(rig,{lightBudget:6}),phase={intensity:100,speed:60,fog:80,volume:100,color:'#ff55cc'}
  animateStageModel(model,phase,1,true)
  const spots=model.userData.effects.filter((p:any)=>p.userData.kind==='spot')
  assert.equal(spots.length,2)
  for(const spot of spots){const direction=new Vector3(0,1,0).applyQuaternion(spot.quaternion);assert.equal(direction.y<0,spot.userData.hanging,'hanging spots point down, floor spots point up');assert.ok(spot.userData.light instanceof SpotLight);assert.ok(spot.userData.light.intensity>0)}
  const laser=model.userData.effects.find((p:any)=>p.userData.kind==='laser');assert.ok(laser.children[0] instanceof LineSegments)
  const fog=model.userData.effects.find((p:any)=>p.userData.kind==='fog');assert.equal(fog.children.length,3);assert.ok(fog.children[0].scale.x>rig.width*.4)
  animateStageModel(model,phase,1,false);assert.ok(spots.every((p:any)=>p.userData.light.intensity===0));disposeStageModel(model)
  const kinetic=defaultStageDesign();kinetic.parts=[{id:'lift',kind:'motorTruss',brand:'touring',x:3,z:2,rotation:0,mount:null,color:'#ffffff'}]
  const movingSpot=stagePlacement(kinetic,{...settings,kind:'spot'},{x:3,z:2},'lift');movingSpot.id='moving';kinetic.parts.push(movingSpot)
  kinetic.parts.push({...settings,id:'pyro',kind:'fireworks',x:1,z:4,mount:null},{...settings,id:'spark',kind:'sparks',x:5,z:4,mount:null})
  assert.equal(stageDesignIssue(kinetic),null);assert.equal(movingSpot.mount,'lift')
  assert.ok(stageDesignIssue({...kinetic,phases:kinetic.phases.map(p=>({...p,movement:101})) as typeof kinetic.phases}))
  assert.ok(stageDesignIssue({...kinetic,parts:[...kinetic.parts,{...settings,id:'obstruction',x:2,z:2,mount:null}]}))
  const kineticModel=createStageModel(kinetic,{lightBudget:2}),show={...phase,movement:100,pyro:100}
  animateStageModel(kineticModel,show,0,true)
  const movingLight=kineticModel.userData.effects.find((e:any)=>e.userData.kind==='spot')
  const initialY=movingLight.position.y;animateStageModel(kineticModel,show,1,true)
  assert.notEqual(movingLight.position.y,initialY);assert.equal(movingLight.userData.light.position.y,movingLight.position.y)
  assert.ok(kineticModel.userData.moving[0].position.y<0)
  const pyros=kineticModel.userData.effects.filter((e:any)=>['fireworks','sparks'].includes(e.userData.kind));assert.equal(pyros.length,2)
  assert.ok(pyros.every((e:any)=>e.children[0] instanceof LineSegments))
  animateStageModel(kineticModel,{...show,pyro:0},2,true);assert.ok(pyros.every((e:any)=>!e.visible))
  animateStageModel(kineticModel,show,2,false);assert.ok(kineticModel.userData.effects.every((e:any)=>!e.visible));assert.equal(kineticModel.userData.moving[0].position.y,0)
  assert.equal(removeStagePart(kinetic,'lift').parts.some(p=>p.id==='moving'),false)
  assert.equal(stageDesignIssue(JSON.parse(JSON.stringify(kinetic))),null);disposeStageModel(kineticModel)
  const audience=defaultStageDesign();audience.tileWidth=3;audience.tileDepth=3;audience.width=9;audience.depth=9;audience.audience=[{x:0,z:1},{x:1,z:1}]
  assert.equal(stageDesignIssue(audience),null)
  assert.ok(stageDesignIssue({...audience,audience:[{x:1,z:1}]}),'sealed audience courtyards need an entrance')
  assert.ok(stageDesignIssue({...audience,parts:[{...settings,id:'blocked',x:3,z:3,mount:null}]}),'floor equipment cannot obstruct spectator tiles')
  assert.deepEqual(stageAudienceCells({x:6,z:-20,rotation:1,stageDesign:audience}),[{x:7,z:-18},{x:7,z:-19}])
  const game=fixture(0),s=game.snapshot as GameSnapshot;game.addDebugMoney()
  for(let x=6;x<9;x++)for(let z=-20;z<-17;z++){game.manageFestival({type:'ground',x,z,kind:'drain'});game.manageFestival({type:'ground',x,z,kind:'compact'})}
  assert.ok(game.placePathSegment(5,-19,0).ok)
  assert.ok(game.manageFestival({type:'stageDesign',design:audience,selectForBuild:true}).ok)
  assert.ok(game.place('stage',6,-20).ok)
  const stage=s.buildings.find(b=>b.kind==='stage')!
  assert.equal(s.stageForecourtCells.filter(c=>c.stageId===stage.id).length,2)
  assert.equal((game as any).isPedestrianSolidAt(7,-19,0),false)
  assert.equal((game as any).isPedestrianSolidAt(7,-20,0),true)
  const route=(game as any).findPath({x:4,z:-19,elevation:0},[{x:7,z:-19,elevation:0}],false,false,false,false,true)
  assert.ok(route?.length,'guests can walk from a normal path through the audience entrance into the courtyard')
  assert.ok(route.some((p:any)=>p.x===6&&p.z===-19))
  assert.equal(game.canPlace('food',7,-19).ok,false,'audience area remains reserved for this stage')
  s.dayPlan.offers.stages=Array(24).fill(true)
  assert.equal(showIssue(s,{id:'show',stageId:stage.id,bandId:'meadow',day:s.day,start:600,duration:120,fee:450}),null,'integrated audience areas satisfy concert forecourt requirements')
  const loaded=GameState.fromJSON(JSON.stringify(s))!
  assert.equal(loaded.snapshot.stageForecourtCells.filter(c=>c.stageId===stage.id).length,2,'load does not duplicate integrated audience cells')
  assert.ok(loaded.bulldoze(7,-19).ok);assert.equal(loaded.snapshot.stageForecourtCells.filter(c=>c.stageId===stage.id).length,0)
  console.log('PASS automatic rig mounting, four-speaker stacks, cascading removal, real spot direction, laser fans, broad fog and reachable stage audience courtyards')
}
