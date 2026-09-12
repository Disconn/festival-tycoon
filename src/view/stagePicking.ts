import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import { isTruss, partHeight, mountOffset, type StageDesign } from '../game/stageDesign'
/** Kept outside the rendered scene so picking does not add draw calls. */
export function createStagePickTargets(d:StageDesign):Group {
  const root=new Group(),material=new MeshBasicMaterial()
  const add=(id:string,x:number,y:number,z:number,w:number,h:number,depth:number,rotation=0)=>{const mesh=new Mesh(new BoxGeometry(w,h,depth),material);mesh.position.set(x,y,z);mesh.rotation.y=rotation*Math.PI/2;mesh.userData.partId=id;root.add(mesh)}
  for(const p of d.parts){let x=p.x-d.width/2+.5,z=p.z-d.depth/2+.5,y=partHeight(d,p)
    if(isTruss(p.kind)){if(p.orientation==='vertical')add(p.id,x,y+1.5,z,.4,3,.4,p.rotation);else add(p.id,x,y+.1,z,1,.4,.4,p.rotation)}
    else{
      const truss=p.mount?d.parts.find(t=>t.id===p.mount):undefined
      if(truss){const off=mountOffset(truss,p.mountFace);x+=off.dx;y+=off.dy;z+=off.dz}
      const height=p.kind==='speaker'?.8:['screen','banner','palm'].includes(p.kind)?1.3:p.kind==='star'?.8:.4
      add(p.id,x,y+height/2,z,.85,height,.7,p.rotation)
    }
  }
  return root
}
