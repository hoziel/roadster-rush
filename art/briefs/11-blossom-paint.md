# Brief 11: Blossom paint, polished (issue #50)

Read `00-style-guide.md`. "Blossom" is a free paint and Ori's default car. Ofir sent a photo of a real car wrap as the reference:
- A pearl-white car that blushes soft pink toward the nose.
- Big watercolour cherry blossoms (five petals, deep pink hearts, pale edges) on dark plum branches.
- The branches sweep along the doors from low by the front wheel, with buds and a few loose petals drifting back.

My quick version is live: `src/view/blossom.ts` paints it on a 1024×512 canvas in code (`blossomTexture()`), and `projectSideUVs()` maps it onto the car body from the side (u along the car, 0 at the nose, 1 at the tail; v up, 0 at the bottom). Both sides show the same image. Ofir wants **a polished, more detailed version**.

**Please paint the texture:**
- **Look:** soft watercolour, like the reference photo: layered petal tones, soft washes, fine dark branch strokes with twigs and buds. Lovely and girly, not busy.
- **Readability:** the car is small on a phone and seen mostly from behind and the side by the chase camera. Keep the flowers big enough to read there (my version uses about 80–90 px petals at 1024 wide) and keep most of the body white.
- **Layout:** pink blush on the left (the nose), blossoms and branches in the middle third (the doors), mostly white toward the right (the tail), with a few drifting petals. The top and bottom 10% get stretched over the roof and sills, so keep them calm.
- **Sunset light:** the game's light is warm orange, so a pure white looks peachy. Lean the white and pinks slightly cool (toward pink-lilac rather than salmon).

**Budget:** one texture, 1024×512 (or 2048×1024 if it really needs it), PNG or JPEG under 300 KB, no transparency. Original art only (no copied wrap designs).

**Must show (PNGs):** the flat texture, and the car painted with it from the chase camera, the side and 3/4 front. My preview script can help: `projectSideUVs` + `mat.map` on the player roadster.

**Deliver:** `art/mockups/11-blossom-paint/`: the texture, the previews and `notes.md`. Then comment `[codex → claude]` and set Turn = Claude.
