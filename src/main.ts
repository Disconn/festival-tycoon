import { GENRES } from './game/musicTaste'
import { makeDraggable, makeResizable } from './dragPanel'
import { mountStageEditor } from './stageEditor'
import { stageStats } from './game/stageDesign'
import { mountStaffDetails } from './staffDetailsUI'
import { encodeSaveText, decodeSaveText } from './game/saveText'
import { deleteServerSave, listServerSaves, loadServerSave, saveServerSave, type ServerSaveSlot } from './game/serverSaves'
import { ENVIRONMENTS } from './game/environments'
import type { Environment } from './game/environments'
import { mountLogisticsUI } from './logisticsUI'
import './style.css'
import { mountFestivalUI } from './festivalUI'
import { AUDIENCE_NAMES } from './game/festivalManagement'
import { BUILDINGS } from './game/catalog'
import type { BuildingKind, Tool } from './game/catalog'
import {
  COASTER_TYPES,
  TRACK_BANK_ANGLE,
  TRACK_PIECES,
  TRACK_PITCHES,
  createTrackPiece,
} from './game/coasters'
import type {
  Coaster,
  CoasterOperationMode,
  DispatchMode,
  TrackPieceKind,
} from './game/coasters'
import { GameState } from './game/GameState'
import type { PlacedBuilding } from './game/GameState'
import { enableMultiplayerCommands } from './net/bind'
import { MultiplayerSession } from './net/session'
import type { MultiplayerStatus } from './net/session'
import { SIMULATION_CONFIG } from './game/simulationConfig'
import {
  SCENARIO_WORLD_SIZES,
  normalizeScenarioSettings,
} from './game/scenario'
import type { ScenarioSettings } from './game/scenario'
import { INVENTORY_ITEMS } from './game/inventory'
import { STAFF_DEFINITIONS, STAFF_ROLES } from './game/staff'
import type { StaffRole } from './game/staff'
import {
  DAY_PLAN_OFFERS,
  DAY_PLAN_OFFER_LABELS,
  getFestivalCycleStatus,
  isDayVisitorAdmissionOpen,
  isFestivalOfferActive,
} from './game/dayPlan'
import type { DayPlanOffer } from './game/dayPlan'
import {
  COMPLAINT_LABELS,
  COMPLAINT_TOPICS,
} from './game/complaints'
import { WorldView } from './view/WorldView'
import type { CellPosition, PathAnchor } from './view/WorldView'

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Benötigtes UI-Element fehlt: ${selector}`)
  return element
}

const app = requireElement<HTMLDivElement>('#app')

app.innerHTML = `
  <main class="game-shell">
    <canvas id="game-canvas" aria-label="Festivalgelände"></canvas>
    <header class="topbar panel">
      <div class="brand">
        <span class="brand-mark">F</span>
        <div><strong>Festival Tycoon</strong><small>Prototype 0.1</small></div>
        <button id="toggle-scenario" class="scenario-toggle" aria-expanded="false">⚙️ Szenario</button>
  </div>
      <div class="stats">
        <span>💰 <strong id="money">0 €</strong></span>
        <span>👥 <strong id="guests">0</strong></span>
        <span>★ <strong id="reputation">0%</strong></span>
        <span>⚡ <strong id="power">0/0 kW</strong></span>
        <span>🗑️ <strong id="waste">0</strong></span>
        <span>📅 <strong id="date">Tag 1 · 08:00</strong></span>
  </div>
      <div class="game-actions">
        <div id="action-group-festival" class="action-group" aria-label="Festival"></div>
        <div class="action-divider"></div>
        <div id="action-group-build" class="action-group" aria-label="Bauwerkzeuge">
          <button id="open-info">🔎 Info</button>
          <button id="open-build-menu" aria-expanded="false">🏗️ Bauen</button>
          <div class="dropdown-menu">
            <button id="toggle-bulldoze-menu" aria-expanded="false">🚜 Abriss</button>
            <div id="bulldoze-menu-panel" class="bulldoze-panel panel">
              <div class="bulldoze-panel-header panel-header">
                <span class="panel-drag-line" aria-hidden="true"></span>
                <h3 class="panel-header-title">Abriss-Fläche</h3>
                <span class="panel-drag-line" aria-hidden="true"></span>
                <button data-close-bulldoze-menu class="panel-close-button" aria-label="Abriss schließen">×</button>
              </div>
              <div class="bulldoze-size-grid">
                <button data-bulldoze-size="1" class="active">1×1</button>
                <button data-bulldoze-size="2">2×2</button>
                <button data-bulldoze-size="3">3×3</button>
                <button data-bulldoze-size="4">4×4</button>
                <button data-bulldoze-size="5">5×5</button>
                <button data-bulldoze-size="6">6×6</button>
                <button data-bulldoze-size="7">7×7</button>
                <button data-bulldoze-size="8">8×8</button>
              </div>
            </div>
          </div>
        </div>
        <div class="action-divider"></div>
        <div id="action-group-views" class="action-group" aria-label="Ansichten">
          <button id="open-logistics">🚚 Logistik</button>
          <button id="open-day-plan">📅 Tagesplan</button>
          <button id="open-complaints">📣 Beschwerden</button>
          <button id="open-visitors">👥 Besucher</button>
          <button id="open-staff">🧑‍💼 Personal</button>
        </div>
        <div class="action-divider"></div>
        <div id="action-group-session" class="action-group" aria-label="Sitzung">
          <button id="toggle-park">🔓 Park schließen</button>
          <button id="toggle-multiplayer" aria-expanded="false">🌐 Mehrspieler</button>
        </div>
        <div class="action-divider"></div>
        <div id="action-group-tools" class="action-group" aria-label="Menüs">
          <div class="debug-menu">
            <button id="toggle-debug-menu" aria-expanded="false">🐞 Debug ▾</button>
            <div id="debug-menu-panel" class="debug-menu-panel panel">
              <button id="debug-money" title="Debug-Geld hinzufügen">💰 +100.000 €</button>
              <button id="debug-remove-cars" title="Besucherautos entfernen">🚗 Autos entfernen & Gäste heimschicken</button>
            </div>
          </div>
          <div class="dropdown-menu">
            <button id="toggle-save-menu" aria-expanded="false" aria-haspopup="true">💾 Spielstand ▾</button>
            <div id="save-menu-panel" class="dropdown-menu-panel panel">
              <button id="save">💾 Schnell speichern</button>
              <button id="save-as" title="Spielstand benennen oder einen vorhandenen überschreiben">💾 Speichern unter …</button>
              <button id="load">📂 Schnell laden</button>
              <button id="save-slots" title="Lokale Spielstände verwalten">🗂️ Spielstände verwalten</button>
              <button id="copy-save" title="Spielstand als Base64 kopieren">⧉ Als Text kopieren</button>
              <button id="paste-save" title="Base64-Spielstand einfügen">📋 Text einfügen</button>
            </div>
          </div>
        </div>
      </div>
    </header>
    <aside id="scenario-panel" class="scenario-panel panel" hidden>
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Szenario</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-scenario" class="panel-close-button" aria-label="Szenario schließen">×</button>
      </div>
      <p class="scenario-hint">Diese Werte gelten für ein neues Spiel und werden mitgespeichert.</p>
      <label class="scenario-field"><span>Umgebung</span><select id="scenario-environment">${Object.entries(ENVIRONMENTS).map(([id, e]) => `<option value="${id}">${e.name}</option>`).join('')}</select></label>
      <p id="scenario-ground-details" class="scenario-hint"></p>
      <label class="scenario-field"><span>Geländeunebenheit <b id="scenario-unevenness-value">50 %</b></span><small>0 %: vollständig flach · 100 %: stark hügelig. Eingang und Zufahrt bleiben eben.</small><input id="scenario-unevenness" type="range" min="0" max="100" step="5" value="50" /></label>
      <label class="scenario-field">
        <span>Autobesucher <b id="scenario-car-value">78%</b></span>
        <small>Fußgänger ← → Autos</small>
        <input id="scenario-car-share" type="range" min="0" max="100" step="1" value="78" />
      </label>
      <label class="scenario-field">
        <span>Party-Affinität <b id="scenario-party-value">55%</b></span>
        <small>ruhig ← → partyaffin</small>
        <input id="scenario-party" type="range" min="0" max="100" step="1" value="55" />
      </label>
      <label class="scenario-field">
        <span>Schönheits-Affinität <b id="scenario-beauty-value">55%</b></span>
        <small>egal ← → schönheitsaffin</small>
        <input id="scenario-beauty" type="range" min="0" max="100" step="1" value="55" />
      </label>
      <label class="scenario-field">
        <span>Gewaltbereitschaft <b id="scenario-aggression-value">28%</b></span>
        <small>friedlich ← → gewaltbereit</small>
        <input id="scenario-aggression" type="range" min="0" max="100" step="1" value="28" />
      </label>
      <label class="scenario-field">
        <span>Startgeld <b id="scenario-money-value">10.000 €</b></span>
        <input id="scenario-money" type="range" min="5000" max="250000" step="5000" value="10000" />
      </label>
      <label class="scenario-field">
        <span>Kartengröße</span>
        <select id="scenario-world-size">
          <option value="32">Klein (32×32)</option>
          <option value="48">Normal (48×48)</option>
          <option value="64">Groß (64×64)</option>
          <option value="80">Sehr groß (80×80)</option>
        </select>
      </label>
      <button id="start-scenario" type="button">Neues Szenario starten</button>
    </aside>
    <aside id="multiplayer-panel" class="multiplayer-panel panel" hidden>
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Mehrspieler</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-multiplayer" class="panel-close-button" aria-label="Mehrspieler schließen">×</button>
      </div>
      <p class="scenario-hint">
        Der Host rechnet die Simulation. Andere Spieler bauen im selben Park mit.
      </p>
      <div class="multiplayer-status-badge" id="multiplayer-status-badge" data-state="solo">
        <span class="status-dot" aria-hidden="true"></span>
        <span id="multiplayer-status">Singleplayer</span>
      </div>
      <label class="scenario-field">
        <span>Name</span>
        <input id="multiplayer-name" type="text" maxlength="24" placeholder="Dein Name" />
      </label>
      <div class="multiplayer-actions" id="multiplayer-connect-actions">
        <button id="multiplayer-host" type="button">Spiel hosten</button>
      </div>
      <label class="scenario-field" id="multiplayer-code-field">
        <span>Raumcode</span>
        <input id="multiplayer-code" type="text" maxlength="4" placeholder="ABCD" />
      </label>
      <div class="multiplayer-actions" id="multiplayer-join-actions">
        <button id="multiplayer-join" type="button">Beitreten</button>
      </div>
      <div id="multiplayer-room" class="multiplayer-room" hidden>
        <strong id="multiplayer-code-display"></strong>
        <small id="multiplayer-join-url"></small>
        <button id="multiplayer-copy" type="button">Code kopieren</button>
        <ul id="multiplayer-players"></ul>
        <button id="multiplayer-leave" type="button">Trennen</button>
      </div>
    </aside>
    <aside id="save-as-panel" class="save-as-panel panel" hidden>
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Spielstand speichern</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-save-as" class="panel-close-button" aria-label="Speichern schließen">×</button>
      </div>
      <p class="scenario-hint" data-save-as-storage>Spielstände werden geladen …</p>
      <form data-save-as class="save-as-form"><label class="scenario-field"><span>Name</span><input name="name" type="text" maxlength="40" placeholder="z. B. Samstagabend" required></label><button>Speichern</button></form>
      <p class="save-slots-message" role="status" data-save-as-message></p>
      <div class="save-slots-list" data-save-as-list></div>
    </aside>
    <aside id="save-slots-panel" class="save-slots-panel panel" hidden>
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Lokale Spielstände</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button data-close class="panel-close-button" aria-label="Spielstände schließen">×</button>
      </div>
      <p class="scenario-hint" data-save-storage>Spielstände werden geladen …</p>
      <form data-save-slot class="save-as-form"><label class="scenario-field"><span>Name</span><input name="name" type="text" maxlength="40" placeholder="z. B. Samstagabend" required></label><button>Neuen Spielstand speichern</button></form>
      <p class="save-slots-message" role="status"></p>
      <div class="save-slots-list"></div>
    </aside>
    <aside id="build-menu" class="build-menu panel" aria-label="Bauwerkzeuge" hidden>
      <div class="build-menu-header panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Bauen</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button data-close-build-menu class="panel-close-button" aria-label="Bauen schließen">×</button>
      </div>
      <div id="path-tools" class="tools"></div>
      <button id="toggle-path-editor" class="path-editor-launch">🛠 Weg-Editor</button>
      <div class="tool-divider"></div>
      <nav class="build-categories" aria-label="Baukategorien">
        <button data-build-category="terrain"><span>⛰</span><em>Gelände</em><b>›</b></button>
        <button data-build-category="supply"><span>🍔</span><em>Versorgung</em><b>›</b></button>
        <button data-build-category="camping"><span>⛺</span><em>Camping</em><b>›</b></button>
        <button data-build-category="rides"><span>🎡</span><em>Attraktionen</em><b>›</b></button>
        <button data-build-category="emergency"><span>🚑</span><em>Notfallversorgung</em><b>›</b></button>
        <button data-build-category="decoration"><span>🌳</span><em>Dekoration</em><b>›</b></button>
        <button data-build-category="festival"><span>🎤</span><em>Festival</em><b>›</b></button>
        <button data-build-category="tech"><span>⚡</span><em>Technik</em><b>›</b></button>
        <button data-build-category="logistics"><span>🚚</span><em>Logistik</em><b>›</b></button>
      </nav>
      <section class="build-flyout panel" data-build-panel="terrain">
        <h3>⛰ Gelände</h3>
        <div class="tools">
          <button class="tool" data-tool="terrainRaise"><span>▲</span><em>Erhöhen<small>8 € je Feld</small></em></button>
          <button class="tool" data-tool="terrainLower"><span>▼</span><em>Senken<small>8 € je Feld</small></em></button>
          <button class="tool" data-tool="terrainFlatten"><span>▬</span><em>Einebnen<small>auf Ebene 0</small></em></button>
        </div>
