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

Terrain detail (0.1.9) uses one static merged surface mesh and a deterministic
256×512 pixel material atlas. All soil types and prepared surfaces share that
single draw call. Rebuild only after terrain, environment, surface/compaction,
or building/area footprint edits; rain changes a material tint, not geometry. Adjacent natural soils blend
at shared corners, while constructed surfaces keep their exact tile boundary.
The atlas uses nearest magnification and mipmaps for a stable distant view.
TerrainShape caches four shared corner heights and the saved centre height per
cell. Four triangles make automatic slopes; buildings, paths and designated areas
retain flat pads. A second merged mesh draws only world borders and retaining
edges between incompatible pad heights, replacing the former terrain cubes.
The lake bed lies below the existing water planes. Actor/scenery height queries
sample the same triangles in constant time without raycasts or visitor scans.
Authoritative integer terrain and navigation heights remain unchanged.
`tests/terrainSurface.ts` covers geometry bounds, seamless slopes, flat pads,
raycast/actor contact, material selection, save/reload stability, and absence of
simulation mutations.

Festival construction additions (0.1.13): camping grass shares one texture and
instanced tiles; an exterior flood fill rebuilds the discontinuous curb only on
area edits. Festival scenery remains shared/merged and supports one deterministic
line-placement command. Debug waste cleanup uses a single owner index and preserves
active camping property and fire incidents.

Coaster segment lengths and frames are cached per coaster, invalidated by the
piece-ID/chain signature, then sampled with binary search. Do not rebuild and scan
all sampled track points for every car/physics substep. New slopes end on integer
height differences; old saved points are preserved. Loop frames retain a fixed
reference heading through vertical tangents so rails and cars do not flip.
Photo purchases and braking/water resistance run in simulation ticks. Bungee
towers use one static mesh, one rider and one rope, with one active visitor at a
time; visuals derive from the authoritative interaction timer. Heights and busy
visitor IDs persist through saves and multiplayer.

Validation on the existing rtest3 save, 120 calls: median/p95/max CPU milliseconds
were 7.59/20.83/46.16 at 1x (1106 visitors), 11.26/24.26/38.12 at 3x (1126),
18.80/30.19/41.14 at 8x (1191). For 1200 calls: 6.85/17.39/50.92 at 1x (1180),
9.30/23.20/66.22 at 3x (566), 14.65/34.05/169.87 at 8x (40).
These are validation measurements with concurrent local development, not an
isolated before/after claim or browser FPS. The 8x long run nearly empties the park;
its lower average does not establish faster crowded rendering. Tests cover actual
special-piece construction, continuous loop orientation, brake/splash resistance,
one photo charge per passage, bungee exclusivity/payment, save/network metadata,
camp perimeter seams and debug cleanup.

Pixel people (0.1.14): four shared, vertex-coloured geometries provide torso,
head/face, hip-pivoted legs with shoes, and shoulder-pivoted arms with hands.
The existing six visitor instance batches remain the picking targets. Eight
additional compact batches contain merged hair/headwear, bags and festival passes;
their draw count is independent of population. Each visible guest writes one
accessory instance, and counts reset every frame to remove departed/hidden guests.
Do not turn these details into individual scene objects per visitor. All variants
stay below 1600 vertices per complete person, without character shadows.
Appearance derives from a stable hash of the full visitor ID, never array position,
simulation RNG or frame time. Staff reuse the same shared parts. Distant guests
keep complete limbs while using the existing cheaper animation path.
`tests/pixelPeople.ts` verifies 10,000-person batch bounds, cached geometry,
save/reorder appearance, varied palettes and removal of stale accessories.
`tests/people-preview.html` is a development-only close-up visual fixture; it uses
the actual production geometries and can be opened through the Vite server.

Carousel/bungee access (introduced in 0.1.15): optional `rideEntrance` and
`rideExit` belong to the placed building and survive saves and multiplayer worlds.
Each gate reserves a separate adjacent cell. Legacy rides without gates remain
closed until the player places and connects them in the ride construction panel.
Entrance queues use the same directional queue traversal as coasters. Finished
riders exit through the chosen exit; a removed exit path delays release without
repeated charges. Gate edits invalidate the building spatial index and navigation.
Gate collision queries use that spatial index; access path checks inspect only
four neighboring cells rather than scanning all buildings per guest.
`tests/rideAccess.ts` covers both ride types, placement, queue routing, interrupted
exit connections, removal, save round trips and optimistic multiplayer reconciliation.

Attraction access visuals (0.1.23): `attractionAccess.ts` caches six merged,
vertex-colored entrance/exit meshes across carousel, bungee and coaster themes.
Ride gates use the existing static instancing pass; details never add individual
draw calls. Placement previews reuse geometry but own their tint material, so
preview disposal or invalid-placement colors cannot affect built gates.
Coaster access positions participate in the render fingerprint, including moves.
`tests/access-preview.html` displays all six production models; performance guards
check shared geometry, tile bounds, preview ownership and six instanced batches.

