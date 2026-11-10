# Austin traffic — Revision 2

Native Three.js traffic studies for issue #45. These are actual model renders, made from primitives and authored geometry. No downloaded meshes, photo textures, logos, badges or lettering are included. The shapes are simplified interpretations of reference photos, not traced replicas.

**Color direction confirmed by Ofir, November 10:** the Cybercab is gold. Preserve body `#d3b66e` and gold aero covers `#cbb26e` when integrating; the older production champagne-silver palette is superseded. The existing Revision 1 model and renders already use these gold colors.

## Deliverables

- `cybercab.ts`: `buildCybercab()`, gold two-seat fastback with a low crowned nose, dark canopy, solid rear sail, aero wheel covers and continuous light bars. Doors are closed and fixed.
- `waymo.ts`: `buildWaymo()`, white crossover with a short nose, roof sensor hat, fender/mirror/rear sensor pods and teal details. The lidar is fixed so the entire vehicle can be instanced as one mesh.
- `cybertruck.ts`: `buildCybertruck()`, angular steel pickup with dark glass, covered bed, polygonal wheel wells, aero-style wheels and front/rear light bars. Fixed panels, one merged mesh.
- `mesh-kit.ts`: shared geometry assembly and `TrafficModel` interface.
- `index.html` / `preview.ts`: interactive studio and chase-camera preview. Run the existing Vite dev server and open `/art/mockups/06-robotaxis/`.
- `gallery.html` / `gallery.jpg`: all exported views in one review sheet.
- `*-three-quarter.png`, `*-side.png`, `*-front.png`, `*-back.png`: four views per model, 1200×800.
- `gameplay.png`: 540×1170, 9:19.5 chase-camera composition with both taxis and the pickup ahead of the red player at sunset. This is an isolated preview, not a production-game screenshot.
- `validation.json`: measured geometry and resource checks.

## Reference photos inspected

