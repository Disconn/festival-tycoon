import assert from 'node:assert/strict'
import { GameState, type GameSnapshot } from '../src/game/GameState'
import { BANDS, createFestivalManagement, festivalTime, updateFestival } from '../src/game/festivalManagement'
import { GENRES, bandGenre, genreAffinity, expectedMusicMix, normalizeMusic, musicTaste, evolveMusicAudience } from '../src/game/musicTaste'
import { WorldUpdates } from '../src/net/worldUpdates'
import { packWorld } from '../src/net/codec'
export function testMusicPlanning(fixture:(count?:number)=>GameState){
  assert.equal(GENRES.length,8);assert.equal(new Set(BANDS.map(b=>bandGenre(b.id))).size,8)
  const legacy=createFestivalManagement();assert.deepEqual(Object.values(expectedMusicMix(legacy)),Array(8).fill(.125))
  assert.equal(genreAffinity('folk','electro'),0);assert.equal(genreAffinity('folk','indie'),.7)
  for(const genre of GENRES)assert.equal(genreAffinity(genre.id,genre.id),1)
  legacy.edition=1;legacy.playedMusic={metal:120};evolveMusicAudience(legacy);assert.ok(legacy.musicBase!.metal>.125);assert.ok(legacy.musicBase!.folk>0)
  const evolved=structuredClone(legacy.musicBase);evolveMusicAudience(legacy);assert.deepEqual(legacy.musicBase,evolved,'evolution happens once per edition')
  assert.equal(musicTaste('same-id',legacy),musicTaste('same-id',structuredClone(legacy)))
  const untouched=createFestivalManagement();untouched.edition=1;evolveMusicAudience(untouched);assert.deepEqual(untouched.musicBase,normalizeMusic())
  const game=fixture(1),s=game.snapshot as GameSnapshot,f=s.festival;game.addDebugMoney();s.dayPlan.leadDays=1;s.dayPlan.festivalDays=2
  for(const x of [6,9]){game.manageFestival({type:'ground',x,z:-20,kind:'drain'});game.manageFestival({type:'ground',x,z:-20,kind:'compact'});assert.ok(game.place('stage',x,-20).ok)}
  const stages=s.buildings.filter(b=>b.kind==='stage');game.designateStageForecourt([{x:5,z:-20}])
  const book={type:'book' as const,bandId:'meadow',stageId:stages[0]!.id,day:f.startDay+1,start:840,duration:90}
  assert.ok(game.manageFestival(book).ok,'book during planning, before starting the clock')
  assert.ok(expectedMusicMix(f).indie>.125)
  const id=f.bookings[0]!.id,budget=s.money
  assert.ok(game.manageFestival({type:'moveBooking',id,stageId:stages[1]!.id,day:book.day,start:900,duration:90}).ok)
  assert.equal(s.money,budget);assert.equal(f.bookings[0]!.stageId,stages[1]!.id)
  s.dayPlan.offers.stages[15]=false
  const saved=structuredClone(f.bookings)
  assert.equal(game.manageFestival({type:'moveBooking',id,stageId:stages[0]!.id,day:book.day,start:870,duration:90}).ok,false)
  assert.deepEqual(f.bookings,saved);assert.equal(s.money,budget)
  assert.equal(game.manageFestival({type:'start'}).ok,false,'cannot start a lineup in closed hours')
  s.dayPlan.offers.stages[15]=true
  assert.ok(game.manageFestival({type:'start'}).ok);assert.equal(f.bookings[0]!.id,id,'start preserves prepaid lineup');assert.equal(s.money,budget)
  assert.ok(game.manageFestival({...book,bandId:'confetti',stageId:stages[0]!.id,start:900}).ok)
  assert.equal(game.manageFestival({type:'moveBooking',id,stageId:stages[0]!.id,day:book.day,start:930,duration:90}).ok,false,'moving respects overlap plus changeover')
  assert.deepEqual(new GameState(s).snapshot.festival.bookings,f.bookings)
  const client=new GameState(),updates=new WorldUpdates();client.networkMode='client';client.applyNetworkWorld(JSON.parse(updates.encode(packWorld(s),true)).world)
  assert.ok(game.manageFestival({type:'moveBooking',id,stageId:stages[1]!.id,day:book.day,start:840,duration:90}).ok)
  const delta=JSON.parse(updates.encode(packWorld(s)));client.applyNetworkUpdate(delta.world,delta.visitors,delta.removed);assert.deepEqual(client.snapshot.festival.bookings,f.bookings)
  s.day=book.day;s.minute=850;f.weather='sun';f.upgrades.rigging=true;s.power.poweredBuildingIds.push(...stages.map(b=>b.id))
  const visitor=s.visitors[0]!;visitor.audience='music';visitor.musicTaste='dance';visitor.state='exploring';visitor.route=[];visitor.cellX=4;visitor.cellZ=-20;visitor.cellElevation=0;visitor.x=4.5;visitor.z=-19.5
  assert.equal((game as any).tryVisitConcert(visitor),false,'opposite taste does not visit indie concert')
  assert.equal((game as any).avoidsConcertAt(visitor,{x:5,z:-20}),true,'generic party search cannot bypass taste')
  visitor.musicTaste='indie';assert.equal((game as any).tryVisitConcert(visitor),true);assert.equal(visitor.concertId,id)
  f.lastUpdate=festivalTime(s)-1;updateFestival(s);assert.ok((f.playedMusic?.indie??0)>0);assert.equal(f.playedMusic?.pop,undefined,'unplayed booking has no evolutionary effect')
  s.day=f.startDay+s.dayPlan.leadDays+s.dayPlan.festivalDays;s.minute=1;f.lastUpdate=festivalTime(s)-1;updateFestival(s)
  assert.equal(f.finished,true);assert.ok(f.musicBase!.indie>.125);assert.ok(f.musicBase!.pop<.125)
  const base=structuredClone(f.musicBase);  assert.ok(game.manageFestival({type:'prepare'}).ok);assert.equal(f.enabled,false);assert.equal(s.parkOpen,false);assert.equal(f.bookings.length,0);assert.deepEqual(f.musicBase,base)
  assert.ok(game.manageFestival({...book,day:f.startDay+1}).ok);assert.ok(game.manageFestival({type:'prepare'}).ok);assert.equal(f.bookings.length,1,'reopening planning preserves paid bookings')
  const keptManual=f.bookings[0]!,autoBudget=s.money
  assert.ok(game.manageFestival({type:'autoLineup',duration:90}).ok)
  assert.ok(f.bookings.length>=2,'auto lineup fills more than one empty slot')
  assert.ok(s.money<autoBudget)
  assert.equal(new Set(f.bookings.map(b=>b.bandId)).size,f.bookings.length,'auto lineup never books a band twice')
  assert.ok(f.bookings.some(b=>b.id===keptManual.id),'autofill keeps the already paid booking')
  const kept=f.bookings.length
  s.dayPlan.offers.stages=s.dayPlan.offers.stages.map(()=>false)
  assert.equal(game.manageFestival({type:'autoLineup',duration:90}).ok,false,'closed hours block further autofill')
  assert.equal(f.bookings.length,kept)
  s.dayPlan.offers.stages=s.dayPlan.offers.stages.map(()=>true)
  const existing=structuredClone(f.bookings)
  game.manageFestival({type:'autoLineup',duration:90})
  assert.ok(existing.every(b=>f.bookings.some(other=>other.id===b.id)),'autofill keeps already paid bookings')
  const restored=new GameState(s);assert.deepEqual(restored.snapshot.festival.musicBase,base);assert.equal(restored.snapshot.visitors[0]!.musicTaste,'indie')
  console.log('PASS eight music tastes, deterministic audience mix, pre-start bookings, atomic rescheduling, closed hours, taste-aware concert choice, saved/networked evolution and next-edition planning')
}
