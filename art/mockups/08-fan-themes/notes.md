# Fan themes — Revision 1

Native Three.js art studies for issue #47, November 10, 2026. Original anonymous athletes, authored geometry and canvas drawings. No photo textures, real-person likeness or team logos. The private-family-build words Spurs/Wemby follow brief 08; Claude owns their publish-time replacement.

## Review

Run the existing Vite server and visit `/art/mockups/08-fan-themes/`. `gallery.html` groups the exported images; `review.jpg` and `poster-gallery.jpg` capture the review page. These are actual renders of these builders, not generated concept images. Production files were not edited.

- `nevo-lineup.png`: four uniforms in cheer poses, demonstrating reuse for the themed crowd.
- `shoot-{load,release,follow-through,recover}.png`: tall anonymous #1 player, 3-second jump shot. `dribble-{high,low}.png`: basketball bounce.
- `karate-{guard,chamber,extension,punch}.png`: white gi, collar, black belt and clearly separated chamber/extension.
- `bump-{ready,contact}.png`: blue volleyball kit, knee pads, clasped forearms and blue/cream/gold ball.
- `cartwheel-{prepare,first-hand,inverted,second-hand,land}.png`: blue/gold gymnast, split legs, hand contact and alternating travel direction.
- The four uniform examples also have `-front`, `-side`, `-back` views; the unsuffixed pose is the 3/4 view. Basketball/dribble share one uniform/body.
- `hoop-*` and `net-*`: 3/4, front, side and back of each prop.
- `nevo-ad-1..4.png`, `ori-ad-1..4.png`: all eight 768 × 384 posters.
- `{nevo,ori}-{start,roadside,far}.png`: 540 × 1170 chase studies. Start prop is at z=-30; roadside at -18 and far at -38, approximately 20/40 m longitudinal offsets from the car. Camera is the game's 62° perspective at (0,5,9.5), looking at (0,1,-12).
- `{nevo,ori}-staged.png`: proposed separate anchors, billboard about 40 m away and athletes about 20 m away on the shoulder, arranged along the road. This keeps both visible in portrait.

54 PNGs, all below 84 KB each. Two review JPEGs are additional. The scene is deliberately an isolated staging study: plain sunset fog, simple city blocks, no HUD. Its unbatched road/city/car draw count is not a production performance measurement.

## Builders and integration

### Players

`players.ts` exports `Sideline`, `PlayerSpec`, `Activity`, `DURATIONS`, `samplePose`, and geometry helpers. Preserve the complete Sideline class when copying; its material `onBeforeCompile` hook is required for the per-instance colors and uniform features.

The existing API is retained:

```ts
const sideline = new Sideline(); // default capacity 16, optionally pass a different capacity
scene.add(sideline.group);
sideline.setScenes([{ anchor: courtOrBoard, players: existingPlayerSpecs }]);
sideline.update(elapsedSeconds);
// At teardown, once:
sideline.dispose();
```

The original shoot/dribble/karate/bump/cartwheel specs remain structurally compatible. Optional `height`, `skin`, `hair`, `uniform` and activity `cheer` allow crowd reuse. Height is in world metres; defaults are 2.05 for the tall shooter, 1.36 karate, 1.40 gymnastics, 1.65 otherwise. Anchor position/yaw and uniform scale affect scene offsets and ball targets; body height stays in world units, matching the old convention. Use positive uniform anchor scales and an identity-transform Sideline group. Invisible anchor ancestors suppress the scene. Excess players are capped at capacity.

The body has a torso, head, articulated upper/lower limb segments, hands and shoes. All parts are rigid posed instances, with no skeletal skinning. A packed vertex/instance palette selects gi collar/belt, jersey 1, volleyball trim/knee pads, gym V and bun. The gymnast explicitly uses team blue, superseding the old pink `LEOTARD` color. Use the existing theme colors for the other uniforms.

Animations are deterministic authored joint poses: shot load/jump/release/follow-through and an arcing rim target; dribble bounce; guard/chamber/extension/retract/punch; forearm bump with alternating pair ball; split-leg cartwheel with ground correction. They are stylized loops, not physics or full inverse kinematics. Keep volleyball partners together in the player list: one ball is emitted by each even-indexed bump player. Angles/targets in the existing theme lists were runtime-checked.

### Ads

`ads.ts` exports `nevoAds`, `oriAds`, `adsFor(id)` and `AdDraw`, using the existing `(ctx,w,h) => void` callback form. Replace the current callbacks in `fanThemes.ts`; `fanBoards.ts` can keep its canvas-texture code. Wait for the existing Fredoka font before initial painting, as the game already does. Canvas source is resolution independent and does not need PNG downloads.

Eight poster PNGs are indexed-color exports totaling **126,440 bytes (123.5 KiB)**. If shipping images instead of drawing canvases, use these optimized files. This is transfer/file size, not GPU memory: eight uncompressed RGBA canvases at 768 × 384 need about 9 MiB before mipmaps. The images retain large short headlines, a simple left-side sport illustration and a high-contrast right-side message. Small subheadlines are for closer viewing, not a promise of readability at speed.

