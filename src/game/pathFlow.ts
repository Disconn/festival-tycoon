export type FlowPath = {
  pathType?: 'normal' | 'queue'
  flowDirection?: number | null
}

export function normalizeFlowDirection(direction: number | null): number | null {
  if (direction === null) return null
  return ((Math.round(direction) % 4) + 4) % 4
}

export function allowsPathFlow(
  from: FlowPath | undefined,
  to: FlowPath,
  movementDirection: number,
): boolean {
  const direction = normalizeFlowDirection(movementDirection)
  if (
    from?.pathType === 'normal' &&
    from.flowDirection != null &&
    normalizeFlowDirection(from.flowDirection) !== direction
  ) {
    return false
  }
  if (
    to.pathType === 'normal' &&
    to.flowDirection != null &&
    normalizeFlowDirection(to.flowDirection) !== direction
  ) {
    return false
  }
  return true
}
