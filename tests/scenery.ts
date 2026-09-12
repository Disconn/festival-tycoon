import assert from 'node:assert/strict'
import { GameState } from '../src/game/GameState'
import { scenerySlot, sceneryTransform, sceneryOverlaps } from '../src/game/scenery'
import { enableMultiplayerCommands } from '../src/net/bind'
import { packWorld } from '../src/net/codec'
import type { GameCommand } from '../src/net/protocol'

export function testScenery(fixture: (count?: number) => GameState): void {
  const game = fixture(0), s = game.snapshot
  for (const [slot, kind] of ['flowerbed', 'planter', 'rock', 'statue'].entries()) {
    const result = game.place(kind as any, 10, 0, slot)
    assert.ok(result.ok, result.message)
  }
  const items = s.buildings.filter(b => b.x === 10 && b.z === 0)
  assert.equal(items.length, 4)
  assert.equal(game.canPlace('shrub', 10, 0, 2).ok, false, 'occupied quarter cannot overlap')
  assert.equal(game.canPlace('shrub', 10, 0, 7).ok, false)
  assert.equal(game.canPlace('food', 10, 0).ok, false, 'whole-tile buildings respect every occupied quarter')
  const selected = game.getAt(10, 0, undefined, .75, .75)!
  assert.equal(selected.kind, 'statue')
  assert.ok(game.bulldoze(10, 0, selected.id).ok)
  assert.equal(s.buildings.filter(b => b.x === 10 && b.z === 0).length, 3)
  assert.equal(game.bulldoze(11, 0, items[0]!.id).ok, false, 'targeted removal cannot affect another cell')
  assert.ok(game.canPlace('shrub', 10, 0, 3).ok)

  for (let side = 0; side < 4; side++) assert.ok(game.place('hedge', 3, -20, side).ok)
  assert.equal(game.canPlace('banner', 3, -20, 2).ok, false, 'same edge cannot be reused')
  assert.ok(game.getPathAt(3, -20))
  assert.equal((game as any).isPedestrianSolidAt(3, -20, 0), false, 'edge decorations keep the path walkable')
  assert.equal(game.getAt(3, -20, undefined, .5, .5)!.kind, 'path', 'center selects path, not surrounding hedge')
  assert.ok(game.place('banner', 12, 0, 1).ok)
  assert.ok(game.placePathSegment(12, 0, 0).ok, 'paths can also be built after edge scenery')

  assert.ok(game.place('tree', 14, 0, 0).ok)
  assert.ok(game.place('flowerbed', 14, 0, 1).ok)
  assert.equal(game.canPlace('food', 14, 0).ok, false, 'clearable tree cannot hide a flowerbed collision')
  const tree = s.buildings.find(b => b.kind === 'tree' && b.x === 14)!
  delete tree.decorationSlot
  const restored = GameState.fromJSON(JSON.stringify(s))!
  const legacy = restored.snapshot.buildings.find(b => b.id === tree.id)!
  assert.deepEqual(sceneryTransform(legacy), { x: .5, z: .5, rotation: tree.rotation, sx: 1, sy: 1, sz: 1 })
  assert.equal(restored.snapshot.buildings.filter(b => b.x === 10 && b.z === 0).length, 3)
  assert.deepEqual(restored.snapshot.buildings.filter(b => b.x === 10).map(b => b.decorationSlot), [0, 1, 2])
  assert.ok(game.bulldozeArea([{ x: 10, z: 0 }]).ok)
  assert.equal(s.buildings.filter(b => b.x === 10 && b.z === 0).length, 0, 'area removal includes every quarter')

  for (let rotation = 0; rotation < 4; rotation++) {
    const slot = scenerySlot('banner', .5, .95, rotation)!
    assert.equal(slot, rotation)
    const placed = sceneryTransform({ kind: 'banner', rotation, decorationSlot: slot })
    assert.equal(placed.rotation, rotation)
  }
  assert.equal(scenerySlot('flowerbed', .75, .25), 1)
  assert.equal(sceneryOverlaps({ kind: 'flowerbed', rotation: 0, decorationSlot: 0 }, { kind: 'hedge', rotation: 0, decorationSlot: 0 }), false)

  const client = fixture(0), host = fixture(0), sent: GameCommand[] = []
  client.networkMode = 'client'; enableMultiplayerCommands(client)
  client.commandOutbox = command => sent.push(command)
  client.rotateBuild()
  assert.ok(client.place('statue', 10, 0, 3).ok)
  assert.equal(client.snapshot.buildings.at(-1)!.decorationSlot, 3, 'optimistic construction keeps sub-tile placement')
  host.networkMode = 'host'; host.schedulePublicCommand(sent[0]!)
  const built = host.snapshot.buildings.at(-1)!
  assert.equal(built.decorationSlot, 3); assert.equal(built.rotation, 1)
  client.applyNetworkWorld(structuredClone(packWorld(host.snapshot)))
  assert.equal(client.snapshot.buildings.find(b => b.id === built.id)!.decorationSlot, 3)
  console.log('PASS quarter/edge scenery, exact picking/removal, walkable paths, legacy saves and optimistic multiplayer placement')
}
