# Brief 00a: look and feel directions (do this first)

**Goal:** before any detailed mockups, Ofir picks the overall look. Render **three distinct style directions** of the *same scene*, so the only thing that changes is the style.

**The scene (same in all three):** a portrait phone frame (9:19.5) from the gameplay camera, behind and above the car. A 3-lane road heads toward a stylized Texas Capitol dome at sunset. The player's open-top roadster is in the bottom third. On the road: a few coins, two cones, one glowing power-up. Roadside: a couple of buildings, a food truck, a cactus, string lights. Small HUD at the top: score, coins, 3 battery cells.

**The three directions:**
| | A: Toon low-poly sunset | B: Soft toy / clay | C: Neon dusk |
|---|---|---|---|
| Feel | Bright, chunky, flat-shaded facets, warm sunset | Rounded, pastel, "toy box" plastic, soft shadows | Purple dusk, glowing neon accents, strong rim light |
| Shading | Flat or toon, crisp edges | Soft and smooth, gentle ambient occlusion | Toon base plus emissive glow |
| Palette | The style guide palette (`00-style-guide.md`) | Same hues, lighter and desaturated | Deep purples, magenta and cyan neon, gold coins |
| Reference vibe | Classic low-poly mobile runner | Kids' toy-car playset | Synthwave road, but kid-friendly and bright enough |

**For each direction also show:** a small palette strip (6–8 swatches with hex values), and a close-up of the roadster in that style.

**Hard rules:** the style guide's technical and legal limits apply to all three. That means low-poly-buildable, an original car (no Tesla shape or badges), no brands, nothing copied from other games. Each direction must stay readable on a phone: cones and coins pop against the road.

**Deliver:** `art/mockups/00a-look-and-feel/` with `A.png`, `B.png`, `C.png` (gameplay frames), `A-car.png`, `B-car.png`, `C-car.png`, and `notes.md` (one paragraph per direction: strengths, risks for performance or readability).

Ofir picks one (or a mix). Claude then updates `00-style-guide.md`, and the detailed mockups (01, 03, …) follow that direction.
