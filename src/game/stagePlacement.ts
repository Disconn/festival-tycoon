import { isTruss, type StageDesign, type StagePart } from './stageDesign'
export function stagePlacement(d:StageDesign,settings:Pick<StagePart,'kind'|'brand'|'rotation'|'color'>,point:{x:number;z:number},hitId?:string,forceFloor=false):StagePart {
  let x=Math.floor(point.x),z=Math.floor(point.z),mount:string|null=null,stackOn:string|null=null
  const hit=forceFloor?undefined:d.parts.find(p=>p.id===hitId)
  if(hit&&isTruss(hit.kind)&&!['deck','truss','motorTruss','palm','fog','fireworks','sparks'].includes(settings.kind)){
    mount=hit.id
    if(hit.rotation%2){x=hit.x;z=Math.max(hit.z-1,Math.min(hit.z+1,z))}else{z=hit.z;x=Math.max(hit.x-1,Math.min(hit.x+1,x))}
  }else if(hit?.kind==='speaker'&&!hit.mount&&settings.kind==='speaker'){x=hit.x;z=hit.z;stackOn=hit.id;for(let n=0;n<4;n++){const above=d.parts.find(p=>p.stackOn===stackOn);if(!above)break;stackOn=above.id}}
  let id='placement-preview';while(d.parts.some(p=>p.id===id))id+='-'
  return {...settings,id,x,z,mount,stackOn}
}
