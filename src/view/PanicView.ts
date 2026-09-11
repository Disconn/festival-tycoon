import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
} from 'three'
import { SIMULATION_CONFIG } from '../game/simulationConfig'
import type { CrowdingSnapshot } from '../game/crowding'

type PanicVisitor = {
  cellX: number
  cellZ: number
  cellElevation: number
  isPanicking: boolean
  state: string
}

function cellKey(x: number, z: number, elevation: number): string {
  return `${x}:${z}:${elevation}`
}

export class PanicView {
  readonly group = new Group()
  private cells = new Map<string, Group>()
  private fillGeometry = new PlaneGeometry(1.08, 1.08)
  private ringGeometry = new RingGeometry(0.42, 0.54, 20)
  private scratchColor = new Color('#d62828')

  update(visitors: readonly PanicVisitor[], crowding?: CrowdingSnapshot): void {
    const panicCells = new Map<string, { x: number; z: number; elevation: number; count: number }>()
    visitors.forEach((visitor) => {
      if (!visitor.isPanicking && visitor.state !== 'panicking') return
      const key = cellKey(visitor.cellX, visitor.cellZ, visitor.cellElevation)
      const cell = panicCells.get(key)
      if (cell) {
        cell.count += 1
        return
      }
      panicCells.set(key, {
        x: visitor.cellX,
        z: visitor.cellZ,
        elevation: visitor.cellElevation,
        count: 1,
      })
    })
    const zone = new Map(panicCells)
    if (panicCells.size > 0 && crowding) {
      const dense = SIMULATION_CONFIG.crowding.denseThreshold
      crowding.cells.forEach((cell) => {
        if (cell.value < dense) return
        const key = cellKey(cell.x, cell.z, cell.elevation)
        if (zone.has(key)) return
        const touchesPanic = [...panicCells.values()].some(
          (panic) =>
            panic.elevation === cell.elevation &&
            Math.abs(panic.x - cell.x) <= 1 &&
            Math.abs(panic.z - cell.z) <= 1,
        )
        if (!touchesPanic) return
        zone.set(key, { x: cell.x, z: cell.z, elevation: cell.elevation, count: 0 })
      })
    }
    this.cells.forEach((mesh, key) => {
      if (zone.has(key)) return
      this.group.remove(mesh)
      mesh.traverse((child) => {
        if (child instanceof Mesh) child.material.dispose()
      })
      this.cells.delete(key)
    })
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(performance.now() * 0.007))
    zone.forEach((cell, key) => {
      let marker = this.cells.get(key)
      if (!marker) {
        marker = this.createMarker()
        this.cells.set(key, marker)
        this.group.add(marker)
      }
      const core = cell.count > 0
      const intensity = core ? Math.min(1, 0.4 + cell.count * 0.18) : 0.22
      marker.position.set(cell.x + 0.5, cell.elevation + 0.16, cell.z + 0.5)
      marker.scale.setScalar(0.88 + intensity * 0.28)
      const fill = marker.children[0] as Mesh<PlaneGeometry, MeshBasicMaterial>
      const ring = marker.children[1] as Mesh<RingGeometry, MeshBasicMaterial>
      fill.material.color.copy(this.scratchColor)
      fill.material.opacity = (core ? 0.2 + intensity * 0.3 : 0.1) * pulse
      ring.material.opacity = (core ? 0.4 + intensity * 0.38 : 0.16) * pulse
      ring.visible = core
    })
  }

  private createMarker(): Group {
    const marker = new Group()
    const fill = new Mesh(
      this.fillGeometry,
      new MeshBasicMaterial({
        color: this.scratchColor,
        transparent: true,
        depthWrite: false,
      }),
    )
    fill.rotation.x = -Math.PI / 2
    fill.renderOrder = 7
    const ring = new Mesh(
      this.ringGeometry,
      new MeshBasicMaterial({
        color: '#ffb347',
        transparent: true,
        depthWrite: false,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    ring.renderOrder = 8
    marker.add(fill, ring)
    return marker
  }
}
