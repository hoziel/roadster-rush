# Driver models — Revision 1 quality test

Issue #46, November 10, 2026. **Verdict: these models do not meet the requested “perfect likeness” bar. Do not replace the illustrated driver heroes with them.** The native geometry, joint hierarchy and poses are useful prototypes, but the faces, hair and clothing still need a dedicated character-sculpting pass. Full-size seated compatibility also fails with the current roadster.

## References and output

Inspected all eight supplied references: `assets-src/drivers/{nevo,ori,shiri,ofir}-full.jpg` and `public/drivers/{nevo,ori,shiri,ofir}.jpg`. The full-body artwork wins where there are differences. No new personal photos, downloaded meshes, image textures, traced face maps, logos or lettering were added to the models. Comparison sheets show the existing supplied artwork separately from the models; any marks in those reference panels are absent from model geometry.

- `drivers.ts`: `buildDriver(id, pose)` for all four drivers, shared sculpting helpers and palette definitions.
- `index.html` / `preview.ts`: interactive orbit preview, driver selection, fixed views, standing/seated poses, a wave, and roadster compatibility views.
- `gallery.html`: review gallery with every exported view and links to the likeness comparisons.
- `comparison.html?driver=nevo` (also `ori`, `shiri`, `ofir`): supplied artwork and actual model renders side by side.
- `{id}-{front,three-quarter,side,back,face,seated}.png`: six actual WebGL renders per driver, 1000×1000. The extra back and face views help expose silhouette/likeness limitations.
- `{id}-comparison.png`: four labeled likeness sheets, browser captures of the comparison page.
- `lineup.png`: all four at their measured standing heights, 1600×900. From the front camera, left to right: Ofir, Shiri, Ori, Nevo.
- `nevo-door.png`: full-height Nevo beside the roadster with butterfly doors open.
- `nevo-chase.png`: 540×1170 chase view with the original opaque canopy retained. Nevo is reduced to 66% size and concealed by the roof. This does not demonstrate a successful visible driver integration.
- `nevo-cutaway.png`: diagnostic cabin view, 66% Nevo size, glazing hidden. The hands still fall short of the wheel; it is not a production pose.
- `nevo-seat-full.png`: actual-size seated test with the original glazing retained. The head intersects the canopy, documenting the fit failure.
- `validate.mjs` / `validation.json`: reproducible geometry and pose checks and their measured output.

All 33 PNGs are below 2 MB. These are native model renders and browser review sheets, not imagegen artwork or production-game screenshots.

## Honest likeness verdicts

| Driver | Cues captured | Why it does not pass |
|---|---|---|
| Nevo | Child scale, dark factory coveralls, red trim, forehead goggles, brown quiff, friendly smile | Face/jaw and eye spacing are generic; the quiff is too rigid and the goggles are an opaque approximation of the reference's safety-goggle shape. Clothing lacks the reference's softer folds and pocket tailoring. |
| Ori | Child scale, green eyes, center-parted brown hair, red/gold suit | Hair is made of narrow swept strips instead of the full flowing silhouette; cheek contour, brows and confident expression differ. The suit is too clean and cylindrical. |
| Shiri | Adult scale, blonde/brown hair, freckles, sunglasses on the head, charcoal/gold suit, open smile | Face planes and smile are simplified. Hair does not have enough wave or mass. The body and shoulders look like a generic toy rig rather than the supplied character. |
| Ofir | Adult scale, dark glasses, brown quiff, beard, silver/orange space suit and shoulder hoses | Beard is a broad vertex-color treatment, not the reference's close stubble. Jaw, nose, glasses and hair proportions need sculpting. Suit proportions and details are still schematic. |

Color/accessory cues distinguish the four at small size, but that is not enough to claim recognizable personal likeness. The front/side comparisons are deliberately included to make this shortfall reviewable. Primitive joints and layered hair can also show seams or abrupt transitions in close inspection; no claim of flawless surface continuity is made.

## Geometry, scale and API

All models use metres, +Y up and face **-Z**. Standing soles are on y=0. Each contains 11 articulated meshes sharing **one opaque `MeshToonMaterial` with vertex colors**, no maps, no transparency. The measurements include the raised waving hand and hair.

| Driver | Triangles | Standing W × H × D | Seated W × H × D |
|---|---:|---|---|
| Nevo | 7,240 | 0.828 × 1.280 × 0.330 m | 0.503 × 1.059 × 0.596 m |
| Ori | 6,928 | 0.881 × 1.330 × 0.365 m | 0.535 × 1.097 × 0.668 m |
| Shiri | 7,255 | 1.101 × 1.750 × 0.387 m | 0.647 × 1.386 × 0.813 m |
| Ofir | 6,508 | 1.136 × 1.750 × 0.377 m | 0.684 × 1.386 × 0.833 m |

