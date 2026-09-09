import { occupiesBuildingCell } from './stageDesign'
import { updateDepotCarriers } from './depotCarriers'
import { wayInfo } from './wayTypes'
import { SIMULATION_CONFIG } from './simulationConfig'
import type { ActionResult, GameSnapshot } from './GameState'
import type { Supply } from './festivalManagement'
import { SUPPLIES } from './festivalManagement'
import { createRoadGraph, findRoadRoute } from './logistics'
import { getTerrainHeight } from './terrain'
import { groundInfo, groundKey, prepareGround, prepareGroundArea, roadGroundLimit } from './ground'
import type { GroundCell, GroundWork } from './ground'
import { hashStringSeed } from './rng'

export type Point = { x: number; z: number; elevation: number }
export type Stock = Record<Supply, number>
export const emptyStock = (): Stock => ({ food: 0, drinks: 0, water: 0 })
export type Depot = { role?: 'delivery' | 'storage'; distribution?: 'relay' | 'shops'; id: string; x: number; z: number; stock: Stock; minimum: Stock }
export type CarryRoute = { assignmentDelay?: number; workArea?: { minX:number;maxX:number;minZ:number;maxZ:number } | null; automatic?: boolean; job?: { sourceId: string; destinationId: string; destinationKind: 'depot' | 'shop'; quantity: number; phase: 'pickup' | 'deliver' | 'home' }; id: string; depotId: string; targetId: string; kind: Supply | 'waste'; minimum: number;
  waypoints: Point[]; position: Point; path: Point[]; phase: 'idle' | 'outbound' | 'return'; cargo: number; progress: number; status: string }
export type Freight = { id: string; deliveryId: string | null; depotId: string; x: number; z: number; path: Array<{ x: number; z: number }>;
  phase: 'inbound' | 'return'; progress: number; stuck: number; testedCell: string; cargo: number; kind: Supply }
export type Infrastructure = { ground: Record<string, GroundCell>; depots: Depot[]; shops: Record<string, Stock>; routes: CarryRoute[];
  trucks: Freight[]; nextId: number; lastUpdate: number; automaticAt: number; weatherAt?: number; status: string }
export const createInfrastructure = (): Infrastructure => ({ ground: {}, depots: [], shops: {}, routes: [], trucks: [], nextId: 1, lastUpdate: -1, automaticAt: -1, status: 'Depot an Straße und Fußwegen platzieren' })
export type InfrastructureAction =
  | { type: 'groundArea'; from: { x: number; z: number }; to: { x: number; z: number }; kind: GroundWork }
  | { type: 'ground'; x: number; z: number; kind: GroundWork }
  | { type: 'depot'; x: number; z: number; role?: 'delivery' | 'storage' }
  | { type: 'depotSettings'; depotId: string; distribution: 'relay' | 'shops'; workers: number }
  | { type: 'staffArea'; staffId: string; from: {x:number;z:number} | null; to: {x:number;z:number} | null }
  | { type: 'staffGate'; x: number; z: number; elevation: number }
  | { type: 'removeDepot'; depotId: string }
  | { type: 'minimum'; depotId: string; kind: Supply; quantity: number }
  | { type: 'route'; depotId: string; targetId: string; kind: Supply | 'waste'; minimum: number; waypoints: Point[] }
  | { type: 'removeRoute'; id: string }

