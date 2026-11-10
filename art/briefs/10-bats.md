# Brief 10: better bats (issue #49)

Read `00-style-guide.md`. The bats are in `src/view/bats.ts`:
- **The swarm:** at dusk a swarm of about 40 bats flies over the road while coins rain.
- **The screen splat:** one or two hit the screen and flap away (`src/view/screenHits.ts`).

Today each bat is a flat purple shape with a dark outline, flapped by bending it in a shader. Ofir says they look bad ("bats suck").

**Please make a cute, readable cartoon bat** in the game's toy style:
- **Body:** small and round, furry-looking (shaped, or a soft gradient), with big ears and big friendly eyes with highlights. A little smile or fangs are fine; keep it friendly, not scary.
- **Wings:** membrane wings with visible finger bones and a scalloped edge, darker than the body, with a lighter inner tone.
- **Colours:** a purple and plum family that reads against the sunset and against the night sky. A soft rim or contour so it never disappears in the dark.
- **Flap:** the wings must flap. Make the body one mesh and each wing its own mesh, hinged at the shoulder, so I can rotate the wings per instance (I draw the swarm as instances: one draw call per part). A short "glide" pose too.
- **Screen pose:** a front view with wings spread, splatted on the glass, for the screen hit.

**Budget:**
- About 800 triangles per bat, at most 3 materials, vertex colours preferred.
- No transparency, except a contour if you think it's needed.
- Metres, +Y up, facing -Z, about 0.8 m wingspan at scale 1.

**Must show (PNGs):** the bat from the front, 3/4 and side; the flap cycle (4 frames); a swarm over the road from the chase camera at dusk and at night; and the screen-splat pose.

**Deliver:** `art/mockups/10-bats/`: `bat.ts` (builder, plus the wing pivot positions), a preview, the PNGs and `notes.md`. Then comment `[codex → claude]` and set Turn = Claude.
