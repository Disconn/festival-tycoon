import { BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { ModelKit } from './retroBuildings'

export type AccessTheme = 'carousel' | 'bungee' | 'coaster'
export type AccessKind = 'entrance' | 'exit'

const geometryCache = new Map<string, BufferGeometry>()
const material = new MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: .05 })
material.userData.shared = true

// Local +Z faces the attraction. The center remains open for the guest route.
function buildAccess(kind: AccessKind, theme: AccessTheme): BufferGeometry {
  const k = new ModelKit()
  const cream = 0xf4e2b6, ink = 0x293b40, steel = 0x9aaead
  const colors = {
    carousel: { roof: 0xb94e63, trim: 0xe8b655, wall: 0x8e5846 },
    bungee: { roof: 0x368b86, trim: 0xe7b657, wall: 0x52676d },
    coaster: { roof: 0x476a98, trim: 0xd4aa65, wall: 0x907157 },
  }[theme]
  const entrance = kind === 'entrance'
  const signColor = entrance ? 0x32775b : 0x326a92

  k.box(0, .027, 0, .96, .054, .94, 0x777b70)
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    k.box(-.348 + col * .232, .061, -.36 + row * .18, .22, .022, .166,
      (row + col) % 2 ? 0xc4bba0 : 0xb3af99)
  }
  // Low side railings guide the queue without closing the walking channel.
  for (const x of [-.41, .41]) {
    for (const z of [-.36, .36]) {
      k.box(x, .25, z, .045, .36, .045, colors.wall)
      k.box(x, .44, z, .065, .035, .065, cream)
    }
    for (const y of [.2, .37]) k.box(x, y, .08, .026, .035, .55, steel)
    k.box(x, .45, -.08, .075, .78, .085, colors.wall)
    k.box(x, .11, -.08, .11, .08, .12, cream)
    k.box(x, .75, -.08, .11, .04, .12, colors.trim)
  }

  if (entrance) {
    // Ticket booth beside the passage, including counter, glazing and cladding.
    k.box(-.32, .32, -.065, .26, .5, .4, colors.wall)
    for (let n = 0; n < 4; n++) k.box(-.32, .13 + n * .065, -.274, .26, .015, .016, colors.trim)
    k.box(-.32, .55, -.055, .25, .27, .38, cream)
    k.box(-.32, .565, -.251, .185, .17, .013, ink)
    k.box(-.32, .58, -.261, .155, .11, .012, 0x7eb7bb)
    k.box(-.353, .6, -.27, .016, .075, .008, 0xcce3cd)
    k.box(-.186, .565, -.035, .012, .17, .22, 0x6b999a)
    k.box(-.31, .435, -.295, .31, .045, .12, colors.trim)
    k.box(-.26, .465, -.286, .055, .021, .055, cream)
    // A small ticket scanner on the opposite post.
    k.box(.355, .45, -.16, .09, .15, .075, ink)
    k.box(.355, .48, -.202, .057, .035, .012, 0x9edc8a)
  }

  const roofY = entrance ? .94 : .84
  k.box(0, roofY - .105, -.08, .91, .055, .48, colors.trim)
  for (let stripe = 0; stripe < 9; stripe++) {
    const x = -.416 + stripe * .104
    k.box(x, roofY - .06, -.08, .102, .055, .57, stripe % 2 ? cream : colors.roof)
    k.box(x, roofY - .105, -.354, .102, .07, .026, stripe % 2 ? cream : colors.roof)
  }
  k.box(0, roofY - .015, -.035, .8, .05, .33, colors.roof)
  k.box(0, roofY + .025, -.01, .67, .035, .17, colors.roof)
  k.box(0, roofY + .05, -.01, .73, .02, .06, colors.trim)

  // Pixel pictograms on both sides are readable without text textures.
  const signY = roofY - .205
  for (const face of [-1, 1]) {
    const z = -.08 + face * .255
    k.box(.025, signY, z, .39, .18, .022, cream)
    k.box(.025, signY, z + face * .014, .355, .147, .012, signColor)
    const front = z + face * .025
    if (entrance) {
      k.box(.025, signY, front, .16, .085, .009, cream)
      for (const x of [-.005, .025, .055]) k.box(x, signY, front + face * .006, .01, .047, .007, signColor)
      for (const x of [-.06, .11]) k.box(x, signY, front + face * .006, .028, .025, .007, signColor)
    } else {
      k.box(.015, signY, front, .16, .025, .009, cream)
      for (let n = 0; n < 3; n++) k.box(.075 - n * .026, signY, front, .025, .035 + n * .032, .009, cream)
    }
  }
  // Inlaid direction marker points inward for entry, outward for exit.
  const dir = entrance ? 1 : -1
  k.box(.08, .077, .24, .028, .008, .13, cream)
  for (let n = 0; n < 3; n++) k.box(.08, .077, .24 + dir * (.065 - n * .025), .025 + n * .045, .008, .024, cream)
  return k.finish()
}

/** All detail is baked into one shared mesh; previews own only their material. */
export function createAttractionAccess(kind: AccessKind, theme: AccessTheme, preview = false): Group {
  const key = `${theme}:${kind}`
  let geometry = geometryCache.get(key)
  if (!geometry) { geometry = buildAccess(kind, theme); geometryCache.set(key, geometry) }
  const surface = preview ? material.clone() : material
  if (preview) { surface.userData = {}; surface.transparent = true; surface.opacity = .65; surface.depthWrite = false }
  const group = new Group(), mesh = new Mesh(geometry, surface)
  mesh.castShadow = !preview
  mesh.receiveShadow = true
  mesh.userData.retroStatic = !preview
  group.add(mesh)
  return group
}