</section>
      <section class="build-flyout panel" data-build-panel="supply">
        <h3>🍔 Versorgung</h3>
        <div id="supply-tools" class="tools"></div>
      </section>
      <section class="build-flyout panel" data-build-panel="camping">
        <h3>⛺ Camping</h3>
        <div class="tools">
          <button class="tool" data-tool="camping"><span>⛺</span><em>Zeltbereich<small>Gelände ausweisen</small></em><kbd>7</kbd></button>
        </div>
      </section>
      <section class="build-flyout panel" data-build-panel="rides">
        <h3>🎡 Attraktionen</h3>
        <div id="ride-tools" class="tools"></div>
        <button class="tool" data-tool="coaster"><span>🎢</span><em>Achterbahn<small>ab 450 €</small></em><kbd>0</kbd></button>
      </section>
      <section class="build-flyout panel" data-build-panel="emergency">
        <h3>🚑 Notfallversorgung</h3>
        <div id="emergency-tools" class="tools"></div>
        <button class="tool" data-tool="medicalArea"><span>🏥</span><em>Krankenbereich<small>3 Liegen je Feld</small></em></button>
      </section>
      <section class="build-flyout panel" data-build-panel="decoration">
        <h3>🌳 Dekoration</h3>
        <div id="decoration-tools" class="tools"></div>
      </section>
      <section class="build-flyout panel" data-build-panel="festival">
        <h3>🎤 Festivalequipment</h3>
        <div id="festival-tools" class="tools"></div>
        <button class="tool" data-tool="stageForecourt"><span>🎉</span><em>Bühnenvorplatz<small>9 Personen pro Feld</small></em></button>
      </section>
      <section class="build-flyout panel" data-build-panel="tech">
        <h3>⚡ Strom & Showtechnik</h3>
        <div class="tools">
          <button class="tool" data-tool="powerCable"><span>🔌</span><em>Stromkabel<small>18 € je Feld</small></em></button>
        </div>
        <div id="tech-tools" class="tools"></div>
      </section>
      <section class="build-flyout panel" data-build-panel="logistics">
        <h3>Transport & Logistik</h3>
        <div class="logistics-tabs">
          <button class="active" type="button">Straße</button>
        </div>
        <div class="tools logistics-road-tools">
          <button class="tool" data-tool="road"><span>▰</span><em>Straße<small>Linie ziehen</small></em></button>
          <button class="tool" data-tool="wasteDump"><span>🗑️</span><em>Müllablage<small>sehr unattraktiv</small></em></button>
          <button class="tool" data-tool="parkingArea"><span>🅿</span><em>Parkplatz<small>Fläche ziehen</small></em></button>
          <button class="tool" data-tool="roadDirection"><span>➜</span><em>Fahrtrichtung<small>Pfeil setzen</small></em></button>
          <button class="tool" data-tool="roadSeparator"><span>⛔</span><em>Trennlinie<small>Kante sperren</small></em></button>
          <button class="tool" data-tool="crosswalk"><span>▥</span><em>Zebrastreifen</em></button>
          <button class="tool speed-10" data-tool="roadSpeed10"><span>10</span><em>Tempo 10</em></button>
          <button class="tool speed-30" data-tool="roadSpeed30"><span>30</span><em>Tempo 30</em></button>
          <button class="tool speed-50" data-tool="roadSpeed50"><span>50</span><em>Tempo 50</em></button>
        </div>
        <div id="logistics-tools" class="tools"></div>
      </section>
      <label class="park-price" for="entry-price">
        <span>🎟️ Parkeintritt</span>
        <span><input id="entry-price" type="number" min="0" max="1000000" step="1" value="10" /> €</span>
      </label>
      <div class="build-editor">
        <div class="editor-label"><span>Bauhöhe</span><strong id="build-height">Ebene 0</strong></div>
        <div class="editor-buttons">
          <button id="height-down" title="Bauhöhe senken">−</button>
          <button id="height-up" title="Bauhöhe erhöhen">＋</button>
          <button id="rotate-build" title="Gebäude drehen">↻ Drehen</button>
        </div>
        <small id="build-direction">Zugang: ↙</small>
      </div>
      <div class="tool-divider"></div>
      <button class="tool" data-tool="bulldoze"><span>🚜</span><em>Abriss</em><kbd>8</kbd></button>
    </aside>
    <aside id="path-construction" class="path-construction panel" aria-label="Wege-Editor">
      <div class="construction-title">
        <div><small>Konstruktion</small><strong>Wege bauen</strong></div>
        <button id="close-path-editor" aria-label="Editor schließen">×</button>
      </div>
      <p id="construction-status">Wähle einen bestehenden Weg als Startpunkt.</p>
      <section class="rct-editor-section">
        <label>Wegart</label>
        <div class="piece-palette path-type-palette">
          <button data-path-type="normal" class="active" title="Normaler Gehweg"><span>▦</span><small>Gehweg</small></button>
          <button data-path-type="queue" title="Einbahn-Warteschlange"><span>⑂</span><small>Warteschlange</small></button>
        </div>
      </section>
      <select id="path-construction-type" class="editor-native-select" aria-hidden="true" tabindex="-1">
        <option value="normal">Normaler Weg</option>
        <option value="queue">Warteschlange (Einbahn)</option>
      </select>
      <section class="rct-editor-section">
        <label>Richtung</label>
        <div class="direction-control fixed-directions">
          <button data-path-direction="0" title="Richtung wählen"><span>↙</span><small>1</small></button>
          <button data-path-direction="1" title="Richtung wählen"><span>↘</span><small>2</small></button>
          <button data-path-direction="2" title="Richtung wählen"><span>↗</span><small>3</small></button>
          <button data-path-direction="3" title="Richtung wählen"><span>↖</span><small>4</small></button>
        </div>
      </section>
      <section class="rct-editor-section">
        <label>Steigung</label>
        <div class="slope-control">
          <button data-slope="-1" title="Abwärts"><span>↘</span><small>Ab</small></button>
          <button data-slope="0" class="active" title="Ebener Weg"><span>→</span><small>Flach</small></button>
          <button data-slope="1" title="Aufwärts"><span>↗</span><small>Auf</small></button>
        </div>
      </section>
      <section class="rct-editor-section">
        <label>Bewegungsrichtung des gewählten Weges</label>
        <div class="slope-control">
          <button id="path-flow-set" title="Aktuelle Richtung als Einbahnrichtung setzen">⇥ Setzen</button>
          <button id="path-flow-rotate" title="Einbahnrichtung drehen">↻ Drehen</button>
          <button id="path-flow-clear" title="Beschränkung entfernen">↔ Frei</button>
        </div>
      </section>
      <div class="next-piece-preview"><span id="path-piece-preview">▦ ↙ →</span><small>Nächstes Wegstück</small></div>
      <div class="construction-actions">
        <button id="undo-path" class="demolish" disabled><span>🔨</span> Zurück</button>
        <button id="build-path" class="primary" disabled><span>⬇</span> Bauen</button>
      </div>
    </aside>
    <aside id="coaster-builder" class="coaster-builder panel" aria-label="Achterbahn-Editor">
      <div class="construction-title">
        <div><small>Konstruktion</small><strong>Achterbahn bauen</strong></div>
        <button id="close-coaster-builder" aria-label="Editor schließen">×</button>
      </div>
      <p id="coaster-status">Klicke auf das Gelände, um die Startplattform zu bauen.</p>
      <select id="coaster-type" class="coaster-type-select"><option value="classicSteel">🎢 Klassische Stahlachterbahn</option></select>
      <div class="coaster-start-direction">
        <span>Startrichtung</span>
        <button id="coaster-rotate">↻ <b id="coaster-direction">↙</b></button>
      </div>
      <section class="rct-editor-section track-section">
        <label>Richtung und Kurvenradius</label>
        <div id="track-direction-palette" class="piece-palette track-piece-palette"></div>
      </section>
      <section class="rct-editor-section track-section">
        <label>Zielneigung / Station</label>
        <div id="track-slope-palette" class="piece-palette track-slope-palette"></div>
      </section>
      <section class="rct-editor-section track-section">
        <label>Seitliche Neigung</label>
        <div id="track-bank-palette" class="piece-palette track-bank-palette"></div>
      </section>
      <select id="track-piece" class="editor-native-select" aria-hidden="true" tabindex="-1"></select>
      <label class="chain-option"><input id="chain-lift" type="checkbox" /> <span>⛓ Kettenzug auf Steigung</span></label>
      <div class="next-piece-preview coaster-piece-preview">
        <span id="coaster-piece-preview">▰</span>
        <small id="coaster-piece-label">Stationsplattform</small>
      </div>
      <div class="coaster-build-actions">
        <button id="coaster-undo" class="demolish" disabled><span>🔨</span> Zurück</button>
        <button id="coaster-build-piece" class="primary" disabled><span>⬇</span> Bauen</button>
      </div>
      <label class="editor-subheading">Streckenelement auswählen</label>
      <div class="track-navigation">
        <button id="track-previous" disabled title="Vorheriges Element">◀</button>
        <strong id="track-selection">–</strong>
        <button id="track-next" disabled title="Nächstes Element">▶</button>
      </div>
      <button id="delete-track-from-here" class="delete-track" disabled>🔨 Markiertes Element entfernen</button>
      <label class="editor-subheading">Stationszugänge</label>
      <div class="coaster-access-actions">
        <button id="place-coaster-entrance" disabled>🚪 Eingang</button>
        <button id="place-coaster-exit" disabled>🚶 Ausgang</button>
      </div>
    </aside>
    <section class="time-controls panel" aria-label="Zeitsteuerung">
      <button data-speed="0" title="Pause">Ⅱ</button>
      <button data-speed="1" title="Normal">▶</button>
      <button data-speed="2" title="Schnell · 3×">▶▶</button>
      <button data-speed="3" title="Sehr schnell · 8×">▶▶▶</button>
    </section>
    <aside class="crowding-panel panel" aria-label="Gedrängeanzeige">
      <button id="toggle-crowding-overlay" aria-pressed="false">👥 Gedränge-Overlay</button>
      <div><span>Durchschnitt</span><strong id="average-crowding">0%</strong></div>
      <i><u id="average-crowding-bar"></u></i>
      <button id="toggle-attractiveness-overlay" aria-pressed="false">🌿 Attraktivität</button>
      <div><span>Durchschnitt</span><strong id="average-attractiveness">0%</strong></div>
      <i><u id="average-attractiveness-bar"></u></i>
      <button id="toggle-party-overlay" aria-pressed="false">🎵 Partystimmung</button>
      <div><span>Durchschnitt</span><strong id="average-party">0%</strong></div>
      <i><u id="average-party-bar"></u></i>
    </aside>
    <section class="help panel">
      <strong id="context-help">Wähle ein Werkzeug und klicke auf das Gelände.</strong>
      <span>Weg ziehen · Shift+Mausrad: Bauhöhe · R: Gebäude drehen · Q/E: Kamera</span>
    </section>
    <aside id="visitor-panel" class="visitor-panel panel" aria-label="Besucherinformationen">
      <div class="visitor-title">
        <span class="visitor-avatar">👤</span>
        <div><small>Besucher</small><strong id="visitor-name">–</strong></div>
        <button id="close-visitor" aria-label="Fenster schließen">×</button>
      </div>
      <button id="follow-visitor" class="visitor-follow" aria-pressed="false">📍 Besucher verfolgen</button>
      <p id="visitor-thought" class="visitor-thought">„…“</p>
      <div class="visitor-state"><span>Status</span><strong id="visitor-state">–</strong></div>
      <div class="visitor-state"><span>Budget</span><strong id="visitor-budget">–</strong></div>
      <div class="visitor-state"><span>Alkoholverhalten</span><strong id="visitor-alcohol-disposition">–</strong></div>
      <div class="visitor-state"><span>Camping</span><strong id="visitor-camping">–</strong></div>
      <div class="visitor-state"><span>Ticket</span><strong id="visitor-ticket">–</strong></div>
      <div class="visitor-state"><span>Musikgeschmack</span><strong id="visitor-music">–</strong></div><div class="visitor-state"><span>Zielgruppe</span><strong id="visitor-audience">–</strong></div>
      <div class="visitor-state"><span>Schlafrhythmus</span><strong id="visitor-sleep-rhythm">–</strong></div>
      <div class="visitor-state"><span>Lokales Gedränge</span><strong id="visitor-crowding">0%</strong></div>
      <div class="visitor-state"><span>Attraktivität</span><strong id="visitor-attractiveness">0%</strong></div>
      <div class="visitor-state"><span>Partystimmung</span><strong id="visitor-party">0%</strong></div>
      <div class="visitor-state"><span>Vorlieben</span><strong id="visitor-preferences">–</strong></div>
      <section class="visitor-inventory">
        <span>Inventar</span>
        <div id="visitor-inventory">Leer</div>
      </section>
      <div class="needs">
        <div><label><span>🍔 Sättigung</span><b id="hunger-value">0%</b></label><i><u id="hunger-bar"></u></i></div>
        <div><label><span>🚻 Toilette</span><b id="toilet-value">0%</b></label><i><u id="toilet-bar"></u></i></div>
        <div><label><span>🎉 Spaß</span><b id="fun-value">0%</b></label><i><u id="fun-bar"></u></i></div>
        <div><label><span>⚡ Energie</span><b id="energy-value">0%</b></label><i><u id="energy-bar"></u></i></div>
        <div><label><span>🍺 Alkoholpegel</span><b id="alcohol-value">0%</b></label><i><u id="alcohol-bar"></u></i></div>
        <div><label><span>🤢 Übelkeit</span><b id="nausea-value">0%</b></label><i><u id="nausea-bar"></u></i></div>
        <div><label><span>🎪 Festivallust</span><b id="motivation-value">100%</b></label><i><u id="motivation-bar"></u></i></div>
      </div>
    </aside>
    <aside id="entity-panel" class="entity-panel panel" aria-label="Objektinformationen" hidden>
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title"><span id="entity-icon">🏗️</span> <span id="entity-name">–</span></h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-entity" class="panel-close-button" aria-label="Fenster schließen">×</button>
      </div>
      <p class="scenario-hint" id="entity-type">Objekt</p>
      <nav id="entity-tabs" class="entity-tabs">
        <button data-entity-tab="overview" class="active">Übersicht</button>
        <button data-entity-tab="dynamics">Fahrdynamik</button>
      </nav>
      <section id="entity-overview">
        <p id="entity-status" class="visitor-thought">–</p>
        <div id="entity-stats" class="entity-stats"></div>
        <div id="price-options" class="coaster-options">
          <label for="entity-price">Preis pro Besucher</label>
          <div class="price-input"><input id="entity-price" type="number" min="0" max="1000000" step="1" /> <b>€</b></div>
        </div>
        <div id="coaster-options" class="coaster-options">
          <label for="operation-mode">Betriebsmodus</label>
          <select id="operation-mode">
            <option value="closed">Geschlossen</option>
            <option value="open">Geöffnet</option>
            <option value="test">Testbetrieb</option>
          </select>
          <div class="entity-action-row">
            <button id="recall-train">↩ Wagen zurückholen</button>
            <button id="edit-coaster-track">🛠 Strecke bearbeiten</button>
          </div>
          <label for="dispatch-mode">Abfahrt</label>
          <select id="dispatch-mode">
            <option value="full-or-timed">Voll oder nach Wartezeit</option>
            <option value="full-only">Nur wenn voll</option>
            <option value="timed">Nach fester Wartezeit</option>
          </select>
          <label for="dispatch-interval">Maximale Wartezeit: <b id="dispatch-value">30 min</b></label>
          <input id="dispatch-interval" type="range" min="5" max="120" step="5" value="30" />
        </div>
        <div id="security-options" class="coaster-options">
          <label for="security-thoroughness">Kontrollgründlichkeit: <b id="security-thoroughness-value">50%</b></label>
          <input id="security-thoroughness" type="range" min="0" max="100" step="5" value="50" />
          <label>Verbotene Gegenstände</label>
          <div id="security-prohibited-items" class="security-items"></div>
          <p id="security-staffing">Unbesetzt</p>
        </div>
      </section>
      <section id="entity-dynamics" class="entity-dynamics">
        <div id="dynamics-safety" class="dynamics-safety">Noch keine Messfahrt</div>
        <div id="dynamics-stats" class="dynamics-stats"></div>
        <div class="telemetry-chart">
          <canvas id="telemetry-chart" width="560" height="280"></canvas>
        </div>
        <div class="telemetry-legend">
          <span class="vertical">Vertikal-G</span>
          <span class="lateral">Seiten-G</span>
          <span class="longitudinal">Längs-G</span>
        </div>
        <p id="dynamics-info" class="dynamics-info"></p>
      </section>
    </aside>
    <aside id="day-plan-panel" class="day-plan-panel panel" aria-label="Tagesplanung">
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Tagesplan</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-day-plan" class="panel-close-button" aria-label="Tagesplan schließen">×</button>
      </div>
      <div class="festival-cycle-controls">
        <label>Vorlauf <input id="festival-lead-days" type="number" min="0" max="14" /></label>
        <label>Festival <input id="festival-active-days" type="number" min="1" max="14" /></label>
        <label>Pause <input id="festival-break-days" type="number" min="1" max="30" /></label>
        <label>Camping-Abschlag <input id="camping-capacity-buffer" type="number" min="0" max="50" />%</label>
        <button id="apply-festival-cycle">Zyklus übernehmen</button>
      </div>
      <div id="festival-cycle-strip" class="festival-cycle-strip"></div>
      <small id="camping-capacity-summary" class="camping-capacity-summary"></small>
      <div class="day-visitor-window">
        <label>Tagesgäste ab <select id="day-entry-hour"></select></label>
        <label>müssen gehen bis <select id="day-exit-hour"></select></label>
        <small>Mindestens eine Stunde täglich bleibt für Tagesgäste geschlossen.</small>
      </div>
      <div class="day-plan-scroll">
        <div id="day-plan-grid" class="day-plan-grid"></div>
      </div>
      <p id="day-plan-status" class="day-plan-status"></p>
    </aside>
    <aside id="complaints-panel" class="complaints-panel panel" aria-label="Beschwerdemanagement">
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Beschwerden</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-complaints" class="panel-close-button" aria-label="Beschwerden schließen">×</button>
      </div>
      <p id="complaints-summary" class="complaints-summary"></p>
      <div class="complaints-head"><span>Thema</span><b>Aktuell</b><b>Letztes Festival</b></div>
      <div id="complaints-list" class="complaints-list"></div>
    </aside>
    <aside id="visitor-overview-panel" class="visitor-overview-panel panel" aria-label="Besucherübersicht">
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Alle Besucher</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-visitor-overview" class="panel-close-button" aria-label="Besucherübersicht schließen">×</button>
      </div>
      <div class="visitor-overview-controls">
        <input id="visitor-thought-filter" type="search" placeholder="Gedanken durchsuchen …" />
        <select id="visitor-overview-sort" aria-label="Besucher sortieren">
          <option value="thought">Gedanke</option>
          <option value="energy">Energie</option>
          <option value="alcohol">Alkohol</option>
          <option value="motivation">Festivallust</option>
          <option value="fun">Spaß</option>
          <option value="nausea">Übelkeit</option>
          <option value="crowding">Gedränge</option>
          <option value="attractiveness">Attraktivität</option>
          <option value="party">Partystimmung</option>
          <option value="name">Name</option>
        </select>
        <button id="visitor-sort-direction" title="Sortierrichtung">↓</button>
      </div>
      <div id="visitor-overview-summary" class="visitor-overview-summary"></div>
      <div class="visitor-overview-table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Gedanke</th><th>Status</th><th>Energie</th><th>Alkohol</th><th>Lust</th></tr></thead>
          <tbody id="visitor-overview-list"></tbody>
        </table>
      </div>
      <div class="visitor-overview-pages">
        <button id="visitor-page-previous">‹</button>
        <span id="visitor-page-label">Seite 1 / 1</span>
        <button id="visitor-page-next">›</button>
      </div>
    </aside>
    <aside id="staff-panel" class="staff-panel panel" aria-label="Personalverwaltung">
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Eingestelltes Personal</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-staff" class="panel-close-button" aria-label="Personal schließen">×</button>
      </div>
      <div id="staff-list" class="staff-list"></div>
    </aside>
    <aside id="logistics-panel" class="day-plan-panel panel logistics-panel" aria-label="Logistikverwaltung">
      <div class="panel-header">
        <span class="panel-drag-line" aria-hidden="true"></span>
        <h2 class="panel-header-title">Transport & Logistik</h2>
        <span class="panel-drag-line" aria-hidden="true"></span>
        <button id="close-logistics" class="panel-close-button" aria-label="Logistik schließen">×</button>
      </div>
      <div class="logistics-management-tabs">
        <button data-logistics-tab="overview" class="active">Übersicht</button>
        <button data-logistics-tab="routes">Buslinien</button>
      </div>
      <section id="logistics-overview"></section>
      <section id="logistics-routes" hidden>
        <div class="line-editor">
          <label>Name <input id="bus-line-name" value="Festival-Shuttle" /></label>
          <label>Depot <select id="bus-line-depot"></select></label>
          <label>Busse <input id="bus-line-count" type="number" min="1" max="3" value="1" /></label>
          <label>Takt <input id="bus-line-headway" type="number" min="2" max="120" value="15" /> Min.</label>
          <label>Haltestellen <select id="bus-line-stops" multiple size="5"></select></label>
          <button id="create-bus-line" class="primary">Linie anlegen</button>
        </div>
        <div id="bus-lines-list"></div>
      </section>
    </aside>
    <div id="toast" role="status" aria-live="polite"></div>
  </main>
`

// .game-actions wraps onto extra rows whenever the buttons don't fit on one
// line, so .topbar grows taller than the fixed "top" offsets .build-menu /
// .crowding-panel use assume. Track the topbar's real rendered height and
// expose it as a CSS variable so those panels always start below it,
// however many rows it currently wraps to.
const topbarElement = requireElement<HTMLElement>('.topbar')
new ResizeObserver(([entry]) => {
  const bottom = entry!.target.getBoundingClientRect().bottom
  document.documentElement.style.setProperty('--topbar-gap-top', `${Math.round(bottom + 12)}px`)
}).observe(topbarElement)

const pathTools = requireElement<HTMLDivElement>('#path-tools')
const supplyTools = requireElement<HTMLDivElement>('#supply-tools')
const rideTools = requireElement<HTMLDivElement>('#ride-tools')
const emergencyTools = requireElement<HTMLDivElement>('#emergency-tools')
const decorationTools = requireElement<HTMLDivElement>('#decoration-tools')
const festivalTools = requireElement<HTMLDivElement>('#festival-tools')
const techTools = requireElement<HTMLDivElement>('#tech-tools')
const logisticsTools = requireElement<HTMLDivElement>('#logistics-tools')

Object.values(BUILDINGS).forEach((building, index) => {
  const container =
    building.kind === 'path'
      ? pathTools
      : building.kind === 'securityGate' ||
          building.kind === 'ambulanceGarage'
        ? emergencyTools
      : building.kind === 'busStop' ||
          building.kind === 'busDepot' ||
          building.kind === 'wasteDepot' ||
          building.kind === 'wasteBin'
        ? logisticsTools
      : building.kind === 'ride'
        ? rideTools
        : ['tree', 'hedge', 'fence', 'bench', 'lighting'].includes(building.kind)
          ? decorationTools
          : ['stage', 'directionalSpeaker', 'omniSpeaker'].includes(building.kind)
            ? festivalTools
          : [
                'generator',
                'backupGenerator',
                'foh',
                'delayTower',
                'videoWall',
                'laserShow',
                'fireworkBattery',
              ].includes(building.kind)
            ? techTools
        : supplyTools
  container.insertAdjacentHTML(
    'beforeend',
    `<button class="tool" data-tool="${building.kind}">
      <span>${building.icon}</span>
      <em>${building.name}<small>${formatMoney(building.cost)}</small></em>
      <kbd>${index + 1}</kbd>
    </button>`,
  )
})

const trackPieceSelect = requireElement<HTMLSelectElement>('#track-piece')
const trackDirectionPalette = requireElement<HTMLElement>('#track-direction-palette')
const trackSlopePalette = requireElement<HTMLElement>('#track-slope-palette')
const trackBankPalette = requireElement<HTMLElement>('#track-bank-palette')
const TRACK_PIECE_ICONS: Record<TrackPieceKind, string> = {
  station: '▰',
  straight: '↑',
  slopeGentleUp: '⤴',
  slopeUp: '↗',
  slopeGentleDown: '⤵',
  slopeDown: '↘',
  pitchTransition: '⌁',
  bankTransition: '⤨',
  curveLeft1: '↰¹',
  curveRight1: '↱¹',
  curveLeft2: '↰²',
  curveRight2: '↱²',
  curveLeft3: '↰³',
  curveRight3: '↱³',
  curveLeft4: '↰⁴',
  curveRight4: '↱⁴',
}
COASTER_TYPES.classicSteel.supportedPieces.forEach((kind) => {
  const piece = TRACK_PIECES[kind]
  trackPieceSelect.insertAdjacentHTML(
    'beforeend',
    `<option value="${kind}">${piece.name} · ${formatMoney(piece.cost)}</option>`,
  )
})

const TRACK_DIRECTION_ORDER: TrackPieceKind[] = [
  'curveLeft4',
  'curveLeft3',
  'curveLeft2',
  'curveLeft1',
  'straight',
  'curveRight1',
  'curveRight2',
  'curveRight3',
  'curveRight4',
]
function populateTrackPalette(palette: HTMLElement, kinds: TrackPieceKind[]): void {
  kinds.forEach((kind) => {
    const piece = TRACK_PIECES[kind]
  palette.insertAdjacentHTML(
    'beforeend',
    `<button data-track-piece="${kind}" title="${piece.name} · ${formatMoney(piece.cost)}">
      <span>${TRACK_PIECE_ICONS[kind]}</span><small>${piece.station ? 'Station' : piece.radius ? `${piece.radius}×${piece.radius}` : 'Gerade'}</small>
    </button>`,
  )
  })
}

populateTrackPalette(trackDirectionPalette, TRACK_DIRECTION_ORDER)
trackSlopePalette.innerHTML = `
  <button data-track-pitch="${TRACK_PITCHES.steepDown}" title="Steil abwärts"><span>⇘</span><small>Steil ab</small></button>
  <button data-track-pitch="${TRACK_PITCHES.gentleDown}" title="Sanft abwärts"><span>↘</span><small>Sanft ab</small></button>
  <button data-track-pitch="0" title="Flach"><span>→</span><small>Flach</small></button>
  <button data-track-pitch="${TRACK_PITCHES.gentleUp}" title="Sanft aufwärts"><span>↗</span><small>Sanft auf</small></button>
  <button data-track-pitch="${TRACK_PITCHES.steepUp}" title="Steil aufwärts"><span>⇗</span><small>Steil auf</small></button>
  <button data-track-piece="station" title="Stationsplattform"><span>▰</span><small>Station</small></button>
`
trackBankPalette.innerHTML = `
  <button data-track-bank="${-TRACK_BANK_ANGLE}" title="Neigung links einleiten"><span>◢</span><small>Links</small></button>
  <button data-track-bank="0" title="Seitliche Neigung ausleiten"><span>━</span><small>Neutral</small></button>
  <button data-track-bank="${TRACK_BANK_ANGLE}" title="Neigung rechts einleiten"><span>◣</span><small>Rechts</small></button>
