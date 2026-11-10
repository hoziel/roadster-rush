# Player roadster — procedural object study

**Current version: Revision 4 below. Earlier revision details are historical.**

## Revision 1 — November 9, 2026

Ofir rejected the earlier #42 mockups, requested Roadster photo and thruster-stunt references, then explicitly requested a 3D object in the project's format. This study follows that direct instruction. It is not an approval of #42 or completion of the full #14 paint-variant brief (currently on hold pending style selection).

## Deliverable

`roadster.ts` exports `buildRoadster(color)` returning the project's structural `CarParts` interface (`group`, `body`, `paint`) plus `wheels`, `thrusters`, and `dispose()`. It uses the installed Three.js and MeshToonMaterial, with no external textures, runtime downloads, or new dependencies. `index.html` and `preview.ts` provide an isolated Vite preview: orbit, fixed views, paint changes, and a demonstration thruster kickflip.

Run the existing Vite command and visit `/art/mockups/01-player-roadster/`. This is a model prototype, not yet wired into `src/view/cars.ts`.

3,016 triangles, 19 meshes, 7 shared materials. Static parts are merged by material. Four wheels remain independently rotatable about local X. Four named thruster attachment points emit along local -Y. Axes: +Y up, -Z forward, wheels touch Y=0. Approximate footprint: 1.76 wide × 3.3 long; height about 1.05. `body` origin is at ground level and its geometry contains the complete painted shell.

## Reference views

- `front.png`: paired headlights, low nose, windshield, wheel stance.
- `side.png`: open cockpit, short tail, actual fender arch cutouts.
- `back.png`: rear deck, tail lamps, diffuser.
- `three-quarter.png`: overall original car silhouette with two seats and roll hoops.
- `gameplay.png`: road/chase-camera study at 450 × 975 (9:19.5); this is an isolated preview, not a screenshot of the running game.

Screenshots include preview controls; each is under 2 MB. All use actual generated Three.js geometry.

## Palette and simplification

Paint #e8344e; dark trim/tires #1b1b22; windshield #2b2f4a; seat upholstery #b88f5a; wheel/hoop metal #8993a7; headlights #f4e9d8; rear lamps #ff4860. Preview paint samples: #4382b8, #b3ee48, #f4e9d8, #8056b8. These are solid-color studies, not the four finished paint treatments in the brief.

Broad hood/deck planes, polygonal wheel faces, plain seats, and four simple nozzle cylinders are intentionally buildable. If draw-call pressure grows, instance wheel assemblies or merge stationary hub details. No photo textures, badges, model text, or traced reference imagery.

## Integration notes for Claude

- `CarStyle` currently adds full-size box stripe/lower overlays and a plate relative to the old body's Y=.45 origin. Rework these for this geometry before swapping the builder. The plate needs a positive Y offset and a rear Z around 1.65.
- The existing driver head at X=0 is over the console; move it to a seat (X≈-.30, Z≈.2) and adjust height/hat clearance.
- Current honk squashes only `body`; merged detail meshes won't squash with it. Apply a shared mount transform for coherent squash.
- Scene jump/roll and puff logic already exist. Bind those effects to the named thruster sockets; the preview jump is only a visual demonstration and does not modify simulation physics.
- Car geometry is slightly larger than the grey box; check lane clearance and collisions in integration.
- Police variant and finished striped/split paint variants are not included.

## Checks

TypeScript strict check passed for both TS files using the installed compiler. Browser inspected at narrow default width and 450×975 portrait: all view buttons, paint color change, airborne jump and return to ground. Fixed inward loft normals and narrow-screen clipping. Mobile device FPS and integration with the full game are not measured.

## Reference links

- https://www.tesla.com/roadster
- https://www.autoexpress.co.uk/tesla/roadster/370689/new-tesla-roadster-revealed-2026-pictures
- https://www.youtube.com/watch?v=r5vsHHPVhJg

References informed low nose/open-cockpit sports-car cues and the thruster animation concept; the model is an original stylized car per AGENTS.md, not an exact Tesla model.


## Revision 2 — approved photo silhouette

Ofir confirmed the specific front three-quarter photo shown in chat as the reference for the rebuild:
https://images.autoexpress.co.uk/autoexpress/2026/10/New%20Tesla%20Roadster.jpg?w=1260&h=710&fit=crop&q=75&auto=format%2Ccompress&dpr=1
Source gallery: https://www.autoexpress.co.uk/tesla/roadster/370689/new-tesla-roadster-revealed-2026-pictures

