import { hashStringSeed } from './rng'
import type { FestivalManagement } from './festivalManagement'
export const GENRES = [
  {id:'folk',name:'Folk',color:'#d5b65c'}, {id:'indie',name:'Indie',color:'#92bd66'},
  {id:'rock',name:'Rock',color:'#4db798'}, {id:'metal',name:'Metal',color:'#58a8d1'},
  {id:'electro',name:'Electro',color:'#858be0'}, {id:'dance',name:'Dance',color:'#bc79d3'},
  {id:'pop',name:'Pop',color:'#e580ab'}, {id:'soul',name:'Soul',color:'#e89e72'},
] as const
export type MusicGenre=typeof GENRES[number]['id']
export type MusicMix=Record<MusicGenre,number>
const bandGenres:Record<string,MusicGenre>={
  meadow:'indie',lantern:'indie',paper:'indie',aurora:'indie',
  brass:'pop',sugar:'pop',firefly:'pop',confetti:'pop',
  campfire:'folk',cedar:'folk',harbor:'folk',
  velvet:'soul',amber:'soul',lowtide:'soul',
  neon:'electro',voltage:'electro',synth:'electro',
  static:'rock',rivet:'rock',wildcard:'rock',
  orbit:'dance',glitter:'dance',discoball:'dance',
  iron:'metal',anvil:'metal',thunder:'metal',
}
export function bandGenre(id:string):MusicGenre{return bandGenres[id]??'indie'}
export function normalizeMusic(values?:Partial<MusicMix>):MusicMix{
  const total=GENRES.reduce((sum,g)=>sum+Math.max(0,Number.isFinite(values?.[g.id])?values![g.id]!:0),0)
  return Object.fromEntries(GENRES.map(g=>[g.id,total?Math.max(0,values?.[g.id]??0)/total:1/8])) as MusicMix
}
export function genreAffinity(taste:MusicGenre,genre:MusicGenre){const a=GENRES.findIndex(g=>g.id===taste),b=GENRES.findIndex(g=>g.id===genre),gap=Math.abs(a-b),distance=Math.min(gap,8-gap);return [1,.7,.32,.08,0][distance]??0}
export function lineupMix(f:FestivalManagement){const weights={} as MusicMix;for(const b of f.bookings){const genre=bandGenre(b.bandId);weights[genre]=(weights[genre]??0)+b.duration}return normalizeMusic(weights)}
export function expectedMusicMix(f:FestivalManagement){const base=normalizeMusic(f.musicBase);if(!f.bookings.length)return base;const program=lineupMix(f);return normalizeMusic(Object.fromEntries(GENRES.map(g=>[g.id,base[g.id]*.75+program[g.id]*.25])))}
export function musicTaste(id:string,f:FestivalManagement):MusicGenre{let roll=hashStringSeed('music:'+id)%10000/10000;const mix=expectedMusicMix(f);for(const g of GENRES){roll-=mix[g.id];if(roll<=0)return g.id}return 'soul'}
export function musicAppeal(taste:MusicGenre,bandId:string){return genreAffinity(taste,bandGenre(bandId))}
/** Only actually performed, technically valid minutes affect the next edition. */
export function evolveMusicAudience(f:FestivalManagement){
  if(f.musicEvolvedEdition===f.edition)return
  f.musicEvolvedEdition=f.edition;const base=normalizeMusic(f.musicBase);f.previousMusicBase={...base}
  if(!Object.values(f.playedMusic??{}).some(n=>n>0)){f.musicBase=base;return}
  const played=normalizeMusic(f.playedMusic)
  f.musicBase=normalizeMusic(Object.fromEntries(GENRES.map(g=>[g.id,base[g.id]*.8+played[g.id]*.18+.02/8])))
}
