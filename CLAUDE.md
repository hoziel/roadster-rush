# Roadster Rush: Austin

A casual, Subway Surfers–style endless runner for a young kid: drive an electric roadster through a stylized Austin (three lanes, swipe to steer and jump, coins, power-ups, kid mode on by default). Browser, mobile-first, built with Three.js + TypeScript + Vite, hosted free on GitHub Pages. No ads, accounts, tracking or network calls. Ofir builds it solo with AI coding agents.

## Key files
- `SCOPE.md`: the initial scope (concept, Austin look, tech stack, architecture, budgets, assets, roadmap, risks). Source of truth for direction until a vision doc replaces it
- `TODO.md`: next steps
- **About Ofir** (skills, time, goals): `../ofir-master/knowledge/me.md`
- The initiative record lives in master: `../ofir-master/initiatives/roadster-rush/`. Update its decision log and the catalog (`../ofir-master/INITIATIVES.md`) when major decisions are made here.

## Current goal: Phase 0 (Skeleton)
Vite + TS + Three.js project that deploys to GitHub Pages and loads on a phone.

## Working rules
- Keep `src/sim/` free of Three.js imports so the rules stay unit-testable (Vitest).
- Public repo: commit only CC0/CC-BY assets; credit every CC-BY asset in `CREDITS.md` and the in-game Credits screen.
- Tesla brand terms (Roadster styling, Autopilot, Ludicrous, Supercharger) are fine while private; rename them before going public (see `SCOPE.md` → Risks).
- Respect the budgets in `SCOPE.md`: 60 fps on an iPhone 11–class phone, under 100 draw calls, first load about 5–6 MB.
- Don't propose time-boxed plans. Ofir defines phases and reviews results.
- Refer to Ofir by name, not with gendered pronouns.
