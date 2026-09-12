import assert from 'node:assert/strict'
import { Raycaster, Vector3, MeshStandardMaterial } from 'three'
import type { GameState } from '../src/game/GameState'
import { createTerrainAtlas, createTerrainBase, createTerrainMaterial, createTerrainSurface, terrainMaterialAt } from '../src/view/terrainSurface'
import { TerrainShape } from '../src/view/terrainShape'
import { applyTerrainChanges, planTerrainEdit } from '../src/game/terrain'

export function testTerrainSurface(fixture: (count?: number) => GameState): void {
  const snapshot = fixture(0).snapshot
  snapshot.scenario.worldSize = 32
  snapshot.terrain.heights = { '0,0': -3, '1,0': 2 }
  const material = createTerrainMaterial()
  const surface = createTerrainSurface(snapshot, material)
  assert.equal(surface.children.length, 0, 'ground detail uses one mesh, not one object per pebble/tile')
  assert.equal(surface.geometry.getAttribute('position').count, 32 * 32 * 5, 'one bounded triangle fan per cell, including the lake bed')
  assert.equal(surface.geometry.index!.count, 32 * 32 * 12)
  const positions = surface.geometry.getAttribute('position')
  const normals = surface.geometry.getAttribute('normal')
  for (let i = 0; i < positions.count; i++) {
    assert.ok(positions.getY(i) >= -2.998 && positions.getY(i) <= 2.004, 'slopes never overshoot the terrain height range')
    assert.ok(normals.getY(i) > 0, 'terrain tops face upwards for lighting and picking')
  }
  const before = JSON.stringify(snapshot)
  const restored = createTerrainSurface(JSON.parse(before), material)
  for (const name of ['position', 'color', 'uv']) assert.deepEqual(restored.geometry.getAttribute(name).array, surface.geometry.getAttribute(name).array, 'loaded worlds preserve material patterns')
  assert.equal(JSON.stringify(snapshot), before, 'rendering leaves authoritative simulation and save data untouched')
  snapshot.festival.wetness = 100
  const wet = createTerrainSurface(snapshot, material)
  assert.deepEqual(wet.geometry.getAttribute('position').array, positions.array, 'weather needs only a material tint, never topology changes')
  for (const [environment, expected] of [['desert', 'sand'], ['urban', 'paved'], ['grassland', 'grass'], ['farmland', 'clay']] as const) {
    snapshot.scenario.environment = environment
    assert.equal(terrainMaterialAt(snapshot, 2, 2), expected)
  }
  snapshot.festival.infrastructure.ground['2,2'] = { compacted: true }
  assert.equal(terrainMaterialAt(snapshot, 2, 2), 'compact')
  snapshot.festival.infrastructure.ground['2,2']!.surface = 'gravel'
  assert.equal(terrainMaterialAt(snapshot, 2, 2), 'gravel')
  snapshot.festival.infrastructure.ground['2,2']!.surface = 'paved'
  assert.equal(terrainMaterialAt(snapshot, 2, 2), 'paved')
  const atlas = createTerrainAtlas()
  assert.deepEqual(atlas.image.data, material.map!.image.data, 'patterns are deterministic without consuming simulation RNG')
  for (const mesh of [surface, restored, wet]) mesh.geometry.dispose()
  atlas.dispose(); material.map!.dispose(); material.dispose()
  // Use an unbuilt landscape to verify continuity and real ray/triangle contact.
  const landscape = fixture(0).snapshot
  landscape.scenario.worldSize = 32; landscape.terrain.heights = {}
  const edit = planTerrainEdit(landscape.terrain, 32, 0, 0, 'raise', () => false)
  assert.ok(edit.ok); applyTerrainChanges(landscape.terrain, edit.changes)
  const shape = new TerrainShape(landscape, new Set())
  assert.equal(shape.sample(.5, .5), 1, 'hill centre retains the saved edit height')
  assert.equal(shape.sample(1.5, .5), 0, 'neighbor centre remains at its saved height')
  assert.ok(shape.sample(.9, .5) > 0 && shape.sample(.9, .5) < 1, 'raising a tile automatically produces a slope')
  for (const t of [.1, .3, .5, .8]) {
    assert.ok(Math.abs(shape.sample(1 - 1e-7, t) - shape.sample(1 + 1e-7, t)) < 1e-5, 'neighboring slopes share their edge')
    assert.ok(Math.abs(shape.sample(t, 1 - 1e-7) - shape.sample(t, 1 + 1e-7)) < 1e-5)
  }
  const plainMaterial = new MeshStandardMaterial()
  const hill = createTerrainSurface(landscape, plainMaterial, shape)
  hill.updateMatrixWorld(true)
  for (const x of [.1, .35, .7, 1.1]) for (const z of [.15, .4, .8, 1.3]) {
    const ray = new Raycaster(new Vector3(x, 10, z), new Vector3(0, -1, 0))
    const hit = ray.intersectObject(hill)[0]
    assert.ok(hit)
    assert.ok(Math.abs(hit.point.y - shape.sample(x, z) - .003) < 1e-5, 'actor height and picking match the rendered triangles')
    assert.equal(shape.actorHeight(x, z, 0), shape.sample(x, z), 'ground actors follow slopes')
    assert.equal(shape.actorHeight(x, z, 5), 5, 'raised crossings keep their own elevation')
  }
  const padShape = new TerrainShape(landscape, new Set(['0,0']))
  for (const x of [.02, .4, .98]) for (const z of [.02, .6, .98]) assert.equal(padShape.sample(x, z), 1, 'buildings and marked areas retain flat foundations')
  const naturalBase = createTerrainBase(shape, plainMaterial)
  assert.equal(naturalBase.geometry.index!.count, 32 * 4 * 6, 'natural hills need no internal cube walls')
  const retaining = createTerrainBase(new TerrainShape(landscape, new Set(['0,0', '1,0'])), plainMaterial)
  assert.ok(retaining.geometry.index!.count > naturalBase.geometry.index!.count, 'incompatible adjacent foundation heights get retaining faces')
  const restoredShape = new TerrainShape(JSON.parse(JSON.stringify(landscape)), new Set())
  assert.deepEqual(restoredShape.corners, shape.corners, 'slopes reconstruct identically after loading or network sync')
  for (const model of [hill, naturalBase, retaining]) model.geometry.dispose()
  plainMaterial.dispose()
  console.log('PASS textured terrain follows soil/work/heights, preserves saves, and uses one static mesh')
  console.log('PASS automatic slopes, seamless edges, flat foundations, actor contact, picking and saved heights')
}