`

const canvas = requireElement<HTMLCanvasElement>('#game-canvas')
const money = requireElement<HTMLElement>('#money')
const guests = requireElement<HTMLElement>('#guests')
const reputation = requireElement<HTMLElement>('#reputation')
const power = requireElement<HTMLElement>('#power')
const waste = requireElement<HTMLElement>('#waste')
const date = requireElement<HTMLElement>('#date')
const toggleParkButton = requireElement<HTMLButtonElement>('#toggle-park')
const crowdingOverlayButton =
  requireElement<HTMLButtonElement>('#toggle-crowding-overlay')
const averageCrowding = requireElement<HTMLElement>('#average-crowding')
const averageCrowdingBar = requireElement<HTMLElement>('#average-crowding-bar')
const attractivenessOverlayButton =
  requireElement<HTMLButtonElement>('#toggle-attractiveness-overlay')
const partyOverlayButton =
  requireElement<HTMLButtonElement>('#toggle-party-overlay')
const averageAttractiveness =
  requireElement<HTMLElement>('#average-attractiveness')
const averageAttractivenessBar =
  requireElement<HTMLElement>('#average-attractiveness-bar')
const averageParty = requireElement<HTMLElement>('#average-party')
const averagePartyBar = requireElement<HTMLElement>('#average-party-bar')
const contextHelp = requireElement<HTMLElement>('#context-help')
const toast = requireElement<HTMLElement>('#toast')
const visitorPanel = requireElement<HTMLElement>('#visitor-panel')
const visitorName = requireElement<HTMLElement>('#visitor-name')
const visitorThought = requireElement<HTMLElement>('#visitor-thought')
const visitorState = requireElement<HTMLElement>('#visitor-state')
const visitorBudget = requireElement<HTMLElement>('#visitor-budget')
const visitorAlcoholDisposition = requireElement<HTMLElement>('#visitor-alcohol-disposition')
const visitorCamping = requireElement<HTMLElement>('#visitor-camping')
const visitorTicket = requireElement<HTMLElement>('#visitor-ticket')
const visitorSleepRhythm =
  requireElement<HTMLElement>('#visitor-sleep-rhythm')
const visitorInventory = requireElement<HTMLElement>('#visitor-inventory')
const visitorCrowding = requireElement<HTMLElement>('#visitor-crowding')
const visitorAttractiveness =
  requireElement<HTMLElement>('#visitor-attractiveness')
const visitorParty = requireElement<HTMLElement>('#visitor-party')
const visitorPreferences = requireElement<HTMLElement>('#visitor-preferences')
const entryPriceInput = requireElement<HTMLInputElement>('#entry-price')
const buildHeight = requireElement<HTMLElement>('#build-height')
const buildDirection = requireElement<HTMLElement>('#build-direction')
const pathConstruction = requireElement<HTMLElement>('#path-construction')
const constructionStatus = requireElement<HTMLElement>('#construction-status')
const pathPiecePreview = requireElement<HTMLElement>('#path-piece-preview')
const buildPathButton = requireElement<HTMLButtonElement>('#build-path')
const undoPathButton = requireElement<HTMLButtonElement>('#undo-path')
const pathFlowSetButton = requireElement<HTMLButtonElement>('#path-flow-set')
const pathFlowRotateButton = requireElement<HTMLButtonElement>('#path-flow-rotate')
const pathFlowClearButton = requireElement<HTMLButtonElement>('#path-flow-clear')
const pathConstructionTypeSelect =
  requireElement<HTMLSelectElement>('#path-construction-type')
const coasterBuilder = requireElement<HTMLElement>('#coaster-builder')
const coasterStatus = requireElement<HTMLElement>('#coaster-status')
const coasterDirection = requireElement<HTMLElement>('#coaster-direction')
const coasterPiecePreview = requireElement<HTMLElement>('#coaster-piece-preview')
const coasterPieceLabel = requireElement<HTMLElement>('#coaster-piece-label')
const coasterRotateButton = requireElement<HTMLButtonElement>('#coaster-rotate')
const coasterBuildButton = requireElement<HTMLButtonElement>('#coaster-build-piece')
const coasterUndoButton = requireElement<HTMLButtonElement>('#coaster-undo')
const coasterEntranceButton = requireElement<HTMLButtonElement>('#place-coaster-entrance')
const coasterExitButton = requireElement<HTMLButtonElement>('#place-coaster-exit')
const chainLiftInput = requireElement<HTMLInputElement>('#chain-lift')
const trackPreviousButton = requireElement<HTMLButtonElement>('#track-previous')
const trackNextButton = requireElement<HTMLButtonElement>('#track-next')
const trackSelection = requireElement<HTMLElement>('#track-selection')
const deleteTrackButton = requireElement<HTMLButtonElement>('#delete-track-from-here')
const entityPanel = requireElement<HTMLElement>('#entity-panel')
const entityIcon = requireElement<HTMLElement>('#entity-icon')
const entityType = requireElement<HTMLElement>('#entity-type')
const entityName = requireElement<HTMLElement>('#entity-name')
const entityStatus = requireElement<HTMLElement>('#entity-status')
const entityStats = requireElement<HTMLElement>('#entity-stats')
const entityTabs = requireElement<HTMLElement>('#entity-tabs')
const entityOverview = requireElement<HTMLElement>('#entity-overview')
const entityDynamics = requireElement<HTMLElement>('#entity-dynamics')
const dynamicsSafety = requireElement<HTMLElement>('#dynamics-safety')
const dynamicsStats = requireElement<HTMLElement>('#dynamics-stats')
const dynamicsInfo = requireElement<HTMLElement>('#dynamics-info')
const telemetryChart = requireElement<HTMLCanvasElement>('#telemetry-chart')
const priceOptions = requireElement<HTMLElement>('#price-options')
const entityPriceInput = requireElement<HTMLInputElement>('#entity-price')
const coasterOptions = requireElement<HTMLElement>('#coaster-options')
const dispatchModeSelect = requireElement<HTMLSelectElement>('#dispatch-mode')
const dispatchIntervalInput = requireElement<HTMLInputElement>('#dispatch-interval')
const dispatchValue = requireElement<HTMLElement>('#dispatch-value')
const operationModeSelect = requireElement<HTMLSelectElement>('#operation-mode')
const securityOptions = requireElement<HTMLElement>('#security-options')
const securityThoroughness =
  requireElement<HTMLInputElement>('#security-thoroughness')
const securityThoroughnessValue =
  requireElement<HTMLElement>('#security-thoroughness-value')
const securityProhibitedItems =
  requireElement<HTMLElement>('#security-prohibited-items')
const securityStaffing = requireElement<HTMLElement>('#security-staffing')
const staffPanel = requireElement<HTMLElement>('#staff-panel')
const staffList = requireElement<HTMLElement>('#staff-list')
const visitorOverviewPanel =
  requireElement<HTMLElement>('#visitor-overview-panel')
const dayPlanPanel = requireElement<HTMLElement>('#day-plan-panel')
const dayPlanGrid = requireElement<HTMLElement>('#day-plan-grid')
const dayPlanStatus = requireElement<HTMLElement>('#day-plan-status')
const dayEntryHour = requireElement<HTMLSelectElement>('#day-entry-hour')
const dayExitHour = requireElement<HTMLSelectElement>('#day-exit-hour')
const festivalLeadDays =
  requireElement<HTMLInputElement>('#festival-lead-days')
const festivalActiveDays =
  requireElement<HTMLInputElement>('#festival-active-days')
const festivalBreakDays =
  requireElement<HTMLInputElement>('#festival-break-days')
const festivalCycleStrip =
  requireElement<HTMLElement>('#festival-cycle-strip')
const campingCapacityBuffer =
  requireElement<HTMLInputElement>('#camping-capacity-buffer')
const campingCapacitySummary =
  requireElement<HTMLElement>('#camping-capacity-summary')
const complaintsPanel = requireElement<HTMLElement>('#complaints-panel')
const complaintsSummary = requireElement<HTMLElement>('#complaints-summary')
const complaintsList = requireElement<HTMLElement>('#complaints-list')
const logisticsPanel = requireElement<HTMLElement>('#logistics-panel')
for (const panel of [staffPanel, visitorOverviewPanel, dayPlanPanel, complaintsPanel, logisticsPanel]) {
  makeDraggable(panel.querySelector<HTMLElement>('.panel-header')!, panel)
  makeResizable(panel)
}
const logisticsOverview = requireElement<HTMLElement>('#logistics-overview')
const logisticsRoutes = requireElement<HTMLElement>('#logistics-routes')
const busLineDepot = requireElement<HTMLSelectElement>('#bus-line-depot')
const busLineStops = requireElement<HTMLSelectElement>('#bus-line-stops')
const busLinesList = requireElement<HTMLElement>('#bus-lines-list')
const visitorOverviewList =
  requireElement<HTMLElement>('#visitor-overview-list')
const visitorOverviewSummary =
  requireElement<HTMLElement>('#visitor-overview-summary')
const visitorThoughtFilter =
  requireElement<HTMLInputElement>('#visitor-thought-filter')
const visitorOverviewSort =
  requireElement<HTMLSelectElement>('#visitor-overview-sort')
const visitorSortDirection =
  requireElement<HTMLButtonElement>('#visitor-sort-direction')
const visitorPagePrevious =
  requireElement<HTMLButtonElement>('#visitor-page-previous')
const visitorPageNext =
  requireElement<HTMLButtonElement>('#visitor-page-next')
const visitorPageLabel = requireElement<HTMLElement>('#visitor-page-label')
const followVisitorButton = requireElement<HTMLButtonElement>('#follow-visitor')
const multiplayerToggle = requireElement<HTMLButtonElement>('#toggle-multiplayer')
const multiplayerPanel = requireElement<HTMLElement>('#multiplayer-panel')
const multiplayerStatusBadge = requireElement<HTMLElement>('#multiplayer-status-badge')
const multiplayerStatus = requireElement<HTMLElement>('#multiplayer-status')
const multiplayerName = requireElement<HTMLInputElement>('#multiplayer-name')
const multiplayerCode = requireElement<HTMLInputElement>('#multiplayer-code')
const multiplayerHostButton = requireElement<HTMLButtonElement>('#multiplayer-host')
const multiplayerJoinButton = requireElement<HTMLButtonElement>('#multiplayer-join')
const multiplayerLeaveButton = requireElement<HTMLButtonElement>('#multiplayer-leave')
const multiplayerCopyButton = requireElement<HTMLButtonElement>('#multiplayer-copy')
const multiplayerRoom = requireElement<HTMLElement>('#multiplayer-room')
const multiplayerCodeDisplay = requireElement<HTMLElement>('#multiplayer-code-display')
const multiplayerJoinUrl = requireElement<HTMLElement>('#multiplayer-join-url')
const multiplayerPlayers = requireElement<HTMLElement>('#multiplayer-players')
const multiplayerConnectActions = requireElement<HTMLElement>(
  '#multiplayer-connect-actions',
)
const multiplayerCodeField = requireElement<HTMLElement>('#multiplayer-code-field')
const multiplayerJoinActions = requireElement<HTMLElement>('#multiplayer-join-actions')

const MULTIPLAYER_NAME_KEY = 'festival-mp-name'

let game = new GameState()
const festivalUI = mountFestivalUI(() => game, showToast)
const stageEditor = mountStageEditor(() => game, showToast)
const stageEditorButton = document.createElement('button')
stageEditorButton.textContent = '🎭 Bühnenwerkstatt'; stageEditorButton.addEventListener('click',()=>stageEditor.open())
document.querySelector('#action-group-festival')!.append(stageEditorButton)
const editStageButton = document.createElement('button')
editStageButton.textContent='Bühne gestalten';editStageButton.hidden=true
entityOverview.append(editStageButton)
editStageButton.addEventListener('click',()=>{if(selectedEntity?.type==='building')stageEditor.open(selectedEntity.id)})
const multiplayer = new MultiplayerSession(game)
let hoveredCell: CellPosition | null = null
let selectedVisitorId: string | null = null
let followedVisitorId: string | null = null
let staffPanelFingerprint = ''
let visitorOverviewFingerprint = ''
let dayPlanFingerprint = ''
let complaintsFingerprint = ''
let logisticsFingerprint = ''
let visitorOverviewPage = 0
let visitorOverviewAscending = false

const hourOptions = Array.from(
  { length: 24 },
  (_, hour) =>
    `<option value="${hour}">${String(hour).padStart(2, '0')}:00</option>`,
).join('')
dayEntryHour.innerHTML = hourOptions
dayExitHour.innerHTML = hourOptions
let securityItemsFingerprint = ''
let bulldozeBrushSize = 1
let pathEditorActive = false
let pathAnchor: PathAnchor | null = null
let pathDirection = 0
let pathSlope: -1 | 0 | 1 = 0
let pathConstructionType: 'normal' | 'queue' = 'normal'
let pathHistory: Array<{
  from: PathAnchor
  to: PathAnchor
  previousPath?: PlacedBuilding
}> = []
let dragPathStart: CellPosition | null = null
let dragPathEnd: CellPosition | null = null
let dragPathElevation = 0
let cameraQuarter = 0
let coasterBuilderActive = false
let activeCoasterId: string | null = null
let coasterStartCandidate: CellPosition | null = null
let coasterEditIndex = -1
let coasterAccessMode: 'entrance' | 'exit' | null = null
let coasterTargetPitch = 0
let coasterTargetBank = 0
let selectedEntity: { type: 'building' | 'coaster'; id: string } | null = null
let entityTab: 'overview' | 'dynamics' = 'overview'
let unsubscribe: () => void = () => {}
let toastTimer = 0
let crowdingOverlayVisible = false
let attractivenessOverlayVisible = false
let partyOverlayVisible = false

const view = new WorldView(
  canvas,
  (cell) => handleCellClick(cell),
  (cell) => {
    hoveredCell = cell
    updateContextHelp()
  },
  (visitorId) => selectVisitor(visitorId),
  (cell) => paintPath(cell),
  (delta) => {
    if (pathEditorActive) {
      setPathSlope(pathSlope + delta)
    } else {
      game.adjustBuildElevation(delta)
    }
  },
  (cell) => startPathDrag(cell),
  () => finishPathDrag(),
  (coasterId, pieceIndex) => {
    if (!coasterBuilderActive) return
    const coaster = game.getCoaster(coasterId)
    if (!coaster) return
    activeCoasterId = coasterId
    coasterStartCandidate = null
    coasterEditIndex = Math.max(0, Math.min(coaster.pieces.length - 1, pieceIndex))
    coasterTargetPitch = coaster.pieces[coasterEditIndex]?.end.pitch ?? 0
    coasterTargetBank = coaster.pieces[coasterEditIndex]?.end.bank ?? 0
    trackPieceSelect.value = getConstantPitchPiece(coasterTargetPitch)
    updateCoasterBuilder()
    showToast(`Bauanker auf Element ${coasterEditIndex + 1} gesetzt`)
  },
)

const supplyPlanner = mountLogisticsUI(() => game, view, showToast)
const staffDetails = mountStaffDetails(() => game, view, showToast, () => supplyPlanner.releaseTool())

function bindGameState(nextGame: GameState): void {
  unsubscribe()
  game = nextGame
  enableMultiplayerCommands(game)
  multiplayer.attach(game)
  view.invalidate()
  unsubscribe = game.subscribe((snapshot) => {
    const stageTool = document.querySelector<HTMLElement>('[data-tool="stage"] em')
    const template = snapshot.festival.stageTemplates?.find(t=>t.name===snapshot.festival.selectedStageTemplate)
    const label = `${template ? escapeHtml(template.name) : 'Festivalbühne'}<small>${formatMoney(BUILDINGS.stage.cost+(template?stageStats(template).cost:0))}</small>`
    if(stageTool && stageTool.innerHTML!==label)stageTool.innerHTML=label

    festivalUI.update(snapshot)
    supplyPlanner.update(snapshot)
    staffDetails.update(snapshot)
    money.textContent = formatMoney(snapshot.money)
    if (document.activeElement !== entryPriceInput) {
      entryPriceInput.value = String(snapshot.entryPrice)
    }
    guests.textContent = snapshot.guests.toLocaleString('de-DE')
    reputation.textContent = `${snapshot.reputation}%`
    const powerDemand = Math.round(snapshot.power.demand)
    const powerSupply = Math.round(snapshot.power.supply)
    const hasPlant = snapshot.buildings.some(
      (building) =>
        building.kind === 'generator' || building.kind === 'backupGenerator',
    )
    const litterPiles = snapshot.incidents.filter(
      (incident) => incident.kind === 'litter',
    ).length
    const dumpedWaste = (snapshot.wasteDumpCells ?? []).reduce(
      (total, cell) => total + cell.stored,
      0,
    )
    waste.textContent = `${litterPiles}/${dumpedWaste}`
    power.textContent = hasPlant
      ? `${powerDemand}/${powerSupply} kW${snapshot.power.backupActive ? ' +Notstrom' : ''}`
      : `${powerDemand} kW`
    power.parentElement?.classList.toggle(
      'power-short',
      hasPlant && powerDemand > powerSupply,
    )
    const hour = Math.floor(snapshot.minute / 60)
    const dayPhaseIcon =
      hour < 5 || hour >= 22 ? '🌙' : hour < 8 || hour >= 19 ? '🌅' : '☀️'
    const festivalPhase = getFestivalCycleStatus(
      snapshot.dayPlan,
      snapshot.day,
    )
    const festivalPhaseLabel = {
      lead: 'Vorlauf',
      festival: 'Festival',
      break: 'Pause',
    }[festivalPhase.phase]
    date.textContent = snapshot.festival.planning ? 'Planung · Festival noch nicht gestartet' :
      `${dayPhaseIcon} Tag ${snapshot.day} · ${festivalPhaseLabel} ${festivalPhase.phaseDay}/${festivalPhase.phaseLength} · ${formatTime(snapshot.minute)}`
    toggleParkButton.textContent = snapshot.parkOpen ? '🔓 Park schließen' : snapshot.festival.planning || snapshot.festival.finished ? '🔒 Gelände eröffnen' : '🔒 Park öffnen'
    toggleParkButton.disabled = Boolean(snapshot.festival.planning || snapshot.festival.finished)
    toggleParkButton.title = toggleParkButton.disabled ? 'Start über das Festivalmenü' : ''
    toggleParkButton.classList.toggle('park-closed', !snapshot.parkOpen)
    const crowdingAverage = Math.round(snapshot.crowding.average)
    averageCrowding.textContent = `${crowdingAverage}%`
    averageCrowdingBar.style.width = `${crowdingAverage}%`
    averageCrowdingBar.dataset.level =
      crowdingAverage >= 70 ? 'critical' : crowdingAverage >= 35 ? 'warning' : 'good'
    const attractivenessAverage = Math.round(snapshot.attractiveness.average)
    averageAttractiveness.textContent = `${attractivenessAverage}%`
    averageAttractivenessBar.style.width = `${Math.max(0, attractivenessAverage)}%`
    averageAttractivenessBar.dataset.level =
      attractivenessAverage < 0
        ? 'critical'
        : attractivenessAverage < 25
          ? 'warning'
          : 'good'
    const partyAverage = Math.round(snapshot.partyMood.average)
    averageParty.textContent = `${partyAverage}%`
    averagePartyBar.style.width = `${Math.max(0, partyAverage)}%`
    averagePartyBar.dataset.level =
      partyAverage >= 55 ? 'good' : partyAverage >= 20 ? 'warning' : 'critical'
    buildHeight.textContent = `Ebene ${snapshot.buildElevation}`
    buildDirection.textContent = `Zugang: ${getIsoDirectionIcon(snapshot.buildRotation)}`
    document.querySelectorAll<HTMLElement>('[data-tool]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tool === snapshot.selectedTool)
    })
    const activeCategory =
      snapshot.selectedTool === 'food' ||
            snapshot.selectedTool === 'toilet' ||
            snapshot.selectedTool === 'alcohol'
        ? 'supply'
        : snapshot.selectedTool === 'camping'
          ? 'camping'
          : snapshot.selectedTool === 'ride' || snapshot.selectedTool === 'coaster'
            ? 'rides'
            : snapshot.selectedTool === 'medicalArea' ||
                snapshot.selectedTool === 'securityGate'
              ? 'emergency'
              : ['tree', 'hedge', 'fence', 'bench', 'lighting'].includes(
                    snapshot.selectedTool,
                  )
                ? 'decoration'
                : [
                      'stage',
                      'directionalSpeaker',
                      'omniSpeaker',
                      'stageForecourt',
                    ].includes(snapshot.selectedTool)
                  ? 'festival'
                  : snapshot.selectedTool === 'powerCable' ||
                      [
                        'generator',
                        'backupGenerator',
                        'foh',
                        'delayTower',
                        'videoWall',
                        'laserShow',
                        'fireworkBattery',
                      ].includes(snapshot.selectedTool)
                    ? 'tech'
                  : [
                        'road',
                        'parkingArea',
                        'roadDirection',
                        'roadSeparator',
                        'roadSpeed10',
                        'roadSpeed30',
                        'roadSpeed50',
                        'crosswalk',
                        'busStop',
                        'busDepot',
                        'wasteDepot',
                        'wasteBin',
                        'wasteDump',
                      ].includes(snapshot.selectedTool)
                    ? 'logistics'
            : null
    document.querySelectorAll<HTMLElement>('[data-build-category]').forEach((button) => {
      button.classList.toggle('contains-active', button.dataset.buildCategory === activeCategory)
    })
    document.querySelectorAll<HTMLElement>('[data-speed]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.speed) === snapshot.speed)
    })
    updateContextHelp()
    updateVisitorPanel()
    updateCoasterBuilder()
    updateEntityPanel()
    updateStaffPanel()
    updateVisitorOverview()
    updateDayPlanPanel()
    updateComplaintsPanel()
    updateLogisticsPanel()
  })
}

function updateStaffPanel(): void {
  if (!staffPanel.classList.contains('visible')) return
  const fingerprint = game.snapshot.staff
    .map(
      (member) =>
        `${member.id}:${member.role}:${member.state}:${member.assignedBuildingId ?? ''}`,
    )
    .sort()
    .join('|')
  if (fingerprint === staffPanelFingerprint && staffList.childElementCount > 0) return
  staffPanelFingerprint = fingerprint
  staffList.innerHTML = STAFF_ROLES.map((role) => {
    const definition = STAFF_DEFINITIONS[role]
    const members = game.snapshot.staff.filter((member) => member.role === role)
    const working = members.filter((member) => member.state !== 'patrolling').length
    return `<section>
      <div><span>${definition.icon}</span><strong>${definition.name}</strong><b>${members.length} · ${formatMoney(members.length * definition.hourlyWage)}/h</b></div>
      <small>${working} im Einsatz · ${formatMoney(definition.hourlyWage)}/h je Person</small>
      <div class="staff-actions">
        <button data-hire-staff="${role}">Einstellen · ${formatMoney(definition.hireCost)}</button>
        <button data-fire-staff="${role}" ${members.length === 0 ? 'disabled' : ''}>Entlassen</button>
      </div>
      ${members.length ? `<hr class="staff-divider"><div class="staff-members">${members.map(member => `<button data-inspect-staff="${member.id}">${escapeHtml(member.name)}</button>`).join('')}</div>` : ''}
    </section>`
  }).join('')
}

function updateDayPlanPanel(force = false): void {
  if (!dayPlanPanel.classList.contains('visible')) return
  const snapshot = game.snapshot
  const currentHour = Math.floor(snapshot.minute / 60) % 24
  const cycle = getFestivalCycleStatus(snapshot.dayPlan, snapshot.day)
  const fingerprint = [
    snapshot.dayPlan.dayVisitorEntryHour,
    snapshot.dayPlan.dayVisitorExitHour,
    currentHour,
    cycle.cycleDay,
    snapshot.dayPlan.leadDays,
    snapshot.dayPlan.festivalDays,
    snapshot.dayPlan.breakDays,
    snapshot.dayPlan.campingCapacityBufferPercent,
    ...DAY_PLAN_OFFERS.map((offer) =>
      snapshot.dayPlan.offers[offer].map((active) => (active ? '1' : '0')).join(''),
    ),
  ].join('|')
  if (!force && fingerprint === dayPlanFingerprint) return
  dayPlanFingerprint = fingerprint
  dayEntryHour.value = String(snapshot.dayPlan.dayVisitorEntryHour)
  dayExitHour.value = String(snapshot.dayPlan.dayVisitorExitHour)
  if (
    document.activeElement !== festivalLeadDays &&
    document.activeElement !== festivalActiveDays &&
    document.activeElement !== festivalBreakDays
    && document.activeElement !== campingCapacityBuffer
  ) {
    festivalLeadDays.value = String(snapshot.dayPlan.leadDays)
    festivalActiveDays.value = String(snapshot.dayPlan.festivalDays)
    festivalBreakDays.value = String(snapshot.dayPlan.breakDays)
    campingCapacityBuffer.value = String(
      snapshot.dayPlan.campingCapacityBufferPercent,
    )
  }
  const admittedCampers = snapshot.visitors.filter(
    (visitor) => visitor.ticketType === 'camping',
  ).length
  campingCapacitySummary.textContent =
    `${game.getBookableCampingCapacity()} von ${snapshot.campingCells.length} Campingfeldern buchbar · ${admittedCampers} Campinggäste aktuell zugelassen. Aufbauten können trotzdem zu Überbuchungen führen.`
  festivalCycleStrip.innerHTML = Array.from(
    { length: cycle.cycleLength },
    (_, dayIndex) => {
      const phase =
        dayIndex < snapshot.dayPlan.leadDays
          ? 'lead'
          : dayIndex <
              snapshot.dayPlan.leadDays + snapshot.dayPlan.festivalDays
            ? 'festival'
            : 'break'
      const label =
        phase === 'lead'
          ? 'Vorlauftag'
          : phase === 'festival'
            ? 'Festivaltag'
            : 'Pausentag'
      return `<span class="${phase} ${dayIndex === cycle.cycleDay ? 'current' : ''}" title="${label} ${dayIndex + 1}">${dayIndex + 1}</span>`
    },
  ).join('')
  const header = [
    '<span class="day-plan-corner">Angebot / Stunde</span>',
    ...Array.from(
      { length: 24 },
      (_, hour) =>
        `<b class="${hour === currentHour ? 'current' : ''}">${String(hour).padStart(2, '0')}</b>`,
    ),
  ].join('')
  const rows = DAY_PLAN_OFFERS.map((offer) => {
    const label = DAY_PLAN_OFFER_LABELS[offer]
    const hours = snapshot.dayPlan.offers[offer]
      .map(
        (active, hour) =>
          `<button
            data-day-plan-offer="${offer}"
            data-day-plan-hour="${hour}"
            class="${active ? 'active' : ''} ${hour === currentHour ? 'current' : ''}"
            title="${label.name}, ${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00"
            aria-pressed="${active}"
          >${active ? '●' : ''}</button>`,
      )
      .join('')
    return `<span class="day-plan-label">${label.icon} ${label.name}</span>${hours}`
  }).join('')
  const dayVisitorHours = Array.from({ length: 24 }, (_, hour) => {
    const active =
      cycle.phase === 'festival' &&
      isDayVisitorAdmissionOpen(snapshot.dayPlan, hour * 60 + 30)
    return `<span
      class="day-visitor-hour ${active ? 'active' : ''} ${hour === currentHour ? 'current' : ''}"
      title="Tagesgäste ${active ? 'zugelassen' : 'nicht zugelassen'} · über die Zeiten oben einstellbar"
    >${active ? '●' : ''}</span>`
  }).join('')
  dayPlanGrid.innerHTML =
    header +
    `<span class="day-plan-label">🎟️ Tagesgäste</span>${dayVisitorHours}` +
    rows
  const admissionOpen = isDayVisitorAdmissionOpen(
    snapshot.dayPlan,
    snapshot.minute,
  ) && cycle.phase === 'festival'
  const activeOffers = DAY_PLAN_OFFERS.filter((offer) =>
    isFestivalOfferActive(
      snapshot.dayPlan,
      offer,
      snapshot.minute,
      snapshot.day,
    ),
  ).length
  const phaseLabel =
    cycle.phase === 'lead'
      ? `Vorlauf ${cycle.phaseDay}/${cycle.phaseLength}`
      : cycle.phase === 'festival'
        ? `Festival ${cycle.phaseDay}/${cycle.phaseLength}`
        : `Pause ${cycle.phaseDay}/${cycle.phaseLength}`
  dayPlanStatus.textContent =
    `${phaseLabel} · ${formatTime(snapshot.minute)} · Tagesgäste ${admissionOpen ? 'dürfen hinein' : 'müssen draußen sein'} · ${activeOffers} von ${DAY_PLAN_OFFERS.length} Angebotsgruppen aktiv`
}

function updateComplaintsPanel(force = false): void {
  if (!complaintsPanel.classList.contains('visible')) return
  const complaints = game.snapshot.complaints
  const fingerprint = [
    complaints.sessionNumber,
    ...COMPLAINT_TOPICS.map(
      (topic) =>
        `${complaints.currentSession[topic]}:${complaints.previousSession[topic]}`,
    ),
  ].join('|')
  if (!force && fingerprint === complaintsFingerprint) return
  complaintsFingerprint = fingerprint
  const currentTotal = COMPLAINT_TOPICS.reduce(
    (total, topic) => total + complaints.currentSession[topic],
    0,
  )
  const previousTotal = COMPLAINT_TOPICS.reduce(
    (total, topic) => total + complaints.previousSession[topic],
    0,
  )
  complaintsSummary.textContent =
    `Festivalsession ${complaints.sessionNumber} · ${currentTotal} aktuelle und ${previousTotal} Beschwerden aus der letzten Session`
  complaintsList.innerHTML = COMPLAINT_TOPICS.map((topic) => {
    const label = COMPLAINT_LABELS[topic]
    return `<div>
      <span>${label.icon} ${label.name}</span>
      <b>${complaints.currentSession[topic]}</b>
      <b>${complaints.previousSession[topic]}</b>
    </div>`
  }).join('')
}

function updateLogisticsPanel(force = false): void {
  if (!logisticsPanel.classList.contains('visible')) return
  const logistics = game.snapshot.logistics
  const fingerprint = JSON.stringify([
    logistics.roadCells.length,
    logistics.parkingCells.map((cell) => cell.occupiedBy),
    logistics.roadVehicles.map((vehicle) => [
      vehicle.id,
      vehicle.state,
      vehicle.passengerIds.length,
    ]),
    logistics.ambulanceGarages.map((garage) => garage.bays),
    logistics.busDepots.map((depot) => depot.busIds),
    (logistics.wasteDepots ?? []).map((depot) => depot.truckIds),
    logistics.busStops.map((stop) => stop.id),
    logistics.busLines.map((line) => [
      line.id,
      line.name,
      line.busIds.length,
      line.active,
    ]),
  ])
  if (!force && fingerprint === logisticsFingerprint) return
  logisticsFingerprint = fingerprint
  const occupiedParking = logistics.parkingCells.filter(
    (cell) => cell.occupiedBy,
  ).length
  const waitingCars = logistics.roadVehicles.filter(
    (vehicle) =>
      vehicle.kind === 'visitorCar' && vehicle.state === 'waiting',
  ).length
  logisticsOverview.innerHTML = `
    <div class="logistics-summary-grid">
      <span><small>Straßenfelder</small><b>${logistics.roadCells.length}</b></span>
      <span><small>Parkplätze</small><b>${occupiedParking}/${logistics.parkingCells.length}</b></span>
      <span><small>Autos auf Parkplatzsuche</small><b>${waitingCars}</b></span>
      <span><small>Krankenwagen</small><b>${logistics.roadVehicles.filter((vehicle) => vehicle.kind === 'ambulance').length}</b></span>
      <span><small>Müllfahrzeuge</small><b>${logistics.roadVehicles.filter((vehicle) => vehicle.kind === 'garbageTruck').length}</b></span>
      <span><small>Busse</small><b>${logistics.roadVehicles.filter((vehicle) => vehicle.kind === 'bus').length}</b></span>
      <span><small>Aktive Linien</small><b>${logistics.busLines.filter((line) => line.active).length}</b></span>
  </div>
    <div class="vehicle-summary">
      ${logistics.ambulanceGarages
        .map(
          (garage) =>
            `<span>Garage ${garage.id.slice(-4)} · ${garage.bays.filter(Boolean).length}/2 RTW <button data-buy-ambulance="${garage.id}">RTW kaufen</button></span>`,
        )
        .join('')}
      ${logistics.busDepots
        .map(
          (depot) =>
            `<span>Depot ${depot.id.slice(-4)} · ${depot.busIds.length}/3 Busse <button data-buy-bus="${depot.id}">Bus kaufen</button>${depot.busIds.length > 0 ? ` <button data-sell-bus="${depot.id}">Bus verkaufen</button>` : ''}</span>`,
        )
        .join('')}
      ${(logistics.wasteDepots ?? [])
        .map(
          (depot) =>
            `<span>Mülldepot ${depot.id.slice(-4)} · ${depot.truckIds.length}/2 LKW <button data-buy-garbage="${depot.id}">Müllfahrzeug kaufen</button>${depot.truckIds.length > 0 ? ` <button data-sell-garbage="${depot.id}">LKW verkaufen</button>` : ''}</span>`,
        )
        .join('')}
    </div>`
  busLineDepot.innerHTML = logistics.busDepots
    .map(
      (depot) =>
        `<option value="${depot.id}">Depot ${depot.id.slice(-4)} (${depot.busIds.length}/3)</option>`,
    )
    .join('')
  busLineStops.innerHTML = logistics.busStops
    .map((stop) => `<option value="${stop.id}">${stop.name}</option>`)
    .join('')
  busLinesList.innerHTML = logistics.busLines
    .map(
      (line) =>
        `<div class="bus-line-row"><span>${line.name}</span><span>${line.stopIds.length} Stopps · ${line.busIds.length} Busse · ${line.headway} Min.</span><button data-delete-line="${line.id}">Löschen</button></div>`,
    )
    .join('')
}

type VisitorOverviewSort =
  | 'thought'
  | 'energy'
  | 'alcohol'
  | 'motivation'
  | 'fun'
  | 'nausea'
  | 'crowding'
  | 'attractiveness'
  | 'party'
  | 'name'

function updateVisitorOverview(force = false): void {
  if (!visitorOverviewPanel.classList.contains('visible')) return
  const filter = visitorThoughtFilter.value.trim().toLocaleLowerCase('de')
  const sort = visitorOverviewSort.value as VisitorOverviewSort
  const filtered = game.snapshot.visitors.filter(
    (visitor) =>
      !filter ||
      visitor.thought.toLocaleLowerCase('de').includes(filter) ||
      visitor.name.toLocaleLowerCase('de').includes(filter),
  )
  const value = (visitor: (typeof filtered)[number]): string | number => {
    switch (sort) {
      case 'thought': return visitor.thought
      case 'energy': return visitor.needs.energy
      case 'alcohol': return visitor.alcoholLevel
      case 'motivation': return visitor.motivation
      case 'fun': return visitor.needs.fun
      case 'nausea': return visitor.nausea
      case 'crowding': return visitor.crowding
      case 'attractiveness': return visitor.localAttractiveness
      case 'party': return visitor.localPartyMood
      case 'name': return visitor.name
    }
  }
  filtered.sort((left, right) => {
    const leftValue = value(left)
    const rightValue = value(right)
    const comparison =
      typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue, 'de')
        : Number(leftValue) - Number(rightValue)
    return visitorOverviewAscending ? comparison : -comparison
  })
  const pageSize = 100
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  visitorOverviewPage = Math.min(visitorOverviewPage, pageCount - 1)
  const pageVisitors = filtered.slice(
    visitorOverviewPage * pageSize,
    (visitorOverviewPage + 1) * pageSize,
  )
  const fingerprint = [
    sort,
    visitorOverviewAscending,
    filter,
    visitorOverviewPage,
    filtered.length,
    ...pageVisitors.map(
      (visitor) =>
        `${visitor.id}:${visitor.state}:${visitor.streakingMinutes > 0 ? 'streak' : ''}:${visitor.thought}:${Math.round(visitor.needs.energy)}:${Math.round(visitor.alcoholLevel)}:${Math.round(visitor.motivation)}:${Math.round(visitor.needs.fun)}:${Math.round(visitor.nausea)}:${Math.round(visitor.crowding)}:${Math.round(visitor.localAttractiveness)}:${Math.round(visitor.localPartyMood)}`,
    ),
  ].join('|')
  if (!force && fingerprint === visitorOverviewFingerprint) return
  visitorOverviewFingerprint = fingerprint
  visitorOverviewSummary.textContent =
    `${filtered.length.toLocaleString('de-DE')} von ${game.snapshot.visitors.length.toLocaleString('de-DE')} Besuchern`
  visitorOverviewList.innerHTML = pageVisitors
    .map(
      (visitor) => `<tr data-visitor-overview-id="${visitor.id}">
        <td><strong>${escapeHtml(visitor.name)}</strong></td>
        <td title="${escapeHtml(visitor.thought)}">${escapeHtml(visitor.thought)}</td>
        <td>${escapeHtml(visitor.state)}</td>
        <td>${Math.round(visitor.needs.energy)}%</td>
        <td>${Math.round(visitor.alcoholLevel)}%</td>
        <td>${Math.round(visitor.motivation)}%</td>
      </tr>`,
    )
    .join('')
  visitorPageLabel.textContent = `Seite ${visitorOverviewPage + 1} / ${pageCount}`
  visitorPagePrevious.disabled = visitorOverviewPage === 0
  visitorPageNext.disabled = visitorOverviewPage >= pageCount - 1
  visitorSortDirection.textContent = visitorOverviewAscending ? '↑' : '↓'
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  )
}

function handleCellClick(cell: CellPosition): void {
  if (supplyPlanner.handleCell(cell)) return
  if (coasterBuilderActive) {
    if (coasterAccessMode && activeCoasterId) {
      const result = game.setCoasterAccess(
        activeCoasterId,
        coasterAccessMode,
        cell.x,
        cell.z,
      )
      if (result.ok) coasterAccessMode = null
      showToast(result.message, !result.ok)
      updateCoasterBuilder()
      return
    }
    const clickedCoaster = game.getCoasterAt(cell.x, cell.z)
    if (
      clickedCoaster &&
      !clickedCoaster.closed
    ) {
      activeCoasterId = clickedCoaster.id
      coasterStartCandidate = null
      coasterEditIndex = clickedCoaster.pieces.length - 1
      showToast(`${clickedCoaster.name} wird weitergebaut`)
      updateCoasterBuilder()
      return
    }
    if (
      clickedCoaster &&
      clickedCoaster.closed
    ) {
      openEntityInfoForCoaster(clickedCoaster.id)
      return
    }
    if (!activeCoasterId) {
      coasterStartCandidate = { ...cell }
      showToast('Startpunkt gesetzt – ausrichten und im Menü bauen')
      updateCoasterBuilder()
      return
    }
    showToast('Wähle im Achterbahn-Editor das nächste Element')
    return
  }

  if (pathEditorActive) {
    const path =
      game.getPathAt(cell.x, cell.z, game.snapshot.buildElevation) ??
      game.getPathAt(cell.x, cell.z)
    if (!path) {
      showToast('Wähle einen bestehenden Weg als Startpunkt', true)
      return
    }
    pathAnchor = { x: path.x, z: path.z, elevation: path.elevation }
    pathHistory = []
    updatePathEditor()
    showToast('Startpunkt gewählt')
    return
  }

  const tool = game.snapshot.selectedTool
  if (tool === 'inspect') {
    const coaster = game.getCoasterAt(cell.x, cell.z)
    if (coaster) {
      if (!coaster.closed) {
        openCoasterBuilder(coaster.id)
        showToast(`${coaster.name} wird am letzten Element fortgesetzt`)
      } else {
        openEntityInfoForCoaster(coaster.id)
      }
      return
    }
    const building = game.getAt(cell.x, cell.z)
    if (building) openEntityInfoForBuilding(building.id)
    else if (game.getCampingCellAt(cell.x, cell.z)) showToast('Ausgewiesener Zeltbereich')
    else {
      const height = game.getTerrainHeight(cell.x, cell.z)
      const label =
        height <= -2
          ? 'Wasser'
          : height === -1
            ? 'Schlamm'
            : height > 0
              ? `Hügel Ebene ${height}`
              : 'Unbebautes Grundstück'
      showToast(label)
    }
    return
  }

  if (
    tool === 'terrainRaise' ||
    tool === 'terrainLower' ||
    tool === 'terrainFlatten'
  ) {
    const result = game.editTerrain(
      cell.x,
      cell.z,
      tool === 'terrainRaise'
        ? 'raise'
        : tool === 'terrainLower'
          ? 'lower'
          : 'flatten',
    )
    showToast(result.message, !result.ok)
    return
  }

  if (tool === 'road') {
    const result = game.designateRoad([cell])
    showToast(result.message, !result.ok)
    return
  }
  if (tool === 'parkingArea') {
    const result = game.designateParkingArea([cell])
    showToast(result.message, !result.ok)
    return
  }
  if (tool === 'roadDirection') {
    const result = game.setRoadDirection(
      cell.x,
      cell.z,
      game.snapshot.buildRotation as 0 | 1 | 2 | 3,
    )
    showToast(result.message, !result.ok)
    return
  }
  if (tool === 'roadSeparator') {
    const result = game.toggleRoadSeparator(
      cell.x,
      cell.z,
      game.snapshot.buildRotation as 0 | 1 | 2 | 3,
    )
    showToast(result.message, !result.ok)
    return
  }
  if (tool === 'crosswalk') {
    const result = game.toggleCrosswalk(cell.x, cell.z)
    showToast(result.message, !result.ok)
    return
  }
  if (
    tool === 'roadSpeed10' ||
    tool === 'roadSpeed30' ||
    tool === 'roadSpeed50'
  ) {
    const speed = Number(tool.replace('roadSpeed', '')) as 10 | 30 | 50
    const result = game.setRoadSpeed(cell.x, cell.z, speed)
    showToast(result.message, !result.ok)
    return
  }

  if (tool === 'bulldoze') {
    const result =
      bulldozeBrushSize > 1
        ? game.bulldozeArea(
            createCampingArea(cell, {
              x: cell.x + bulldozeBrushSize - 1,
              z: cell.z + bulldozeBrushSize - 1,
            }),
          )
        : game.bulldoze(cell.x, cell.z)
    showToast(result.message, !result.ok)
    return
  }

  const result =
    tool === 'camping'
        ? game.designateCampingCell(cell.x, cell.z)
        : tool === 'medicalArea'
          ? game.designateMedicalArea([cell])
          : tool === 'wasteDump'
            ? game.designateWasteDump([cell])
          : tool === 'stageForecourt'
            ? game.designateStageForecourt([cell])
        : tool === 'powerCable'
          ? game.designatePowerCable(
              cell.x,
              cell.z,
              !game.getPowerCableAt(cell.x, cell.z),
            )
      : game.place(tool as BuildingKind, cell.x, cell.z)
  showToast(result.message, !result.ok)
}

function paintPath(cell: CellPosition): void {
  if (pathEditorActive || !dragPathStart) return
  dragPathEnd = { ...cell }
  view.setPathDragPreview(
    game.snapshot.selectedTool === 'camping' ||
    game.snapshot.selectedTool === 'medicalArea' ||
    game.snapshot.selectedTool === 'wasteDump' ||
    game.snapshot.selectedTool === 'stageForecourt' ||
    game.snapshot.selectedTool === 'parkingArea' ||
    game.snapshot.selectedTool === 'powerCable' ||
    game.snapshot.selectedTool === 'bulldoze'
      ? createCampingArea(dragPathStart, dragPathEnd)
      : createConnectedPathLine(dragPathStart, dragPathEnd),
    dragPathElevation,
  )
}

function startPathDrag(cell: CellPosition): void {
  if (pathEditorActive) {
    dragPathStart = null
    return
  }
  dragPathStart = { ...cell }
  dragPathEnd = { ...cell }
  dragPathElevation =
    game.snapshot.selectedTool === 'camping' ||
    game.snapshot.selectedTool === 'medicalArea' ||
    game.snapshot.selectedTool === 'wasteDump' ||
    game.snapshot.selectedTool === 'stageForecourt' ||
    game.snapshot.selectedTool === 'parkingArea' ||
    game.snapshot.selectedTool === 'powerCable' ||
    game.snapshot.selectedTool === 'road' ||
    game.snapshot.selectedTool === 'roadDirection' ||
    game.snapshot.selectedTool === 'roadSeparator' ||
    game.snapshot.selectedTool === 'fence' ||
    game.snapshot.selectedTool === 'crosswalk' ||
    game.snapshot.selectedTool === 'roadSpeed10' ||
    game.snapshot.selectedTool === 'roadSpeed30' ||
    game.snapshot.selectedTool === 'roadSpeed50' ||
    game.snapshot.selectedTool === 'terrainRaise' ||
    game.snapshot.selectedTool === 'terrainLower' ||
    game.snapshot.selectedTool === 'terrainFlatten' ||
    game.snapshot.selectedTool === 'bulldoze'
      ? 0
      : game.snapshot.buildElevation
  view.setPathDragPreview([cell], dragPathElevation)
}

function finishPathDrag(): void {
  if (!dragPathStart || !dragPathEnd || pathEditorActive) {
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }

  const cells =
    game.snapshot.selectedTool === 'camping' ||
    game.snapshot.selectedTool === 'medicalArea' ||
    game.snapshot.selectedTool === 'wasteDump' ||
    game.snapshot.selectedTool === 'stageForecourt' ||
    game.snapshot.selectedTool === 'parkingArea' ||
    game.snapshot.selectedTool === 'powerCable' ||
    game.snapshot.selectedTool === 'bulldoze'
      ? createCampingArea(dragPathStart, dragPathEnd)
      : createConnectedPathLine(dragPathStart, dragPathEnd)
  let built = 0
  if (game.snapshot.selectedTool === 'bulldoze') {
    const result = game.bulldozeArea(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'camping') {
    const result = game.designateCampingArea(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'medicalArea') {
    const result = game.designateMedicalArea(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'wasteDump') {
    const result = game.designateWasteDump(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'stageForecourt') {
    const result = game.designateStageForecourt(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'parkingArea') {
    const result = game.designateParkingArea(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'powerCable') {
    const result = game.designatePowerCableArea(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'road') {
    const result = game.designateRoad(cells)
    showToast(result.message, !result.ok)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (
    game.snapshot.selectedTool === 'roadDirection' ||
    game.snapshot.selectedTool === 'roadSeparator' ||
    game.snapshot.selectedTool === 'crosswalk' ||
    game.snapshot.selectedTool === 'roadSpeed10' ||
    game.snapshot.selectedTool === 'roadSpeed30' ||
    game.snapshot.selectedTool === 'roadSpeed50'
  ) {
    let changed = 0
    cells.forEach((cell) => {
      const tool = game.snapshot.selectedTool
      const direction = game.snapshot.buildRotation as 0 | 1 | 2 | 3
      const result =
        tool === 'roadDirection'
          ? game.setRoadDirection(cell.x, cell.z, direction)
          : tool === 'roadSeparator'
            ? game.toggleRoadSeparator(cell.x, cell.z, direction)
            : tool === 'crosswalk'
              ? game.toggleCrosswalk(cell.x, cell.z)
              : game.setRoadSpeed(
                  cell.x,
                  cell.z,
                  Number(tool.replace('roadSpeed', '')) as 10 | 30 | 50,
                )
      if (result.ok) changed += 1
    })
    showToast(`${changed} Straßenfelder geändert`, changed === 0)
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (
    game.snapshot.selectedTool === 'terrainRaise' ||
    game.snapshot.selectedTool === 'terrainLower' ||
    game.snapshot.selectedTool === 'terrainFlatten'
  ) {
    const mode =
      game.snapshot.selectedTool === 'terrainRaise'
        ? 'raise'
        : game.snapshot.selectedTool === 'terrainLower'
          ? 'lower'
          : 'flatten'
    let changed = 0
    cells.forEach((cell) => {
      const result = game.editTerrain(cell.x, cell.z, mode)
      if (result.ok) changed += 1
    })
    showToast(
      changed > 0
        ? `${changed} Geländefeld${changed === 1 ? '' : 'er'} geändert`
        : 'Das Gelände konnte hier nicht verändert werden',
      changed === 0,
    )
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  if (game.snapshot.selectedTool === 'fence') {
    let placed = 0
    cells.forEach((cell) => {
      const result = game.place('fence', cell.x, cell.z)
      if (result.ok) placed += 1
    })
    showToast(
      placed > 0
        ? `${placed} Bauzaun${placed === 1 ? '' : 'e'} gesetzt`
        : 'Hier konnte kein Bauzaun gesetzt werden',
      placed === 0,
    )
    dragPathStart = null
    dragPathEnd = null
    view.setPathDragPreview([], 0)
    return
  }
  for (const cell of cells) {
    if (game.getPathAt(cell.x, cell.z, dragPathElevation)) continue
    const result = game.placePathSegment(cell.x, cell.z, dragPathElevation)
    if (!result.ok) {
      showToast(`${result.message} – Bau an dieser Stelle beendet`, true)
      break
    }
    built += 1
  }
  if (built > 0) showToast(`${built} zusammenhängende Wegfelder gebaut`)
  dragPathStart = null
  dragPathEnd = null
  view.setPathDragPreview([], 0)
}

function createCampingArea(start: CellPosition, end: CellPosition): CellPosition[] {
  const cells: CellPosition[] = []
  const minX = Math.min(start.x, end.x)
  const maxX = Math.max(start.x, end.x)
  const minZ = Math.min(start.z, end.z)
  const maxZ = Math.max(start.z, end.z)
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, z })
  }
  return cells
}

function createConnectedPathLine(start: CellPosition, end: CellPosition): CellPosition[] {
  const cells: CellPosition[] = [{ ...start }]
  let x = start.x
  let z = start.z
  const deltaX = Math.abs(end.x - x)
  const deltaZ = Math.abs(end.z - z)
  const stepX = x < end.x ? 1 : -1
  const stepZ = z < end.z ? 1 : -1
  let error = deltaX - deltaZ

  while (x !== end.x || z !== end.z) {
    const previousX = x
    const previousZ = z
    const doubleError = error * 2
    if (doubleError > -deltaZ) {
      error -= deltaZ
      x += stepX
    }
    if (doubleError < deltaX) {
      error += deltaX
      z += stepZ
    }
    if (x !== previousX && z !== previousZ) cells.push({ x, z: previousZ })
    cells.push({ x, z })
  }
  return cells
}

const PATH_DIRECTIONS = [
  { x: 0, z: 1 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
]

function getIsoDirectionIcon(direction: number): string {
  const icons = ['↙', '↘', '↗', '↖']
  return icons[(direction - cameraQuarter + icons.length) % icons.length] ?? '◆'
}

function openPathEditor(): void {
  supplyPlanner.releaseTool()
  pathEditorActive = true
  pathAnchor = null
  pathHistory = []
  game.setTool('path')
  updatePathEditor()
}

function closePathEditor(): void {
  pathEditorActive = false
  pathAnchor = null
  pathHistory = []
  pathConstruction.classList.remove('visible')
  view.setPathConstructionPreview(false, null, pathDirection, pathSlope)
}

function rotatePathDirection(delta: number): void {
  pathDirection = (pathDirection + delta + PATH_DIRECTIONS.length) % PATH_DIRECTIONS.length
  updatePathEditor()
}

function setPathSlope(value: number): void {
  pathSlope = Math.max(-1, Math.min(1, value)) as -1 | 0 | 1
  updatePathEditor()
}

function buildNextPathSegment(): void {
  if (!pathAnchor) return
  const direction = PATH_DIRECTIONS[pathDirection]
  if (!direction) return
  const next: PathAnchor = {
    x: pathAnchor.x + direction.x,
    z: pathAnchor.z + direction.z,
    elevation: pathAnchor.elevation + pathSlope,
  }
  const candidateBase = Math.min(pathAnchor.elevation, next.elevation)
  const candidateTop =
    Math.max(pathAnchor.elevation, next.elevation) + BUILDINGS.path.height
  const previousPath = game.snapshot.buildings.find((building) => {
    if (building.kind !== 'path' || building.x !== next.x || building.z !== next.z) {
      return false
    }
    const existingStart = building.elevation - (building.pathSlope ?? 0)
    const existingBase = Math.min(building.elevation, existingStart)
    const existingTop =
      Math.max(building.elevation, existingStart) + BUILDINGS.path.height
    return existingBase < candidateTop && candidateBase < existingTop
  })
  const previousPathSnapshot = previousPath ? structuredClone(previousPath) : undefined
  const result = game.placePathSegment(
    next.x,
    next.z,
    next.elevation,
    pathConstructionType,
    pathDirection,
    pathSlope,
    supplyPlanner.getFootType(),
  )
  if (!result.ok) {
    showToast(result.message, true)
    return
  }
  pathHistory.push({
    from: { ...pathAnchor },
    to: { ...next },
    previousPath: previousPathSnapshot,
  })
  pathAnchor = next
  updatePathEditor()
  showToast(result.message)
}

function undoLastPathSegment(): void {
  const entry = pathHistory.pop()
  if (!entry) return
  const result = game.undoPathSegment(
    entry.to.x,
    entry.to.z,
    entry.to.elevation,
    entry.previousPath,
  )
  if (!result.ok) {
    pathHistory.push(entry)
    showToast(result.message, true)
    return
  }
  pathAnchor = entry.from
  updatePathEditor()
  showToast(result.message)
}

function updatePathEditor(): void {
  pathConstruction.classList.toggle('visible', pathEditorActive)
  const directionIcon = getIsoDirectionIcon(pathDirection)
  const slopeIcon = pathSlope < 0 ? '↘' : pathSlope > 0 ? '↗' : '→'
  const pathTypeIcon = pathConstructionType === 'queue' ? '⑂' : '▦'
  pathPiecePreview.textContent = `${pathTypeIcon} ${directionIcon} ${slopeIcon}`
  buildDirection.textContent = `Zugang: ${getIsoDirectionIcon(game.snapshot.buildRotation)}`
  buildPathButton.disabled = !pathAnchor
  undoPathButton.disabled = pathHistory.length === 0
  constructionStatus.textContent = pathAnchor
    ? `Aktuelles Feld: ${pathAnchor.x}, ${pathAnchor.z} · Ebene ${pathAnchor.elevation}` +
      (pathConstructionType === 'queue'
        ? ' · Laufrichtung automatisch zum Eingang'
        : '')
    : 'Wähle einen bestehenden Weg als Startpunkt.'
  document.querySelectorAll<HTMLButtonElement>('[data-slope]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.slope) === pathSlope)
  })
  document.querySelectorAll<HTMLButtonElement>('[data-path-type]').forEach((button) => {
    button.classList.toggle('active', button.dataset.pathType === pathConstructionType)
  })
  document.querySelectorAll<HTMLButtonElement>('[data-path-direction]').forEach((button) => {
    const direction = Number(button.dataset.pathDirection)
    button.classList.toggle('active', direction === pathDirection)
    const icon = button.querySelector('span')
    if (icon) icon.textContent = getIsoDirectionIcon(direction)
  })
  const selectedPath = pathAnchor
    ? game.getPathAt(pathAnchor.x, pathAnchor.z, pathAnchor.elevation)
    : undefined
  const canEditFlow = selectedPath?.pathType === 'normal'
  pathFlowSetButton.disabled = !canEditFlow
  pathFlowRotateButton.disabled = !canEditFlow || selectedPath?.flowDirection == null
  pathFlowClearButton.disabled = !canEditFlow || selectedPath?.flowDirection == null
  view.setPathConstructionPreview(pathEditorActive, pathAnchor, pathDirection, pathSlope)
}

function openCoasterBuilder(coasterId: string | null = null): void {
  supplyPlanner.releaseTool()
  if (pathEditorActive) closePathEditor()
  if (!coasterId) {
    trackPieceSelect.value = 'station'
    chainLiftInput.checked = false
  }
  coasterBuilderActive = true
  activeCoasterId = coasterId
  coasterStartCandidate = null
  coasterEditIndex = coasterId ? (game.getCoaster(coasterId)?.pieces.length ?? 1) - 1 : -1
  const editAnchor = coasterId ? game.getCoaster(coasterId)?.pieces.at(-1)?.end : null
  coasterTargetPitch = editAnchor?.pitch ?? 0
  coasterTargetBank = editAnchor?.bank ?? 0
  if (editAnchor) trackPieceSelect.value = getConstantPitchPiece(coasterTargetPitch)
  coasterAccessMode = null
  game.setTool('coaster')
  updateCoasterBuilder()
}

function closeCoasterBuilder(): void {
  coasterBuilderActive = false
  activeCoasterId = null
  coasterStartCandidate = null
  coasterEditIndex = -1
  coasterAccessMode = null
  coasterBuilder.classList.remove('visible')
  view.setCoasterConstructionPreview([])
  view.setCoasterTrackSelection([])
}

function getConstantPitchPiece(pitch: number): TrackPieceKind {
  if (Math.abs(pitch - TRACK_PITCHES.steepUp) < 0.001) return 'slopeUp'
  if (Math.abs(pitch - TRACK_PITCHES.gentleUp) < 0.001) return 'slopeGentleUp'
  if (Math.abs(pitch - TRACK_PITCHES.steepDown) < 0.001) return 'slopeDown'
  if (Math.abs(pitch - TRACK_PITCHES.gentleDown) < 0.001) return 'slopeGentleDown'
  return 'straight'
}

function selectCoasterPitch(targetPitch: number): void {
  coasterTargetPitch = targetPitch
  const coaster = activeCoasterId ? game.getCoaster(activeCoasterId) : null
  const anchor = coaster?.pieces[coasterEditIndex]?.end
  trackPieceSelect.value =
    anchor && Math.abs(anchor.pitch - targetPitch) > 0.001
      ? 'pitchTransition'
      : getConstantPitchPiece(targetPitch)
  updateCoasterBuilder()
}

function selectCoasterBank(targetBank: number): void {
  coasterTargetBank = targetBank
  const coaster = activeCoasterId ? game.getCoaster(activeCoasterId) : null
  const anchor = coaster?.pieces[coasterEditIndex]?.end
  if (anchor && Math.abs(anchor.bank - targetBank) > 0.001) {
    trackPieceSelect.value = 'bankTransition'
  }
  updateCoasterBuilder()
}

function buildCoasterPiece(): void {
  if (!activeCoasterId) {
    if (!coasterStartCandidate) return
    const result = game.startCoaster(
      'classicSteel',
      coasterStartCandidate.x,
      coasterStartCandidate.z,
    )
    if (result.ok && result.id) {
      activeCoasterId = result.id
      coasterStartCandidate = null
      coasterEditIndex = 0
      coasterTargetPitch = 0
      coasterTargetBank = 0
      trackPieceSelect.value = 'straight'
    }
    showToast(result.message, !result.ok)
    updateCoasterBuilder()
    return
  }
  const kind = trackPieceSelect.value as TrackPieceKind
  const insertionIndex = coasterEditIndex + 1
  const result = game.appendCoasterPiece(
    activeCoasterId,
    kind,
    chainLiftInput.checked,
    coasterEditIndex,
    { targetPitch: coasterTargetPitch, targetBank: coasterTargetBank },
  )
  if (result.ok) {
    coasterEditIndex = insertionIndex
    if (kind === 'pitchTransition') {
      trackPieceSelect.value = getConstantPitchPiece(coasterTargetPitch)
    } else if (kind === 'bankTransition') {
      trackPieceSelect.value = 'straight'
    }
  }
  showToast(result.message, !result.ok)
  updateCoasterBuilder()
}

function undoCoasterPiece(): void {
  if (!activeCoasterId) return
  const result = game.undoCoasterPiece(activeCoasterId)
  if (result.ok) {
    const coaster = game.getCoaster(activeCoasterId)
    coasterEditIndex = (coaster?.pieces.length ?? 1) - 1
    coasterTargetPitch = coaster?.pieces[coasterEditIndex]?.end.pitch ?? 0
    coasterTargetBank = coaster?.pieces[coasterEditIndex]?.end.bank ?? 0
    trackPieceSelect.value = getConstantPitchPiece(coasterTargetPitch)
  }
  showToast(result.message, !result.ok)
  updateCoasterBuilder()
}

function moveCoasterTrackCursor(delta: number): void {
  const coaster = activeCoasterId ? game.getCoaster(activeCoasterId) : null
  if (!coaster) return
  coasterEditIndex = Math.max(
    0,
    Math.min(coaster.pieces.length - 1, coasterEditIndex + delta),
  )
  const anchor = coaster.pieces[coasterEditIndex]?.end
  coasterTargetPitch = anchor?.pitch ?? 0
  coasterTargetBank = anchor?.bank ?? 0
  trackPieceSelect.value = getConstantPitchPiece(coasterTargetPitch)
  updateCoasterBuilder()
}

function deleteCoasterFromSelection(): void {
  if (!activeCoasterId || coasterEditIndex <= 0) return
  const deletedIndex = coasterEditIndex
  const result = game.deleteCoasterPiece(activeCoasterId, deletedIndex)
  if (result.ok) {
    coasterEditIndex = Math.max(0, deletedIndex - 1)
    const anchor = game.getCoaster(activeCoasterId)?.pieces[coasterEditIndex]?.end
    coasterTargetPitch = anchor?.pitch ?? 0
    coasterTargetBank = anchor?.bank ?? 0
    trackPieceSelect.value = getConstantPitchPiece(coasterTargetPitch)
  }
  showToast(result.message, !result.ok)
  updateCoasterBuilder()
}

function updateCoasterBuilder(): void {
  coasterBuilder.classList.toggle('visible', coasterBuilderActive)
  if (!coasterBuilderActive) return

  const coaster = activeCoasterId ? game.getCoaster(activeCoasterId) : null
  if (coaster) {
    coasterEditIndex = Math.max(0, Math.min(coaster.pieces.length - 1, coasterEditIndex))
  }
  const anchorPiece = coaster?.pieces[coasterEditIndex]
  coasterDirection.textContent = getIsoDirectionIcon(
    anchorPiece?.end.heading ?? game.snapshot.buildRotation,
  )
  coasterBuildButton.disabled = !coaster && !coasterStartCandidate
  coasterBuildButton.textContent = coaster ? 'Schiene bauen' : 'Startplattform bauen'
  coasterRotateButton.disabled = Boolean(coaster)
  coasterUndoButton.disabled = !coaster || coaster.pieces.length <= 1
  coasterEntranceButton.disabled = !coaster
  coasterExitButton.disabled = !coaster
  trackPieceSelect.disabled = !coaster
  const selectedPiece = TRACK_PIECES[trackPieceSelect.value as TrackPieceKind]
  document.querySelectorAll<HTMLButtonElement>('[data-track-piece]').forEach((button) => {
    button.classList.toggle('active', button.dataset.trackPiece === trackPieceSelect.value)
    const definition = TRACK_PIECES[button.dataset.trackPiece as TrackPieceKind]
    const curveAllowed =
      !definition?.turn ||
      Boolean(
        anchorPiece &&
          Math.abs(anchorPiece.end.bank) > 0.001 &&
          Math.sign(anchorPiece.end.bank) === definition.turn,
      )
    const stationAllowed =
      !definition?.station ||
      Boolean(
        anchorPiece &&
          Math.abs(anchorPiece.end.pitch) < 0.001 &&
          Math.abs(anchorPiece.end.bank) < 0.001,
      )
    button.disabled =
      (!coaster && button.dataset.trackPiece !== 'station') ||
      !curveAllowed ||
      !stationAllowed
  })
  document.querySelectorAll<HTMLButtonElement>('[data-track-pitch]').forEach((button) => {
    const pitch = Number(button.dataset.trackPitch)
    const pitchLevels = [
      TRACK_PITCHES.steepDown,
      TRACK_PITCHES.gentleDown,
      TRACK_PITCHES.flat,
      TRACK_PITCHES.gentleUp,
      TRACK_PITCHES.steepUp,
    ]
    const currentPitchIndex = pitchLevels.findIndex(
      (level) => Math.abs(level - (anchorPiece?.end.pitch ?? 0)) < 0.001,
    )
    const targetPitchIndex = pitchLevels.findIndex(
      (level) => Math.abs(level - pitch) < 0.001,
    )
    button.classList.toggle('active', Math.abs(pitch - coasterTargetPitch) < 0.001)
    button.disabled =
      !coaster ||
      (currentPitchIndex >= 0 &&
        targetPitchIndex >= 0 &&
        Math.abs(currentPitchIndex - targetPitchIndex) > 1)
  })
  document.querySelectorAll<HTMLButtonElement>('[data-track-bank]').forEach((button) => {
    const bank = Number(button.dataset.trackBank)
    button.classList.toggle('active', Math.abs(bank - coasterTargetBank) < 0.001)
    button.disabled =
      !coaster ||
      Boolean(
        anchorPiece &&
          Math.abs(anchorPiece.end.bank) > 0.001 &&
          Math.abs(bank) > 0.001 &&
          Math.sign(anchorPiece.end.bank) !== Math.sign(bank),
      )
  })
  const displayedPiece = coaster ? selectedPiece : TRACK_PIECES.station
  coasterPiecePreview.textContent = `${TRACK_PIECE_ICONS[displayedPiece.kind]} ${getIsoDirectionIcon(
    anchorPiece?.end.heading ?? game.snapshot.buildRotation,
  )}`
  coasterPieceLabel.textContent = `${displayedPiece.name} · ${formatMoney(displayedPiece.cost)}`
  chainLiftInput.disabled =
    !coaster ||
    !selectedPiece?.chainAllowed ||
    (selectedPiece.kind === 'pitchTransition' &&
      Math.max(coasterTargetPitch, anchorPiece?.end.pitch ?? 0) <= 0)
  if (chainLiftInput.disabled) chainLiftInput.checked = false

  if (!coaster || !anchorPiece) {
    trackPreviousButton.disabled = true
    trackNextButton.disabled = true
    deleteTrackButton.disabled = true
    trackSelection.textContent = '–'
    view.setCoasterTrackSelection([])
    if (coasterStartCandidate) {
      const stationPreview = createTrackPiece(
        'station-preview',
        'station',
        {
          x: coasterStartCandidate.x,
          z: coasterStartCandidate.z,
          elevation: game.snapshot.buildElevation,
          heading: game.snapshot.buildRotation,
          pitch: 0,
          bank: 0,
        },
        false,
      )
      view.setCoasterConstructionPreview(stationPreview.points)
      coasterStatus.textContent =
        `Startpunkt: ${coasterStartCandidate.x}, ${coasterStartCandidate.z} · ` +
        `Ebene ${game.snapshot.buildElevation} · Richtung ${getIsoDirectionIcon(game.snapshot.buildRotation)}. ` +
        'Zum Bestätigen „Startplattform bauen“ drücken.'
    } else {
      coasterStatus.textContent =
        'Klicke auf das Gelände, um den Startpunkt als Vorschau zu setzen.'
      view.setCoasterConstructionPreview([])
    }
    return
  }
  const selectedTrackPiece = coaster.pieces[coasterEditIndex]
  trackPreviousButton.disabled = coasterEditIndex <= 0
  trackNextButton.disabled = coasterEditIndex >= coaster.pieces.length - 1
  deleteTrackButton.disabled = coasterEditIndex <= 0
  trackSelection.textContent = selectedTrackPiece
    ? `${coasterEditIndex + 1}/${coaster.pieces.length} · ${TRACK_PIECES[selectedTrackPiece.kind].name}`
    : '–'
  view.setCoasterTrackSelection(selectedTrackPiece?.points ?? [])
  const previewPiece = createTrackPiece(
    'preview',
    trackPieceSelect.value as TrackPieceKind,
    anchorPiece.end,
    chainLiftInput.checked,
    { targetPitch: coasterTargetPitch, targetBank: coasterTargetBank },
  )
  view.setCoasterConstructionPreview(previewPiece.points)
  const accessState = `${coaster.entrance ? '✓ Eingang' : '○ Eingang'} · ${coaster.exit ? '✓ Ausgang' : '○ Ausgang'}`
  coasterStatus.textContent =
    `Bauanker: ${anchorPiece.end.x}, ${anchorPiece.end.z} · Höhe ${anchorPiece.end.elevation.toFixed(2)} · ` +
    `Neigung ${(anchorPiece.end.pitch * 180 / Math.PI).toFixed(1)}° · Banking ${(anchorPiece.end.bank * 180 / Math.PI).toFixed(0)}°. ` +
    `${coaster.closed ? '✓ Strecke geschlossen' : 'Strecke noch offen'} · ${accessState}`
}

function updateContextHelp(): void {
  if (coasterBuilderActive) {
    contextHelp.textContent = !activeCoasterId
      ? coasterStartCandidate
        ? 'Startpunkt gesetzt: drehen oder Höhe ändern, dann „Startplattform bauen“.'
        : 'Klicke auf das Gelände, um den Startpunkt festzulegen.'
      : coasterAccessMode
        ? `Klicke neben eine Stationsplattform: ${coasterAccessMode === 'entrance' ? 'Eingang' : 'Ausgang'}`
        : 'Wähle im Achterbahn-Editor das nächste Schienenelement.'
    return
  }
  if (pathEditorActive) {
    contextHelp.textContent = pathAnchor
      ? 'Richtung und Neigung wählen, dann im Editor auf „Bauen“ klicken.'
      : 'Klicke einen bestehenden Weg als Startpunkt an.'
    return
  }
  const tool = game.snapshot.selectedTool
  if (!hoveredCell) {
    contextHelp.textContent = 'Bewege den Mauszeiger über das Gelände.'
    return
  }

  const existing = game.getAt(hoveredCell.x, hoveredCell.z)
  if (tool === 'inspect') {
    const height = game.getTerrainHeight(hoveredCell.x, hoveredCell.z)
    const dump = game.getWasteDumpAt(hoveredCell.x, hoveredCell.z)
    contextHelp.textContent = existing
      ? `${BUILDINGS[existing.kind].name} auswählen`
      : dump
        ? `Müllablage · ${dump.stored} Säcke gelagert`
      : height <= -2
        ? 'Wasser'
        : height === -1
          ? 'Schlamm – Bewegung sehr langsam'
          : height > 0
            ? `Hügel Ebene ${height}`
            : 'Unbebautes Feld'
  } else if (tool === 'terrainRaise') {
    contextHelp.textContent =
      'Klicken oder ziehen, um Hügel zu formen. Nachbarn bleiben begehbar.'
  } else if (tool === 'terrainLower') {
    contextHelp.textContent =
      'Klicken oder ziehen, um Senken zu graben. Ab Ebene −2 steht Wasser.'
  } else if (tool === 'terrainFlatten') {
    contextHelp.textContent =
      'Klicken oder ziehen, um das Gelände auf Ebene 0 einzuebnen.'
  } else if (tool === 'bulldoze') {
    contextHelp.textContent = existing
      ? existing.kind === 'tree'
        ? `Baum entfernen (${SIMULATION_CONFIG.economy.treeClearCost} €)`
        : `${BUILDINGS[existing.kind].name} abreißen`
      : game.getCampingCellAt(hoveredCell.x, hoveredCell.z)
        ? 'Zeltbereich aufheben'
        : game.getWasteDumpAt(hoveredCell.x, hoveredCell.z)
          ? 'Müllablage aufheben'
        : 'Leeres Feld'
    contextHelp.textContent += ' · Klicken oder rechteckig ziehen'
  } else if (tool === 'coaster') {
    contextHelp.textContent = 'Öffne den Achterbahn-Editor, um eine Bahn zu bauen.'
  } else if (tool === 'camping') {
    contextHelp.textContent = game.getCampingCellAt(hoveredCell.x, hoveredCell.z)
      ? 'Dieses Feld gehört bereits zum Zeltbereich.'
      : 'Klicken oder rechteckig ziehen, um freie Flächen als Zeltbereich auszuweisen.'
  } else if (tool === 'medicalArea') {
    contextHelp.textContent = 'Klicken oder ziehen, um einen Krankenbereich auszuweisen.'
  } else if (tool === 'wasteDump') {
    contextHelp.textContent =
      game.getWasteDumpAt(hoveredCell.x, hoveredCell.z)
        ? 'Diese Müllablage senkt die Attraktivität stark. Reinigungskräfte bringen hierher Müll.'
        : 'Klicken oder ziehen, um eine Müllablage auszuweisen. Sie ist extrem unattraktiv; Müllfahrzeuge brauchen eine Straße daneben.'
  } else if (tool === 'wasteBin') {
    contextHelp.textContent =
      'Mülleimer setzen. Gäste im Umkreis von 7 Feldern werfen gebrauchte Dinge hier hinein.'
  } else if (tool === 'stageForecourt') {
    contextHelp.textContent =
      'Klicken oder rechteckig ziehen, um einen Bühnenvorplatz mit 9 Plätzen je Feld auszuweisen.'
  } else if (tool === 'powerCable') {
    contextHelp.textContent = game.getPowerCableAt(hoveredCell.x, hoveredCell.z)
      ? 'Hier liegt ein Kabel. Klick entfernt es, Ziehen verlegt weitere.'
      : 'Klicken oder ziehen, um Stromkabel zu Generatoren und Verbrauchern zu legen.'
  } else if (tool === 'road') {
    contextHelp.textContent = 'Klicken oder ziehen, um eine ebenerdige Straße zu bauen.'
  } else if (tool === 'parkingArea') {
    contextHelp.textContent = 'Rechteckig ziehen, um Parkplätze auszuweisen.'
  } else if (tool === 'roadDirection') {
    contextHelp.textContent = 'Straße anklicken: aktuelle Baurichtung als Fahrtrichtung setzen.'
  } else if (tool === 'roadSeparator') {
    contextHelp.textContent = 'Straße anklicken: Kante in aktueller Baurichtung sperren.'
  } else if (tool === 'fence') {
    contextHelp.textContent =
      'Bauzaun setzen: die aktuelle Baurichtung wählt die gesperrte Seite. Ziehen setzt eine Linie.'
  } else if (tool === 'crosswalk') {
    contextHelp.textContent = 'Straße anklicken, um einen Zebrastreifen umzuschalten.'
  } else if (
    tool === 'roadSpeed10' ||
    tool === 'roadSpeed30' ||
    tool === 'roadSpeed50'
  ) {
    contextHelp.textContent = 'Straßenfeld anklicken, um die Geschwindigkeitszone festzulegen.'
  } else if (
    tool === 'path' &&
    game.getRoadCellAt(hoveredCell.x, hoveredCell.z)
  ) {
    contextHelp.textContent =
      game.snapshot.buildElevation >= 1
        ? 'Gehweg als Überweg über die Straße. Besucher laufen oben, Autos darunter.'
        : 'Auf der Straße nur als Überweg: Bauhöhe auf Ebene 1 stellen.'
  } else {
    contextHelp.textContent = game.canPlace(tool, hoveredCell.x, hoveredCell.z).message
  }
}

function selectVisitor(visitorId: string): void {
  selectedVisitorId = visitorId
  if (followedVisitorId) {
    followedVisitorId = visitorId
    view.followVisitor(visitorId)
  }
  selectedEntity = null
  entityPanel.hidden = true
  visitorPanel.classList.add('visible')
  updateVisitorPanel()
}

function updateVisitorPanel(): void {
  if (!selectedVisitorId) return
  const visitor = game.getVisitor(selectedVisitorId)
  if (!visitor) {
    if (followedVisitorId === selectedVisitorId) {
      followedVisitorId = null
      view.followVisitor(null)
    }
    selectedVisitorId = null
    visitorPanel.classList.remove('visible')
    return
  }
  const isFollowing = followedVisitorId === visitor.id
  followVisitorButton.classList.toggle('active', isFollowing)
  followVisitorButton.setAttribute('aria-pressed', String(isFollowing))
  followVisitorButton.textContent = isFollowing
    ? '⏹ Verfolgung beenden'
    : '📍 Besucher verfolgen'

  const stateLabels = {
    entering: 'Betritt den Park',
    exploring: 'Erkundet den Park',
    seeking: 'Auf dem Weg zu einem Ziel',
    using: 'Benutzt eine Attraktion',
    queuing: 'Wartet an einer Achterbahn',
    riding: 'Fährt Achterbahn',
    sleeping: 'Schläft auf dem Boden',
    camping: 'Am eigenen Zeltplatz',
    socializing: 'Chillt auf dem Zeltplatz',
    vomiting: 'Übergibt sich',
    'security-check': 'Wird kontrolliert',
    'medical-transport': 'Wird zum Krankenbereich gebracht',
    medical: 'Wird medizinisch versorgt',
    partying: 'Feiert zur Musik',
    'bench-resting': 'Ruht sich auf einer Bank aus',
    relaxing: 'Hält sich an einem Lieblingsort auf',
    'camp-waiting': 'Wartet auf einen Campingplatz',
    'vehicle-arrival': 'Sitzt im anreisenden Auto',
    'bus-waiting': 'Wartet auf einen Bus',
    'bus-riding': 'Fährt mit dem Bus',
    injured: 'Wartet verletzt auf Hilfe',
    exiting: 'Verlässt die Attraktion',
    leaving: 'Verlässt den Park',
  }
  visitorName.textContent = visitor.name
  visitorThought.textContent = `„${visitor.thought}“`
  visitorState.textContent =
    visitor.streakingMinutes > 0
      ? 'Flitzt nackt über das Gelände'
      : stateLabels[visitor.state]
  visitorBudget.textContent = formatMoney(visitor.budget)
  requireElement<HTMLElement>('#visitor-music').textContent=GENRES.find(g=>g.id===visitor.musicTaste)?.name??'Noch offen'
  requireElement<HTMLElement>('#visitor-audience').textContent = visitor.audience ? AUDIENCE_NAMES[visitor.audience] : 'Freies Spiel'
  visitorAlcoholDisposition.textContent =
    visitor.alcoholDisposition === 'aggressive' ? 'Eher aggressiv' : 'Eher ruhig'
  visitorCamping.textContent =
    visitor.campingPhase === 'none'
      ? 'Kein Zelt'
      : visitor.campingPhase === 'seeking'
        ? 'Auf dem Weg zur Parzelle'
        : visitor.campingPhase === 'building'
          ? 'Baut das Zelt auf'
          : visitor.campingPhase === 'packing'
            ? 'Packt das Zelt ein'
            : visitor.campingPhase === 'resting' || visitor.campingPhase === 'returning'
              ? 'Erholt sich im eigenen Zelt'
              : 'Zelt aufgebaut'
  visitorTicket.textContent =
    visitor.ticketType === 'camping' ? 'Campingpass' : 'Tageskarte'
  visitorSleepRhythm.textContent =
    `${formatTime(visitor.preferredBedtime)}–${formatTime(visitor.preferredWakeTime)}`
  visitorCrowding.textContent = `${Math.round(visitor.crowding)}%`
  visitorAttractiveness.textContent =
    `${Math.round(visitor.localAttractiveness)}%`
  visitorParty.textContent = `${Math.round(visitor.localPartyMood)}%`
  visitorPreferences.textContent =
    `Schönheit ${Math.round(visitor.beautyPreference * 100)}% · Party ${Math.round(visitor.partyPreference * 100)}%`
  visitorInventory.innerHTML =
    visitor.inventory.length > 0
      ? visitor.inventory
          .map((item) => {
            const definition = INVENTORY_ITEMS[item.kind]
            const deployed =
              item.kind === 'tent' &&
              visitor.campsite &&
              visitor.campingPhase !== 'seeking' &&
              visitor.campingPhase !== 'building'
                ? ' · aufgebaut'
                : (item.kind === 'chairs' ||
                    item.kind === 'pavilion' ||
                    item.kind === 'musicBox') &&
                    game.snapshot.campInstallations.some(
                      (installation) =>
                        installation.kind === item.kind &&
                        installation.contributorIds.includes(visitor.id),
                    )
                  ? ' · aufgestellt'
                  : ''
            return `<span title="${definition.name}${deployed}">${definition.icon} ${definition.name} ×${item.quantity}${deployed}</span>`
          })
          .join('')
      : '<small>Keine Gegenstände</small>'

  const needKeys = ['hunger', 'toilet', 'fun', 'energy'] as const
  needKeys.forEach((key) => {
    const value = Math.round(visitor.needs[key])
    const bar = requireElement<HTMLElement>(`#${key}-bar`)
    const output = requireElement<HTMLElement>(`#${key}-value`)
    bar.style.width = `${value}%`
    bar.dataset.level = value < 30 ? 'critical' : value < 60 ? 'warning' : 'good'
    output.textContent = `${value}%`
  })
  const alcoholValue = Math.round(visitor.alcoholLevel)
  const alcoholBar = requireElement<HTMLElement>('#alcohol-bar')
  const alcoholOutput = requireElement<HTMLElement>('#alcohol-value')
  alcoholBar.style.width = `${alcoholValue}%`
  alcoholBar.dataset.level =
    alcoholValue >= 70 ? 'critical' : alcoholValue >= 40 ? 'warning' : 'good'
  alcoholOutput.textContent = `${alcoholValue}%`
  const nauseaValue = Math.round(visitor.nausea)
  const nauseaBar = requireElement<HTMLElement>('#nausea-bar')
  const nauseaOutput = requireElement<HTMLElement>('#nausea-value')
  nauseaBar.style.width = `${nauseaValue}%`
  nauseaBar.dataset.level =
    nauseaValue >= 75 ? 'critical' : nauseaValue >= 40 ? 'warning' : 'good'
  nauseaOutput.textContent = `${nauseaValue}%`
  const motivationValue = Math.round(visitor.motivation)
  const motivationBar = requireElement<HTMLElement>('#motivation-bar')
  const motivationOutput = requireElement<HTMLElement>('#motivation-value')
  motivationBar.style.width = `${motivationValue}%`
  motivationBar.dataset.level =
    motivationValue < 25 ? 'critical' : motivationValue < 55 ? 'warning' : 'good'
  motivationOutput.textContent = `${motivationValue}%`
}

