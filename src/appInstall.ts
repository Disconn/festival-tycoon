export function mountAppInstall(): void {
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = standalone ? '📱 App-Info' : '📱 Zum Home-Bildschirm'
  button.setAttribute('aria-haspopup', 'dialog')
  document.querySelector('#action-group-session')!.append(button)
  const dialog = document.createElement('dialog')
  dialog.className = 'app-install-dialog panel'
  dialog.setAttribute('aria-labelledby', 'app-install-title')
  dialog.innerHTML = `<form method="dialog"><header><h2 id="app-install-title">Festival Tycoon als App</h2><button aria-label="Anleitung schließen">×</button></header></form>
    <img src="/app-icons/apple-touch-icon.png" width="72" height="72" alt="Festival Tycoon App-Icon">
    ${standalone ? '<p>Du spielst bereits in der Homescreen-App.</p>' : '<ol><li>Öffne das Spiel auf deinem iPhone oder iPad in <strong>Safari</strong>.</li><li>Tippe auf <strong>Teilen</strong> (Quadrat mit Pfeil nach oben).</li><li>Wähle <strong>Zum Home-Bildschirm</strong>. Fehlt die Auswahl, findest du sie unter „Aktionen bearbeiten“.</li><li>Wenn angezeigt: <strong>Als Web-App öffnen</strong> aktivieren und auf <strong>Hinzufügen</strong> tippen.</li></ol>'}
    <p>Danach startest du das Spiel über das Icon ohne Safari-Adressleiste. Zum Starten muss der Spielserver erreichbar sein; Multiplayer und Server-Spielstände benötigen eine Verbindung.</p>
    <p>Speichere dein Festival vor dem Wechsel. Falls der Browser-Spielstand in der App fehlt, lade ihn über die Server-Spielstände oder importiere ihn als Text.</p>
    <small>Geladene Version: ${__APP_VERSION__} · ${__BUILD_ID__} UTC</small>
    <form method="dialog"><button>Verstanden</button></form>`
  document.body.append(dialog)
  button.addEventListener('click', () => dialog.showModal())
}
