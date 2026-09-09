import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import type { GameSnapshot } from '../game/GameState'
import { disposeChildren } from './disposeObject3D'

const BEAM_COLORS = [0x2ee6a6, 0x38bdf8, 0xc77dff, 0xff4fc3]

export class LaserView {
  readonly group = new Group()
  private fingerprint = ''

  invalidate(): void {
    this.fingerprint = ''
  }

  update(snapshot: Readonly<GameSnapshot>, performing: boolean): void {
    const powered = new Set(snapshot.power.poweredBuildingIds)
    const lasers = snapshot.buildings.filter(
      (building) => building.kind === 'laserShow' && powered.has(building.id),
    )
    const fingerprint = `${performing}:${lasers.map((laser) => laser.id).join(',')}`
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint
      disposeChildren(this.group)
      if (performing) {
        lasers.forEach((laser) => {
          BEAM_COLORS.forEach((color, index) => {
            const beam = new Mesh(
              new PlaneGeometry(0.06, 7.2),
              new MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.42,
                depthWrite: false,
              }),
            )
            beam.position.set(
              laser.x + 0.5,
              laser.elevation + 3.4,
              laser.z + 0.5,
            )
            beam.rotation.z = (index / BEAM_COLORS.length) * Math.PI - 0.4
            beam.userData.spin = 0.4 + index * 0.18
            this.group.add(beam)
          })
        })
      }
    }
    if (!performing) return
    const time = snapshot.minute * 0.08
    this.group.children.forEach((child) => {
      if (!(child instanceof Mesh)) return
      child.rotation.y = time * (child.userData.spin as number)
      child.rotation.x = -0.55 + Math.sin(time * 1.4) * 0.18
    })
  }
}