function openEntityInfoForBuilding(buildingId: string): void {
  selectedEntity = { type: 'building', id: buildingId }
  entityTab = 'overview'
  selectedVisitorId = null
  followedVisitorId = null
  view.followVisitor(null)
  visitorPanel.classList.remove('visible')
  entityPanel.hidden = false
  updateEntityPanel()
}

function openEntityInfoForCoaster(coasterId: string): void {
  selectedEntity = { type: 'coaster', id: coasterId }
  entityTab = 'overview'
  selectedVisitorId = null
  followedVisitorId = null
  view.followVisitor(null)
  visitorPanel.classList.remove('visible')
  entityPanel.hidden = false
  updateEntityPanel()
}

function updateEntityPanel(): void {
  editStageButton.hidden = true
  if (!selectedEntity) return
  if (selectedEntity.type === 'building') {
    const building = game.snapshot.buildings.find((item) => item.id === selectedEntity?.id)
    if (!building) {
      closeEntityPanel()
      return
    }
    editStageButton.hidden = building.kind !== 'stage'
    const definition = BUILDINGS[building.kind]
    entityIcon.textContent = definition.icon
    entityType.textContent = 'Gebäude'
    entityName.textContent = definition.name
    const scheduledActive = game.isBuildingCurrentlyActive(building)
    const needsPower = (SIMULATION_CONFIG.power.demand[building.kind] ?? 0) > 0
    const hasPower = game.isBuildingPowered(building.id)
    const stageDayPlanActive =
      building.kind === 'stage' &&
      game.isOfferCurrentlyActive('stages')
    entityStatus.textContent =
      needsPower && !hasPower
        ? 'Kein Strom – Kabel zum Generator verlegen'
      : stageDayPlanActive && !scheduledActive
        ? `☕ ${building.bandName ?? 'Band'} macht 30 Minuten Pause`
      : !scheduledActive
        ? 'Nach Tagesplan derzeit geschlossen'
        : building.kind === 'stage'
        ? `🎸 ${building.bandName ?? 'Band'} spielt gerade`
        : building.kind === 'directionalSpeaker'
          ? `Schallrichtung ${getIsoDirectionIcon(building.rotation)} · direkt davor zu laut`
          : building.kind === 'omniSpeaker'
            ? 'Beschallt die Umgebung in alle Richtungen'
            : building.kind === 'wasteBin'
              ? `Füllstand ${building.wasteFill ?? 0}/${SIMULATION_CONFIG.waste.binCapacity} · Gäste im Umkreis von 7 Feldern nutzen ihn`
            : `Zugang ${getIsoDirectionIcon(building.rotation)} · Ebene ${building.elevation}`
    const demand = SIMULATION_CONFIG.power.demand[building.kind] ?? 0
    const output = SIMULATION_CONFIG.power.output[building.kind] ?? 0
    entityStats.innerHTML = `
      <span>Baukosten <b>${formatMoney(definition.cost + (building.stageDesign ? stageStats(building.stageDesign).cost : 0))}</b></span>
      ${building.stageDesign ? `<span>Eigene Bühne <b>${escapeHtml(building.stageDesign.name)}</b></span><span>Party / Umgebung <b>${stageStats(building.stageDesign).party} / ${stageStats(building.stageDesign).beauty}</b></span><span>Technik zusätzlich <b>${stageStats(building.stageDesign).power} kW · ${stageStats(building.stageDesign).upkeep} €/h</b></span>` : ''}
      <span>Unterhalt <b>${formatMoney(definition.upkeep)}/h</b></span>
      <span>Kapazität <b>${definition.capacity}</b></span>
      ${['food','alcohol','toilet'].includes(building.kind) ? `<span>Warenbestand <b>${Math.floor(game.snapshot.festival.infrastructure.shops[building.id]?.[building.kind==='food'?'food':building.kind==='alcohol'?'drinks':'water']??0)} / Ziel 40</b></span>` : ''}
      ${
        building.kind === 'wasteBin'
          ? `<span>Inhalt <b>${building.wasteFill ?? 0}/${SIMULATION_CONFIG.waste.binCapacity}</b></span>`
          : ''
      }
      ${
        output > 0
          ? `<span>Leistung <b>${output} kW</b></span>`
          : demand > 0
            ? `<span>Strom <b>${demand} kW ${hasPower ? 'versorgt' : 'ohne Netz'}</b></span>`
            : ''
      }
    `
    entityTabs.classList.remove('visible')
    entityOverview.hidden = false
    entityDynamics.classList.remove('visible')
    const hasPrice =
      building.kind === 'food' || building.kind === 'ride' || building.kind === 'alcohol'
    priceOptions.classList.toggle('visible', hasPrice)
    if (hasPrice && document.activeElement !== entityPriceInput) {
      entityPriceInput.value = String(building.price)
    }
    const isSecurityGate = building.kind === 'securityGate'
    securityOptions.classList.toggle('visible', isSecurityGate)
    if (isSecurityGate) {
      const config = building.securityConfig!
      const assigned = game.snapshot.staff.find(
        (member) =>
          member.role === 'security' && member.assignedBuildingId === building.id,
      )
      securityStaffing.textContent = assigned
        ? `Besetzt durch ${assigned.name}`
        : 'Unbesetzt – Kontrollen finden nicht statt'
      if (document.activeElement !== securityThoroughness) {
        securityThoroughness.value = String(Math.round(config.thoroughness * 100))
      }
      securityThoroughnessValue.textContent = `${Math.round(config.thoroughness * 100)}%`
      const itemsFingerprint = `${building.id}:${[...config.prohibitedItems].sort().join(',')}`
      if (itemsFingerprint !== securityItemsFingerprint) {
        securityItemsFingerprint = itemsFingerprint
        securityProhibitedItems.innerHTML = Object.values(INVENTORY_ITEMS)
          .map(
            (item) =>
              `<label><input type="checkbox" data-security-item="${item.kind}" ${config.prohibitedItems.includes(item.kind) ? 'checked' : ''}> ${item.icon} ${item.name}</label>`,
          )
          .join('')
      }
    }
    coasterOptions.classList.remove('visible')
    return
  }

  const coaster = game.getCoaster(selectedEntity.id)
  if (!coaster) {
    closeEntityPanel()
    return
  }
  const type = COASTER_TYPES[coaster.typeId]
  const train = coaster.train
  const operationLabels = {
    closed: 'Geschlossen',
    open: 'Geöffnet',
    test: 'Testbetrieb',
  }
  entityIcon.textContent = '🎢'
  entityType.textContent = type.name
  entityName.textContent = coaster.name
  entityStatus.textContent = !coaster.closed
    ? 'Die Strecke ist noch nicht geschlossen.'
    : coaster.operationMode === 'open' && (!coaster.entrance || !coaster.exit)
      ? 'Die Station benötigt einen Eingang und einen Ausgang.'
      : coaster.operationMode === 'closed'
        ? 'Die Achterbahn ist geschlossen.'
        : coaster.operationMode === 'open' &&
            !game.isOfferCurrentlyActive('rides')
          ? 'Nach Tagesplan derzeit geschlossen.'
      : train.state === 'running'
        ? `Zug unterwegs · ${Math.round(train.progress * 100)}% · ${Math.abs(train.speed * 3.6).toFixed(1)} km/h${train.speed < 0 ? ' rückwärts' : ''}`
        : train.state === 'unloading'
          ? `Aussteigen · noch ${train.passengers} Gäste im Zug`
          : `Einsteigen · ${train.passengers}/${train.capacity} Gäste · ${Math.floor(train.waitMinutes)} min`
  entityStats.innerHTML = `
    <span>Status <b>${operationLabels[coaster.operationMode]}</b></span>
    <span>Schienenelemente <b>${coaster.pieces.length}</b></span>
    <span>Stationsplattformen/Wagen <b>${train.cars}</b></span>
    <span>Warteschlange <b>${coaster.queue.length}/${game.getCoasterQueueCapacity(coaster.id)}</b></span>
    <span>Stationskettenantrieb <b>Automatisch</b></span>
    <span>Kettenzüge <b>${coaster.pieces.filter((piece) => piece.chainLift).length}</b></span>
    <span>Geschwindigkeit <b>${Math.abs(train.speed * 3.6).toFixed(1)} km/h</b></span>
  `
  coasterOptions.classList.add('visible')
  securityOptions.classList.remove('visible')
  entityTabs.classList.add('visible')
  entityOverview.hidden = entityTab !== 'overview'
  entityDynamics.classList.toggle('visible', entityTab === 'dynamics')
  document.querySelectorAll<HTMLButtonElement>('[data-entity-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.entityTab === entityTab)
  })
  priceOptions.classList.add('visible')
  if (document.activeElement !== entityPriceInput) {
    entityPriceInput.value = String(coaster.ticketPrice)
  }
  operationModeSelect.value = coaster.operationMode
  dispatchModeSelect.value = coaster.settings.dispatchMode
  dispatchIntervalInput.value = String(coaster.settings.dispatchIntervalMinutes)
  dispatchValue.textContent = `${coaster.settings.dispatchIntervalMinutes} min`
  if (entityTab === 'dynamics') updateCoasterDynamics(coaster)
}

