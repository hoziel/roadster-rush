# Friendly bats — Revision 1

Issue #49 / brief `art/briefs/10-bats.md`. Original authored Three.js geometry, no imported model, photo texture, traced reference, brand, lettering or transparent surface. Preview images are actual renders of `bat.ts`.

## What to review

Open `gallery.html` through Vite for the review sheet, or `index.html` for orbit controls, live flap, game-camera staging and image export. The default export is 1200×900. Game-camera images are 540×1170 (9:19.5), using a 62° camera at `(0,5,9.5)` aimed at `(0,1,-12)`.

| Image | What it shows |
| --- | --- |
| `bat-front.png`, `bat-three-quarter.png`, `bat-side.png`, `bat-back.png` | Buildable turnaround of the exact native asset. |
| `bat-glide.png` | Spread wings at zero hinge angle. |
| `bat-flap-1.png` … `bat-flap-4.png` | Up/opening/down/recovery at +.82, +.10, −.82, −.10 radians. |
| `bat-swarm-dusk.png`, `bat-swarm-night.png` | 70 instanced bats above a simplified bridge/road, with the existing art roadster. The brief mentions about 40; current production BAT_COUNT is 70, so the study uses 70. |
| `bat-splat-front.png` | Glass pose: wider/flatter body with wings spread. |
| `bat-splat-screen.png` | The glass pose at camera-relative depth .6 m, with the road still readable. |
| `gallery.jpg` | Browser review overview. |

The road, simplified bridge, foliage and buildings are staging context, not a replacement scenery package. The swarm layout is illustrative, not a copy of the game's event paths. Near bats are recognizable; distant eyes collapse to bright dots, leaving the scalloped silhouette and lavender contour to carry the read.

## Geometry and palette

- **713 triangles** total: body 385, left wing 164, right wing 164. **Three meshes / one shared opaque vertex-colored Toon material**, no image textures and no outline pass.
- Rest dimensions: **.804 m wide × .314 m tall × .131 m deep**. Metres, +Y up, front −Z. Origin is the centre of the flying body, not ground level.
- Shoulder pivots: left `(-.065,.027,.014)`, right `(.065,.027,.014)`. Wing geometry is already local to these pivots. Both membrane faces and edges have geometry; finger bones and rim are merged into each wing. Front bones are emphasized; backs are plain plum.
- Fur `#9676c6`, lit fur/belly `#bea1e3`, shaded fur `#6c4b97`, pink ears `#e5a6c9`.
- Membranes `#583475`, inner panels `#9061b4`, fingers `#c9a7df`, rim `#d7bfea`.
- Eyes/fangs `#fff1da`, pupils/mouth `#2c2043`, iris `#604680`, catchlight `#ffffff`, nose `#5b365f`, feet `#bb91d4`.
- Small uniform material emission `#24132f`, intensity .35, supports the night read. Studio lights are brighter than the night scene. Final night lighting should be checked in production.

This is already the low-poly asset. Keep the three merged parts and colored vertices. If further reduction is needed, simplify eye whites/body rings before sacrificing wing-tip scallops, large ears or the cream eyes. Tiny secondary eye highlights and fangs may be removed for a distant LOD. Do not turn individual bones or eyes into extra draws.

## Builder and instancing

`buildBat(pose = 'glide')` returns `group`, `body`, `leftWing`, `rightWing`, `geometries`, `material`, `wingPivots`, `setPose`, `setFlap`, `update`, `writeInstanceMatrices`, and idempotent `dispose`.

- `setFlap(angle)` clamps to ±1.05 rad. Left wing Euler `(0, −angle × .12, −angle)`; right `(0, angle × .12, angle)`. Normal cycle uses ±.82 radians. The small Y twist gives the wing depth through the cycle.
- `update(seconds, phase = 0)` applies `sin(seconds × 14 + phase) × .82`, about 2.23 Hz. A different instance phase avoids synchronized wings. In `splat` pose, it holds zero angle.
- `setPose('splat')` sets group scale `(1.08,.86,.28)`; `setPose('glide')` restores `(1,1,1)`. Put independent world placement/size on an outer Group because `setPose` owns the returned group's scale. Both pose setters reset flap angle to zero.
- For swarms, create three `InstancedMesh` batches from `geometries.body/leftWing/rightWing`, all sharing `material`. Do not add the prototype group to the scene too. `writeInstanceMatrices(rootMatrix, angle, outBody, outLeft, outRight, pose = 'glide')` writes full instance transforms including shoulder translations and splat scale; it allocates no objects per call. Reuse the three output Matrix4 objects and one root Matrix4. `preview.ts` contains the full 70-bat example.
- 70 bats cost **49,910 triangles and three swarm draw calls**. This is an asset count, not a target-phone FPS claim. The example disables batch frustum culling; production should either do that or update conservative bounds for the animated flock.
- Remove all sharing instances before calling the builder's `dispose`; it owns the three geometries and material.

## Integration changes for Claude

1. Replace the old single flat bat + inflated outline with the three parts. Drop the old vertex-bending flap shader: the new body must stay rigid and each wing rotates about its shoulder. The old `BAT_PITCH = .9` was for a flat XZ shape; the new spread wings lie in XY with a small depth camber. Adapt the event rotations and world size to that new orientation and .804 m span.
2. For screen hits, replace the old X-axis quarter-turn and fake X-scale flap with the hinged group. A front-facing bat at the camera needs local Y rotation π after the camera quaternion. The preview uses camera-local position `(.018,−.018,−.6)`, additional overall scale .32 and the splat pose. This is a staging proposal, not a mandatory replacement of the screen-hit timing/size.
3. On release, restore `glide` on the inner group, retain overall scale/placement on its wrapper, and animate the two hinges as the wrapper flies away. Keep the current impact/away timing and collision behavior under production control.
4. Profile the three batches under the actual dusk/night lights and coin rain on the target phone. No production source or event logic was edited here.

## Validation and revision notes

Revision 1 adds a soft round fur-colored body, oversized solid ears, cream eyes with two highlights, a friendly fang smile, a belly patch, silhouette tufts, two tiny feet, and scalloped membrane wings. The smile was moved clear of the belly during review. Large eyes and solid lavender contour survive the dusk/night preview without alpha or a second outline material.

`node art/mockups/10-bats/validate.mjs` checks finite geometry/colors, triangle budget, dimensions, 362 scene-graph/instance-matrix comparisons (including nonuniform outer scale and clamped/splat states), rigid geometry through a full flap, disposal ownership and all 13 PNG dimensions/sizes. `validation.json` records the results. Strict TypeScript and browser checks also passed. No mobile performance test or production integration is claimed.