The photo was opened and visually inspected before this revision. Revision 1 had used general descriptive cues without matching a specific photo; Ofir rejected its likeness. The previous broad reference claim should not be interpreted as a photo-matched model.

Rebuilt the silhouette around a low wedge nose, continuous dark canopy, angular shoulder panels and enclosed wheels. Removed the separate fender rings, exposed seats and roll hoops. Added longitudinally tapered side skins with wheel cutouts, shoulder surfaces joining the canopy, broad aero wheel spokes, and slim paired lamps. This remains a simplified original interpretation without logos or exact reproduction. The closed canopy follows Ofir's confirmed reference and departs from the older open-top brief; Claude should reconcile that direction with driver visibility before integration.

Current geometry: **3,264 triangles / 18 meshes / 6 shared materials**. Native Three.js/TypeScript, same CarParts-compatible API, four separate wheel groups, four downward thruster sockets. Default builder paint remains #e8344e; preview starts in silver #d7dbe2 for comparison with the photo. Canopy is now #202737. Removed the upholstery material; other trim, lamp and wheel colors are unchanged.

Replaced front/side/back/three-quarter/gameplay PNGs with actual renders of Revision 2. `detail.png` is a tighter screenshot of the silver model; `red.png` shows the project's red paint. Gameplay image is 450×975. All images remain under 2 MB.

Preview has a lower front three-quarter camera, updated paint cycle, and vapor that spreads along the ground. Strict TypeScript check passed. Visually inspected front, side, rear, three-quarter and gameplay views; exercised paint change and jump. Full-game integration/performance are still untested. CarStyle overlays/plate and honk transform concerns from Revision 1 still apply. The opaque canopy means an interior driver head will no longer be visible: resolve this in the asset review rather than silently cutting a hole into the chosen silhouette.


## Revision 3 — closer proportions, opening doors, stronger thruster vapor

Ofir asked to improve resemblance, add opening doors, and make the thrusters emit much more visible air. Retained the approved specific photo as the silhouette reference. Lengthened the body, broadened the canopy, lowered the apparent nose, replaced the patchy fender/deck joins with continuous crowned surfaces, added a slim continuous running light and recessed dark front fascia, enlarged the aero wheel faces, and used more neutral preview lighting for comparison. This is a simplified interpretation pending visual approval.

### Moving doors

`RoadsterParts` now exposes `doors: THREE.Group[]` and `setDoorOpen(amount)` with amount clamped to 0–1. Two separate butterfly-style hinge groups carry the painted outer door, inner trim, side glass, roof-edge rail, handle and mirror. The center roof stays fixed. Both sides animate upward/outward; the preview's **Open doors / Close doors** toggle eases to the requested position. Added a simple two-seat cabin, floor, dashboard, console and steering wheel visible through the open sides. Door geometry shares the car paint so recoloring also recolors the doors.

### Vapor

`thruster-vapor.ts` exports `ThrusterVapor`, a reusable effect independent of the preview. It owns a bounded 640-particle pool, rendered as one instanced draw call with procedural soft billboards (no downloaded textures). Dense ground bursts at takeoff and landing, repeated directional jets during lift/roll/descent, expanding clouds, upward drift, and gradual fade replace the former tiny polygon puffs. Shader and CPU buffers are allocated once. Call `jet(worldPosition, worldDirection)`, `burst(worldPosition, landing)` and `update(dt)`; call `dispose()` when releasing the effect. This heavier transparent effect needs mobile profiling before game integration.

### Current specs and palette

- Car: **4,120 triangles / 27 meshes / 7 shared materials**, including both doors and cabin. Wheels remain separate; four named downward thruster sockets remain.
- Closed bounding size: approximately **1.876 × 1.084 × 3.674** (X/Y/Z). Recheck collision and lane clearance during integration; this is longer than the grey-box car.
- Vapor pool: up to 640 quads (1,280 triangles), one additional draw call; opacity and scale fall to zero for expired particles.
- Paint #e8344e (builder default), #d7dbe2 (silver preview); dark trim #171a22; canopy #161d2c; wheel metal #98a2b2; cabin #57545b; lamps #f4e9d8 and #ff4860. Vapor shades range from approximately #bac9d9 at edges to white.
- Updated fixed-view, red and gameplay screenshots. `doors-open.png` shows the actual opened model; `vapor.png` captures the enlarged takeoff clouds.

