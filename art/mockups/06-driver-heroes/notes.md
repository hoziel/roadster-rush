# Driver hero cutouts — issue #44

## Revision 1 — November 10, 2026

Four transparent hero images for the approved driver-selection layout. Each shows the selected driver full-body, waving beside the original roadster with the near butterfly door raised. The far door is closed. All figures, tires and doors fit the canvas; the car faces lower right in front three-quarter view. No sponsor lettering, logos, nameplates or UI are embedded.

Followed the latest #44 comments: Nevo uses the updated factory outfit; Shiri is Pink (supersedes Midnight); Ofir is included as the fourth driver.

| File | Character reference | Car paint | Size |
| --- | --- | --- | --- |
| `nevo.png` | `assets-src/drivers/nevo-full.jpg`: spiky brown hair, clear goggles, charcoal factory coveralls/red trim | White `#f3f1ec` | 720×560 RGBA, 408 KB |
| `ori.png` | `assets-src/drivers/ori-full.jpg`: long brown hair, green eyes, red/yellow suit | Cherry red `#e8344e` | 720×560 RGBA, 444 KB |
| `shiri.png` | `assets-src/drivers/shiri-full.jpg`: wavy hair, freckles, sunglasses on head, black/gold suit | Pink `#ff69b4` | 720×560 RGBA, 461 KB |
| `ofir.png` | `assets-src/drivers/ofir-full.jpg`: brown hair, beard, sunglasses, silver space suit/orange trim | Black `#26272e` | 720×560 RGBA, 481 KB |

Car reference: `../01-player-roadster/doors-open.png`. Each image uses the supplied character illustration as the identity target; generated poses are new. The Nevo cutout established the common composition for the other three. Sources were viewed before generation. No additional real-person photos or downloaded models were introduced.

## Palette

Car colors above, glass `#2b2f4a`, tires `#1b1b22`, cream lights `#f4e9d8`, alloy `#bcc2cc`, warm rim light `#ffb664`. Character fabric targets: charcoal `#303640`, red `#c73a35`, yellow/gold `#e8b24b`, silver `#c7ced9`, orange `#e77b34`. Sunset review backgrounds use `#2a1650`, `#b0407a`, `#ff9a3c`; those backgrounds are CSS only, not in the PNGs.

## Integration

Use the PNG for the selected driver above the cards, replacing the placeholder hero while retaining live text/buttons in HTML. Render at about 360×280 CSS pixels with `object-fit: contain`. The files share a 720×560 canvas and include soft contact shadows on transparency. Do not flatten them against the preview gradient or stretch the proportions. No character/card identities are baked into the image as text; accessible labels belong in the screen implementation.

`index.html` previews all four over a sunset gradient and checkerboard at phone size. `preview.jpg` records the actual browser review. These are 2D game UI assets, not game scene or 3D character changes.

## Simplification for 3D

Keep the current native roadster mesh/door mechanism. For a future low-poly driver model, preserve hair/goggles or sunglasses silhouette and broad suit-color blocks; omit small fabric folds, seam stitches and specular streaks. Use a few rounded masses for fingers/gloves, simple boots, and no lettering/decal textures. The painted rim light is illustrative, not a requirement for additional lights in gameplay.

## Production and checks

Four built-in imagegen generations; prompts and original output paths in `../../../agents/codex/prompts/06-driver-heroes.md`. Sharp only resized to the common canvas and encoded PNG, preserving alpha. Confirmed all exports are 720×560 with actual alpha range 0–255 and under 2 MB. Browser-reviewed all four over sunset and checkerboard backgrounds: clean readable contours, complete figures/cars, raised near doors, correct paint/outfits, no visible logos or labels. No production UI code changed. No open questions block Claude's integration.