function updateCoasterDynamics(coaster: Coaster): void {
  const telemetry = coaster.telemetry
  const hasData = telemetry.samples.length > 1
  const minimumVertical = Number.isFinite(telemetry.minVerticalG)
    ? telemetry.minVerticalG
    : 0
  const maximumVertical = Number.isFinite(telemetry.maxVerticalG)
    ? telemetry.maxVerticalG
    : 0
  const minimumLateral = hasData
    ? Math.min(...telemetry.samples.map((sample) => sample.lateralG))
    : 0
  const maximumLateral = hasData
    ? Math.max(...telemetry.samples.map((sample) => sample.lateralG))
    : 0
  const minimumLongitudinal = hasData
    ? Math.min(...telemetry.samples.map((sample) => sample.longitudinalG))
    : 0
  const maximumLongitudinal = hasData
    ? Math.max(...telemetry.samples.map((sample) => sample.longitudinalG))
    : 0
  const worldUnitMeters = COASTER_TYPES[coaster.typeId].physics.worldUnitMeters
  const trackLengthMeters = coaster.pieces.reduce(
    (total, piece) =>
      total +
      piece.points.slice(1).reduce((pieceLength, point, index) => {
        const previous = piece.points[index]
        return previous
          ? pieceLength +
              Math.hypot(
                point.x - previous.x,
                point.y - previous.y,
                point.z - previous.z,
              ) *
                worldUnitMeters
          : pieceLength
      }, 0),
    0,
  )
  const activeRunCount = telemetry.measuring ? 1 : 0
  const measuredRunCount = Math.max(1, telemetry.completedRuns + activeRunCount)
  const averageSpeedKmh =
    telemetry.durationSeconds > 0
      ? (telemetry.cumulativeDistanceMeters / telemetry.durationSeconds) * 3.6
      : 0
  const averageDurationSeconds = telemetry.durationSeconds / measuredRunCount
  const averageAirtimeSeconds = telemetry.airtimeSeconds / measuredRunCount
  const dangers: string[] = []
  const warnings: string[] = []
  if (minimumVertical < -1.5) dangers.push('zu starke negative Vertikalkraft')
  else if (minimumVertical < -0.8) warnings.push('hohe negative Vertikalkraft')
  if (maximumVertical > 5) dangers.push('zu starke positive Vertikalkraft')
  else if (maximumVertical > 4) warnings.push('hohe positive Vertikalkraft')
  if (telemetry.maxAbsLateralG > 2.5) dangers.push('zu starke Seitenkraft')
  else if (telemetry.maxAbsLateralG > 1.8) warnings.push('hohe Seitenkraft')
  if (telemetry.maxAbsLongitudinalG > 3) dangers.push('zu starke Längskraft')
  else if (telemetry.maxAbsLongitudinalG > 2) warnings.push('hohe Längskraft')

  const safetyLevel = !hasData ? 'unknown' : dangers.length > 0 ? 'danger' : warnings.length > 0 ? 'warning' : 'safe'
  dynamicsSafety.className = `dynamics-safety ${safetyLevel}`
  dynamicsSafety.textContent = !hasData
    ? 'Noch keine vollständige Messfahrt'
    : dangers.length > 0
      ? '⚠ Potenziell gesundheitsschädlich'
      : warnings.length > 0
        ? '△ Hohe Belastung – Strecke prüfen'
        : '✓ Belastungen im sicheren Bereich'

  dynamicsStats.innerHTML = `
    <span><small>Vertikal-G</small><b>${minimumVertical.toFixed(2)} bis ${maximumVertical.toFixed(2)} g</b></span>
    <span><small>Seiten-G</small><b>${minimumLateral.toFixed(2)} bis ${maximumLateral.toFixed(2)} g</b></span>
    <span><small>Längs-G</small><b>${minimumLongitudinal.toFixed(2)} bis ${maximumLongitudinal.toFixed(2)} g</b></span>
    <span><small>Ø Hängezeit</small><b>${averageAirtimeSeconds.toFixed(1)} s</b></span>
    <span><small>Höchsttempo</small><b>${telemetry.maxSpeedKmh.toFixed(1)} km/h</b></span>
    <span><small>Ø Tempo</small><b>${averageSpeedKmh.toFixed(1)} km/h</b></span>
    <span><small>Ø Fahrtdauer</small><b>${averageDurationSeconds.toFixed(1)} s</b></span>
    <span><small>Streckenlänge</small><b>${trackLengthMeters.toFixed(0)} m</b></span>
  `
  dynamicsInfo.textContent = !hasData
    ? 'Öffne den Testbetrieb oder lasse einen Zug fahren, um Messwerte zu erfassen.'
    : dangers.length > 0
      ? `Kritische Werte: ${dangers.join(', ')}. Grenzwerte: −1,5 bis +5 g vertikal, 2,5 g seitlich und 3 g längs.`
      : warnings.length > 0
        ? `Hinweise: ${warnings.join(', ')}. Kurven und Übergänge sollten weicher gestaltet werden.`
        : `${telemetry.completedRuns} abgeschlossene Messfahrt${telemetry.completedRuns === 1 ? '' : 'en'} · Hängezeit wird unter 0,2 Vertikal-g gezählt.`
  drawTelemetryChart(coaster)
}

