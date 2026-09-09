import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { FireworkEffect } from '../game/fireworks'
import { disposeObject3D } from './disposeObject3D'

export class FireworksView {
  readonly group = new Group()
  private models = new Map<string, Group>()

  update(effects: readonly FireworkEffect[]): void {
    const activeIds = new Set(effects.map((effect) => effect.id))
    this.models.forEach((model, id) => {
      if (activeIds.has(id)) return
      this.group.remove(model)
      disposeObject3D(model)
      this.models.delete(id)
    })

    effects.forEach((effect) => {
      let model = this.models.get(effect.id)
      if (!model) {
        model = this.createModel(effect.color)
        this.models.set(effect.id, model)
        this.group.add(model)
      }
      const rocket = model.userData.rocket as Mesh
      const burstTime = effect.age - 0.45
      rocket.visible = burstTime < 0
      model.position.set(effect.x, effect.y + Math.min(effect.age, 0.45) * 4.2, effect.z)
      model.children.forEach((child) => {
        if (!(child instanceof Mesh) || !child.userData.burstDirection) return
        child.visible = burstTime >= 0
        if (burstTime < 0) return
        const direction = child.userData.burstDirection as Vector3
        const distance = burstTime * 1.35
        child.position.set(
          direction.x * distance,
          direction.y * distance - burstTime * burstTime * 0.75,
          direction.z * distance,
        )
        const material = child.material as MeshBasicMaterial
        material.opacity = Math.max(0, 1 - burstTime / 1.95)
      })
    })
  }

  private createModel(color: number): Group {
    const group = new Group()
    const rocket = new Mesh(
      new CylinderGeometry(0.025, 0.025, 0.18, 6),
      new MeshBasicMaterial({ color: 0xffe7a3 }),
    )
    group.userData.rocket = rocket
    group.add(rocket)
    const particleGeometry = new SphereGeometry(0.035, 5, 4)
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2
      const vertical = ((index % 5) - 2) * 0.22
      const particle = new Mesh(
        particleGeometry,
        new MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      )
      particle.userData.burstDirection = new Vector3(
        Math.cos(angle),
        0.65 + vertical,
        Math.sin(angle),
      ).normalize()
      particle.visible = false
      group.add(particle)
    }
    return group
  }
}
