# Downtown Austin kit — issue #48

## Revision 1 — November 10, 2026

Original Three.js geometry for six historic fronts, four skyline towers, six street props and a Capitol vista. This is a native art study for Claude to review and integrate. It is not an approved or integrated game update.

Start with `gallery.html` (Street / Fronts / Towers / Props / Row), or `index.html` for the interactive preview. With the project's Vite server running, open `/art/mockups/09-downtown-austin/`. The preview imports the existing native roadster only for scale and camera context.

### Images

- `*-three-quarter.png`, `*-front.png`, `*-side.png`, `*-back.png`: all 17 pieces, 68 actual native renders at 1200×800. Front is +Z. The very thin side views of the mural, flag and string lights intentionally show their thickness.
- `congress-sunset.png` and `congress-night.png`: 540×1170 (9:19.5) chase-camera composition with the complete kit, roadster and Capitol at the far end. No gameplay HUD, traffic or effects.
- `historic-row-sunset.png` / `historic-row-night.png`: all six fronts together, showing the window and sign emission channel.
- `current-game.png`: 332×720 browser capture of the supplied `roadster-rush-downtown.mp4`, paused at approximately 0:05. Player controls remain visible at the bottom. This is a baseline frame, not a matched simulation capture.
- `review.jpg`: browser screenshot comparing that baseline with the two new street studies. The 73 PNGs are all below 245 KB; the review JPEG is also below 2 MB.

### Design and references

The supplied game already has the avenue, sidewalks, trees and a distant Capitol silhouette. This revision concentrates on arched shop windows, cornices, striped awnings, projecting signs, distinct tower crowns, rounded tree canopies and the Capitol's drum/portico. The street composition deliberately keeps the center open. It combines Congress Avenue's vista with 6th Street storefront character; it is not a geographic reconstruction.

Visually inspected these reference photographs in the browser before building. No photograph, downloaded geometry or texture is included, copied or traced:

