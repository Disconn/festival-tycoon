export type RngSource = {
  next(): number
  nextInt(max: number): number
  range(min: number, max: number): number
  chance(probability: number): boolean
  pick<T>(items: readonly T[]): T | undefined
  shuffle<T>(items: readonly T[]): T[]
  getState(): number
  setState(state: number): void
}

export function hashStringSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function visitorLooksFemale(id: string): boolean {
  return Boolean(((hashStringSeed(id) & 255) >>> 5) & 1)
}

export function rollsBungeeNude(id: string, roll: number, chance = 0.1): boolean {
  return visitorLooksFemale(id) && roll < chance
}

export class DeterministicRng implements RngSource {
  private state: number

  constructor(seed = 1) {
    this.state = seed >>> 0 || 1
  }

  next(): number {
    this.state += 0x6d2b79f5
    let next = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }

  nextInt(max: number): number {
    if (max <= 0) return 0
    return Math.floor(this.next() * max)
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined
    return items[this.nextInt(items.length)]
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = this.nextInt(index + 1)
      const current = copy[index]!
      copy[index] = copy[swap]!
      copy[swap] = current
    }
    return copy
  }

  getState(): number {
    return this.state >>> 0
  }

  setState(state: number): void {
    this.state = state >>> 0 || 1
  }

  fork(salt: number): DeterministicRng {
    return new DeterministicRng((this.state ^ (salt >>> 0)) >>> 0 || 1)
  }
}

export function createSeededRng(seed: number): () => number {
  const rng = new DeterministicRng(seed)
  return () => rng.next()
}