- [Petersen Cybercab front three-quarter photo](https://images.squarespace-cdn.com/content/v1/6598c8e83ff0af0197ff19f9/1732745730113-5JSG4R2FDCL41F0SC2MT/2024-Tesla-Cybercab_0002_CYBER_CAB_TN_112724_-26.jpg): gold body, low nose, canopy profile, covered wheels and rear sail. The pictured doors are raised; this traffic study keeps them shut.
- [Waymo's fifth-generation Driver article](https://waymo.com/blog/2020/03/designing-5th-generation-waymo-driver/): inspected its front three-quarter vehicle photo and side-profile development image for the crossover proportions and sensor placement. Sensors here are stylized visual cues, not an engineering diagram.

References were viewed in the browser and are not committed or used as textures. Working names follow the private-project brief; Claude owns the public naming review.

## Geometry and integration

| Model | Triangles | Meshes | Materials | Bounds W × H × L |
|---|---:|---:|---:|---|
| Cybercab | 2,494 | 1 | 1 | 2.027 × 1.435 × 4.256 m |
| Waymo | 2,964 | 1 | 1 | 2.125 × 2.152 × 4.762 m |
| Cybertruck | 2,366 | 1 | 1 | 2.340 × 1.838 × 5.584 m |

Metres, +Y up, **-Z forward**, tire bottoms at y=0 within floating-point tolerance. Waymo body width is about 1.9 m; the table includes mirrors/sensors and the roof hat. All complete bounds fit a 2.5 m lane; the pickup body is about 2.0 m wide, with its mirrors responsible for the 2.34 m total width.

Each builder returns `{ group, geometry, material, dispose }`. `group` contains one merged mesh. `geometry` and `material` are the same resources used by that mesh, exposed for `THREE.InstancedMesh`. The single opaque `MeshLambertMaterial` uses vertex colors; there are no maps, transparency, animated parts or per-material geometry groups.

Claude accepted and integrated the first two builders into `src/view/robotaxis/`. The added pickup returns the same `TrafficModel` shape for that integration. Use `.geometry` and `.material` for traffic instances and include `mesh-kit.ts`. The supplied `dispose()` owns both resources and is idempotent; call it only after all instances sharing them have been removed. Do not dispose the temporary builder result immediately after constructing instances. No game code or collision dimensions were changed here.

## Palette

| Use | Hex |
|---|---|
| Cybercab gold / recessed seam | `#d3b66e` / `#a28b55` |
| Aero wheel cover | `#cbb26e` |
| Cybercab canopy / dark trim | `#263442` / `#25262c` |
| Cybercab front / rear light bars | `#f4f5e9` / `#ed495c` |
| Waymo warm white / dark trim | `#edece6` / `#262c36` |
| Waymo glass / teal accent | `#243544` / `#55b9b0` |
| Waymo alloy / grille lines | `#aeb6c0` / `#46515b` |
| Waymo headlamps / rear lamps | `#def2f3` / `#ee5668` |
| Tires | `#202127` |

These are input sRGB colors; Three.js converts them for the vertex-color buffer. Lighting changes the rendered appearance.

## Low-poly simplification

The models already meet the traffic budget. Preserve the low gold fastback versus tall white sensor-crossover silhouettes, wheelbase, light bars and roof hat when simplifying further. Door seams, tiny handles, grille bars and the smaller sensor lenses can be removed first for a distant LOD. Keep the lidar fixed unless a separate draw call is worth the animation. Painted glass remains opaque. No branding, text or photographic detail is needed for readability.

## Validation

- Strict TypeScript check passed for both builders, the helper and preview.
- Runtime inspection verified triangle/mesh/material counts, finite geometry, vertex-color range, opaque material, bounds, ground contact and idempotent resource disposal.
- Browser inspection covered front, side, rear, three-quarter and portrait traffic views. Exported the actual WebGL canvas, then checked the combined review sheet.
- All nine PNGs are under 140 KB; the JPEG review sheet is under 150 KB. Each is well below the 2 MB target.
- Production traffic integration, collision tuning and phone performance remain Claude's implementation checks.

## Revision 1 — November 10, 2026

Built both studies from inspected real-photo references. Reworked the nose closure and panel normals to eliminate front-face gaps; simplified wheel rings and sensor segmentation to stay below 3,000 triangles each. Widened the portrait preview framing so the player and both traffic cars are fully visible. No open art questions from this pass.


## Revision 2 — Cybertruck addition, November 10, 2026

Claude returned #45 with Ofir's request for the pickup after accepting/integrating the Cybercab and Waymo. Their builder sources and eight turnaround PNGs remain unchanged. Added `cybertruck.ts`, four 1200×800 views, refreshed the 540×1170 all-three traffic composition and the preview/gallery. No production code was edited.

Reference photographs inspected directly on Tesla's site:

- [Official hero front/side photo](https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Cybertruck-Hero-Desktop-NA-SA-APAC.png): triangular roof apex, short flat hood, angular black arch cladding, four-door side glass, steel sail and wheel placement.
- [Official crossbars/bed close-up](https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Cybertruck-Accessories-Carousel-Slide-1-Crossbars-Desktop.jpg): covered bed slats, steel shoulders and rear light bar. Accessories are omitted from the model.
- [Official aerial exterior image](https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Cybertruck-Safety-Carousel-Slide-2-Safety-Desktop.jpg): cab/bed footprint.
- [Owner's manual dimensions](https://www.tesla.com/ownersmanual/cybertruck/en_us/GUID-12A976DD-EB60-431B-AFF1-5A37E95006DB.html): proportion check. The model is deliberately simplified to the brief's approximately 5.5 × 2.0 × 1.8 m body, rather than an exact engineering copy.

Photos were viewed, not downloaded into the repo, traced or used as textures. The light bars, roof silhouette and bed are broad reference cues; wheel cover pattern, detailing and proportions are authored simplifications. No marks, badges, wordmarks or plate text.

Pickup palette: steel `#b8bfc0`, lit steel `#d1d5d3`, folded lower panel `#949ea2`, recess/seam `#67757b`, trim `#242a31`, glass `#24343e` / `#293a42` / `#2c3d46`, tonneau `#3b4349` / `#535e63`, tires `#202127`, wheel covers `#30383e` / `#59646a` / `#3c474d`, front lamps `#edf8ef` / `#d6ebed`, rear lamps `#ee5262`, amber marker `#f3ac48`. Opaque flat Lambert shading suggests steel with large cool/warm face colors; there is no brushed-metal texture or PBR reflection.

For a cheaper LOD, remove the wiper, door seams, small marker lights and most tonneau lines first. Preserve the angular silhouette, wheel arches, dark glass and contrasting rear cover. One mesh, one material, 2,366 triangles, no animation. The old `TrafficModel` resource ownership/disposal rules apply unchanged.

`validate.mjs` now checks all three models: finite geometry/colors, bounds, lane width, ground contact, triangle limits, one mesh/material, no material groups/maps/transparency, resource identity/disposal and all 13 PNG dimensions/file sizes. Strict TS and browser shader checks pass; inspected every pickup angle and the all-three portrait composition. Wheel-well inner walls and bed shoulders were closed after visual review; a dark light-bar recess improves front readability. Production collision size and car-vs-truck classification remain Claude's choice. No new art question is required.
