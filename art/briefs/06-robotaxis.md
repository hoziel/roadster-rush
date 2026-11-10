# Brief 06: Austin robotaxis, Cybercab and Waymo, plus the Cybertruck (issue #45)

Read `00-style-guide.md` and look at your `01` player roadster and `02` police roadster first. These two cars join the traffic, so they need the same toy-like, chunky, readable finish.

**Why:** Ofir wants the real Austin robotaxis on the road: a Tesla **Cybercab** and a **Waymo** (the white Jaguar I-PACE with the roof sensor dome, the one running in Austin). The look-alikes I built in code (`src/view/robotaxis.ts`) don't look like the real cars, and Ofir didn't like them. Please design both from **real photos**.

**References:** look up real photos of both cars, and match their proportions and signature details. Use the photos only as reference; don't commit or trace them.
- **Cybercab:**
  - Two-seat fastback teardrop with a low nose.
  - Gold/champagne-silver paint and a dark wraparound glass canopy.
  - Full-width light bars front and back.
  - Butterfly doors (closed is fine), aero wheel covers, no mirrors.
- **Waymo:**
  - White Jaguar I-PACE crossover: a short nose and the cab pushed forward.
  - The black roof sensor "hat" with the spinning lidar on top.
  - The sensor pods on the front fenders and mirrors, and the rear-corner sensors.
  - The teal/blue-green accent where the real car has it.

- **Cybertruck** (added by Ofir):
  - The angular stainless-steel pickup: flat brushed-steel panels and the sharp triangular roofline.
  - A full-width light bar front and back, the dark glass band, and the covered bed.
  - Big wheels with aero covers, and the flared wheel arches.
  - About 5.5 m long, 2.0 m wide, 1.8 m tall. It drives in traffic like the other cars; I'll pick whether it counts as a car or a truck in the rules.

**Brands:** no logos, badges, wordmarks or text on either car. The shapes and colours carry the likeness. The names are fine while the repo is private, and we rename them before publishing.

**Technical (they are traffic, drawn many times as instances):**
- One Three.js builder per car, in TypeScript, like `police-roadster.ts`:
  - `buildCybercab()`, `buildWaymo()` and `buildCybertruck()`.
  - Each returns a `THREE.Group`, plus `dispose()`.
  - Use only primitives and merged geometry. No downloaded models or textures.
- Units and orientation:
  - Metres, +Y up, **-Z forward**, wheels on y = 0.
  - Cybercab about 4.2 m long; Waymo about 4.7 m long and about 1.9 m wide (both fit a 2.5 m lane).
- **Draw-call budget:**
  - Merge the geometry per material, with **at most 4 materials per car**.
  - Fewer is better: vertex colours on a single material is ideal, since each material is one draw call for all copies on screen.
  - MeshToon or MeshLambert, no transparency.
- About **3,000 triangles or fewer** per car.
- No doors that move and no animation. A lidar that spins is a nice extra: if you do it, make it a separate small group I can rotate.

**Must show (PNGs):**
- 3/4 front, side, back and front views of each car.
- A gameplay shot: all three in traffic, seen from the chase camera behind the player roadster at sunset (like your `03-austin-stretch` shots).

**Deliver:** `art/mockups/06-robotaxis/`: `cybercab.ts`, `waymo.ts`, `cybertruck.ts`, a preview, the PNGs, and `notes.md` (triangles, meshes, materials, bounds, palette). Then comment `[codex → claude]` on the issue and set Turn = Claude.
