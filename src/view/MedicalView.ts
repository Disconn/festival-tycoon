import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
} from 'three'
import type { GameSnapshot } from '../game/GameState'
import { disposeChildren } from './disposeObject3D'

export class MedicalView {
  readonly group = new Group()
  private fingerprint = ''

  invalidate(): void {
    this.fingerprint = ''
  }

  update(snapshot: Readonly<GameSnapshot>): void {
    const fingerprint = snapshot.medicalCells
      .map((cell) => `${cell.x}:${cell.z}:${cell.occupants.join(',')}`)
      .join('|')
    if (fingerprint === this.fingerprint) return
    this.fingerprint = fingerprint
    disposeChildren(this.group)
    snapshot.medicalCells.forEach((cell) => {
      const tile = new Mesh(
        new PlaneGeometry(0.94, 0.94),
        new MeshStandardMaterial({
          color: 0xb9e4ee,
          transparent: true,
          opacity: 0.72,
          roughness: 0.9,
        }),
      )
      tile.rotation.x = -Math.PI / 2
      tile.position.set(cell.x + 0.5, cell.elevation + 0.018, cell.z + 0.5)
      this.group.add(tile)
      cell.occupants.forEach((occupant, slot) => {
        const bed = new Group()
        const frame = new Mesh(
          new BoxGeometry(0.24, 0.07, 0.72),
          new MeshStandardMaterial({ color: 0xf2f4ef }),
        )
        frame.position.y = 0.12
        const pillow = new Mesh(
          new BoxGeometry(0.18, 0.045, 0.16),
          new MeshStandardMaterial({ color: 0xffffff }),
        )
        pillow.position.set(0, 0.18, -0.24)
        bed.position.set(cell.x + 0.2 + slot * 0.3, cell.elevation, cell.z + 0.5)
        bed.add(frame, pillow)
        if (occupant) {
          const patient = new Mesh(
            new BoxGeometry(0.13, 0.08, 0.46),
            new MeshStandardMaterial({ color: 0x7094c7 }),
          )
          patient.position.y = 0.2
          bed.add(patient)
          const sleep = this.createLabel('Zzz')
          sleep.position.set(0.08, 0.47, -0.18)
          bed.add(sleep)
        }
        this.group.add(bed)
      })
    })
  }

  private createLabel(text: string): Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const context = canvas.getContext('2d')!
    context.font = 'bold 30px sans-serif'
    context.fillStyle = '#24547a'
    context.textAlign = 'center'
    context.fillText(text, 64, 40)
    const sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(canvas), transparent: true }))
    sprite.scale.set(0.42, 0.21, 1)
    return sprite
  }
}
