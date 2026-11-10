# Codex session notes

## Current work

- Ofir said the four polished opening/gameplay mockups are “perfect.” That visual direction is accepted; approval recorded on #16. New driver-selection screen uses that direction, while its character artwork is still placeholder/review material.
- Latest screen: `art/mockups/04-driver-select/driver-select.jpg`, using the existing Zoom/Bolt/Sunny/Pip roster from `src/ui/drivers.ts`; handoff on #32.
- Latest screen set: four polished imagegen mockups in `art/mockups/03-austin-stretch/` (opening, sunset run, thruster jump, neon chase), with review gallery and build notes. Directly requested by Ofir; handoff on #16.
- Latest variant: `art/mockups/02-police-roadster/`, a native police wrapper around the polished Revision 4 player body. Directly requested by Ofir; issue #15.
- Latest deliverable: Revision 4 of `art/mockups/01-player-roadster/`, an in-place polish replacing Revision 3. See the latest entry below.
- Issue #42: look and feel directions A/B/C, brief `art/briefs/00a-look-and-feel.md`.
- Mockups are in `art/mockups/00a-look-and-feel/` with gameplay frames, matching four-view car sheets, and direction notes.
- The launch reference is the October 15, 2026 Roadster event and its later kickflip POV clip. Use the stunt only as broad gameplay inspiration; do not copy Tesla's exact car shape, badges, logos, or source imagery.

## Project workflow

- Read `COLLAB.md`, this file, `CLAUDE.md`, `SCOPE.md`, and `art/briefs/00-style-guide.md` before art work.
- Work only in `art/mockups/**` and `agents/codex/**`; stage and commit only those paths.
- Issue #42 is assigned to Codex per its issue body. The prescribed `gh project item-list` query failed with `unknown owner type`, and `--owner @me` could not connect to GitHub. Project Turn/Status fields could not be verified or changed in this session; handoff is recorded in the issue comment.
- At session start there were unrelated uncommitted changes in `src/view/scene.ts`, `src/view/puffs.ts`, and four root demo/building assets. Leave them untouched.

## November 9, 2026 — native object follow-up

- Ofir rejected the existing #42 mockups. No overall style approval should be inferred.
- Ofir then requested Tesla Roadster visual/stunt references and explicitly asked for a 3D object in the project's format.
- Created `art/mockups/01-player-roadster/roadster.ts` with a structural `CarParts` interface, 3,016 triangles, 19 meshes, separate wheels and four thruster sockets. Includes a Vite preview and five actual-render screenshots.
- Kept all work in owned paths. Existing modified A.png/B.png and root demo assets were left untouched.
- #14's latest prior comment holds it pending #42. This is a directly requested object study, not completion of that held brief. Handoff includes CarStyle overlay, driver position, collision-fit and honk-transform integration concerns.
- Strict TypeScript check passed; browser views, paint change and jump/landing inspected. Preview server on 127.0.0.1:5174 for this session.
- Board query still fails `unknown owner type`; use comment-only handoff per COLLAB.md §3.


## November 9, 2026 — Revision 2 after explicit reference approval

- Ofir rejected the first procedural object for not looking like the Roadster. Acknowledged that Revision 1 was built from broad descriptions, not a specific inspected photo.
- Opened the actual Auto Express `New Tesla Roadster.jpg` front three-quarter photo in the browser and displayed it in chat. Ofir said yes to that specific design reference.
- Rebuilt owned `01-player-roadster` object: integrated fenders, tapered wedge nose, closed dark canopy, aero wheels. 3,264 triangles / 18 meshes / 6 materials; silver preview, red default builder. Refreshed screenshots, added red and tight detail views.
- Current user preference is the approved canopy silhouette; old open-top/visible-driver brief needs reconciliation by Claude. No claim of final art approval or full-game integration.
- Strict TypeScript and browser inspection passed; source is still an isolated object study under art/mockups. Existing unrelated changes remain untouched.


## November 9, 2026 — Revision 3, doors and vapor

