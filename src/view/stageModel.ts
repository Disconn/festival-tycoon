import { Group, Mesh, BoxGeometry, ConeGeometry, SphereGeometry, BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial, SpotLight, Vector3, Quaternion, DoubleSide, MeshStandardMaterial, MeshBasicMaterial, AdditiveBlending } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { isTruss, stageMotion, mountDirection, NEIGHBOR_STEPS, type StageDesign, type ShowPhase } from '../game/stageDesign'

const unitX=new Vector3(1,0,0)
/** For a truss's long axis, the two perpendicular unit vectors used to arrange its 3 chords. */
const CROSS_AXES = {
  x: [{x:0,y:1,z:0},{x:0,y:0,z:1}],
  y: [{x:1,y:0,z:0},{x:0,y:0,z:1}],
  z: [{x:1,y:0,z:0},{x:0,y:1,z:0}],
} as const
const ALONG_AXES = {x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}} as const
export function createStageModel(d:StageDesign,options:{floor?:boolean;partIds?:Set<string>;effects?:boolean;lightBudget?:number}={}):Group {
  const root=new Group(), buckets=new Map<string,BufferGeometry[]>(), effects:Group[]=[]
  let origin: {x:number;z:number;rotation:number}|undefined
  const rotateAround=(x:number,z:number)=>{
    if(!origin)return{x,z}
    const angle=origin.rotation*Math.PI/2,dx=x-origin.x,dz=z-origin.z
    return {x:origin.x+dx*Math.cos(angle)+dz*Math.sin(angle),z:origin.z-dx*Math.sin(angle)+dz*Math.cos(angle)}
  }
  const box=(x:number,y:number,z:number,w:number,h:number,depth:number,color:string)=>{
    const r=rotateAround(x,z);x=r.x;z=r.z
    if(origin&&origin.rotation%2)[w,depth]=[depth,w]
    const g=new BoxGeometry(w,h,depth);g.translate(x,y,z)
    const list=buckets.get(color)??[];list.push(g);buckets.set(color,list)
  }
  /** A thin box spanning two points; used for the diagonal lattice bracing of 3-point trusses. */
  const strut=(x1:number,y1:number,z1:number,x2:number,y2:number,z2:number,thickness:number,color:string)=>{
    const r1=rotateAround(x1,z1),r2=rotateAround(x2,z2)
    const dx=r2.x-r1.x,dy=y2-y1,dz=r2.z-r1.z,len=Math.hypot(dx,dy,dz)
    if(len<1e-4)return
    const g=new BoxGeometry(len,thickness,thickness)
    g.applyQuaternion(new Quaternion().setFromUnitVectors(unitX,new Vector3(dx,dy,dz).multiplyScalar(1/len)))
    g.translate((r1.x+r2.x)/2,(y1+y2)/2,(r1.z+r2.z)/2)
    const list=buckets.get(color)??[];list.push(g);buckets.set(color,list)
  }
  if(options.floor!==false){
    const w=d.tileWidth??1,h=d.tileDepth??1,cellWidth=d.width/w,cellDepth=d.depth/h
    for(let x=0;x<w;x++)for(let z=0;z<h;z++){
      const audience=d.audience?.some(c=>c.x===x&&c.z===z),cx=(x+.5)*cellWidth-d.width/2,cz=(z+.5)*cellDepth-d.depth/2
      box(cx,audience?.012:.12,cz,cellWidth,audience?.024:.24,cellDepth,audience?'#75886a':'#30394c')
      if(audience)continue
      for(let dx=0;dx<d.width;dx++)for(let dz=0;dz<d.depth;dz++){
        const left=Math.max(x*cellWidth,dx+.03),right=Math.min((x+1)*cellWidth,dx+.97),top=Math.max(z*cellDepth,dz+.03),bottom=Math.min((z+1)*cellDepth,dz+.97)
        if(right>left&&bottom>top)box((left+right)/2-d.width/2,.26,(top+bottom)/2-d.depth/2,right-left,.04,bottom-top,(dx+dz)%2?'#485166':'#515b70')
      }
    }
  }
  let lights=0
  const effect=(kind:string,x:number,y:number,z:number,color:string,dir:{x:number;y:number;z:number})=>{
    if(options.effects===false||effects.length>=32)return
    const rig=new Group();rig.position.set(x,y,z);rig.userData.kind=kind;rig.userData.index=effects.length;rig.userData.dir=dir;rig.userData.base=rig.position.clone();rig.userData.length=kind==='laser'?Math.max(4,d.depth*.8):4
    if(kind==='fireworks'||kind==='sparks'){
      const points:number[]=[]
      for(let n=0;n<40;n++){const angle=n*2.399963, height=(n+.5)/40, radius=Math.sqrt(1-height*height);points.push(radius*Math.cos(angle),height,radius*Math.sin(angle),radius*Math.cos(angle)*.87,height*.87,radius*Math.sin(angle)*.87)}
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points,3));rig.add(new LineSegments(geometry,new LineBasicMaterial({color,transparent:true,blending:AdditiveBlending,depthWrite:false})))
    }else if(kind==='fog'){
      for(let n=0;n<3;n++){
        const cloud=new Mesh(new SphereGeometry(1,10,5),new MeshBasicMaterial({color:'#c9d6dd',transparent:true,opacity:.04,depthWrite:false}))
        cloud.scale.set(Math.max(2,d.width*.42),.28+n*.07,Math.max(2,d.depth*.42));cloud.position.set(-x*.6+(n-1)*.3,.15+n*.18,-z*.6+(n-1)*.3);rig.add(cloud)
      }
    }else if(kind==='laser'){
      const points:number[]=[]
      for(let n=-5;n<=5;n++)points.push(0,0,0,n*.28,rig.userData.length,Math.abs(n)*.05)
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points,3))
      rig.add(new LineSegments(geometry,new LineBasicMaterial({color,transparent:true,opacity:.7,blending:AdditiveBlending,depthWrite:false})))
    }else{
      // The cone's apex is at the actual lens. +Y is the outgoing beam axis.
      const cone=new ConeGeometry(.85,4,16,1,true);cone.rotateZ(Math.PI);cone.translate(0,2,0)
      const beam=new Mesh(cone,new MeshBasicMaterial({color,transparent:true,opacity:.07,depthWrite:false,side:DoubleSide,blending:AdditiveBlending}));rig.add(beam)
      if(lights<(options.lightBudget??0)){
        const light=new SpotLight(color,0,40,Math.atan(.85/4),.45,1);light.castShadow=false;root.add(light,light.target);rig.userData.light=light;lights++
      }
    }
    root.add(rig);effects.push(rig)
  }
  for(const p of d.parts){
    if(options.partIds&&!options.partIds.has(p.id))continue
    const x=p.x-d.width/2+.5,y=p.y+.5,z=p.z-d.depth/2+.5,c=p.color
    const host=p.attachedTo?d.parts.find(t=>t.id===p.attachedTo):undefined
    if(isTruss(p.kind)){
      origin=undefined
      const axis=p.axis??'y',along=ALONG_AXES[axis],[ca,cb]=CROSS_AXES[axis]
      const pt=(t:number,a:number,b:number)=>({x:x+along.x*t+ca.x*a+cb.x*b,y:y+along.y*t+ca.y*a+cb.y*b,z:z+along.z*t+ca.z*a+cb.z*b})
      const chordColor='#b6c5cf',braceColor='#8a9aab',r=.13,half=.47
      const corners=[{a:0,b:r},{a:-r*.87,b:-r*.5},{a:r*.87,b:-r*.5}]
      for(const corner of corners){const p1=pt(-half,corner.a,corner.b),p2=pt(half,corner.a,corner.b);strut(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z,.045,chordColor)}
      const braces=3
      for(let i=0;i<braces;i++){
        const t0=-half+(i/braces)*(half*2),t1=-half+((i+1)/braces)*(half*2)
        const c0=corners[i%3]!,c1=corners[(i+1)%3]!
        const p1=pt(t0,c0.a,c0.b),p2=pt(t1,c1.a,c1.b)
        strut(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z,.035,braceColor)
      }
      for(const step of NEIGHBOR_STEPS){
        const neighbor=d.parts.some(t=>isTruss(t.kind)&&t.x===p.x+step.x&&t.y===p.y+step.y&&t.z===p.z+step.z)
        if(neighbor)box(x+step.x*.5,y+step.y*.5,z+step.z*.5,.26,.26,.26,braceColor)
      }
    }else{
      origin={x,z,rotation:p.rotation}
      const dir=mountDirection(p,host)
      if(p.kind==='speaker'){
        box(x,y+.4,z,.65,.8,.5,'#171d28');for(const yy of [.2,.55]){box(x,y+yy,z+.26,.43,.25,.04,'#414859');box(x,y+yy,z+.29,.18,.12,.02,c)}
      }else if(p.kind==='spot'||p.kind==='laser'){
        box(x,y+.15,z,.45,.3,.42,'#17202d');box(x,y+.33,z,.27,.08,.3,c);effect(p.kind,x,y+.38,z,c,dir)
      }else if(p.kind==='fireworks'||p.kind==='sparks'){
        box(x,y+.15,z,.65,.3,.65,'#303847');for(const dx of [-.18,.18])box(x+dx,y+.38,z,.13,.25,.13,c);effect(p.kind,x,y+.5,z,c,{x:0,y:1,z:0})
      }else if(p.kind==='fog'){
        box(x,y+.15,z,.6,.3,.4,'#727789');box(x,y+.18,z+.24,.2,.12,.1,c);effect('fog',x,y+.1,z,'#b9cbd6',{x:0,y:1,z:0})
      }else if(p.kind==='screen'||p.kind==='banner'){
        box(x,y+.6,z,.9,1.2,.1,'#141c29');for(let a=0;a<5;a++)for(let b=0;b<6;b++)box(x+(a-2)*.16,y+.15+b*.17,z+.07,.14,.14,.03,(a+b)%3?c:'#f3dfb0')
      }else if(p.kind==='star'){
        box(x,y+.4,z,.75,.22,.18,c);box(x,y+.4,z,.22,.8,.18,c);box(x,y+.4,z,.44,.44,.2,'#ffdd87')
      }else if(p.kind==='palm'){
        box(x,y+.6,z,.15,1.2,.15,'#9c7353');box(x,y+1.2,z,1,.15,.3,c);box(x,y+1.3,z,.3,.15,1,c)
      }else box(x,y+.12,z,.92,.24,.92,c)
    }
  }
  for(const [color,geometries] of buckets){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(merged){const mesh=new Mesh(merged,new MeshStandardMaterial({color,roughness:.85,flatShading:true}));mesh.receiveShadow=true;root.add(mesh)}}
  root.userData.effects=effects
  return root
}
const up=new Vector3(0,1,0)
export function animateStageModel(root:Group,phase:ShowPhase,time:number,active:boolean){
  const offset=active?stageMotion(phase,time):0
  for(const part of root.userData.moving??[])part.position.y=part.userData.restY-offset
  for(const rig of (root.userData.effects??[]) as Group[]){
    const pyro=['fireworks','sparks'].includes(rig.userData.kind)
    rig.position.copy(rig.userData.base);if(rig.userData.moving)rig.position.y-=offset
    const fog=rig.userData.kind==='fog',t=time*(.2+phase.speed/45)+rig.userData.index
    rig.userData.intensity=phase.intensity
    rig.visible=active&&(pyro?(phase.pyro??0)>0:fog?phase.fog>0:phase.intensity>0)
    if(pyro){
      const strength=(phase.pyro??0)/100,burst=rig.userData.kind==='fireworks',cycle=((time*(.3+strength*.4)+rig.userData.index*.37)%1+1)%1
      rig.visible=rig.visible&&(!burst||cycle<.72)
      const rays=rig.children[0] as LineSegments,mat=rays.material as LineBasicMaterial
      const spread=burst?.2+cycle*3: .35+strength*.6
      rays.scale.set(spread,burst?spread:1+strength*2,spread);rays.rotation.y=time*.25;rig.position.y+=burst?2+cycle*2:0;mat.color.set(phase.color);mat.opacity=burst?(1-cycle)*strength:strength*(.7+.3*Math.sin(time*17)**2)
    }else if(fog){
      rig.children.forEach((child,n)=>{const mesh=child as Mesh,mat=mesh.material as MeshBasicMaterial;mat.opacity=phase.fog/100*(.065+Math.sin(t*.25+n)*.015);mesh.position.y=.12+n*.18+Math.sin(t*.3+n)*.08;mesh.rotation.y=Math.sin(t*.1+n)*.12})
    }else{
      const base=(rig.userData.dir as {x:number;y:number;z:number}|undefined)??{x:0,y:1,z:0}
      const direction=new Vector3(base.x+Math.sin(t)*.15,base.y+Math.cos(t*.83)*.15,base.z+Math.cos(t*.7)*.15).normalize()
      rig.quaternion.setFromUnitVectors(up,direction)
      for(const child of rig.children){const mat=(child as Mesh).material as MeshBasicMaterial;mat.color.set(phase.color);mat.opacity=phase.intensity/100*(rig.userData.kind==='laser'?.8:.035+phase.fog*.001)}
    }
    const light=rig.userData.light as SpotLight|undefined
    if(light){light.position.copy(rig.position);light.target.position.copy(new Vector3(0,rig.userData.length,0).applyQuaternion(rig.quaternion).add(rig.position));light.color.set(phase.color);light.intensity=rig.visible?phase.intensity*1.8:0}
  }
}
/** A shared pool illuminates the whole map; beam meshes remain visible for every fixture. */
export function updateStageLightPool(models:Group[],pool:SpotLight[]){
  const candidates:Group[]=[]
  for(const root of models)for(const rig of (root.userData.effects??[]) as Group[]){if(rig.visible&&rig.userData.kind==='spot')candidates.push(rig)}
  pool.forEach((light,index)=>{
    const rig=candidates[Math.floor(index*candidates.length/pool.length)];if(!rig){light.intensity=0;return}
    const material=(rig.children[0] as Mesh).material as MeshBasicMaterial
    rig.getWorldPosition(light.position);light.target.position.copy(rig.localToWorld(new Vector3(0,rig.userData.length,0)));light.color.copy(material.color);light.intensity=45*rig.userData.intensity/100;light.distance=12
  })
}
export function disposeStageModel(root:Group){root.traverse(o=>{if(o instanceof Mesh||o instanceof LineSegments){o.geometry.dispose();const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(a=>a.dispose())}if(o instanceof SpotLight)o.dispose()})}
