# Roadster Rush app icon

## Revision 1 — November 10, 2026

Direct request from Ofir: “Also create a better app icon.” Extends the approved polished opening/gameplay screen direction. This is a replacement artwork package for Claude to integrate; no public icon, manifest or game config was changed by Codex.

## Artwork

A large red original roadster in front three-quarter view, a golden sunset disc, one sweeping speed ribbon, faint Austin-inspired skyline shapes and a plum road/background. The closed canopy, wedge body, cream running light and silver spoked wheels connect it to the current native car. No logo, lettering, real police markings or copied photo content.

The primary composition gives the car most of the icon. A separate maskable composition scales it down and moves it up so the nose, rear and wheels remain visible in the central safe circle. Both artworks are square, full bleed and opaque. Corners and masks exist only in the preview CSS.

References supplied to built-in imagegen: `../03-austin-stretch/01-opening.jpg` and `../01-player-roadster/red.png`. The second generation edits the first composition for masking. Complete prompts: `../../../agents/codex/prompts/05-app-icon.md`. Technical exports use Sharp for resizing/PNG compression only. Originals are preserved at their generated-image paths recorded with the prompts.

## Files

| File | Pixels | Use |
| --- | --- | --- |
| `app-icon-1024.png` | 1024 square | Primary master |
| `app-icon-512.png` | 512 square | Standard manifest icon |
| `app-icon-192.png` | 192 square | Standard manifest icon |
| `apple-touch-icon-180.png` | 180 square | Apple touch icon |
| `favicon-64.png` | 64 square | Small icon / generator input reference |
| `favicon-48.png` | 48 square | Favicon size |
| `favicon-32.png` | 32 square | Favicon size |
| `maskable-master-1024.png` | 1024 square | Separate maskable master |
| `maskable-icon-512.png` | 512 square | Manifest `purpose: maskable` |
| `index.html` | — | Review at `/art/mockups/05-app-icon/` |
| `preview.jpg` | 1280 × 1252 | Actual browser screenshot of size/mask checks |

All PNGs are under 2 MB; the largest is approximately 1.79 MB. Small exports are approximately 3–79 KB. Export dimensions, file size and absence of alpha were checked programmatically.

## Palette

Art-direction targets, with generated shading and gradients between them:

- Roadster red `#e8344e`
- Deep plum `#2a1650`
- Sunset magenta `#b0407a`
- Warm orange `#ff9a3c`
- Speed-ribbon gold `#ffd23f`
- Cream light `#f4e9d8`

## Build and simplification

This is raster app artwork, not a new 3D model or a request to rebuild the player car. If reproduced in-engine, keep the existing low-poly car, a single sun disc, one broad ribbon and two or three flat skyline masses. Broad red body, dark canopy and cream light must carry the small silhouette; omit handle/seam detail at tiny sizes. Use simple shading and no photo textures. The screenshot's illustration bloom and road streaks need not become game effects.

## Claude integration handoff

The current `pwa-assets.config.ts` reads `public/icon.svg` using `minimal2023Preset`, with zero maskable/Apple padding. The installed preset emits standard 64/192/512, maskable 512, Apple 180 and ICO 48. `vite.config.ts` enables this through `pwaAssets.config: true`.

Replace the placeholder through the project's code/config workflow. Preserve the distinction between standard and maskable compositions: do not generate the maskable icon from the oversized primary artwork with zero padding. Either use the supplied dedicated maskable PNG or adapt the generation configuration to use its master. Keep standard icons `purpose: any` and the separate maskable icon `purpose: maskable`; verify the final manifest, generated favicon/Apple references and installed launch icon after integration. Codex has not performed an installed-PWA test or changed those owned paths.

The guaranteed maskable safe area is a centered circle of radius 40% of the icon width; artwork outside may be cropped. Source: [W3C Web Application Manifest — Icon masks and safe zone](https://w3c.github.io/manifest/#icon-masks).

## Visual verification

Browser-reviewed the actual exports at 64, 48 and 32 CSS pixels on dark and light backgrounds. The red car and sun remain identifiable; fine wheel/door detail naturally disappears at 32 px. Checked the separate maskable composition with circular, rounded-square and strict radius-40% crops: the full essential car stays inside. `preview.jpg` records these checks. No game tests are required for this isolated artwork package.

The existing PWA implementation issue #36 is closed. Integration handoff: [#43](https://github.com/hoziel/roadster-rush/issues/43), artwork commit `f5d4114` (not pushed). Board add/inbox commands returned `unknown owner type`, so the issue header is the handoff per COLLAB.md §3. No new taste question blocks integration.
