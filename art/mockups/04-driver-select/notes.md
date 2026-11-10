# Driver selection screen

## Revision 1 — November 10, 2026

Ofir requested a driver selection mockup after calling the four opening/gameplay concepts “perfect.” This screen carries that accepted visual direction forward. The new driver selection image itself is ready for review; the character designs remain placeholders.

`driver-select.jpg` is a **720×1560 portrait screen (9:19.5), under 2 MB**, generated with the built-in imagegen tool. It is a visual concept, not an implemented screen. The final prompt and input roles are recorded in `agents/codex/prompts/04-driver-select.md`.

## What the image shows

A cream/plum Choose Your Driver title and back control; a large selected Bolt waving beside the original red roadster with one butterfly door raised; four free driver cards in a 2×2 grid; an obvious cyan outline and green check on Bolt; a gold Let's Drive primary action; and a passive Kid Mode status. The sunset Austin scene and button styling match the approved opening mockup.

The roster comes from `src/ui/drivers.ts`, not newly invented game identities:

| ID | Name | Card/outfit accent | Skin target | Hair target |
|---|---|---|---|---|
| d1 | Zoom | `#ff4fd8` | `#f2c7a5` | `#5a3a22` |
| d2 | Bolt | `#35e0ff` | `#c68a5e` | `#1d1d26` |
| d3 | Sunny | `#ffd23f` | `#8d5a3b` | `#e04a2a` |
| d4 | Pip | `#4cff6a` | `#f6d9c2` | `#e8c060` |

Faces, hairstyles, clothes and poses are original illustrative placeholders. Ofir still supplies the final driver characters under #31. No real-person photos were used or added. Palette values describe design targets; the rendered highlights vary.

## UI and palette

Cream `#f4e9d8`, plum `#2a1650`, sunset magenta `#b0407a`, apricot horizon `#ff9a3c`, primary gold `#ffd23f`, red car `#e8344e`, selection cyan `#35e0ff`, and confirmation green `#74d820`. Dark road/glass/trim follow the existing roadster studies.

Suggested behavior: tapping a card updates the selected state and large preview; Let's Drive confirms the selection and continues to the run. Back returns to the previous screen. Drivers are free and cosmetic, with no locks, prices, rarity or performance stats. Preserve the stored d1–d4 IDs rather than use display names as keys. Use the checkmark as well as color to communicate selection; provide a labeled radio-group equivalent in implementation. Keep the large card targets and bottom action reachable on portrait phones.

## Build simplification

Use responsive DOM/SVG for title, cards and buttons, with the project's licensed rounded font and simple layered shadows. Keep each portrait's silhouette, hair mass and outfit color, rather than reproducing every illustrated facial highlight. For 3D characters, use a small set of chunky head/hair/body pieces and a simple wave pose; avoid individual hair strands and detailed cloth geometry. The selected hero could use an isolated preview render or a baked illustration after character approval.

The car reference is the current native roadster, not a request to replace its geometry. The open door offers a useful selection-screen pose. This does not settle the existing gameplay driver-visibility question beneath the closed canopy. No photo uploads, names on the car, paint-shop controls or license-plate design are included in this request.

## Validation and handoff

Reviewed the title/copy, four names, one selected card, selected hero/card consistency, visible checkmark, car silhouette, raised door, margins and action hierarchy. Verified the final dimensions and byte size. No game code changed.

Handoff goes on #32, which also covers paint shop and license plate; those other portions are outside this screen request. The board CLI still reports `unknown owner type`, so use comment-only handoff under COLLAB.md §3. Ofir's approval of the prior four-screen direction was recorded separately on #16 for Claude to carry into the style guide.