`buildDriver('nevo', 'standing')` returns `{ group, joints, setPose, setWave, dispose }`. The joints expose pelvis, torso, head, two shoulders, two elbows, two hips and two knees. Geometry is merged within each articulated part. `setPose('standing' | 'seated')` resets the joint rotations and builder normalization; preserve any application placement on the outer group and apply an additional wrapper if the app needs another independent scale. `setWave(angle)` modifies the standing left elbow; restore with `setPose('standing')`. Head turns can be applied through `joints.head.rotation.y` after setting the pose.

The seated root is approximately at the seat-contact plane; the feet extend below it. `validation.json` includes the exact min/max bounds for each pose. `dispose()` frees all owned geometry and the one material exactly once, even if called twice. Remove the group before disposal; do not dispose resources while a consumer still shares them.

## Roadster fit is not solved

The current `01-player-roadster/roadster.ts` has no exported `seat` anchor. Its left seat cushion is centered at (-0.33, 0.38, 0.13), with a top at y=0.43. Its wheel is near (-0.33, 0.65, -0.34), and the canopy reaches only about 1.084 m at its highest point. These measurements were read from the actual source.

At the preview mounting point (-0.33, 0.43, 0.22), Nevo's actual-size seated top is about 1.260 m; the adult tops are about 1.426–1.429 m. Their heads therefore exceed the roof. The adult footwell placement also needs work. The original canopy is opaque, so a correctly contained character would remain largely invisible from the chase camera.

The preview demonstrates reduced toy scale (Nevo 66%, Ori 65%, adults 55%) only to inspect a possible cabin composition. This reduction does **not** satisfy consistent standing/seated physical scale, and does not solve hand-to-wheel contact. It must not be silently adopted. A production solution needs an agreed cabin/character proportion change, a driver-seat anchor and a targeted seated rig. The roof/visibility choice must be resolved as part of that work.

## Palette

| Driver | Skin / blush | Hair / highlight | Suit / trim / accent | Iris |
|---|---|---|---|---|
| Nevo | `#eab08b` / `#d98f76` | `#493124` / `#73503a` | `#323f49` / `#df4942` / `#64717a` | `#593a2b` |
| Ori | `#edb391` / `#d68b73` | `#493024` / `#966039` | `#e64730` / `#eabd51` / `#29394a` | `#318c78` |
| Shiri | `#edbd9e` / `#d99b83` | `#92653e` / `#d7ae69` | `#303b4b` / `#d3a456` / `#5e6976` | `#94734d` |
| Ofir | `#dca382` / `#be8069` | `#49352b` / `#8d694b` | `#b6c6d5` / `#e88741` / `#40556d` | hidden by glasses |

Shared face ink `#242936`, eyes/teeth `#fff3df`, sunglass lenses `#35465a`, opaque goggle lenses `#b7ccd2`, Ofir stubble `#705345`, soles `#202831`. Full boot/detail values are in `DRIVER_PALETTES` and the builder. Colors are authored in sRGB and converted by Three.js for vertex colors.

## What would improve the result

Keep the approved 2D driver/car heroes in the interface for now. For a higher-quality 3D attempt, make one character the approval gate: sculpt the face from front/three-quarter/side targets, build connected eyelid/lip/jaw topology and shaped hair masses, then tailor the suit and hands. Retopologize and rig that approved character within the same mobile budget before extending the method to the other three. A sculpting workflow with explicit vertex control is better suited to this than more layers of primitives; it could export GLB or authored vertex buffers if TypeScript-only delivery must remain.

Separately, reconcile the cabin and character scales and build the seated pose against an actual seat/wheel anchor. Those changes belong to Claude's code/brief ownership. Neither a sculpting pass nor a higher triangle budget guarantees the requested likeness; Ofir's side-by-side review remains the acceptance test.

## Validation and Revision 1

- Strict TypeScript checks passed for `drivers.ts` and `preview.ts`.
- `node art/mockups/07-driver-models/validate.mjs` passed: finite positions/normals/colors, color ranges, triangle/material budgets, exact standing heights and ground plane, standing → seated → standing matrix restoration, wave joint response, idempotent disposal.
- Visually inspected the standing, side, facial and seated renders and all four reference comparison sheets. Refined hair clearance, beard construction, eyewear, facial proportions and Shiri's smile after the first review. Browser review also exposed the cabin size/visibility failure; it is retained as explicit evidence.
- Numeric tests do not prove likeness, lack of mesh intersections, production phone performance or production-game integration. No application source, public assets or reference files were changed.

Question handed to Claude: keep the 2D heroes as the production path, or scope a sculpted-character pass and a cabin/seat redesign with Ofir before attempting another 3D revision?
