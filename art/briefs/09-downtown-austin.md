# Brief 09: a downtown Austin kit (issue #48)

Read `00-style-guide.md` and look at your `03-austin-stretch` screens. Ofir says the streets don't look like downtown Austin yet.

**What I changed already** (see `src/view/scenery.ts`, `buildings.ts` and `scene.ts`):
- Live oaks lining the sidewalks, a curb and concrete sidewalks, street lights and scooters.
- No cacti or palms.
- More glass towers, in limestone, brick and pink-granite colours.

The buildings are still generic Kenney models, though. They don't read as Austin.

**References:** look up real photos and match their character (don't commit or trace them).
- **Congress Avenue looking north to the Capitol:**
  - Wide and straight, with big rounded live oaks along both sidewalks.
  - Tall blue-glass and pale-stone towers on both sides.
- **6th Street:** two- and three-storey Victorian commercial fronts in red brick, cream limestone and painted pastel facades, with:
  - tall arched windows and cornices
  - awnings
  - neon blade signs (invent fun names: no real businesses)
  - string lights across the street
- **Skyline towers, as side buildings near the road or in the distance:**
  - The Frost Bank Tower: blue glass, stepped, with the spiky crown.
  - The Austonian: tall, slim, pale.
  - The Independent: the "Jenga" stacked boxes.
  - The 360 Condos.
  - A terracotta stepped tower.
- **Street details:**
  - A moonlight tower (the tall iron lattice tower with lamps on top).
  - Bike lanes or pedicabs.
  - Texas flags.
  - A "Greetings from Austin"-style postcard mural on a side wall, with your own lettering. Not a copy of the real mural.

**Please make (Three.js builders in TypeScript, from code, toy-like and in the roadster's style):**
1. **About 6 low historic fronts** (6th Street style), each about 8–14 m wide and 8–14 m tall:
   - A flat front facing the road (+Z), with the back simple.
   - Neon signs as small emissive parts so they glow at night.
2. **About 4 towers:** a Frost-like crown tower, an Austonian-like slim tower, a Jenga-stack tower, and a generic blue-glass tower. 40–90 m tall.
   - Windows that can glow at night: a separate emissive material or vertex-colour channel I can drive, like `buildings.ts` does now.
3. **Street props:** a rounded live oak (better than the Kenney oak), a moonlight tower, a Texas flag on a pole, a pedicab, string lights to hang between lamp posts.
4. **A Congress Ave vista:** how the road ends toward the Capitol, so the far end of the street reads as Congress Avenue.

**Budget:**
- Each building is **one mesh with 1–2 materials**, using vertex colours. They're instanced, so each model costs one or two draw calls however many are on screen.
- About 1,500 triangles for a low front, about 3,000 for a tower, about 800 for a prop.
- Toon or Lambert materials, no transparency.
- Metres, +Y up, the front facing +Z, the base on y = 0.

**Must show (PNGs):**
- Each piece in a 3/4 view.
- A chase-camera street shot at sunset and at night, with the pieces lining both sides and the Capitol at the end.
- Compare it with the current game (`roadster-rush-downtown.mp4` in the repo root, or ask on the issue).

**Deliver:** `art/mockups/09-downtown-austin/`: the builders, a preview, the PNGs and `notes.md`. Then comment `[codex → claude]` and set Turn = Claude.
