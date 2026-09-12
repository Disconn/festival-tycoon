import assert from 'node:assert/strict'
import { InstancedMesh, Matrix4 } from 'three'
import { visitorLooksFemale } from '../src/game/rng'
import { createNudeAnatomy, createPersonDetails, createPersonGeometry, PERSON_VARIANTS, PersonDetailsView, personSeed, personStyle, visitorIsFemale } from '../src/view/pixelPeople'

export function testPixelPeople(): void {
  const parts = ['body', 'head', 'leg', 'arm', 'femaleBody'] as const
  const vertices = parts.map(part => {
    const geometry = createPersonGeometry(part)
    assert.equal(createPersonGeometry(part), geometry, 'staff and guests share geometry')
    assert.equal(geometry.userData.shared, true)
    assert.equal(geometry.getAttribute('color').count, geometry.getAttribute('position').count)
    geometry.computeBoundingBox()
    assert.ok(Number.isFinite(geometry.boundingBox!.min.y))
    return geometry.getAttribute('position').count
  })
  const leg = createPersonGeometry('leg').boundingBox!
  assert.ok(leg.max.y <= .001 && leg.min.y > -.29, 'leg pivots at hip with feet on ground')
  for (let variant = 0; variant < PERSON_VARIANTS; variant++) {
    const details = createPersonDetails(variant)
    const total = vertices[variant >= 8 ? 4 : 0]! + vertices[1]! + 2 * vertices[2]! + 2 * vertices[3]! + details.getAttribute('position').count + (variant >= 8 ? createNudeAnatomy('bust').getAttribute('position').count : 0)
    assert.ok(total < 1600, `${variant}: bounded vertex budget for dense crowds (${total})`)
    assert.equal(details, createPersonDetails(variant))
  }
  const ids = Array.from({length:1000}, (_,i)=>`visitor-${i}`)
  const before = new Map(ids.map(id=>[id,personStyle(personSeed(id))]))
  for (const id of JSON.parse(JSON.stringify(ids)).reverse()) assert.deepEqual(personStyle(personSeed(id)), before.get(id), 'save/reorder cannot change a person')
  assert.equal(new Set([...before.values()].map(s=>s.skin)).size,6)
  assert.equal(new Set([...before.values()].map(s=>s.variant)).size,PERSON_VARIANTS)
  for (const style of before.values()) {
    assert.equal(style.variant >= 8, style.female, 'hair and clothing match the persistent body type')
    if (style.skirt) assert.ok(style.female)
  }
  assert.ok([...before.values()].some(s=>s.female && s.skirt))
  assert.ok([...before.values()].some(s=>s.female && !s.skirt), 'women also wear trousers')
  const femaleBody=createPersonGeometry('femaleBody')
  femaleBody.computeBoundingBox()
  createPersonGeometry('body').computeBoundingBox()
  assert.ok(femaleBody.boundingBox!.max.z > createPersonGeometry('body').boundingBox!.max.z, 'female torso keeps a visible bust')
  assert.notDeepEqual(femaleBody.getAttribute('position').array,createPersonGeometry('body').getAttribute('position').array,'distinct tailored silhouette')
  assert.notEqual(createPersonDetails(0), createPersonDetails(8), 'women do not reuse male facial hair')
  assert.equal(new Set([...before.values()].map(s=>s.female)).size,2, 'guests keep ordinary female and male bodies')
  for (const id of ids) assert.equal(visitorIsFemale(id), visitorLooksFemale(id))
  for (const kind of ['breasts', 'bust', 'penis'] as const) {
    const anatomy = createNudeAnatomy(kind)
    assert.equal(createNudeAnatomy(kind), anatomy)
    assert.ok(anatomy.getAttribute('position').count < 120, `${kind}: hinted, not a separate character mesh`)
  }
  const view = new PersonDetailsView(), matrix = new Matrix4()
  for (const count of [10, 3000, 10000, 2, 0]) {
    view.begin(Math.max(1,count))
    for (let i=0;i<count;i++) view.place(personStyle(personSeed(`visitor-${i}`)).variant, matrix.makeTranslation(i,0,0), i%3!==0)
    view.finish()
    assert.equal(view.group.children.length,PERSON_VARIANTS * 2, 'clothed and bare accessories stay bounded independently of population')
    assert.equal(view.group.children.reduce((n,c)=>n+(c as InstancedMesh).count,0),count, 'hidden/departed visitors leave no floating accessories')
  }
  console.log('PASS pixel people: shared geometry, bounded crowd batches, persistent appearance, varied skin/outfits and hip pivots')
}
