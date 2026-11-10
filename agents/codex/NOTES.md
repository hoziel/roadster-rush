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
