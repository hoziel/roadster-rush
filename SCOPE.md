# Roadster Rush: Austin

A casual, Subway Surfers–style endless runner for kids. You drive an electric roadster through a stylized Austin.

- **Platform:** browser, mobile-first (portrait, touch); desktop works too
- **Hosting:** free static hosting (GitHub Pages; Cloudflare Pages as a fallback)
- **Audience:** a young kid. No ads, accounts, tracking or network calls.
- **Mockup:** https://claude.ai/artifact/E2gHYnsEDPFJBdmLTRTt8s

---

## Concept

- Three lanes. Swipe left or right to steer and swipe up to jump. Arrow keys or WASD on desktop.
- Collect coins and dodge cones, food trucks, barriers and the occasional longhorn.
- Speed ramps up gently and then levels off.
- **Kid mode is on by default.** A crash uses up one of three "batteries" instead of ending the run. A run ends with "Great drive!", never "Game over".
- Unlocks are cosmetic only: paint colors, horns, a cowboy hat.

### Power-ups
| Power-up | Effect |
|---|---|
| Ludicrous Mode | ~5 s speed boost, can't crash, collects coins in your lane |
| Autopilot | ~8 s of auto-steering toward coins and away from obstacles |
| Supercharger | Refills a battery |
| Bat Swarm (Austin) | At dusk on the Congress Ave bridge, bats scatter coins across all lanes |

---

## Austin: vibe, not a map

There's no real geography. The scene is built from a palette, landmark silhouettes and props.

- **Sky:** a sunset gradient shader (purple → orange). It's generated in code, so there's nothing to download.
- **Vista:** the road runs toward the Capitol dome.
- **Skyline silhouettes:** Frost Bank "owl" tower, the Austonian, the 360 Bridge arch, a Gigafactory block.
- **Stretches:** SoCo neon, Sixth Street string lights, Lady Bird Lake water.
- **Props:** food trucks, scooters, cacti, cones, a longhorn.
- **Sound:** a CC0 menu track, an EV acceleration sound for the boost, and a motor whine generated in code that rises with speed.

---

## Tech stack

| Layer | Choice |
|---|---|
| Rendering | Three.js (WebGL 2; WebGPU optional later) |
| Language / build | TypeScript + Vite |
| Game logic | Custom 3-lane sim with box collisions. No physics engine. |
| Input | Native Pointer Events (swipe), keyboard |
| Audio | Howler.js or raw Web Audio (unlocked on the first tap) |
| Offline / install | vite-plugin-pwa (Workbox precache, manifest) |
| Assets | glTF/GLB, compressed with gltf-transform (Meshopt + KTX2) |
| Tests | Vitest on the sim layer |
| Deploy | GitHub Actions → GitHub Pages |

**Why not Godot or Unity?** Their web builds are about 40 MB or more before any game content. That's too heavy for "tap a link and play" on a phone.

### Architecture
- **`sim/`**: pure game rules (lanes, spawning, collisions, difficulty, power-ups). No Three.js imports, so it's fully unit-testable.
- **`view/`**: rendering, camera, object pools, scenery.
- **Treadmill world:** the car stays near the origin and the world scrolls toward it.
- **Chunks:** 15–30 hand-made 40 m track segments, defined in JSON and tagged by difficulty. A check makes sure at least one lane is always passable.
- **Scenery:** buildings and landmarks run on a separate side track, so landmarks show up on their own timer.
- **Performance:** instancing and pooling, so nothing is created or destroyed during a run. One light, fog to hide pop-in, a pixel-ratio cap, and adaptive quality.

### Budgets (targets)
- 60 fps on an iPhone 11–class phone
- Under 100 draw calls and under 150k visible triangles
- First load of about 5–6 MB total (JS about 0.6 MB, models 2–3 MB, textures 1–2 MB, audio about 1 MB)

---

## Assets (all free)

- **World and traffic:** Kenney Car Kit, City Kit (Commercial), City Kit (Roads) (all CC0)
- **Props, cacti, cow (becomes the longhorn):** Quaternius / Poly Pizza (CC0)
- **Player car:** a low-poly Roadster from Sketchfab (6k triangles, CC-BY), or a stylized look-alike
- **Capitol:** a low-poly Sketchfab model (CC-BY). The other landmarks are simple hand-made silhouettes.
- **Textures:** Poly Haven, ambientCG (CC0)
- **Audio:** Kenney SFX, a CC0 EV acceleration clip from Freesound, CC0 music
- **Fonts:** Fredoka (OFL), self-hosted

Every CC-BY asset gets credited on an in-game Credits screen and in `CREDITS.md`.

---

## Roadmap

| Phase | Scope | Effort |
|---|---|---|
| 0: Skeleton | Vite + TS + Three.js, Pages deploy, loads on a phone | 1 evening |
| 1: MVP | Road, lanes, swipe, car, coins, cones, speed ramp, best score, motor whine | 1 weekend |
| 2: Austin v1 | Chunks, skyline and landmarks, power-ups, kid mode, audio, PWA, credits | 2–4 weekends |
| 3: More scenes | Theme packs (Gigafactory interior, space, other cities), car customizer, daily seed | Ongoing |

---

## Repo layout

```
roadster-rush/
├─ .github/workflows/deploy.yml
├─ public/
│  ├─ icons/              # PWA icons
│  ├─ basis/              # KTX2 transcoder
│  └─ themes/austin/      # models, audio, chunks.json
├─ assets-src/            # raw source assets (CC0/CC-BY only, since the repo is public)
├─ scripts/optimize-assets.mjs
├─ src/
│  ├─ sim/                # rules, no three.js
│  ├─ view/               # rendering
│  ├─ input/  audio/  ui/
│  ├─ storage.ts          # localStorage
│  └─ main.ts             # state machine + loop
├─ tests/
└─ CREDITS.md
```

---

## Risks and notes

- **Trademarks:** Tesla, Roadster styling, Autopilot, Ludicrous and Supercharger are Tesla brand terms. That's fine for a private game. If the game ever goes public, rename them (for example Volt Roadster, Turbo Boost, Auto-Steer, Charge Station), drop the logos and don't monetize.
- **Public repo:** a free GitHub Pages site needs a public repo, so commit only CC0/CC-BY assets. Royalty-free and Pixabay files stay out.
- **iOS Safari:** older iPhones have no WebGPU and limited memory, the silent switch can mute audio, and there's no true fullscreen. To handle this: use WebGL 2, keep textures small, add a visible mute toggle, and test on the oldest device you have.
