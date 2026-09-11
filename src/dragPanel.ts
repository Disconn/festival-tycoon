// Lets the user grab a panel's header bar and freely reposition the panel.
// Works regardless of how the panel is normally positioned (plain left/top,
// centered via left:50%+transform:translateX(-50%), or sized via an
// `inset` shorthand like the stage editor) because dragging pins the panel
// to plain left/top/width/height matching its current on-screen box the
// moment a drag starts, before any pointer movement is applied - so
// clearing right/bottom/transform can't resize or re-flow it.
// Returns a callback reporting whether the panel has been dragged at least
// once, so callers can stop re-centering/re-snapping it automatically.
export function makeDraggable(handle: HTMLElement, panel: HTMLElement): () => boolean {
  let moved = false
  handle.addEventListener('pointerdown', (event) => {
    if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) return
    if ((event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    const rect = panel.getBoundingClientRect()
    panel.style.left = `${rect.left}px`
    panel.style.top = `${rect.top}px`
    panel.style.width = `${rect.width}px`
    panel.style.height = `${rect.height}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    panel.style.transform = 'none'
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    try { handle.setPointerCapture(event.pointerId) } catch { /* e.g. no active pointer session */ }
    const onMove = (moveEvent: PointerEvent): void => {
      moved = true
      const margin = 4
      const maxLeft = Math.max(margin, window.innerWidth - panel.offsetWidth - margin)
      const maxTop = Math.max(margin, window.innerHeight - 40)
      panel.style.left = `${Math.min(Math.max(moveEvent.clientX - offsetX, margin), maxLeft)}px`
      panel.style.top = `${Math.min(Math.max(moveEvent.clientY - offsetY, margin), maxTop)}px`
    }
    const onUp = (): void => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
  })
  return () => moved
}

// Adds a grab-able grip to a panel's bottom-right corner so the user can
// resize it. Creates the grip itself (no markup changes needed per panel).
// Like makeDraggable, pins the panel to plain left/top/width/height and
// clears right/bottom/transform on the first grab so a panel that was
// centered or sized via `inset`/max-height doesn't jump or get immediately
// re-clamped once a manual size is set.
export function makeResizable(panel: HTMLElement): void {
  const grip = document.createElement('span')
  grip.className = 'panel-resize-grip'
  grip.setAttribute('aria-hidden', 'true')
  panel.append(grip)
  grip.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = panel.getBoundingClientRect()
    panel.style.left = `${rect.left}px`
    panel.style.top = `${rect.top}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    panel.style.transform = 'none'
    panel.style.maxWidth = 'none'
    panel.style.maxHeight = 'none'
    panel.style.overflow = 'auto'
    const startWidth = rect.width
    const startHeight = rect.height
    const startX = event.clientX
    const startY = event.clientY
    try { grip.setPointerCapture(event.pointerId) } catch { /* e.g. no active pointer session */ }
    const onMove = (moveEvent: PointerEvent): void => {
      const minWidth = 200
      const minHeight = 120
      const maxWidth = Math.max(minWidth, window.innerWidth - rect.left - 4)
      const maxHeight = Math.max(minHeight, window.innerHeight - rect.top - 4)
      const width = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), minWidth), maxWidth)
      const height = Math.min(Math.max(startHeight + (moveEvent.clientY - startY), minHeight), maxHeight)
      panel.style.width = `${width}px`
      panel.style.height = `${height}px`
    }
    const onUp = (): void => {
      grip.removeEventListener('pointermove', onMove)
      grip.removeEventListener('pointerup', onUp)
    }
    grip.addEventListener('pointermove', onMove)
    grip.addEventListener('pointerup', onUp)
  })
}
