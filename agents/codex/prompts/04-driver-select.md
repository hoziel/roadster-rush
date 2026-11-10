# Driver selection — prompt record

Mode: built-in imagegen; no CLI/API fallback. Use case: ui-mockup. One generation selected after visual review.

## Reference inputs

- Approved visual/UI style: art/mockups/03-austin-stretch/01-opening.jpg.
- Supporting native car geometry reference: art/mockups/01-player-roadster/doors-open.png. Repainted red within the generated concept.
- Driver names, IDs and color targets read from src/ui/drivers.ts. Characters are invented placeholder illustrations, not portraits of real people.

## Final prompt

Use case: ui-mockup.
Create ONE exceptionally polished DRIVER SELECTION SCREEN for ROADSTER RUSH: AUSTIN. Exact tall portrait 9:19.5 canvas, ideally 852 x 1846 or 720 x 1560. Full-bleed mobile game UI, no phone bezel, no external labels.
Input image 1 is the APPROVED opening screen: match its cream-and-plum dimensional UI, gold primary button, gorgeous low-poly Austin sunset, warm rim lighting, crisp typography, satin toy materials and high craft. This is the next screen after tapping DRIVERS, not another opening screen.
Input image 2 is the actual original roadster with butterfly doors open, supplied only as a geometry reference. If shown, repaint it the same red #e8344e as image 1, preserve its wedge nose, broad dark closed canopy, slim light strip and silver-spoked wheels. Never turn it into a convertible. No real brand or marks.

Layout and flow:
Top 15%: a round cream back-arrow button in the upper left, and a beautifully typeset two-line cream/plum title centered, exact text "CHOOSE YOUR" above "DRIVER". Under title, small friendly line "Who's taking the wheel?" in cream. No huge Roadster Rush logo, no currency or score HUD.
Middle 35%: a warm scenic character-preview stage with a subtly blurred low-poly Austin sunset backdrop, terracotta shops, faceted trees, distant Capitol dome with a plain architectural spire. On this stage, show the selected driver BOLT as a large original stylized toy-like human character, standing confidently and waving beside the red roadster at front three-quarter angle. The character is the focus, the car is supporting, both fit fully inside the screen with room to breathe. Bolt is a friendly youthful cartoon character with medium-brown skin (#c68a5e), short dark hair (#1d1d26), cheerful warm expression, simple cyan jacket (#35e0ff), dark shorts and chunky cream sneakers. Large expressive face, simple sculpted hair masses, lightly faceted/rounded 3D shapes, no skin texture or realism. Character proportions consistent with a playful kid-friendly game, no resemblance to a real person. One butterfly door can be raised to welcome the selected driver, but do not obscure Bolt's face. Small dark-plum name pill below the preview reads "BOLT".
Next 30%: a clean 2-by-2 grid of FOUR generous cream portrait cards with rounded corners, plum depth and clear equal spacing. Every card has a large readable smiling character bust and short uppercase name, no descriptions. Top-left "ZOOM": peach skin #f2c7a5, brown hair #5a3a22, magenta accent #ff4fd8. Top-right "BOLT": same face, skin, hair and cyan outfit as the large selected hero. Bottom-left "SUNNY": deep brown skin #8d5a3b, warm rust-red hair #e04a2a, gold accent #ffd23f. Bottom-right "PIP": fair peach skin #f6d9c2, blonde hair #e8c060, bright green accent #4cff6a. Vary the simple hair silhouettes and cheerful expressions, keep the four portraits coherent and original. All four characters available, none locked. BOLT card visibly selected with a thick cyan ring, cream/gold emphasis and a small green circular checkmark at its top corner; selection must be obvious independent of color.
Bottom 15%: one wide beautiful amber/gold dimensional button reading "LET'S DRIVE" with play triangle, same design as opening reference. Beneath it a small passive cream "KID MODE" with a green check icon, not another switch. No price, purchase, power stats, speed/handling bars, rarity, progress meter or advantages. Driver choice is cosmetic and free.

Exact text only: "CHOOSE YOUR", "DRIVER", "Who's taking the wheel?", "BOLT" under preview, four card labels "ZOOM", "BOLT", "SUNNY", "PIP", primary "LET'S DRIVE", footer "KID MODE". Make all words crisp, correctly spelled and well aligned. Keep comfortable tap targets and safe margins at top/bottom.
Palette from approved screen: #2a1650 plum, #b0407a sunset magenta, #ff9a3c apricot, #f4e9d8 cream, #ffd23f gold, red car #e8344e. Cyan is the selection accent. Background stays quieter behind portrait cards. Preserve polished low-poly buildability, simplified shapes, controlled glow and soft shadows. Avoid visual clutter, random icons, literal owl statues, real people, real brands, watermarks and copied game characters.

## Output

Original generated file: ~/.codex/generated_images/01a1c395-d433-7ba3-a364-b7cac5d9afaa/exec-729d62cc-0f14-47e0-acbb-9ab78a57ae88.png

Project final: art/mockups/04-driver-select/driver-select.jpg. Resampled to 720×1560 (9:19.5), JPEG quality 95 / 4:4:4. No compositing or manual artwork edits outside imagegen. The repository JPEG is self-contained; the original tool output remains in place.
