import { BufferGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial } from 'three'
import { ModelKit } from './retroBuildings'

export const PERSON_SKIN = [0xf2cfb0, 0xe3b38d, 0xc68f65, 0xa86e49, 0x815038, 0x593a30]
const trousers = [0x374e67, 0x48554b, 0x6f5547, 0x31343f, 0x778996, 0x514461]
export const PERSON_VARIANTS = 16
export function personSeed(id: string): number {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return hash >>> 0
}
const styles = Array.from({ length: 256 }, (_, n) => ({
  variant: n % 8 + (((n >>> 5) & 1) ? 8 : 0), skin: PERSON_SKIN[(n >>> 3) % PERSON_SKIN.length]!,
  trousers: trousers[(n >>> 2) % trousers.length]!, height: .92 + (n % 7) * .025,
  width: .9 + ((n >>> 3) % 6) * .045,
  female: Boolean((n >>> 5) & 1),
  skirt: Boolean((n >>> 5) & 1) && [0, 1, 2, 3, 5, 7].includes(n % 8),
}))
export const personStyle = (seed: number) => styles[seed & 255]!
export function visitorIsFemale(id: string): boolean {
  return personStyle(personSeed(id)).female
}

/** Shared, vertex-coloured parts: detail never creates a mesh per eye or shoe. */
const partCache = new Map<string, BufferGeometry>()
export function createPersonGeometry(part: 'body' | 'femaleBody' | 'head' | 'leg' | 'arm') {
  const cached = partCache.get(part)
  if (cached) return cached
  const k = new ModelKit(), white = 0xffffff
  if (part === 'femaleBody') {
    // Narrow waist, wider hips and a forward bust still read at crowd scale.
    k.box(0, -.018, 0, .108, .092, .092, white)
    k.box(0, .062, .016, .148, .078, .118, white)
    for (const x of [-.042, .042]) k.box(x, .052, .08, .078, .066, .07, white)
    for (const x of [-.088, .088]) k.box(x, .07, .004, .038, .058, .086, white)
    k.box(0, -.098, .006, .188, .072, .124, white)
    for (const x of [-.078, .078]) k.box(x, -.078, .02, .052, .042, .088, white)
    k.box(0, .122, .01, .046, .02, .054, 0x77767c)
    k.box(0, -.058, .008, .092, .012, .08, 0x6a5550)
  } else if (part === 'body') {
    k.box(0, -.035, 0, .145, .18, .105, white)
    k.box(0, .063, 0, .183, .10, .115, white)
    for (const x of [-.109, .109]) k.box(x, .065, 0, .053, .08, .1, white)
    k.box(0, .119, .01, .055, .015, .06, 0x666a70)
    k.box(0, -.126, 0, .145, .018, .107, 0x70747b)
  } else if (part === 'head') {
    k.box(0, 0, 0, .112, .128, .106, white)
    k.box(0, -.071, -.005, .05, .035, .054, white)
    for (const x of [-.061, .061]) k.box(x, -.008, 0, .014, .032, .03, white)
    k.box(0, -.004, .061, .022, .026, .023, white)
    for (const x of [-.028, .028]) k.box(x, .018, .055, .012, .014, .007, 0x25272d)
    k.box(0, -.038, .056, .027, .007, .007, 0x87554a)
  } else if (part === 'leg') {
    k.box(0, -.114, 0, .056, .228, .063, white)
    k.box(0, -.226, 0, .058, .025, .065, 0x707680)
    k.box(0, -.25, .02, .068, .046, .104, 0x272a30)
    k.box(0, -.269, .022, .071, .009, .108, 0xcbd0c7)
  } else {
    k.box(0, -.08, 0, .039, .16, .045, white)
    k.box(0, -.177, .006, .043, .041, .048, white)
    k.box(0, -.146, 0, .044, .014, .049, 0x376b66)
  }
  const geometry = k.finish(); partCache.set(part, geometry); return geometry
}

/** Modest body hints, tinted with the visitor's shirt or skin instance color. */
export function createNudeAnatomy(kind: 'breasts' | 'bust' | 'penis') {
  const cached = partCache.get(kind)
  if (cached) return cached
  const k = new ModelKit(), skin = 0xffffff, tip = 0xc48a78
  if (kind === 'breasts' || kind === 'bust') {
    for (const x of [-.043, .043]) {
      k.box(x, .05, .086, .08, .068, .072, skin)
      if (kind === 'breasts') k.box(x, .056, .12, .02, .018, .018, tip)
    }
    if (kind === 'bust') k.box(0, .046, .07, .05, .04, .05, skin)
  } else {
    k.box(0, -.112, .046, .024, .052, .04, skin)
    k.box(0, -.142, .054, .018, .024, .03, skin)
    k.box(0, -.154, .058, .014, .012, .02, tip)
  }
  const geometry = k.finish(); partCache.set(kind, geometry); return geometry
}

