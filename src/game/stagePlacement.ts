import type { StageDesign, StagePart, Axis } from './stageDesign'
/**
 * Every placement is one of two things: docking against a specific neighbouring cell of an
 * existing part (`hit`), or dropping straight onto the ground plane. There is no other case —
 * side, top, end and corner attachments are all just "the adjacent cell in this direction".
 */
export function stagePlacement(d:StageDesign,settings:Pick<StagePart,'kind'|'brand'|'rotation'|'color'>,floorPoint:{x:number;z:number},hit?:{id:string;step:{x:number;y:number;z:number}}):StagePart {
  let x:number,y:number,z:number,attachedTo:string|null,axis:Axis|undefined
  if(hit){
    const host=d.parts.find(p=>p.id===hit.id)
    x=(host?.x??0)+hit.step.x;y=(host?.y??0)+hit.step.y;z=(host?.z??0)+hit.step.z;attachedTo=hit.id
    axis=settings.kind==='truss'?(hit.step.x!==0?'x':hit.step.y!==0?'y':'z'):undefined
  }else{
    x=Math.floor(floorPoint.x);y=0;z=Math.floor(floorPoint.z);attachedTo=null
    axis=settings.kind==='truss'?'y':undefined
  }
  let id='placement-preview';while(d.parts.some(p=>p.id===id))id+='-'
  return {...settings,id,x,y,z,attachedTo,axis}
}
