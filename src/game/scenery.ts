import type { BuildingKind } from './catalog'

export const SCENERY_KINDS = ['tree', 'hedge', 'shrub', 'flowerbed', 'planter', 'rock', 'statue', 'banner', 'bunting', 'stringLights', 'hayBale', 'parasol', 'picnicTable', 'festivalSign'] as const
export function isScenery(kind: string): boolean { return (SCENERY_KINDS as readonly string[]).includes(kind) }
export function isEdgeScenery(kind: string): boolean { return kind === 'hedge' || kind === 'banner' || kind === 'bunting' || kind === 'stringLights' }
export type SceneryObject = { kind: BuildingKind; rotation: number; decorationSlot?: number }

/** Slots are absolute map positions. Rotation changes orientation, not save coordinates. */
export function scenerySlot(kind: string, localX = .25, localZ = .25, rotation = 0): number | undefined {
  if (!isScenery(kind)) return undefined
  if (!isEdgeScenery(kind)) return (localX >= .5 ? 1 : 0) + (localZ >= .5 ? 2 : 0)
  const x = localX - .5, z = localZ - .5
  const side = Math.abs(x) > Math.abs(z) ? x > 0 ? 1 : 3 : z > 0 ? 0 : 2
  return (side + rotation) % 4
}

export function sceneryTransform(item: SceneryObject): { x: number; z: number; rotation: number; sx: number; sy: number; sz: number } {
  const slot = item.decorationSlot
  if (slot === undefined || !isScenery(item.kind)) return { x: .5, z: .5, rotation: item.rotation, sx: 1, sy: 1, sz: 1 }
  if (isEdgeScenery(item.kind)) {
    const angle = slot * Math.PI / 2
    return { x: .5 + Math.sin(angle) * .39, z: .5 + Math.cos(angle) * .39, rotation: slot, sx: 1, sy: 1, sz: .55 }
  }
  return { x: slot % 2 ? .75 : .25, z: slot >= 2 ? .75 : .25, rotation: item.rotation, sx: .46, sy: item.kind === 'tree' ? .8 : 1, sz: .46 }
}

export function sceneryOverlaps(a: SceneryObject, b: SceneryObject): boolean {
  const smallA = isScenery(a.kind) && a.decorationSlot !== undefined
  const smallB = isScenery(b.kind) && b.decorationSlot !== undefined
  if (!smallA && !smallB) return true
  if (a.kind === 'path' && smallB && isEdgeScenery(b.kind) || b.kind === 'path' && smallA && isEdgeScenery(a.kind)) return false
  if (!smallA || !smallB) return true
  if (isEdgeScenery(a.kind) && isEdgeScenery(b.kind)) return a.decorationSlot === b.decorationSlot
  if (!isEdgeScenery(a.kind) && !isEdgeScenery(b.kind)) return a.decorationSlot === b.decorationSlot
  const edge = isEdgeScenery(a.kind) ? a : b, point = edge === a ? b : a
  const p = sceneryTransform(point)
  return edge.decorationSlot === 0 ? p.z > .5 : edge.decorationSlot === 1 ? p.x > .5 : edge.decorationSlot === 2 ? p.z < .5 : p.x < .5
}
