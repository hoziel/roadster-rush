# Blossom paint — Revision 1

Issue #50 / brief `art/briefs/11-blossom-paint.md`. A polished watercolour replacement for Ori's pearl-white Blossom paint, with a pink-lilac nose, three large door blossoms, fine plum branches, buds and drifting petals. Most of the body stays white.

## Deliverable

**Use `blossom.png`: 1024×512, opaque sRGB PNG, 279,311 bytes.** It is the single production texture. No alpha, normal map, roughness map, added geometry or extra material is needed. The 256-color encoding preserves the watercolour washes within the 300 KB limit.

Original art made with the built-in image_gen tool, followed by two targeted layout edits and technical resize/PNG encoding with Sharp. No real wrap image was copied or traced; the supplied brief's written description was the input. Exact prompts are in `agents/codex/prompts/11-blossom-paint.md`. The generated style is watercolour; the car previews are actual native Three.js renders, not generated mockup cars.

## Why the flat painting looks elongated and low

The existing `projectSideUVs` normalizes over the **whole painted model**, including canopy-frame paint. Measured paint bounds are z −1.82…1.82 m and y .25…1.05899 m. With a 2:1 image, this produces about **2.2497× horizontal stretching** on vertical body panels. The upper door edge lands around image y=41–43%, measured downward from the top.

The first natural painting therefore looked wide and clipped on the door. The final painting deliberately elongates blossoms vertically and places them in the lower part of the texture. On the actual car they become fuller flowers contained on the doors. The upper ~42% and bottom ~10% stay quiet, protecting the hood, frame and sill from stretched detail. **Do not recenter or “correct” the flat image independently of the car.** Both sides use the same texture and remain nose-to-tail consistent.

## Previews

`gallery.html` / `gallery.jpg` show the review sheet. `index.html` is the interactive model with studio/game-sunset light, the old/new paint comparison and a Save image button. Run through the existing Vite server.

| Files | What they show |
| --- | --- |
| `blossom.png` | Flat UV-adjusted texture; this is the integration asset. |
| `polished-three-quarter-studio.png` | Front three-quarter beauty view. |
| `polished-front-studio.png`, `polished-side-studio.png`, `polished-right-side-studio.png`, `polished-back-studio.png` | Front, both sides and rear on neutral ground. |
| `polished-top-studio.png` | Quiet hood/deck/frame; no stretched flowers across the top. |
| `polished-doors-studio.png` | Butterfly doors open with the artwork attached correctly. |
| `polished-three-quarter-sunset.png`, `polished-side-sunset.png` | Existing game's warm lights: hemisphere #ffd9a8/#4a2a6a at 1.4, sun #ffb070 at 1.8. |
| `polished-chase-sunset.png` | Portrait 540×1170, 62° camera at (0,5,9.5), aimed at (0,1,−12). Simplified road context. |
| `baseline-side-studio.png` | Current procedural code paint, same car/light/framing as the polished side view. |

The other model renders are 1200×800, each under 179 KB. From directly behind, the car reads mostly pearl white: this follows the requested quiet tail. Blossoms read when the door side is visible; tiny stamens are close-up detail. Warm orange light still makes the white body peachy, while the cooler petals remain pink/lilac.

## Palette and low-poly guidance

Representative sampled colors: pearl `#fbf8fe`, nose blush `#fedcf8`, pale petals `#fee8f5`, middle pink `#fdb9e0`, berry heart `#d45c94`, lilac pigment `#ce89de`, deepest plum/stamen `#47031e`. These are samples within a continuous painted palette, not flat fill regions.

Use the existing car mesh/material. Keep the three large silhouettes and white negative space; do not model petals or branches as geometry. Standard mipmaps naturally remove the tiny brush/stamen detail at distance. No separate distant mesh is needed for this paint.

## Integration for Claude

1. Load the selected PNG as a normal `THREE.Texture`, set `colorSpace = THREE.SRGBColorSpace`, keep default `flipY = true`, ClampToEdge wrapping and mipmaps, and use anisotropy up to 4. Keep the paint material color white. No shader change is needed.
2. Keep `projectSideUVs` unchanged. Apply it while the car and both doors are in the closed rest pose, once before the doors animate. The UVs then stay attached to the moving skins.
3. Replace the current generated `CanvasTexture` in the Blossom paint path with the loaded image. The existing cache is typed `THREE.CanvasTexture`; it will need to accept `THREE.Texture`. Preload before displaying the painted car or keep the current procedural texture until the new one is ready. Preserve the existing free-paint/default-selection behavior.
4. Dispose the texture with the owning paint cache after all users are finished. The preview imports the production car and UV helper read-only; it does not alter game/public code.

## Checks and limits

Strict TypeScript passed. Image metadata confirms 1024×512, opaque sRGB and <300 KB. All 11 model previews are <2 MB. `validation.json` records sizes and measured projection bounds. Browser reviewed both sides, front/rear/top, opening doors, baseline comparison, sunset and chase renders; no console warnings/errors. No target-phone frame-rate claim. Production replacement/deployment remains Claude's work. No new direction question.
