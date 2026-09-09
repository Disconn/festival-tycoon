import {
  Material,
  Object3D,
  Texture,
} from 'three'

export function disposeObject3D(
  root: Object3D,
  disposeTextures = true,
): void {
  const geometries = new Set<{ dispose: () => void; userData?: { shared?: boolean } }>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()

  root.traverse((object) => {
    const geometry = (object as Object3D & {
      geometry?: { dispose: () => void; userData?: { shared?: boolean } }
    }).geometry
    if (geometry && !geometry.userData?.shared) geometries.add(geometry)

    const objectMaterial = (object as Object3D & {
      material?: Material | Material[]
    }).material
    if (!objectMaterial) return
    const objectMaterials = Array.isArray(objectMaterial)
      ? objectMaterial
      : [objectMaterial]
    objectMaterials.forEach((material) => {
      if (material.userData.shared) return
      materials.add(material)
      if (!disposeTextures) return
      Object.values(material).forEach((value) => {
        if (value instanceof Texture) textures.add(value)
      })
    })
  })

  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  geometries.forEach((geometry) => geometry.dispose())
}

export function disposeChildren(
  root: Object3D,
  disposeTextures = true,
): void {
  root.children.slice().forEach((child) => {
    root.remove(child)
    disposeObject3D(child, disposeTextures)
  })
}