function drawTelemetryChart(coaster: Coaster): void {
  const context = telemetryChart.getContext('2d')
  if (!context) return
  const width = telemetryChart.width
  const height = telemetryChart.height
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#172720'
  context.fillRect(0, 0, width, height)

  const samples = coaster.telemetry.samples
  if (samples.length < 2) {
    context.fillStyle = '#8fa69c'
    context.font = '22px sans-serif'
    context.textAlign = 'center'
    context.fillText('Messfahrt erforderlich', width / 2, height / 2)
    return
  }

  const padding = { left: 48, right: 16, top: 16, bottom: 30 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const maximumDistance = Math.max(1, ...samples.map((sample) => sample.distance))
  const forceValues = samples.flatMap((sample) => [
    sample.verticalG,
    sample.lateralG,
    sample.longitudinalG,
  ])
  const minimumForce = Math.max(-8, Math.floor(Math.min(-2, ...forceValues)))
  const maximumForce = Math.min(8, Math.ceil(Math.max(6, ...forceValues)))
  const forceRange = Math.max(1, maximumForce - minimumForce)
  const xFor = (distance: number) =>
    padding.left + (distance / maximumDistance) * plotWidth
  const yFor = (force: number) =>
    padding.top + ((maximumForce - force) / forceRange) * plotHeight

  context.fillStyle = 'rgba(218, 82, 82, 0.1)'
  context.fillRect(
    padding.left,
    padding.top,
    plotWidth,
    Math.max(0, yFor(5) - padding.top),
  )
  context.fillRect(
    padding.left,
    yFor(-1.5),
    plotWidth,
    Math.max(0, padding.top + plotHeight - yFor(-1.5)),
  )

  context.font = '16px sans-serif'
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  for (let force = Math.ceil(minimumForce); force <= maximumForce; force += 1) {
    const y = yFor(force)
    context.strokeStyle = force === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)'
    context.beginPath()
    context.moveTo(padding.left, y)
    context.lineTo(width - padding.right, y)
    context.stroke()
    context.fillStyle = '#80978c'
    context.fillText(`${force}g`, padding.left - 7, y)
  }
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.fillText('Streckenposition', padding.left + plotWidth / 2, height - 22)

  const series = [
    { key: 'verticalG', color: '#72df91' },
    { key: 'lateralG', color: '#ef79bd' },
    { key: 'longitudinalG', color: '#f0c85a' },
  ] as const
  series.forEach(({ key, color }) => {
    context.strokeStyle = color
    context.lineWidth = 3
    context.beginPath()
    samples.forEach((sample, index) => {
      const x = xFor(sample.distance)
      const y = yFor(sample[key])
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()
  })
}

function closeEntityPanel(): void {
  selectedEntity = null
  entityPanel.hidden = true
}

function showToast(message: string, isError = false): void {
  window.clearTimeout(toastTimer)
  toast.textContent = message
  toast.className = isError ? 'visible error' : 'visible'
  toastTimer = window.setTimeout(() => {
    toast.className = ''
  }, 2200)
}

document.querySelectorAll<HTMLButtonElement>('[data-build-category]').forEach((button) => {
  button.addEventListener('click', () => {
    const category = button.dataset.buildCategory
    const wasOpen = button.classList.contains('open')
    document
      .querySelectorAll<HTMLElement>('[data-build-category], [data-build-panel]')
      .forEach((element) => element.classList.remove('open'))
    if (!wasOpen) {
      button.classList.add('open')
      document
        .querySelector<HTMLElement>(`[data-build-panel="${category}"]`)
        ?.classList.add('open')
    }
  })
})

document.querySelectorAll<HTMLButtonElement>('.build-menu [data-tool]').forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.tool as Tool
    if (tool === 'coaster') {
      openCoasterBuilder()
      return
    }
    if (pathEditorActive && tool !== 'path') closePathEditor()
    if (coasterBuilderActive) closeCoasterBuilder()
    game.setTool(tool)
    if (tool === 'road' || tool === 'path' && !pathEditorActive) supplyPlanner.activateWay(tool)
  })
})

document.querySelectorAll<HTMLButtonElement>('[data-way-build], [data-way-icon], .supply-planner [data-tool]').forEach(button => {
  button.addEventListener('click', () => {
    if (pathEditorActive && !button.closest('#path-construction')) closePathEditor()
    if (coasterBuilderActive) closeCoasterBuilder()
  })
})

document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => game.setSpeed(Number(button.dataset.speed)))
})

requireElement<HTMLButtonElement>('#open-staff').addEventListener('click', () => {
  staffPanel.classList.add('visible')
  updateStaffPanel()
})
requireElement<HTMLButtonElement>('#open-visitors').addEventListener('click', () => {
  visitorOverviewPanel.classList.add('visible')
  visitorOverviewFingerprint = ''
  updateVisitorOverview(true)
})
requireElement<HTMLButtonElement>('#open-day-plan').addEventListener('click', () => {
  dayPlanPanel.classList.add('visible')
  dayPlanFingerprint = ''
  updateDayPlanPanel(true)
})
requireElement<HTMLButtonElement>('#open-logistics').addEventListener('click', () => {
  logisticsPanel.classList.add('visible')
  logisticsFingerprint = ''
  updateLogisticsPanel(true)
})
requireElement<HTMLButtonElement>('#debug-money').addEventListener('click', () => {
  const result = game.addDebugMoney()
  debugMenuPanel.classList.remove('open')
  debugMenuToggle.setAttribute('aria-expanded', 'false')
  showToast(result.message)
})
const debugMenuToggle =
  requireElement<HTMLButtonElement>('#toggle-debug-menu')
