import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import type { CrowdingSnapshot } from '../game/crowding'

function cellKey(x: number, z: number, elevation: number): string {
  return `${x}:${z}:${elevation}`
}

export class CrowdingView {
  readonly group = new Group()
  private cells = new Map<string, Mesh<PlaneGeometry, MeshBasicMaterial>>()
  private geometry = new PlaneGeometry(0.92, 0.92)
  private scratchColor = new Color()

  constructor() {
    this.group.visible = false
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  update(crowding: Readonly<CrowdingSnapshot>): void {
    if (!this.group.visible) return
    const activeKeys = new Set(
      crowding.cells.map((cell) => cellKey(cell.x, cell.z, cell.elevation)),
    )
    this.cells.forEach((mesh, key) => {
      if (activeKeys.has(key)) return
      this.group.remove(mesh)
      mesh.material.dispose()
      this.cells.delete(key)
    })
    crowding.cells.forEach((cell) => {
      const key = cellKey(cell.x, cell.z, cell.elevation)
      let mesh = this.cells.get(key)
      if (!mesh) {
        mesh = new Mesh(
          this.geometry,
          new MeshBasicMaterial({
            transparent: true,
            depthWrite: false,
          }),
        )
        mesh.rotation.x = -Math.PI / 2
        mesh.renderOrder = 5
        this.cells.set(key, mesh)
        this.group.add(mesh)
      }
      const ratio = cell.value / 100
      mesh.position.set(cell.x + 0.5, cell.elevation + 0.145, cell.z + 0.5)
      mesh.material.color.copy(
        this.scratchColor.setHSL((1 - ratio) * 0.33, 0.9, 0.48),
      )
      mesh.material.opacity = 0.2 + ratio * 0.48
    })
  }
}
