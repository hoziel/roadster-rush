# Roadster Rush: Austin

A casual, Subway Surfers–style endless runner for kids. You drive an electric roadster through a stylized Austin.

- **Platform:** browser, mobile-first (portrait, touch); desktop works too
- **Hosting:** the repo stays private until Ofir decides to publish. Until then, play it on the phone from the Vite dev server over home Wi-Fi. At publish time: make the repo public and deploy to GitHub Pages (Cloudflare Pages as a fallback)
- **Audience:** a young kid. No ads, accounts, tracking or network calls.
- **Mockup:** https://claude.ai/artifact/E2gHYnsEDPFJBdmLTRTt8s

---

## Concept

- Three lanes. Swipe left or right to steer and swipe up to jump. Arrow keys or WASD on desktop.
- Collect coins and dodge cones, food trucks, barriers and the occasional longhorn.
- **Endless:** a run can go on forever. The longer you play, the faster it gets, up to a fixed top speed that stays playable for a young kid. After that it stays at that speed.
- **Police chase:** a friendly police roadster follows behind you. After a crash it pulls up close for a few seconds. Crash again while it's close and it catches you, which ends the run. Otherwise it drops back.
- **Kid mode is on by default.** A crash uses up one of three "batteries" instead of ending the run. A run ends with "Great drive!", never "Game over".
- **Choose your driver:** the start screen shows a few preset driver characters, which Ofir will supply later. There's no photo upload. The chosen driver shows in the car and on the "Great drive!" screen.
- **Paint shop:** spend coins on paint colors (solid, metallic, neon, patterns). The car is previewed on a turntable.
- Other unlocks are cosmetic only: horns, a cowboy hat. Nothing affects gameplay.

### Power-ups
| Power-up | Effect |
|---|---|
| Ludicrous Mode | ~5 s speed boost, can't crash, collects coins in your lane |
| Autopilot | ~8 s of auto-steering toward coins and away from obstacles |
| Supercharger | Refills a battery |
| Hover | Pick up a hover pad and the roadster floats for a few seconds, gliding over ground obstacles (cones, barriers) and grabbing coins. When it lands, it's back on the road. |
| Bat Swarm (Austin) | At dusk on the Congress Ave bridge, bats scatter coins across all lanes |

### Wow factors
- **Bat Swarm:** at dusk on the Congress Ave bridge, bats burst out and rain coins.
- **Sunset to night during a run:** the sky darkens and the SoCo neon and Sixth Street lights switch on.
- **Ludicrous rush:** a speed burst with an EV acceleration sound.
- **Hover:** the car floats over everything.
- **Police chase:** lights flashing in the mirror, with the tension of "don't crash twice".
- **Honk button:** tap the car to honk. Unlockable horns.
- **Pick your driver:** a character on the driver card and in the car, and the driver's name on the license plate.
- **Big "Great drive!" finish:** confetti, a coin count-up and a new-best fanfare.
- **Motor whine:** generated in code, rising in pitch with speed.

### Open questions
- **Driver characters:** Ofir will supply them. If any are based on real photos of the kids, keep them out of the repo (it goes public with its full history).

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
| Deploy | Until publish: Vite dev server on the home network. At publish: GitHub Actions → GitHub Pages |

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

Full use-vs-build table with verified licenses: `ART_SOURCES.md`.

- **World and traffic:** Kenney Car Kit, City Kit (Commercial, Suburban, Roads), Nature Kit (all CC0). Kenney is the base family.
- **Props, cacti, bull (becomes the longhorn), bats, food truck:** Quaternius / Poly Pizza (CC0), the second family, remapped to the same palette
- **Player car:** an original roadster built from a Codex mockup. The Tesla-shaped Sketchfab model is a trade-dress risk once public, so it's a private stand-in at most.
- **Capitol:** "Texas State Capitol" by bartdenny on Sketchfab (CC-BY 4.0, 3.2k faces). The other landmarks are code-built silhouettes.
- **Avoid:** "Bevo" longhorn models (UT trademark), anything NC, ND or SA, and Sketchfab Standard.
- **Textures:** Poly Haven, ambientCG (CC0)
- **Audio:** Kenney SFX, a CC0 EV acceleration clip from Freesound, CC0 music
- **Fonts:** Fredoka (OFL), self-hosted

Every CC-BY asset gets credited on an in-game Credits screen and in `CREDITS.md`.

