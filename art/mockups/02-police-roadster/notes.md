# Friendly police roadster — native object study

## Revision 1 — November 9, 2026

Ofir directly requested a police version of the polished roadster. This follows brief `art/briefs/02-police-roadster.md` and uses the exact shared Revision 4 body from `../01-player-roadster/roadster.ts` (player asset commit `ccdbff6`). The earlier brief was held pending player approval; this new direct request authorizes the variant study, without implying approval of the earlier style directions.

## Design

Navy body, cream doors and center hood stripe, cream rear band, a gold five-point star on a plain navy disc, and a small smiling front. The chunky chamfered red/blue roof light bar has cream dividers and no transparent lenses. Matching small grille lamps reinforce its color. There is no text, real department insignia, Tesla branding, downloaded imagery or external texture.

The door stars are geometry conformed to the door crease and attached to the actual door pivots. Cream panels, mirrors, windows and stars move together. The fixed light bar stays on the roof while the doors open. Wheels, cabin and four thruster sockets are inherited from the player model. The preview reuses the existing large vapor effect.

## Native asset and API

`police-roadster.ts` exports `buildPoliceRoadster()` returning the shared `RoadsterParts` interface (`group`, `body`, `paint`, `wheels`, `doors`, `setDoorOpen`, `thrusters`, `dispose`) plus:

- `lightBar`: the roof attachment group.
- `setLights(enabled)`: enables/disables the alternating emission.
- `updateLights(elapsedSeconds)`: smooth one-second red/blue cycle. Call once per frame. No dynamic lights, transparent lens overdraw or per-frame allocations.

`paint` refers to the navy body; cream door paint remains separate. The inherited disposer traverses the final group and releases all added geometry/materials. This module imports the player factory instead of duplicating the car. When moving it into game code, move the shared base too and adjust the import.

**5,744 triangles / 38 meshes / 11 shared materials**, including both doors, cabin and light bar. The police additions cost 284 triangles over the 5,460-triangle player car. Closed bounds approximately **1.892 × 1.295 × 3.674** (X/Y/Z); the added height is the light bar. +Y up, -Z forward, wheels at ground level, exhaust along each socket's local -Y.

## Palette

| Part | Color |
|---|---|
| Navy paint and emblem disc | `#293d65` |
| Cream panels/stripe/smile | `#f4e9d8` |
| Gold star | `#ffd23f` |
| Red lens / emission | `#f26776` / `#ff4860` |
| Blue lens / emission | `#54bdeb` / `#35c6ff` |
| Trim / tires | `#171a22` |
| Glazing / specular | `#202b3d` / `#7d92aa` |
| Alloy / specular | `#aeb9c8` / `#8b97a5` |
| Cabin | `#57545b` |
| Rear lamp | `#ff4860` |

Inherited headlights are `#f4e9d8`; studio background/floor are `#d8dbe0` / `#c8cbd2`. Road is `#4a4458` with `#f4e9d8` markings. Player in the chase study is `#e8344e`.

## Preview and images

Run the existing Vite server and visit `/art/mockups/02-police-roadster/`. Controls: orbit, fixed views, light toggle, opening doors, thruster kickflip, chase view and Save image. The model preview uses clean studio shading and a ground shadow, matching the polished player study.

All PNGs are actual Three.js renders, under 2 MB:

- `three-quarter.png`: complete police design during the alternating light cycle.
- `front.png`: cream stripe, paired grille lamps and smiling fascia.
- `side.png`: same player silhouette, hinged cream door and original star.
- `back.png`: light bar, rear color band and diffuser.
- `lights-off.png`: identical model with the alternating emission disabled.
- `doors-open.png`: butterfly doors open with stars attached, roof bar fixed.
- `vapor.png`: airborne police car with the inherited large thruster clouds.
- `gameplay.png`: police roadster alone from behind/above, portrait 540×1170 (9:19.5).
- `chase.png`: red player car from the gameplay camera with the police small in the rear-view inset, physically following 15 units behind. The inset is a preview composition, not an implemented game HUD feature.

All other images are 1200×800. The flashing light animation is available live in the preview; a PNG records one phase.

## Simplification and integration

Preserve the broad two-tone panels, roof light bar and smile at distance. The inherited 28-segment tires can be reduced to 20 if needed. For draw-call savings, merge the police add-ons with existing meshes that share material/parent, or make a distant police variant with fixed doors, simplified cabin and fewer wheel parts. The current 38 meshes need whole-scene profiling against the under-100-draw-call target, particularly if both cars render together. Vapor profiling remains necessary on phone.

`src/view/cars.ts` currently exports a different `buildPolice()` that returns `red`/`blue` MeshBasicMaterial handles and asynchronously loads `police.glb`. This study is not wired into that path. Claude should adapt the existing flashing-light integration to `setLights`/`updateLights`, rather than keep the old loader or assume the old material handles. Existing player CarStyle/plate/honk/driver-visibility decisions still apply to the shared body. No siren audio or chase rules were changed.

## Validation

Strict TypeScript passed for factory, preview and imports with the project's `vite/client` types. Runtime checks confirmed finite position/normal arrays, triangle budget, 4 wheels/2 doors/4 sockets, exact closed → open → closed rotations, both alternating light phases, lights-off behavior, and disposal of every final geometry/material. Browser inspected front/side/back/3/4, lights on/off, doors open/closed, portrait/chase views, vapor takeoff and return to ground; no browser errors. Mobile whole-game performance remains unmeasured.

Handoff is on issue #15. The board CLI still returns `unknown owner type`; use comment-only handover per COLLAB.md §3. The native asset is ready for Claude's review/integration; visual approval remains with Ofir.
