export const COMPONENTS = {
  deck: {name:'Bühnenpodest',cost:80,party:0,beauty:1,power:0},
  truss: {name:'Traversensystem',cost:110,party:0,beauty:1,power:0},
  fireworks: {name:'Feuerwerksmodul',cost:850,party:12,beauty:6,power:.4},
  sparks: {name:'Funkenfontäne',cost:390,party:6,beauty:3,power:.5},
  spot: {name:'Moving Head',cost:180,party:5,beauty:2,power:.4},
  speaker: {name:'Lautsprecher',cost:260,party:9,beauty:-1,power:1.2},
  fog: {name:'Nebelmaschine',cost:160,party:4,beauty:1,power:.8},
  laser: {name:'Laserfächer',cost:340,party:7,beauty:3,power:.6},
  screen: {name:'Pixel-LED-Wand',cost:420,party:5,beauty:5,power:1.5},
  banner: {name:'Themenbanner',cost:90,party:1,beauty:6,power:0},
  star: {name:'Deko-Stern',cost:70,party:1,beauty:4,power:0},
  palm: {name:'Pixel-Palme',cost:120,party:1,beauty:7,power:0},
} as const
export const BRANDS = {
  budget: {name:'Bummringer · Garagenserie',cost:1,quality:.75},
  touring: {name:'Mahrten & Söhne · Touring',cost:1.7,quality:1.2},
  premium: {name:'El-Akustisch · Prestige',cost:2.8,quality:1.7},
} as const
export const TRUSS_BRANDS = {
  budget: {name:'AluTraverse',cost:1,quality:.8},
  touring: {name:'Worldwide Truss',cost:1.6,quality:1.15},
  premium: {name:'Prolight',cost:2.3,quality:1.55},
} as const
export function brandsFor(kind:ComponentKind){return kind==='truss'?TRUSS_BRANDS:BRANDS}
export type ComponentKind = keyof typeof COMPONENTS
export const UNMOUNTABLE_KINDS:ComponentKind[]=['deck','truss','palm','fog','fireworks','sparks']
export type MountFace='under'|'over'|'sideA'|'sideB'|'end'
export const MOUNT_FACES:MountFace[]=['under','over','sideA','sideB','end']
export type StagePart = {stackOn?:string|null;id:string;kind:ComponentKind;brand:keyof typeof BRANDS;x:number;z:number;rotation:number;mount:string|null;color:string;orientation?:'horizontal'|'vertical';mountFace?:MountFace}
export type ShowPhase = {movement?:number;pyro?:number;intensity:number;speed:number;fog:number;volume:number;color:string}
export type StageDesign = {audience?:Array<{x:number;z:number}>;tileWidth?:number;tileDepth?:number;name:string;width:number;depth:number;parts:StagePart[];linked:boolean;phases:[ShowPhase,ShowPhase,ShowPhase]}
export const PHASE_NAMES = ['Warm-up','Main','Finale'] as const
export const STAGE_TILE_DETAIL = 3
export function stageDetailSize(tileWidth?:number,tileDepth?:number) {
  return {width:(tileWidth??1)*STAGE_TILE_DETAIL,depth:(tileDepth??1)*STAGE_TILE_DETAIL}
}
export function defaultStageDesign():StageDesign {
  const tileWidth=2,tileDepth=2
  return {tileWidth,tileDepth,name:'Meine Traumbühne',...stageDetailSize(tileWidth,tileDepth),linked:false,parts:[],phases:[
    {movement:20,pyro:0,intensity:40,speed:25,fog:15,volume:50,color:'#ffc369'},
    {movement:55,pyro:35,intensity:75,speed:55,fog:40,volume:80,color:'#7f8cff'},
    {movement:100,pyro:100,intensity:100,speed:85,fog:65,volume:100,color:'#ef66cd'}]}
}
export function stageStats(d:StageDesign) {
  let cost=d.width*d.depth*12 + ((d.tileWidth??1)*(d.tileDepth??1)-1)*180,party=0,beauty=0,power=0,speakers=0
  for(const p of d.parts){const c=COMPONENTS[p.kind],b=brandsFor(p.kind)[p.brand];cost+=c.cost*b.cost;party+=c.party*b.quality;beauty+=c.beauty*b.quality;power+=c.power;if(p.kind==='speaker')speakers++}
  return {cost:Math.round(cost),upkeep:Math.round(cost*.008*10)/10,party:Math.min(100,Math.round(party)),beauty:Math.min(100,Math.round(beauty)),power:Math.round(power*10)/10,speakers}
}
export function stageDesignIssue(d:StageDesign):string|null {
  if(!d || typeof d.name!=='string'||d.name.length>60||typeof d.linked!=='boolean'||!Array.isArray(d.parts)||d.parts.length>96) return 'Name und höchstens 96 Elemente wählen'
  if(![d.tileWidth??1,d.tileDepth??1].every(n=>Number.isInteger(n)&&n>=1&&n<=8))return 'Kartengrundfläche zwischen 1 und 8 Feldern wählen'
  const grid=stageDetailSize(d.tileWidth,d.tileDepth)
  if(d.width!==grid.width||d.depth!==grid.depth)return 'Bühnenraster muss zur Kartengrundfläche passen'
  const audience=d.audience??[],aw=d.tileWidth??1,ad=d.tileDepth??1
  if(!Array.isArray(audience)||audience.length>=aw*ad||audience.some(c=>!c||![c.x,c.z].every(Number.isInteger)||c.x<0||c.z<0||c.x>=aw||c.z>=ad))return 'Zuschauerfläche muss im Bühnenareal liegen; mindestens ein Technikfeld bleibt frei'
  const audienceKeys=new Set(audience.map(c=>`${c.x},${c.z}`))
  if(audienceKeys.size!==audience.length)return 'Zuschauerfelder dürfen nicht doppelt vorkommen'
  const reachable=new Set<string>(),queue=audience.filter(c=>c.x===0||c.z===0||c.x===aw-1||c.z===ad-1)
  for(let i=0;i<queue.length;i++){const c=queue[i]!,key=`${c.x},${c.z}`;if(reachable.has(key))continue;reachable.add(key);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:c.x+dx!,z:c.z+dz!};if(audienceKeys.has(`${n.x},${n.z}`)&&!reachable.has(`${n.x},${n.z}`))queue.push(n)}}
  if(reachable.size!==audience.length)return 'Jede Zuschauerfläche braucht einen durchgehenden Zugang zum äußeren Rand'
  const ids=new Set<string>()
  for(const p of d.parts){
    if(!p||typeof p.id!=='string'||p.id.length>80||ids.has(p.id)||!Object.hasOwn(COMPONENTS,p.kind)||!Object.hasOwn(brandsFor(p.kind),p.brand)||![p.x,p.z,p.rotation].every(Number.isInteger)||p.x<0||p.x>=d.width||p.z<0||p.z>=d.depth||p.rotation<0||p.rotation>3||!/^#[0-9a-f]{6}$/i.test(p.color)||(p.mountFace!==undefined&&!MOUNT_FACES.includes(p.mountFace)))return 'Ungültiges Bühnenelement'
    ids.add(p.id)
    if(p.stackOn){
      const stackable=p.kind==='speaker'||p.kind==='truss'
      if(!stackable||p.mount)return 'Nur Lautsprecher oder Traversensegmente können gestapelt werden'
      const maxLevel=p.kind==='truss'?8:3
      const seen=new Set([p.id]);let support=d.parts.find(q=>q?.id===p.stackOn),level=0
      while(support){if(seen.has(support.id)||support.kind!==p.kind||support.mount||support.x!==p.x||support.z!==p.z||++level>maxLevel)return p.kind==='truss'?'Traversentürme unterstützen höchstens neun Segmente':'Lautsprecher benötigen einen stabilen Stapel mit höchstens vier Boxen';seen.add(support.id);if(!support.stackOn)break;support=d.parts.find(q=>q?.id===support!.stackOn)}
      if(!support)return p.kind==='truss'?'Unteres Traversensegment fehlt':'Unterer Lautsprecher fehlt'
      if(d.parts.some(q=>q!==p&&q.stackOn===p.stackOn))return p.kind==='truss'?'An diesem Segment ist bereits etwas befestigt':'Auf dieser Box steht bereits ein Lautsprecher'
    }
    if(p.kind==='speaker'&&partHeight(d,p)+.8>2.75&&d.parts.some(q=>q.mount&&q.x===p.x&&q.z===p.z))return 'Lautsprecherstapel stößt an hängende Technik'
    if(!p.mount&&partOnAudience(d,p))return 'Zuschauerflächen bleiben frei von Bodenaufbauten'
    if(p.mount!==null){const truss=d.parts.find(t=>t?.id===p.mount&&isTruss(t.kind)&&t.mount===null);if(!truss||UNMOUNTABLE_KINDS.includes(p.kind)||p.x!==truss.x||p.z!==truss.z)return 'Hängende Elemente brauchen eine passende Traverse direkt darüber'}
    if(d.parts.some(q=>q!==p&&q.x===p.x&&q.z===p.z&&q.mount===p.mount&&(q.stackOn??null)===(p.stackOn??null)&&(q.mountFace??'under')===(p.mountFace??'under')))return 'Dieser Montageplatz ist bereits belegt'
  }
  if(!Array.isArray(d.phases)||d.phases.length!==3||d.phases.some(p=>!p||![p.intensity,p.speed,p.fog,p.volume,p.movement??0,p.pyro??0].every(n=>Number.isFinite(n)&&n>=0&&n<=100)||!/^#[0-9a-f]{6}$/i.test(p.color)))return 'Ungültige Showregler'
  return null
}
export function stagePhase(d:StageDesign,progress:number):ShowPhase {return d.phases[d.linked?0:progress<.2?0:progress<.8?1:2]}

export function stageSize(d:StageDesign|undefined,rotation=0){
  const width=d?.tileWidth??1,depth=d?.tileDepth??1
  return rotation%2 ? {width:depth,depth:width} : {width,depth}
}
export function occupiesBuildingCell(b:{x:number;z:number;rotation:number;stageDesign?:StageDesign},x:number,z:number){
  const size=stageSize(b.stageDesign,b.rotation)
  return x>=b.x&&x<b.x+size.width&&z>=b.z&&z<b.z+size.depth
}
export function buildingFootprint(b:{x:number;z:number;rotation:number;stageDesign?:StageDesign}){
  const size=stageSize(b.stageDesign,b.rotation),cells:Array<{x:number;z:number}>=[]
  for(let z=b.z;z<b.z+size.depth;z++)for(let x=b.x;x<b.x+size.width;x++)cells.push({x,z})
  return cells
}

export function stageDistance(b:{x:number;z:number;rotation:number;stageDesign?:StageDesign},p:{x:number;z:number}){
  const size=stageSize(b.stageDesign,b.rotation)
  return Math.hypot(Math.max(b.x-p.x,0,p.x-(b.x+size.width-1)),Math.max(b.z-p.z,0,p.z-(b.z+size.depth-1)))
}

export function partOnAudience(d:StageDesign,p:{x:number;z:number}):boolean {
  const x=Math.floor((p.x+.5)*(d.tileWidth??1)/d.width),z=Math.floor((p.z+.5)*(d.tileDepth??1)/d.depth)
  return !!d.audience?.some(c=>c.x===x&&c.z===z)
}
export function partHeight(d:StageDesign,p:StagePart):number {
  if(p.mount){const truss=d.parts.find(q=>q.id===p.mount);return truss?partHeight(d,truss):2.8}
  let height=.3,parent=p.stackOn,count=0
  while(parent&&count++<10){const support=d.parts.find(q=>q.id===parent);if(!support)break;height+=support.kind==='truss'?(support.orientation==='vertical'?3:.3):.8;parent=support.stackOn}
  return height
}
export function stageAudienceCells(b:{x:number;z:number;rotation:number;stageDesign?:StageDesign}){
  const d=b.stageDesign;if(!d)return []
  const w=d.tileWidth??1,h=d.tileDepth??1
  return (d.audience??[]).map(c=>{
    const local=b.rotation===1?{x:c.z,z:w-1-c.x}:b.rotation===2?{x:w-1-c.x,z:h-1-c.z}:b.rotation===3?{x:h-1-c.z,z:c.x}:c
    return {x:b.x+local.x,z:b.z+local.z}
  })
}
export function isStageAudienceCell(b:{x:number;z:number;rotation:number;stageDesign?:StageDesign},x:number,z:number){return stageAudienceCells(b).some(c=>c.x===x&&c.z===z)}
export function removeStagePart(d:StageDesign,id:string):StageDesign {
  const next=structuredClone(d),removed=new Set([id]);let added=true
  while(added){added=false;for(const p of next.parts)if(!removed.has(p.id)&&((p.mount&&removed.has(p.mount))||(p.stackOn&&removed.has(p.stackOn)))){removed.add(p.id);added=true}}
  next.parts=next.parts.filter(p=>!removed.has(p.id));return next
}

export function isTruss(kind:string){return kind==='truss'}
export function stageMotion(phase:ShowPhase,time:number){return (phase.movement??0)/100*.9*(1+Math.sin(time*(.2+phase.speed/80)))}
export function mountOffset(truss:StagePart,face:MountFace|undefined):{dx:number;dy:number;dz:number}{
  const vertical=truss.orientation==='vertical',f=face??'under'
  if(f==='end')return vertical?{dx:0,dy:1.6,dz:0}:{dx:.55,dy:0,dz:0}
  if(vertical){
    if(f==='under')return{dx:-.3,dy:.9,dz:0}
    if(f==='over')return{dx:.3,dy:.9,dz:0}
    if(f==='sideA')return{dx:0,dy:.9,dz:-.3}
    return{dx:0,dy:.9,dz:.3}
  }
  if(f==='under')return{dx:0,dy:-.35,dz:0}
  if(f==='over')return{dx:0,dy:.35,dz:0}
  if(f==='sideA')return{dx:0,dy:0,dz:-.3}
  return{dx:0,dy:0,dz:.3}
}
export function mountDirection(truss:StagePart|undefined,face:MountFace|undefined):{x:number;y:number;z:number}{
  if(!truss)return{x:0,y:1,z:0}
  const vertical=truss.orientation==='vertical',f=face??'under'
  if(f==='end')return vertical?{x:0,y:1,z:0}:{x:1,y:0,z:0}
  if(vertical){
    if(f==='under')return{x:-1,y:0,z:0}
    if(f==='over')return{x:1,y:0,z:0}
    if(f==='sideA')return{x:0,y:0,z:-1}
    return{x:0,y:0,z:1}
  }
  if(f==='under')return{x:0,y:-1,z:0}
  if(f==='over')return{x:0,y:1,z:0}
  if(f==='sideA')return{x:0,y:0,z:-1}
  return{x:0,y:0,z:1}
}
