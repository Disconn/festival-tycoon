import { isTruss, UNMOUNTABLE_KINDS, type StageDesign, type StagePart } from './stageDesign'
export function stagePlacement(d:StageDesign,settings:Pick<StagePart,'kind'|'brand'|'rotation'|'color'|'orientation'|'mountFace'>,point:{x:number;z:number},hitId?:string,forceFloor=false):StagePart {
  let x=Math.floor(point.x),z=Math.floor(point.z),mount:string|null=null,stackOn:string|null=null,mountFace:StagePart['mountFace']=undefined
  const hit=forceFloor?undefined:d.parts.find(p=>p.id===hitId)
  if(hit&&isTruss(hit.kind)&&!UNMOUNTABLE_KINDS.includes(settings.kind)){
    mount=hit.id;x=hit.x;z=hit.z;mountFace=settings.mountFace??'under'
  }else if(hit?.kind==='speaker'&&!hit.mount&&settings.kind==='speaker'){x=hit.x;z=hit.z;stackOn=hit.id;for(let n=0;n<4;n++){const above=d.parts.find(p=>p.stackOn===stackOn);if(!above)break;stackOn=above.id}}
  else if(hit&&hit.kind==='truss'&&settings.kind==='truss'){x=hit.x;z=hit.z;stackOn=hit.id;for(let n=0;n<8;n++){const above=d.parts.find(p=>p.stackOn===stackOn);if(!above)break;stackOn=above.id}}
  let id='placement-preview';while(d.parts.some(p=>p.id===id))id+='-'
  return {...settings,id,x,z,mount,stackOn,mountFace}
}
