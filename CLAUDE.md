# Roadster Rush: Austin

A casual, Subway Surfers–style endless runner for a young kid: drive an electric roadster through a stylized Austin (three lanes, swipe to steer and jump, coins, power-ups, kid mode on by default). Browser, mobile-first, built with Three.js + TypeScript + Vite. The repo is private until Ofir decides to publish; then it goes public and is hosted free on GitHub Pages. No ads, accounts, tracking or network calls. Ofir builds it solo with AI coding agents.

## Key files
- `SCOPE.md`: the initial scope (concept, Austin look, tech stack, architecture, budgets, assets, roadmap, risks). Source of truth for direction until a vision doc replaces it
- **Board:** https://github.com/users/hoziel/projects/2 (issues by milestone M0–M5). `TODO.md` just points there.
- **Roles:** Claude orchestrates (owns the board, writes issues and Codex art briefs, reviews results) and does code (`agent:claude`). Codex makes art mockups (`agent:codex`). Ofir decides, playtests and signs off (`ofir`, column Review (Ofir)).
- **About Ofir** (skills, time, goals): `../ofir-master/knowledge/me.md`
- The initiative record lives in master: `../ofir-master/initiatives/roadster-rush/`. Update its decision log and the catalog (`../ofir-master/INITIATIVES.md`) when major decisions are made here.

## Current goal: Phase 0 (Skeleton)
Vite + TS + Three.js project that loads on Ofir's phone from the dev server over home Wi-Fi (`vite --host`).

## Working rules
- **Codex shares this folder.** The coordination protocol is `COLLAB.md`: board field **Turn** (Claude/Codex/Ofir) is the assignment, and talk happens in issue comments with `[from → to]` headers. Check cards with Turn = Claude at session start. Codex writes only in `art/mockups/` and `agents/codex/`. Claude never edits those, stages its own files by path (no `git add -A` / `git add .`), and pushes for both.
- Keep `src/sim/` free of Three.js imports so the rules stay unit-testable (Vitest).
- The repo is private now but goes public at publish, with its full history: commit only CC0/CC-BY assets from day one; credit every CC-BY asset in `CREDITS.md` and the in-game Credits screen.
- Tesla brand terms (Roadster styling, Autopilot, Ludicrous, Supercharger) are fine while private; rename them before publishing (see `SCOPE.md` → Risks).
- Respect the budgets in `SCOPE.md`: 60 fps on an iPhone 11–class phone, under 100 draw calls, first load about 5–6 MB.
- Don't propose time-boxed plans. Ofir defines phases and reviews results.
- Refer to Ofir by name, not with gendered pronouns.
