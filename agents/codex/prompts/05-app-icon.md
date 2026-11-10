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


## Revision 2 — hovering icon

Created 2026-11-10 with built-in imagegen. Supersedes the grounded icon exports in place.

### Generation 3 — hover edit

Reference: `art/mockups/05-app-icon/app-icon-1024.png` as committed in `f5d4114`.

```text
Use case: precise-object-edit.
Edit this exact Roadster Rush app icon so the red car is unmistakably HOVERING above the road, supported by powerful clean air thrusters. Preserve the exact original red car design, dark closed canopy, silver spoked wheels, cream light bar, three-quarter camera angle, sun disc, golden speed ribbon, faint skyline and purple-magenta-orange palette. Preserve the polished toy-like 3D illustration finish and square icon composition.
Lift the whole car vertically, without changing its scale or proportions, so every visible tire is clearly detached from the road. Make a generous visible air gap roughly half a wheel diameter below the wheels, with a soft detached elliptical shadow on the ground below. Keep wheels vertical and in their normal car positions. The car should feel level and controlled, with only a very slight nose-up tilt.
Add strong white compressed-air vapor jets with a cool pale-cyan core, aimed straight down from small concealed underbody thruster outlets near the front and rear axle. Two visible jets, with a hint of far-side airflow, are enough. They flare into soft rolling white vapor and curved air wisps close to the road; make the airflow visually substantial and easy to read at small icon sizes, but leave the body, tires and the visible gap unobscured. Clean friendly air, not fire, not black smoke. No rocket fins, wings, hoverboard, glowing wheel conversion, extra accessories, text, brand, border or baked corners. No change to the background design. Full-bleed opaque square, exactly 1:1. This is the actual icon artwork, not a presentation mockup.
```

Original output: `~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-8b0d65db-043d-40f9-8766-cb4bfdc1ce3d.png`

### Generation 4 — hover maskable composition

Reference: Generation 3 output.

```text
Use case: precise-object-edit.
Create a mask-safe variant of this exact hovering-roadster app icon. Preserve the exact car design, suspended pose, normal vertical wheels, bright pale-cyan and white downward air jets, fluffy ground vapor, detached shadow, sunset disc, golden ribbon, skyline and colors. Keep the same camera angle and polished toy-like finish.
Change only the SCALE AND POSITION of the hovering car plus its complete two jets, ground vapor and shadow as one coherent group. Reduce that group to roughly 64% of its present size and center it vertically. Put the full car silhouette in approximately x=20% to 80%, y=32% to 61%. The visible jet cores and main white vapor should occupy y=58% to 70%. Keep the whole car and essential two vapor jets inside a centered circle of radius 38% of the canvas width. Preserve a very obvious air gap between the wheels and the detached ground shadow. Do not shrink individual parts relative to each other or alter the body proportions. The background continues full bleed across the square. No borders, no visible guide circles, no rounded corners, no text. Opaque exactly square icon artwork.
```

Original output: `~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-b29ead2b-0bbc-42a1-8c1a-fc3bb2378ffd.png`


## Revision 3 — four wheel bursts

Requested 2026-11-10. Built-in imagegen precise edits; existing Revision 2 primary icon used as reference.

### Generation 5 — wheel-aligned bursts

```text
Use case: precise-object-edit.
Edit this exact hovering red roadster app icon. Replace the current TWO centrally placed air jets with EXACTLY FOUR SEPARATE AIR BURSTS, ONE DIRECTLY BENEATH EACH OF THE CAR'S FOUR WHEELS. The wheel-to-jet relationship is the key requirement: front-left wheel, rear-left wheel, front-right wheel, rear-right wheel each has its own downward cyan-white jet and small separate white vapor footprint. Delete the old jets under the center of the body. Keep normal vertical wheels.
Keep the same original red body, dark canopy, silver rims, hover height, sunset disc, gold ribbon, purple/magenta palette and polished toy-like 3D finish. Use perspective correctly: two near-side wheel jets are prominent and two far-side jets are smaller behind them. Far wheels may be partly occluded by the body, but all FOUR jet columns and FOUR distinct plume bases must be visibly countable below the car. Slightly adjust the three-quarter view only if necessary to separate their projections. Each jet originates immediately below its own tire/wheel position, never from the middle of the chassis. Increase the clear ground gap a little if needed so rear jets are visible behind the near jets. The four jets occupy a rectangular footprint under the car in perspective, not four jets arbitrarily spaced in a straight row. Avoid merging the four separate plumes into one cloud. White compressed-air vapor with pale cyan centers, no fire.
Preserve the icon's subject scale, background and clean silhouette. No extra wheels, no extra car parts, no lettering, no brands, no border or rounded corners. Exactly square opaque full-bleed artwork.
```

Original: `~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-bc1f952d-1538-4b98-8f71-75f8727b40c5.png`

### Generation 6 — maskable

Reference: Generation 5 output.

```text
Use case: precise-object-edit.
Create a mask-safe composition of this exact icon. Preserve the car and EXACTLY FOUR wheel-aligned compressed-air jets, including all four distinct white plume footprints, as a coherent group. The large near-side two jets and smaller far-side two jets must remain four visibly separate bursts under four wheel positions, with the same proper perspective. Do not change the design or invent extra jets. Scale the entire car, all four jets and shadow down together to 67% of their current size, then recenter them in the square so the whole car plus all four plumes fit INSIDE a central circle of radius 38% of the canvas width. Car bounds roughly x=20% to80%, y=32% to60%, jet bases no lower than73%. Preserve the air gap, wheel-to-jet alignment, sunset, gold ribbon, skyline, purple background and polished finish. Full opaque square artwork, no guide circle, no framing, no rounded corners, no text.
```

Original: `~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-007a1f9e-2541-4f16-99c1-cbb8274cddd9.png`
