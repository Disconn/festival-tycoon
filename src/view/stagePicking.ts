import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import type { StageDesign } from '../game/stageDesign'
/** Kept outside the rendered scene so picking does not add draw calls. Every part is a uniform 1x1x1 cell, so one box shape serves all kinds. */
export function createStagePickTargets(d:StageDesign):Group {
  const root=new Group(),material=new MeshBasicMaterial()
  for(const p of d.parts){
    const mesh=new Mesh(new BoxGeometry(1,1,1),material)
    mesh.position.set(p.x-d.width/2+.5,p.y+.5,p.z-d.depth/2+.5)
    mesh.userData.partId=p.id
    root.add(mesh)
  }
  return root
}
