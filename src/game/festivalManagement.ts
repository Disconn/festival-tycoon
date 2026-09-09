import { GENRES, bandGenre, musicTaste, musicAppeal, evolveMusicAudience, type MusicMix } from './musicTaste'
import { stageDistance, buildingFootprint, stageDesignIssue, stageStats, stagePhase, type StageDesign } from './stageDesign'
import type { WayType } from './wayTypes'
import { groundInfo } from './ground'
import { createInfrastructure, infrastructureAction, orderGoods, consumeLocal } from './supplyChain'
import type { Infrastructure, InfrastructureAction } from './supplyChain'
import type { GameSnapshot, Visitor, ActionResult } from './GameState'
import { hashStringSeed } from './rng'

export const AUDIENCES = ['music', 'party', 'family', 'comfort', 'camping'] as const
export type Audience = typeof AUDIENCES[number]
export const AUDIENCE_NAMES: Record<Audience, string> = { music: 'Musikfans', party: 'Partygänger', family: 'Familien', comfort: 'Komfortgäste', camping: 'Campingfans' }
export const BANDS = [
  { id: 'meadow', name: 'Meadow Letters', genre: 'Indie', audience: 'music', fee: 450, draw: 20, speakers: 0, reputation: 0 },
  { id: 'lantern', name: 'Lantern Parade', genre: 'Indie', audience: 'music', fee: 680, draw: 34, speakers: 1, reputation: 10 },
  { id: 'paper', name: 'Paper Satellites', genre: 'Indie', audience: 'music', fee: 1100, draw: 52, speakers: 2, reputation: 30 },
  { id: 'brass', name: 'Brass Picnic', genre: 'Brass & Pop', audience: 'family', fee: 550, draw: 25, speakers: 0, reputation: 0 },
  { id: 'sugar', name: 'Sugar Signal', genre: 'Pop', audience: 'party', fee: 820, draw: 38, speakers: 1, reputation: 15 },
  { id: 'firefly', name: 'Firefly Formula', genre: 'Pop', audience: 'family', fee: 1250, draw: 58, speakers: 2, reputation: 35 },
  { id: 'campfire', name: 'Campfire Atlas', genre: 'Folk', audience: 'camping', fee: 400, draw: 18, speakers: 0, reputation: 0 },
  { id: 'cedar', name: 'Cedar Choir', genre: 'Folk', audience: 'camping', fee: 720, draw: 32, speakers: 1, reputation: 10 },
  { id: 'harbor', name: 'Harbor & Hearth', genre: 'Folk', audience: 'comfort', fee: 1150, draw: 50, speakers: 2, reputation: 30 },
  { id: 'velvet', name: 'Velvet Sunday', genre: 'Soul', audience: 'comfort', fee: 700, draw: 30, speakers: 1, reputation: 0 },
  { id: 'amber', name: 'Amber Afterglow', genre: 'Soul', audience: 'comfort', fee: 1050, draw: 46, speakers: 1, reputation: 20 },
  { id: 'lowtide', name: 'Low Tide Lounge', genre: 'Soul', audience: 'comfort', fee: 1550, draw: 68, speakers: 2, reputation: 45 },
  { id: 'neon', name: 'Neon Orchard', genre: 'Electro', audience: 'party', fee: 950, draw: 40, speakers: 1, reputation: 0 },
  { id: 'voltage', name: 'Voltage Picnic', genre: 'Electro', audience: 'party', fee: 1350, draw: 62, speakers: 2, reputation: 35 },
  { id: 'synth', name: 'Synth Safari', genre: 'Electro', audience: 'party', fee: 1950, draw: 80, speakers: 3, reputation: 55 },
  { id: 'static', name: 'Static Parade', genre: 'Rock', audience: 'music', fee: 1400, draw: 60, speakers: 2, reputation: 40 },
  { id: 'rivet', name: 'Rivet Radio', genre: 'Rock', audience: 'music', fee: 780, draw: 36, speakers: 1, reputation: 10 },
  { id: 'wildcard', name: 'Wildcard Weekend', genre: 'Rock', audience: 'music', fee: 2100, draw: 84, speakers: 3, reputation: 60 },
  { id: 'orbit', name: 'Midnight Orbit', genre: 'Dance · Headliner', audience: 'party', fee: 2200, draw: 85, speakers: 2, reputation: 55 },
  { id: 'glitter', name: 'Glitter Transit', genre: 'Dance', audience: 'party', fee: 1250, draw: 54, speakers: 2, reputation: 25 },
  { id: 'discoball', name: 'Disco Ballistics', genre: 'Dance', audience: 'party', fee: 1850, draw: 74, speakers: 3, reputation: 50 },
  { id: 'iron', name: 'Iron Daisies', genre: 'Metal', audience: 'music', fee: 650, draw: 28, speakers: 0, reputation: 0 },
  { id: 'anvil', name: 'Anvil Arcade', genre: 'Metal', audience: 'music', fee: 1080, draw: 48, speakers: 2, reputation: 20 },
  { id: 'thunder', name: 'Thunder Meadow', genre: 'Metal', audience: 'music', fee: 1700, draw: 70, speakers: 3, reputation: 45 },
  { id: 'confetti', name: 'Confetti Club', genre: 'Pop', audience: 'party', fee: 500, draw: 22, speakers: 0, reputation: 0 },
  { id: 'aurora', name: 'Aurora Avenue', genre: 'Indie · Headliner', audience: 'music', fee: 2800, draw: 100, speakers: 3, reputation: 65 },
] as const
export type Supply = 'food' | 'drinks' | 'water'
export const SUPPLIES: Record<Supply, { name: string; price: number }> = { food: { name: 'Essen', price: 2 }, drinks: { name: 'Getränke', price: 1.5 }, water: { name: 'Trinkwasser', price: 0.3 } }
export const UPGRADES = {
  drainage: { name: 'Entwässerung & Wegmatten', cost: 900, detail: 'Halbiert die Schlammwirkung auf unbefestigten Flächen.' },
  shelter: { name: 'Überdachte Ruheplätze', cost: 700, detail: 'Schützt bis zu 250 Gäste vor Regen und Hitze.' },
  rigging: { name: 'Sturmsicherung der Bühnen', cost: 1100, detail: 'Ermöglicht technisch geeignete Auftritte auch bei starkem Wind.' },
  water: { name: 'Trinkwasserstationen', cost: 450, detail: 'Versorgte WCs geben Trinkwasser im Umkreis von drei Feldern aus. Trägerroute für Wasser nötig.' },
  quiet: { name: 'Ruhecamp mit Schallschutz', cost: 850, detail: 'Reduziert den Schlafverlust durch nahe Nachtkonzerte.' },
  warehouse: { name: 'Lagererweiterung', cost: 750, detail: 'Erhöht die Kapazität je Depot von 3.000 auf 5.000 Einheiten.' },
} as const
export type Upgrade = keyof typeof UPGRADES
export type Booking = { id: string; bandId: string; stageId: string; day: number; start: number; duration: number; fee: number }
export type Weather = 'sun' | 'rain' | 'heat' | 'wind'
export const WEATHER_NAMES: Record<Weather, string> = { sun: 'Heiter', rain: 'Regen', heat: 'Hitze', wind: 'Starker Wind' }
type Reputation = { music: number; atmosphere: number; comfort: number; organization: number }
export type DayReport = { day: number; balance: number; guests: number; satisfaction: number; concerts: number; stockouts: number; weatherImpact: number; reputation: Reputation }
export type FestivalManagement = {
  musicBase?: MusicMix; previousMusicBase?: MusicMix; playedMusic?: Partial<MusicMix>; musicEvolvedEdition?: number;
  stageTemplates?: StageDesign[]; selectedStageTemplate?: string | null;
  tickets?: { day: number; camping: number; usedDay: Record<string, number>; usedCamping: number };
  infrastructure: Infrastructure; planning?: boolean; enabled: boolean; finished: boolean; edition: number; startDay: number; reportDay: number; openingMoney: number;
  bookings: Booking[]; supplies: Record<Supply, number>; upgrades: Record<Upgrade, boolean>;
  deliveries: Array<{ id: string; kind: Supply; quantity: number; due: number; remaining: number; depotId?: string }>;
  reputation: Reputation; reports: DayReport[]; weather: Weather; wetness: number; seed: number; nextId: number;
  metrics: { guests: number; samples: number; satisfaction: number; concertMinutes: number; stockouts: number; weatherImpact: number };
  lastUpdate: number; admissions: number; goals: { guests: number; satisfaction: number; profit: number };
}
export type FestivalAction = InfrastructureAction
  | { type: 'wayArea'; from: { x: number; z: number }; to: { x: number; z: number }; kind: WayType }
  | { type: 'stageTemplate'; name: string | null }
  | { type: 'stageDesign'; design: StageDesign; stageId?: string; saveTemplate?: boolean; selectForBuild?: boolean }
  | { type: 'tickets'; day: number; camping: number }
  | { type: 'start' }
  | { type: 'prepare' }
  | { type: 'moveBooking'; id:string; stageId:string; day:number; start:number; duration:number }
  | { type: 'book'; bandId: string; stageId: string; day: number; start: number; duration: number }
  | { type: 'cancel'; id: string }
  | { type: 'order'; kind: Supply; quantity: number; delay: number; depotId?: string }
  | { type: 'upgrade'; kind: Upgrade }
  | { type: 'sandbox' }

