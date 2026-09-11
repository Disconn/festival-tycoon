import assert from 'node:assert/strict'
import { Group, InstancedMesh, Mesh, Vector3 } from 'three'
import { GameState } from '../src/game/GameState'
import { SIMULATION_CONFIG } from '../src/game/simulationConfig'
import { createRetroBuilding, batchRetroBuildings, DETAILED_BUILDINGS } from '../src/view/retroBuildings'

export function testPerformanceGuards(fixture: (count?: number) => GameState): void {
  const game = fixture(100), internal = game as any
  const visitor = game.snapshot.visitors[0]!
  const camp = internal.camping
  const installations = Array.from({ length: 335 }, (_, i) => ({ id: `gathering-${i}`, cell: { x: i, z: 0, elevation: 0 }, kind: 'chairs', ownerId: '', contributorIds: ['owner'] }))
  game.snapshot.campInstallations = installations as any
  const occupied = game.snapshot.visitors[1]!
  occupied.state = 'socializing'; occupied.campActivityTarget = { x: 0, z: 0, elevation: 0 }; occupied.campActivitySlot = 0
  let pathCalls = 0, offeredGoals: any[] = []
  const oldFind = internal.findPath
  internal.findPath = (_start: any, goals: any[]) => { pathCalls++; offeredGoals = goals; return [goals.at(-1)] }
  const destination = camp.findRouteToGathering(visitor)
  assert.equal(pathCalls, 1, '335 camp gathering candidates require only one search')
  assert.equal(offeredGoals.length, 334, 'occupied seats are excluded before routing')
  assert.equal(destination.target.x, 334, 'a reachable destination outside the nearest few stays available')
  internal.findPath = oldFind

  internal.processingSimulationStep = true
  internal.decisionBudget = SIMULATION_CONFIG.pathfinding.decisionsPerTick
  internal.decidedThisTick.clear()
  internal.visitorsAwaitingDecision.clear()
  // Exhausted visitors produce real departure routes; no artificial slow timers.
  game.snapshot.visitors.forEach(v => { v.state = 'exploring'; v.route = []; v.targetId = null; v.needs.energy = 0; v.pendingWaste = 0 })
  for (const v of game.snapshot.visitors) internal.decideNextAction(v)
  assert.equal(internal.decidedThisTick.size, SIMULATION_CONFIG.pathfinding.decisionsPerTick)
  assert.equal(internal.visitorsAwaitingDecision.size, 100 - SIMULATION_CONFIG.pathfinding.decisionsPerTick)
  for (let i = 0; i < 7; i++) {
    internal.decisionBudget = SIMULATION_CONFIG.pathfinding.decisionsPerTick; internal.decidedThisTick.clear()
    internal.flushVisitorDecisions(SIMULATION_CONFIG.pathfinding.decisionsPerTick)
  }
  assert.equal(internal.visitorsAwaitingDecision.size, 0, 'deferred decisions eventually drain')
  internal.processingSimulationStep = false

  const paths = fixture(0), navigation = paths as any
  const start = { x: 2, z: -20, elevation: 0 }, goal = { x: 4, z: -20, elevation: 0 }
  assert.ok(navigation.findPath(start, [goal]))
  const cached = [...navigation.pedestrianPathCache.values()][0]
  navigation.updateCrowdingAndMotivation(2)
  assert.ok([...navigation.pedestrianPathCache.values()].includes(cached), 'crowd updates do not flush every route together')
  paths.snapshot.simTick += 90
  navigation.findPath(start, [goal])
  assert.ok(![...navigation.pedestrianPathCache.values()].includes(cached), 'costs get reconsidered after bounded cache lifetime')
  const beforeRebuild = [...navigation.pedestrianPathCache.values()][0]
  paths.placePathSegment(5, -20, 0)
  navigation.findPath(start, [goal])
  assert.ok(![...navigation.pedestrianPathCache.values()].includes(beforeRebuild), 'new construction invalidates old routes immediately')

  const source = new Group()
  for (const kind of DETAILED_BUILDINGS) {
    const a = createRetroBuilding(kind)!, b = createRetroBuilding(kind)!
    b.position.set(3, 2, -1); b.rotation.y = Math.PI / 2
    source.add(a, b)
    const mesh = a.children[0] as Mesh
    assert.equal(a.children.length, 1, `${kind}: static details must be merged`)
    assert.ok(mesh.geometry.getAttribute('color'))
    assert.ok(mesh.geometry.getAttribute('position').count < 5000, `${kind}: geometry budget`)
    assert.equal(mesh.geometry, (b.children[0] as Mesh).geometry, 'instances share geometry')
  }
  const batches = batchRetroBuildings(source)
  assert.equal(batches.children.length, DETAILED_BUILDINGS.length, 'one draw per asset kind, not per detail')
  for (const child of batches.children) {
    const batch = child as InstancedMesh
    assert.equal(batch.count, 2)
    assert.ok(batch.boundingSphere!.containsPoint(new Vector3(3, 2, -1)))
  }
  console.log('PASS deterministic decision budget, camp route bound, cache refresh and detailed asset batching')
}
