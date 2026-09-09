import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three'
import type { GroundIncident } from '../game/incidents'
import { disposeChildren } from './disposeObject3D'

export class IncidentView {
  readonly group = new Group()
  private fingerprint = ''

  invalidate(): void {
    this.fingerprint = ''
  }

  update(incidents: readonly GroundIncident[]): void {
    const fingerprint = incidents.map((item) => `${item.id}:${item.severity}`).join('|')
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint
      disposeChildren(this.group)
      incidents.forEach((incident) => {
        const model =
          incident.kind === 'vomit'
            ? this.createVomit(incident.severity)
            : incident.kind === 'litter'
              ? this.createLitter(incident.severity)
              : this.createFire()
        model.name = incident.id
        const offset =
          incident.kind === 'fire' ? { x: 0, z: 0 } : this.getGroundOffset(incident.id)
        model.position.set(
          incident.x + 0.5 + offset.x,
          incident.elevation +
            (incident.kind === 'vomit'
              ? 0.095
              : incident.kind === 'litter'
                ? 0.08
                : 0.035),
          incident.z + 0.5 + offset.z,
        )
        this.group.add(model)
      })
    }
    const phase = performance.now() * 0.006
    incidents
      .filter((incident) => incident.kind === 'fire')
      .forEach((incident, index) => {
        const model = this.group.getObjectByName(incident.id)
        if (model) model.scale.y = 0.82 + Math.sin(phase + index) * 0.18
      })
  }

  private getGroundOffset(id: string): { x: number; z: number } {
    let hash = 0
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 31 + id.charCodeAt(index)) | 0
    }
    const angle = ((Math.abs(hash) % 360) / 180) * Math.PI
    const radius = 0.08 + (Math.abs(hash >> 8) % 14) / 100
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
  }

  private createVomit(severity: number): Group {
    const group = new Group()
    const patchCount = Math.min(10, 2 + Math.ceil(severity))
    Array.from({ length: patchCount }, (_, index) => {
      const angle = index * 2.399
      const distance = 0.03 + (index % 4) * 0.035
      return [
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        0.07 + (index % 3) * 0.025,
      ]
    }).forEach(([x, z, radius]) => {
      const patch = new Mesh(
        new CircleGeometry(radius, 10),
        new MeshStandardMaterial({ color: 0x8da642, roughness: 1 }),
      )
      patch.rotation.x = -Math.PI / 2
      patch.position.set(x, 0, z)
      group.add(patch)
    })
    return group
  }

  private createLitter(severity: number): Group {
    const group = new Group()
    const bagCount = Math.min(6, 1 + Math.ceil(severity))
    for (let index = 0; index < bagCount; index += 1) {
      const angle = index * 2.15
      const bag = new Mesh(
        new BoxGeometry(0.11, 0.08, 0.09),
        new MeshStandardMaterial({
          color: index % 2 === 0 ? 0x7a6238 : 0x4a4030,
          roughness: 1,
        }),
      )
      bag.position.set(
        Math.cos(angle) * (0.04 + (index % 3) * 0.03),
        0.04,
        Math.sin(angle) * (0.04 + (index % 3) * 0.03),
      )
      bag.rotation.y = angle
      group.add(bag)
    }
    return group
  }

  private createFire(): Group {
    const group = new Group()
    const outer = new Mesh(
      new ConeGeometry(0.16, 0.46, 8),
      new MeshBasicMaterial({ color: 0xff5a1f }),
    )
    const inner = new Mesh(
      new ConeGeometry(0.08, 0.3, 8),
      new MeshBasicMaterial({ color: 0xffe45e }),
    )
    outer.position.y = 0.23
    inner.position.y = 0.18
    group.add(outer, inner)
    return group
  }
}
