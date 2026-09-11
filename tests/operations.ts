import assert from 'node:assert/strict'
import { GameState, type GameSnapshot } from '../src/game/GameState'
import { createScenarioEntrance } from '../src/game/scenario'
import { emptyStock, orderGoods } from '../src/game/supplyChain'
import { updateDepotCarriers } from '../src/game/depotCarriers'
import { createStaffMember } from '../src/game/staff'
import { StaffSimulation } from '../src/game/staffSimulation'
import { DeterministicRng } from '../src/game/rng'
import {
  abandonVisitorCamp,
  decayUnclaimedInstallations,
  isCollectibleCamp,
} from '../src/game/camping'
import {
  denseClusterSize,
  neighborhoodPeople,
  panicSpreadChance,
  spontaneousPanicChance,
  visitorBubbleKind,
} from '../src/game/visitorBubbles'
import { SIMULATION_CONFIG } from '../src/game/simulationConfig'

export function testOperations(fixture:(count?:number)=>GameState):void {
  const planning=new GameState(), plan=planning.snapshot as GameSnapshot
  assert.equal(plan.parkOpen,false)
  const minute=plan.minute
  for(let n=0;n<20;n++) planning.tick(.1)
  assert.equal(plan.minute,minute,'festival clock stays still while planning')
  assert.equal(planning.setParkOpen(true).ok,false)
  plan.dayPlan.leadDays=2;plan.dayPlan.festivalDays=4
  assert.ok(planning.manageFestival({type:'start'}).ok)
  assert.equal(plan.dayPlan.leadDays,2);assert.equal(plan.dayPlan.festivalDays,4)
  planning.tick(.1);assert.ok(plan.minute>minute)

  const shopping=fixture(1), ss=shopping.snapshot as GameSnapshot
  assert.ok(shopping.place('food',5,-20).ok)
  const shop=ss.buildings.find(b=>b.kind==='food')!, buyer=ss.visitors[0]!
  ss.festival.infrastructure.shops[shop.id]={food:3,drinks:0,water:0}
  buyer.targetId=shop.id;buyer.budget=100;buyer.state='using';buyer.cellX=4;buyer.cellZ=-20;buyer.cellElevation=0
  ;(shopping as any).finishInteraction(buyer)
  assert.ok(buyer.route.length>0,'buyer walks away before eating')
  assert.equal(buyer.state,'exploring');assert.equal(buyer.targetId,null)
  assert.equal(ss.festival.infrastructure.shops[shop.id]!.food,2)
  assert.ok(shopping.place('food',6,-20).ok)
  assert.ok(shopping.place('alcohol',7,-20).ok)
  shopping.updateBuildingPrice(shop.id, 17, true)
  assert.ok(
    ss.buildings.filter(b=>b.kind==='food').every(b=>b.price===17),
    'one price can be applied to all shops of the same type',
  )
  assert.notEqual(
    ss.buildings.find(b=>b.kind==='alcohol')!.price,
    17,
    'bulk price does not affect other shop types',
  )

  const gates=fixture(0), from={x:2,z:-20,elevation:0}, gate={x:3,z:-20,elevation:0}
  assert.ok((gates as any).findPath(from,[gate]))
  assert.ok(gates.manageFestival({type:'staffGate',...gate}).ok)
  assert.equal((gates as any).findPath(from,[gate]),null,'guests cannot enter staff gates, including cached routes')
  assert.ok((gates as any).findPath(from,[gate],false,false,false,false,false,undefined,true),'staff can enter the same gate')

  const game=fixture(0), s=game.snapshot as GameSnapshot, i=s.festival.infrastructure
  game.addDebugMoney()
  const source={id:'receiving',x:1,z:-20,role:'delivery' as const,distribution:'relay' as const,stock:{food:200,drinks:0,water:0},minimum:emptyStock()}
  const depot={id:'store',x:1,z:-16,role:'storage' as const,distribution:'shops' as const,stock:emptyStock(),minimum:{food:80,drinks:0,water:0}}
  i.depots.push(source,depot)
  assert.ok(game.place('food',5,-16).ok)
  const stand=s.buildings.find(b=>b.kind==='food')!
  assert.ok(game.manageFestival({type:'depotSettings',depotId:depot.id,distribution:'shops',workers:2}).ok)
  const blockedCopy = new GameState(structuredClone(s)), blockedState=blockedCopy.snapshot as GameSnapshot
  blockedState.festival.infrastructure.depots[0]!.role='storage'
  blockedState.festival.infrastructure.depots[0]!.distribution='shops'
  for(let n=0;n<30;n++) updateDepotCarriers(blockedState,1,(a,b)=>(blockedCopy as any).findPath(a,b),()=>true)
  assert.equal(blockedState.festival.infrastructure.depots[1]!.stock.food,0,'shops-only depot never serves as another depot source')
  blockedState.festival.infrastructure.depots[0]!.distribution='relay'
  for(let n=0;n<180;n++) updateDepotCarriers(blockedState,1,(a,b)=>(blockedCopy as any).findPath(a,b),()=>true)
  assert.ok(blockedState.festival.infrastructure.depots[1]!.stock.food>0,'relay depot allows physical replenishment')
  const walk=(a:any,b:any)=>(game as any).findPath(a,b,false,false,false,false,false,undefined,true)
  const update=()=>updateDepotCarriers(s,1,walk,()=>true)
  update()
  assert.equal(source.stock.food,200,'dispatch reserves goods but does not take them before pickup')
  assert.ok(i.routes.every(r=>r.cargo===0))
  for(let n=0;n<180;n++) {
    update()
    const total=i.depots.reduce((sum,d)=>sum+d.stock.food,0)+Object.values(i.shops).reduce((sum,p)=>sum+p.food,0)+i.routes.reduce((sum,r)=>sum+(r.kind==='food'?r.cargo:0),0)
    assert.equal(total,200,'physical automatic transports conserve every unit')
  }
  assert.equal(i.shops[stand.id]?.food,40,'workers automatically supply a stand')
  assert.equal(depot.stock.food,80,'workers restore depot minimum without over-delivery')
  assert.equal(source.stock.food,80)
  assert.ok(orderGoods(s,'food',50,0,depot.id).ok)
  assert.equal(s.festival.deliveries.at(-1)?.depotId,source.id,'trucks deliver to the designated receiving point')
  const clone=GameState.fromJSON(JSON.stringify(s))!
  assert.deepEqual(clone.snapshot.festival.infrastructure,i,'worker jobs and stock survive save/load')

  const cleaner=createStaffMember('cleaner-1','cleaner',{x:0,z:0,elevation:0})
  const staff=new StaffSimulation(), bin={id:'bin-1',x:1,z:0,elevation:0,stored:0}, dump={x:2,z:0,elevation:0,stored:0}
  const context:any={staff:[cleaner],visitors:[],incidents:[],medicalCells:[],wasteDumps:[dump],wasteBins:[bin],securityGates:[],rng:new DeterministicRng(1),findPath:(_a:any,goals:any[])=>goals.map(p=>({...p})),pathNeighbors:()=>[],reserveBed:()=>null,removeIncident:()=>{},depositWaste:(_x:number,_z:number,n:number)=>{dump.stored+=n;return n},emptyBin:(_id:string,n:number)=>{const amount=Math.min(n,bin.stored);bin.stored-=amount;return amount},fillBin:(_id:string,n:number)=>{bin.stored+=n;return n}}
  cleaner.carryingWaste=4;cleaner.wasteFromBin=false
  ;(staff as any).sendCleanerToDump(cleaner,context)
  assert.equal(cleaner.targetId,'deposit-bin:bin-1','collected litter goes to nearest reachable bin')
  cleaner.route=[];(staff as any).finishArrival(cleaner,context)
  assert.equal(bin.stored,4);assert.equal(cleaner.carryingWaste,0)
  cleaner.targetId=bin.id;cleaner.state='working'
  ;(staff as any).finishWork(cleaner,context)
  assert.equal(bin.stored,0);assert.equal(cleaner.carryingWaste,4);assert.equal(cleaner.wasteFromBin,true)
  cleaner.route=[];(staff as any).finishArrival(cleaner,context)
  assert.equal(dump.stored,4,'bin contents are transported to waste disposal without disappearing')
  for (const workArea of [undefined, null, {minX:2,maxX:4,minZ:0,maxZ:0}]) {
    const worker=createStaffMember('free-cleaner','cleaner',{x:0,z:0,elevation:0})
    worker.workArea=workArea
    const blocked={id:'blocked-bin',x:1,z:0,elevation:0,stored:5}
    const reachable={id:'reachable-bin',x:3,z:0,elevation:0,stored:5}
    staff.update({...context,staff:[worker],wasteBins:[blocked,reachable],
      findPath:(_a:any,goals:any[])=>goals[0].x===1?null:goals},.1)
    assert.equal(worker.targetId,reachable.id,'workers find reachable work with no area, cleared area, or explicit area')
  }
  const stranded=createStaffMember('patroller','cleaner',{x:0,z:0,elevation:0})
  staff.update({...context,staff:[stranded],wasteBins:[{...bin,stored:5}],
    findPath:()=>null,pathNeighbors:()=>[{x:0,z:1,elevation:0}]},.1)
  assert.equal(stranded.targetId,null)
  assert.equal(stranded.route.length,1,'unreachable work does not prevent patrol')
  const restricted=createStaffMember('restricted','cleaner',{x:0,z:0,elevation:0})
  restricted.workArea={minX:0,maxX:0,minZ:0,maxZ:0}
  staff.update({...context,staff:[restricted],wasteBins:[{...bin,stored:5}]},.1)
  assert.equal(restricted.targetId,null,'assigned areas still restrict work')
  s.staff.push(cleaner)
  assert.ok(game.manageFestival({type:'staffArea',staffId:cleaner.id,from:{x:2,z:-20},to:{x:4,z:-16}}).ok)
  assert.deepEqual(cleaner.workArea,{minX:2,maxX:4,minZ:-20,maxZ:-16})
  assert.ok(game.manageFestival({type:'staffArea',staffId:cleaner.id,from:null,to:null}).ok)
  assert.equal(cleaner.workArea,null)

  const exitGame=fixture(1), leaver=exitGame.snapshot.visitors[0]!, door=createScenarioEntrance(exitGame.snapshot.scenario.worldSize)
  leaver.state='leaving'
  leaver.route=[{x:door.x,z:door.z,elevation:2}]
  leaver.targetId=null
  leaver.arrivalGroupId=null
  leaver.cellX=door.x
  leaver.cellZ=door.z
  leaver.cellElevation=2
  leaver.x=door.x+0.5
  leaver.y=2
  leaver.z=door.z+0.5
  for(let n=0;n<8;n++) exitGame.tick(0.25)
  assert.equal(exitGame.snapshot.visitors.length,0,'guests on the exit path leave the park')

  assert.equal(spontaneousPanicChance(90, 80, 20, 1, 20), 0, 'one packed cell cannot start a mass panic')
  assert.equal(spontaneousPanicChance(90, 80, 20, 3, 20), 0, 'a thin crush still does not ignite')
  assert.equal(spontaneousPanicChance(90, 80, 20, 5, 8), 0, 'too few people in the cluster')
  assert.equal(spontaneousPanicChance(90, 20, 20, 5, 20), 0, 'panic needs prolonged crush stress')
  assert.ok(spontaneousPanicChance(90, 80, 20, 5, 20) > 0 && spontaneousPanicChance(90, 80, 20, 5, 20) < 0.0001, 'a wide packed crush can ignite, but still rarely')
  assert.equal(panicSpreadChance(80, 1, 1), 0, 'panic does not jump out of a single cell')
  assert.ok(panicSpreadChance(80, 1, 4) < 0.04, 'panic spread stays a rare chain reaction')
  const crowdingAt = (x: number, z: number) => (Math.abs(x) <= 1 && Math.abs(z) <= 1 ? 80 : 10)
  assert.equal(
    denseClusterSize({ cellX: 0, cellZ: 0, cellElevation: 0 }, (x, z, elevation) => elevation === 0 ? crowdingAt(x, z) : 0, 64),
    9,
  )
  assert.equal(
    neighborhoodPeople({ cellX: 0, cellZ: 0, cellElevation: 0 }, (x, z) => x === 0 && z === 0 ? 6 : 2),
    22,
  )
  const festiveCrowdVisitor = {
    state: 'exploring',
    emotion: 'sad',
    needs: { hunger: 90, toilet: 90, fun: 96, energy: 90 },
    isDancing: false,
    isConversing: false,
    crowding: 90,
    crowdStress: 30,
    isPanicking: false,
    localPartyMood: 92,
  }
  assert.equal(
    visitorBubbleKind(festiveCrowdVisitor),
    'happy',
    'happy festival guests do not look unhappy from brief crowding',
  )
  assert.equal(
    visitorBubbleKind({
      ...festiveCrowdVisitor,
      crowdStress: SIMULATION_CONFIG.crowding.crushStress,
    }),
    'crushed',
    'sustained critical crowding still overrides festival mood',
  )

  const leftover = abandonVisitorCamp(
    { id: 'gone', campsite: { x: 4, z: -8, elevation: 0 }, campingPhase: 'ready' },
    [{ id: 'chairs-1', cell: { x: 5, z: -8, elevation: 0 }, kind: 'chairs', ownerId: 'gone', contributorIds: ['gone'], decay: 0 }],
    () => 'tent-1',
  )
  assert.equal(leftover.filter((item) => item.kind === 'tent').length, 1, 'unpacked tents stay behind')
  const living = new Set(['other'])
  assert.ok(leftover.every((item) => isCollectibleCamp(item, living)), 'left-behind camp gear is immediately collectible')
  const worn = decayUnclaimedInstallations(leftover, living, 80)
  assert.ok(worn.every((item) => (item.decay ?? 0) > 20))
  const claimed = decayUnclaimedInstallations(
    [{ id: 'used', cell: { x: 6, z: -8, elevation: 0 }, kind: 'chairs', ownerId: 'gone', contributorIds: ['gone'], decay: 0 }],
    new Set(['gone']),
    80,
  )
  assert.ok(claimed.every((item) => (item.decay ?? 0) === 0), 'claimed camp gear does not decay')

  const campGame = fixture(0)
  const campState = campGame.snapshot as GameSnapshot
  campState.campingCells.push({ x: 3, z: -18, elevation: 0 })
  campState.campInstallations.push({
    id: 'old-tent',
    cell: { x: 3, z: -18, elevation: 0 },
    kind: 'tent',
    ownerId: '',
    contributorIds: [],
    decay: 40,
  })
  campState.staff.push(createStaffMember('camp-cleaner', 'cleaner', { x: 3, z: -20, elevation: 0 }))
  for (let n = 0; n < 80; n++) campGame.tick(0.25)
  assert.equal(
    campState.campInstallations.some((item) => item.id === 'old-tent'),
    false,
    'cleaners remove abandoned tents',
  )

  const scavenger = createStaffMember('scavenger', 'cleaner', { x: 0, z: 0, elevation: 0 })
  const litter = [
    { id: 'l1', kind: 'litter' as const, x: 1, z: 0, elevation: 0, severity: 1, ageMinutes: 0 },
    { id: 'l2', kind: 'litter' as const, x: 2, z: 0, elevation: 0, severity: 1, ageMinutes: 0 },
    { id: 'l3', kind: 'litter' as const, x: 3, z: 0, elevation: 0, severity: 1, ageMinutes: 0 },
  ]
  const haul = {
    ...context,
    staff: [scavenger],
    incidents: litter,
    findPath: (_a: any, goals: any[]) => goals.map((point) => ({ ...point })),
    removeIncident: (id: string) => {
      const index = litter.findIndex((item) => item.id === id)
      if (index >= 0) litter.splice(index, 1)
    },
  }
  scavenger.targetId = 'l1'
  scavenger.state = 'working'
  ;(staff as any).finishWork(scavenger, haul)
  assert.equal(scavenger.carryingWaste, 1)
  assert.equal(scavenger.targetId, 'l2', 'cleaners keep collecting until they hold three items')
  scavenger.route = []
  ;(staff as any).finishArrival(scavenger, haul)
  scavenger.workMinutes = 0
  ;(staff as any).finishWork(scavenger, haul)
  assert.equal(scavenger.carryingWaste, 2)
  assert.equal(scavenger.targetId, 'l3')
  scavenger.route = []
  ;(staff as any).finishArrival(scavenger, haul)
  scavenger.workMinutes = 0
  ;(staff as any).finishWork(scavenger, haul)
  assert.equal(scavenger.carryingWaste, 3)
  assert.ok(
    scavenger.targetId === 'deposit-bin:bin-1' || scavenger.targetId?.startsWith('dump:'),
    'a full armful goes to disposal',
  )

  console.log('PASS planned festival start, stand clearance, staff gates, automatic depot delivery, stock conservation and cleaning chain')
}