### Art direction and production
- **Look:** stylized low-poly with flat or toon shading, one shared palette texture, and lighting from the sunset shader and fog. Gameplay pieces (coins, power-ups, hover pads) are bright and bouncy.
- **Approach:** a hybrid. Filler comes from CC0 kits of one family (Kenney first) recolored to the palette. Sky, road and landmark silhouettes are built in code or simple shapes. Hero assets (roadster, police roadster, Capitol, longhorn, food truck) are custom.
- **Mockups:** Codex makes the art mockups for new things. Claude builds them in code afterwards.
- **Prefer existing public art** over making new art, but only with verified rights: CC0 or CC-BY (credited), or a license that allows commercial use and redistribution in a public repo. Record the source URL and license for every asset in `CREDITS.md` when it's added.
- **Postcard pass before Phase 2:** one polished stretch of road for Ofir to approve, then everything is produced to match it.

---

## Roadmap

| Phase | Scope | Effort |
|---|---|---|
| 0: Skeleton | Vite + TS + Three.js, loads on a phone over home Wi-Fi | 1 evening |
| 1: MVP | Road, lanes, swipe, car, coins, cones, endless speed ramp, best score, motor whine, honk | 1 weekend |
| 2: Austin v1 | Chunks, skyline and landmarks, power-ups (incl. Hover), police chase, kid mode, driver select (preset characters), paint shop, sunset-to-night, "Great drive!" finish, audio, PWA, credits | 2–4 weekends |
| 3: More scenes | Theme packs (Gigafactory interior, space, other cities), car customizer, daily seed | Ongoing |

### Milestones
Each milestone ends with something Ofir can try on a phone and sign off. They're tracked as GitHub milestones on the board, with no dates.

| # | Milestone | Done when |
|---|---|---|
| M0 | Skeleton | A spinning cube on the sunset sky loads on Ofir's phone over home Wi-Fi. Vitest runs. |
| M1 | Playable grey box | Endless 3-lane run with swipe and jump, coins, cones, speed ramp with a cap, best score, motor whine, honk. Grey-box art. |
| M2 | Postcard | Codex mockups approved for the car, police car, a road stretch and the skyline. One polished stretch is playable and approved as the look. |
| M3 | Full game loop | Power-ups (Ludicrous, Autopilot, Supercharger, Hover), police chase, kid mode batteries, "Great drive!" finish. |
| M4 | Austin v1 | Chunk library, landmarks, Bat Swarm, sunset-to-night, driver select with Ofir's characters, paint shop, horns, full audio, PWA, Credits screen. |
| M5 | Publish | Tesla terms renamed, every asset's license checked and credited, repo public, GitHub Pages deploy. Only when Ofir decides. |
| Later | More scenes | Theme packs, car customizer, daily seed. |

### Who does what (board labels)
- `agent:claude`: code, technical design, asset integration, tests. Claude also orchestrates: it owns the board, writes the issues, hands art briefs to Codex and reviews what comes back.
- `agent:codex`: art mockups and concept images for anything new (car, characters, landmarks, UI screens, icons).
- `ofir`: decisions, playtests on the phone, sign-off on milestones and mockups.
- Type labels: `art`, `code`, `audio`, `decision`. Columns: Todo → In progress → Review (Ofir) → Done.

---

## Repo layout

```
roadster-rush/
├─ .github/workflows/deploy.yml
├─ public/
│  ├─ icons/              # PWA icons
│  ├─ basis/              # KTX2 transcoder
│  └─ themes/austin/      # models, audio, chunks.json
├─ assets-src/            # raw source assets (CC0/CC-BY only, since the repo goes public at publish)
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

- **Trademarks:** Tesla, Roadster styling, Autopilot, Ludicrous and Supercharger are Tesla brand terms. That's fine for a private game. If the game ever goes public, rename them (for example Volt Roadster, Turbo Boost, Auto-Steer, Charge Station), drop the logos and don't monetize. Driver art: Nevo's picture shows sponsor logos (Goodyear and others) on the suit; review at publish.
- **Private now, public later:** the repo is private until publish. A free GitHub Pages site needs a public repo, and the whole git history becomes visible then, so commit only CC0/CC-BY assets from day one. Royalty-free and Pixabay files stay out.
- **iOS Safari:** older iPhones have no WebGPU and limited memory, the silent switch can mute audio, and there's no true fullscreen. To handle this: use WebGL 2, keep textures small, add a visible mute toggle, and test on the oldest device you have.
