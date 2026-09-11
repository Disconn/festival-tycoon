import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import type { GameState } from '../src/game/GameState'

// Regression guard for the crowd/panic O(n^2) bug fixed alongside this file:
// updateCrowdingAndMotivation used to re-scan all visitors per visitor to find
// neighbours; it now buckets visitors by cell first (countOnTouchingCells), so
// tick cost should grow roughly linearly with visitor count. This compares
// tick time at two visitor counts and fails if it grows closer to quadratic.
export function testPerformanceGuards(fixture: (count?: number) => GameState): void {
  const measure = (count: number, ticks: number): number => {
    const game = fixture(count)
    game.setSpeed(1)
    for (let i = 0; i < 3; i++) game.tick(0.1)
    const start = performance.now()
    for (let i = 0; i < ticks; i++) game.tick(0.1)
    return performance.now() - start
  }
  measure(50, 3) // warm up the JIT before the timed comparison runs
  const small = measure(200, 15)
  const large = measure(1600, 15)
  const factor = large / Math.max(small, 1)
  assert.ok(
    factor < 20,
    `crowd/panic simulation should scale roughly linearly with visitor count (8x visitors here), not quadratically: ` +
      `200 visitors took ${small.toFixed(1)}ms, 1600 visitors took ${large.toFixed(1)}ms (${factor.toFixed(1)}x slower)`,
  )
}
