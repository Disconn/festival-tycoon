import { WAY_TYPES } from './game/wayTypes'
import type { WayType } from './game/wayTypes'
import { groundRectangle } from './game/ground'
import type { GameState, GameSnapshot } from './game/GameState'
import type { WorldView, CellPosition } from './view/WorldView'
import { GROUND_WORK, groundInfo, roadGroundLimit, prepareGroundArea } from './game/ground'
import type { GroundWork } from './game/ground'
import { SUPPLIES } from './game/festivalManagement'
import type { FestivalAction, Supply } from './game/festivalManagement'
import type { Point } from './game/supplyChain'
import { makeDraggable, makeResizable } from './dragPanel'
import './logistics.css'

const escape = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export function mountLogisticsUI(getGame: () => GameState, view: WorldView, toast: (text: string, error?: boolean) => void) {
  let footType: WayType = 'footDirt', roadType: WayType = 'roadDirt'
  let groundOpen = false, depotOpen = false, mode = 'none', points: Point[] = [], lastRender = 0
  let lastDepotSettings = ''
  const anyOpen = () => groundOpen || depotOpen

  const groundButton = document.createElement('button'); groundButton.textContent = '🏞️ Gelände'; groundButton.id = 'open-terrain-planner'; groundButton.setAttribute('aria-pressed', 'false')
  document.querySelector('#action-group-build')!.append(groundButton)
  const groundPanel = document.createElement('aside'); groundPanel.className = 'supply-planner terrain-planner panel'; groundPanel.hidden = true
  groundPanel.setAttribute('aria-label', 'Gelände planen')
  groundPanel.innerHTML = `<header class="panel-header"><span class="panel-drag-line" aria-hidden="true"></span><h2 class="panel-header-title">Gelände</h2><span class="panel-drag-line" aria-hidden="true"></span><button data-close class="panel-close-button" aria-label="Gelände schließen">×</button></header>
    <p>Besucher sind ausgeblendet. Gebäude und Wege baut ihr weiterhin links. Hier bereitet ihr den Untergrund vor. Die Planung verändert eure normale Bauauswahl nicht.</p>
    <nav class="supply-tools"><button data-tool="inspect" aria-pressed="false">Feld prüfen</button><button data-tool="delivery">Anlieferungsplatz · 400 €</button><button data-tool="depot">Depot · 400 €</button><button data-tool="staffGate">Personaltor · 80 €</button>${Object.entries(GROUND_WORK).map(([key, work]) => `<button data-tool="${key}">${work.name} · ${work.cost} €</button>`).join('')}</nav>
    <p data-hint aria-live="polite">Links normal bauen oder hier eine Geländeoption wählen.</p><div data-cell class="supply-card">Boden erkennen: Furchen = Acker · rötliche Flecken = Lehm · Körnung = Kies · Grasbüschel = Wiese · Rippeln = Sand · Fugen = Pflaster.<br>Verdichteter Boden ist geglättet. Türkise Markierung: entwässert. Über ein Feld fahren für Tragfähigkeit und Ausbau.</div>`
  document.querySelector('.game-shell')!.append(groundPanel)
  makeDraggable(groundPanel.querySelector<HTMLElement>('.panel-header')!, groundPanel)
  makeResizable(groundPanel)

  const depotButton = document.createElement('button'); depotButton.textContent = '🗺️ Logistikansicht'; depotButton.id = 'open-supply-planner'; depotButton.setAttribute('aria-pressed', 'false')
  document.querySelector('#action-group-views')!.append(depotButton)
  const depotPanel = document.createElement('aside'); depotPanel.className = 'supply-planner panel'; depotPanel.hidden = true
  depotPanel.setAttribute('aria-label', 'Logistik und Untergrund planen')
  depotPanel.innerHTML = `<header class="panel-header"><span class="panel-drag-line" aria-hidden="true"></span><h2 class="panel-header-title">Logistik planen</h2><span class="panel-drag-line" aria-hidden="true"></span><button data-close class="panel-close-button" aria-label="Logistikansicht schließen">×</button></header>
    <details open><summary>Depots & Nachschub</summary><p>1. Anlieferungsplatz neben einer Straße und Fußwegen setzen. 2. Depot an Fußwegen bauen. 3. Mindestbestände und Träger einstellen. Träger holen fehlende Waren und versorgen Stände automatisch.</p>
      <label>Depot<select name="depot"></select></label><div data-depot class="supply-card"></div><form data-depot-settings><label>Verwendung<select name="distribution"><option value="shops">Nur Versorgung von Ständen</option><option value="relay">Zwischenlager: andere Depots dürfen entnehmen</option></select></label><label>Träger am Depot<input name="workers" type="number" min="0" max="20" value="2"></label><button>Übernehmen · 120 € je neuem Träger</button></form><button data-remove-depot>Leeres Depot abbauen · +200 €</button>
      <form data-minimum><label>Ware<select name="kind">${Object.entries(SUPPLIES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></label><label>Mindestbestand<input name="quantity" type="number" min="0" max="800" value="200" required></label><button>Mindestbestand setzen</button></form>
      <form data-order><label>Ware<select name="kind">${Object.entries(SUPPLIES).map(([k, v]) => `<option value="${k}">${v.name} · ${v.price} €</option>`).join('')}</select></label><label>Menge<input name="quantity" type="number" min="50" max="2000" step="50" value="200" required></label><button>Jetzt bestellen + 45 € Fracht</button></form>
    </details>
    <details><summary>Manuelle Warenrouten (optional)</summary><p>Ein Handkarren trägt 40 Einheiten. Optional Wegpunkte auf Fußwegen anklicken. Müll wird automatisch durch Reinigungskräfte gesammelt und entsorgt.</p>
      <form data-route><label>Aufgabe<select name="kind"><option value="food">Essen zum Imbiss</option><option value="drinks">Getränke zur Bar</option><option value="water">Trinkwasser zum WC</option></select></label><label>Ziel<select name="target" required></select></label><label>Zielbestand<input name="minimum" type="number" min="1" max="200" value="40" required></label><button type="button" data-tool="waypoint">Wegpunkte auf Karte setzen</button><span data-points>Direkter erreichbarer Weg</span><button type="button" data-clear>Wegpunkte löschen</button><button>Träger einstellen · 120 €</button></form>
    </details><div data-status class="supply-card" aria-live="polite"></div><div data-routes></div><div data-deliveries></div>`
  document.querySelector('.game-shell')!.append(depotPanel)
  makeDraggable(depotPanel.querySelector<HTMLElement>('.panel-header')!, depotPanel)
  makeResizable(depotPanel)

  const qG = <T extends Element = HTMLElement>(selector: string) => groundPanel.querySelector<T>(selector)!
  const qD = <T extends Element = HTMLElement>(selector: string) => depotPanel.querySelector<T>(selector)!
  const putD = (selector: string, html: string) => { const el = qD(selector); if (el.innerHTML !== html) el.innerHTML = html }
  const depotId = () => qD<HTMLSelectElement>('[name=depot]').value
  const execute = (action: FestivalAction) => { const result = getGame().manageFestival(action); if (result.message !== 'Befehl eingeplant') toast(result.message, !result.ok); update(getGame().snapshot, true); return result }
  const choose = (next: string) => {
    mode = next
    view.setGroundAreaTool(next === 'path' || next === 'road' ? (from, to, preview) => {
      const kind = next === 'path' ? footType : roadType
      if (preview) qG('[data-hint]').textContent = `${groundRectangle(getGame().snapshot, from, to).length} Felder · bis zu ${groundRectangle(getGame().snapshot, from, to).length * WAY_TYPES[kind].cost} € zzgl. Rodung. Loslassen zum Bauen / Ersetzen.`
      else execute({ type: 'wayArea', from, to, kind })
      document.querySelectorAll('[data-way-estimate]').forEach(el => el.textContent = qG('[data-hint]').textContent)
    } : anyOpen() && next in GROUND_WORK ? (from, to, preview) => {
      if (preview) {
        const estimate = prepareGroundArea(getGame().snapshot as GameSnapshot, from, to, next as GroundWork, true)
        qG('[data-hint]').textContent = `Loslassen zum Anwenden: ${estimate.message}`
      } else {
        const result = execute({ type: 'groundArea', from, to, kind: next as GroundWork })
        qG('[data-hint]').textContent = result.message
      }
    } : null)
    getGame().setTool(next === 'path' ? 'path' : next === 'road' ? 'road' : next === 'wasteDump' ? 'wasteDump' : 'inspect')
    for (const p of [groundPanel, depotPanel]) p.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.tool === mode)))
    qG('[data-hint]').textContent = mode === 'waypoint' ? 'Bis zu zwölf Wegpunkte auf vorhandenen Fußwegen anklicken.' : mode === 'inspect' ? 'Feld anklicken: Tragfähigkeit, Nässe und Bestand.' : `${mode === 'path' ? WAY_TYPES[footType].name : mode === 'road' ? WAY_TYPES[roadType].name : groundPanel.querySelector(`[data-tool="${mode}"]`)?.textContent}: Feld anklicken oder mit gedrückter linker Maustaste eine Fläche ziehen.`
  }
  const releaseTool = () => {
    view.setGroundAreaTool(null); mode = 'none'
    for (const p of [groundPanel, depotPanel]) p.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', 'false'))
    qG('[data-hint]').textContent = 'Links normal bauen oder hier eine Geländeoption wählen.'
  }
  document.querySelector('.build-menu')!.addEventListener('click', event => {
    if ((event.target as Element).closest('[data-tool], #toggle-path-editor')) releaseTool()
  }, true)
  const syncPlanningMode = () => {
    const on = anyOpen()
    document.body.classList.toggle('logistics-planning', on)
    view.setLogisticsMode(on)
    if (!on && mode !== 'path' && mode !== 'road') releaseTool()
  }
  const toggleGround = (enabled: boolean) => {
    groundOpen = enabled; groundPanel.hidden = !enabled
    groundButton.setAttribute('aria-pressed', String(enabled))
    syncPlanningMode()
    if (!enabled) groundButton.focus()
  }
  const toggleDepot = (enabled: boolean) => {
    depotOpen = enabled; depotPanel.hidden = !enabled
    depotButton.setAttribute('aria-pressed', String(enabled))
    syncPlanningMode()
    if (enabled) update(getGame().snapshot, true)
    else depotButton.focus()
  }
  const makePicker = (kind: 'foot' | 'road', compact = false) => {
    const root = document.createElement('section'); root.className = `way-picker integrated-way-picker${compact ? ' compact' : ''}`
    root.innerHTML = `<div class="way-icon-palette" role="group" aria-label="${kind === 'foot' ? 'Wegbelag wählen' : 'Straßenbelag wählen'}">${Object.entries(WAY_TYPES).filter(([, t]) => t.mode === kind).map(([id, t]) => `<button type="button" class="way-icon" data-way-icon="${id}" data-way-kind="${kind}" aria-label="${t.name}" aria-pressed="false" title="${t.name} · ${t.cost} €/Feld. ${t.detail}"><span class="way-swatch" data-surface="${id}" aria-hidden="true"></span></button>`).join('')}</div><p data-way-detail="${kind}" class="way-selection-label"></p><p data-way-estimate aria-live="polite"></p>`
    return root
  }
  const pathPicker = makePicker('foot', true), editorPicker = makePicker('foot'), roadPicker = makePicker('road')
  document.querySelector('#path-tools')!.before(pathPicker)
  document.querySelector('#path-construction .construction-title')!.after(editorPicker)
  document.querySelector('.logistics-road-tools')!.before(roadPicker)
  const pickers = [pathPicker, editorPicker, roadPicker]
  const refreshTypes = () => {
    for (const [tool, id] of [['path', footType], ['road', roadType]] as const) {
      const label = document.querySelector(`.build-menu [data-tool="${tool}"] em`)
      if (label) label.innerHTML = `${WAY_TYPES[id].name}<small>${WAY_TYPES[id].cost} €/Feld</small>`
    }
    for (const root of pickers) for (const kind of ['foot', 'road'] as const) {
      const id = kind === 'foot' ? footType : roadType, t = WAY_TYPES[id]
      const icons = root.querySelectorAll<HTMLButtonElement>(`[data-way-kind="${kind}"]`)
      if (!icons.length) continue
      icons.forEach(icon => icon.setAttribute('aria-pressed', String(icon.dataset.wayIcon === id)))
      const detail = root.querySelector<HTMLElement>(`[data-way-detail="${kind}"]`)!
      detail.textContent = `${t.name} · ${t.cost} €/Feld`
      detail.title = `${t.detail} ${kind === 'foot' ? `Tempo ${Math.round(t.speed * 100)} %, Kapazität ${t.capacity} Personen/Feld.` : `Höchstens Tempo ${t.limit}.`} Bei voller Nässe ${Math.round(t.rain * 100)} % langsamer.`
    }
  }
  for (const root of pickers) {
    root.addEventListener('click', e => {
      const icon = (e.target as Element).closest<HTMLButtonElement>('[data-way-icon]'); if (!icon) return
      if (icon.dataset.wayKind === 'foot') footType = icon.dataset.wayIcon as WayType; else roadType = icon.dataset.wayIcon as WayType
      refreshTypes()
      if (root === editorPicker) { releaseTool(); getGame().setTool('path') }
      else choose(icon.dataset.wayKind === 'foot' ? 'path' : 'road')
    })

  }
  refreshTypes()
  groundButton.addEventListener('click', () => toggleGround(!groundOpen))
  depotButton.addEventListener('click', () => toggleDepot(!depotOpen))
  groundPanel.addEventListener('click', event => {
    const b = (event.target as Element).closest<HTMLElement>('button'); if (!b) return
    if (b.hasAttribute('data-close')) toggleGround(false)
    if (b.dataset.tool) choose(b.dataset.tool)
  })
  groundPanel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); toggleGround(false) } })
  depotPanel.addEventListener('click', event => {
    const b = (event.target as Element).closest<HTMLElement>('button'); if (!b) return
    if (b.hasAttribute('data-close')) toggleDepot(false)
    if (b.dataset.tool) choose(b.dataset.tool)
    if (b.hasAttribute('data-clear')) { points = []; putD('[data-points]', 'Direkter erreichbarer Weg') }
    if (b.hasAttribute('data-remove-depot')) execute({ type: 'removeDepot', depotId: depotId() })
    if (b.dataset.remove) execute({ type: 'removeRoute', id: b.dataset.remove })
  })
  depotPanel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); toggleDepot(false) } })
  qD('[name=depot]').addEventListener('change', () => update(getGame().snapshot, true))
  qD('[data-route] [name=kind]').addEventListener('change', () => { const waste = qD<HTMLSelectElement>('[data-route] [name=kind]').value === 'waste'; const input = qD<HTMLInputElement>('[data-route] [name=minimum]'); input.max = waste ? '12' : '200'; input.value = waste ? '8' : '40'; update(getGame().snapshot, true) })
  qD<HTMLFormElement>('[data-minimum]').addEventListener('submit', e => { e.preventDefault(); const data = new FormData(e.currentTarget as HTMLFormElement); execute({ type: 'minimum', depotId: depotId(), kind: String(data.get('kind')) as Supply, quantity: Number(data.get('quantity')) }) })
  qD<HTMLFormElement>('[data-depot-settings]').addEventListener('submit', e => { e.preventDefault(); const data = new FormData(e.currentTarget as HTMLFormElement); execute({type:'depotSettings',depotId:depotId(),distribution:String(data.get('distribution')) as 'relay'|'shops',workers:Number(data.get('workers'))}) })
  qD<HTMLFormElement>('[data-order]').addEventListener('submit', e => { e.preventDefault(); const data = new FormData(e.currentTarget as HTMLFormElement); execute({ type: 'order', depotId: depotId(), kind: String(data.get('kind')) as Supply, quantity: Number(data.get('quantity')), delay: 0 }) })
  qD<HTMLFormElement>('[data-route]').addEventListener('submit', e => {
    e.preventDefault(); const data = new FormData(e.currentTarget as HTMLFormElement)
    const result = execute({ type: 'route', depotId: depotId(), kind: String(data.get('kind')) as Supply | 'waste', targetId: String(data.get('target')), minimum: Number(data.get('minimum')), waypoints: points })
    if (result.ok) { points = []; putD('[data-points]', 'Direkter erreichbarer Weg'); choose('inspect') }
  })
  function update(s: Readonly<GameSnapshot>, force = false) {
    if (mode !== 'none' && ((mode === 'path' || mode === 'road') ? s.selectedTool !== mode : s.selectedTool !== 'inspect')) releaseTool()
    if (!depotOpen || !force && performance.now() - lastRender < 700) return
    lastRender = performance.now()
    const i = s.festival.infrastructure
    const options = (selector: string, html: string) => { const select = qD<HTMLSelectElement>(selector), value = select.value; if (select.innerHTML !== html) { select.innerHTML = html; if ([...select.options].some(o => o.value === value)) select.value = value } }
    options('[name=depot]', i.depots.map((d, n) => `<option value="${escape(d.id)}">${d.role === 'delivery' ? 'Anlieferung' : 'Depot'} ${n + 1} · ${d.x}, ${d.z}</option>`).join('') || '<option value="">Noch kein Depot</option>')
    const d = i.depots.find(d => d.id === depotId())
    if (d) { const workers=i.routes.filter(r=>r.automatic&&r.depotId===d.id).length; const stamp=`${d.id}:${workers}:${d.distribution}`; if (stamp!==lastDepotSettings && !qD('[data-depot-settings]').contains(document.activeElement)) { qD<HTMLInputElement>('[name=workers]').value=String(workers); qD<HTMLSelectElement>('[name=distribution]').value=d.distribution??'shops'; lastDepotSettings=stamp } }
    putD('[data-depot]', d ? Object.entries(SUPPLIES).map(([k, v]) => `${v.name}: <b>${Math.floor(d.stock[k as Supply])}</b> / Mindestbestand ${d.minimum[k as Supply]}`).join('<br>') : 'Lehmboden zuerst entwässern, dann verdichten und Depot bauen.')
    const kind = qD<HTMLSelectElement>('[data-route] [name=kind]').value
    const targetKind = { food: 'food', drinks: 'alcohol', water: 'toilet', waste: 'wasteBin' }[kind]
    options('[name=target]', s.buildings.filter(b => b.kind === targetKind).map(b => `<option value="${escape(b.id)}">${b.kind === 'wasteBin' ? 'Mülleimer' : b.kind === 'food' ? 'Imbiss' : b.kind === 'alcohol' ? 'Bar' : 'WC'} · ${b.x}, ${b.z}</option>`).join('') || '<option value="">Passendes Gebäude zuerst bauen</option>')
    putD('[data-status]', `<b>${escape(i.status)}</b><br>${i.trucks.length} Lieferwagen · ${i.routes.length} Träger · Bodenfeuchte ${Math.round(s.festival.wetness)} %`)
    putD('[data-routes]', i.routes.filter(r => r.kind !== 'waste').map((r, index) => `<article class="supply-card"><b>${r.automatic ? 'Automatischer Träger' : 'Route'} ${index + 1} · ${r.kind === 'waste' ? 'Müll' : SUPPLIES[r.kind].name}</b><p>${escape(r.status)} · Ladung ${r.cargo}</p><small>${r.kind === 'waste' ? 'Abholschwelle' : 'Zielbestand'} ${r.minimum}${r.kind !== 'waste' ? ` · Vor Ort ${Math.floor(i.shops[r.targetId]?.[r.kind] ?? 0)}` : ''}</small><button data-remove="${escape(r.id)}" ${r.phase !== 'idle' || r.cargo ? 'disabled' : ''}>Route entfernen</button></article>`).join(''))
    putD('[data-deliveries]', s.festival.deliveries.map(d => `<p>${d.quantity} × ${SUPPLIES[d.kind].name} · ${i.trucks.some(t => t.deliveryId === d.id && t.z < -s.scenario.worldSize / 2) ? 'Wartet auf freie Einfahrt' : i.trucks.some(t => t.deliveryId === d.id) ? 'Lastwagen auf dem Gelände' : d.remaining > 0 ? `Anfahrt: ${Math.ceil(d.remaining)} min` : 'Wartet am Kartenrand'}</p>`).join(''))
  }
  function handleCell(cell: CellPosition): boolean {
    if (!anyOpen() || mode === 'none' || ['path', 'road', 'wasteDump'].includes(mode)) return false
    const s = getGame().snapshot
    if (mode === 'depot' || mode === 'delivery') execute({ type: 'depot', ...cell, role:mode === 'delivery'?'delivery':'storage' })
    else if (mode === 'staffGate') execute({type:'staffGate',...cell,elevation:s.buildings.find(b=>b.kind==='path'&&b.x===cell.x&&b.z===cell.z)?.elevation ?? 0})
    else if (mode in GROUND_WORK) execute({ type: 'ground', ...cell, kind: mode as GroundWork })
    else if (mode === 'waypoint') {
      const path = s.buildings.find(b => b.kind === 'path' && b.x === cell.x && b.z === cell.z)
      if (!path || points.length >= 12) toast('Bis zu zwölf Wegpunkte auf vorhandenen Fußwegen wählen', true)
      else { points.push({ ...cell, elevation: path.elevation }); putD('[data-points]', points.map((p, n) => `${n + 1}: (${p.x}, ${p.z})`).join(' → ')) }
    }
    const ground = groundInfo(s, cell.x, cell.z), b = s.buildings.find(b => b.x === cell.x && b.z === cell.z && b.kind !== 'path')
    qG('[data-cell]').innerHTML = `<b>Feld ${cell.x}, ${cell.z}</b> · ${{ clay: 'Lehm', field: 'Ackerboden', gravel: 'Kiesboden', sand: 'Sandboden', grass: 'Wiesenboden', urban: 'Befestigter Stadtboden' }[ground.type]}<br>Tragfähigkeit ${ground.bearing}/3 · Tempo ${Math.round(ground.speed * 100)} %<br>Fahrbahn geeignet bis Tempo ${roadGroundLimit(s, cell.x, cell.z)}<br>${ground.drained ? 'Entwässert' : 'Ohne Entwässerung'} · ${ground.surface === 'paved' ? 'Gepflastert' : ground.surface === 'gravel' ? 'Geschottert' : ground.compacted ? 'Verdichtet' : 'Unbefestigt'}${b ? `<br>Gebäudeeffizienz ${Math.round((ground.bearing === 3 ? 1.25 : Math.max(.4, ground.speed)) * 100)} %${s.festival.infrastructure.shops[b.id] ? `<br>Standbestand: ${Object.entries(s.festival.infrastructure.shops[b.id]!).map(([k, n]) => `${SUPPLIES[k as Supply].name} ${Math.floor(n)}`).join(' · ')}` : ''}` : ''}`
    return true
  }
  return { update, handleCell, releaseTool, activateWay: (kind: 'path' | 'road') => choose(kind), getFootType: () => footType, isActive: () => anyOpen() }
}
