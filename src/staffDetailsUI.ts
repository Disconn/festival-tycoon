import type { GameState, GameSnapshot } from './game/GameState'
import { STAFF_DEFINITIONS } from './game/staff'
import type { WorldView } from './view/WorldView'

export function mountStaffDetails(getGame:()=>GameState, view:WorldView, toast:(message:string,error?:boolean)=>void, release:()=>void) {
  let selected:string|null=null, following=false, drawing=false
  const panel=document.createElement('aside');panel.className='panel staff-details';panel.hidden=true
  panel.innerHTML='<header><strong data-name>Personal</strong><button data-close aria-label="Personalinfo schließen">×</button></header><p data-state></p><p data-load></p><p data-area></p><button data-follow>Folgen</button><button data-area-draw>Arbeitsbereich ziehen</button><button data-area-clear>Gesamtes Gelände</button>'
  document.querySelector('.game-shell')!.append(panel)
  const cancel=()=>{if(drawing)view.setGroundAreaTool(null);drawing=false}
  const open=(id:string)=>{cancel();document.querySelectorAll('#staff-panel, #visitor-panel, #entity-panel').forEach(p=>p.classList.remove('visible'));view.followVisitor(null);selected=id;if(following)view.followStaff(id);panel.hidden=false;update(getGame().snapshot)}
  view.setStaffClickHandler(open)
  const action=(from:{x:number;z:number}|null,to:{x:number;z:number}|null)=>{if(!selected)return;const result=getGame().manageFestival({type:'staffArea',staffId:selected,from,to});toast(result.message,!result.ok);update(getGame().snapshot)}
  panel.querySelector('[data-close]')!.addEventListener('click',()=>{cancel();selected=null;panel.hidden=true;following=false;view.followStaff(null);view.showStaffArea(null)})
  panel.querySelector('[data-follow]')!.addEventListener('click',()=>{following=!following;view.followStaff(following?selected:null);update(getGame().snapshot)})
  panel.querySelector('[data-area-clear]')!.addEventListener('click',()=>{cancel();action(null,null)})
  panel.querySelector('[data-area-draw]')!.addEventListener('click',()=>{
    release();getGame().setTool('inspect');drawing=true
    view.setGroundAreaTool((from,to,preview)=>{
      panel.querySelector('[data-area]')!.textContent=`Bereich: ${from.x}, ${from.z} bis ${to.x}, ${to.z}`
      if(!preview){cancel();action(from,to)}
    })
  })
  document.querySelector('.build-menu')!.addEventListener('click',cancel,true)
  function update(s:Readonly<GameSnapshot>) {
    if(!selected)return
    const carrier=s.festival.infrastructure.routes.find(r=>r.id===selected)
    const member=s.staff.find(p=>p.id===selected) ?? (carrier ? {name:'Träger mit Handkarren',role:null,state:'carrying' as const,cellX:carrier.position.x,cellZ:carrier.position.z,carryingWaste:0,workArea:carrier.workArea} : null)
    if(!member){cancel();panel.hidden=true;selected=null;view.followStaff(null);view.showStaffArea(null);return}
    view.showStaffArea(member.workArea??null)
    panel.querySelector('[data-name]')!.textContent=`${member.role ? STAFF_DEFINITIONS[member.role].icon : '📦'} ${member.name}`
    panel.querySelector('[data-state]')!.textContent=`${{patrolling:'Kontrollgang',responding:'Auf dem Weg zum Einsatz',working:'Arbeitet',carrying:'Transportiert',stationed:'An Sicherheitskontrolle'}[member.state]} · Feld ${member.cellX}, ${member.cellZ}`
    panel.querySelector('[data-load]')!.textContent=carrier ? `${carrier.status} · Ladung ${carrier.cargo}` : `Müllladung: ${member.carryingWaste} · Lohn ${STAFF_DEFINITIONS[member.role!].hourlyWage} €/h`
    if(!drawing)panel.querySelector('[data-area]')!.textContent=member.workArea?`Arbeitsbereich: ${member.workArea.minX}, ${member.workArea.minZ} bis ${member.workArea.maxX}, ${member.workArea.maxZ}`:'Arbeitsbereich: gesamtes Gelände'
    panel.querySelector('[data-follow]')!.textContent=following?'Verfolgen beenden':'Folgen'
  }
  return {update,open}
}
