# Roadster Rush — polished opening and gameplay concepts

## Revision 1 — November 9, 2026

Ofir asked for a few super-polished game mockups covering the opening and in-game experience. Created four connected portrait screens, informed by the Austin postcard brief and the current player/police assets. These are **image-generated visual concepts**, not native Three.js screenshots or implemented game UI. They do not imply final approval of #42 or complete every deliverable in the older #16 skyline brief.

## Screens

| File | What it shows |
|---|---|
| `01-opening.jpg` | Large original roadster hero, sunset Capitol vista, dimensional Roadster Rush title, one primary Let's Drive button, Garage/Drivers secondary actions and enabled Kid Mode. |
| `02-sunset-run.jpg` | Core three-lane run: coin trail in the center, two cones in the right lane, cyan power-up, roadside food truck/cactus/scooter, cream HUD and three charged batteries. |
| `03-thruster-jump.jpg` | Lake/bridge stretch, red roadster in the air, broad white thruster jets and expanding vapor, safe obstacle clearance, coin arc and compact Air Time celebration. |
| `04-neon-chase.jpg` | Bright readable twilight, neon storefront icons/string lights, coins and cones, two remaining batteries and the friendly police roadster following in a small rear-view mirror. |

Every screen is **720×1560, exactly 9:19.5**, JPEG quality 95 with 4:4:4 color; all are below 0.5 MB. `index.html` is a lightweight review gallery, available on Vite at `/art/mockups/03-austin-stretch/`. `gallery.jpg` is a 1280×967 browser screenshot showing all four screens together.

## Visual system

The same cream/plum HUD is used throughout: coin pill top left, score plaque top center, pause top right, three battery slots below, horn bottom right, and a passive Kid Mode indicator bottom left. Kid Mode is adjustable on the opening screen; it is not a toggle during a run. Celebrations and the chase mirror stay secondary to the playable path.

The title screen sells the car and the warm Austin world before asking for a single primary action. The three run scenes keep the camera behind/above the car, with exactly three lanes and a clear safe route. Sunset and night share materials, silhouettes and UI; neon is an accent rather than a replacement for road visibility.

The images reference the existing red player front render, player rear render and police three-quarter render. The car remains an original unbranded angular electric roadster with a dark closed canopy and narrow lamps. Generated scene/lighting detail is aspirational; the native mesh remains the geometry source of truth.

## Palette targets

| Role | Hex |
|---|---|
| Sky / UI shadow | `#2a1650` |
| Sunset magenta | `#b0407a` |
| Horizon / warm fog | `#ff9a3c`, `#e9784a` |
| Cream UI / lane paint | `#f4e9d8` |
| Red roadster | `#e8344e` |
| Gold coins / primary action | `#ffd23f` |
| Asphalt | `#4a4458` |
| Cones | `#ff6a1a` |
| Neon / hover | `#35e0ff`, `#ff4fd8` |
| Battery / toggle green | `#74d820` |
| Patrol navy | `#293d65` |

Hex values are the design targets in the prompts; rendered highlights, gradients and JPEG pixels vary.

## What to simplify for the game

- Preserve the existing 5,460-triangle player and 5,744-triangle police geometry. Do not rebuild photoreal detail from these illustrations.
- Build shops from shared low-poly modules; instance trees, planters, lights, coin rings and lane markings. Simplify foliage to a few faceted masses, with no individual leaves or flowers required at distance.
- Use the existing sky shader and fog for atmosphere. Paint warm/cool accents into palette materials; limit bloom to coins, pickups and lamps. Avoid expensive real reflections and many shadow-casting point lights.
- The illustrated Capitol is an aspirational landmark silhouette. Use the existing licensed/stylized game asset; do not copy the generated facade window-for-window. Keep skyline silhouettes simple and separable.
- Reuse the pooled vapor system for jump effects. Prioritize the broad ground burst and a clear car silhouette; tune transparent overdraw on phone.
- Implement UI as crisp responsive DOM/SVG with a licensed rounded font, simple borders and shadows. The bevels here are style targets, not a requirement to ship full-screen bitmap controls.
- Mirror is a concept: Claude should choose a low-cost small render target or a simplified chase indicator after profiling. Keep it away from the road's focal area. Preserve the actual friendly chase rules.

## Generation and review

Used the built-in imagegen tool, four initial generations and four targeted refinements. The opening image anchored the gameplay art direction. Corrected an oncoming police car in the sunset scene, removed literal owl figures from skyline landmarks, unified the score/battery/footer UI, reduced the jump banner and chase mirror, and retained the reference car design. Final images were only resampled to the delivery resolution and JPEG-encoded after generation; no manual scene edits were applied outside imagegen.

Full initial and correction prompts, input roles and original output paths are recorded in `agents/codex/prompts/03-polished-game-mockups.md`. Original generation files remain in the tool output directory; the repository JPEGs are self-contained and do not depend on those paths.

Visually reviewed text, car silhouette, three-lane perspective, obstacle readability, battery states, police positioning and UI safe margins. Image dimensions and byte sizes were checked. No game code was changed and no claim is made about runtime performance of the illustrative rendering.

## Handoff

Route through #16 under COLLAB.md. The board CLI still returns `unknown owner type`; the issue comment is the handover. Ask Ofir whether this cohesive visual direction should become the implementation target before treating the older look-and-feel selection as settled. The standalone skyline silhouette sheet from the older brief is not part of this direct screen-mockup request.
