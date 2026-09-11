import assert from 'node:assert/strict'
import { bindTouchCamera } from '../src/view/touchCamera'

export function testMobileTouch() {
  const canvas = new EventTarget() as EventTarget & { setPointerCapture: (id: number) => void }
  canvas.setPointerCapture = () => {}
  let canceled = 0, pans = 0, zoom = 1, clicks = 0, panMode = false
  bindTouchCamera(canvas as HTMLCanvasElement, {
    cancelBuild: () => { canceled++ },
    pan: () => { pans++ }, zoom: factor => { zoom *= factor },
    panWithOneFinger: () => panMode,
  })
  canvas.addEventListener('pointerup', () => clicks++)
  const send = (type: string, id: number, x: number, y: number, pointerType = 'touch') => {
    const event = new Event(type, { cancelable: true })
    Object.assign(event, { pointerId: id, clientX: x, clientY: y, pointerType })
    canvas.dispatchEvent(event)
  }
  send('pointerdown', 1, 10, 10); send('pointerup', 1, 10, 10)
  assert.equal(clicks, 1, 'single taps still build or inspect')
  send('pointerdown', 1, 10, 10); send('pointerdown', 2, 30, 10)
  send('pointermove', 2, 50, 10)
  assert.ok(zoom > 1, 'spreading two fingers zooms in')
  assert.ok(canceled > 0, 'a second finger cancels an unfinished building rectangle')
  send('pointerup', 2, 50, 10); send('pointerup', 1, 10, 10)
  assert.equal(clicks, 1, 'pinching must not place buildings on release')
  panMode = true
  send('pointerdown', 3, 10, 10); send('pointermove', 3, 60, 30); send('pointerup', 3, 60, 30)
  assert.ok(pans > 1)
  assert.equal(clicks, 1, 'one-finger panning must not commit a build')
  send('pointerdown', 4, 10, 10); send('pointercancel', 4, 10, 10)
  panMode = false
  send('pointerdown', 5, 10, 10); send('pointerup', 5, 10, 10)
  assert.equal(clicks, 2, 'touch input recovers after cancellation')
  send('pointerdown', 6, 10, 10, 'mouse'); send('pointerup', 6, 10, 10, 'mouse')
  assert.equal(clicks, 3, 'mouse input still reaches existing handlers')
  console.log('PASS touch taps, pinch zoom, pan, build cancellation and mouse compatibility')
}
