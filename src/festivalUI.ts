import { bandGenre, genreAffinity } from './game/musicTaste'
import { mountMusicPlanner, musicOverview } from './musicPlanner'
import type { GameState, GameSnapshot } from './game/GameState'
import './festival.css'
import { AUDIENCES, AUDIENCE_NAMES, BANDS, SUPPLIES, UPGRADES, WEATHER_NAMES, audienceMix, forecast, showIssue, festivalTime } from './game/festivalManagement'
import type { FestivalAction, Supply, Upgrade } from './game/festivalManagement'

const money = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const clock = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`
const meter = (label: string, n: number) => `<label class="festival-meter">${label}<strong>${Math.round(n)}%</strong><progress max="100" value="${n}"></progress></label>`

export function mountFestivalUI(getGame: () => GameState, toast: (text: string, error?: boolean) => void) {
  const shell = document.querySelector<HTMLElement>('.game-shell')!
  const open = document.createElement('button')
  open.id = 'open-festival'; open.textContent = 'Festival planen'; open.setAttribute('aria-expanded', 'false')
  document.querySelector('.game-actions')!.prepend(open)
  const weather = document.createElement('div'); weather.className = 'festival-weather'; weather.setAttribute('aria-hidden', 'true'); shell.append(weather)
  const panel = document.createElement('section')
  panel.id = 'festival-management'; panel.className = 'festival-management panel'; panel.hidden = true
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'festival-title')
  panel.innerHTML = `<div class="festival-chrome"><header class="festival-heading"><div><small>DEIN FESTIVAL · DEINE ENTSCHEIDUNGEN</small><h2 id="festival-title">Das Festivalwochenende</h2></div><button data-close aria-label="Festivalverwaltung schließen">×</button></header>
    <div class="festival-status" aria-live="polite"></div>
    <nav class="festival-tabs" aria-label="Festivalbereiche">${[['overview', 'Übersicht'], ['lineup', 'Bands & Spielplan'], ['supply', 'Lager & Lieferungen'], ['prepare', 'Wetter & Vorsorge'], ['reports', 'Abrechnung & Ruf']].map(([id, label]) => `<button data-tab="${id}" aria-pressed="${id === 'overview'}">${label}</button>`).join('')}</nav></div>
    <section data-pane="overview"><div class="festival-intro"><h3>Ein Gelände. Ein Wochenende. Euer Publikum.</h3><p>Vorlauf und Festivaltage legt ihr in der Tagesplanung fest. Erst mit dem Start läuft die Festivalzeit. Bucht ein Programm, versorgt eure Gäste und entscheidet, welche Reserven ihr euch leisten könnt. Das vorhandene Gelände und Budget werden übernommen.</p><button data-action="start">Festival starten</button><button data-action="sandbox">Freies Spiel fortsetzen</button></div><form data-tickets class="festival-form"><label>Tagestickets je Festivaltag<input name="dayTickets" type="number" min="0" max="100000" value="150" required></label><label>Campingtickets für die gesamte Ausgabe<input name="campTickets" type="number" min="0" max="100000" value="0" required></label><button>Kontingente übernehmen</button></form><p data-camping-summary></p><div data-music-overview></div><div data-summary></div></section>
    <section data-pane="lineup" hidden><p>Gagen werden sofort bezahlt. Jede Bühne benötigt Strom und einen erreichbaren Bühnenvorplatz. Zwischen Auftritten liegen 30 Minuten Umbauzeit. Stornierung vor Beginn erstattet 50 %.</p>
      <details><summary>Besucherbasis & Genreverteilung vergleichen</summary><div data-lineup-mix></div></details><div data-music-planner></div><details><summary>Alternative: Buchung per Formular</summary><form data-book class="festival-form"><label>Band<select name="band">${BANDS.map(b => `<option value="${b.id}">${b.name} · ${b.genre} · ${money(b.fee)}</option>`).join('')}</select></label>
      <label>Bühne<select name="stage" required></select></label><label>Festivaltag<select name="day"></select></label><label>Beginn<input name="time" type="time" min="08:00" max="23:00" value="14:00" required></label><label>Dauer<select name="duration"><option value="60">60 Minuten</option><option value="90" selected>90 Minuten</option><option value="120">120 Minuten</option></select></label><button type="submit">Verbindlich buchen</button></form>
      <div data-band-details></div></details><div data-bookings></div></section>
    <section data-pane="supply" hidden><p>Waren werden am Kartenrand angeliefert und per Lastwagen zum ersten Depot gebracht. Träger versorgen einzelne Stände. Depots, Zielbestände und Routen in der Logistikansicht planen. Jede Lieferung kostet zusätzlich 45 €.</p><div data-stock class="festival-grid"></div>
      <form data-order class="festival-form"><label>Ware<select name="kind">${Object.entries(SUPPLIES).map(([key, item]) => `<option value="${key}">${item.name} · ${item.price.toLocaleString('de-DE')} €/Einheit</option>`).join('')}</select></label><label>Menge<input name="quantity" type="number" min="50" max="2000" step="50" value="200" required></label><label>Versandfenster<select name="delay"><option value="0">Jetzt</option><option value="360">In 6 Stunden</option><option value="720">In 12 Stunden</option></select></label><button type="submit">Kostenpflichtig bestellen</button></form><div data-deliveries></div></section>
    <section data-pane="prepare" hidden><div data-forecast class="festival-grid"></div><p>Die Sechs-Stunden-Vorhersage zeigt Wetterrisiken; einzelne Stunden können milder ausfallen. Regen weicht unbefestigte Flächen auf; befestigte Wege bleiben schnell. Ohne Sturmsicherung ruhen Auftritte bei starkem Wind. Schutzmaßnahmen gelten festivalweit und bleiben für weitere Ausgaben erhalten.</p><div data-upgrades class="festival-grid"></div></section>
    <section data-pane="reports" hidden><div data-reputation class="festival-grid"></div><p>Musikruf öffnet den Zugang zu größeren Bands. Atmosphäre, Komfort und Organisation beeinflussen die erwarteten Zielgruppen und die Nachfrage. Die Tagesbilanz enthält sämtliche Einnahmen und Ausgaben des Spiels.</p><div data-reports></div></section>`
  shell.append(panel)
  let lastRender = -1, stageKey = '', dayKey = '', reportCount = 0
  const execute = (action: FestivalAction) => { const result = getGame().manageFestival(action); if (result.message !== 'Befehl eingeplant') toast(result.message, !result.ok); render(getGame().snapshot, true) }
  const musicPlanner=mountMusicPlanner(panel.querySelector('[data-music-planner]')!,()=>getGame().snapshot,execute,toast)
  const close = () => { panel.hidden = true; open.setAttribute('aria-expanded', 'false'); open.focus() }
  open.addEventListener('click', () => { panel.hidden = !panel.hidden; open.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) render(getGame().snapshot, true) })
  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button')
    if (!button) return
    if (button.hasAttribute('data-close')) { close(); return }
    if (button.dataset.tab) {
      panel.querySelectorAll<HTMLElement>('[data-pane]').forEach(pane => pane.hidden = pane.dataset.pane !== button.dataset.tab)
      panel.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)))
      render(getGame().snapshot, true)
    }
    if (button.dataset.action) execute({ type: button.dataset.action === 'start'&&getGame().snapshot.festival.finished?'prepare':button.dataset.action as 'start' | 'sandbox' })
    if (button.dataset.cancel) execute({ type: 'cancel', id: button.dataset.cancel })
    if (button.dataset.upgrade) execute({ type: 'upgrade', kind: button.dataset.upgrade as Upgrade })
  })
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close() } })
  panel.querySelector<HTMLFormElement>('[data-tickets]')!.addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement)
    execute({type:'tickets',day:Number(data.get('dayTickets')),camping:Number(data.get('campTickets'))})
  })
  panel.querySelector<HTMLFormElement>('[data-book]')!.addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement)
    const [hour, minute] = String(data.get('time')).split(':').map(Number)
    execute({ type: 'book', bandId: String(data.get('band')), stageId: String(data.get('stage')), day: Number(data.get('day')), start: hour * 60 + minute, duration: Number(data.get('duration')) })
  })
  panel.querySelector<HTMLFormElement>('[data-order]')!.addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement)
    execute({ type: 'order', kind: String(data.get('kind')) as Supply, quantity: Number(data.get('quantity')), delay: Number(data.get('delay')) })
  })
  panel.querySelector('[name=band]')!.addEventListener('change', () => render(getGame().snapshot, true))
  const put = (selector: string, html: string) => { const el = panel.querySelector<HTMLElement>(selector)!; if (el.innerHTML !== html) el.innerHTML = html }
  function render(s: Readonly<GameSnapshot>, force = false) {
    const f = s.festival
    weather.dataset.weather = f.enabled && !f.finished ? f.weather : 'sun'
    if (f.reports.length > reportCount) { reportCount = f.reports.length; toast('Neue Festival-Tagesabrechnung verfügbar') }
    else reportCount = f.reports.length
    open.textContent = f.enabled ? (f.finished ? 'Festival · Ergebnis' : `Festival · ${WEATHER_NAMES[f.weather]}`) : 'Festival planen'
    if (panel.hidden) return
    if (!force && performance.now() - lastRender < 500) return
    lastRender = performance.now()
    const phase = f.finished ? 'Abgeschlossen' : s.day < f.startDay + s.dayPlan.leadDays ? 'Vorbereitung' : `Festivaltag ${s.day - f.startDay - s.dayPlan.leadDays + 1}/${s.dayPlan.festivalDays}`
    put('.festival-status', `<strong>${f.enabled ? `Ausgabe ${f.edition} · ${phase}` : f.planning ? 'Planung · Zeit angehalten' : 'Freies Spiel'}</strong><span>Tag ${s.day} · ${clock(s.minute)} · Budget ${money(s.money)}</span>`)
    panel.querySelector<HTMLButtonElement>('[data-action=start]')!.disabled = f.enabled && !f.finished
    panel.querySelector<HTMLButtonElement>('[data-action=start]')!.textContent = f.finished ? 'Nächste Ausgabe vorbereiten' : 'Festival starten'
    panel.querySelector<HTMLButtonElement>('[data-action=sandbox]')!.hidden = !f.enabled
    const capacity = getGame().getBookableCampingCapacity(), occupied = s.visitors.filter(v => v.ticketType === 'camping').length
    const ticketForm = panel.querySelector<HTMLFormElement>('[data-tickets]')!
    ticketForm.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach(el => el.disabled = f.enabled && !f.finished)
    if (f.tickets && !ticketForm.contains(document.activeElement)) {
      ticketForm.querySelector<HTMLInputElement>('[name=dayTickets]')!.value = String(f.tickets.day)
      ticketForm.querySelector<HTMLInputElement>('[name=campTickets]')!.value = String(f.tickets.camping)
    }
    put('[data-camping-summary]', `${s.campingCells.length} Campingfelder · ${capacity} buchbar nach ${s.dayPlan.campingCapacityBufferPercent}% Reserve · ${occupied} belegt · ${Math.max(0,capacity-occupied)} frei.<br>${f.tickets ? `Geplant: ${f.tickets.camping}/${capacity} Campingplätze (${capacity ? Math.round(f.tickets.camping/capacity*100) : 0}%). Angereist: ${f.tickets.usedCamping} Camper · ${f.tickets.usedDay[s.day]??0}/${f.tickets.day} Tagesgäste heute.` : 'Noch kein Kontingent festgelegt: bisheriger Besucherzulauf. Übernehmt eure Ticketzahlen vor dem Start.'} Die Kontingente begrenzen die Anreisen; Einlasszeiten und Nachfrage gelten weiterhin. Bezahlung erfolgt bei Anreise.`)
    put('[data-music-overview]',musicOverview(s))
    put('[data-lineup-mix]',musicOverview(s))
    musicPlanner.render(s)
    const mix = audienceMix(f)
    put('[data-summary]', `<div class="festival-grid"><article><h3>Ziele dieses Wochenendes</h3><p>${f.admissions} / ${f.goals.guests} Anreisen</p><p>Zufriedenheit ≥ ${f.goals.satisfaction}% · Gesamtbilanz ≥ ${money(f.goals.profit)}</p><p>Vorbereitung: Tag ${f.startDay}<br>Festival: Tag ${f.startDay + s.dayPlan.leadDays} bis ${f.startDay + s.dayPlan.leadDays + s.dayPlan.festivalDays - 1}</p></article><article><h3>Erwartetes Publikum</h3>${AUDIENCES.map(key => meter(AUDIENCE_NAMES[key], mix[key] * 100)).join('')}</article><article><h3>Worauf ihr achten solltet</h3><p>${!s.buildings.some(b => b.kind === 'stage') ? 'Baut eine Bühne mit Stromversorgung und Bühnenvorplatz.' : !f.bookings.length ? 'Noch kein Programm gebucht: Ohne Bands bleibt die Nachfrage gering.' : `${f.bookings.length} Auftritte gebucht. Technische Anforderungen und Tagesplan prüfen.`}</p><p>Aktuell: ${WEATHER_NAMES[f.weather]} · Bodennässe ${Math.round(f.wetness)}%</p><p>${f.supplies.food < 100 || f.supplies.drinks < 100 ? 'Vorräte werden knapp – Nachschub bestellen.' : 'Lieferungen frühzeitig vor großen Auftritten einplanen.'}</p></article></div>`)
    const stages = s.buildings.filter(b => b.kind === 'stage')
    const nextStageKey = stages.map(b => b.id).join('|')
    if (stageKey !== nextStageKey || !panel.querySelector('[name=stage] option')) {
      stageKey = nextStageKey
      const select = panel.querySelector<HTMLSelectElement>('[name=stage]')!, previous = select.value
      select.innerHTML = stages.length ? stages.map((b, i) => `<option value="${escape(b.id)}">Bühne ${i + 1} · ${b.x}, ${b.z}</option>`).join('') : '<option value="">Zuerst eine Bühne bauen</option>'
      if (stages.some(s => s.id === previous)) select.value = previous
    }
    if (dayKey !== `${f.startDay}:${s.dayPlan.leadDays}:${s.dayPlan.festivalDays}`) { dayKey = `${f.startDay}:${s.dayPlan.leadDays}:${s.dayPlan.festivalDays}`; put('[name=day]', Array.from({length:s.dayPlan.festivalDays}, (_, n) => `<option value="${f.startDay + s.dayPlan.leadDays + n}">Tag ${f.startDay + s.dayPlan.leadDays + n} · Festivaltag ${n+1}</option>`).join('')) }
    const band = BANDS.find(b => b.id === panel.querySelector<HTMLSelectElement>('[name=band]')!.value)!
    put('[data-band-details]', `<p class="festival-note"><strong>${band.name}</strong> · Zielgruppe ${AUDIENCE_NAMES[band.audience]} · Nachfrage +${band.draw} · ${band.speakers} aktive Lautsprecher im Radius von 10 Feldern · Musikruf mindestens ${band.reputation} (aktuell ${Math.round(f.reputation.music)})</p>`)
    put('[data-bookings]', f.bookings.length ? [...f.bookings].sort((a, b) => a.day - b.day || a.start - b.start).map(b => {
      const band = BANDS.find(x => x.id === b.bandId)!
      const conflict = f.bookings.some(other => other.id !== b.id && other.day === b.day && other.start < b.start + b.duration && b.start < other.start + other.duration && genreAffinity(bandGenre(other.bandId),bandGenre(band.id))>=.7)
      const issue = showIssue(s, b), future = b.day * 1440 + b.start > festivalTime(s)
      return `<article class="festival-booking"><div><strong>${band.name}</strong><span>Tag ${b.day} · ${clock(b.start)}–${clock(b.start + b.duration)} · Bühne ${stages.findIndex(stage => stage.id === b.stageId) + 1}</span><small>${conflict ? 'Publikumskonflikt: Ähnliche Genres spielen gleichzeitig. ' : ''}${issue ? `Aktuelle Betriebsprüfung: ${escape(issue)}` : 'Technik aktuell bereit'}</small></div><button data-cancel="${escape(b.id)}" ${future ? '' : 'disabled'}>Stornieren · ${money(b.fee / 2)} zurück</button></article>`
    }).join('') : '<p class="festival-empty">Noch keine Bands gebucht. Beginnt mit einem bezahlbaren Auftritt und plant passende Versorgung daneben.</p>')
    put('[data-stock]', Object.entries(SUPPLIES).map(([key, item]) => `<article><h3>${item.name}</h3><strong class="festival-number">${Math.floor(f.infrastructure.depots.reduce((n, d) => n + d.stock[key as Supply], 0))}</strong><small>Einheiten in Depots</small></article>`).join(''))
    put('[data-deliveries]', `<p>${f.infrastructure.depots.length} Depots · ${f.infrastructure.trucks.length} Lastwagen · ${f.infrastructure.routes.length} Träger. Bestellungen hier gehen an das erste Depot.</p>${f.deliveries.map(d => `<article class="festival-booking"><strong>${d.quantity} × ${SUPPLIES[d.kind].name}</strong><span>${festivalTime(s) < d.due ? `Versand ab Tag ${Math.floor(d.due / 1440)} · ${clock(d.due % 1440)}` : f.infrastructure.trucks.some(t => t.deliveryId === d.id) ? 'Lastwagen fährt zum Depot' : d.remaining > 0 ? `Anfahrt zum Kartenrand · ${Math.ceil(d.remaining)} Minuten` : 'Wartet auf freie Zufahrt zum Depot'}</span></article>`).join('') || '<p>Keine Lieferungen unterwegs.</p>'}`)
    put('[data-forecast]', [0, 1, 2].map(offset => `<article><h3>Tag ${s.day + offset}</h3>${[0, 6, 12, 18].map(hour => `<p>${String(hour).padStart(2, '0')}:00–${hour + 6}:00 · <strong>${WEATHER_NAMES[forecast(f, s.day + offset, hour)]}</strong></p>`).join('')}</article>`).join(''))
    put('[data-upgrades]', Object.entries(UPGRADES).map(([key, upgrade]) => `<article><h3>${upgrade.name}</h3><p>${upgrade.detail}</p><button data-upgrade="${key}" ${f.upgrades[key as Upgrade] ? 'disabled' : ''}>${f.upgrades[key as Upgrade] ? 'Vorhanden' : `Einrichten · ${money(upgrade.cost)}`}</button></article>`).join(''))
    put('[data-reputation]', Object.entries(f.reputation).map(([key, value]) => `<article>${meter(({ music: 'Musik', atmosphere: 'Atmosphäre', comfort: 'Komfort', organization: 'Organisation' })[key]!, value)}</article>`).join(''))
    const festivalReports = f.reports.filter(r => r.day >= f.startDay + s.dayPlan.leadDays)
    const average = festivalReports.length ? festivalReports.reduce((sum, r) => sum + r.satisfaction, 0) / festivalReports.length : 0
    const balance = f.reports.reduce((sum, r) => sum + r.balance, 0)
    const success = f.admissions >= f.goals.guests && average >= f.goals.satisfaction && balance >= f.goals.profit
    put('[data-reports]', `${f.finished ? `<article class="festival-result"><h3>${success ? 'Wochenendziele erreicht!' : 'Wochenende abgeschlossen – hier liegt euer nächstes Verbesserungspotenzial'}</h3><p>${f.admissions}/${f.goals.guests} Anreisen · Zufriedenheit ${Math.round(average)}/${f.goals.satisfaction}% · Bilanz ${money(balance)}</p><p>Mit dem behaltenen Gelände, den Ausbauten und eurem Ruf könnt ihr die nächste Ausgabe planen.</p></article>` : ''}${f.reports.map(r => `<article class="festival-booking"><div><h3>Tag ${r.day}${r.day === f.startDay ? ' · Vorbereitung' : ''}</h3><p>${r.guests} Anreisen · Zufriedenheit ${Math.round(r.satisfaction)}% · Tagesbilanz ${money(r.balance)}</p><p>${Math.round(r.concerts)} Besucher-Konzertminuten · ${r.stockouts} gescheiterte Käufe · Wetterbelastung ${Math.round(r.weatherImpact)}</p><small>${r.stockouts ? 'Mehr Vorräte und frühere Lieferungen helfen gegen Ausverkäufe. ' : ''}${r.weatherImpact > 100 ? 'Überdachung und Trinkwasser verbessern den Wetterschutz. ' : ''}${r.satisfaction < 65 ? 'Bedürfnisse, Ruhe und Erreichbarkeit prüfen.' : 'Die Gäste waren überwiegend zufrieden.'}</small></div></article>`).join('') || '<p class="festival-empty">Die erste Abrechnung erscheint nach Mitternacht. Das Festival endet nach den geplanten Festivaltagen.</p>'}`)
  }
  return { update: render }
}
