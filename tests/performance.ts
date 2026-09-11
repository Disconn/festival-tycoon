import { readFileSync, readdirSync } from 'node:fs'
import { GameState } from '../src/game/GameState'

const requested = process.argv[2] ?? 'rtest3'
let raw: string
if (requested.endsWith('.json')) raw = readFileSync(requested, 'utf8')
else {
  const slot = readdirSync('saves').filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(readFileSync(`saves/${file}`, 'utf8'))).find(slot => slot.name === requested)
  if (!slot) throw new Error(`Save not found: ${requested}. Pass a save name or JSON path.`)
  raw = slot.snapshot
}
const parsed = JSON.parse(raw)
raw = typeof parsed.snapshot === 'string' ? parsed.snapshot : raw
const steps = Number(process.argv[3] ?? 120)
for (const speed of [1, 2, 3]) {
  const game = GameState.fromJSON(raw)!
  if (!game) throw new Error('Invalid save')
  game.setSpeed(speed)
  const totals = new Map<string, { ms: number, calls: number }>()
  const slowPaths = new Map<string, { ms: number, calls: number }>()
  if (process.env.PROFILE_METHODS) for (const name of ['walkVisitors', 'updateVisitors', 'flushVisitorDecisions', 'updateCrowdingAndMotivation', 'updateAtmosphere', 'updateStaff', 'updateLogistics', 'reviewVisitorRoutes', 'refreshPedestrianCongestion', 'findPath', 'rebuildPedestrianNav', 'tryVisitConcert', 'ensurePedestrianNav', 'decideNextAction', 'tryDisposeWaste', 'findReachableFacility', 'findBenchDestination', 'findPartyDestination', 'findLeisureDestination', 'beginVisitorDeparture', 'ensureExitRoute', 'enforceDayPlan']) {
    const target = game as any
    const original = target[name]
    if (!original) continue
    target[name] = function (...args: any[]) {
      const start = performance.now()
      try { return original.apply(this, args) }
      finally {
        const ms = performance.now() - start
        const record = totals.get(name) ?? { ms: 0, calls: 0 }; record.ms += ms; record.calls++; totals.set(name, record)
        if (name === 'findPath' && ms > 10) {
          const caller = new Error().stack?.split('\n').slice(2, 5).join(' ') ?? ''
          const entry = slowPaths.get(caller) ?? { ms: 0, calls: 0 }; entry.ms += ms; entry.calls++; slowPaths.set(caller, entry)
        }
      }
    }
  }
  const times: number[] = []
  const startTick = game.snapshot.simTick
  const start = performance.now()
  for (let i = 0; i < steps; i++) { const t = performance.now(); game.tick(.1); times.push(performance.now() - t) }
  const elapsed = performance.now() - start
  times.sort((a, b) => a - b)
  console.log(JSON.stringify({ save: requested, speed: [0, 1, 3, 8][speed], visitors: game.snapshot.visitors.length, ticks: game.snapshot.simTick - startTick, ms: Math.round(elapsed), median: times[Math.floor(steps * .5)]?.toFixed(2), p95: times[Math.floor(steps * .95)]?.toFixed(2), max: times.at(-1)?.toFixed(2), methods: Object.fromEntries([...totals].sort((a, b) => b[1].ms - a[1].ms)) }))
  if (slowPaths.size) console.log('Slow route callers', Object.fromEntries(slowPaths))
}

