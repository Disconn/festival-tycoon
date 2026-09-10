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
    handle.setPointerCapture(event.pointerId)
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
