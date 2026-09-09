import assert from 'node:assert/strict'
import { GameState, type GameSnapshot } from '../src/game/GameState'
import { emptyStock, orderGoods } from '../src/game/supplyChain'
import { updateDepotCarriers } from '../src/game/depotCarriers'
import { createStaffMember } from '../src/game/staff'
import { StaffSimulation } from '../src/game/staffSimulation'
import { DeterministicRng } from '../src/game/rng'

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
  console.log('PASS planned festival start, stand clearance, staff gates, automatic depot delivery, stock conservation and cleaning chain')
}
