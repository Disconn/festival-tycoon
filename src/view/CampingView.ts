import { batchCampMeshes } from './batchCampMeshes'
import { campingBoundary, campingGrassTexture } from './campingGround'
import { CAMP_COLORS, campRotation, campSeed, createCampModel } from './campingModels'
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import type { GameSnapshot } from '../game/GameState'
import { getTerrainHeight } from '../game/terrain'
import { disposeChildren, disposeObject3D } from './disposeObject3D'

export function createHandcartModel(): Group {
  const cart = new Group()
  const body = new Mesh(
    new BoxGeometry(0.25, 0.13, 0.32),
    new MeshStandardMaterial({ color: 0xb83e35, roughness: 0.8 }),
  )
  body.position.y = 0.12
  const gear = new Mesh(
    new BoxGeometry(0.19, 0.15, 0.23),
    new MeshStandardMaterial({ color: 0x4f7c45, roughness: 0.95 }),
  )
  gear.position.y = 0.23
  cart.add(body, gear)
  ;[-0.14, 0.14].forEach((x) => {
    const wheel = new Mesh(
      new CylinderGeometry(0.055, 0.055, 0.035, 8),
      new MeshStandardMaterial({ color: 0x25282c }),
    )
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, 0.065, 0.04)
    cart.add(wheel)
  })
  const handle = new Mesh(
    new BoxGeometry(0.025, 0.025, 0.3),
    new MeshStandardMaterial({ color: 0x34383d }),
  )
  handle.position.set(0, 0.12, -0.3)
  handle.rotation.x = -0.18
  cart.add(handle)
  cart.userData.handcart = true
  return cart
}

function createSleepSprite(): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (context) {
    context.font = 'bold 42px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#eef7ff'
    context.strokeStyle = '#284056'
    context.lineWidth = 6
    context.strokeText('ZZZ', 64, 32)
    context.fillText('ZZZ', 64, 32)
  }
  const sprite = new Sprite(
    new SpriteMaterial({
      map: new CanvasTexture(canvas),
      transparent: true,
      depthTest: false,
    }),
  )
  sprite.scale.set(0.65, 0.32, 0.32)
  return sprite
}

const VISIBLE_CAMP_PHASES = new Set([
  'ready',
  'returning',
  'resting',
  'packing',
])

