import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import type { AtmosphereSnapshot } from '../game/atmosphere'

export class AtmosphereView {
  readonly group = new Group()
  private cells = new Map<string, Mesh<PlaneGeometry, MeshBasicMaterial>>()
  private geometry = new PlaneGeometry(0.92, 0.92)
  private scratchColor = new Color()
  private readonly positiveHue: number
  private readonly signed: boolean

  constructor(positiveHue: number, signed: boolean) {
    this.positiveHue = positiveHue
    this.signed = signed
    this.group.visible = false
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  update(snapshot: Readonly<AtmosphereSnapshot>): void {
    if (!this.group.visible) return
    const keys = new Set(
      snapshot.cells.map((cell) => `${cell.x}:${cell.z}:${cell.elevation}`),
    )
    this.cells.forEach((mesh, key) => {
      if (keys.has(key)) return
      this.group.remove(mesh)
      mesh.material.dispose()
      this.cells.delete(key)
    })
    snapshot.cells.forEach((cell) => {
      const key = `${cell.x}:${cell.z}:${cell.elevation}`
      let mesh = this.cells.get(key)
      if (!mesh) {
        mesh = new Mesh(
          this.geometry,
          new MeshBasicMaterial({ transparent: true, depthWrite: false }),
        )
        mesh.rotation.x = -Math.PI / 2
        mesh.renderOrder = 6
        this.cells.set(key, mesh)
        this.group.add(mesh)
      }
      const ratio = Math.min(1, Math.abs(cell.value) / 100)
      const hue =
        this.signed && cell.value < 0 ? 0 : this.positiveHue
      mesh.position.set(cell.x + 0.5, cell.elevation + 0.152, cell.z + 0.5)
      mesh.material.color.copy(this.scratchColor.setHSL(hue, 0.86, 0.5))
      mesh.material.opacity = 0.18 + ratio * 0.5
    })
  }
}
