# Festival simulator: project rules for every coding agent

- Preserve existing gameplay, save compatibility and host-authoritative multiplayer.
- Increment the package patch version for feature/fix batches; the visible version comes from package.json. Keep the lockfile in sync.
- Simulation time is authoritative: fixed 100 ms ticks; speed indices 1/2/3 mean 1×/3×/8×. Rendering only interpolates. Never run decisions or mutate game state from render frames.
- Bound destination decisions with `SIMULATION_CONFIG.pathfinding.decisionsPerTick`, including direct arrival/interaction callbacks. Deferred requests must drain fairly; urgent state transitions and movement/needs still advance every tick.
- Deterministic budgets use work counts/simTick, never Date.now(), performance.now(), FPS or local device speed. Profiling clocks are diagnostics only.
- Do not nest full visitor scans inside visitor/camp/staff loops. Build spatial/occupancy indexes once per pass and update reservations incrementally.
- When many destinations are interchangeable, use ONE multi-goal route search. Never run A* once for every tent/gathering place/building. `CampingSystem.findRouteToGathering` is a regression-critical example (335 installations in rtest3).
- Topology/access changes invalidate navigation immediately. Crowd cost changes use bounded, staggered route-cache expiry. Do not clear the entire cache on every crowd update or when the cache reaches capacity. Budget-limited misses are not proof of unreachability.
- Keep terrain, crowding, staff/load penalties and alternate routes functional. Do not improve benchmarks by freezing visitors, skipping admissions, disabling effects or slowing game time.
- Static model details use shared, merged geometry/vertex colors and instancing. Never add a material/draw call per plank, bottle, bolt or visitor. Keep animated stages, lighting, picking and overlays outside static batches.
- Scenery uses optional `decorationSlot` (four quarters or edges). Missing slots are legacy full-tile objects; never silently shrink old saves. Placement, previews, collision checks and multiplayer must use the shared `scenery.ts` rules. Instanced scenery carries building IDs for picking.
- Before completing simulation/render changes run `npm test` and `npm run build`. Frame-partition determinism, camp multi-goal search, decision queues, cache refresh and asset draw-call bounds are covered by tests.
- For performance work run `npm run test:performance -- rtest3 120` before/after and a longer 1200-tick run. Use `PROFILE_METHODS=1` for inclusive method timing (PowerShell: `$env:PROFILE_METHODS='1'`). Never commit/overwrite personal saves. The script accepts a save name or snapshot/slot JSON path.
- Compare identical fixtures and distinguish CPU tick timing from actual browser FPS. Inspect 1×, 3× and 8× and report median/p95/max plus visitor counts; a long run can end the festival and empty the park.
- See `docs/performance.md` for measured baseline, limits and reproduction. Update it when changing the scheduling or rendering architecture.