const debugMenuPanel =
  requireElement<HTMLDivElement>('#debug-menu-panel')
const saveMenuToggle =
  requireElement<HTMLButtonElement>('#toggle-save-menu')
const saveMenuPanel =
  requireElement<HTMLDivElement>('#save-menu-panel')
// The button row wraps onto multiple lines depending on available width, so
// the panel can't rely on a static CSS anchor (it would end up far from
// whichever line the button currently sits on). Position it from the
// button's live on-screen rect instead, clamped to stay fully in view.
function positionDropdownPanel(button: HTMLElement, panel: HTMLElement, panelWidth = 250): void {
  const margin = 8
  const width = Math.min(panelWidth, window.innerWidth - margin * 2)
  const rect = button.getBoundingClientRect()
  const left = Math.min(
    Math.max(rect.right - width, margin),
    window.innerWidth - width - margin,
  )
  panel.style.left = `${left}px`
  panel.style.top = `${rect.bottom + margin}px`
}

const closeSaveMenu = (): void => {
  saveMenuPanel.classList.remove('open')
  saveMenuToggle.setAttribute('aria-expanded', 'false')
}
const closeDebugMenu = (): void => {
  debugMenuPanel.classList.remove('open')
  debugMenuToggle.setAttribute('aria-expanded', 'false')
}
debugMenuToggle.addEventListener('click', () => {
  closeSaveMenu()
  const open = debugMenuPanel.classList.toggle('open')
  debugMenuToggle.setAttribute('aria-expanded', String(open))
  if (open) positionDropdownPanel(debugMenuToggle, debugMenuPanel)
})
saveMenuToggle.addEventListener('click', () => {
  closeDebugMenu()
  const open = saveMenuPanel.classList.toggle('open')
  saveMenuToggle.setAttribute('aria-expanded', String(open))
  if (open) positionDropdownPanel(saveMenuToggle, saveMenuPanel)
})
saveMenuPanel.addEventListener('click', (event) => {
  if (!(event.target as HTMLElement).closest('button')) return
  closeSaveMenu()
})

// Build menu and bulldoze menu are mutually exclusive; whenever neither is
// open, the active tool falls back to "Info" (inspect).
const infoButton = requireElement<HTMLButtonElement>('#open-info')
const buildMenuToggle = requireElement<HTMLButtonElement>('#open-build-menu')
const buildMenuPanel = requireElement<HTMLElement>('#build-menu')
const bulldozeMenuToggle = requireElement<HTMLButtonElement>('#toggle-bulldoze-menu')
const bulldozeMenuPanel = requireElement<HTMLDivElement>('#bulldoze-menu-panel')
const bulldozeSizeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('[data-bulldoze-size]'),
)
makeDraggable(requireElement<HTMLElement>('.build-menu-header'), buildMenuPanel)
makeResizable(buildMenuPanel)
makeDraggable(requireElement<HTMLElement>('.bulldoze-panel-header'), bulldozeMenuPanel)
makeResizable(bulldozeMenuPanel)

const activateInfoIfNothingOpen = (): void => {
  if (buildMenuPanel.hidden && !bulldozeMenuPanel.classList.contains('open')) {
    game.setTool('inspect')
  }
}
const closeBuildMenu = (): void => {
  buildMenuPanel.hidden = true
  buildMenuToggle.setAttribute('aria-expanded', 'false')
}
const closeBulldozeMenu = (): void => {
  bulldozeMenuPanel.classList.remove('open')
  bulldozeMenuToggle.setAttribute('aria-expanded', 'false')
}
infoButton.addEventListener('click', () => {
  closeBuildMenu()
  closeBulldozeMenu()
  game.setTool('inspect')
})
buildMenuToggle.addEventListener('click', () => {
  if (!buildMenuPanel.hidden) {
    closeBuildMenu()
    activateInfoIfNothingOpen()
    return
  }
  closeBulldozeMenu()
  buildMenuPanel.hidden = false
  buildMenuToggle.setAttribute('aria-expanded', 'true')
})
requireElement<HTMLButtonElement>('[data-close-build-menu]').addEventListener('click', () => {
  closeBuildMenu()
  activateInfoIfNothingOpen()
})
bulldozeMenuToggle.addEventListener('click', () => {
  if (bulldozeMenuPanel.classList.contains('open')) {
    closeBulldozeMenu()
    activateInfoIfNothingOpen()
    return
  }
  closeBuildMenu()
  bulldozeMenuPanel.classList.add('open')
  bulldozeMenuToggle.setAttribute('aria-expanded', 'true')
  game.setTool('bulldoze')
})
requireElement<HTMLButtonElement>('[data-close-bulldoze-menu]').addEventListener('click', () => {
  closeBulldozeMenu()
  activateInfoIfNothingOpen()
})
bulldozeSizeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    bulldozeBrushSize = Number(button.dataset.bulldozeSize)
    bulldozeSizeButtons.forEach((b) => b.classList.toggle('active', b === button))
    game.setTool('bulldoze')
  })
})
window.addEventListener('resize', () => {
  if (debugMenuPanel.classList.contains('open')) positionDropdownPanel(debugMenuToggle, debugMenuPanel)
  if (saveMenuPanel.classList.contains('open')) positionDropdownPanel(saveMenuToggle, saveMenuPanel)
})
requireElement<HTMLButtonElement>('#debug-remove-cars').addEventListener(
  'click',
  () => {
    const result = game.removeVisitorCarsForDebug()
    debugMenuPanel.classList.remove('open')
    debugMenuToggle.setAttribute('aria-expanded', 'false')
    showToast(result.message)
  },
)

const scenarioToggle = requireElement<HTMLButtonElement>('#toggle-scenario')
const scenarioPanel = requireElement<HTMLElement>('#scenario-panel')
const scenarioCarShare = requireElement<HTMLInputElement>('#scenario-car-share')
const scenarioParty = requireElement<HTMLInputElement>('#scenario-party')
const scenarioBeauty = requireElement<HTMLInputElement>('#scenario-beauty')
const scenarioAggression = requireElement<HTMLInputElement>('#scenario-aggression')
const scenarioMoney = requireElement<HTMLInputElement>('#scenario-money')
const scenarioEnvironment = requireElement<HTMLSelectElement>('#scenario-environment')
const scenarioUnevenness = requireElement<HTMLInputElement>('#scenario-unevenness')
const scenarioGroundDetails = requireElement<HTMLElement>('#scenario-ground-details')
const scenarioUnevennessValue = requireElement<HTMLElement>('#scenario-unevenness-value')
const scenarioWorldSize = requireElement<HTMLSelectElement>('#scenario-world-size')
scenarioEnvironment.addEventListener('change', () => updateScenarioLabels())
const scenarioCarValue = requireElement<HTMLElement>('#scenario-car-value')
const scenarioPartyValue = requireElement<HTMLElement>('#scenario-party-value')
const scenarioBeautyValue = requireElement<HTMLElement>('#scenario-beauty-value')
const scenarioAggressionValue = requireElement<HTMLElement>('#scenario-aggression-value')
const scenarioMoneyValue = requireElement<HTMLElement>('#scenario-money-value')

function readScenarioForm(): ScenarioSettings {
  const worldSize = Number(scenarioWorldSize.value)
  return normalizeScenarioSettings({
    environment: scenarioEnvironment.value as Environment,
    unevenness: Number(scenarioUnevenness.value) / 100,
    carArrivalShare: Number(scenarioCarShare.value) / 100,
    partyAffinity: Number(scenarioParty.value) / 100,
    beautyAffinity: Number(scenarioBeauty.value) / 100,
    aggressiveShare: Number(scenarioAggression.value) / 100,
    startingMoney: Number(scenarioMoney.value),
    worldSize: SCENARIO_WORLD_SIZES.includes(
      worldSize as (typeof SCENARIO_WORLD_SIZES)[number],
    )
      ? (worldSize as (typeof SCENARIO_WORLD_SIZES)[number])
      : 48,
  })
}

function fillScenarioForm(settings: ScenarioSettings): void {
  scenarioEnvironment.value = settings.environment
  scenarioUnevenness.value = String(Math.round(settings.unevenness * 100))
  scenarioCarShare.value = String(Math.round(settings.carArrivalShare * 100))
  scenarioParty.value = String(Math.round(settings.partyAffinity * 100))
  scenarioBeauty.value = String(Math.round(settings.beautyAffinity * 100))
  scenarioAggression.value = String(Math.round(settings.aggressiveShare * 100))
  scenarioMoney.value = String(settings.startingMoney)
  scenarioWorldSize.value = String(settings.worldSize)
  updateScenarioLabels()
}

function updateScenarioLabels(): void {
  scenarioGroundDetails.textContent = ENVIRONMENTS[scenarioEnvironment.value as Environment].detail
  scenarioUnevennessValue.textContent = `${scenarioUnevenness.value} % · ${Number(scenarioUnevenness.value) === 0 ? 'Flach' : Number(scenarioUnevenness.value) <= 30 ? 'Sanft gewellt' : Number(scenarioUnevenness.value) <= 65 ? 'Hügelig' : 'Stark hügelig'}`
  scenarioCarValue.textContent = `${scenarioCarShare.value}%`
  scenarioPartyValue.textContent = `${scenarioParty.value}%`
  scenarioBeautyValue.textContent = `${scenarioBeauty.value}%`
  scenarioAggressionValue.textContent = `${scenarioAggression.value}%`
  scenarioMoneyValue.textContent = `${Number(scenarioMoney.value).toLocaleString('de-DE')} €`
}

function setScenarioPanelOpen(open: boolean): void {
  scenarioPanel.hidden = !open
  scenarioToggle.setAttribute('aria-expanded', String(open))
  if (open) {
    setMultiplayerPanelOpen(false)
    fillScenarioForm(game.snapshot.scenario)
  }
}

function setMultiplayerPanelOpen(open: boolean): void {
  multiplayerPanel.hidden = !open
  multiplayerToggle.setAttribute('aria-expanded', String(open))
  if (open) setScenarioPanelOpen(false)
}

function readMultiplayerName(): string {
  const name = multiplayerName.value.trim() || 'Spieler'
  window.localStorage.setItem(MULTIPLAYER_NAME_KEY, name)
  return name
}

function renderMultiplayerStatus(status: MultiplayerStatus): void {
  const connected = status.connected
  multiplayerStatusBadge.dataset.state = connected ? 'online' : status.message ? 'disconnected' : 'solo'
  multiplayerStatus.textContent = connected
    ? `Online · ${status.mode === 'host' ? 'Host' : 'Verbunden'} · Raum ${status.code}`
    : status.message || 'Singleplayer'
  multiplayerToggle.textContent = connected
    ? status.mode === 'host'
      ? `🌐 Host ${status.code}`
      : `🌐 Online ${status.code}`
    : '🌐 Mehrspieler'
  multiplayerConnectActions.hidden = connected
  multiplayerCodeField.hidden = connected
  multiplayerJoinActions.hidden = connected
  multiplayerRoom.hidden = !connected
  multiplayerCodeDisplay.textContent = status.code
  multiplayerJoinUrl.textContent = status.joinUrl
  multiplayerPlayers.innerHTML = status.players
    .map(
      (player) =>
        `<li>${player.name}${player.role === 'host' ? ' · Host' : ''}</li>`,
    )
    .join('')
}

multiplayer.onStatus = renderMultiplayerStatus
multiplayer.onToast = (message, isError) => {
  if (message) showToast(message, Boolean(isError))
}
multiplayerName.value =
  window.localStorage.getItem(MULTIPLAYER_NAME_KEY) ??
  `Spieler ${Math.floor(Math.random() * 90 + 10)}`
const joinFromUrl = new URLSearchParams(window.location.search).get('join')
if (joinFromUrl) {
  multiplayerCode.value = joinFromUrl.toUpperCase()
  setMultiplayerPanelOpen(true)
}

multiplayerToggle.addEventListener('click', () => {
  setMultiplayerPanelOpen(multiplayerPanel.hasAttribute('hidden'))
})
requireElement<HTMLButtonElement>('#close-multiplayer').addEventListener('click', () => {
  setMultiplayerPanelOpen(false)
})
makeDraggable(multiplayerPanel.querySelector<HTMLElement>('.panel-header')!, multiplayerPanel)
makeResizable(multiplayerPanel)
multiplayerHostButton.addEventListener('click', () => {
  multiplayer.host(readMultiplayerName())
  showToast('Verbinde als Host…')
})
multiplayerJoinButton.addEventListener('click', () => {
  const code = multiplayerCode.value.trim().toUpperCase()
  if (code.length < 4) {
    showToast('Bitte einen 4-stelligen Code eingeben', true)
    return
  }
  multiplayer.join(code, readMultiplayerName())
  showToast(`Trete ${code} bei…`)
})
multiplayerLeaveButton.addEventListener('click', () => {
  multiplayer.disconnect()
})
multiplayerCopyButton.addEventListener('click', async () => {
  const code = multiplayer.status.code
  if (!code) return
  const text = `${window.location.origin}?join=${code}`
  try {
    await navigator.clipboard.writeText(text)
    showToast('Einladungslink kopiert')
  } catch {
    showToast(code)
  }
})

;[
  scenarioCarShare,
  scenarioParty,
  scenarioBeauty,
  scenarioAggression,
  scenarioMoney,
  scenarioUnevenness,
].forEach((input) => {
  input.addEventListener('input', () => updateScenarioLabels())
})
scenarioToggle.addEventListener('click', () => {
  setScenarioPanelOpen(scenarioPanel.hasAttribute('hidden'))
})
requireElement<HTMLButtonElement>('#close-scenario').addEventListener('click', () => {
  setScenarioPanelOpen(false)
})
makeDraggable(scenarioPanel.querySelector<HTMLElement>('.panel-header')!, scenarioPanel)
makeResizable(scenarioPanel)
requireElement<HTMLButtonElement>('#start-scenario').addEventListener(
  'click',
  () => {
    if (multiplayer.status.mode === 'client') {
      showToast('Nur der Host kann ein neues Szenario starten', true)
      return
    }
    if (pathEditorActive) closePathEditor()
    selectedVisitorId = null
    followedVisitorId = null
    view.followVisitor(null)
    visitorPanel.classList.remove('visible')
    bindGameState(GameState.startNew(readScenarioForm()))
    setScenarioPanelOpen(false)
    showToast('Neues Szenario gestartet')
  },
)
fillScenarioForm(game.snapshot.scenario)
requireElement<HTMLButtonElement>('#close-logistics').addEventListener('click', () => {
  logisticsPanel.classList.remove('visible')
})
document.querySelectorAll<HTMLButtonElement>('[data-logistics-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document
      .querySelectorAll<HTMLButtonElement>('[data-logistics-tab]')
      .forEach((candidate) =>
        candidate.classList.toggle('active', candidate === button),
      )
    const routes = button.dataset.logisticsTab === 'routes'
    logisticsOverview.hidden = routes
    logisticsRoutes.hidden = !routes
  })
})
logisticsOverview.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button')
  if (!button) return
  const garageId = button.dataset.buyAmbulance
  const depotId = button.dataset.buyBus
  const sellDepotId = button.dataset.sellBus
  const garbageDepotId = button.dataset.buyGarbage
  const sellGarbageId = button.dataset.sellGarbage
  const result = garageId
    ? game.buyAmbulance(garageId)
    : depotId
      ? game.buyBus(depotId)
      : sellDepotId
        ? game.sellBus(sellDepotId)
      : garbageDepotId
        ? game.buyGarbageTruck(garbageDepotId)
      : sellGarbageId
        ? game.sellGarbageTruck(sellGarbageId)
      : null
  if (result) showToast(result.message, !result.ok)
})
requireElement<HTMLButtonElement>('#create-bus-line').addEventListener('click', () => {
  const selectedStops = [...busLineStops.selectedOptions].map(
    (option) => option.value,
  )
  const result = game.createBusLine(
    requireElement<HTMLInputElement>('#bus-line-name').value,
    busLineDepot.value,
    selectedStops,
    Number(requireElement<HTMLInputElement>('#bus-line-count').value),
    Number(requireElement<HTMLInputElement>('#bus-line-headway').value),
  )
  showToast(result.message, !result.ok)
  updateLogisticsPanel(true)
})
busLinesList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    '[data-delete-line]',
  )
  if (!button?.dataset.deleteLine) return
  const result = game.deleteBusLine(button.dataset.deleteLine)
  showToast(result.message, !result.ok)
})
requireElement<HTMLButtonElement>('#open-complaints').addEventListener('click', () => {
  complaintsPanel.classList.add('visible')
  complaintsFingerprint = ''
  updateComplaintsPanel(true)
})
requireElement<HTMLButtonElement>('#close-complaints').addEventListener('click', () => {
  complaintsPanel.classList.remove('visible')
})
requireElement<HTMLButtonElement>('#close-day-plan').addEventListener('click', () => {
  dayPlanPanel.classList.remove('visible')
})
dayPlanGrid.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    '[data-day-plan-offer][data-day-plan-hour]',
  )
  if (!button) return
  const offer = button.dataset.dayPlanOffer as DayPlanOffer
  const hour = Number(button.dataset.dayPlanHour)
  game.setDayPlanHour(offer, hour, !button.classList.contains('active'))
  updateDayPlanPanel(true)
})
function updateDayVisitorWindow(): void {
  const result = game.updateDayVisitorWindow(
    Number(dayEntryHour.value),
    Number(dayExitHour.value),
  )
  showToast(result.message, !result.ok)
  updateDayPlanPanel(true)
}
dayEntryHour.addEventListener('change', updateDayVisitorWindow)
dayExitHour.addEventListener('change', updateDayVisitorWindow)
campingCapacityBuffer.addEventListener('change', () => {
  const result = game.updateCampingCapacityBuffer(
    Number(campingCapacityBuffer.value),
  )
  showToast(result.message, !result.ok)
  updateDayPlanPanel(true)
})
requireElement<HTMLButtonElement>('#apply-festival-cycle').addEventListener(
  'click',
  () => {
    const result = game.updateFestivalCycle(
      Number(festivalLeadDays.value),
      Number(festivalActiveDays.value),
      Number(festivalBreakDays.value),
    )
    showToast(result.message, !result.ok)
    dayPlanFingerprint = ''
    updateDayPlanPanel(true)
  },
)
requireElement<HTMLButtonElement>('#close-visitor-overview').addEventListener('click', () => {
  visitorOverviewPanel.classList.remove('visible')
})
visitorThoughtFilter.addEventListener('input', () => {
  visitorOverviewPage = 0
  updateVisitorOverview(true)
})
visitorOverviewSort.addEventListener('change', () => {
  visitorOverviewPage = 0
  updateVisitorOverview(true)
})
visitorSortDirection.addEventListener('click', () => {
  visitorOverviewAscending = !visitorOverviewAscending
  updateVisitorOverview(true)
})
visitorPagePrevious.addEventListener('click', () => {
  visitorOverviewPage = Math.max(0, visitorOverviewPage - 1)
  updateVisitorOverview(true)
})
visitorPageNext.addEventListener('click', () => {
  visitorOverviewPage += 1
  updateVisitorOverview(true)
})
visitorOverviewList.addEventListener('click', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>(
    '[data-visitor-overview-id]',
  )
  const visitorId = row?.dataset.visitorOverviewId
  if (!visitorId) return
  visitorOverviewPanel.classList.remove('visible')
  selectVisitor(visitorId)
})
requireElement<HTMLButtonElement>('#close-staff').addEventListener('click', () => {
  staffPanel.classList.remove('visible')
})
staffList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const inspect = target.closest<HTMLButtonElement>('[data-inspect-staff]')
  if (inspect) staffDetails.open(inspect.dataset.inspectStaff!)
  const hire = target.closest<HTMLButtonElement>('[data-hire-staff]')
  const fire = target.closest<HTMLButtonElement>('[data-fire-staff]')
  const result = hire
    ? game.hireStaff(hire.dataset.hireStaff as StaffRole)
    : fire
      ? game.fireStaff(fire.dataset.fireStaff as StaffRole)
      : null
  if (result) showToast(result.message, !result.ok)
})

securityThoroughness.addEventListener('input', () => {
  securityThoroughnessValue.textContent = `${securityThoroughness.value}%`
})
securityThoroughness.addEventListener('change', () => {
  if (selectedEntity?.type !== 'building') return
  game.updateSecurityGate(selectedEntity.id, {
    thoroughness: Number(securityThoroughness.value) / 100,
  })
})
securityProhibitedItems.addEventListener('change', () => {
  if (selectedEntity?.type !== 'building') return
  const prohibitedItems = [
    ...securityProhibitedItems.querySelectorAll<HTMLInputElement>(
      '[data-security-item]:checked',
    ),
  ].map((input) => input.dataset.securityItem as keyof typeof INVENTORY_ITEMS)
  game.updateSecurityGate(selectedEntity.id, { prohibitedItems })
})

crowdingOverlayButton.addEventListener('click', () => {
  setMapOverlay(crowdingOverlayVisible ? null : 'crowding')
})

attractivenessOverlayButton.addEventListener('click', () => {
  setMapOverlay(attractivenessOverlayVisible ? null : 'attractiveness')
})

partyOverlayButton.addEventListener('click', () => {
  setMapOverlay(partyOverlayVisible ? null : 'party')
})

function setMapOverlay(
  overlay: 'crowding' | 'attractiveness' | 'party' | null,
): void {
  crowdingOverlayVisible = overlay === 'crowding'
  attractivenessOverlayVisible = overlay === 'attractiveness'
  partyOverlayVisible = overlay === 'party'
  view.setCrowdingOverlayVisible(crowdingOverlayVisible)
  view.setAttractivenessOverlayVisible(attractivenessOverlayVisible)
  view.setPartyMoodOverlayVisible(partyOverlayVisible)
  ;[
    [crowdingOverlayButton, crowdingOverlayVisible],
    [attractivenessOverlayButton, attractivenessOverlayVisible],
    [partyOverlayButton, partyOverlayVisible],
  ].forEach(([button, active]) => {
    ;(button as HTMLButtonElement).classList.toggle('active', Boolean(active))
    ;(button as HTMLButtonElement).setAttribute(
      'aria-pressed',
      String(active),
    )
  })
}

entryPriceInput.addEventListener('change', () => {
  game.updateEntryPrice(Number(entryPriceInput.value))
})

entityPriceInput.addEventListener('change', () => {
  if (!selectedEntity) return
  if (selectedEntity.type === 'coaster') {
    game.updateCoasterPrice(selectedEntity.id, Number(entityPriceInput.value))
  } else {
    game.updateBuildingPrice(selectedEntity.id, Number(entityPriceInput.value))
  }
})

document.querySelector<HTMLButtonElement>('#height-down')?.addEventListener('click', () => {
  game.adjustBuildElevation(-1)
})

document.querySelector<HTMLButtonElement>('#height-up')?.addEventListener('click', () => {
  game.adjustBuildElevation(1)
})

document.querySelector<HTMLButtonElement>('#rotate-build')?.addEventListener('click', () => {
  game.rotateBuild()
})

document.querySelector<HTMLButtonElement>('#toggle-path-editor')?.addEventListener('click', () => {
  openPathEditor()
})

document.querySelector<HTMLButtonElement>('#close-path-editor')?.addEventListener('click', () => {
  closePathEditor()
})

document.querySelectorAll<HTMLButtonElement>('[data-path-direction]').forEach((button) => {
  button.addEventListener('click', () => {
    pathDirection = Number(button.dataset.pathDirection)
    updatePathEditor()
  })
})

document.querySelectorAll<HTMLButtonElement>('[data-slope]').forEach((button) => {
  button.addEventListener('click', () => setPathSlope(Number(button.dataset.slope)))
})