export function infrastructureAction(s: GameSnapshot, a: InfrastructureAction): ActionResult {
  const i = s.festival.infrastructure, fail = (message: string) => ({ ok: false, message })
  if (a.type === 'staffArea') {
    const member = s.staff.find(p => p.id === a.staffId) ?? i.routes.find(p => p.id === a.staffId)
    if (!member) return fail('Personal nicht gefunden')
    if (!a.from || !a.to) member.workArea = null
    else {
      const values = [a.from.x,a.from.z,a.to.x,a.to.z]
      if (values.some(v => !Number.isInteger(v) || v < -s.scenario.worldSize/2 || v >= s.scenario.worldSize/2)) return fail('Arbeitsbereich außerhalb der Karte')
      member.workArea = {minX:Math.min(a.from.x,a.to.x), maxX:Math.max(a.from.x,a.to.x),minZ:Math.min(a.from.z,a.to.z),maxZ:Math.max(a.from.z,a.to.z)}
    }
    if ('state' in member && member.state === 'patrolling') member.route = []
    return {ok:true,message:'Arbeitsbereich gespeichert; Entsorgungs- und Rettungswege bleiben erreichbar.'}
  }
  if (a.type === 'staffGate') {
    const path = s.buildings.find(b => b.kind === 'path' && b.x === a.x && b.z === a.z && b.elevation === a.elevation)
    if (!path) return fail('Personaltor auf einem Fußweg platzieren')
    if (!path.staffOnly && s.money < 80) return fail('Personaltor kostet 80 €')
    if (!path.staffOnly) s.money -= 80
    path.staffOnly = !path.staffOnly
    return {ok:true,message:path.staffOnly ? 'Personaltor gesetzt: nur Personal und Logistik' : 'Personaltor entfernt'}
  }
  if (a.type === 'groundArea') return prepareGroundArea(s, a.from, a.to, a.kind)
  if (a.type === 'ground') return prepareGround(s, a.x, a.z, a.kind)
  if (a.type === 'route' && a.kind === 'waste') return fail('Mülltransporte übernimmt automatisch das Reinigungspersonal')
  if (a.type === 'depot') {
    if (a.role && !['delivery','storage'].includes(a.role)) return fail('Ungültiger Lagertyp')
    if (!Number.isInteger(a.x) || !Number.isInteger(a.z) || Math.abs(a.x + .5) > s.scenario.worldSize / 2 || Math.abs(a.z + .5) > s.scenario.worldSize / 2) return fail('Außerhalb des Geländes')
    if (getTerrainHeight(s.terrain, a.x, a.z) < 0 || s.buildings.some(b => occupiesBuildingCell(b,a.x,a.z)) ||
      [...i.depots, ...s.logistics.roadCells, ...s.logistics.parkingCells, ...s.campingCells, ...s.wasteDumpCells, ...s.stageForecourtCells, ...s.medicalCells].some(p => p.x === a.x && p.z === a.z)) return fail('Depot benötigt ein freies, trockenes Feld')
    if (groundInfo(s, a.x, a.z).bearing < 2) return fail('Depot benötigt verdichteten Untergrund')
    if (s.money < 400) return fail('Depot kostet 400 €')
    if (a.role === 'delivery' && !s.logistics.roadCells.some(p => Math.abs(p.x-a.x)+Math.abs(p.z-a.z) === 1)) return fail('Anlieferungsplatz direkt neben einer Straße setzen')
    s.money -= 400
    i.depots.push({ id: `supply-${i.nextId++}`, x: a.x, z: a.z, stock: emptyStock(), minimum: emptyStock(), ...(a.role ? { role: a.role } : {}), distribution: 'shops' })
    // Old shared inventory becomes cargo awaiting physical delivery, never shop stock.
    for (const kind of Object.keys(SUPPLIES) as Supply[]) {
      const quantity = s.festival.supplies[kind]
      if (quantity > 0) s.festival.deliveries.push({ id: `delivery-${s.festival.nextId++}`, kind, quantity, due: s.day * 1440 + s.minute, remaining: 0, depotId: i.depots[0]!.id })
      s.festival.supplies[kind] = 0
    }
    return { ok: true, message: 'Depot gebaut. Straße und Fußweg direkt anschließen; Mindestbestände und Trägerrouten planen.' }
  }
  if (a.type === 'removeRoute') {
    const route = i.routes.find(r => r.id === a.id)
    if (!route) return fail('Route fehlt')
    if (route.phase !== 'idle' || route.cargo) return fail('Träger erst zum Depot zurückkehren lassen')
    i.routes = i.routes.filter(r => r !== route)
    return { ok: true, message: 'Trägerroute entfernt' }
  }
  const depot = i.depots.find(d => d.id === a.depotId)
  if (!depot) return fail('Depot wählen')
  if (a.type === 'depotSettings') {
    if (!Number.isInteger(a.workers) || a.workers < 0 || a.workers > 20 || !['relay','shops'].includes(a.distribution)) return fail('0–20 Träger und gültigen Lagertyp wählen')
    const workers = i.routes.filter(r => r.automatic && r.depotId === depot.id)
    const difference = a.workers - workers.length
    if (difference > 0 && s.money < difference * 120) return fail('Jeder Träger kostet 120 €')
    const idle = workers.filter(r => !r.job && r.cargo === 0)
    if (difference < 0 && idle.length < -difference) return fail('Träger zuerst ihre Lieferung abschließen lassen')
    for (let n=0;n<difference;n++) i.routes.push({id:`carrier-${i.nextId++}`,automatic:true,depotId:depot.id,targetId:'',kind:'food',minimum:40,waypoints:[],position:{x:depot.x,z:depot.z,elevation:getTerrainHeight(s.terrain,depot.x,depot.z)},path:[],phase:'idle',cargo:0,progress:0,status:'Suche Transportauftrag'})
    if (difference < 0) { const removed = new Set(idle.slice(0,-difference).map(r => r.id)); i.routes = i.routes.filter(r => !removed.has(r.id)) }
    s.money -= Math.max(0,difference)*120
    depot.distribution = a.distribution
    return {ok:true,message:'Depot und automatische Träger gespeichert'}
  }
  if (a.type === 'removeDepot') {
    if (Object.values(depot.stock).some(n => n > 0) || i.routes.some(r => r.depotId === depot.id || r.job?.sourceId === depot.id || r.job?.destinationId === depot.id) ||
      i.trucks.some(t => t.depotId === depot.id) || s.festival.deliveries.some(d => d.depotId === depot.id)) return fail('Depot erst leeren, Lieferungen abschließen und Trägerrouten entfernen')
    i.depots = i.depots.filter(d => d !== depot); s.money += 200
    return { ok: true, message: 'Leeres Depot abgebaut; 200 € erstattet' }
  }
  if (a.type === 'minimum') {
    if (!SUPPLIES[a.kind] || !Number.isInteger(a.quantity) || a.quantity < 0 || a.quantity > 800) return fail('Mindestbestand zwischen 0 und 800 wählen')
    depot.minimum[a.kind] = a.quantity
    return { ok: true, message: 'Mindestbestand gespeichert; Fehlmengen werden kostenpflichtig nachbestellt (45 € je Lieferung).' }
  }
  const target = s.buildings.find(b => b.id === a.targetId)
  if (!target || !(a.kind === 'food' && target.kind === 'food' || a.kind === 'drinks' && target.kind === 'alcohol' || a.kind === 'water' && target.kind === 'toilet' || a.kind === 'waste' && target.kind === 'wasteBin')) return fail('Passenden Stand, WC (Trinkwasser) oder Mülleimer wählen')
  if (!Number.isInteger(a.minimum) || a.minimum < 1 || a.minimum > (a.kind === 'waste' ? SIMULATION_CONFIG.waste.binCapacity : 200) || a.waypoints.length > 12 || a.waypoints.some(p => !s.buildings.some(b => b.kind === 'path' && b.x === p.x && b.z === p.z && b.elevation === p.elevation))) return fail('Zielbestand 1–200 und maximal zwölf Wegpunkte auf Fußwegen wählen')
  if (i.routes.some(r => r.targetId === a.targetId && r.kind === a.kind)) return fail('Für dieses Ziel besteht bereits eine Route')
  if (s.money < 120) return fail('Träger mit Handkarren kostet 120 €')
  s.money -= 120
  i.routes.push({ id: `carrier-${i.nextId++}`, depotId: depot.id, targetId: target.id, kind: a.kind, minimum: a.minimum,
    waypoints: a.waypoints.map(p => ({ ...p })), position: { x: depot.x, z: depot.z, elevation: getTerrainHeight(s.terrain, depot.x, depot.z) }, path: [], phase: 'idle', cargo: 0, progress: 0, status: 'Warte auf Wegverbindung' })
  return { ok: true, message: 'Träger eingestellt: 0,04 €/Spielminute. Er folgt der geplanten Route.' }
}

