import { BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { BuildingKind } from '../game/catalog'

// Small, strongly silhouetted pieces, baked into vertex colors: detail adds
// triangles, never a draw call per bolt, plank, bottle or awning stripe.
class ModelKit {
  private parts: BufferGeometry[] = []
  private add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, rotation = new Quaternion()): void {
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), rotation, new Vector3(1, 1, 1)))
    const tint = new Color(color)
    const colors = new Float32Array(geometry.getAttribute('position').count * 3)
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i)
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    geometry.deleteAttribute('uv')
    this.parts.push(geometry)
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number): void {
    this.add(new BoxGeometry(w, h, d), color, x, y, z)
  }
  cylinder(x: number, y: number, z: number, radius: number, height: number, color: number, top = radius, sides = 8): void {
    this.add(new CylinderGeometry(top, radius, height, sides), color, x, y, z)
  }
  beam(a: [number, number, number], b: [number, number, number], width: number, color: number): void {
    const start = new Vector3(...a), end = new Vector3(...b), direction = end.clone().sub(start)
    const center = start.add(end).multiplyScalar(.5)
    this.add(new BoxGeometry(width, direction.length(), width), color, center.x, center.y, center.z,
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()))
  }
  finish(): BufferGeometry {
    const result = mergeGeometries(this.parts)!
    for (const part of this.parts) part.dispose()
    result.computeBoundingSphere()
    result.userData.shared = true
    return result
  }
}

const ink = 0x28363b, cream = 0xf2dfb5, timber = 0x936141, steel = 0x92a6a5
const material = new MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: .05 })
material.userData.shared = true
const geometries = new Map<BuildingKind, BufferGeometry>()
export const DETAILED_BUILDINGS: readonly BuildingKind[] = ['food', 'alcohol', 'toilet', 'tree', 'hedge', 'bench', 'wasteBin', 'generator', 'backupGenerator', 'foh', 'delayTower', 'securityGate', 'ride', 'shrub', 'flowerbed', 'planter', 'rock', 'statue', 'banner']

