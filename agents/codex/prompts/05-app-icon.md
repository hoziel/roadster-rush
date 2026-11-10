# App icon — Revision 1

Created 2026-11-10 using the built-in imagegen tool. No CLI/API fallback.

## Generation 1 — primary artwork

References: `art/mockups/03-austin-stretch/01-opening.jpg` and `art/mockups/01-player-roadster/red.png`.

```text
Use case: stylized-concept.
Create ONE outstanding square APP ICON for the original kid-friendly game Roadster Rush: Austin. 1024 x 1024 square, completely opaque full-bleed artwork, no rounded corners baked in, no outer border, no phone or presentation frame, no text, letters, numbers or logo marks.

Reference image 1 is the APPROVED game art direction: vivid sunset Austin, sophisticated stylized low-poly 3D, red electric roadster, warm rim light, polished toy-like materials. Use its art style and car identity, not its UI, title or busy scenery.
Reference image 2 is the actual original car geometry. Preserve its recognizable red angular wedge, low pointed hood, wide dark closed canopy, single continuous narrow cream headlight bar, black lower fascia and dark wheels with silver five-spoke alloys. No Tesla marks, real badges or exact real branded car. No generic convertible.

Icon composition: The red car is the single unmistakable focal subject, dramatic front three-quarter view, driving slightly toward the viewer and right. A bold sun disc and sweeping gold/orange motion ribbon behind it suggest speed and Austin sunset. Below, a very simple plum curved road shape creates a stable grounded shadow. Only two very subtle distant angular skyline silhouettes, reduced to broad shapes; no detailed buildings, no windows, no storefronts, no trees or people. Avoid clutter. No coins or extra vehicles.
Keep the ENTIRE essential car silhouette, including front nose and both visible wheels, inside a circle centered at the exact center of the square with radius 39% of the image width. No guide circle visible. Car width about 66–69% of canvas, vertically centered around 54%, with strong size hierarchy and room around it. Only nonessential background sun/glow/speed ribbon can extend beyond this region. Make it recognizable when reduced to 48 px.
Art finish: richly saturated red #e8344e with broad coral highlights and darker crimson facets, deep indigo glass, strong but thin warm cream running light, chunky dark tires, restrained silver spokes. Elegant soft ambient occlusion and golden rim light, clean controlled surfaces, no photographic texture, no tiny fine detail. Background saturated deep plum #2a1650 at corners grading through #b0407a to apricot #ff9a3c around the central sun. Strong silhouette separation. Confident, joyful, premium mobile-game icon, never aggressive.
No text, no UI, no badges, no realistic car marque, no watermark, no neon rainbow clutter. The polished red roadster must dominate, not the sun. Deliver the icon artwork itself filling the whole square.
```

Original output: `~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-aa0f083b-5aee-4389-a4a1-a96510d23fbb.png`

## Generation 2 — mask-safe composition

Reference: Generation 1 output.

```text
Use case: precise-object-edit.
Create a MASK-SAFE layout variant of this exact app icon. Keep the same red roadster design, front three-quarter camera angle, colors, lighting, wheels, headlight bar, sun disc, gold speed ribbon, purple background and high-quality 3D toy finish. No new elements, no text, no border, no visible guide lines.
Change only the car's scale/position and corresponding shadow: reduce the car so its ENTIRE silhouette INCLUDING both wheels, rear and front splitter lies inside the CENTRAL SAFE CIRCLE of radius 38% of the square canvas width centered at (50%,50%). Specifically put its complete bounding box approximately x=20% to 80% and y=34% to 70%; do not crop any part. Move it slightly upward from the original lower placement. Retain the same pose and proportions; do not squash or deform it. The car is still the primary subject; maintain strong bold contrast against the sunset. Background artwork should extend fully to all four square edges, opaque. This is a full square icon artwork, not a circular icon or framed presentation. Exactly square aspect ratio.
```

Original output: `~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-56344e50-fda9-43fa-9f09-c785cf6c057f.png`

Final exports use Sharp only for resizing, removing the unused alpha channel and PNG compression. No painted or composited image changes.
