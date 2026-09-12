import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Color, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { partOnAudience, type StageDesign } from '../game/stageDesign'
import { disposeObject3D } from './disposeObject3D'

type Role='singer'|'guitar'|'drums'|'keys'|'brass'
export function bandRoles(id:string):Role[]{
  if(['neon','orbit'].includes(id))return ['keys','keys']
  if(id==='brass')return ['singer','brass','brass','drums']
  if(id==='campfire')return ['singer','guitar','guitar']
  if(id==='velvet')return ['singer','keys','guitar','drums']
  return ['singer','guitar','guitar','drums']
}
export function bandPositions(d?:StageDesign){
  if(!d)return [{x:0,z:.15},{x:-.29,z:.05},{x:.29,z:.05},{x:0,z:-.16}]
  const cells:Array<{x:number;z:number}>=[]
  for(let z=d.depth-1;z>=0;z--)for(let x=0;x<d.width;x++){
    if(partOnAudience(d,{x,z})||!d.parts.some(p=>p.kind==='deck'&&p.attachedTo===null&&p.y===0&&p.x===x&&p.z===z))continue
    if(d.parts.some(p=>p.attachedTo===null&&p.y===0&&p.kind!=='deck'&&p.x===x&&p.z===z))continue
    cells.push({x:x-d.width/2+.5,z:z-d.depth/2+.5})
  }
  // Prefer central, forward positions and spread the players across placed stage decks.
  cells.sort((a,b)=>(Math.abs(a.x)*.35-a.z)-(Math.abs(b.x)*.35-b.z))
  const chosen:typeof cells=[]
  for(const cell of cells){if(chosen.every(p=>Math.hypot(p.x-cell.x,p.z-cell.z)>=1.5))chosen.push(cell);if(chosen.length===4)break}
  if(chosen.length<4)for(const cell of cells){if(!chosen.includes(cell))chosen.push(cell);if(chosen.length===4)break}
  return chosen
}
function musician(role:Role,index:number,bandId:string){
  const root=new Group(),buckets=new Map<string,BoxGeometry[]>()
  const colors=['#d96688','#63bcca','#dfb85a','#9774cd'],shirt=colors[(index+bandId.length)%4]!
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{const g=new BoxGeometry(w,h,d);g.translate(x,y,z);const list=buckets.get(color)??[];list.push(g);buckets.set(color,list)}
  box(0,.55,0,.32,.4,.19,shirt);box(0,.91,0,.26,.27,.24,index%2?'#b67b58':'#e4b38a');box(0,1.055,-.015,.28,.08,.25,'#30252c')
  for(const side of [-1,1]){box(side*.09,.18,0,.12,.36,.14,'#252e40');box(side*.09,.035,.045,.14,.07,.24,'#151b24');box(side*.06,.94,.124,.03,.03,.02,'#202733')}
  if(role==='guitar'){box(.03,.43,.19,.35,.3,.12,bandId==='campfire'?'#b98048':'#df6b50');box(.2,.65,.2,.09,.5,.07,'#b49c72');for(const x of [.18,.2,.22])box(x,.65,.24,.007,.47,.006,'#e4e3dc')}
  if(role==='singer'){box(.12,.43,.24,.025,.86,.025,'#89929e');box(.12,.87,.24,.1,.065,.065,'#17202c');box(.12,.02,.24,.24,.035,.18,'#252e40')}
  if(role==='keys'){box(0,.53,.3,.72,.13,.28,'#263348');for(let n=0;n<12;n++)box((n-5.5)*.052,.6,.33,.046,.025,.2,n%3?'#eee9de':'#202735');for(const x of [-.28,.28])box(x,.25,.3,.04,.5,.04,'#737f89')}
  if(role==='brass'){box(.15,.68,.24,.09,.08,.45,'#d6ad47');box(.15,.68,.49,.22,.22,.12,'#f2cf67');box(.15,.68,.56,.15,.15,.02,'#534623')}
  if(role==='drums'){box(0,.23,.44,.48,.44,.3,'#98595c');box(0,.23,.601,.4,.36,.025,'#e5dbcb');for(const x of [-.3,.3]){box(x,.5,.34,.24,.15,.24,'#b97165');box(x,.59,.34,.25,.03,.25,'#e6ddd0');box(x*1.45,.79,.22,.38,.025,.3,'#d7bc60');box(x*1.45,.4,.22,.025,.8,.025,'#839099')}}
  const body:BoxGeometry[]=[]
  for(const [color,geometries] of buckets){const tint=new Color(color);for(const geometry of geometries){const values:number[]=[];for(let n=0;n<geometry.getAttribute('position').count;n++)values.push(tint.r,tint.g,tint.b);geometry.setAttribute('color',new Float32BufferAttribute(values,3));body.push(geometry)}}
  root.add(new Mesh(mergeGeometries(body)!,new MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true})));body.forEach(g=>g.dispose())
  const arms:Group[]=[]
  for(const side of [-1,1]){const arm=new Group();arm.position.set(side*.22,.73,0);const limb=new Mesh(new BoxGeometry(.1,.32,.1),new MeshStandardMaterial({color:shirt}));limb.position.y=-.14;arm.add(limb);if(role==='drums'){const stick=new Mesh(new BoxGeometry(.025,.3,.025),new MeshStandardMaterial({color:'#dccb9b'}));stick.position.set(0,-.3,.05);arm.add(stick)}root.add(arm);arms.push(arm)}
  root.userData.arms=arms;root.userData.role=role;root.userData.index=index
  return root
}
/** Rebuilt only when the booking/band changes; no simulation entities or per-frame geometry. */
export function updateStageBand(stage:Group,bandId:string|undefined,time:number,active:boolean,design?:StageDesign){
  let band=stage.userData.band as Group|undefined
  if(!active){if(band)band.visible=false;return}
  const key=bandId??'meadow'
  if(!band||band.userData.bandId!==key){
    if(band){stage.remove(band);disposeObject3D(band)}
    band=new Group();band.userData.bandId=key
    const positions=bandPositions(design)
    bandRoles(key).forEach((role,i)=>{const pos=positions[i];if(!pos)return;const player=musician(role,i,key);player.position.set(pos.x,design?.54:.28,pos.z);player.scale.setScalar(design?.tileWidth? .78:design?.width? .95:.34);player.userData.baseY=design?.54:.28;band!.add(player)})
    stage.add(band);stage.userData.band=band
  }
  band.visible=true
  for(const player of band.children){const t=time*4+player.userData.index*.9,role=player.userData.role;player.position.y=player.userData.baseY+Math.abs(Math.sin(t))*.015;player.rotation.z=Math.sin(t*.5)*.035
    const arms=player.userData.arms as Group[];arms.forEach((arm,i)=>{arm.rotation.x=role==='drums'?-.8+Math.sin(t*2+i*Math.PI)*.6:role==='keys'?-.9+Math.sin(t*1.7+i)*.12:role==='guitar'?-.65+Math.sin(t*2+i)*.2:role==='brass'?-1.15:-.4+Math.sin(t+i)*.35})
  }
}