const detailCache = new Map<string, BufferGeometry>()
export function createPersonDetails(variant: number, clothing = true) {
  const key = `${variant}:${clothing}`, cached = detailCache.get(key)
  if (cached) return cached
  const female = variant >= 8
  variant %= 8
  const k = new ModelKit(), hair = [0x352b29, 0x644532, 0xb59050, 0x3d2925, 0xa35335, 0x332e30, 0xd8c7a2, 0x743b60][variant % 8]!
  if (female) {
    k.box(0, .686, 0, .138, .052, .126, hair)
    k.box(0, .624, -.058, .134, .118, .03, hair)
    k.box(0, .598, .052, .086, .028, .02, hair)
    if (variant === 1 || variant === 5) {
      k.box(0, .684, -.073, .073, .065, .055, hair)
      if (variant === 1) k.box(0, .587, -.087, .048, .15, .047, hair)
      k.box(0, .664, -.082, .056, .016, .056, 0xd7ae6c)
    } else {
      const length = variant === 3 ? .1 : variant === 6 ? .2 : .155
      for (const x of [-.064, .064]) k.box(x, .65-length/2, -.014, .032, length, .08, hair)
      k.box(0, .65-length/2, -.07, .128, length, .04, hair)
    }
    if (variant === 4) for (const x of [-.027, 0, .027]) k.box(x, .697, .036, .021, .022, .024, 0xe9c682)
    for (const x of [-.058, .058]) k.box(x, .598, .042, .012, .016, .012, 0xe2c26b)
    k.box(0, .548, .054, .046, .014, .016, variant % 2 ? 0x2b2430 : 0xe2c26b)
    if (clothing) {
      const neon = [0xce4d7a, 0x3c8f8a, 0xc45b2e, 0x6b4d93, 0xd4a24a, 0x2f6d9a, 0xb83d5a, 0x4a9b6e][variant]!
      const dark = 0x241c22
      if (variant === 0 || variant === 2 || variant === 5) {
        k.box(0, .268, .004, .176, .062, .122, neon)
        k.box(0, .214, .006, .208, .042, .138, neon)
        k.box(0, .186, .008, .226, .022, .15, neon)
      } else if (variant === 1 || variant === 3 || variant === 7) {
        k.box(0, .268, .006, .162, .05, .118, dark)
        k.box(0, .236, .008, .148, .028, .108, dark)
      }
      if (variant === 1 || variant === 7) {
        for (const x of [-.042, .042]) k.box(x, .448, .074, .07, .042, .058, neon)
        k.box(0, .438, .058, .028, .018, .036, neon)
        k.beam([-.04, .49, .05], [-.04, .438, .08], .008, 0xf2e2c4)
        k.beam([.04, .49, .05], [.04, .438, .08], .008, 0xf2e2c4)
      } else if (variant === 2 || variant === 5) {
        k.box(0, .452, .03, .118, .032, .1, neon)
        for (const x of [-.038, .038]) k.box(x, .438, .07, .066, .038, .05, neon)
      } else {
        k.box(0, .458, .02, .142, .048, .112, neon)
        k.box(0, .428, .026, .108, .018, .092, neon)
      }
      for (const x of [-.044, .044]) {
        k.box(x, .062, .022, .074, .08, .11, dark)
        k.box(x, .028, .036, .08, .028, .12, 0xe2c26b)
      }
    } else {
      k.beam([-.055, .47, .08], [.055, .34, .086], .007, 0xe2c26b)
      k.beam([.055, .47, .08], [-.055, .34, .086], .007, 0xe2c26b)
      k.box(0, .34, .09, .02, .02, .012, 0xe2c26b)
      for (const x of [-.044, .044]) {
        k.box(x, .058, .024, .076, .086, .114, 0x1e1820)
        k.box(x, .022, .04, .082, .026, .122, 0xe2c26b)
      }
    }
  } else {
    k.box(0, .674, -.008, .12, .035, .115, hair)
    k.box(0, .629, -.052, .117, .085, .018, hair)
    k.box(-.05, .653, .015, .023, .038, .09, hair)
    if (variant === 2 || variant === 6) {
    for (const x of [-.059, .059]) k.box(x, .58, -.018, .029, .14, .065, hair)
  } else if (variant === 1 || variant === 5) {
    const cap = variant === 1 ? 0x527e79 : 0xc97851
    k.box(0, .696, -.005, .132, .033, .122, cap)
    k.box(0, .676, .067, .14, .015, .065, cap)
  } else if (variant === 4) {
    k.box(0, .702, 0, .151, .018, .025, 0x363d49)
    for (const x of [-.075, .075]) k.box(x, .636, 0, .028, .078, .052, 0x4e9b9c)
  } else if (variant === 7) {
    for (let i = 0; i < 4; i++) k.box(0, .703 + (i % 2) * .008, -.04 + i * .027, .035, .045, .025, hair)
  }
  }
  if (!female && (variant === 0 || variant === 3 || variant === 5)) {
    k.box(0, .548, .058, .058, .042, .032, hair)
    k.box(0, .564, .062, .074, .016, .022, hair)
    for (const x of [-.029, .029]) k.box(x, .623, .064, .045, .025, .012, 0x242c35)
    k.box(0, .625, .065, .026, .009, .012, 0x242c35)
  }
  if (clothing && (!female || variant === 0 || variant === 3 || variant === 6)) {
    k.box(0, .433, .06, .049, .033, .008, variant % 2 ? 0xe8d9b0 : 0x85b6ac)
    k.beam([-.028, .511, .052], [0, .367, .064], .008, 0xe2c26b)
    k.beam([.028, .511, .052], [0, .367, .064], .008, 0xe2c26b)
    k.box(0, .357, .066, .027, .04, .008, 0xe5dfca)
    if (!female && (variant === 0 || variant === 3 || variant === 6)) {
      k.box(0, .398, -.087, .122, .156, .066, variant === 3 ? 0xa76048 : 0x425763)
      k.box(0, .35, -.126, .081, .048, .027, 0x33414a)
      for (const x of [-.062, .062]) k.box(x, .431, .061, .018, .15, .011, 0x333e47)
    }
  }
  const geometry = k.finish(); detailCache.set(key, geometry); return geometry
}

