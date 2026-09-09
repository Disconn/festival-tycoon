import type { WorldSnapshot } from './protocol'

/** Reliable, ordered WebSocket updates; unchanged world sections stay on the client. */
export class WorldUpdates {
  private previous = new Map<string, string>()
  private visitors = new Map<string, Map<string, string>>()

  reset(): void { this.previous.clear(); this.visitors.clear() }

  encode(world: WorldSnapshot, full = false): string {
    const fields: string[] = []
    const patches: string[] = []
    const present = new Set(world.visitors.map(visitor => visitor.id))
    const removed = [...this.visitors.keys()].filter(id => !present.has(id))
    for (const id of removed) this.visitors.delete(id)
    for (const visitor of world.visitors) {
      const previous = this.visitors.get(visitor.id) ?? new Map<string, string>()
      const changes: string[] = []
      for (const [key, value] of Object.entries(visitor)) {
        const encoded = JSON.stringify(value)
        if (encoded === undefined) continue
        if (previous.get(key) !== encoded) changes.push(`${JSON.stringify(key)}:${encoded}`)
        previous.set(key, encoded)
      }
      this.visitors.set(visitor.id, previous)
      if (changes.length) patches.push(`{"id":${JSON.stringify(visitor.id)},"changes":{${changes.join(',')}}}`)
    }
    for (const [key, value] of Object.entries(world)) {
      if (key === 'visitors' && !full) continue
      const encoded = JSON.stringify(value)
      if (full || this.previous.get(key) !== encoded) {
        fields.push(`${JSON.stringify(key)}:${encoded}`)
        this.previous.set(key, encoded)
      }
    }
    return full
      ? `{"t":"sync","world":{${fields.join(',')}}}`
      : `{"t":"state","world":{${fields.join(',')}},"visitors":[${patches.join(',')}],"removed":${JSON.stringify(removed)}}`
  }
}
