# Claude notes

Claude's long-term memory is outside the repo (~/.claude). This file holds orchestration state other agents may want to see.

## Current state (2026-11-09)
- Grey-box game feature-complete through M4 code: endless run, kid-mode batteries, police chase, 4 power-ups,
  chunk library, day/night cycle, landmarks, Bat Swarm, garage (wallet, drivers, paints, horns, hat), music + SFX,
  PWA, credits, roadside props (cacti, food trucks).
- Blocked on art direction: Codex #42 (look-and-feel A/B/C) is waiting for Codex's sandbox to allow writes.
  All colors/sizes are named constants so the chosen direction can be applied.
- Waiting on Ofir: phone playtests (#4, #12, #27, #37), 13 manual asset downloads (assets-src/README.md),
  real driver characters (#31), the silent-switch decision for audio.

## Next for Claude
- After #42 is decided: update the style guide, unblock #14/#16, then #19 (hero car) and #20 (postcard).
- Bull and bat models are optimized but not placed in the game yet (longhorn crossing, bat GLB vs code bats).

## Nov 9 evening (Ofir's requests, all merged on main)
- Kickflip jump (roll along the length + thruster puffs), hover button (pickups bank ≤3 charges, 8 s), harmless 4 s police chase at run start.
- Kenney buildings/police (90%)/street lights/trees, real Capitol (CC-BY, credited), tube tunnels (camera rolls), Driver + Sound buttons (music/effects switches), Kenney SFX + jingles + EV clip.
- Decisions (Claude's call, Ofir delegated): police 0.9 scale, keep palms, keep green roofs; every run ends with a jingle (unanswered, default).
- Open: offline play needs https hosting (Ofir choosing: Cloudflare/Netlify/Tailscale/Capacitor). Codex has committed #42 mockups but hasn't handed the turn back. Phone playtest of everything pending; triangles ~100k.

## Nov 10
- Ofir 1A/2A/3A: Codex roadster + police roadster integrated (d00adae, `src/view/roadster.ts`, `policeRoadster.ts`), merged per material (~7 draws each), glass 45% opacity, driver in left seat, Kenney police.glb removed, soft billboard vapor in puffs.ts. Draws 47–66 in play.
- 03-austin-stretch is the visual target; #20 (Turn Claude) carries the restyle: HUD, title card, palette, bigger air. #14–17, #19, #42 closed; Codex told to stop #42 (A/B.png still uncommitted, Codex's call).