function build(kind: BuildingKind): BufferGeometry {
  const k = new ModelKit()
  if (kind === 'shrub' || kind === 'flowerbed' || kind === 'planter') {
    const base = kind === 'planter' ? .35 : .06
    k.box(0, base / 2, 0, .8, base, .8, kind === 'planter' ? 0xb37751 : 0x88754f)
    k.box(0, base, 0, .7, .025, .7, 0x4f5135)
    if (kind === 'planter') for (const x of [-.37, .37]) k.box(x, .34, 0, .08, .07, .87, cream)
    for (let i = 0; i < 9; i++) {
      const x = (i % 3 - 1) * .23, z = (Math.floor(i / 3) - 1) * .23
      const height = kind === 'shrub' ? .21 + i % 3 * .06 : .1
      k.cylinder(x, base + height / 2, z, .14, height, i % 2 ? 0x699a50 : 0x48784a, .11, 5)
      k.box(x, base + height, z, .115, .035, .115, [0xe9be59, 0xcf6c93, 0xeee6bb][i % 3]!)
      k.box(x, base + height + .024, z, .034, .015, .034, 0xf6dc8e)
    }
  } else if (kind === 'rock') {
    k.cylinder(-.13, .18, .06, .36, .36, 0x798783, .24, 5)
    k.cylinder(.24, .11, -.18, .24, .22, 0xa0aaa0, .16, 5)
    k.box(-.2, .05, .27, .31, .065, .17, 0x739055)
  } else if (kind === 'statue') {
    k.box(0, .06, 0, .7, .12, .7, 0x657774)
    k.box(0, .23, 0, .48, .23, .48, 0xb0b8a6)
    k.box(0, .24, .25, .27, .075, .018, 0xb59a5c)
    k.cylinder(-.12, .46, 0, .16, .13, 0xbd9b51, .14)
    k.beam([0, .45, 0], [0, 1.12, 0], .07, 0xd4b66b)
    k.beam([0, 1.1, 0], [.27, .98, 0], .08, 0xd4b66b)
    k.beam([.27, .98, 0], [.27, .82, 0], .07, 0xbd9b51)
  } else if (kind === 'banner') {
    for (const x of [-.4, .4]) {
      k.box(x, .64, 0, .045, 1.28, .08, timber)
      k.box(x, .025, 0, .14, .05, .3, ink)
      k.cylinder(x, 1.32, 0, .05, .08, 0xd7b968, .01)
    }
    k.box(0, 1.2, 0, .86, .045, .08, timber)
    k.box(0, .93, 0, .74, .47, .055, 0xb74967)
    k.box(0, .72, .033, .74, .035, .02, cream)
    for (const side of [-1, 1]) {
      k.box(0, .98, side * .036, .37, .035, .014, cream)
      k.box(-.07, .89, side * .036, .23, .035, .014, cream)
      k.box(.12, 1.04, side * .036, .035, .16, .014, cream)
    }
  } else if (kind === 'food' || kind === 'alcohol') {
    const accent = kind === 'food' ? 0xd95b3e : 0x3c8775
    k.box(0, .045, 0, .88, .09, .86, ink)
    k.box(0, .29, -.05, .76, .48, .66, timber)
    // Board siding, serving recess, rear shelf and raised fascia.
    for (let i = 0; i < 9; i++) k.box(-.34 + i * .085, .3, .288, .072, .43, .025, i % 2 ? 0xb27c51 : 0xa16c47)
    k.box(0, .63, -.315, .76, .3, .045, accent)
    for (const x of [-.36, .36]) k.box(x, .57, 0, .055, .53, .67, accent)
    k.box(0, .51, .32, .83, .055, .25, cream)
    k.box(0, .75, .12, .86, .07, .93, cream)
    for (let i = 0; i < 9; i++) {
      const color = i % 2 ? cream : accent
      k.box(-.4 + i * .1, .8, .15, .1, .05, .88, color)
      k.box(-.4 + i * .1, .73, .565, .1, .1, .035, color)
    }
    k.box(0, .96, -.12, .43, .25, .065, ink)
    k.box(0, .96, -.078, .38, .2, .02, cream)
    k.box(-.26, .6, .33, .105, .12, .09, ink) // till
    k.box(-.26, .65, .38, .07, .025, .01, 0x84c1aa)
    k.box(.26, .615, -.285, .13, .16, .02, ink) // menu
    for (let i = 0; i < 4; i++) k.box(.26, .67 - i * .032, -.27, .095, .009, .006, cream)
    if (kind === 'food') {
      // Burger sign, trays, sauce bottles and extractor stack.
      k.box(0, 1.01, -.055, .23, .045, .025, 0xe5a047)
      k.box(0, .958, -.055, .25, .025, .025, 0x76a151)
      k.box(0, .93, -.055, .21, .032, .025, 0x754733)
      k.box(0, .902, -.055, .23, .025, .025, 0xe5a047)
      for (const x of [-.09, .07]) {
        k.box(x, .547, .32, .12, .018, .13, steel)
        k.box(x, .564, .32, .08, .02, .07, 0xe5a047)
      }
      k.cylinder(.24, .58, .3, .025, .085, 0xd74132)
      k.cylinder(.31, .58, .3, .025, .085, 0xecc44e)
      k.box(-.27, .94, -.26, .09, .22, .1, steel)
      k.box(-.27, 1.06, -.26, .14, .035, .14, ink)
    } else {
      k.box(-.02, .97, -.05, .12, .12, .03, 0xe9b64b)
      k.box(-.02, 1.04, -.05, .14, .03, .035, 0xfff7de)
      k.box(.065, .965, -.05, .035, .07, .03, 0xe9b64b)
      for (let i = 0; i < 5; i++) {
        k.cylinder(-.23 + i * .09, .6, -.23, .026, .12, i % 2 ? 0x4a8058 : 0xa57c38)
        k.cylinder(-.23 + i * .09, .68, -.23, .013, .04, cream)
      }
      for (const x of [0, .13, .26]) {
        k.cylinder(x, .55, .34, .027, .055, cream)
        k.beam([x, .54, .1], [x, .67, .1], .018, steel)
        k.box(x, .68, .13, .025, .045, .075, ink)
      }
    }
  } else if (kind === 'toilet') {
    k.box(0, .04, 0, .91, .08, .81, ink)
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * .29, tint = i === 1 ? 0x519eae : 0x638fab
      k.box(x, .44, 0, .275, .81, .67, tint)
      k.box(x, .43, .344, .225, .69, .023, 0x326b80)
      k.box(x, .8, .36, .2, .04, .025, cream)
      k.box(x + .072, .43, .367, .024, .024, .02, steel)
      k.box(x, .67, .369, .075, .082, .02, cream)
      k.box(x, .67, .382, .02, .052, .005, ink)
      for (let j = 0; j < 3; j++) k.box(x, .19 + j * .032, .361, .17, .012, .01, ink)
      k.box(x, .87, 0, .29, .08, .74, cream)
      k.cylinder(x, .96, -.23, .026, .13, ink)
    }
  } else if (kind === 'tree') {
    k.cylinder(0, .49, 0, .1, .96, timber, .058, 6)
    for (const sign of [-1, 1]) k.beam([0, .55, 0], [sign * .23, 1.04, .08], .065, 0x74543b)
    // Stepped, faceted foliage keeps the isometric silhouette legible.
    for (let i = 0; i < 4; i++) {
      const y = .8 + i * .25, r = .49 - i * .09
      k.cylinder(0, y, 0, r, .47, [0x345c40, 0x407b49, 0x589451, 0x78a85c][i]!, r * .22, 7)
    }
    k.box(-.11, .03, .03, .23, .06, .16, 0x6c7d48)
  } else if (kind === 'hedge') {
    k.box(0, .08, 0, .87, .16, .35, 0x716148)
    for (let i = 0; i < 7; i++) {
      k.box(-.36 + i * .12, .31 + i % 2 * .025, 0, .17, .42, .35, i % 2 ? 0x54884e : 0x3c6e46)
      k.box(-.36 + i * .12, .535 + i % 2 * .025, 0, .15, .035, .3, 0x79a35c)
    }
  } else if (kind === 'bench') {
    for (let i = 0; i < 4; i++) k.box(0, .28, .25 + i * .065, .69, .035, .048, i % 2 ? 0xb6814e : timber)
    for (let i = 0; i < 3; i++) k.box(0, .37 + i * .066, .215, .69, .043, .035, 0xb6814e)
    for (const x of [-.26, .26]) {
      k.box(x, .15, .33, .04, .28, .22, ink)
      k.box(x, .4, .22, .04, .26, .045, ink)
      k.box(x, .37, .335, .04, .035, .27, ink)
      for (const y of [.37, .5]) k.box(x, y, .238, .018, .018, .01, steel)
    }
  } else if (kind === 'wasteBin') {
    k.box(0, .22, 0, .3, .4, .3, 0x3d6657)
    for (const x of [-.12, -.04, .04, .12]) k.box(x, .21, .156, .035, .34, .02, 0x2b4b43)
    k.box(0, .43, 0, .35, .045, .34, ink)
    k.box(0, .465, -.02, .19, .025, .13, 0x142828)
    k.box(0, .29, .173, .1, .12, .018, cream)
    k.box(0, .29, .187, .045, .06, .01, 0x3d6657)
  } else if (kind === 'generator' || kind === 'backupGenerator') {
    const tint = kind === 'generator' ? 0xe2ab39 : 0x74958a
    k.box(0, .07, 0, .83, .1, .65, ink)
    k.box(0, .33, 0, .76, .44, .52, tint)
    k.box(0, .57, 0, .8, .05, .57, cream)
    for (let i = 0; i < 7; i++) k.box(-.25 + i * .066, .35, .266, .029, .25, .02, ink)
    k.box(.39, .39, .08, .02, .22, .21, ink)
    k.box(.404, .43, .1, .008, .07, .11, 0x77b9a3)
    k.box(.407, .35, .09, .01, .035, .035, 0xde5a43)
    k.cylinder(-.22, .69, -.16, .035, .24, ink)
    k.box(-.22, .82, -.16, .1, .025, .08, steel)
    for (const x of [-.3, .3]) k.box(x, .1, 0, .11, .14, .68, ink)
    k.box(.1, .46, -.266, .19, .11, .015, cream)
    k.box(.1, .46, -.277, .04, .075, .01, ink)
  } else if (kind === 'foh') {
    k.box(0, .06, 0, .92, .12, .8, ink)
    k.box(0, .39, .05, .74, .27, .42, 0x42555c)
    k.box(0, .54, .05, .76, .03, .43, ink)
    for (let i = 0; i < 9; i++) {
      k.box(-.3 + i * .075, .564, .12, .008, .008, .16, steel)
      k.box(-.3 + i * .075, .575, .075 + i % 3 * .045, .035, .015, .02, i % 3 ? cream : 0xdf7349)
    }
    for (const x of [-.19, .19]) {
      k.box(x, .68, -.11, .23, .19, .045, ink)
      k.box(x, .69, -.083, .19, .13, .014, 0x6aa6b3)
    }
    for (const x of [-.42, .42]) for (const z of [-.32, .32]) k.box(x, .62, z, .035, 1.18, .035, steel)
    k.box(0, 1.21, 0, .94, .085, .83, 0x355c66)
    k.box(0, 1.16, .42, .94, .09, .03, cream)
  } else if (kind === 'delayTower') {
    k.box(0, .06, 0, .62, .12, .6, ink)
    for (const x of [-.14, .14]) k.box(x, 1.1, 0, .045, 2.1, .045, steel)
    for (let i = 0; i < 8; i++) k.beam([-.14, .12 + i * .25, 0], [.14, .37 + i * .25, 0], .025, steel)
    for (let i = 0; i < 4; i++) {
      k.box(0, 1.26 + i * .18, .16, .42, .165, .26, ink)
      k.box(0, 1.26 + i * .18, .299, .35, .11, .018, 0x4c6063)
      k.box(.17, 1.26 + i * .18, .31, .015, .015, .01, cream)
    }
  } else if (kind === 'securityGate') {
    for (const x of [-.38, .38]) {
      k.box(x, .53, 0, .12, 1.06, .21, 0x497e8b)
      k.box(x, .035, 0, .2, .07, .31, ink)
      k.box(x, .71, .112, .06, .13, .015, 0x9dcc9a)
    }
    k.box(0, 1.065, 0, .92, .17, .24, cream)
    for (let i = 0; i < 5; i++) k.box(-.2 + i * .1, 1.065, .126, .06, .05, .013, 0x497e8b)
    k.box(0, .51, 0, .62, .035, .045, steel)
  } else if (kind === 'ride') {
    k.cylinder(0, .08, 0, .48, .16, 0xa44463, .48, 12)
    k.cylinder(0, .18, 0, .44, .04, cream, .44, 12)
    k.cylinder(0, .7, 0, .045, 1.06, 0xe1b75e)
    k.cylinder(0, 1.2, 0, .49, .29, 0xd96c82, .035, 12)
    k.cylinder(0, 1.04, 0, .48, .09, cream, .48, 12)
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, x = Math.cos(a) * .31, z = Math.sin(a) * .31
      k.cylinder(x, .62, z, .014, .84, 0xd9b958)
      k.box(x, .47, z, .13, .09, .07, i % 2 ? 0x62a899 : 0xf1cf87)
      k.box(x + .05, .54, z, .04, .12, .06, cream)
      k.box(x, .405, z, .08, .04, .11, ink)
    }
    k.cylinder(0, 1.41, 0, .038, .15, 0xe1b75e, .004)
  }
  return k.finish()
}

