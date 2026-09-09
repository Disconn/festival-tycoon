import type { Environment } from './environments'
import type { WayType } from './wayTypes'
import { wayInfo } from './wayTypes'
import type { GameSnapshot } from './GameState'
import { getTerrainHeight } from './terrain'

export type GroundWork = 'drain' | 'compact' | 'gravel' | 'pave'
export type GroundCell = { footway?: WayType; roadway?: WayType; drained?: boolean; compacted?: boolean; surface?: 'gravel' | 'paved' }
export const GROUND_WORK = {
  drain: { name: 'Entwässern', cost: 35 }, compact: { name: 'Verdichten', cost: 25 },
  gravel: { name: 'Schotterdecke', cost: 45 }, pave: { name: 'Pflastern / Fundament', cost: 90 },
}
export const groundKey = (x: number, z: number) => `${x},${z}`
export function substrate(x: number, z: number, environment: Environment = 'farmland'): 'field' | 'clay' | 'gravel' | 'sand' | 'grass' | 'urban' {
  const region = Math.abs(Math.floor(x / 7) * 13 + Math.floor(z / 9) * 7) % 7
  if (environment === 'desert') return 'sand'
  if (environment === 'urban') return 'urban'
  if (environment === 'grassland') return region === 6 ? 'gravel' : 'grass'
  return region < 2 ? 'clay' : region === 6 ? 'gravel' : 'field'
}
export function groundInfo(s: Readonly<GameSnapshot>, x: number, z: number) {
  const type = substrate(x, z, s.scenario.environment)
  const work: GroundCell = { ...(type === 'urban' ? { drained: true, compacted: true, surface: 'paved' as const } : {}), ...s.festival.infrastructure?.ground[groundKey(x, z)] }
  const wet = s.festival.wetness / 100 * (type === 'sand' ? .25 : 1) * (work.drained ? 0.25 : s.festival.upgrades.drainage ? 0.5 : 1)
  const softness = type === 'clay' ? 1 : type === 'field' ? .85 : type === 'grass' ? .55 : type === 'sand' ? .4 : .25
  const speed = work.surface === 'paved' ? 1.15 : work.surface === 'gravel' ? 1.02 - wet * 0.1 :
    (work.compacted ? 0.94 : type === 'sand' ? .65 : type === 'grass' ? .9 : .82) * (1 - wet * softness * 0.65)
  return { ...work, type, wet, speed, bearing: work.surface === 'paved' ? 3 : work.compacted || type === 'gravel' ? 2 : 1 }
}
export function prepareGround(s: GameSnapshot, x: number, z: number, kind: GroundWork) {
  const fail = (message: string) => ({ ok: false, message })
  if (!Number.isInteger(x) || !Number.isInteger(z) || Math.abs(x + .5) > s.scenario.worldSize / 2 || Math.abs(z + .5) > s.scenario.worldSize / 2) return fail('Außerhalb des Geländes')
  if (getTerrainHeight(s.terrain, x, z) < 0) return fail('Zuerst Wasser und Senken mit dem Geländewerkzeug aufarbeiten')
  const offer = GROUND_WORK[kind], info = groundInfo(s, x, z)
  if (!offer) return fail('Unbekannte Bodenarbeit')
  if ((kind === 'drain' && info.drained) || (kind === 'compact' && info.compacted) || (kind === 'gravel' && info.surface) || (kind === 'pave' && info.surface === 'paved')) return fail('Bereits ausgebaut')
  if (kind === 'compact' && info.type === 'clay' && !info.drained) return fail('Lehmboden zuerst entwässern')
  if (kind === 'gravel' && info.bearing < 2) return fail('Zuerst den Untergrund verdichten')
  if (kind === 'pave' && (!info.drained || info.bearing < 2)) return fail('Fundament braucht Entwässerung und tragfähigen Untergrund')
  if (s.money < offer.cost) return fail('Nicht genug Geld für die Bodenarbeit')
  s.money -= offer.cost
  const cell = s.festival.infrastructure.ground[groundKey(x, z)] ??= {}
  if (kind === 'drain') cell.drained = true
  if (kind === 'compact') cell.compacted = true
  if (kind === 'gravel' || kind === 'pave') cell.surface = kind === 'pave' ? 'paved' : 'gravel'
  return { ok: true, message: `${offer.name}: Feld ${x}, ${z} ausgebaut` }
}
export function buildingEfficiency(s: Readonly<GameSnapshot>, x: number, z: number): number {
  const g = groundInfo(s, x, z)
  return g.bearing === 3 ? 1.25 : Math.max(.4, g.speed)
}

export function roadGroundLimit(s: Readonly<GameSnapshot>, x: number, z: number): number {
  return wayInfo(s, x, z, 'road').limit
}

export function groundRectangle(s: Readonly<GameSnapshot>, from: { x: number; z: number }, to: { x: number; z: number }) {
  const half = s.scenario.worldSize / 2
  if (![from.x, from.z, to.x, to.z].every(n => Number.isInteger(n) && n >= -half && n < half)) return []
  const cells: Array<{ x: number; z: number }> = []
  for (let z = Math.min(from.z, to.z); z <= Math.max(from.z, to.z); z++)
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) cells.push({ x, z })
  return cells
}

export function prepareGroundArea(s: GameSnapshot, from: { x: number; z: number }, to: { x: number; z: number }, kind: GroundWork, preview = false) {
  const cells = groundRectangle(s, from, to)
  const target = preview ? { ...s, festival: { ...s.festival, infrastructure: { ...s.festival.infrastructure, ground: Object.fromEntries(Object.entries(s.festival.infrastructure.ground).map(([k, v]) => [k, { ...v }])) } } } : s
  const before = target.money
  let changed = 0, reason = 'Ungültige Fläche'
  for (const cell of cells) {
    const result = prepareGround(target, cell.x, cell.z, kind)
    if (result.ok) changed++; else reason = result.message
  }
  const cost = before - target.money, skipped = cells.length - changed
  return { ok: changed > 0, changed, cost, skipped, message: changed ? `${changed} Felder · ${cost} €${skipped ? ` · ${skipped} übersprungen (bereits ausgebaut, ungeeignet oder Budget erschöpft)` : ''}` : reason }
}
