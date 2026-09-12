import { updateStageBand } from './view/stageBand'
import { stagePlacement } from './game/stagePlacement'
import { createStagePickTargets } from './view/stagePicking'
import { BUILDINGS } from './game/catalog'
import { Scene, Color, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, GridHelper, Raycaster, Vector2, Plane, Vector3, Group, Mesh, BoxGeometry, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { COMPONENTS, brandsFor, isTruss, GROUND_ONLY_KINDS, PHASE_NAMES, defaultStageDesign, stageDesignIssue, stageDetailSize, stageStats, removeStagePart, type StageDesign, type StagePart, type ComponentKind } from './game/stageDesign'
import { createStageModel, animateStageModel, disposeStageModel } from './view/stageModel'
import type { GameState } from './game/GameState'
import { makeDraggable, makeResizable } from './dragPanel'
import { isTextEntryTarget } from './uiFocus'
import './stageEditor.css'
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
function stepLabel(step:{x:number;y:number;z:number}){
  if(step.y>0)return 'oben';if(step.y<0)return 'unten'
  if(step.x>0)return 'rechts';if(step.x<0)return 'links'
  return step.z>0?'davor':'dahinter'
}
export function mountStageEditor(getGame:()=>GameState,toast:(s:string,error?:boolean)=>void){
  const paletteEntries=(Object.entries(COMPONENTS) as [ComponentKind,typeof COMPONENTS[ComponentKind]][]).map(([kind,c])=>({id:kind,kind,label:c.name,icon:kind,cost:c.cost}))
  const panel=document.createElement('section');panel.className='stage-editor panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Bühnenwerkstatt')
  panel.innerHTML=`<header class="panel-header"><span class="panel-drag-line" aria-hidden="true"></span><h2 class="panel-header-title">Bühnenwerkstatt</h2><span class="panel-drag-line" aria-hidden="true"></span><button data-close class="panel-close-button" aria-label="Bühneneditor schließen">×</button></header>
  <div class="stage-layout"><aside><label>Name<input data-name maxlength="60"></label><hr class="stage-divider"><label>Gespeicherte Bühnen<select data-template><option value="">Neue Bühne</option></select></label><div class="stage-actions"><button data-save>Bühne speichern</button><button data-load>Laden</button><button data-new>Neu</button></div>
  <h3>Größe</h3><div class="stage-pair stage-triple"><label>Breite<input data-tiles-width type="number" min="1" max="8"></label><label>Tiefe<input data-tiles-depth type="number" min="1" max="8"></label><label>Höhe<input data-tiles-height type="number" min="1" max="8"></label></div><h3>Bauteile</h3><div class="stage-parts">${paletteEntries.map(({id,kind,label,icon,cost})=>`<div class="stage-component"><button data-part="${id}" aria-pressed="false" aria-expanded="false"><img class="stage-part-icon" src="/stage-icons/${icon}.png" alt=""><span>${label}<small data-part-brand="${id}">ab ${cost} € · Qualität ▾</small></span></button><div class="stage-quality panel" data-quality-menu="${id}" hidden>${Object.entries(brandsFor(kind)).map(([brand,info])=>`<button data-quality="${brand}" data-quality-part="${id}">${info.name}<small>${Math.round(cost*info.cost)} € · Wirkung ×${info.quality}</small></button>`).join('')}</div></div>`).join('')}</div><button data-audience aria-pressed="false">♟ Zuschauerfläche malen</button><small>Ganze Kartenfelder · vom Rand aus einen Zugang nach innen anlegen.</small><label>Bauteilfarbe<input data-color type="color" value="#e69759"></label><button data-erase aria-pressed="false">Entfernen</button><button data-undo>Rückgängig</button><p>Ein Klick wählt das Bauteil; im aufklappenden Menü kannst du die Qualität ändern. Traversen rasten in alle sechs Richtungen aneinander und an den Boden an; andere Bauteile hängen ebenso an Traversen — oben, unten, links, rechts, davor, dahinter. R / Rechtsklick dreht, Umschalt+R dreht zurück. Alt erzwingt Bodenmontage. Ziehen dreht die Kamera, Mausrad zoomt.</p></aside>
  <div class="stage-center"><div data-viewport><div class="stage-placement-tools"><button data-rotate="-1" aria-label="Bauteil nach links drehen">↶</button><button data-rotate="1" aria-label="Bauteil nach rechts drehen"><span data-angle>0°</span> ↷ · R</button><span>Auto-Montage · Alt: Boden</span></div></div><p data-hint aria-live="polite">Wähle ein Bauteil und klicke auf einen Rasterplatz.</p><div data-stats class="stage-stats"></div></div>
  <aside><h3>Showpult</h3><div class="stage-phases">${PHASE_NAMES.map((p,i)=>`<button data-phase="${i}" aria-pressed="${i===0}">${p}</button>`).join('')}</div><label class="stage-check"><input data-linked type="checkbox">Alle Phasen gleich</label>${[['intensity','Lichtintensität'],['speed','Bewegung / Tempo'],['movement','Traversenhub'],['pyro','Feuerwerk / Funken'],['fog','Nebel'],['volume','Lautstärke']].map(([id,name])=>`<label>${name}<output data-value="${id}"></output><input data-slider="${id}" type="range" min="0" max="100"></label>`).join('')}<label>Lichtfarbe<input data-show-color type="color"></label><label class="stage-check"><input data-band-preview type="checkbox" checked>Bandvorschau (Indie)</label><button data-preview>Vorschau pausieren</button><p>Warm-up: erste 20 % · Main: bis 80 % · Finale: letzte 20 % des Auftritts. Effekte laufen auf der Karte nur bei aktiver, versorgter Bühne.</p><p>Leistungsfähigere Marken steigern Party- und Dekowerte, kosten aber mehr. Hohe Lautstärke erhöht die Wirkung und belastet die ruhige Umgebung.</p></aside></div>
  <footer><span data-cost></span><button data-build>Für Bühnenbau verwenden</button><button data-apply>Bühne umbauen</button></footer>`
  document.querySelector('.game-shell')!.append(panel)
  makeDraggable(panel.querySelector<HTMLElement>('.panel-header')!, panel)
  makeResizable(panel)
  const templateKey='festival-stage-templates-v1'
  const library=():StageDesign[]=>{
    let local:StageDesign[]=[]
    try{const saved=JSON.parse(localStorage.getItem(templateKey)??'[]');if(Array.isArray(saved))local=saved.slice(0,30).filter(d=>!stageDesignIssue(d))}catch{ /* The current save remains usable if browser storage is unavailable. */ }
    const merged=new Map(local.map(d=>[d.name,d]));for(const d of getGame().snapshot.festival.stageTemplates??[])merged.set(d.name,d)
    return [...merged.values()]
  }
  const q=<T extends HTMLElement=HTMLElement>(s:string)=>panel.querySelector<T>(s)!
  let design=defaultStageDesign(),stageId:string|undefined,part:StagePart['kind']='truss',erase=false,phase=0,history:StageDesign[]=[],preview=true,elapsed=0,last=0,frame=0,serial=0
  let rotation=0,audienceMode=false,candidate:StagePart|null=null,candidateIssue:string|null=null,hitId:string|undefined,hitStep:{x:number;y:number;z:number}|undefined
  let audienceCell:{x:number;z:number}|null=null,ghost:Group|undefined,pickTargets:Group|undefined,ghostKey='',revision=0
  let pointer:{x:number;y:number;alt:boolean}|null=null
  const quality:Partial<Record<string,StagePart['brand']>>={}
  let framedSize=''
  let renderer:WebGLRenderer|undefined,controls:OrbitControls|undefined,scene:Scene,camera:PerspectiveCamera,model:Group|undefined
  const viewport=q('[data-viewport]'),hint=q('[data-hint]')
  const remember=()=>{history.push(structuredClone(design));if(history.length>40)history.shift()}
  const phaseIndex=()=>design.linked?0:phase
  function refresh(){
    q<HTMLInputElement>('[data-name]').value=design.name;q<HTMLInputElement>('[data-linked]').checked=design.linked
    q<HTMLInputElement>('[data-tiles-width]').value=String(design.tileWidth??1);q<HTMLInputElement>('[data-tiles-depth]').value=String(design.tileDepth??1);q<HTMLInputElement>('[data-tiles-height]').value=String(design.tileHeight??1)
    const p=design.phases[phaseIndex()]
    panel.querySelectorAll<HTMLInputElement>('[data-slider]').forEach(input=>{const key=input.dataset.slider as 'intensity';input.value=String(p[key]??0);q(`[data-value=${key}]`).textContent=`${p[key]??0} %`})
    q<HTMLInputElement>('[data-show-color]').value=p.color
    const stats=stageStats(design),base=stageId?getGame().snapshot.buildings.find(b=>b.id===stageId)?.stageDesign:undefined
    q('[data-stats]').innerHTML=`<span>Ausbau<b>${stats.cost} €</b></span><span>Unterhalt zusätzlich<b>${stats.upkeep} €/h</b></span><span>Party maximal<b>${stats.party}/100</b></span><span>Umgebung<b>${stats.beauty}/100</b></span><span>Technik zusätzlich<b>${stats.power} kW</b></span><span>Elemente<b>${design.parts.length}/96</b></span>`
    q('[data-cost]').textContent=stageId?`Umbau: ${Math.max(0,stats.cost-(base?stageStats(base).cost:0))} € · keine Erstattung beim Abbau`:`Neubau: ${BUILDINGS.stage.cost+stats.cost} € gesamt · Vorlage kostenlos`
    panel.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.phase)===phase)))
    panel.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===part&&!erase&&!audienceMode)))
    q('[data-audience]').setAttribute('aria-pressed',String(audienceMode));q('[data-angle]').textContent=`${rotation*90}°`
    q('[data-erase]').setAttribute('aria-pressed',String(erase));q<HTMLButtonElement>('[data-undo]').disabled=!history.length
  }
  function rebuild(){if(!scene)return;revision++;ghostKey='';if(pickTargets)disposeStageModel(pickTargets);if(model){scene.remove(model);disposeStageModel(model)}model=createStageModel(design,{lightBudget:6})
    const scale=(design.tileWidth??1)*4/design.width;model.scale.set(scale,(design.tileHeight??1)*4/design.height,(design.tileDepth??1)*4/design.depth);scene.add(model);pickTargets=createStagePickTargets(design);pickTargets.scale.copy(model.scale);pickTargets.updateMatrixWorld(true)
    const sizeKey=`${design.tileWidth??1}:${design.tileDepth??1}:${design.tileHeight??1}`
    if(framedSize!==sizeKey){framedSize=sizeKey;const extent=Math.max(design.tileWidth??1,design.tileDepth??1,design.tileHeight??1)*4, distance=Math.max(8,extent*1.15*Math.max(1,viewport.clientHeight/Math.max(1,viewport.clientWidth)));camera.position.set(distance,distance*.85,distance*1.15);controls!.target.set(0,design.height*model.scale.y/2,0)}
    refresh();if(pointer)updateHover(pointer)}
  function init(){
    renderer=new WebGLRenderer({antialias:false});renderer.setPixelRatio(.7);renderer.setClearColor(0x121b2b);viewport.append(renderer.domElement)
    scene=new Scene();scene.background=new Color('#121b2b');camera=new PerspectiveCamera(42,1,.1,300);camera.position.set(11,10,13)
    controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.minDistance=5;controls.maxDistance=140;controls.maxPolarAngle=Math.PI*.97;controls.enableDamping=true;controls.mouseButtons.RIGHT=null
    scene.add(new AmbientLight(0xffffff,1));const sun=new DirectionalLight(0xffeddb,1.8);sun.position.set(4,10,8);scene.add(sun);const grid=new GridHelper(40,40,0x718197,0x344456);grid.position.y=-.01;scene.add(grid)
    let down={x:0,y:0}
    const touchIds=new Set<number>();let cameraGesture=false
    renderer.domElement.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch')return
      touchIds.add(e.pointerId);if(touchIds.size===1)cameraGesture=false
      if(touchIds.size>1)cameraGesture=true
    })
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}})
    renderer.domElement.addEventListener('pointercancel',e=>{touchIds.delete(e.pointerId);cameraGesture=true})
    renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){if(ghost)ghost.visible=false;return}updateHover({x:e.clientX,y:e.clientY,alt:e.altKey})})
    renderer.domElement.addEventListener('pointerleave',()=>{pointer=null;if(ghost)ghost.visible=false})
    renderer.domElement.addEventListener('contextmenu',e=>{e.preventDefault();rotate(1)})
    renderer.domElement.addEventListener('pointerup',e=>{
      touchIds.delete(e.pointerId)
      if(e.pointerType==='touch'&&cameraGesture)return
      if(e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return
      updateHover({x:e.clientX,y:e.clientY,alt:e.altKey});hideQuality()
      if(audienceMode){
        if(!audienceCell)return
        const next=structuredClone(design),found=next.audience?.some(c=>c.x===audienceCell!.x&&c.z===audienceCell!.z)
        next.audience=found?(next.audience??[]).filter(c=>c.x!==audienceCell!.x||c.z!==audienceCell!.z):[...(next.audience??[]),{...audienceCell}]
        const issue=stageDesignIssue(next);if(issue){hint.textContent=issue;return}remember();design=next;rebuild();return
      }
      if(erase){if(!hitId){hint.textContent='Zum Entfernen direkt auf ein Bauteil zeigen.';return}remember();design=removeStagePart(design,hitId);rebuild();return}
      if(!candidate||candidateIssue){if(candidateIssue)hint.textContent=candidateIssue;return}
      while(design.parts.some(p=>p.id===`part-${serial+1}`))serial++
      remember();design.parts.push({...candidate,id:`part-${++serial}`});rebuild()
    })
  }
  function hideQuality(){panel.querySelectorAll<HTMLElement>('[data-quality-menu]').forEach(m=>m.hidden=true);panel.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-expanded','false'))}
  function rotate(step:number){rotation=(rotation+step+4)%4;refresh();if(pointer)updateHover(pointer)}
  function clearGhost(){if(ghost){scene.remove(ghost);disposeStageModel(ghost);ghost=undefined}}
  function updateHover(p:{x:number;y:number;alt:boolean}){
    if(!model||!renderer)return
    pointer=p
    const rect=renderer.domElement.getBoundingClientRect(),ray=new Raycaster();ray.setFromCamera(new Vector2((p.x-rect.left)/rect.width*2-1,-(p.y-rect.top)/rect.height*2+1),camera)
    const floor=ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),0),new Vector3())
    const hit=ray.intersectObjects(pickTargets?.children??[],false)[0];hitId=hit?.object.userData.partId
    const hitPart=design.parts.find(part=>part.id===hitId)
    const auto=!p.alt&&!audienceMode&&!erase&&(!!hitPart&&isTruss(hitPart.kind)&&!GROUND_ONLY_KINDS.includes(part))
    hitStep=undefined
    if(hit&&hitPart&&auto){
      const local=hit.object.worldToLocal(hit.point.clone())
      const ax=Math.abs(local.x),ay=Math.abs(local.y),az=Math.abs(local.z)
      hitStep=ax>=ay&&ax>=az?{x:Math.sign(local.x)||1,y:0,z:0}:ay>=az?{x:0,y:Math.sign(local.y)||1,z:0}:{x:0,y:0,z:Math.sign(local.z)||1}
    }
    const point=auto?hit!.point:floor
    if(!point){candidate=null;audienceCell=null;ghostKey='';clearGhost();return}
    const local={x:point.x/model.scale.x+design.width/2,z:point.z/model.scale.z+design.depth/2}
    if(local.x<0||local.x>=design.width||local.z<0||local.z>=design.depth){candidate=null;audienceCell=null;ghostKey='';clearGhost();return}
    audienceCell={x:Math.floor(local.x*(design.tileWidth??1)/design.width),z:Math.floor(local.z*(design.tileDepth??1)/design.depth)}
    candidate=stagePlacement(design,{kind:part,brand:quality[part]??'budget',rotation,color:q<HTMLInputElement>('[data-color]').value},local,auto&&hitId&&hitStep?{id:hitId,step:hitStep}:undefined)
    const next={...design,parts:[...design.parts,candidate]}
    candidateIssue=stageDesignIssue(next)
    if(audienceMode){const found=design.audience?.some(c=>c.x===audienceCell!.x&&c.z===audienceCell!.z);candidateIssue=stageDesignIssue({...design,audience:found?(design.audience??[]).filter(c=>c.x!==audienceCell!.x||c.z!==audienceCell!.z):[...(design.audience??[]),{...audienceCell}]})}
    const key=`${revision}:${audienceMode}:${erase}:${hitId}:${JSON.stringify(audienceCell)}:${JSON.stringify(candidate)}`
    if(key!==ghostKey){
      ghostKey=key;clearGhost()
      if(audienceMode){
        ghost=new Group();const w=design.width/(design.tileWidth??1),h=design.depth/(design.tileDepth??1)
        const mesh=new Mesh(new BoxGeometry(w,.05,h),new MeshBasicMaterial({color:candidateIssue?0xec706b:0x9be1a5,transparent:true,opacity:.6,depthWrite:false}));mesh.position.set((audienceCell.x+.5)*w-design.width/2,.32,(audienceCell.z+.5)*h-design.depth/2);ghost.add(mesh)
      }else if(erase&&hitPart){ghost=createStageModel(design,{floor:false,partIds:new Set([hitPart.id]),effects:false})}
      else if(!erase){ghost=createStageModel(next,{floor:false,partIds:new Set([candidate.id]),effects:false})}
      if(ghost){
        if(!audienceMode)ghost.traverse(o=>{if(o instanceof Mesh){const mat=o.material as MeshStandardMaterial;mat.color.set(erase||candidateIssue?'#ec706b':'#a3efd0');mat.transparent=true;mat.opacity=.48;mat.depthWrite=false}})
        ghost.scale.copy(model.scale);scene.add(ghost)
      }
    }
    if(ghost)ghost.visible=true
    const partLabel=COMPONENTS[part].name
    hint.textContent=audienceMode?candidateIssue??`Zuschauerfeld ${audienceCell.x+1}, ${audienceCell.z+1} umschalten · Zugang vom Rand freihalten`:erase?(hitPart?`${COMPONENTS[hitPart.kind].name} mit allen getragenen Anbauteilen entfernen`:'Auf ein Bauteil zeigen'):candidateIssue??`${partLabel} · ${candidate.attachedTo?`an Traverse andocken (${stepLabel(hitStep??{x:0,y:-1,z:0})})`:'auf dem Boden'} · ${candidate.rotation*90}° · R dreht`
  }
  function animate(now:number){if(panel.hidden)return;const dt=Math.min(.1,(now-last)/1000);last=now;if(preview)elapsed+=dt
    const w=viewport.clientWidth,h=viewport.clientHeight;if(renderer!.domElement.clientWidth!==w||renderer!.domElement.clientHeight!==h||renderer!.domElement.width!==Math.floor(w*.7)){renderer!.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix()}
    controls!.update();if(model){animateStageModel(model,design.phases[phaseIndex()],elapsed,true);updateStageBand(model,'meadow',elapsed,(q('[data-band-preview]') as HTMLInputElement).checked,design)
      const belowGround=camera.position.y<0;for(const m of (model.userData.floorMeshes as Mesh[]|undefined)??[])m.visible=!belowGround}if(ghost)animateStageModel(ghost,design.phases[phaseIndex()],elapsed,true);if(pickTargets){animateStageModel(pickTargets,design.phases[phaseIndex()],elapsed,true);pickTargets.updateMatrixWorld(true);}renderer!.render(scene,camera);frame=requestAnimationFrame(animate)
  }
  function syncOpenButton(){document.getElementById('open-stage-editor')?.setAttribute('aria-expanded',String(!panel.hidden))}
  function close(){panel.hidden=true;cancelAnimationFrame(frame);pointer=null;clearGhost();syncOpenButton()}
  panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close();if(isTextEntryTarget(e.target))return;if(e.key.toLowerCase()==='r'){e.preventDefault();rotate(e.shiftKey?-1:1)}})
  panel.addEventListener('click',e=>{
    const b=(e.target as Element).closest<HTMLButtonElement>('button');if(!b)return
    if(b.hasAttribute('data-close'))close()
    if(b.dataset.part){part=b.dataset.part as StagePart['kind'];erase=false;audienceMode=false;hideQuality();const menu=q(`[data-quality-menu=${part}]`),rect=b.getBoundingClientRect();menu.hidden=false;menu.style.left=`${Math.min(window.innerWidth-235,rect.right+8)}px`;menu.style.right='auto';menu.style.top=`${Math.max(10,Math.min(window.innerHeight-200,rect.top))}px`;b.setAttribute('aria-expanded','true');refresh();if(pointer)updateHover(pointer)}
    if(b.dataset.quality){const entryId=b.dataset.qualityPart! as StagePart['kind'];quality[entryId]=b.dataset.quality as StagePart['brand'];part=entryId;hideQuality();const brand=brandsFor(entryId)[quality[entryId]!];q(`[data-part-brand=${entryId}]`).textContent=`${Math.round(COMPONENTS[entryId].cost*brand.cost)} € · ${brand.name}`;refresh();if(pointer)updateHover(pointer)}
    if(b.dataset.rotate)rotate(Number(b.dataset.rotate))
    if(b.hasAttribute('data-audience')){audienceMode=!audienceMode;erase=false;hideQuality();refresh();if(pointer)updateHover(pointer)}
    if(b.hasAttribute('data-erase')){erase=!erase;audienceMode=false;hideQuality();refresh();if(pointer)updateHover(pointer)}
    if(b.hasAttribute('data-undo')&&history.length){design=history.pop()!;rebuild()}
    if(b.dataset.phase){phase=Number(b.dataset.phase);refresh()}
    if(b.hasAttribute('data-preview')){preview=!preview;b.textContent=preview?'Vorschau pausieren':'Vorschau abspielen'}
    if(b.hasAttribute('data-load')){remember();design=structuredClone(library().find(t=>t.name===q<HTMLSelectElement>('[data-template]').value)??defaultStageDesign());serial+=1000;while(design.parts.some(p=>p.id===`part-${serial+1}`))serial++;rebuild()}
    if(b.hasAttribute('data-new')){remember();design=defaultStageDesign();q<HTMLSelectElement>('[data-template]').value='';serial+=1000;while(design.parts.some(p=>p.id===`part-${serial+1}`))serial++;rebuild()}
    const save=b.hasAttribute('data-save'),build=b.hasAttribute('data-build'),apply=b.hasAttribute('data-apply')
    if(save||build||apply){
      design.name=q<HTMLInputElement>('[data-name]').value.trim()||'Meine Traumbühne'
      const result=getGame().manageFestival({type:'stageDesign',design:structuredClone(design),stageId:apply?stageId:undefined,saveTemplate:save||build,selectForBuild:build});toast(result.message,!result.ok)
      if(result.ok){
        if(save||build)try{const saved=library().filter(d=>d.name!==design.name);saved.push(structuredClone(design));localStorage.setItem(templateKey,JSON.stringify(saved.slice(-30)))}catch{hint.textContent='Vorlage im Spielstand gespeichert; lokaler Vorlagenspeicher nicht verfügbar.'}
        refreshTemplates();refresh();if(build){getGame().setTool('stage');close()}}
    }
  })
  function refreshTemplates(){q<HTMLSelectElement>('[data-template]').innerHTML='<option value="">Neue Bühne</option>'+library().map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('')}
  panel.addEventListener('change',e=>{
    const input=e.target as HTMLInputElement
    if(input.matches('[data-tiles-width],[data-tiles-depth],[data-tiles-height]')){const tileWidth=Number(q<HTMLInputElement>('[data-tiles-width]').value),tileDepth=Number(q<HTMLInputElement>('[data-tiles-depth]').value),tileHeight=Number(q<HTMLInputElement>('[data-tiles-height]').value);const next={...design,tileWidth,tileDepth,tileHeight,...stageDetailSize(tileWidth,tileDepth,tileHeight)};const issue=stageDesignIssue(next);if(issue){hint.textContent=issue;refresh();return}remember();design=next;rebuild()}
    if(input.matches('[data-linked]')){remember();design.linked=input.checked;refresh()}
  })
  panel.addEventListener('input',e=>{const input=e.target as HTMLInputElement;if(input.matches('[data-tiles-width],[data-tiles-depth],[data-tiles-height]')&&input.value!==''&&Number.isInteger(Number(input.value))&&Number(input.value)>=Number(input.min)&&Number(input.value)<=Number(input.max)){input.dispatchEvent(new Event('change',{bubbles:true}))}if(input.dataset.slider){const key=input.dataset.slider as 'intensity';design.phases[phaseIndex()][key]=Number(input.value);q(`[data-value=${key}]`).textContent=input.value+' %'}if(input.matches('[data-show-color]'))design.phases[phaseIndex()].color=input.value;if(input.matches('[data-name]'))design.name=input.value})
  return {isOpen:()=>!panel.hidden,close,open(id?:string){stageId=id;const existing=id?getGame().snapshot.buildings.find(b=>b.id===id)?.stageDesign:undefined;design=structuredClone(existing??defaultStageDesign());history=[];pointer=null;audienceMode=false;erase=false;hideQuality();serial+=1000;while(design.parts.some(p=>p.id===`part-${serial+1}`))serial++;phase=0;panel.hidden=false;q('[data-apply]').hidden=!id;refreshTemplates();if(!renderer)init();rebuild();last=performance.now();cancelAnimationFrame(frame);frame=requestAnimationFrame(animate);syncOpenButton();q<HTMLButtonElement>('[data-close]').focus()}}
}
