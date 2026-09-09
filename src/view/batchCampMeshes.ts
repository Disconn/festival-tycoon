import { Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial } from 'three'

/** Batch repeated opaque camp parts while keeping their transforms and individual colors. */
export function batchCampMeshes(source: Group): Group {
  source.updateWorldMatrix(true, true)
  const inverse = new Matrix4().copy(source.matrixWorld).invert()
  const buckets = new Map<string, Mesh[]>()
  source.traverse(object => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial) || object.material.map || object.material.transparent) return
    const material = object.material
    const key = JSON.stringify([(object.geometry as any).parameters, object.geometry.type, material.side, material.roughness, material.metalness, object.castShadow])
    const bucket = buckets.get(key) ?? []
    bucket.push(object); buckets.set(key, bucket)
    object.visible = false
  })
  const result = new Group()
  const transform = new Matrix4()
  for (const parts of buckets.values()) {
    const first = parts[0]!
    const material = (first.material as MeshStandardMaterial).clone()
    material.color.setHex(0xffffff)
    const batch = new InstancedMesh(first.geometry.clone(), material, parts.length)
    batch.castShadow = first.castShadow
    batch.frustumCulled = false
    parts.forEach((part, index) => {
      transform.multiplyMatrices(inverse, part.matrixWorld)
      batch.setMatrixAt(index, transform)
      batch.setColorAt(index, (part.material as MeshStandardMaterial).color)
    })
    result.add(batch)
  }
  return result
}
