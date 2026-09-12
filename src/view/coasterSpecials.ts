import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import type { TrackPiece } from '../game/coasters'
import { ModelKit } from './retroBuildings'

export function createCoasterSpecial(piece: TrackPiece): Group | null {
  if (!['photo', 'splash', 'brakes'].includes(piece.kind)) return null
  const group = new Group(), kit = new ModelKit()
  const length = Math.hypot(piece.end.x - piece.start.x, piece.end.z - piece.start.z)
  if (piece.kind === 'photo') {
    kit.box(.43, .48, length / 2, .055, .96, .055, 0xa2a7a2)
    kit.box(.43, .96, length / 2, .19, .16, .23, 0x3a454d)
    kit.box(.31, .96, length / 2, .07, .08, .1, 0x1c262d)
    kit.box(-.44, .46, length / 2, .05, .9, .05, 0xdcc268)
    kit.box(-.44, .85, length / 2, .24, .22, .04, 0xe9ce74)
  } else if (piece.kind === 'splash') {
    kit.box(0, .05, length / 2, .92, .1, length, 0x4a8896)
    for (const x of [-.44, .44]) kit.box(x, .12, length / 2, .065, .22, length, 0x9aada5)
    for (let i = 0; i < 12; i++) kit.box(i % 2 ? .3 : -.3, .115, i / 12 * length, .17, .02, .05, 0x9dd8db)
  } else {
    for (let i = 0; i < 8; i++) {
      kit.box(0, .28, i / 8 * length + .1, .07, .14, .12, 0x3c4e54)
      for (const x of [-.22, .22]) kit.box(x, .24, i / 8 * length + .1, .09, .07, .13, 0xd3a858)
    }
  }
  const geometry = kit.finish(); geometry.userData.shared = false
  group.add(new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: .6 })))
  if (piece.kind === 'photo' || piece.kind === 'splash') {
    const effect = new Group()
    const material = new MeshBasicMaterial({ color: piece.kind === 'photo' ? 0xfff6d8 : 0xa2e8ef, transparent: true, opacity: .65, depthWrite: false })
    const geometry = new BoxGeometry(.07, .07, .07)
    for (let i = 0; i < (piece.kind === 'photo' ? 1 : 12); i++) {
      const particle = new Mesh(geometry, material)
      particle.position.set(piece.kind === 'photo' ? .3 : (i % 2 ? 1 : -1) * (.23 + i % 3 * .09), piece.kind === 'photo' ? .98 : .35 + i % 4 * .13, length / 2 + (i % 3 - 1) * .17)
      effect.add(particle)
    }
    effect.visible = false; group.add(effect); group.userData.effect = effect
  }
  group.position.set(piece.start.x + .5, piece.start.elevation, piece.start.z + .5)
  group.rotation.y = piece.start.heading * Math.PI / 2
  group.userData.pieceId = piece.id
  return group
}
