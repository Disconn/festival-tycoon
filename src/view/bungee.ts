import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { ModelKit } from './retroBuildings'
import { createPersonFigure } from './pixelPeople'

type BungeeRig = {
  jumper: Group
  rope: Mesh
  height: number
  visitorId: string | null
  nude: boolean
}

/** Merged static structure, one rider and one stretchable rope. */
export function createBungeeModel(meters: number): Group {
  const height = meters / 4, k = new ModelKit(), group = new Group()
  k.box(0, .06, 0, .96, .12, .96, 0x727e83)
  for (const x of [-.28, .28]) for (const z of [-.3, -.05]) k.box(x, height / 2, z, .055, height, .055, 0xedba48)
  const sections = Math.ceil(height / .6)
  for (let i = 0; i < sections; i++) {
    const y = i * height / sections, next = (i + 1) * height / sections
    k.beam([-.28, y, -.3], [.28, next, -.3], .03, 0x6d858c)
    k.beam([.28, y, -.3], [-.28, next, -.3], .03, 0x6d858c)
    k.box(0, y, -.05, .55, .025, .05, 0x34454e)
  }
  k.box(0, height, 0, .8, .09, .85, 0x334951)
  for (const x of [-.37, .37]) k.box(x, height + .18, 0, .025, .35, .85, 0xf1c763)
  k.beam([0, height + .32, -.2], [0, height + .32, .45], .055, 0xf1c763)
  const geometry = k.finish(); geometry.userData.shared = false
  const structure = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: .7 }))
  structure.castShadow = true; structure.receiveShadow = true; group.add(structure)
  const jumper = new Group()
  const rope = new Mesh(new CylinderGeometry(.009, .009, 1, 5), new MeshStandardMaterial({ color: 0xf0e5bb }))
  jumper.visible = rope.visible = false; group.add(jumper, rope)
  group.userData.bungee = { jumper, rope, height, visitorId: null, nude: false } satisfies BungeeRig
  return group
}

export function setBungeeJumper(
  group: Group,
  rider: { id: string; color: number; bungeeNude?: boolean } | null,
): void {
  const rig = group.userData.bungee as BungeeRig
  const nude = Boolean(rider?.bungeeNude)
  if (!rider) {
    if (rig.visitorId === null && rig.jumper.children.length === 0) return
    rig.jumper.clear()
    rig.visitorId = null
    rig.nude = false
    return
  }
  if (rig.visitorId === rider.id && rig.nude === nude && rig.jumper.children.length > 0) return
  rig.jumper.clear()
  rig.jumper.add(createPersonFigure(rider.id, rider.color, { nude }))
  rig.visitorId = rider.id
  rig.nude = nude
}

export function bungeeDrop(progress: number): number {
  const t = Math.max(0, Math.min(1, progress))
  if (t < .2) return 1 - t / .2
  if (t < .32) return 0
  if (t < .48) return ((t - .32) / .16) ** 2 * .82
  if (t < .82) return .62 + Math.cos((t - .48) / .34 * Math.PI * 4) * .2 * Math.exp(-(t - .48) * 5)
  return .62 + (t - .82) / .18 * .38
}

export function animateBungee(group: Group, progress: number | null): void {
  const rig = group.userData.bungee as { jumper: Object3D; rope: Mesh; height: number }
  rig.jumper.visible = rig.rope.visible = progress !== null
  if (progress === null) return
  const drop = bungeeDrop(progress) * Math.max(.2, rig.height - .4)
  const y = rig.height - drop + .18
  rig.jumper.position.set(0, y, .36)
  rig.jumper.rotation.x = progress > .32 && progress < .82 ? Math.PI : 0
  const length = Math.max(.05, rig.height + .32 - y)
  rig.rope.position.set(0, y + length / 2, .36); rig.rope.scale.y = length
}