export function orderGoods(s: GameSnapshot, kind: Supply, quantity: number, delay: number, depotId?: string): ActionResult {
  const f = s.festival, i = f.infrastructure
  let depot = i.depots.find(d => d.id === depotId) ?? (!depotId ? i.depots[0] : undefined)
  const fail = (message: string) => ({ ok: false, message })
  if (depot?.role === 'storage' && !i.depots.some(d => d.role === 'delivery')) return fail('Zuerst einen Anlieferungsplatz an einer Straße definieren')
  if (depot?.role === 'storage' && i.depots.some(d => d.role === 'delivery')) depot = i.depots.filter(d => d.role === 'delivery').sort((a,b) => Math.abs(a.x-depot!.x)+Math.abs(a.z-depot!.z)-Math.abs(b.x-depot!.x)-Math.abs(b.z-depot!.z))[0]
  if (!depot) return fail('Zuerst ein Warendepot in der Logistikansicht bauen')
  if (!SUPPLIES[kind] || !Number.isInteger(quantity) || quantity < 50 || quantity > 2000 || ![0, 360, 720].includes(delay)) return fail('50–2.000 Einheiten und gültiges Lieferfenster wählen')
  const used = Object.values(depot.stock).reduce((a, b) => a + b, 0) + f.deliveries.filter(d => d.depotId === depot.id).reduce((a, d) => a + d.quantity, 0)
  if (used + quantity > (f.upgrades.warehouse ? 5000 : 3000)) return fail('Depot einschließlich bestellter Ware voll')
  const cost = quantity * SUPPLIES[kind].price + 45
  if (s.money < cost) return fail('Nicht genug Geld für Ware und 45 € Lieferung')
  s.money -= cost
  f.deliveries.push({ id: `delivery-${f.nextId++}`, depotId: depot.id, kind, quantity, due: s.day * 1440 + s.minute + delay, remaining: 90 })
  return { ok: true, message: 'Bestellt: 90 Minuten Anfahrt bis zum Kartenrand, danach Fahrt zum Depot und Verteilung per Träger.' }
}

