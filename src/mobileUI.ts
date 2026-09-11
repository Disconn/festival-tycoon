import './mobile.css'

export function mountMobileUI(actions: {
  panMode: (enabled: boolean) => void
  rotateCamera: (direction: number) => void
  rotateBuilding: () => void
  zoom: (factor: number) => void
  elevation: (delta: number) => void
}): void {
  const compact = window.matchMedia('(max-width: 900px), (pointer: coarse)')
  const topbar = document.querySelector<HTMLElement>('.topbar')!
  const menu = document.createElement('button')
  menu.className = 'mobile-menu-toggle'
  menu.textContent = '☰ Menü'
  menu.setAttribute('aria-expanded', 'false')
  menu.setAttribute('aria-controls', 'mobile-actions')
  topbar.querySelector('.game-actions')!.id = 'mobile-actions'
  topbar.querySelector('.game-actions')!.insertAdjacentHTML('beforeend', '<p class="mobile-instructions">Antippen baut oder wählt aus. Zwei Finger verschieben und zoomen. Mit ✋ verschiebst du mit einem Finger. Die Leiste unten lässt sich seitlich scrollen. Bands: erst Band, dann Zeitslot antippen.</p>')
  topbar.querySelector('.brand')!.append(menu)
  const setMenu = (open: boolean) => {
    topbar.classList.toggle('mobile-menu-open', open)
    menu.setAttribute('aria-expanded', String(open))
  }
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'))
  const toolbar = document.createElement('nav')
  toolbar.className = 'mobile-controls panel'
  toolbar.setAttribute('aria-label', 'Touch-Steuerung')
  toolbar.innerHTML = `<button data-mobile="build">🏗 Bauen</button>
    <button data-mobile="pan" aria-pressed="false" title="Verschieben statt Bauen">✋ Schieben</button>
    <button data-mobile="left" aria-label="Kamera nach links drehen">↶</button>
    <button data-mobile="right" aria-label="Kamera nach rechts drehen">↷</button>
    <button data-mobile="rotate" aria-label="Bauteil drehen">⟳ Teil</button>
    <button data-mobile="out" aria-label="Verkleinern">−</button>
    <button data-mobile="in" aria-label="Vergrößern">+</button>
    <button data-mobile="down" aria-label="Bauhöhe senken">H−</button>
    <button data-mobile="up" aria-label="Bauhöhe erhöhen">H+</button>`
  toolbar.insertAdjacentHTML('beforeend', '<button data-mobile="overlays" aria-expanded="false">Ansichten</button>')
  document.querySelector('.game-shell')!.append(toolbar)
  const pan = toolbar.querySelector<HTMLButtonElement>('[data-mobile=pan]')!
  const setPan = (enabled: boolean) => { actions.panMode(enabled); pan.setAttribute('aria-pressed', String(enabled)) }
  toolbar.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-mobile]')
    if (!button) return
    switch (button.dataset.mobile) {
      case 'build': document.querySelector<HTMLButtonElement>('#open-build-menu')!.click(); break
      case 'pan': setPan(pan.getAttribute('aria-pressed') !== 'true'); break
      case 'left': actions.rotateCamera(-1); break
      case 'right': actions.rotateCamera(1); break
      case 'rotate': actions.rotateBuilding(); break
      case 'in': actions.zoom(1.15); break
      case 'out': actions.zoom(1 / 1.15); break
      case 'up': actions.elevation(1); break
      case 'down': actions.elevation(-1); break
      case 'overlays': {
        const open = document.querySelector('.crowding-panel')!.classList.toggle('mobile-visible')
        button.setAttribute('aria-expanded', String(open))
        break
      }
    }
  })
  document.addEventListener('click', event => {
    if (!compact.matches || !(event.target instanceof Element)) return
    const button = event.target.closest('button')
    if (!button) return
    if (button.closest('.game-actions') && !button.matches('[aria-haspopup=true], #toggle-save-menu, #toggle-debug-menu, #toggle-bulldoze-menu')) setMenu(false)
    if (button.matches('[data-tool], [data-way-build], [data-bulldoze-size], [data-area-draw]')) {
      setPan(false)
      if (button.closest('.build-menu')) {
        document.querySelector<HTMLElement>('#build-menu')!.hidden = true
        document.querySelector('#open-build-menu')!.setAttribute('aria-expanded', 'false')
      }
    }
  })
  document.querySelector('#game-canvas')!.addEventListener('pointerdown', () => setMenu(false))
  compact.addEventListener('change', () => { setMenu(false); setPan(false) })
}
