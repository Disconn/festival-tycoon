import assert from 'node:assert/strict'
import { Group, InstancedMesh, Mesh, Vector3 } from 'three'
import { GameState } from '../src/game/GameState'
import { SIMULATION_CONFIG } from '../src/game/simulationConfig'
import { createRetroBuilding, batchRetroBuildings, DETAILED_BUILDINGS } from '../src/view/retroBuildings'
import { FestivalLightsView } from '../src/view/FestivalLightsView'
import { createAttractionAccess } from '../src/view/attractionAccess'
import { disposeObject3D } from '../src/view/disposeObject3D'

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
  const lightGame = fixture(1), lightSnapshot = lightGame.snapshot
  const accessModels = new Group()
  for (const theme of ['carousel', 'bungee', 'coaster'] as const) for (const kind of ['entrance', 'exit'] as const) {
    const a = createAttractionAccess(kind, theme), b = createAttractionAccess(kind, theme)
    const mesh = a.children[0] as Mesh
    assert.equal(a.children.length, 1, 'access details are merged into one mesh')
    assert.equal(mesh.geometry, (b.children[0] as Mesh).geometry, 'gates reuse geometry')
    assert.ok(mesh.geometry.getAttribute('position').count < 5000, 'access geometry stays bounded')
    mesh.geometry.computeBoundingBox()
    assert.ok(mesh.geometry.boundingBox!.min.x >= -.5 && mesh.geometry.boundingBox!.max.x <= .5, 'gate stays inside its tile')
    const preview = createAttractionAccess(kind, theme, true)
    assert.notEqual((preview.children[0] as Mesh).material, mesh.material, 'preview tint cannot recolor built gates')
    let sharedDisposed = false
    mesh.geometry.addEventListener('dispose', () => { sharedDisposed = true })
    disposeObject3D(preview)
    assert.equal(sharedDisposed, false, 'replacing previews preserves cached geometry')
    accessModels.add(a, b)
  }
  assert.equal(batchRetroBuildings(accessModels).children.length, 6, 'gate draw calls depend on theme, not gate count')
  lightSnapshot.minute = 23 * 60
  lightSnapshot.power.poweredBuildingIds = ['unpowered-food-light', 'unpowered-lamp-light']
  lightSnapshot.dayPlan.offers.food[23] = true
  lightSnapshot.dayPlan.offers.lights[23] = true
  for (let index = 0; index < 12; index++) {
    lightSnapshot.buildings.push({
      id: `string-light-${index}`,
      kind: 'stringLights',
      x: index,
      z: 0,
      elevation: 0,
      rotation: 0,
      decorationSlot: 0,
      price: 0,
    })
  }
  lightSnapshot.buildings.push({
    id: 'unpowered-food-light',
    kind: 'food',
    x: 15,
    z: 0,
    elevation: 0,
    rotation: 0,
    price: 10,
  }, {
    id: 'unpowered-lamp-light',
    kind: 'lighting',
    x: 17,
    z: 0,
    elevation: 0,
    rotation: 0,
    price: 0,
  })
  Object.assign(lightSnapshot.visitors[0]!, {
    campsite: { x: 16, z: 0, elevation: 0 },
    campingPhase: 'resting',
  })
  const festivalLights = new FestivalLightsView()
  festivalLights.update(lightSnapshot)
  assert.equal((festivalLights as any).bulbs.count, 15, 'all currently active sources remain visible without glow meshes')
  assert.equal((festivalLights as any).pool.length, 15, 'every active source keeps its own light cast without camera selection')
  lightSnapshot.minute = 12 * 60
  lightSnapshot.dayPlan.offers.food[12] = false
  lightSnapshot.dayPlan.offers.lights[12] = false
  festivalLights.update(lightSnapshot)
  assert.equal((festivalLights as any).bulbs.count, 1, 'scheduled sources switch off while a sleeping tent may stay lit')
  console.log('PASS deterministic decision budget, camp route bound, cache refresh and detailed asset batching')
}