export function localStock(s: GameSnapshot, targetId: string, kind: Supply): number {
  return s.festival.infrastructure.shops[targetId]?.[kind] ?? 0
}
export function consumeLocal(s: GameSnapshot, targetId: string, kind: Supply): boolean {
  if (localStock(s, targetId, kind) < 1) return false
  const stock = s.festival.infrastructure.shops[targetId]
  if (stock) stock[kind]--
  return true
}

export type PedestrianRouter = (start: Point, goals: Point[]) => Point[] | null
/** Low frequency dispatch; paths are resolved only at departure. Movement is authoritative and saved. */
export function updateSupplyChain(s: GameSnapshot, routeWalk: PedestrianRouter, canStep: (a: Point, b: Point) => boolean = () => true): void {
  const f = s.festival, i = f.infrastructure, now = s.day * 1440 + s.minute
  if (i.lastUpdate < 0) { i.lastUpdate = now; return }
  const dt = now - i.lastUpdate
  if (dt < .5) return
  i.lastUpdate = now
  if (!i.depots.length && !i.trucks.length) return
  if (now - i.automaticAt >= 10) {
    i.automaticAt = now
    for (const depot of i.depots) for (const kind of Object.keys(SUPPLIES) as Supply[]) {
      const pending = f.deliveries.filter(d => d.kind === kind).reduce((sum, d) => sum + d.quantity, 0) + i.depots.filter(d => d.id !== depot.id && (d.role === 'delivery' || d.distribution === 'relay')).reduce((sum,d) => sum+d.stock[kind],0) + i.routes.filter(r => r.automatic && r.kind === kind && r.job?.destinationId === depot.id).reduce((sum,r) => sum+r.cargo,0)
      const need = depot.minimum[kind] - depot.stock[kind] - pending
      if (need > 0) { const result = orderGoods(s, kind, Math.max(50, Math.ceil(need)), 0, depot.id); if (!result.ok) i.status = result.message }
    }
  }
  const graph = createRoadGraph(s.logistics.roadCells, s.scenario.worldSize)
  const roads = new Set(s.logistics.roadCells.map(p => groundKey(p.x, p.z)))
  const edges = s.logistics.roadCells.filter(p => p.z === -s.scenario.worldSize / 2)
  const near = (a: { x: number; z: number; elevation?: number }, b: { x: number; z: number; elevation?: number }) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1 && Math.abs((a.elevation ?? getTerrainHeight(s.terrain, a.x, a.z)) - (b.elevation ?? getTerrainHeight(s.terrain, b.x, b.z))) < .51
  const roadRoute = (start: { x: number; z: number }, targets: Array<{ x: number; z: number }>) => findRoadRoute({ roadCells: s.logistics.roadCells, graph, start, targets, allowUTurn: true, worldSize: s.scenario.worldSize })
  const occupied = new Set(s.logistics.roadVehicles.filter(v => v.cell && v.state !== 'parked').map(v => groundKey(v.cell!.x, v.cell!.z)))
  for (const truck of i.trucks) occupied.add(groundKey(truck.x, truck.z))
  const crowds = new Map<string, number>()
  for (const v of s.visitors) if (!['riding', 'bus-riding', 'vehicle-arrival'].includes(v.state)) {
    const key = groundKey(v.cellX, v.cellZ); crowds.set(key, (crowds.get(key) ?? 0) + 1)
  }
  for (const delivery of f.deliveries) {
    if (now < delivery.due || i.trucks.some(t => t.deliveryId === delivery.id)) continue
    delivery.remaining = Math.max(0, delivery.remaining - Math.min(dt, now - delivery.due))
    if (delivery.remaining > 0) continue
    const depot = i.depots.find(d => d.id === delivery.depotId) ?? i.depots[0]
    if (!depot) continue
    delivery.depotId = depot.id
    const bays = s.logistics.roadCells.filter(p => near(p, depot))
    let launched = false
    for (const edge of edges) {
      if (occupied.has(groundKey(edge.x, edge.z))) continue
      const path = roadRoute(edge, bays)
      if (path === null) continue
      i.trucks.push({ id: `freight-${i.nextId++}`, deliveryId: delivery.id, depotId: depot.id, x: edge.x, z: edge.z, path,
        phase: 'inbound', progress: 0, stuck: 0, testedCell: '', cargo: delivery.quantity, kind: delivery.kind })
      occupied.add(groundKey(edge.x, edge.z)); launched = true; break
    }
    if (!launched) i.status = 'Lieferung wartet: freie Zufahrt vom nördlichen Kartenrand zum Depot fehlt'
  }
  const finished = new Set<string>()
  for (const t of i.trucks) {
    if (t.stuck > 0) { t.stuck = Math.max(0, t.stuck - dt); continue }
    const g = groundInfo(s, t.x, t.z), key = groundKey(t.x, t.z)
    if (t.testedCell !== key) {
      t.testedCell = key
      if (g.wet > .5 && hashStringSeed(`${t.id}:${key}`) % 100 < g.wet * wayInfo(s, t.x, t.z, 'road').stuck * 100) { t.stuck = 8; i.status = 'Fahrzeug steckt fest: Fahrer schiebt es frei (8 Spielminuten)'; continue }
    }
    const limit = s.logistics.roadCells.find(c => c.x === t.x && c.z === t.z)?.speedLimit ?? 30
    t.progress += dt * wayInfo(s, t.x, t.z, 'road').speed * Math.min(limit, roadGroundLimit(s, t.x, t.z)) / 30
    if (t.progress < .6) continue
    t.progress = 0
    const next = t.path[0]
    if (next) {
      const nextKey = groundKey(next.x, next.z)
      if (!roads.has(nextKey)) { t.path = []; i.status = 'Frachtroute unterbrochen'; continue }
      if (nextKey !== key && (occupied.has(nextKey) || (crowds.get(nextKey) ?? 0) >= 5)) {
        i.status = 'Lieferwagen wartet auf Verkehr – bei Gegenverkehr eine Ausweichspur bauen'
        if (Math.floor(now) % 5 === 0) {
          const depot = i.depots.find(d => d.id === t.depotId)
          const targets = t.phase === 'return' ? edges : depot ? s.logistics.roadCells.filter(p => near(p, depot)) : []
          const blockedCells = new Set(occupied); blockedCells.delete(key)
          const alternate = findRoadRoute({ roadCells: s.logistics.roadCells, graph, start: t, targets, blockedCells, allowUTurn: true, worldSize: s.scenario.worldSize })
          if (alternate) t.path = alternate
        }
        continue
      }
      occupied.delete(key); occupied.add(nextKey); t.x = next.x; t.z = next.z; t.path.shift(); continue
    }
    const depot = i.depots.find(d => d.id === t.depotId)
    if (t.phase === 'inbound') {
      if (!depot) continue
      if (!near(t, depot)) { t.path = roadRoute(t, s.logistics.roadCells.filter(p => near(p, depot))) ?? []; continue }
      depot.stock[t.kind] += t.cargo; t.cargo = 0
      f.deliveries = f.deliveries.filter(d => d.id !== t.deliveryId)
      t.deliveryId = null; t.phase = 'return'; i.status = 'Ware im Depot entladen – Träger verteilen sie an die Stände'
    }
    if (edges.some(e => e.x === t.x && e.z === t.z)) { finished.add(t.id); occupied.delete(key) }
    else t.path = roadRoute(t, edges) ?? []
  }
  i.trucks = i.trucks.filter(t => !finished.has(t.id))

  const footKey = (p: Point) => `${p.x},${p.z},${p.elevation}`
  const footCrowds = new Map<string, number>()
  for (const visitor of s.visitors) {
    if (['riding', 'bus-riding', 'vehicle-arrival'].includes(visitor.state)) continue
    const key = footKey({ x: visitor.cellX, z: visitor.cellZ, elevation: visitor.cellElevation })
    footCrowds.set(key, (footCrowds.get(key) ?? 0) + 1)
  }
  for (const route of i.routes) {
    if (route.phase === 'idle' && !route.path.length) continue
    const key = footKey(route.position)
    footCrowds.set(key, (footCrowds.get(key) ?? 0) + (route.cargo > 0 ? 3 : 2))
  }
  const paths = s.buildings.filter(b => b.kind === 'path')
  const pathByCell = new Map(paths.map(p => [footKey(p), p]))
  const pathSet = new Set(pathByCell.keys())
  const adjacentPaths = (p: { x: number; z: number }) => paths.filter(b => near(b, p)).map(b => ({ x: b.x, z: b.z, elevation: b.elevation }))
  const connect = (start: Point, waypoints: Point[], targets: Point[]): Point[] | null => {
    let at = start; const result: Point[] = []
    for (const goals of [...waypoints.map(p => [p]), targets]) {
      const part = routeWalk(at, goals)
      if (part === null) return null
      result.push(...part); at = part.at(-1) ?? at
    }
    return result
  }
  // Retire legacy waste routes once their physical cargo has reached its destination.
  i.routes = i.routes.filter(r => r.kind !== 'waste' || r.cargo > 0 || r.phase !== 'idle')
  updateDepotCarriers(s, dt, routeWalk, canStep)
  for (const r of i.routes) {
    if (r.automatic) continue
    s.money -= dt * .04
    const depot = i.depots.find(d => d.id === r.depotId), target = s.buildings.find(b => b.id === r.targetId)
    if (!depot) continue
    if (r.path.length) {
      const next = r.path[0]!, count = footCrowds.get(footKey(next)) ?? 0
      if (!pathSet.has(`${groundKey(next.x, next.z)},${next.elevation}`) || !canStep(r.position, next)) { r.status = 'Weg unterbrochen – vorhandenen Weg wieder anschließen'; continue }
      const surface = pathByCell.get(footKey(next))
      const way = wayInfo(s, next.x, next.z, 'foot', surface?.wayType)
      const weight = r.cargo > 0 ? 3 : 2
      const others = Math.max(0, count - (footKey(next) === footKey(r.position) ? weight : 0))
      const density = (others + weight - 1) / way.capacity
      const speed = Math.max(0.02, 1 / (1 + 12 * Math.pow(Math.max(0, density - 0.5) * 2, 2)))
      r.progress += dt * way.speed * speed
      r.status = density >= 0.75 ? 'Mit Handkarren langsam durch die Menschenmenge' : r.phase === 'outbound' ? 'Zum Stand unterwegs' : 'Rückweg'
      if (r.progress >= 1) {
        const oldKey = footKey(r.position), nextKey = footKey(next)
        footCrowds.set(oldKey, Math.max(0, (footCrowds.get(oldKey) ?? 0) - weight))
        footCrowds.set(nextKey, (footCrowds.get(nextKey) ?? 0) + weight)
        r.progress = 0; r.position = r.path.shift()!
      }
      continue
    }
    if (r.phase === 'outbound') {
      if (r.kind === 'waste') {
        if (target) { r.cargo = Math.min(40, target.wasteFill ?? 0); target.wasteFill = (target.wasteFill ?? 0) - r.cargo }
      } else if (target) { const stock = i.shops[target.id] ??= emptyStock(); stock[r.kind] += r.cargo; r.cargo = 0 }
      r.phase = 'return'
    }
    if (r.phase === 'return') {
      const dumps = s.wasteDumpCells.filter(d => d.stored < SIMULATION_CONFIG.waste.dumpCapacity)
      const goals = r.kind === 'waste' && r.cargo ? dumps.flatMap(adjacentPaths) : adjacentPaths(depot)
      const arrived = goals.some(p => p.x === r.position.x && p.z === r.position.z && p.elevation === r.position.elevation)
      if (!arrived) {
        const route = connect(r.position, [...r.waypoints].reverse(), goals)
        if (route === null) { r.status = r.kind === 'waste' ? 'Erreichbare Müllablage mit freiem Platz fehlt' : 'Rückweg zum Depot fehlt'; continue }
        r.path = route; continue
      }
      if (r.kind === 'waste' && r.cargo) {
        const dump = dumps.find(d => near(d, r.position))
        if (!dump) continue
        const amount = Math.min(r.cargo, SIMULATION_CONFIG.waste.dumpCapacity - dump.stored); dump.stored += amount; r.cargo -= amount
        if (r.cargo) continue
        // The empty cart must return physically to its home depot before another collection.
        r.path = connect(r.position, [], adjacentPaths(depot)) ?? []; if (r.path.length) continue
      } else if (r.cargo && r.kind !== 'waste') { depot.stock[r.kind] += r.cargo; r.cargo = 0 }
      r.phase = 'idle'
    }
    if (r.kind === 'waste') { r.status = 'Müll übernimmt jetzt das Reinigungspersonal'; continue }
    if (!target) { r.status = 'Zielgebäude wurde entfernt'; continue }
    const needed = (i.shops[target.id]?.[r.kind] ?? 0) < r.minimum
    if (!needed) { r.status = 'Zielbestand erreicht'; continue }
    const quantity = Math.min(40, depot.stock[r.kind], r.minimum - (i.shops[target.id]?.[r.kind] ?? 0))
    if (quantity <= 0) { r.status = 'Depot wartet auf Nachschub'; continue }
    let start = r.position
    if (!pathSet.has(`${groundKey(start.x, start.z)},${start.elevation}`)) start = adjacentPaths(depot)[0] ?? start
    const route = connect(start, r.waypoints, adjacentPaths(target))
    if (route === null) { r.status = 'Durchgehender Fußweg zu Depot, Wegpunkten und Ziel fehlt'; continue }
    r.position = start; r.path = route; r.phase = 'outbound'; r.cargo = quantity
    depot.stock[r.kind] -= quantity
  }
}
