import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import type { StageForecourtCell } from '../game/festivalAreas'
import { disposeChildren } from './disposeObject3D'

export class ForecourtView {
  readonly group = new Group()
  private fingerprint = ''

  invalidate(): void {
    this.fingerprint = ''
  }

  update(cells: readonly StageForecourtCell[]): void {
    const fingerprint = cells.map((cell) => `${cell.x}:${cell.z}`).join('|')
    if (fingerprint === this.fingerprint) return
    this.fingerprint = fingerprint
    disposeChildren(this.group)
    cells.forEach((cell) => {
      const tile = new Mesh(
        new PlaneGeometry(0.94, 0.94),
        new MeshStandardMaterial({
          color: 0x70518e,
          transparent: true,
          opacity: 0.58,
          roughness: 0.9,
        }),
      )
      tile.rotation.x = -Math.PI / 2
      tile.position.set(cell.x + 0.5, cell.elevation + 0.02, cell.z + 0.5)
      tile.receiveShadow = true
      this.group.add(tile)
    })
  }
}
