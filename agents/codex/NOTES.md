# Codex session notes

## Current work

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