export function createRetroBuilding(kind: BuildingKind): Group | null {
  if (!DETAILED_BUILDINGS.includes(kind)) return null
  let geometry = geometries.get(kind)
  if (!geometry) { geometry = build(kind); geometries.set(kind, geometry) }
  const group = new Group(), mesh = new Mesh(geometry, material)
  mesh.castShadow = mesh.receiveShadow = true
  mesh.userData.retroStatic = true
  group.add(mesh)
  return group
}

/** Shared geometry lets hundreds of identical assets draw once per kind. */
export function batchRetroBuildings(source: Group): Group {
  source.updateWorldMatrix(true, true)
  const inverse = source.matrixWorld.clone().invert()
  const buckets = new Map<BufferGeometry, Mesh[]>()
  source.traverse(object => {
    if (!(object instanceof Mesh) || !object.userData.retroStatic) return
    const bucket = buckets.get(object.geometry) ?? []
    bucket.push(object); buckets.set(object.geometry, bucket)
    object.visible = false
  })
  const group = new Group(), matrix = new Matrix4()
  for (const [geometry, meshes] of buckets) {
    const batch = new InstancedMesh(geometry, material, meshes.length)
    batch.userData.buildingIds = meshes.map(mesh => mesh.parent?.userData.buildingId)
    meshes.forEach((mesh, i) => batch.setMatrixAt(i, matrix.multiplyMatrices(inverse, mesh.matrixWorld)))
    batch.castShadow = batch.receiveShadow = true
    batch.computeBoundingSphere()
    group.add(batch)
  }
  return group
}
