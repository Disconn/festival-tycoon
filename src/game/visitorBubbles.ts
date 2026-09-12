import { SIMULATION_CONFIG } from './simulationConfig'

type BubbleVisitor = {
  state: string
  emotion: string
  needs: { hunger: number; toilet: number; fun: number; energy: number }
  isDancing: boolean
  isConversing: boolean
  crowding: number
  crowdStress: number
  isPanicking: boolean
  localPartyMood: number
}

export type VisitorBubbleKind =
  | 'talking'
  | 'dancing'
  | 'sleeping'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'crushed'
  | 'panic'

export function visitorNeedAverage(visitor: Pick<BubbleVisitor, 'needs'>): number {
  const values = Object.values(visitor.needs)
  return values.reduce((total, value) => total + value, 0) / values.length
}

export function isVeryHappy(visitor: Pick<BubbleVisitor, 'emotion' | 'needs'>): boolean {
  return visitor.emotion === 'excited' ||
    (visitor.emotion === 'happy' && visitorNeedAverage(visitor) >= 88)
}

export function isVeryUnhappy(visitor: Pick<BubbleVisitor, 'emotion'>): boolean {
  return visitor.emotion === 'sad' || visitor.emotion === 'angry'
}

export function visitorBubbleKind(visitor: BubbleVisitor): VisitorBubbleKind | null {
  const crowd = SIMULATION_CONFIG.crowding
  if (visitor.isPanicking || visitor.state === 'panicking') return 'panic'
  const dramaticCrowding =
    visitor.crowding >= crowd.crushThreshold &&
    visitor.crowdStress >= crowd.crushStress
  if (dramaticCrowding) {
    return 'crushed'
  }
  if (visitor.state === 'sleeping') return 'sleeping'
  if (visitor.state === 'socializing' || visitor.isConversing) return 'talking'
  if (visitor.isDancing || visitor.state === 'partying') return 'dancing'
  const enjoyingFestival =
    visitor.crowding >= crowd.pressureStart &&
    visitor.needs.fun >= 85 &&
    visitor.localPartyMood >= 70 &&
    !['vomiting', 'injured', 'medical', 'medical-transport', 'leaving'].includes(visitor.state)
  if (enjoyingFestival) return 'happy'
  if (visitor.emotion === 'angry') return 'angry'
  if (visitor.emotion === 'sad') return 'sad'
  if (visitor.emotion === 'excited') return 'excited'
  if (isVeryHappy(visitor)) return 'happy'
  return null
}

export function crowdCellsTouch(
  a: { cellX: number; cellZ: number; cellElevation: number },
  b: { cellX: number; cellZ: number; cellElevation: number },
): boolean {
  return Math.abs(a.cellX - b.cellX) + Math.abs(a.cellZ - b.cellZ) <= 1 &&
    a.cellElevation === b.cellElevation
}

export function denseClusterSize(
  visitor: { cellX: number; cellZ: number; cellElevation: number },
  crowdingAt: (x: number, z: number, elevation: number) => number,
  threshold: number,
): number {
  let count = 0
  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
      if (crowdingAt(visitor.cellX + offsetX, visitor.cellZ + offsetZ, visitor.cellElevation) >= threshold) {
        count += 1
      }
    }
  }
  return count
}

export function neighborhoodPeople(
  visitor: { cellX: number; cellZ: number; cellElevation: number },
  peopleAt: (x: number, z: number, elevation: number) => number,
): number {
  let count = 0
  for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
    for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
      count += peopleAt(visitor.cellX + offsetX, visitor.cellZ + offsetZ, visitor.cellElevation)
    }
  }
  return count
}

/** Only a packed multi-tile crush can ignite; a single jammed cell never starts a mass panic. */
export function spontaneousPanicChance(
  crowding: number,
  crowdStress: number,
  nearbyPeople: number,
  denseCells: number,
  clusterPeople: number,
): number {
  const crowd = SIMULATION_CONFIG.crowding
  if (
    crowding < crowd.denseThreshold ||
    crowdStress < crowd.panicMinStress ||
    denseCells < crowd.panicMinDenseCells ||
    clusterPeople < crowd.panicMinClusterPeople
  ) {
    return 0
  }
  const intensity = Math.min(1, (crowding - crowd.denseThreshold) / Math.max(1, 100 - crowd.denseThreshold))
  return crowd.panicBaseChancePerMinute *
    intensity * intensity *
    (1 + crowdStress / 140) *
    (1 + Math.min(crowd.panicNearbyCap, nearbyPeople) / crowd.panicNearbyScale)
}

export function panicSpreadChance(
  crowding: number,
  nearbyPanicking: number,
  denseCells: number,
): number {
  const crowd = SIMULATION_CONFIG.crowding
  if (
    crowding < crowd.denseThreshold ||
    nearbyPanicking <= 0 ||
    denseCells < crowd.panicMinSpreadCells
  ) {
    return 0
  }
  const intensity = Math.min(1, (crowding - crowd.denseThreshold) / Math.max(1, 100 - crowd.denseThreshold))
  return Math.min(
    crowd.panicSpreadMaxChance,
    crowd.panicSpreadChancePerMinute * (0.55 + intensity * 0.45) * (1 + Math.min(6, nearbyPanicking - 1) * 0.12),
  )
}