- Ofir requested closer resemblance, opening doors, and much more thruster air graphics.
- Rebuilt longer/wider body-canopy proportions, front light/fascia and fender joins. Added 2 actual butterfly door pivots carrying windows/trim/mirrors and exposed cabin. API: doors + setDoorOpen(0..1).
- Added reusable `thruster-vapor.ts`: 640 pooled soft billboards, one draw call, dense takeoff/landing clouds and repeated roll/lift jets. Preview has Open/Close doors alongside kickflip.
- Model now 4,120 triangles / 27 meshes / 7 materials, closed bounds ~1.876×1.084×3.674. Integration needs lane/collision and mobile overdraw checks.
- Strict TS, finite mesh data and exact door open/close checks passed. Browser interactions and shader rendering checked; no browser errors. Refreshed render screenshots plus doors-open.png and vapor.png.
- No visual approval yet; handoff to Claude on #14 is for review/integration planning, not a direction sign-off.

## Explicit handoff

Ofir requested “Let Claude know and pass the asset.” Posted a fresh [codex → claude] handoff on #14 identifying commit 69a194a, native builder and vapor APIs, preview route, validation and integration concerns. Asset is in the shared checkout; Claude owns pushing/integration. Do not infer final visual approval from the handoff request.

## November 9, 2026 — Revision 4 polish and replacement

- Ofir asked to polish the design and override the old. Replaced the existing roadster source and all nine render PNGs in the same folder, superseding Revision 3. Rounded tires, swept alloy spokes/recessed wheels, crowned door panels, finer seams/handles/mirrors, tapered bumper details, rear ducktail/diffuser and smooth canopy highlights.
- Current car: 5,460 triangles / 27 meshes / 7 materials; bounds ~1.892×1.084×3.666. Paint remains Toon; glass/alloy use Phong. Same doors, wheels and thruster APIs; reusable vapor effect unchanged.
- Preview has clean studio shading and a Save image export. All landscape renders 1200×800, gameplay 540×1170. Preview disables self-shadow reception to avoid jagged edges while retaining the ground shadow; builder shadow flags remain available for game tuning.
- Strict TypeScript, finite geometry, door round trip and diff checks passed. Browser verified fixed views, paint, opening doors, takeoff vapor and return to ground, with no errors.
- Game player still used the grey-box builder at inspection. Tell Claude on #14 to integrate this current replacement rather than the prior 69a194a asset; original overlay/plate/honk and closed-canopy driver-visibility decisions remain. No visual approval inferred.
- Board inbox recheck still fails `unknown owner type`, so inbox cannot be verified empty; use comment-only handoff per COLLAB.md §3. Existing look-and-feel A/B changes and root demo media remain untouched.
- Replacement committed as `ccdbff6` (not pushed). Posted the superseding integration handoff on #14: https://github.com/hoziel/roadster-rush/issues/14#issuecomment-6759243504 . Car paths are clean after commit. Driver visibility under the closed canopy remains the question for Claude.

## November 9, 2026 — police roadster Revision 1

- Ofir directly requested a police version. Read brief 02 and #15; its earlier hold pending #14 does not block this direct instruction. No final approval inferred.
- Created `art/mockups/02-police-roadster/police-roadster.ts`: imports the current shared player factory, adds cream/navy paint, conformed gold door stars, a smiling fascia, chunky red/blue roof bar and grille lamps. Doors, wheels and thruster sockets retained; player source untouched.
- API: `buildPoliceRoadster()` extends RoadsterParts with `lightBar`, `setLights(bool)` and `updateLights(elapsedSeconds)`. Smooth 1 Hz alternating emission, no dynamic point lights or texture assets. All added resources handled by shared dispose.
- 5,744 triangles / 38 meshes / 11 materials; closed bounds ~1.892×1.295×3.674. Native Vite preview at `/art/mockups/02-police-roadster/` includes light toggle, doors, kickflip, exports and chase/rear-view composition.
- Nine PNGs: turnaround, lights-off, doors-open, vapor, portrait gameplay and chase. Landscape 1200×800; portraits 540×1170. All under 2 MB. Rear-view inset is a preview composition, not a game HUD change.
- Strict TypeScript, geometry/budget/door/light/disposal checks passed. Browser checked all views, controls and return to ground; no errors. Integration must adapt current buildPolice red/blue material handles and old police.glb loader. Whole-scene draw calls/vapor need phone profiling. Shared closed-canopy driver question remains.
- Board inbox and Status update both failed `unknown owner type`. Handoff through #15 comment per COLLAB.md §3; Claude owns game integration and pushing. Leave unrelated A/B images, src/tests and root demo files untouched.
- Asset committed as `4e1287f` (not pushed); handoff posted at https://github.com/hoziel/roadster-rush/issues/15#issuecomment-6759367419 . Final inbox recheck also failed; owned asset paths are clean.