pathFlowSetButton.addEventListener('click', () => {
  if (!pathAnchor) return
  showToast(
    game.setPathFlow(pathAnchor.x, pathAnchor.z, pathAnchor.elevation, pathDirection)
      .message,
  )
})
pathFlowRotateButton.addEventListener('click', () => {
  if (!pathAnchor) return
  const path = game.getPathAt(pathAnchor.x, pathAnchor.z, pathAnchor.elevation)
  const next = ((path?.flowDirection ?? pathDirection) + 1) % 4
  pathDirection = next
  showToast(game.setPathFlow(pathAnchor.x, pathAnchor.z, pathAnchor.elevation, next).message)
})
pathFlowClearButton.addEventListener('click', () => {
  if (!pathAnchor) return
  showToast(game.setPathFlow(pathAnchor.x, pathAnchor.z, pathAnchor.elevation, null).message)
})

document.querySelectorAll<HTMLButtonElement>('[data-path-type]').forEach((button) => {
  button.addEventListener('click', () => {
    pathConstructionType = button.dataset.pathType as 'normal' | 'queue'
    pathConstructionTypeSelect.value = pathConstructionType
    updatePathEditor()
  })
})

pathConstructionTypeSelect.addEventListener('change', () => {
  pathConstructionType = pathConstructionTypeSelect.value as 'normal' | 'queue'
  updatePathEditor()
})

buildPathButton.addEventListener('click', () => buildNextPathSegment())
undoPathButton.addEventListener('click', () => undoLastPathSegment())

document.querySelector<HTMLButtonElement>('#close-coaster-builder')?.addEventListener('click', () => {
  closeCoasterBuilder()
  game.setTool('inspect')
})

coasterRotateButton.addEventListener('click', () => {
  if (!activeCoasterId) game.rotateBuild()
  updateCoasterBuilder()
})

trackPieceSelect.addEventListener('change', () => updateCoasterBuilder())
document.querySelectorAll<HTMLButtonElement>('[data-track-piece]').forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.dataset.trackPiece as TrackPieceKind | undefined
    if (!kind) return
    trackPieceSelect.value = kind
    updateCoasterBuilder()
  })
})
document.querySelectorAll<HTMLButtonElement>('[data-track-pitch]').forEach((button) => {
  button.addEventListener('click', () => selectCoasterPitch(Number(button.dataset.trackPitch)))
})
document.querySelectorAll<HTMLButtonElement>('[data-track-bank]').forEach((button) => {
  button.addEventListener('click', () => selectCoasterBank(Number(button.dataset.trackBank)))
})
chainLiftInput.addEventListener('change', () => updateCoasterBuilder())
coasterBuildButton.addEventListener('click', () => buildCoasterPiece())
coasterUndoButton.addEventListener('click', () => undoCoasterPiece())
trackPreviousButton.addEventListener('click', () => moveCoasterTrackCursor(-1))
trackNextButton.addEventListener('click', () => moveCoasterTrackCursor(1))
deleteTrackButton.addEventListener('click', () => deleteCoasterFromSelection())
coasterEntranceButton.addEventListener('click', () => {
  coasterAccessMode = 'entrance'
  updateContextHelp()
})
coasterExitButton.addEventListener('click', () => {
  coasterAccessMode = 'exit'
  updateContextHelp()
})

document.querySelector<HTMLButtonElement>('#save')?.addEventListener('click', () => {
  showToast(game.save().message)
})

const saveSlotsPanel = requireElement<HTMLElement>('#save-slots-panel')
const saveSlotsList = saveSlotsPanel.querySelector<HTMLElement>('.save-slots-list')!
const saveSlotsMessage = saveSlotsPanel.querySelector<HTMLElement>('.save-slots-message')!
const saveStorageInfo = saveSlotsPanel.querySelector<HTMLElement>('[data-save-storage]')!
const saveSlotName = saveSlotsPanel.querySelector<HTMLInputElement>('[name=name]')!
makeDraggable(saveSlotsPanel.querySelector<HTMLElement>('.panel-header')!, saveSlotsPanel)
makeResizable(saveSlotsPanel)
let saveSlotsPausedSpeed = 0
function setSaveSlotsPanelOpen(open: boolean): void {
  saveSlotsPanel.hidden = !open
  if (open) {
    saveSlotsPausedSpeed = game.snapshot.speed
    if (saveSlotsPausedSpeed !== 0) game.setSpeed(0)
  } else if (saveSlotsPausedSpeed !== 0) {
    game.setSpeed(saveSlotsPausedSpeed)
  }
}
const formatSaveTime = (value: number) => new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(value)
let serverSaveSlots: ServerSaveSlot[] | null = null
function bindLoadedGame(loaded: GameState, message: string): void {
  if (pathEditorActive) closePathEditor()
  bindGameState(loaded)
  fillScenarioForm(loaded.snapshot.scenario)
  showToast(message)
}
function showSaveSlots(slots: ServerSaveSlot[], onServer: boolean): void {
  saveSlotsList.innerHTML = slots.length
    ? slots.map(slot => `<article data-slot="${slot.id}"><div><strong>${escapeHtml(slot.name)}</strong><small>${formatSaveTime(slot.savedAt)}</small></div><div><button data-load-slot="${slot.id}">Laden</button><button data-overwrite-slot="${slot.id}">Überschreiben</button><button data-delete-slot="${slot.id}" aria-label="${escapeHtml(slot.name)} löschen">×</button></div></article>`).join('')
    : `<p class="save-slots-empty">Noch keine benannten Spielstände ${onServer ? 'auf dem lokalen Server' : 'im Browser'}. Der Button „Speichern“ bleibt der schnelle Einzelspielstand.</p>`
}
async function fetchSaveSlots(): Promise<{ slots: ServerSaveSlot[], onServer: boolean }> {
  try {
    serverSaveSlots = await listServerSaves()
    return { slots: serverSaveSlots, onServer: true }
  } catch {
    serverSaveSlots = null
    return { slots: GameState.listSaveSlots(), onServer: false }
  }
}
async function renderSaveSlots(): Promise<void> {
  const { slots, onServer } = await fetchSaveSlots()
  saveStorageInfo.textContent = onServer
    ? 'Bis zu 20 Spielstände liegen lokal im Ordner „saves“ des Spielservers.'
    : 'Der Spielserver ist nicht erreichbar. Bis zu 20 Spielstände werden stattdessen in diesem Browser gespeichert.'
  showSaveSlots(slots, onServer)
}
async function openSaveSlots(): Promise<void> {
  if (multiplayer.status.mode === 'client') { showToast('Nur der Host kann Spielstände verwalten', true); return }
  saveSlotsMessage.textContent = ''
  saveSlotName.value = ''
  setSaveSlotsPanelOpen(true)
  await renderSaveSlots()
  saveSlotName.focus()
}
saveSlotsPanel.querySelector('[data-close]')!.addEventListener('click', () => setSaveSlotsPanelOpen(false))
saveSlotsPanel.querySelector<HTMLFormElement>('[data-save-slot]')!.addEventListener('submit', async event => {
  event.preventDefault()
  try {
    if (serverSaveSlots) {
      const saved = await saveServerSave(saveSlotName.value, JSON.stringify(game.snapshot))
      saveSlotsMessage.textContent = `Spielstand „${saved.name}“ auf dem lokalen Server gespeichert`
    } else {
      const result = game.saveSlot(saveSlotName.value)
      saveSlotsMessage.textContent = result.message
      if (!result.ok) return
    }
    saveSlotName.value = ''
    await renderSaveSlots()
  } catch (error) { saveSlotsMessage.textContent = error instanceof Error ? error.message : 'Spielstand konnte nicht gespeichert werden' }
})
saveSlotsPanel.addEventListener('click', async event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-load-slot],[data-overwrite-slot],[data-delete-slot]')
  if (!button) return
  const id = button.dataset.loadSlot ?? button.dataset.overwriteSlot ?? button.dataset.deleteSlot!
  if (button.dataset.loadSlot) {
    let loaded: GameState | null
    try { loaded = serverSaveSlots ? GameState.fromJSON((await loadServerSave(id)).snapshot) : GameState.loadSlot(id) } catch { loaded = null }
    if (!loaded) { saveSlotsMessage.textContent = 'Dieser Spielstand ist ungültig oder nicht mehr vorhanden.'; renderSaveSlots(); return }
    bindLoadedGame(loaded, 'Lokaler Spielstand geladen')
    setSaveSlotsPanelOpen(false)
    return
  }
  if (button.dataset.overwriteSlot) {
    const slot = (serverSaveSlots ?? GameState.listSaveSlots()).find(item => item.id === id)
    if (!slot) { renderSaveSlots(); return }
    try {
      if (serverSaveSlots) await saveServerSave(slot.name, JSON.stringify(game.snapshot), id)
      else { const result = game.saveSlot(slot.name, id); if (!result.ok) throw new Error(result.message) }
      saveSlotsMessage.textContent = `Spielstand „${slot.name}“ überschrieben`
      await renderSaveSlots()
    } catch (error) { saveSlotsMessage.textContent = error instanceof Error ? error.message : 'Spielstand konnte nicht überschrieben werden' }
    return
  }
  const slot = (serverSaveSlots ?? GameState.listSaveSlots()).find(item => item.id === id)
  if (!slot) { renderSaveSlots(); return }
  if (!window.confirm(`Spielstand „${slot.name}“ wirklich löschen?`)) return
  try {
    if (serverSaveSlots) await deleteServerSave(id)
    else { const result = GameState.deleteSaveSlot(id); if (!result.ok) throw new Error(result.message) }
    saveSlotsMessage.textContent = 'Spielstand gelöscht'
    await renderSaveSlots()
  } catch (error) { saveSlotsMessage.textContent = error instanceof Error ? error.message : 'Spielstand konnte nicht gelöscht werden' }
})
document.querySelector<HTMLButtonElement>('#save-slots')?.addEventListener('click', openSaveSlots)

const saveAsPanel = requireElement<HTMLElement>('#save-as-panel')
const saveAsList = saveAsPanel.querySelector<HTMLElement>('[data-save-as-list]')!
const saveAsMessage = saveAsPanel.querySelector<HTMLElement>('[data-save-as-message]')!
const saveAsStorageInfo = saveAsPanel.querySelector<HTMLElement>('[data-save-as-storage]')!
const saveAsName = saveAsPanel.querySelector<HTMLInputElement>('[name=name]')!
let saveAsPausedSpeed = 0
function setSaveAsPanelOpen(open: boolean): void {
  saveAsPanel.hidden = !open
  if (open) {
    saveAsPausedSpeed = game.snapshot.speed
    if (saveAsPausedSpeed !== 0) game.setSpeed(0)
  } else if (saveAsPausedSpeed !== 0) {
    game.setSpeed(saveAsPausedSpeed)
  }
}
async function renderSaveAsSlots(): Promise<void> {
  const { slots, onServer } = await fetchSaveSlots()
  saveAsStorageInfo.textContent = onServer
    ? 'Bis zu 20 Spielstände liegen lokal im Ordner „saves“ des Spielservers.'
    : 'Der Spielserver ist nicht erreichbar. Bis zu 20 Spielstände werden stattdessen in diesem Browser gespeichert.'
  saveAsList.innerHTML = slots.length
    ? slots.map(slot => `<article data-slot="${slot.id}"><div><strong>${escapeHtml(slot.name)}</strong><small>${formatSaveTime(slot.savedAt)}</small></div><div><button data-overwrite-slot="${slot.id}">Überschreiben</button></div></article>`).join('')
    : `<p class="save-slots-empty">Noch keine benannten Spielstände ${onServer ? 'auf dem lokalen Server' : 'im Browser'}.</p>`
}
async function openSaveAs(): Promise<void> {
  if (multiplayer.status.mode === 'client') { showToast('Nur der Host kann Spielstände verwalten', true); return }
  saveAsMessage.textContent = ''
  saveAsName.value = ''
  setSaveAsPanelOpen(true)
  await renderSaveAsSlots()
  saveAsName.focus()
}
requireElement<HTMLButtonElement>('#close-save-as').addEventListener('click', () => setSaveAsPanelOpen(false))
makeDraggable(saveAsPanel.querySelector<HTMLElement>('.panel-header')!, saveAsPanel)
makeResizable(saveAsPanel)
saveAsPanel.querySelector<HTMLFormElement>('[data-save-as]')!.addEventListener('submit', async event => {
  event.preventDefault()
  try {
    if (serverSaveSlots) {
      const saved = await saveServerSave(saveAsName.value, JSON.stringify(game.snapshot))
      saveAsMessage.textContent = `Spielstand „${saved.name}“ auf dem lokalen Server gespeichert`
    } else {
      const result = game.saveSlot(saveAsName.value)
      saveAsMessage.textContent = result.message
      if (!result.ok) return
    }
    saveAsName.value = ''
    await renderSaveAsSlots()
  } catch (error) { saveAsMessage.textContent = error instanceof Error ? error.message : 'Spielstand konnte nicht gespeichert werden' }
})
saveAsPanel.addEventListener('click', async event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-overwrite-slot]'); if (!button) return
  const id = button.dataset.overwriteSlot!
  const slot = (serverSaveSlots ?? GameState.listSaveSlots()).find(item => item.id === id)
  if (!slot) { renderSaveAsSlots(); return }
  try {
    if (serverSaveSlots) await saveServerSave(slot.name, JSON.stringify(game.snapshot), id)
    else { const result = game.saveSlot(slot.name, id); if (!result.ok) throw new Error(result.message) }
    saveAsMessage.textContent = `Spielstand „${slot.name}“ überschrieben`
    await renderSaveAsSlots()
  } catch (error) { saveAsMessage.textContent = error instanceof Error ? error.message : 'Spielstand konnte nicht überschrieben werden' }
})
document.querySelector<HTMLButtonElement>('#save-as')?.addEventListener('click', openSaveAs)

const saveTextDialog = document.createElement('dialog')
saveTextDialog.className = 'save-text-dialog'
saveTextDialog.innerHTML = `<h2>Spielstand als Text</h2><p>Base64-Text kopieren oder einen erhaltenen Spielstand einfügen.</p><textarea aria-label="Base64-Spielstand" spellcheck="false"></textarea><p class="save-text-error" role="alert"></p><div><button data-import>Spielstand laden</button><button data-close>Schließen</button></div>`
document.body.append(saveTextDialog)
const saveTextArea = saveTextDialog.querySelector('textarea')!
const saveTextError = saveTextDialog.querySelector('.save-text-error')!
const saveTextImport = saveTextDialog.querySelector<HTMLButtonElement>('[data-import]')!
function openSaveText(text: string, importing: boolean): void {
  saveTextArea.value = text
  saveTextArea.readOnly = !importing
  saveTextImport.hidden = !importing
  saveTextError.textContent = ''
  saveTextDialog.showModal()
  saveTextArea.focus()
  if (!importing) saveTextArea.select()
}
saveTextDialog.querySelector('[data-close]')!.addEventListener('click', () => saveTextDialog.close())
document.querySelector('#copy-save')!.addEventListener('click', async () => {
  const text = encodeSaveText(JSON.stringify(game.snapshot))
  try {
    await navigator.clipboard.writeText(text)
    showToast('Base64-Spielstand in die Zwischenablage kopiert')
  } catch {
    openSaveText(text, false)
    showToast('Text mit Strg+C kopieren')
  }
})
document.querySelector('#paste-save')!.addEventListener('click', () => {
  if (multiplayer.status.mode === 'client') { showToast('Nur der Host kann einen Spielstand laden', true); return }
  openSaveText('', true)
  // Manual paste works without clipboard permissions in every browser.
})
saveTextImport.addEventListener('click', () => {
  if (multiplayer.status.mode === 'client') { saveTextError.textContent = 'Nur der Host kann einen Spielstand laden'; return }
  try {
    const loaded = GameState.fromJSON(decodeSaveText(saveTextArea.value))
    if (!loaded) throw new Error('invalid save')
    if (pathEditorActive) closePathEditor()
    bindGameState(loaded)
    fillScenarioForm(loaded.snapshot.scenario)
    saveTextDialog.close()
    showToast('Spielstand aus Base64 geladen')
  } catch {
    saveTextError.textContent = 'Ungültiger oder unvollständiger Base64-Spielstand.'
  }
})

toggleParkButton.addEventListener('click', () => {
  const result = game.setParkOpen(!game.snapshot.parkOpen)
  showToast(result.message)
})

document.querySelector<HTMLButtonElement>('#load')?.addEventListener('click', () => {
  if (multiplayer.status.mode === 'client') {
    showToast('Nur der Host kann einen Spielstand laden', true)
    return
  }
  const loaded = GameState.load()
  if (!loaded) {
    showToast('Kein gültiger Spielstand gefunden', true)
    return
  }
  bindLoadedGame(loaded, 'Spielstand geladen')
})

document.querySelector<HTMLButtonElement>('#close-visitor')?.addEventListener('click', () => {
  selectedVisitorId = null
  followedVisitorId = null
  view.followVisitor(null)
  visitorPanel.classList.remove('visible')
})

followVisitorButton.addEventListener('click', () => {
  if (!selectedVisitorId) return
  followedVisitorId =
    followedVisitorId === selectedVisitorId ? null : selectedVisitorId
  view.followVisitor(followedVisitorId)
  updateVisitorPanel()
})

document.querySelector<HTMLButtonElement>('#close-entity')?.addEventListener('click', () => {
  closeEntityPanel()
})
makeDraggable(entityPanel.querySelector<HTMLElement>('.panel-header')!, entityPanel)
makeResizable(entityPanel)

document.querySelectorAll<HTMLButtonElement>('[data-entity-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    if (selectedEntity?.type !== 'coaster') return
    entityTab = button.dataset.entityTab as 'overview' | 'dynamics'
    updateEntityPanel()
  })
})

dispatchModeSelect.addEventListener('change', () => {
  if (selectedEntity?.type !== 'coaster') return
  game.updateCoasterSettings(
    selectedEntity.id,
    dispatchModeSelect.value as DispatchMode,
    Number(dispatchIntervalInput.value),
  )
})

operationModeSelect.addEventListener('change', () => {
  if (selectedEntity?.type !== 'coaster') return
  const result = game.setCoasterOperationMode(
    selectedEntity.id,
    operationModeSelect.value as CoasterOperationMode,
  )
  if (!result.ok) {
    operationModeSelect.value =
      game.getCoaster(selectedEntity.id)?.operationMode ?? 'closed'
  }
  showToast(result.message, !result.ok)
})

document.querySelector<HTMLButtonElement>('#recall-train')?.addEventListener('click', () => {
  if (selectedEntity?.type !== 'coaster') return
  const result = game.recallCoasterTrain(selectedEntity.id)
  showToast(result.message, !result.ok)
})

document.querySelector<HTMLButtonElement>('#edit-coaster-track')?.addEventListener('click', () => {
  if (selectedEntity?.type !== 'coaster') return
  const coasterId = selectedEntity.id
  closeEntityPanel()
  openCoasterBuilder(coasterId)
})

dispatchIntervalInput.addEventListener('input', () => {
  dispatchValue.textContent = `${dispatchIntervalInput.value} min`
  if (selectedEntity?.type !== 'coaster') return
  game.updateCoasterSettings(
    selectedEntity.id,
    dispatchModeSelect.value as DispatchMode,
    Number(dispatchIntervalInput.value),
  )
})

window.addEventListener('keydown', (event) => {
  if ((event.key >= '1' && event.key <= '9') || event.key === '0') {
    const allTools: Tool[] = [
      'path',
      'food',
      'toilet',
      'ride',
      'alcohol',
      'securityGate',
      'camping',
      'bulldoze',
      'inspect',
    ]
    const tool = event.key === '0' ? 'coaster' : allTools[Number(event.key) - 1]
    if (tool === 'coaster') openCoasterBuilder()
    else if (tool) game.setTool(tool)
  } else if (event.key.toLowerCase() === 'q') {
    view.rotate(-1)
    cameraQuarter = (cameraQuarter + 3) % 4
    updatePathEditor()
    updateCoasterBuilder()
  } else if (event.key.toLowerCase() === 'e') {
    view.rotate(1)
    cameraQuarter = (cameraQuarter + 1) % 4
    updatePathEditor()
    updateCoasterBuilder()
  } else if (event.key.toLowerCase() === 'r') {
    if (pathEditorActive) rotatePathDirection(1)
    else game.rotateBuild()
  } else if (event.key === 'ArrowLeft' && pathEditorActive) {
    rotatePathDirection(-1)
  } else if (event.key === 'ArrowRight' && pathEditorActive) {
    rotatePathDirection(1)
  } else if (event.key === 'Enter' && pathEditorActive) {
    buildNextPathSegment()
  } else if (event.key === 'Backspace' && pathEditorActive) {
    event.preventDefault()
    undoLastPathSegment()
  } else if (event.key === 'PageUp') {
    game.adjustBuildElevation(1)
  } else if (event.key === 'PageDown') {
    game.adjustBuildElevation(-1)
  } else if (event.code === 'Space') {
    event.preventDefault()
    game.setSpeed(game.snapshot.speed === 0 ? 1 : 0)
  }
})

bindGameState(game)

const performanceIndicator = document.createElement('div')
const versionLabel = `v${__APP_VERSION__} · Build ${__BUILD_ID__} UTC`
performanceIndicator.className = 'performance-indicator'
performanceIndicator.textContent = `${versionLabel}\nFPS — · TPS —`
performanceIndicator.title = 'Bilder und lokal ausgeführte Logik-Ticks pro realer Sekunde. In Pause und auf Multiplayer-Clients laufen keine lokalen Logik-Ticks.'
document.body.append(performanceIndicator)
let measurementStart = performance.now()
let measuredFrames = 0
let measuredTicks = 0
let measuredSimulationMs = 0
let measuredViewMs = 0
let measuredRenderMs = 0
document.addEventListener('visibilitychange', () => {
  measurementStart = performance.now()
  measuredFrames = 0
  measuredTicks = 0
  measuredSimulationMs = measuredViewMs = measuredRenderMs = 0
})
let previousTime = performance.now()
// Hidden tabs stop animation frames; keep the authoritative host responsive.
window.setInterval(() => {
  if (!document.hidden || multiplayer.status.mode !== 'host') return
  game.tick(0.1)
  multiplayer.tick(0.1)
}, 100)
function animate(time: number): void {
  // A transient rendering error must not permanently stop simulation/network updates.
  requestAnimationFrame(animate)
  const deltaSeconds = Math.min((time - previousTime) / 1000, 0.1)
  previousTime = time
  const simulationStart = performance.now()
  const ticksBefore = game.executedLogicTicks
  game.tick(deltaSeconds)
  measuredTicks += game.executedLogicTicks - ticksBefore
  multiplayer.tick(deltaSeconds)
  const viewStart = performance.now()
  measuredSimulationMs += viewStart - simulationStart
  view.update(game.snapshot, game.renderAlpha, game.worldRevision)
  const renderStart = performance.now()
  measuredViewMs += renderStart - viewStart
  view.render()
  measuredRenderMs += performance.now() - renderStart
  measuredFrames += 1
  const elapsed = time - measurementStart
  if (elapsed >= 1000) {
    performanceIndicator.textContent = `${versionLabel}\nFPS ${(measuredFrames * 1000 / elapsed).toFixed(0)} · TPS ${(measuredTicks * 1000 / elapsed).toFixed(1)}`
    performanceIndicator.textContent += `
Sim ${(measuredSimulationMs / measuredFrames).toFixed(1)} · Szene ${(measuredViewMs / measuredFrames).toFixed(1)} · Render ${(measuredRenderMs / measuredFrames).toFixed(1)} ms`
    measuredSimulationMs = measuredViewMs = measuredRenderMs = 0
    measuredFrames = 0
    measuredTicks = 0
    measurementStart = time
  }
}
requestAnimationFrame(animate)

function formatMoney(value: number): string {
  return `${Math.floor(value).toLocaleString('de-DE')} €`
}

function formatTime(minute: number): string {
  const hours = Math.floor(minute / 60)
  const minutes = Math.floor(minute % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
