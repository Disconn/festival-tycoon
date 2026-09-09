import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import type { WasteDumpCell } from '../game/waste'
import type { PlacedBuilding } from '../game/GameState'
import { SIMULATION_CONFIG } from '../game/simulationConfig'
import { disposeChildren } from './disposeObject3D'

export class WasteView {
  readonly group = new Group()
  private fingerprint = ''

  invalidate(): void {
    this.fingerprint = ''
  }

  update(
    cells: readonly WasteDumpCell[],
    bins: readonly PlacedBuilding[] = [],
  ): void {
    const fingerprint = [
      ...cells.map((cell) => `${cell.x}:${cell.z}:${cell.stored}`),
      ...bins.map((bin) => `${bin.id}:${bin.wasteFill ?? 0}`),
    ].join('|')
    if (fingerprint === this.fingerprint) return
    this.fingerprint = fingerprint
    disposeChildren(this.group)
    cells.forEach((cell) => {
      const fill = Math.min(1, cell.stored / SIMULATION_CONFIG.waste.dumpCapacity)
      const tile = new Mesh(
        new PlaneGeometry(0.94, 0.94),
        new MeshStandardMaterial({
          color: 0x5a4a28,
          transparent: true,
          opacity: 0.78,
          roughness: 1,
        }),
      )
      tile.rotation.x = -Math.PI / 2
      tile.position.set(cell.x + 0.5, cell.elevation + 0.016, cell.z + 0.5)
      this.group.add(tile)
      const pileCount = Math.min(8, Math.ceil(cell.stored / 5))
      for (let index = 0; index < pileCount; index += 1) {
        const angle = index * 2.2
        const bag = new Mesh(
          new BoxGeometry(0.16, 0.12 + fill * 0.08, 0.13),
          new MeshStandardMaterial({
            color: index % 2 === 0 ? 0x6b5a32 : 0x3d4a2e,
            roughness: 1,
          }),
        )
        bag.position.set(
          cell.x + 0.5 + Math.cos(angle) * 0.22,
          cell.elevation + 0.1,
          cell.z + 0.5 + Math.sin(angle) * 0.22,
        )
        this.group.add(bag)
      }
    })
    bins.forEach((bin) => {
      const stored = bin.wasteFill ?? 0
      if (stored <= 0) return
      const fill = Math.min(1, stored / SIMULATION_CONFIG.waste.binCapacity)
      const bag = new Mesh(
        new BoxGeometry(0.12, 0.08 + fill * 0.1, 0.1),
        new MeshStandardMaterial({ color: 0x6b5a32, roughness: 1 }),
      )
      bag.position.set(bin.x + 0.5, bin.elevation + 0.48 + fill * 0.06, bin.z + 0.5)
      this.group.add(bag)
    })
  }
}