export class CampingView {
  readonly group = new Group()
  private readonly props = new Group()
  private readonly batchedProps = new Group()
  private propModels = new Map<string, { stamp: string; model: Group }>()
  private tileFingerprint = ''
  private camperFingerprint = ''
  private installationFingerprint = ''
  private tiles: InstancedMesh | null = null
  private boundary: InstancedMesh | null = null
  private readonly tileGeometry = new PlaneGeometry(1, 1)
  private readonly tileMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    map: campingGrassTexture(),
    roughness: 1,
    depthWrite: true,
  })
  private readonly tileRotation = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    -Math.PI / 2,
  )
  private readonly tileMatrix = new Matrix4()
  private readonly tilePosition = new Vector3()
  private readonly tileScale = new Vector3(1, 1, 1)

  constructor() {
    this.tileGeometry.userData.shared = true
    this.tileMaterial.userData.shared = true
    this.group.add(this.props, this.batchedProps)
  }

  invalidate(): void {
    disposeChildren(this.props)
    disposeChildren(this.batchedProps)
    this.propModels.clear()
    this.tileFingerprint = ''
    this.camperFingerprint = ''
    this.installationFingerprint = ''
  }

  update(snapshot: Readonly<GameSnapshot>): void {
    const camperFingerprint = this.createCamperFingerprint(snapshot)
    const installationFingerprint = this.createInstallationFingerprint(snapshot)
    const tileFingerprint = this.createTileFingerprint(snapshot)
    const tilesChanged = tileFingerprint !== this.tileFingerprint
    const propsChanged =
      camperFingerprint !== this.camperFingerprint ||
      installationFingerprint !== this.installationFingerprint
    if (!tilesChanged && !propsChanged) return
    this.tileFingerprint = tileFingerprint
    this.camperFingerprint = camperFingerprint
    this.installationFingerprint = installationFingerprint
    if (tilesChanged) this.updateTiles(snapshot)
    if (propsChanged || tilesChanged) this.rebuildProps(snapshot)
  }

  private createTileFingerprint(snapshot: Readonly<GameSnapshot>): string {
    let fingerprint = `${snapshot.campingCells.length}`
    for (const cell of snapshot.campingCells) {
      fingerprint += `|${cell.x}:${cell.z}:${getTerrainHeight(snapshot.terrain, cell.x, cell.z)}`
    }
    return fingerprint
  }

  private createCamperFingerprint(snapshot: Readonly<GameSnapshot>): string {
    let fingerprint = ''
    for (const visitor of snapshot.visitors) {
      if (!visitor.campsite) continue
      const visible = VISIBLE_CAMP_PHASES.has(visitor.campingPhase)
      const visualPhase = !visible
        ? 'hidden'
        : visitor.campingPhase === 'resting'
          ? 'resting'
          : 'visible'
      fingerprint += `${visitor.id}:${visitor.campsite.x}:${visitor.campsite.z}:${visualPhase}:${visitor.color}|`
    }
    return fingerprint
  }

  private createInstallationFingerprint(snapshot: Readonly<GameSnapshot>): string {
    let fingerprint = ''
    for (const installation of snapshot.campInstallations) {
      fingerprint += `${installation.id}:${installation.cell.x}:${installation.cell.z}:${installation.kind}:${installation.contributorIds.length}:${installation.appearanceId}:${installation.fabricColor}:${Math.round(installation.decay ?? 0)}|`
    }
    return fingerprint
  }

  private nextTileCapacity(needed: number): number {
    return Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(needed, 1))))
  }

  private updateTiles(snapshot: Readonly<GameSnapshot>): void {
    const cells = snapshot.campingCells
    if (this.boundary) { this.group.remove(this.boundary); disposeObject3D(this.boundary); this.boundary = null }
    const edges = campingBoundary(cells)
    if (edges.length) {
      const border = new InstancedMesh(new BoxGeometry(.34, .07, .065), new MeshStandardMaterial({ color: 0xc4bba0, roughness: 1 }), edges.length * 2)
      const matrix = new Matrix4()
      let at = 0
      for (const edge of edges) for (const offset of [-.28, .28]) {
        const angle = edge.direction * Math.PI / 2
        matrix.makeRotationY(angle)
        matrix.setPosition(edge.x + .5 + Math.sin(angle) * .47 + Math.cos(angle) * offset, getTerrainHeight(snapshot.terrain, edge.x, edge.z) + .045, edge.z + .5 + Math.cos(angle) * .47 - Math.sin(angle) * offset)
        border.setMatrixAt(at++, matrix)
      }
      border.frustumCulled = false; this.boundary = border; this.group.add(border)
    }
    if (cells.length === 0) {
      if (this.tiles) this.tiles.count = 0
      return
    }
    let tiles = this.tiles
    if (!tiles || tiles.instanceMatrix.count < cells.length) {
      if (tiles) this.group.remove(tiles)
      tiles = new InstancedMesh(
        this.tileGeometry,
        this.tileMaterial,
        this.nextTileCapacity(cells.length),
      )
      tiles.frustumCulled = false
      this.tiles = tiles
      this.group.add(tiles)
    }
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index]!
      this.tilePosition.set(
        cell.x + 0.5,
        getTerrainHeight(snapshot.terrain, cell.x, cell.z) + 0.018,
        cell.z + 0.5,
      )
      this.tileMatrix.compose(
        this.tilePosition,
        this.tileRotation,
        this.tileScale,
      )
      tiles.setMatrixAt(index, this.tileMatrix)
    }
    tiles.count = cells.length
    tiles.instanceMatrix.needsUpdate = true
  }

  private rebuildProps(snapshot: Readonly<GameSnapshot>): void {
    const active = new Set<string>()
    const needsUpdate = (key: string, stamp: string): boolean => {
      active.add(key)
      const existing = this.propModels.get(key)
      if (existing?.stamp === stamp) return false
      if (existing) { this.props.remove(existing.model); disposeObject3D(existing.model) }
      return true
    }
    snapshot.visitors.forEach((visitor) => {
      if (
        !visitor.campsite ||
        !VISIBLE_CAMP_PHASES.has(visitor.campingPhase)
      ) {
        return
      }
      const key = `visitor:${visitor.id}`
      const height = getTerrainHeight(snapshot.terrain, visitor.campsite.x, visitor.campsite.z)
      const stamp = `${visitor.campsite.x}:${visitor.campsite.z}:${height}:${visitor.color}:${visitor.campingPhase === 'resting'}`
      if (!needsUpdate(key, stamp)) return
      const campsite = new Group()
      campsite.position.set(
        visitor.campsite.x + 0.5,
        getTerrainHeight(snapshot.terrain, visitor.campsite.x, visitor.campsite.z) +
          0.02,
        visitor.campsite.z + 0.5,
      )
      campsite.rotation.y = campRotation(visitor.id)
      const tent = createCampModel('tent', visitor.id, visitor.color)
      const parkedCart = createHandcartModel()
      parkedCart.scale.setScalar(0.8)
      parkedCart.position.set(0.34, 0.07, -0.24)
      parkedCart.rotation.y = -0.7
      campsite.add(tent, parkedCart)
      if (visitor.campingPhase === 'resting') {
        const sleep = createSleepSprite()
        sleep.position.set(0.08, 0.86, 0)
        campsite.add(sleep)
      }
      this.props.add(campsite)
      this.propModels.set(key, { stamp, model: campsite })
    })
    snapshot.campInstallations.forEach((installation) => {
      const appearanceId = installation.appearanceId ?? installation.id
      const color = installation.fabricColor ?? (installation.kind === 'tent' ? 0x8a6a4a : CAMP_COLORS[(campSeed(appearanceId) >>> 4) % CAMP_COLORS.length]!)
      const decay = installation.decay ?? 0
      const key = `installation:${installation.id}`
      const stamp = `${installation.cell.x}:${installation.cell.z}:${getTerrainHeight(snapshot.terrain, installation.cell.x, installation.cell.z)}:${installation.kind}:${installation.contributorIds.length}:${appearanceId}:${color}:${Math.round(decay)}`
      if (!needsUpdate(key, stamp)) return
      const model =
        installation.kind === 'tent'
          ? this.createAbandonedTentModel(color, decay, appearanceId)
          : installation.kind === 'pavilion'
            ? createCampModel('pavilion', appearanceId, color, decay)
            : installation.kind === 'musicBox'
              ? this.createMusicBoxModel()
              : this.createChairModel(installation.contributorIds.length)
      model.position.set(
        installation.cell.x + 0.5,
        getTerrainHeight(
          snapshot.terrain,
          installation.cell.x,
          installation.cell.z,
        ) + 0.02,
        installation.cell.z + 0.5,
      )
      if (installation.kind === 'tent' || installation.kind === 'pavilion') model.rotation.y = campRotation(appearanceId)
      if (decay > 0 && installation.kind !== 'tent' && installation.kind !== 'pavilion') {
        const wear = decay / 100
        model.rotation.z += wear * 0.28
        model.scale.setScalar(1 - wear * 0.18)
      }
      this.props.add(model)
      this.propModels.set(key, { stamp, model })
    })
    for (const [key, entry] of this.propModels) {
      if (active.has(key)) continue
      this.props.remove(entry.model)
      disposeObject3D(entry.model)
      this.propModels.delete(key)
    }
    disposeChildren(this.batchedProps)
    this.batchedProps.add(batchCampMeshes(this.props))
  }

  private createAbandonedTentModel(color: number, decay: number, id: string): Group {
    const group = createCampModel('tent', id, color, decay)
    const wear = Math.max(0, Math.min(1, decay / 100))
    if (wear < 0.7) {
      const parkedCart = createHandcartModel()
      parkedCart.scale.setScalar(0.8)
      parkedCart.position.set(0.34, 0.07, -0.24)
      parkedCart.rotation.y = -0.7
      parkedCart.rotation.z = wear * 0.4
      group.add(parkedCart)
    }
    return group
  }
  private createChairModel(amount: number): Group {
    const group = new Group()
    const material = new MeshStandardMaterial({ color: 0x3b6d87, roughness: 0.8 })
    for (let index = 0; index < Math.min(5, amount); index += 1) {
      const angle = (index / Math.max(2, amount)) * Math.PI * 2
      const chair = new Group()
      const seat = new Mesh(new BoxGeometry(0.22, 0.04, 0.2), material)
      const back = new Mesh(new BoxGeometry(0.22, 0.23, 0.035), material)
      seat.position.y = 0.16
      back.position.set(0, 0.27, -0.085)
      chair.position.set(Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22)
      chair.rotation.y = -angle - Math.PI / 2
      chair.add(seat, back)
      group.add(chair)
    }
    return group
  }

  private createMusicBoxModel(): Group {
    const group = new Group()
    const body = new Mesh(
      new BoxGeometry(0.42, 0.28, 0.24),
      new MeshStandardMaterial({ color: 0x323641, roughness: 0.65 }),
    )
    body.position.y = 0.16
    group.add(body)
    ;[-0.12, 0.12].forEach((x) => {
      const speaker = new Mesh(
        new CylinderGeometry(0.075, 0.075, 0.012, 12),
        new MeshStandardMaterial({ color: 0x13151a }),
      )
      speaker.rotation.x = Math.PI / 2
      speaker.position.set(x, 0.16, 0.126)
      group.add(speaker)
    })
    const notes = document.createElement('canvas')
    notes.width = 96
    notes.height = 64
    const context = notes.getContext('2d')!
    context.font = '42px sans-serif'
    context.textAlign = 'center'
    context.fillText('♫', 48, 46)
    const sprite = new Sprite(
      new SpriteMaterial({
        map: new CanvasTexture(notes),
        transparent: true,
        depthWrite: false,
      }),
    )
    sprite.scale.set(0.45, 0.3, 1)
    sprite.position.set(0, 0.55, 0)
    group.add(sprite)
    return group
  }
}
