# Simulation and rendering performance

Version 0.1.4, measured locally on 2026-09-11 using the saved `rtest3` scenario.
The starting world contains 1,093 visitors, 335 camp installations, 435 buildings,
41 staff and 361 incidents. Personal saves stay in the ignored `saves/` directory.

## Reproduce

Run `npm run test:performance -- rtest3 120` for identical starting snapshots at
1×, 3× and 8×. A JSON path also works, for either a raw snapshot or server save slot.
Run `npm run test:performance -- rtest3 1200` for a longer simulation.
In PowerShell, set `$env:PROFILE_METHODS='1'` for inclusive method timing;
remove it with `Remove-Item Env:PROFILE_METHODS` for normal measurement.
Method totals overlap and must not be added together.

The test advances real fixed 100 ms ticks without rendering or sleeping. It reports
median/p95/max CPU time, actual ticks and final population, not browser FPS or TPS.
The 1,200-tick test covers 120 real seconds of intended simulation. At 8× the
festival eventually closes and the park empties, so use the short populated run
as well. Do not interpret lower population as a CPU optimization.

## Measured result

Before this change (including the already present occupancy/panic optimizations),
the first 120 ticks at 3× took 6,429 ms total; median 15.79 ms, p95 288.78 ms,
maximum 321.82 ms. At 8×: 10,351 ms total, p95 551.23 ms, maximum 832.26 ms.

After the changes, with the same method instrumentation and starting save:
- 3×: 1,492 ms total; median 11.33 ms, p95 23.13 ms, maximum 30.90 ms.
- 8×: 2,118 ms total; median 18.10 ms, p95 28.72 ms, maximum 45.00 ms.
- 1×: 1,097 ms total; median 7.35 ms, p95 19.86 ms, maximum 46.48 ms.

The 1,200-tick run without instrumentation measured p95 18.99 ms at 3×
(427 visitors remaining) and 25.92 ms at 8× (festival finished, zero visitors).
Hardware, warmup and browser load affect absolute timings. Browser measurements
must also include scene updates, WebGL rendering, UI and multiplayer encoding.

## Architecture and regression checks

The fixed tick remains 100 ms; game speed scales simulated minutes and movement.
Needs, transport, staff and state transitions still progress every tick. Destination
selection has a deterministic 16-decision budget per tick, including direct
callbacks. The insertion-ordered deferred queue drains on subsequent ticks.
Each visitor can consume that budget at most once per tick. Bench rest is not
continually interrupted by the exhausted-visitor branch.

Camping social selection previously scanned every visitor and ran a separate A*
for every installation. It now makes one occupancy pass and one multi-goal search,
including distant reachable alternatives when nearby spots are full or blocked.

Crowd changes update live movement/cost indexes without clearing all cached routes.
Routes expire after 30–59 ticks, staggered by start cell. New construction or access
changes still invalidate navigation immediately. Cache capacity evicts one entry;
budget-limited failures never poison the reachability cache.

Detailed core building models use baked vertex colors and shared geometry. Static
instances draw once per model kind, rather than once per detail or placed building.
Animated stages, light pools, transport and interaction metadata retain their own
objects. Existing picking uses the logical building grid.

`tests/performanceGuards.ts` enforces bounded decision work and queue drainage,
one route search for 335 camp destinations, exclusion of occupied seats, crowd
cache expiry, construction invalidation, and bounded geometry/draw batches.
`tests/supplyChain.ts` checks detours and recovery after cache expiry; the main
suite checks frame-partition determinism at all speeds and real multiplayer sockets.
Run `npm test` and `npm run build` for changes in these systems.

No timing threshold is enforced in shared CI because hardware varies. Structural
work bounds fail deterministically; the saved-scenario benchmark is the additional
manual check against CPU regressions.