### Validation and integration

Strict TypeScript check passed for model, preview and effect. Runtime geometry check confirmed finite vertex/normal buffers, 2 doors/4 wheels/4 sockets, and exact closed → open → closed rotations. Browser inspected front/side/rear/gameplay, door movement, paint change, airborne vapor and return to ground. Browser error log was empty. Replaced obsolete preview PCFSoftShadowMap with PCFShadowMap after observing the installed Three.js warning.

Still an isolated object/effect study, not integrated into the live game. Existing CarStyle overlays, plate placement and honk transform need adaptation. Closed canopy continues to obscure an interior driver; doors reveal the cabin, but gameplay driver visibility remains an art/integration decision. Doors add draw calls; whole-game phone performance is unmeasured. Screenshots are rendered from the model and not image-generated.

## Revision 4 — polished replacement

Ofir asked to polish the car and override the old version. Replaced the existing source and render files in this folder; this revision supersedes Revision 3 (`69a194a`). The reference-inspired silhouette, butterfly doors and large vapor effect remain. No branding or reference image textures were added.

### Design changes

- Rounded tire shoulders, recessed dark wheel centers, slim alloy rims and five swept metal spokes replace the flat wheel discs.
- Subtle crowned door surfaces, fine shut lines, inset lower sills, flush handles and painted mirror caps make the body read as separate finished panels.
- Tapered bumper returns, small auxiliary front lights, a framed rear lamp, integrated ducktail and diffuser refine the ends. Inset backing closes gaps beneath the bumper faces.
- Welded glazing normals give the canopy a smoother highlight. Glass and alloy now use Phong materials; the recolorable body and doors retain MeshToonMaterial.
- Neutral studio lighting and a softer background clarify the shape. The preview disables self-shadow reception on the car while retaining the ground shadow to avoid jagged shadow-map edges; the exported builder retains its shadow flags for Claude to tune in the game.

### Current specs, palette and views

**5,460 triangles / 27 meshes / 7 shared materials** for the car, including cabin and doors. Closed bounding size approximately **1.892 × 1.084 × 3.666** (X/Y/Z). The `buildRoadster`, `setDoorOpen`, wheel, socket and disposal APIs are unchanged. `thruster-vapor.ts` is unchanged from Revision 3.

Paint #e8344e (builder) / #d7dbe2 (silver preview); trim #171a22; glazing #202b3d with #7d92aa specular; alloy #aeb9c8 with #8b97a5 specular; cabin #57545b; headlights #f4e9d8; rear lamps #ff4860. Studio background #d8dbe0 and floor #c8cbd2. The original vapor palette remains.

All nine PNGs are replaced with clean renders of the actual model, without interface overlays. Front/side/back show construction, `three-quarter.png` shows the complete silver design, `detail.png` retains that same clean render under the earlier filename, `red.png` shows the game paint, `doors-open.png` shows both hinges open, and `vapor.png` captures takeoff. Landscape images are 1200×800; `gameplay.png` is 540×1170 (9:19.5), viewed behind and above on a three-lane road. All are under 2 MB. **Save image** in the preview prepares a download link at those resolutions.

The car remains within the 6k triangle target. If mobile budgets require simplification, reduce tire radial segments from 28 to 20 and omit the small handles/auxiliary lights before changing the silhouette. Preserve the separate doors and wheels for animation. Profile the unchanged transparent vapor pool in the game.

### Validation and handoff

Strict TypeScript check passed for the model, preview and imported effect with `vite/client` types. Runtime checks confirmed finite position/normal data, 4 wheels, 2 doors, 4 thruster sockets, and exact closed → open → closed door transforms. Visually checked front/side/rear/portrait views, red paint, open doors and airborne vapor; the car returned to the ground and the browser error log was empty. Diff whitespace check passed.

The source is replaced in the art folder. At inspection, `src/view/cars.ts` still used the grey-box player builder; Claude owns the game swap. Use this revision for integration instead of `69a194a`. Existing overlay/plate/honk, collision-fit and driver-visibility concerns still apply. This polish request does not imply final visual approval or completion of the held paint-variant brief.
