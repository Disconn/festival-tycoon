import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import type { PowerSnapshot } from '../game/power'
import { powerCellKey } from '../game/power'
import { getTerrainHeight } from '../game/terrain'
import type { TerrainSnapshot } from '../game/terrain'

export class PowerView {
  readonly group = new Group()
  private tiles: InstancedMesh | null = null
  private fingerprint = ''
  private readonly geometry = new PlaneGeometry(0.82, 0.18)
  private readonly material = new MeshStandardMaterial({
    roughness: 0.45,
    metalness: 0.35,
    vertexColors: false,
  })
  private readonly rotation = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    -Math.PI / 2,
  )
  private readonly matrix = new Matrix4()
  private readonly position = new Vector3()
  private readonly scale = new Vector3(1, 1, 1)
  private readonly liveColor = new Color(0xf0c75e)
  private readonly deadColor = new Color(0x4a4333)

  constructor() {
    this.geometry.userData.shared = true
    this.material.userData.shared = true
    this.group.visible = false
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible
  }

  invalidate(): void {
    this.fingerprint = ''
  }

  update(
    power: Readonly<PowerSnapshot>,
    terrain: TerrainSnapshot | undefined,
  ): void {
    if (!this.group.visible) return
    const live = new Set(power.liveCableKeys)
    const fingerprint = power.cableCells
      .map((cell) => `${cell.x}:${cell.z}:${live.has(powerCellKey(cell.x, cell.z)) ? 1 : 0}`)
      .join('|')
    if (fingerprint === this.fingerprint) return
    this.fingerprint = fingerprint
    if (this.tiles) {
      this.group.remove(this.tiles)
      this.tiles = null
    }
    if (power.cableCells.length === 0) return
    const tiles = new InstancedMesh(
      this.geometry,
      this.material,
      power.cableCells.length,
    )
    tiles.frustumCulled = false
    power.cableCells.forEach((cell, index) => {
      this.position.set(
        cell.x + 0.5,
        getTerrainHeight(terrain, cell.x, cell.z) + 0.03,
        cell.z + 0.5,
      )
      this.matrix.compose(this.position, this.rotation, this.scale)
      tiles.setMatrixAt(index, this.matrix)
      tiles.setColorAt(
        index,
        live.has(powerCellKey(cell.x, cell.z)) ? this.liveColor : this.deadColor,
      )
    })
    tiles.instanceMatrix.needsUpdate = true
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true
    this.tiles = tiles
    this.group.add(tiles)
  }
}