const metrics = () => ({ guests: 0, samples: 0, satisfaction: 0, concertMinutes: 0, stockouts: 0, weatherImpact: 0 })
const clamp = (n: number) => Math.max(0, Math.min(100, n))
export const festivalTime = (s: Readonly<GameSnapshot>) => s.day * 1440 + s.minute
export function createFestivalManagement(): FestivalManagement {
  return { infrastructure: createInfrastructure(), enabled: false, finished: false, edition: 0, startDay: 1, reportDay: 1, openingMoney: 0,
    bookings: [], supplies: { food: 0, drinks: 0, water: 0 },
    upgrades: { drainage: false, shelter: false, rigging: false, water: false, quiet: false, warehouse: false },
    deliveries: [], reputation: { music: 40, atmosphere: 50, comfort: 50, organization: 50 }, reports: [],
    weather: 'sun', wetness: 0, seed: 1, nextId: 1, metrics: metrics(), lastUpdate: 0,
    admissions: 0, goals: { guests: 150, satisfaction: 65, profit: 0 } }
}
export function forecast(f: FestivalManagement, day: number, hour: number): Weather {
  const value = hashStringSeed(`${f.seed}:${day}:${Math.floor(hour / 6)}`) % 10
  return value < 4 ? 'sun' : value < 7 ? 'rain' : value < 9 ? 'heat' : 'wind'
}
export function weatherAt(f: FestivalManagement, day: number, hour: number): Weather {
  const outlook = forecast(f, day, hour)
  // Forecasts show the risk for a six-hour window; some hours turn out milder.
  if (hashStringSeed(`${f.seed}:actual:${day}:${Math.floor(hour)}`) % 5 === 0) {
    return outlook === 'wind' ? 'rain' : 'sun'
  }
  return outlook
}
export function audienceMix(f: FestivalManagement): Record<Audience, number> {
  const weights = { music: 20 + f.reputation.music / 5, party: 20 + f.reputation.atmosphere / 5,
    family: 15 + f.reputation.organization / 5, comfort: 15 + f.reputation.comfort / 5, camping: 25 }
  for (const booking of f.bookings) {
    const band = BANDS.find(b => b.id === booking.bandId)
    if (band) weights[band.audience] += band.draw
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  return Object.fromEntries(AUDIENCES.map(key => [key, weights[key] / sum])) as Record<Audience, number>
}
export function assignAudience(visitor: Visitor, f: FestivalManagement): void {
  const mix = audienceMix(f)
  let choice = (hashStringSeed(visitor.id) % 10000) / 10000
  let group: Audience = 'camping'
  for (const key of AUDIENCES) { choice -= mix[key]; if (choice <= 0) { group = key; break } }
  visitor.musicTaste ??= musicTaste(visitor.id,f)
  visitor.audience = group
  visitor.budget *= group === 'comfort' ? 1.35 : group === 'family' ? 1.15 : group === 'camping' ? 0.9 : 1
  visitor.partyPreference = group === 'party' ? 0.95 : group === 'family' || group === 'comfort' ? 0.25 : 0.65
  visitor.beautyPreference = group === 'comfort' || group === 'family' ? 0.9 : 0.45
  if (group === 'family') { visitor.alcoholDesire = 0; visitor.preferredBedtime = 21 }
}
export function activeBookings(s: Readonly<GameSnapshot>): Booking[] {
  if (!s.festival.enabled || s.festival.finished) return []
  return s.festival.bookings.filter(b => b.day === s.day && s.minute >= b.start && s.minute < b.start + b.duration)
}
export function showIssue(s: Readonly<GameSnapshot>, booking: Booking): string | null {
  const stage = s.buildings.find(b => b.id === booking.stageId && b.kind === 'stage')
  const band = BANDS.find(b => b.id === booking.bandId)
  if (!stage || !band) return 'Bühne fehlt'
  if (band.draw >= 60 && buildingFootprint(stage).some(c=>groundInfo(s,c.x,c.z).bearing<3)) return 'Großauftritt braucht ein entwässertes, gepflastertes Bühnenfundament'
  if (!s.stageForecourtCells.some(c => stageDistance(stage,c) <= 8)) return 'Bühnenvorplatz im Umkreis von 8 Feldern fehlt'
  if (!s.power.poweredBuildingIds.includes(stage.id)) return 'Bühne ohne Strom'
  if (!s.dayPlan.offers.stages[Math.floor(s.minute / 60) % 24]) return 'Bühnen laut Tagesplan geschlossen'
  const speakers = s.buildings.filter(b => ['directionalSpeaker', 'omniSpeaker', 'delayTower'].includes(b.kind) &&
    stageDistance(stage,b) <= 10 && s.power.poweredBuildingIds.includes(b.id)).length
  if (speakers + (stage.stageDesign ? stageStats(stage.stageDesign).speakers : 0) < band.speakers) return `${band.speakers} aktive Lautsprecher im Umkreis von 10 Feldern nötig`
  if (s.festival.weather === 'wind' && !s.festival.upgrades.rigging) return 'Starker Wind: Sturmsicherung fehlt'
  return null
}
export function festivalAction(s: GameSnapshot, action: FestivalAction): ActionResult {
  if (['ground', 'groundArea', 'depot', 'minimum', 'route', 'removeRoute', 'removeDepot', 'depotSettings', 'staffArea', 'staffGate'].includes(action.type)) return infrastructureAction(s, action as InfrastructureAction)
  if (action.type === 'order') return orderGoods(s, action.kind, action.quantity, action.delay, action.depotId)
  const f = s.festival, now = festivalTime(s)
  const fail = (message: string): ActionResult => ({ ok: false, message })
  const pay = (amount: number) => { if (s.money < amount) return false; s.money -= amount; return true }
  if (action.type === 'sandbox') { f.planning = false; f.enabled = false; s.parkOpen = true; s.speed = 1; return { ok: true, message: 'Freies Spiel fortgesetzt' } }
  if (action.type === 'stageTemplate') {
    if(action.name!==null&&!f.stageTemplates?.some(t=>t.name===action.name))return fail('Vorlage nicht gefunden')
    f.selectedStageTemplate=action.name
    return {ok:true,message:action.name?'Bühnenvorlage gewählt':'Standardbühne für Neubauten gewählt'}
  }
  if (action.type === 'stageDesign') {
    const issue = stageDesignIssue(action.design); if (issue) return fail(issue)
    const stage = action.stageId ? s.buildings.find(b=>b.id===action.stageId&&b.kind==='stage') : undefined
    if (action.stageId && !stage) return fail('Bühne nicht gefunden')
    if ((action.saveTemplate || action.selectForBuild) && (f.stageTemplates?.length??0)>=30 && !f.stageTemplates?.some(t=>t.name===action.design.name)) return fail('Höchstens 30 Vorlagen speichern')
    if (stage) {
      const price = Math.max(0,stageStats(action.design).cost-(stage.stageDesign?stageStats(stage.stageDesign).cost:0))
      if (!pay(price)) return fail('Nicht genug Geld für den Bühnenausbau')
      stage.stageDesign = structuredClone(action.design)
    }
    if (action.saveTemplate || action.selectForBuild) {
      f.stageTemplates ??= []; const index=f.stageTemplates.findIndex(t=>t.name===action.design.name)
      if(index>=0)f.stageTemplates[index]=structuredClone(action.design);else f.stageTemplates.push(structuredClone(action.design))
    }
    if(action.selectForBuild)f.selectedStageTemplate=action.design.name
    return {ok:true,message:stage?'Bühne umgebaut':action.selectForBuild?'Vorlage für den Bühnenbau gewählt':'Bühnenvorlage gespeichert'}
  }
  if (action.type === 'tickets') {
    if (f.enabled && !f.finished) return fail('Ticketkontingente vor dem Festivalstart festlegen')
    if (![action.day, action.camping].every(n => Number.isInteger(n) && n >= 0 && n <= 100000)) return fail('Gültige Ticketzahlen zwischen 0 und 100.000 wählen')
    const capacity = Math.floor(s.campingCells.length * (1 - s.dayPlan.campingCapacityBufferPercent / 100))
    if (action.camping > capacity) return fail(`Nur ${capacity} Campingplätze buchbar`)
    f.tickets = { day: action.day, camping: action.camping, usedDay: {}, usedCamping: 0 }
    return { ok: true, message: 'Ticketkontingente gespeichert' }
  }
  if(action.type==='prepare'){
    if(f.enabled&&!f.finished)return fail('Das laufende Festival zuerst abschließen')
    if(f.planning&&!f.finished)return {ok:true,message:'Die Festivalplanung ist bereits geöffnet'}
    f.enabled=false;f.finished=false;f.planning=true;f.bookings=[];f.startDay=s.day;s.parkOpen=false;s.speed=0
    return {ok:true,message:'Nächste Ausgabe planen – die Besucherbasis bleibt erhalten'}
  }
  if (action.type === 'start') {
    if (f.enabled && !f.finished) return fail('Das Festivalwochenende läuft bereits')
    if (f.tickets && f.tickets.camping > Math.floor(s.campingCells.length * (1 - s.dayPlan.campingCapacityBufferPercent / 100))) return fail('Für die Campingtickets fehlen nutzbare Plätze')
    if(!f.finished&&f.bookings.some(b=>b.day<f.startDay+s.dayPlan.leadDays||b.day>=f.startDay+s.dayPlan.leadDays+s.dayPlan.festivalDays||!bookingHoursOpen(s,b.start,b.duration)))return fail('Spielplan passt nicht zur Tagesplanung. Auftritte zuerst anpassen.')
    if (f.tickets) { f.tickets.usedDay = {}; f.tickets.usedCamping = 0 }
    const plannedStart=f.startDay
    if(f.finished)f.bookings=[]
    else f.bookings.forEach(b=>b.day+=s.day-plannedStart)
    f.playedMusic={}
    f.planning = false; f.enabled = true; f.finished = false; f.edition++; f.startDay = s.day;
    f.reportDay = s.day; f.openingMoney = s.money+f.bookings.reduce((sum,b)=>sum+b.fee,0); f.reports = [];
    f.metrics = metrics(); f.admissions = 0; f.lastUpdate = now; f.seed = s.rngState;
    s.dayPlan.cycleStartDay = s.day;
    s.parkOpen = true; s.speed = 1;
    return { ok: true, message: 'Festivalzeit gestartet. Vorlauf und Ablauf richten sich nach eurer Tagesplanung.' }
  }
  if(f.finished)return fail('Zuerst die nächste Ausgabe vorbereiten')
  if (action.type === 'book'||action.type==='moveBooking') {
    const previous=action.type==='moveBooking'?f.bookings.find(b=>b.id===action.id):undefined
    if(action.type==='moveBooking'&&(!previous||previous.day*1440+previous.start<=now))return fail('Nur zukünftige Buchungen verschieben')
    const band = BANDS.find(b => b.id === (action.type==='book'?action.bandId:previous?.bandId))
    if (!band || !s.buildings.some(b => b.id === action.stageId && b.kind === 'stage')) return fail('Band und vorhandene Bühne wählen')
    if (!Number.isInteger(action.day)||!(action.day >= f.startDay + s.dayPlan.leadDays && action.day < f.startDay + s.dayPlan.leadDays + s.dayPlan.festivalDays) || !Number.isInteger(action.start) ||
        action.start < 8 * 60 || ![60, 90, 120].includes(action.duration) || action.start + action.duration > 24 * 60 ||
        action.day * 1440 + action.start <= now) return fail('Freie Zeit an einem geplanten Festivaltag wählen (08–24 Uhr)')
    if(!bookingHoursOpen(s,action.start,action.duration))return fail('Bühnen sind in diesem Zeitfenster laut Tagesplanung geschlossen')
    if (f.reputation.music < band.reputation) return fail(`Diese Band verlangt mindestens ${band.reputation} Musikruf`)
    if (f.bookings.some(b => b.id!==previous?.id && b.day === action.day && (b.bandId === band.id || (b.stageId === action.stageId &&
        action.start < b.start + b.duration + 30 && action.start + action.duration + 30 > b.start)))) return fail('Band bereits gebucht oder Bühne belegt (30 Minuten Umbauzeit)')
    if(previous){Object.assign(previous,{stageId:action.stageId,day:action.day,start:action.start,duration:action.duration});return {ok:true,message:'Auftritt verschoben – keine zusätzliche Gage'}}
    if (!pay(band.fee)) return fail('Nicht genug Geld für die Gage')
    f.bookings.push({ id: `booking-${f.nextId++}`, bandId: band.id, stageId: action.stageId, day: action.day,
      start: action.start, duration: action.duration, fee: band.fee })
    return { ok: true, message: `${band.name} gebucht – Gage bezahlt` }
  }
  if (action.type === 'cancel') {
    const b = f.bookings.find(b => b.id === action.id)
    if (!b || b.day * 1440 + b.start <= now) return fail('Nur zukünftige Auftritte können storniert werden')
    s.money += b.fee / 2; f.bookings = f.bookings.filter(item => item.id !== b.id)
    return { ok: true, message: 'Buchung storniert, 50 % der Gage erstattet' }
  }
  if (action.type === 'upgrade') {
    const upgrade = UPGRADES[action.kind]
    if (!upgrade || f.upgrades[action.kind]) return fail('Ausbau bereits vorhanden oder unbekannt')
    if (!pay(upgrade.cost)) return fail('Nicht genug Geld für diesen Ausbau')
    f.upgrades[action.kind] = true
    return { ok: true, message: `${upgrade.name} eingerichtet` }
  }
  return fail('Unbekannte Festivalaktion')
}
export function recordDay(s: GameSnapshot): void {
  const f = s.festival, m = f.metrics
  const satisfaction = m.samples ? m.satisfaction / m.samples : 50
  if (f.reportDay >= f.startDay + s.dayPlan.leadDays) {
    const music = Math.min(100, 40 + m.concertMinutes / Math.max(1, m.samples) * 180)
    const targets = { music, atmosphere: satisfaction, comfort: clamp(satisfaction - m.weatherImpact / Math.max(1, m.samples) * 8), organization: clamp(90 - m.stockouts / Math.max(1, m.guests) * 100) }
    for (const key of Object.keys(targets) as Array<keyof Reputation>) f.reputation[key] = clamp(f.reputation[key] * 0.7 + targets[key] * 0.3)
  }
  f.reports.push({ day: f.reportDay, balance: s.money - f.openingMoney, guests: m.guests,
    satisfaction, concerts: m.concertMinutes, stockouts: m.stockouts, weatherImpact: m.weatherImpact, reputation: { ...f.reputation } })
  f.reportDay = s.day; f.openingMoney = s.money; f.metrics = metrics()
}
/** Runs at most once per simulated minute; no work in sandbox or on network clients. */
export function updateFestival(s: GameSnapshot): void {
  const f = s.festival
  if (!f.enabled) {
    const now = festivalTime(s), previous = f.infrastructure.weatherAt ?? now
    f.infrastructure.weatherAt ??= now
    if (now - previous >= 1) {
      f.weather = weatherAt(f, s.day, s.minute / 60)
      f.wetness = clamp(f.wetness + (now - previous) * (f.weather === 'rain' ? .5 : -.2))
      f.infrastructure.weatherAt = now
    }
    return
  }
  if (f.finished) return
  f.infrastructure.weatherAt = festivalTime(s)
  const now = festivalTime(s), minutes = now - f.lastUpdate
  if (minutes < 1) return
  f.lastUpdate = now
  if (s.day !== f.reportDay) recordDay(s)
  if (s.day >= f.startDay + s.dayPlan.leadDays + s.dayPlan.festivalDays) { evolveMusicAudience(f); f.finished = true; s.parkOpen = false; return }
  f.weather = weatherAt(f, s.day, s.minute / 60)
  f.wetness = clamp(f.wetness + minutes * (f.weather === 'rain' ? 0.5 : -0.2))
  const shows = activeBookings(s).filter(b => !showIssue(s, b)).map(b => {
    const stage=s.buildings.find(x=>x.id===b.stageId)!, design=stage.stageDesign
    const phase=design?stagePhase(design,(s.minute-b.start)/b.duration):null
    return {booking:b,stage,band:BANDS.find(x=>x.id===b.bandId)!,boost:design&&phase?stageStats(design).party/100*(phase.volume+phase.intensity)/200:0,noise:phase?phase.volume/100:1}
  })
  for (const stage of s.buildings) {
    if (stage.kind !== 'stage') continue
    stage.bandName = shows.find(show => show.stage.id === stage.id)?.band.name ?? 'Umbau / Pause'
  }
  f.playedMusic??={}
  for(const show of shows){const genre=bandGenre(show.band.id);const played=Math.max(0,Math.min(s.minute,show.booking.start+show.booking.duration)-Math.max(s.minute-minutes,show.booking.start));f.playedMusic[genre]=(f.playedMusic[genre]??0)+played*(.5+show.band.draw/100)}
  const audienceConflicts = new Map(GENRES.map(g=>[g.id,shows.filter(show=>musicAppeal(g.id,show.band.id)>=.7).length]))
  const cover = f.upgrades.shelter ? Math.min(1, 250 / Math.max(1, s.visitors.length)) : 0
  let happiness = 0
  for (const visitor of s.visitors) {
    if (!visitor.audience) assignAudience(visitor, f)
    visitor.musicTaste??=musicTaste(visitor.id,f)
    let weatherImpact = 0
    const sheltered = visitor.state === 'camping' && visitor.campingPhase === 'resting'
    if (!sheltered && (f.weather === 'rain' || f.weather === 'heat')) {
      weatherImpact = minutes * 0.12 * (1 - cover)
      if (f.weather === 'heat' && f.upgrades.water && s.buildings.some(b => b.kind === 'toilet' && Math.hypot(b.x - visitor.x, b.z - visitor.z) <= 3 && consumeLocal(s, b.id, 'water'))) { /* Water is dispensed locally at supplied sanitation points. */ }
      else { visitor.needs.energy = clamp(visitor.needs.energy - weatherImpact); visitor.needs.fun = clamp(visitor.needs.fun - weatherImpact) }
    }
    for (const show of shows) {
      const distance = stageDistance(show.stage,visitor)
      if (distance <= 8 && visitor.concertId===show.booking.id && visitor.state === 'partying' && visitor.route.length === 0) {
        const affinity=musicAppeal(visitor.musicTaste,show.band.id),match=affinity>=.7
        visitor.needs.fun = clamp(visitor.needs.fun + minutes * (1.5*affinity) * (1 + show.boost))
        f.metrics.concertMinutes += minutes
        visitor.thought = `${show.band.name} spielen live – ${match ? 'genau mein Geschmack!' : 'gute Stimmung!'}`
        break
      }
      if (distance < 12 && sheltered && s.minute >= 21 * 60 && !f.upgrades.quiet) {
        visitor.needs.energy = clamp(visitor.needs.energy - minutes * 0.5 * show.noise)
        visitor.needs.fun = clamp(visitor.needs.fun - minutes * 0.4 * show.noise)
        visitor.thought = 'Die Bühne neben meinem Zelt lässt mich nicht schlafen.'
      }
    }
    if (visitor.audience === 'comfort' || visitor.audience === 'family') {
      visitor.needs.fun = clamp(visitor.needs.fun - minutes * Math.max(0, visitor.crowding - 60) / 300)
    }
    if ((audienceConflicts.get(visitor.musicTaste) ?? 0) > 1) {
      visitor.needs.fun = clamp(visitor.needs.fun - minutes * 0.15)
      if (visitor.state === 'partying') visitor.thought = 'Meine Lieblingsbands spielen gleichzeitig – ich verpasse einen Auftritt.'
    }
    happiness += (visitor.needs.fun + visitor.needs.energy + visitor.needs.hunger + visitor.needs.toilet) / 4
    f.metrics.weatherImpact += weatherImpact
  }
  if (s.visitors.length) { f.metrics.satisfaction += happiness * minutes; f.metrics.samples += s.visitors.length * minutes }
}


export function bookingHoursOpen(s:Readonly<GameSnapshot>,start:number,duration:number){for(let minute=start;minute<start+duration;minute+=Math.min(60-minute%60,start+duration-minute)){if(!s.dayPlan.offers.stages[Math.floor(minute/60)%24])return false}return true}