export function createPersonFigure(
  id: string,
  shirtColor: number,
  options: { nude?: boolean } = {},
): Group {
  const appearance = personStyle(personSeed(id))
  const nude = Boolean(options.nude)
  const skin = new MeshStandardMaterial({ color: appearance.skin, vertexColors: true, roughness: 0.9 })
  const shirt = new MeshStandardMaterial({
    color: nude ? appearance.skin : shirtColor,
    vertexColors: true,
    roughness: 0.85,
  })
  const pants = new MeshStandardMaterial({
    color: nude || appearance.skirt ? appearance.skin : appearance.trousers,
    vertexColors: true,
    roughness: 0.9,
  })
  const group = new Group()
  const shoulder = appearance.female ? .11 : .128
  const body = new Mesh(createPersonGeometry(appearance.female ? 'femaleBody' : 'body'), shirt)
  const head = new Mesh(createPersonGeometry('head'), skin)
  const leftLeg = new Mesh(createPersonGeometry('leg'), pants)
  const rightLeg = leftLeg.clone()
  const leftArm = new Mesh(createPersonGeometry('arm'), skin)
  const rightArm = leftArm.clone()
  body.position.y = .39
  head.position.y = .605
  leftLeg.position.set(-.044, .275, 0)
  rightLeg.position.set(.044, .275, 0)
  leftArm.position.set(-shoulder, .485, 0)
  rightArm.position.set(shoulder, .485, 0)
  leftArm.rotation.z = 1.15
  rightArm.rotation.z = -1.15
  group.add(leftLeg, rightLeg, body, head, leftArm, rightArm)
  group.add(new Mesh(createPersonDetails(appearance.variant, !nude), new MeshStandardMaterial({ vertexColors: true, roughness: .95 })))
  if (appearance.female) {
    const chest = new Mesh(createNudeAnatomy(nude ? 'breasts' : 'bust'), nude ? skin : shirt)
    chest.position.y = .39
    group.add(chest)
  } else if (nude) {
    const penis = new Mesh(createNudeAnatomy('penis'), skin)
    penis.position.y = .39
    group.add(penis)
  }
  group.scale.set(appearance.width, appearance.height, appearance.width)
  group.position.y = -.38
  return group
}

export class PersonDetailsView {
  readonly group = new Group()
  private batches: InstancedMesh[] = []
  private capacity = 0
  private geometries = [
    ...Array.from({length: PERSON_VARIANTS}, (_, i) => createPersonDetails(i, true)),
    ...Array.from({length: PERSON_VARIANTS}, (_, i) => createPersonDetails(i, false)),
  ]
  private material = new MeshStandardMaterial({vertexColors:true, roughness:.95})
  begin(count: number): void {
    if (count > this.capacity) {
      this.capacity = Math.max(32, count, this.capacity * 2)
      for (const mesh of this.batches) { this.group.remove(mesh); mesh.dispose() }
      this.batches = this.geometries.map(geometry => {
        const mesh = new InstancedMesh(geometry, this.material, this.capacity)
        mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false
        this.group.add(mesh); return mesh
      })
    }
    for (const batch of this.batches) batch.count = 0
  }
  place(variant: number, matrix: Matrix4, clothing = true): void {
    const batch = this.batches[variant + (clothing ? 0 : PERSON_VARIANTS)]!
    batch.setMatrixAt(batch.count++, matrix)
  }
  finish(): void { for (const batch of this.batches) batch.instanceMatrix.needsUpdate = true }
}