- [KUT — Congress Avenue / Capitol view corridors](https://www.kut.org/austin/2018-02-02/how-do-capitol-view-corridors-preserve-sights-of-austins-most-famous-building): broad straight avenue, oaks, distant dome and layered towers.
- [Wikimedia — 6th Street historic district](https://commons.wikimedia.org/wiki/File:6th_Street_historic_district_Austin,_Texas.jpg): red brick, cream stone, arched windows, cornices and varied rooflines.
- [Pallasart — Austonian, 100 Congress and Frost skyline photograph](https://www.pallasweb.com/austin-texas-photos/the-ashton-austonian-100-congress-avenue-and-frost-bank-tower-53b1d561a63f144a361f18715d288ac3e4535443): slim pale tower, stepped glass crown and warm neighboring massing.
- [Gallery Vue — The Independent](https://galleryvue.com/project/the-independent/): shifted glass volumes and horizontal floor bands.
- [KUT — moonlight tower history](https://www.kut.org/life-arts/2017-01-10/a-new-documentary-illuminates-the-history-of-austins-iconic-moonlight-towers): narrow iron lattice and clustered lamps.

The four tower deliverables follow the brief's explicit builder list: crown, slim, stack and generic blue. There is no additional standalone 360 Condos or terracotta tower. Architecture and proportions are stylized, with no real business names or marks. Shop names BATBOP, MOONPOP, STARHOP, SUNUP, PEACHY and ZOOP are invented. The HELLO AUSTIN mural uses original geometry lettering, skyline, moon, river and bat motifs; it does not reproduce the existing Austin mural.

### Builder API and integration

- `fronts.ts`: `FRONT_IDS`, `buildHistoricFront(id)`.
- `towers.ts`: `TOWER_IDS`, `buildTower(id)`, `buildCapitolVista()`.
- `props.ts`: `PROP_IDS`, `buildProp(id)`, plus named builders. `buildStringLights(span = 16)` sets its width.
- `kit.ts`: `CityModel` returns `{ group, geometry, material, dispose, setNight }`, with optional `frontage` on fronts. `CityKit` extends the owned shared helper `../06-robotaxis/mesh-kit.ts`; include or adapt that import when moving into production.

Every builder produces one merged mesh, one opaque vertex-colored Lambert material, no texture maps and no material groups. Use one `InstancedMesh` per geometry/material pair, sharing it between repeated pieces. `dispose()` is idempotent but only call it after all instances sharing that geometry/material have been removed. The preview uses instancing for repeated city pieces.

`aGlow` is a scalar per-vertex geometry attribute, 0 for ordinary surfaces and 1 for selected windows/signs/lamps. `setNight(amount)` clamps 0–1 and changes the material's `uNight` uniform. The `onBeforeCompile` hook adds colored emission and `customProgramCacheKey` identifies the shader. Retain the attribute **and** hook when adapting the current building shader; replacing or normally cloning the material will lose the hook. All instances of a shared model share the night amount. This is emissive surface color, not a light source or bloom effect; it does not illuminate nearby geometry.

Units are metres, +Y up, +Z front and lowest geometry at y=0. Front bodies start at z=0 and extend about 7.5 m into -Z; awnings and signs project into +Z. `frontage` is the main body width, while full bounds include trim. Rotate left-side fronts +π/2 and right-side fronts -π/2 to face the street. Account for projections when setting sidewalk clearance.

String lights have their **lowest bulb at y=0**, so place the whole model at the desired hanging clearance, not the pole-top height. The preview uses y=6.2, with posts around 8 m. The moonlight tower is a compressed 23 m artistic prop, not a real-height reconstruction. Flag waves, pedicab wheels and all other parts are static; there are no rigs or collision shapes. The postcard mural should be placed clear of the host wall to avoid z-fighting.

### Geometry budgets

All pieces use one mesh / one material. Full bounds below include ornamentation; width × height × depth, metres.

| Piece | Triangles | Bounds |
|---|---:|---|
| Brick arc | 1,398 | 10.420 × 11.000 × 9.290 |
| Limestone hall | 1,485 | 12.420 × 13.500 × 9.358 |
| Teal corner | 1,083 | 8.920 × 10.025 × 9.358 |
| Rose bay | 1,398 | 10.920 × 10.655 × 9.290 |
| Gold market | 1,126 | 11.920 × 8.500 × 9.290 |
| Plum music | 1,366 | 9.420 × 13.350 × 9.290 |
| Crown tower | 1,112 | 19.000 × 70.020 × 17.000 |
| Slim tower | 1,464 | 19.000 × 88.400 × 15.000 |
| Stack tower | 1,332 | 24.000 × 73.150 × 20.000 |
| Blue tower | 1,008 | 23.000 × 62.120 × 18.000 |
| Live oak | 672 | 8.400 × 7.874 × 7.100 |
| Moonlight tower | 744 | 3.376 × 23.091 × 2.988 |
| Texas flag | 152 | 3.000 × 7.162 × 1.000 |
| Pedicab | 564 | 1.430 × 2.040 × 2.645 |
| String lights | 704 | 16.012 × 1.745 × 0.238 |
| Postcard mural | 294 | 8.000 × 4.500 × 0.250 |
| Capitol vista | 2,731 | 39.000 × 33.800 × 16.550 |

### Palette

Authored base sRGB values; rendered colors vary with lighting/fog.

| Use | Hex values |
|---|---|
| Cream / limestone | `#f4e9d8`, `#ddc9a5` |
| Brick / terracotta / pink | `#ad5146`, `#cd7655`, `#d39787` |
| Painted teal / gold / plum | `#359b9b`, `#e6b653`, `#69516d` |
| Dark glazing / metal trim | `#283d54`, `#343244` |
| Leaves / bark | `#718a3d`, `#a0ab4c`, `#426f44`, `#685046` |
| Neon cyan / magenta / warm windows | `#35e0ff`, `#ff4fd8`, `#ffd58b` |
| Glass tower bodies | `#467f9a`, `#729daf`, `#65899b`, `#779fa9`, `#39768f`, `#699aa6` |
| Glass windows / crown highlights | `#8acbd5`, `#558ea5`, `#bdd9db`, `#97b9c6`, `#56869d`, `#5699ac` |
| Capitol granite / trim / recess | `#dca493`, `#f1c8ad`, `#644e62` |
| Flag blue / red | `#254c8e`, `#d95b61` |
| Prop steel / tire / mural blue | `#6e7480`, `#242833`, `#6eabb5` |
| Sunset sky | `#4a2a69` to `#ed9b69`, fog `#d59685` |
| Night sky | `#140d30` to `#814467`, fog `#5b426d` |

### Congress composition and simplification

The street uses the game's 62° perspective camera at (0,5,9.5), looking toward (0,1,-12). The car is at the origin. The baseline clip has different live gameplay framing, so assess scenery character rather than pixel alignment.

Fronts sit at x=±12 and z=-8-13i, with rounded oaks at x=±7.6, z=-4-21i and 0.82 scale. This brings the fronts closer than the current generic-building x≈18 anchor. Claude should check sign/tree clearance and runner sight lines before adopting the positions. Tower anchors sit behind the low street: crown (30,-205), slim (-32,-250), stack (37,-260); generic blues (-32,-145) at 0.75 and (52,-170) at 0.8 scale. The Capitol is at (0,-172), scale 1.16. Keep its dome visible above the avenue, with towers to the sides.

The moonlight tower is left at (-10.3,-58). Flags and pedicabs sit in the sidewalks. Four strings cross at z=-16,-48,-80,-112, y=6.2. The mural faces the approaching camera from a small right-side pocket at (12,0.35,-47). `preview.ts` is the exact placement reference; the ground/road/sky are preview context, not a production replacement.

For lower detail, keep the arches, cornice profile, awning stripes and tower silhouettes first. Remove cornice dentils, window mullions, letters and minor trunk roots before removing these identifying shapes. Keep oak clumps rounded and broad. Back/side walls on shop blocks are intentionally plain for contiguous streets. Tower window quads and ornamentation already use cheap flat geometry; do not add per-window meshes. Blade lettering only needs to read as bright sign patterns from the chase camera, not as readable distant words. The 3×5 lettering is intentionally chunky and does not use a font texture.

### Validation and remaining limits

- Strict TypeScript check passed for all five TypeScript files, including the preview.
- `node art/mockups/09-downtown-austin/validate.mjs` passes and writes `validation.json`: triangle budgets, mesh/material counts, opaque/no-map material, finite geometry and colors, base y=0, front/tower dimensions, binary glow channel, night clamp/shader hook, idempotent disposal and PNG size/dimensions.
- Browser reviewed all front/side/back/3/4 exports, the row in both lighting modes and the portrait comparison. Corrected sign backs, flag star backs, tower window occlusion, road height and row framing during review. Final browser console has no warnings/errors.
- The desktop street preview reports about 79 rendered draws including its shadow passes. This includes the roadster and context and is not a production phone performance measurement. The merged city models remain one draw each per rendering pass; repeated instances do not multiply that count.
- Production work remains Claude's: building pool/placement adapter, reuse of the existing night controller, collision/clearance, shadows and target-device profiling. The preview uses a 2048 shadow map and no bloom. Small iron lattice/letters may alias at long distance; reduce distant detail or exclude it from shadow passes as needed.
- No new direction question is required for this brief. Hand off for technical review and integration; do not infer Ofir approval from this delivery.
