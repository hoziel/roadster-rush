# Player roadster — procedural object study

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
