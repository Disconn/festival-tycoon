import type { GameState, GameSnapshot } from './game/GameState'
import { STAFF_DEFINITIONS } from './game/staff'
import { zoneKey } from './game/staffZones'
import type { WorldView } from './view/WorldView'
import { makeDraggable, makeResizable } from './dragPanel'

export function mountStaffDetails(getGame:()=>GameState, view:WorldView, toast:(message:string,error?:boolean)=>void, release:()=>void) {
  let selected:string|null=null, following=false, drawing=false, zoneEditing=false, grabbing=false
  const panel=document.createElement('aside');panel.className='panel staff-details';panel.hidden=true
  panel.innerHTML='<div class="panel-header"><span class="panel-drag-line" aria-hidden="true"></span><h2 class="panel-header-title" data-name>Personal</h2><span class="panel-drag-line" aria-hidden="true"></span><button data-close class="panel-close-button" aria-label="Personalinfo schließen">×</button></div><div class="staff-minimap-row"><div class="staff-minimap"><canvas data-minimap></canvas></div><div class="staff-minimap-controls"><button data-zoom-in aria-label="Ansicht vergrößern">+</button><button data-zoom-out aria-label="Ansicht verkleinern">−</button><button data-grab aria-label="Personal greifen und platzieren">✋</button></div></div><p data-state></p><p data-load></p><p data-area></p><p data-zones hidden></p><button data-follow>Folgen</button><button data-manage-zones>Bereiche verwalten</button><button data-area-draw>Arbeitsbereich ziehen</button><button data-area-clear>Gesamtes Gelände</button><button data-fire-member>Entlassen</button>'
  document.querySelector('.game-shell')!.append(panel)
  view.mountMinimap(panel.querySelector<HTMLCanvasElement>('[data-minimap]')!)
  makeDraggable(panel.querySelector<HTMLElement>('.panel-header')!, panel)
  makeResizable(panel)
  panel.querySelector('[data-zoom-in]')!.addEventListener('click',()=>view.zoomMinimap(0.8))
  panel.querySelector('[data-zoom-out]')!.addEventListener('click',()=>view.zoomMinimap(1.25))
  const cancel=()=>{
    if(drawing||zoneEditing)view.setGroundAreaTool(null)
    if(zoneEditing)view.showStaffZones(null)
    if(grabbing)view.setStaffPlacementTool(null)
    drawing=false;zoneEditing=false;grabbing=false
  }
  const positionBesideStaffPanel=()=>{
    const staffPanelEl=document.querySelector<HTMLElement>('#staff-panel')
    if(!staffPanelEl || !staffPanelEl.classList.contains('visible'))return
    const staffRect=staffPanelEl.getBoundingClientRect()
    const width=panel.offsetWidth || 265
    const gap=8
    panel.style.right='auto'
    panel.style.bottom='auto'
    panel.style.transform='none'
    panel.style.left=`${Math.max(4,staffRect.left-width-gap)}px`
    panel.style.top=`${staffRect.top}px`
  }
  const open=(id:string)=>{
    cancel();document.querySelectorAll('#visitor-panel, #entity-panel').forEach(p=>p.classList.remove('visible'));view.followVisitor(null);selected=id;view.setMinimapTarget(id);if(following)view.followStaff(id)
    const wasHidden=panel.hidden
    panel.hidden=false
    if(wasHidden)positionBesideStaffPanel()
    update(getGame().snapshot)
  }
  view.setStaffClickHandler(open)
  const action=(from:{x:number;z:number}|null,to:{x:number;z:number}|null)=>{if(!selected)return;const result=getGame().manageFestival({type:'staffArea',staffId:selected,from,to});toast(result.message,!result.ok);update(getGame().snapshot)}
  panel.querySelector('[data-close]')!.addEventListener('click',()=>{cancel();selected=null;view.setMinimapTarget(null);panel.hidden=true;following=false;view.followStaff(null);view.showStaffArea(null)})
  panel.querySelector('[data-follow]')!.addEventListener('click',()=>{following=!following;view.followStaff(following?selected:null);update(getGame().snapshot)})
  panel.querySelector('[data-manage-zones]')!.addEventListener('click',()=>{
    if(zoneEditing){cancel();update(getGame().snapshot);return}
    cancel()
    const staffId=selected
    if(!staffId)return
    release();getGame().setTool('inspect');zoneEditing=true
    view.showStaffZones(getGame().snapshot.staff.find(p=>p.id===staffId)?.workZones ?? [])
    view.setGroundAreaTool((_from,to,preview)=>{
      if(preview)return
      const result=getGame().toggleStaffZone(staffId,zoneKey(to.x,to.z))
      toast(result.message,!result.ok)
      if(result.ok)view.showStaffZones(getGame().snapshot.staff.find(p=>p.id===staffId)?.workZones ?? [])
      update(getGame().snapshot)
    })
    update(getGame().snapshot)
  })
  panel.querySelector('[data-grab]')!.addEventListener('click',()=>{
    if(grabbing){cancel();update(getGame().snapshot);return}
    cancel()
    const staffId=selected
    const member=staffId?getGame().snapshot.staff.find(p=>p.id===staffId):undefined
    if(!staffId||!member)return
    release();getGame().setTool('inspect');grabbing=true
    view.setStaffPlacementTool((cell)=>{
      const result=getGame().placeStaffAt(staffId,cell.x,cell.z)
      toast(result.message,!result.ok)
      if(result.ok){grabbing=false;view.setStaffPlacementTool(null)}
      update(getGame().snapshot)
    },STAFF_DEFINITIONS[member.role].color)
    update(getGame().snapshot)
  })
  panel.querySelector('[data-fire-member]')!.addEventListener('click',()=>{
    if(!selected)return
    const result=getGame().fireStaffMember(selected)
    toast(result.message,!result.ok)
    update(getGame().snapshot)
  })
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
    if(!member){cancel();panel.hidden=true;selected=null;view.followStaff(null);view.setMinimapTarget(null);view.showStaffArea(null);return}
    const isStaff=!!member.role
    view.showStaffArea(isStaff?null:member.workArea??null)
    panel.querySelector('[data-name]')!.textContent=`${member.role ? STAFF_DEFINITIONS[member.role].icon : '📦'} ${member.name}`
    panel.querySelector('[data-state]')!.textContent=`${{patrolling:'Kontrollgang',responding:'Auf dem Weg zum Einsatz',working:'Arbeitet',carrying:'Transportiert',stationed:'An Sicherheitskontrolle'}[member.state]} · Feld ${member.cellX}, ${member.cellZ}`
    panel.querySelector('[data-load]')!.textContent=carrier ? `${carrier.status} · Ladung ${carrier.cargo}` : `Müllladung: ${member.carryingWaste} · Lohn ${STAFF_DEFINITIONS[member.role!].hourlyWage} €/h`
    panel.querySelector<HTMLElement>('[data-area]')!.hidden=isStaff
    panel.querySelector<HTMLElement>('[data-area-draw]')!.hidden=isStaff
    panel.querySelector<HTMLElement>('[data-area-clear]')!.hidden=isStaff
    panel.querySelector<HTMLElement>('[data-zones]')!.hidden=!isStaff
    panel.querySelector<HTMLElement>('[data-manage-zones]')!.hidden=!isStaff
    panel.querySelector<HTMLElement>('[data-grab]')!.hidden=!isStaff
    panel.querySelector<HTMLElement>('[data-fire-member]')!.hidden=!isStaff
    if(isStaff){
      const zoneCount=('workZones' in member ? member.workZones?.length : 0)??0
      panel.querySelector('[data-zones]')!.textContent=zoneCount?`Bereiche: ${zoneCount} zugewiesen`:'Kein Bereich zugewiesen'
      panel.querySelector('[data-manage-zones]')!.textContent=zoneEditing?'Fertig':'Bereiche verwalten'
      panel.querySelector('[data-grab]')!.setAttribute('aria-pressed',String(grabbing))
    } else if(!drawing)panel.querySelector('[data-area]')!.textContent=member.workArea?`Arbeitsbereich: ${member.workArea.minX}, ${member.workArea.minZ} bis ${member.workArea.maxX}, ${member.workArea.maxZ}`:'Arbeitsbereich: gesamtes Gelände'
    panel.querySelector('[data-follow]')!.textContent=following?'Verfolgen beenden':'Folgen'
  }
  return {update,open}
}