### Props and crowd

`props.ts` exports `hoop()`, `net()`, `foamFinger(color?)`, and `disposeProp(group)`. Replace the private hoop/net functions in `startline.ts` with these imports. Keep their visible-state toggling: both start hidden, with the original outer scales (hoop 1.3, net 1.25). Hoop target remains local `[0,3.25,0.6]` and is also available as `group.userData.rim`. Net span is 5.2 and tape height 2.45 before outer scale. Both use one vertex-colored opaque Toon mesh. Call `disposeProp` at teardown.

The crowd study mixes adult/child heights, white gis with visible belts, black/silver #1 tops and teal/pink foam fingers for Nevo; matching blue volleyball kit and kneepads for Ori. `preview.ts`'s `crowd()` is the placement/color example. Reuse the same Sideline instance to retain the six-batch budget; crowd and athletes both count toward capacity. Existing theme cheering signs can remain. To add many foam fingers, merge/instance the small 56-triangle prop instead of creating a draw per fan.

## Budgets and simplification

| Item | Triangles | Draw structure |
| --- | ---: | --- |
| Complete player | 1,490 | Shared torso/head/limbs/hands/shoes batches |
| Ball | 384 | One additional shared batch |
| Hoop | 664 | One mesh/material |
| Volleyball net and perched ball | 912 | One mesh/material |
| Foam finger | 56 | One mesh/material before any crowd batching |

The whole Sideline uses **six InstancedMeshes and one shared opaque MeshToonMaterial**, independent of player count, including balls. Hidden uniform feature geometry is included in the 1,490 count. No textures or transparency on players/props. `castShadow=false` on players holds this to six color-pass draws; enabling shadows would add a depth pass and needs a matching custom depth material for hidden features. The geometry is already within the brief: retain broad uniform blocks, eyes, hair cap, shoes and joint silhouette; remove facial highlights, thumb detail and ball seams first if making a cheaper distant LOD. Keep the gi belt and contrasting knee pads.

GPU geometry and instance storage are pooled; the readable authoring implementation still allocates temporary CPU pose arrays/vectors/colors during `update`. Pool these scratch values if adopting this as production code, and profile on the target phone. No 60-fps or full-game draw-budget claim is made from the isolated desktop preview.

## Palette

- Ink `#282538`, navy `#30334c`, basketball black `#19212d` / existing `#111214`, silver `#c4ced4`.
- Warm cream `#fff0d6`, `#fff1d8`, `#fff8e9`; white gi also accepts existing `#ffffff`.
- Team blue `#2466d4`, existing team `#2f6fdc`, light blue `#a9d9ff`, `#a8d4ff`, dark shorts `#25324e`.
- Fiesta teal `#00aaa6`, pink `#ed4e83`, orange ball `#f68c36`, rim `#ef7837`, gold `#ffd264`.
- Skin `#efbb91`, `#c8875b`, `#8b553c`, `#f0c9a7`; hair `#362c2c`, `#5c3a29`, `#a5703e`.
- Poster panels add coral `#dc5b54`, deep coral `#b83e42`, pale pink `#f5d9e5`, pale aqua `#e2f1eb`, sky `#a8d7f3`, cream `#fff1d5`. The exact canvas palette is in `ads.ts`.
- Study ground `#cbc4bb`, background `#dcd6d0`, sunset fog `#d39797`, asphalt `#4a4458`.

## Validation and review limits

`node art/mockups/08-fan-themes/validate.mjs` passes; results are in `validation.json`: geometry/palette/transform finiteness, triangle limits, six batches/one opaque material, 731 sampled frames across all activities, production PlayerSpec compatibility, capacity clamp, hidden ancestors, anchor-scale convention, idempotent resource disposal, all PNG sizes/dimensions and poster budget. A strict standalone TypeScript check passed for players/props/ads/preview. Browser reviewed poses, all turnarounds/props/posters, live cartwheel and portrait compositions. An initial WebGL attribute-limit failure was fixed by packing metadata into vec2 attributes; no new shader errors followed the fix and reload.

The legacy-style roadside location fails the 20 m portrait read: much of the board and some players are outside the frame. The 40 m view improves the headline, but players are small. **Recommend separate board/activity anchors as illustrated in `*-staged.png`**, with billboard x=6.5,z=-38 and activity x=5.7,z=-18, rotated along the shoulder. This is a staging proposal, not a source change or a production collision clearance guarantee. Start-line net/gymnast placement also needs Claude's camera pass; the existing wide local arrangement can fall off the right edge. Fine facial details are intentionally not expected to read at 40 m.

## Revision 1

Replaced the basic capsule-style athletes with six instanced part batches; authored five sports loops and four uniform families; rebuilt eight ads and two props; added crowd reuse/foam-finger example. Produced the requested modeler/key-pose/poster/chase views and a concrete portrait staging alternative. Ready for Claude's technical/art review and production integration decisions; no Ofir approval inferred.
