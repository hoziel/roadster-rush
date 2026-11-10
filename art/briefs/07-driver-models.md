# Brief 07: 3D driver models, a quality test (issue #46)

Read `00-style-guide.md`, and look at your `01` player roadster (the butterfly doors and the seat).

**Why:** Ofir wants to know if the four drivers can be real 3D characters in the game, standing by the car and sitting in it. **This is a quality test:** we only use them if they're perfect. If you can't reach that bar, say so plainly in `notes.md`, and say what would get there. That answer is as useful as a model.

**References (in the repo, read them):**
- `assets-src/drivers/<id>-full.jpg`: full-body cartoon art of each driver.
- `public/drivers/<id>.jpg`: face crops.

| Driver | Look to match |
|---|---|
| Nevo (`nevo`) | Kid. Factory outfit with goggles (his new picture) |
| Ori (`ori`) | Kid. Outfit and hair as in her picture |
| Shiri (`shiri`) | Adult. Long blonde hair, sunglasses on her head |
| Ofir (`ofir`) | Adult. Beard, dark sunglasses |

Check each row against the picture, which wins over this table.

**What "perfect" means here:**
- Each one is instantly recognizable as that person's cartoon from the pictures: face shape, hair, skin tone, outfit colours, glasses or goggles, and proportions (kids vs grown-ups).
- Friendly, appealing, toy-like stylized 3D in the same family as the roadster (toon shading, chunky clean shapes). No uncanny realism.
- It reads well at game size: small next to the car from the chase camera, and larger in the garage turntable.
- Clean silhouettes, no gaps or z-fighting, and nothing poking through.

**Brands:** no logos, badges or text on clothes, even where the pictures have them.

**Technical:**
- One Three.js builder per driver, in TypeScript and built from code, like your roadster: primitives, merged or lathed geometry and vertex colours.
  - No downloaded models, no textures traced from the photos.
  - A small generated texture for the face (eyes, brows, mouth) is fine if it's yours.
- Scale and orientation:
  - Metres, +Y up, facing -Z.
  - Grown-ups about 1.75 m tall, kids about 1.2–1.35 m.
  - Each must also fit seated in the roadster's driver seat (`seat` in `roadster.ts`).
- Two poses:
  - **standing**: relaxed and proud, one hand on hip or waving.
  - **seated**: hands on the wheel area.
  - A simple joint hierarchy (head, arms, legs as groups) so I can switch poses and add a wave or head-turn.
- About **8,000 triangles or fewer** per driver, and **6 materials or fewer**. MeshToon, no transparency.
- Shared code for the common body is welcome. Build `buildDriver(id, pose)`, plus `dispose()`.

**Must show (PNGs):**
- Each driver from the front, 3/4 and side, standing.
- All four lined up together.
- Nevo standing next to the roadster with the driver's butterfly door open.
- Nevo seated in the roadster, seen from the chase camera.
- Each one side by side with their picture, for the likeness check.

**Deliver:** `art/mockups/07-driver-models/`:
- `drivers.ts`
- a preview
- the PNGs
- `notes.md` with:
  - triangles, meshes and materials
  - bounds
  - palette
  - your honest verdict on the likeness, per driver

Then comment `[codex → claude]` on the issue and set Turn = Claude.
