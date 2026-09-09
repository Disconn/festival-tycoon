import type { GameSnapshot } from './GameState'
import { groundInfo } from './ground'

export const WAY_TYPES = {
  footDirt: { name: 'Trampelpfad', mode: 'foot', cost: 10, speed: .85, rain: .65, capacity: 6, limit: 0, bearing: 1, drain: false, stuck: 0, color: 0xb19a71, detail: 'Günstig, schmal; bei Regen sehr langsam.' },
  footGravel: { name: 'Schotterweg', mode: 'foot', cost: 24, speed: 1, rain: .12, capacity: 9, limit: 0, bearing: 2, drain: false, stuck: 0, color: 0xb8b3a0, detail: 'Solider Allrounder; tragfähigen Boden vorbereiten.' },
  footBoard: { name: 'Holzbohlenweg', mode: 'foot', cost: 45, speed: .95, rain: .03, capacity: 7, limit: 0, bearing: 1, drain: false, stuck: 0, color: 0xa68a62, detail: 'Regenfest auch auf weichem Boden; begrenzter Durchsatz.' },
  footPaved: { name: 'Promenade', mode: 'foot', cost: 60, speed: 1.2, rain: 0, capacity: 12, limit: 0, bearing: 2, drain: true, stuck: 0, color: 0xc2bbaa, detail: 'Schnell und belastbar; Entwässerung und tragfähiger Boden nötig.' },
  roadDirt: { name: 'Feldstraße', mode: 'road', cost: 28, speed: .85, rain: .65, capacity: 0, limit: 10, bearing: 1, drain: false, stuck: .35, color: 0x897758, detail: 'Günstige Zufahrt; bei Nässe droht Festfahren.' },
  roadGravel: { name: 'Schotterstraße', mode: 'road', cost: 65, speed: 1, rain: .12, capacity: 0, limit: 30, bearing: 2, drain: false, stuck: 0, color: 0x85867e, detail: 'Bis Tempo 30; verdichteter oder natürlicher Kiesboden.' },
  roadPlates: { name: 'Baustraße mit Fahrplatten', mode: 'road', cost: 110, speed: .9, rain: .02, capacity: 0, limit: 30, bearing: 1, drain: false, stuck: 0, color: 0x65706d, detail: 'Trägt Fahrzeuge auf weichem Boden; teuer, aber rasch einsatzbereit.' },
  roadAsphalt: { name: 'Asphaltstraße', mode: 'road', cost: 140, speed: 1.15, rain: 0, capacity: 0, limit: 50, bearing: 2, drain: true, stuck: 0, color: 0x50555a, detail: 'Schnellste dauerhafte Zufahrt; Entwässerung und tragfähiger Boden nötig.' },
} as const
export type WayType = keyof typeof WAY_TYPES
export type WayMode = 'foot' | 'road'
export function wayInfo(s: Readonly<GameSnapshot>, x: number, z: number, mode: WayMode, override?: WayType) {
  const ground = groundInfo(s, x, z)
  const id = override ?? (mode === 'foot' ? ground.footway : ground.roadway)
  const type = id ? WAY_TYPES[id] : undefined
  if (type && type.mode === mode) return { speed: type.speed * (ground.type === 'sand' && (id === 'footDirt' || id === 'roadDirt') ? .8 : 1) * (1 - ground.wet * type.rain), capacity: type.capacity, limit: type.limit, stuck: type.stuck, color: type.color }
  return { speed: ground.speed, capacity: 9, limit: ground.surface === 'paved' ? 50 : ground.surface === 'gravel' ? 30 : 10, stuck: ground.surface ? 0 : .35, color: mode === 'foot' ? 0xc9b48a : 0x50555a }
}
export function wayIssue(s: Readonly<GameSnapshot>, x: number, z: number, id: WayType): string | null {
  const type = WAY_TYPES[id], ground = groundInfo(s, x, z)
  if (!type) return 'Unbekannter Wegtyp'
  if (ground.bearing < type.bearing) return `${type.name}: Untergrund zuerst verdichten (Lehm zuvor entwässern)`
  if (type.drain && !ground.drained) return `${type.name}: Entwässerung fehlt`
  return null
}
