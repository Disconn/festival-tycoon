import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import { isTruss, partHeight, type StageDesign } from '../game/stageDesign'
/** Kept outside the rendered scene so picking does not add draw calls. */
export function createStagePickTargets(d:StageDesign):Group {
  const root=new Group(),material=new MeshBasicMaterial()
  const add=(id:string,x:number,y:number,z:number,w:number,h:number,depth:number,rotation=0)=>{const mesh=new Mesh(new BoxGeometry(w,h,depth),material);mesh.position.set(x,y,z);mesh.rotation.y=rotation*Math.PI/2;mesh.userData.partId=id;root.add(mesh)}
  for(const p of d.parts){const x=p.x-d.width/2+.5,z=p.z-d.depth/2+.5,y=partHeight(d,p)
    if(isTruss(p.kind)){add(p.id,x,2.95,z,2.2,.35,.35,p.rotation);for(const side of [-1,1])add(p.id,x+(p.rotation%2?0:side*.9),1.6,z+(p.rotation%2?side*.9:0),.16,2.7,.16)}
    else{const height=p.kind==='speaker'?.8:['screen','banner','palm'].includes(p.kind)?1.3:p.kind==='star'?.8:.4;add(p.id,x,y+height/2,z,.85,height,.7,p.rotation)}
  }
  root.userData.moving=[]
  for(const mesh of root.children){const p=d.parts.find(p=>p.id===mesh.userData.partId)!;if((p.kind==='motorTruss'&&mesh.position.y>2)||d.parts.some(t=>t.id===p.mount&&t.kind==='motorTruss')){mesh.userData.restY=mesh.position.y;root.userData.moving.push(mesh)}}
  return root
}
