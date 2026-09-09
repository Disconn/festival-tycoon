type QueueEntry<T> = {
  value: T
  key: string | number
  cost: number
  priority: number
}

class MinPriorityQueue<T> {
  private entries: QueueEntry<T>[] = []

  get size(): number {
    return this.entries.length
  }

  clear(): void {
    this.entries.length = 0
  }

  push(entry: QueueEntry<T>): void {
    this.entries.push(entry)
    let index = this.entries.length - 1
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.entries[parent]!.priority <= entry.priority) break
      this.entries[index] = this.entries[parent]!
      index = parent
    }
    this.entries[index] = entry
  }

  pop(): QueueEntry<T> | undefined {
    const first = this.entries[0]
    const last = this.entries.pop()
    if (!first || !last || this.entries.length === 0) return first
    let index = 0
    while (true) {
      const left = index * 2 + 1
      const right = left + 1
      if (left >= this.entries.length) break
      const child =
        right < this.entries.length &&
        this.entries[right]!.priority < this.entries[left]!.priority
          ? right
          : left
      if (this.entries[child]!.priority >= last.priority) break
      this.entries[index] = this.entries[child]!
      index = child
    }
    this.entries[index] = last
    return first
  }
}

export type WeightedPathOptions<T> = {
  start: T
  key: (value: T) => string | number
  isGoal: (value: T) => boolean
  neighbors: (value: T) => readonly T[]
  movementCost: (from: T, to: T) => number
  heuristic?: (value: T) => number
  maxCost?: number
  maxVisited?: number
}

export type PathScratch<T> = {
  queue: MinPriorityQueue<T>
  costs: Map<string | number, number>
  previous: Map<string | number, string | number | null>
  values: Map<string | number, T>
}

export { createSeededRng, hashStringSeed } from './rng'

export function createPathScratch<T>(): PathScratch<T> {
  return {
    queue: new MinPriorityQueue<T>(),
    costs: new Map(),
    previous: new Map(),
    values: new Map(),
  }
}

export function findWeightedPath<T>(
  options: WeightedPathOptions<T>,
  scratch?: PathScratch<T>,
): T[] | null {
  const startKey = options.key(options.start)
  if (options.isGoal(options.start)) return []

  const queue = scratch?.queue ?? new MinPriorityQueue<T>()
  const costs = scratch?.costs ?? new Map<string | number, number>()
  const previous =
    scratch?.previous ?? new Map<string | number, string | number | null>()
  const values = scratch?.values ?? new Map<string | number, T>()
  if (scratch) {
    queue.clear()
    costs.clear()
    previous.clear()
    values.clear()
  }
  costs.set(startKey, 0)
  previous.set(startKey, null)
  values.set(startKey, options.start)
  queue.push({
    value: options.start,
    key: startKey,
    cost: 0,
    priority: options.heuristic?.(options.start) ?? 0,
  })

  let visited = 0
  let goalKey: string | number | null = null
  while (queue.size > 0) {
    const current = queue.pop()
    if (!current || current.cost !== costs.get(current.key)) continue
    if (options.isGoal(current.value)) {
      goalKey = current.key
      break
    }
    if (++visited > (options.maxVisited ?? Number.POSITIVE_INFINITY)) return null
    for (const neighbor of options.neighbors(current.value)) {
      const neighborKey = options.key(neighbor)
      const movementCost = Math.max(0.001, options.movementCost(current.value, neighbor))
      const nextCost = current.cost + movementCost
      if (
        nextCost >= (options.maxCost ?? Number.POSITIVE_INFINITY) ||
        nextCost >= (costs.get(neighborKey) ?? Number.POSITIVE_INFINITY)
      ) {
        continue
      }
      costs.set(neighborKey, nextCost)
      previous.set(neighborKey, current.key)
      values.set(neighborKey, neighbor)
      queue.push({
        value: neighbor,
        key: neighborKey,
        cost: nextCost,
        priority: nextCost + (options.heuristic?.(neighbor) ?? 0),
      })
    }
  }

  if (goalKey === null) return null
  const path: T[] = []
  let cursor: string | number | null = goalKey
  while (cursor !== null && cursor !== startKey) {
    const value = values.get(cursor)
    if (value === undefined) return null
    path.push(value)
    cursor = previous.get(cursor) ?? null
  }
  return path.reverse()
}
