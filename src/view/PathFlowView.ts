import {
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three'
import type { PlacedBuilding } from '../game/GameState'
import { disposeChildren } from './disposeObject3D'

const DIRECTIONS = [
  { x: 0, z: 1, angle: 0 },
  { x: 1, z: 0, angle: Math.PI / 2 },
  { x: 0, z: -1, angle: Math.PI },
  { x: -1, z: 0, angle: -Math.PI / 2 },
]

export class PathFlowView {
  readonly group = new Group()
  private fingerprint = ''

  invalidate(): void {
    this.fingerprint = ''
  }

  update(paths: readonly PlacedBuilding[]): void {
    const restricted = paths.filter(
      (path) => path.kind === 'path' && path.pathType === 'normal' && path.flowDirection != null,
    )
    const fingerprint = restricted
      .map((path) => `${path.id}:${path.flowDirection}:${path.elevation}`)
      .join('|')
    if (fingerprint === this.fingerprint) return
    this.fingerprint = fingerprint
    disposeChildren(this.group)
    restricted.forEach((path) => {
      const direction = DIRECTIONS[path.flowDirection! % 4]!
      const material = new MeshBasicMaterial({ color: 0xf4f0c6 })
      ;[-0.3, -0.08, 0.14].forEach((offset) => {
        const dash = new Mesh(new BoxGeometry(0.055, 0.018, 0.14), material)
        dash.position.set(
          path.x + 0.5 + direction.x * offset,
          path.elevation + 0.14,
          path.z + 0.5 + direction.z * offset,
        )
        dash.rotation.y = direction.angle
        this.group.add(dash)
      })
      const arrow = new Mesh(new ConeGeometry(0.09, 0.2, 3), material)
      arrow.position.set(
        path.x + 0.5 + direction.x * 0.32,
        path.elevation + 0.15,
        path.z + 0.5 + direction.z * 0.32,
      )
      arrow.rotation.x = Math.PI / 2
      arrow.rotation.z = -direction.angle
      this.group.add(arrow)
    })
  }
}