## November 9, 2026 — polished opening and gameplay mockups

- Ofir requested a few super-polished opening/in-game mockups. Used the imagegen skill and built-in tool, with the current native roadster front/rear and police renders as references. Created four connected screens in `art/mockups/03-austin-stretch/`; original assets unchanged.
- Opening: car hero, Roadster Rush Austin title, Let's Drive, Garage/Drivers and enabled Kid Mode. Gameplay: sunset coin run, bridge thruster jump with large white air, and neon chase with police in rear-view mirror. Shared cream/plum HUD and passive Kid Mode indicator during play.
- Four initial images + four targeted refinements. Corrected oncoming police, skyline animal artifacts, inconsistent score/battery controls and oversized action UI. Final JPEGs 720×1560 (9:19.5), all under 0.5 MB. Static gallery at `/art/mockups/03-austin-stretch/`.
- Full prompt set saved in `agents/codex/prompts/03-polished-game-mockups.md`; notes document palette and low-poly/performance simplification. Images are visual targets, not actual gameplay screenshots; no implementation or final approval inferred.
- #16 previously held for #42, but current direct request authorizes these screens. Do not mark the old skyline brief complete (no standalone skyline sheet in this scope). Direction approval remains for Ofir. Board inbox/Status CLI unavailable (`unknown owner type`), comment-only handoff per COLLAB.md §3.
- Mockups committed as `7277db2` (not pushed). Handoff posted at https://github.com/hoziel/roadster-rush/issues/16#issuecomment-6759546952 ; question: should this sunset-to-neon visual system become the implementation target? Final inbox recheck failed again. `gallery.jpg` is the full-page browser screenshot of the review page (separate from the four generated portrait screens).

## November 10, 2026 — driver selection screen

- Ofir approved the prior mockups (“Mockups are perfect!”) and requested a matching driver selection screen. Recorded that direction decision on #16: https://github.com/hoziel/roadster-rush/issues/16#issuecomment-6765941850 . Claude should reconcile the style guide; earlier entries saying direction approval is open are historical.
- Read `src/ui/drivers.ts`: existing placeholder roster d1 Zoom/magenta, d2 Bolt/cyan, d3 Sunny/gold, d4 Pip/green. Used those identities/color targets; no real-person photos. Final characters remain Ofir's input under #31.
- Created one polished imagegen screen in `art/mockups/04-driver-select/`: selected Bolt waves beside the red roadster with one open butterfly door, 2×2 portrait cards, cyan selection plus checkmark, gold Let's Drive and passive Kid Mode. 720×1560 JPEG; prompt recorded in `agents/codex/prompts/04-driver-select.md`.
- One generation, visually reviewed and size-checked. Notes cover roster, palette, interaction and simplification. No native assets or game UI code changed. No paint-shop/license-plate deliverables implied by this partial #32 work.
- Board inbox and Status update failed `unknown owner type`; comment handoff per COLLAB.md §3. Preserve unrelated A/B images, root demo videos and Claude's new src/view roadster files.
- Driver screen committed as `480c65d` (not pushed); handoff posted at https://github.com/hoziel/roadster-rush/issues/32#issuecomment-6765989791 . Final inbox query failed again; owned task paths clean. Claude was concurrently changing game car integration/credits and had a staged police.glb deletion; leave those untouched.
