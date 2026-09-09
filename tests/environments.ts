import assert from 'node:assert/strict'
import { ENVIRONMENTS } from '../src/game/environments'
import type { Environment } from '../src/game/environments'
import { normalizeScenarioSettings } from '../src/game/scenario'
import { GameState } from '../src/game/GameState'
import type { GameSnapshot } from '../src/game/GameState'
import { generateTerrain, getTerrainHeight } from '../src/game/terrain'
import { DeterministicRng } from '../src/game/rng'
import { groundInfo } from '../src/game/ground'
import { packWorld } from '../src/net/codec'
import { WorldUpdates } from '../src/net/worldUpdates'

export function testEnvironments() {
  const defaults = normalizeScenarioSettings()
  assert.equal(defaults.environment, 'farmland')
  assert.equal(defaults.unevenness, .5)
  assert.equal(normalizeScenarioSettings({ unevenness: -5 }).unevenness, 0)
  assert.equal(normalizeScenarioSettings({ unevenness: 8 }).unevenness, 1)
  assert.equal(normalizeScenarioSettings({ environment: 'invalid' as Environment }).environment, 'farmland')
  for (const environment of Object.keys(ENVIRONMENTS) as Environment[]) {
    const settings = normalizeScenarioSettings({ environment, unevenness: 0, worldSize: 32 })
    const game = GameState.startNew(settings), s = game.snapshot as GameSnapshot
    assert.deepEqual(s.terrain.heights, {}, `${environment}: 0% is completely flat`)
    assert.deepEqual(GameState.startNew(settings).snapshot.terrain, s.terrain)
    const low = generateTerrain(32, new DeterministicRng(123), .3, environment)
    const high = generateTerrain(32, new DeterministicRng(123), 1, environment)
    const magnitude = (h: Record<string, number>) => Object.values(h).reduce((sum, v) => sum + Math.abs(v), 0)
    assert.ok(magnitude(high.heights) > magnitude(low.heights), `${environment}: higher setting creates stronger relief`)
    assert.deepEqual(high, generateTerrain(32, new DeterministicRng(123), 1, environment))
    for (let x = -16; x < 15; x++) for (let z = -16; z < 15; z++) {
      assert.ok(Math.abs(getTerrainHeight(high, x, z) - getTerrainHeight(high, x + 1, z)) <= 1)
      assert.ok(Math.abs(getTerrainHeight(high, x, z) - getTerrainHeight(high, x, z + 1)) <= 1)
    }
    assert.equal(getTerrainHeight(high, 0, -16), 0, 'road entry stays flat')
    assert.equal(getTerrainHeight(high, 3, -16), 0, 'pedestrian entry stays flat')
    s.festival.wetness = 100
    const ground = groundInfo(s, 0, 0)
    if (environment === 'urban') { assert.equal(ground.bearing, 3); assert.equal(ground.drained, true); assert.equal(ground.speed, 1.15) }
    if (environment === 'desert') { assert.equal(ground.type, 'sand'); assert.equal(s.buildings.filter(b => b.kind === 'tree').length, 0); assert.ok(Object.values(high.heights).every(v => v >= 0)) }
    if (environment === 'grassland') assert.equal(ground.type, 'grass')
    if (environment === 'farmland') { assert.equal(ground.type, 'clay'); assert.ok(ground.speed < .4) }
    const client = new GameState(), updates = new WorldUpdates()
    client.applyNetworkWorld(JSON.parse(updates.encode(packWorld(s), true)).world)
    assert.deepEqual(client.snapshot.scenario, s.scenario, 'multiplayer preserves the chosen environment')
    assert.deepEqual(new GameState(structuredClone(s)).snapshot.terrain, s.terrain, 'loading never regenerates existing terrain')
  }
  const legacy = structuredClone(new GameState().snapshot) as any
  delete legacy.scenario.environment; delete legacy.scenario.unevenness
  const migrated = new GameState(legacy)
  assert.equal(migrated.snapshot.scenario.environment, 'farmland')
  assert.deepEqual(migrated.snapshot.terrain, legacy.terrain)
  console.log('PASS four environments, flat/rough terrain, deterministic generation, slope limits, ground properties, legacy saves and network sync')
}
