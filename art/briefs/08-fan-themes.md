# Brief 08: polish the fan themes: sideline players and ad billboards (issue #47)

Read `00-style-guide.md` first. Then look at what I built, in `src/view/sideline.ts`, `src/view/fanThemes.ts`, `src/view/fanBoards.ts` and `src/view/startline.ts`, and at the clips Ofir saw (ask on the issue if you need them recorded again). Everything works, but it looks basic, and Ofir wants it polished.

**What exists:** each driver has their favourite things in the game.
- **Nevo:** karate (white gis, black belts), the San Antonio Spurs (black, silver and fiesta teal/pink/orange) and Wemby (#1, very tall).
- **Ori:** volleyball and gymnastics, in her team's blue.

For each of them:
- A themed crowd at the start line (shirt colours, sign texts).
- A start-line prop: Nevo's basketball hoop, Ori's volleyball net.
- **Sideline players** doing the sport:
  - Nevo: shooting hoops, dribbling, karate kicks and punches.
  - Ori: volleyball bumps over the net, a cartwheeling gymnast.
- Four **ad billboards** each along the roadside, drawn on 2:1 canvases.

**Please polish:**
1. **Sideline players (the main ask):** appealing, toy-like characters in the roadster's style.
   - Faces, hair, hands, shoes, and real uniforms: karate gi with belt, basketball jersey and shorts, volleyball kit with knee pads, gymnast leotard.
   - Kids and grown-ups in the mix.
   - Keep my rig idea: torso, head and four limbs as separate pieces, posed per frame, drawn as instances.
   - Animations that read clearly from the chase camera at 20–40 m. A proper jump shot, a front kick with chamber and extension, a forearm bump, a real cartwheel.
   - No real people's likeness. Wemby can only be a very tall player in black and silver with a #1.
2. **Ad billboard art:** redo the eight ads (Nevo's 4, Ori's 4) as bold, readable cartoon posters at 768×384.
   - Keep the same messages, or better ones in the same spirit.
   - No team logos and no photos. The Spurs only through colours and words.
3. **Props:** a nicer hoop (backboard, rim, net) and volleyball net (posts, tape, net, a ball).
4. **Crowd:** ideas to make the fans read as themed. Karate fans in gis with belts, Spurs fans with foam fingers, a volleyball team in matching blue.

**Budget:**
- About 1,500 triangles per player.
- Whatever draw-call structure you choose, the whole set of sideline players stays at **about 6 draw calls or fewer**: instancing per body part, vertex colours, toon materials, no transparency.
- Billboards stay canvas-drawn, or use small generated textures you make, at most 256 KB total.

**Deliver:** `art/mockups/08-fan-themes/`:
- Your builders and drawing code (`players.ts`, `ads.ts`, `props.ts`), written so I can drop them in place of mine.
- PNGs: each player in each pose, every billboard, and a chase-camera shot of each driver's start line and of a roadside billboard with its players.
- `notes.md`.

Then comment `[codex → claude]` and set Turn = Claude.
