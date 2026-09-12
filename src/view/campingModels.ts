import { BufferAttribute, BufferGeometry, Color, ConeGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, ShapeGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ModelKit } from './retroBuildings'

export const TENT_VARIANTS = 4
export const PAVILION_VARIANTS = 3
export const CAMP_COLORS = [0x547e85, 0xb86642, 0x6f8450, 0xc49b4b, 0x667f9f, 0x985869, 0xd2c3a0, 0x586b64]
export function campSeed(id: string): number {
  let hash = 2166136261
  for (let i=0;i<id.length;i++) hash=Math.imul(hash ^ id.charCodeAt(i),16777619)
  return hash >>> 0
}
// Keep existing entrance orientation, including the matching night lanterns.
export const campRotation = (id: string) => ((Number(id.replace(/\D/g,'').slice(-2)) || 0) % 4) * Math.PI / 2

type Parts = { fabric: BufferGeometry; details: BufferGeometry }
const cache = new Map<string, Parts>()
const steel=0xb7bfb5, seam=0xd8d2ae, ink=0x26383b
function colored(geometry: BufferGeometry, hex: number): BufferGeometry {
  geometry.deleteAttribute('uv')
  const color=new Color(hex), colors=new Float32Array(geometry.getAttribute('position').count*3)
  for(let i=0;i<colors.length;i+=3) color.toArray(colors,i)
  geometry.setAttribute('color',new BufferAttribute(colors,3))
  if (!geometry.index) return geometry
  const flat=geometry.toNonIndexed();geometry.dispose();return flat
}
function merge(parts: BufferGeometry[], tag: string): BufferGeometry {
  const flat=parts.map(g=>g.index?g.toNonIndexed():g)
  const result=mergeGeometries(flat)!
  for(const part of new Set([...parts,...flat])) part.dispose()
  result.userData={shared:true,campPart:tag}; result.computeBoundingSphere()
  return result
}
function shape(points: number[][]): Shape {
  const result=new Shape();points.forEach(([x,y],i)=>i?result.lineTo(x!,y!):result.moveTo(x!,y!));result.closePath();return result
}
function prism(points: number[][], depth: number): BufferGeometry {
  return colored(new ExtrudeGeometry(shape(points),{depth,bevelEnabled:false,steps:1,curveSegments:1}).translate(0,0,-depth/2),0xffffff)
}
export function campGeometry(kind: 'tent'|'pavilion', variant: number): Parts {
  variant=((variant % (kind==='tent'?TENT_VARIANTS:PAVILION_VARIANTS))+ (kind==='tent'?TENT_VARIANTS:PAVILION_VARIANTS)) % (kind==='tent'?TENT_VARIANTS:PAVILION_VARIANTS)
  const key=`${kind}:${variant}`, existing=cache.get(key);if(existing)return existing
  const fabric=new ModelKit(), detail=new ModelKit(), surfaces:BufferGeometry[]=[], extras:BufferGeometry[]=[]
  if(kind==='tent') {
    const depth=variant===2?.74:.62, height=variant===3?.58:variant===1?.49:.46
    const profile=variant===0?[[-.32,.035],[0,height],[.32,.035]]
      :variant===3?[[-.33,.035],[-.33,.3],[0,height],[.33,.3],[.33,.035]]
      :[[-.32,.035],[-.32,.18],[-.24,height-.08],[0,height],[.24,height-.08],[.32,.18],[.32,.035]]
    surfaces.push(prism(profile,depth))
    detail.box(0,.035,0,.69,.04,depth+.055,0x344b49)
    // Sewn edge binding and flexible poles, baked together rather than separate meshes.
    for(const z of [-depth/2-.009,depth/2+.009]) for(let i=0;i<profile.length-1;i++) {
      const a=profile[i]!,b=profile[i+1]!
      detail.beam([a[0]!,a[1]!,z],[b[0]!,b[1]!,z],.013,seam)
    }
    if(variant===2) for(const x of [-.24,.24]) detail.beam([x,height-.075,-depth/2],[x,height-.075,depth/2],.012,steel)
    const doorTop=height*.68, doorZ=depth/2+.012
    const door=colored(new ShapeGeometry(shape([[-.125,.058],[-.125,doorTop*.65],[0,doorTop],[.125,doorTop*.65],[.125,.058]])),ink)
    door.translate(0,0,doorZ);extras.push(door)
    detail.beam([0,.059,doorZ+.008],[0,doorTop,doorZ+.008],.009,0xcebf86)
    detail.beam([-.13,.073,doorZ+.018],[.13,.073,doorZ+.018],.025,seam)
    // Two high vents and four short guy ropes stay inside the allocated tile.
    for(const x of [-.13,.13]) detail.box(x,height*.66,-depth/2-.012,.065,.028,.012,0x354a49)
    for(const x of [-1,1]) for(const z of [-1,1]) {
      detail.beam([x*.28,.17,z*depth*.38],[x*.41,.023,z*.425],.007,0xc7bd91)
      detail.box(x*.41,.017,z*.425,.028,.027,.035,steel)
    }
    if(variant===3) {
      detail.box(-.338,.225,-.03,.014,.11,.18,ink)
      detail.box(-.347,.225,-.03,.01,.008,.18,seam)
    }
  } else {
    const eave=.65
    for(const x of [-.35,.35]) for(const z of [-.35,.35]) {
      detail.box(x,.325,z,.025,.65,.025,steel)
      detail.box(x,.018,z,.065,.035,.065,0x697472)
      detail.beam([x,.47,z],[x*.57,eave,z],.016,steel)
      detail.beam([x,.47,z],[x,eave,z*.57],.016,steel)
    }
    for(const z of [-.36,.36]) detail.beam([-.36,eave,z],[.36,eave,z],.018,steel)
    for(const x of [-.36,.36]) detail.beam([x,eave,-.36],[x,eave,.36],.018,steel)
    if(variant===2) surfaces.push(prism([[-.43,eave],[0,.9],[.43,eave]],.86))
    else {
      const roof=colored(new ConeGeometry(.61,.23,4).rotateY(Math.PI/4).translate(0,eave+.115,0),0xffffff)
      surfaces.push(roof)
      if(variant===1) surfaces.push(colored(new ConeGeometry(.28,.17,4).rotateY(Math.PI/4).translate(0,.925,0),0xffffff))
    }
    for(const z of [-.425,.425]) fabric.box(0,eave-.025,z,.86,.075,.015,0xffffff)
    for(const x of [-.425,.425]) fabric.box(x,eave-.025,0,.015,.075,.86,0xffffff)
    if(variant===1) {
      fabric.box(0,.42,-.36,.68,.37,.016,0xd2d9d4)
      detail.box(0,.45,-.348,.3,.16,.012,0x9aaeb0)
      detail.box(0,.45,-.337,.013,.16,.01,seam)
      detail.box(0,.45,-.337,.3,.013,.01,seam)
    }
    if(variant===2) {
      detail.box(0,.23,-.23,.42,.027,.2,0xb69769)
      for(const x of [-.16,.16]) detail.box(x,.115,-.23,.018,.23,.018,steel)
      detail.box(.24,.075,-.12,.15,.13,.16,0x537a86)
      detail.box(.24,.15,-.12,.16,.026,.17,0xe5debd)
    }
    for(let i=0;i<5;i++) {
      const x=(i-2)*.12, flag=colored(new ShapeGeometry(shape([[x-.035,.61],[x+.035,.61],[x,.53]])),i%2?0xe4ba65:0xd1d9c6)
      flag.translate(0,0,.438);extras.push(flag)
    }
  }
  if(kind==='pavilion')surfaces.push(fabric.finish())
  const parts={fabric:merge(surfaces,`${kind}-fabric`),details:merge([detail.finish(),...extras],`${kind}-details`)}
  cache.set(key,parts);return parts
}

/** Two cached meshes per prop, subsequently instanced by CampingView. */
export function createCampModel(kind:'tent'|'pavilion', id:string, color:number, decay=0): Group {
  const group=new Group(), variant=campSeed(id) % (kind==='tent'?TENT_VARIANTS:PAVILION_VARIANTS)
  const parts=campGeometry(kind,variant), wear=Math.max(0,Math.min(1,decay/100))
  const fabric=new Mesh(parts.fabric,new MeshStandardMaterial({color:new Color(color).lerp(new Color(0x6b5340),wear*.45),vertexColors:true,roughness:.95}))
  const detail=new Mesh(parts.details,new MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95}))
  group.add(fabric,detail);group.userData.campVariant=variant
  group.scale.setScalar(1-wear*.16);group.rotation.z=wear*.16
  return group
}
