/** Keep camera gestures separate from construction: a second finger cancels the brush. */
export function bindTouchCamera(canvas: HTMLCanvasElement, actions: {
  pan: (x: number, y: number) => void
  zoom: (factor: number) => void
  cancelBuild: () => void
  panWithOneFinger: () => boolean
}): void {
  const touches = new Map<number, { x: number; y: number }>()
  let gesture = false
  let origin = { x: 0, y: 0 }
  const swallow = (event: PointerEvent) => { event.preventDefault(); event.stopImmediatePropagation() }
  const pair = () => {
    const [a, b] = [...touches.values()]
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) }
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.setPointerCapture(event.pointerId)
    if (touches.size === 1) { gesture = false; origin = { x: event.clientX, y: event.clientY } }
    if (touches.size >= 2) {
      gesture = true
      actions.cancelBuild()
      swallow(event)
    }
  }, { capture: true })
  canvas.addEventListener('pointermove', event => {
    const previous = touches.get(event.pointerId)
    if (!previous) return
    const before = touches.size >= 2 ? pair() : null
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (before) {
      const after = pair()
      actions.pan(after.x - before.x, after.y - before.y)
      if (before.distance > 10 && after.distance > 10) actions.zoom(after.distance / before.distance)
      swallow(event)
    } else if (gesture || actions.panWithOneFinger()) {
      if (!gesture && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 6) return
      if (!gesture) { gesture = true; actions.cancelBuild() }
      actions.pan(event.clientX - previous.x, event.clientY - previous.y)
      swallow(event)
    }
  }, { capture: true })
  const finish = (event: PointerEvent) => {
    if (!touches.delete(event.pointerId)) return
    if (gesture || event.type !== 'pointerup') { actions.cancelBuild(); swallow(event) }
    if (touches.size === 0) gesture = false
  }
  canvas.addEventListener('pointerup', finish, { capture: true })
  canvas.addEventListener('pointercancel', finish, { capture: true })
  canvas.addEventListener('lostpointercapture', finish, { capture: true })
}