Female silhouettes (0.1.18): the persistent ID-derived female flag selects a
shared tailored torso, narrower shoulder pivots and eight matching hair/outfit
variants. Three variants use stepped skirts, the others retain trousers.
Male/female and clothed/bare accessories use at most 32 instance batches total,
independent of crowd size; never create individual hair or clothing meshes per
guest. Female staff reuse the torso and tied-hair geometry with their uniforms.
The model regression counts all rendered clothed body parts (including the bust)
against the 1600-vertex budget and checks 10,000-guest instance counts, stable
appearance and both skirt/trouser alternatives.

Camping models (0.1.20): four tent silhouettes and three pavilion silhouettes
each share one merged fabric geometry and one merged detail geometry. Seams,
doors, poles, ropes, pegs and furniture do not add individual draw calls. Across
all seven shapes the camping batcher emits 14 batches, regardless of prop count,
plus the existing cart/chair/music-box batches. Custom BufferGeometry buckets
must key by geometry identity, not only geometry type/constructor parameters;
otherwise different silhouettes collapse to the first model. Batch copies own
their resources and must copy userData before clearing the shared flag.
Each model stays within its tile and below 1800 vertices, checked by
`tests/campingModels.ts`. Appearance uses stable IDs, without simulation RNG or
frame-time input. Optional appearanceId/fabricColor on abandoned tents retain
the original tent's shape, orientation and color through departure and saves.
Legacy abandoned tents retain their brown fallback; wear fades in linear color
space. `tests/camping-preview.html` shows the production models with orbit controls.

## Browser freezes from changing light counts (0.1.27)

The user-provided server save `dessert` (205 visitors, 1817 buildings, 119 incidents,
90 camp installations, 80x80 world) reproduced a 23,692.5 ms `renderer.render()`
call during an ordinary 180-frame run. Initial rendering also took 23,483.5 ms.
Scene updates peaked at 22.9 ms and simulation at 39.8 ms in that run. The main
freeze was therefore in rendering, not pathfinding or the fixed-tick scheduler.
`FestivalLightsView` created/removes a PointLight for each currently active source.
Three's WebGLLights includes point-light count in its shader cache key, so changes
to shop hours or lit tents recompiled large shaders synchronously.

Keep the eight festival PointLights and cursor light permanently attached, even
at zero intensity. Never resize that pool, toggle its visibility, or create a
PointLight per lamp/tent. The nearest sources to the camera focus use the fixed
pool for illumination on objects. Every active source keeps its visible bulb and
a soft, instanced ground light patch (two batches total), including sources beyond
the real-time budget. Ground patches approximate distant light rather than casting
full dynamic illumination onto all objects. Store no render choices in game state.
`tests/performanceGuards.ts` covers schedules, 0/1/514 sources, stable light object
identities/attachment, retained bulb/patch counts, and moving the camera focus.

Reproduce browser timing with the Vite-only `tests/render-performance.html`.
It reads an ignored local copy at `saves/performance-dessert-copy.json`; no personal
save belongs in git. `?save=filename.json&frames=1800` changes the fixture and frame
count. Select Pause/1x/3x/8x and start; each measurement restores the same snapshot.
Initialization is reported separately from frame/CPU stage timings. Long tasks
exclude initialization. The harness measures the production WorldView and GameState,
without the main game's DOM panels. It does not overwrite saves or contact the
public server. Hardware, viewport and graphics-driver cache affect timings.

Measured in the in-app Chromium browser at 639x698: before the fix, 1x render
median/p95/max was 11.5/19.7/23692.5 ms. After the fix, 180-frame render results were
1x: 6.8/12.6/51.9 ms, 3x: 6.5/12.8/55.2 ms, and 8x: 7.4/52.8/54.9 ms.
The longer 1800-frame 8x run reached 301 visitors, with render 6.9/51.8/78.2 ms,
whole-frame 7.0/69.5/111.1 ms and a maximum long task of 112 ms. This removes the
reproduced multi-second stall, but does not promise a hitch-free 60 FPS on all
devices: several hundred draw calls and occasional 50–100 ms frames remain.

CPU-only `dessert` 1200-step medians/p95/max: 1x 1.08/5.90/38.27 ms (206 visitors),
3x 5.35/13.86/48.84 ms (467), 8x 10.30/25.29/46.38 ms (446).
The mandatory `rtest3` 120-step before/after medians/p95/max were
1x 8.82/23.75/50.52 -> 7.93/20.42/45.15 ms (1101 visitors),
3x 15.99/27.80/30.26 -> 13.93/25.20/30.81 ms (1125),
8x 17.43/27.28/39.33 -> 18.78/31.19/39.17 ms (1162).
There is no simulation change; these differences are measurement noise.
The 1200-step `rtest3` run measured 13.31/24.55/45.88 ms at 1x (1209 visitors),
15.94/29.99/83.70 at 3x (666), and 14.67/29.37/110.24 at 8x (1).
The latter ends the festival and empties the park, so it is not a steady-load result.
Full regression tests and production build pass.
