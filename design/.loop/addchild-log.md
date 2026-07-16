# Add-a-child screen — design-match loop

Reference: `design/GoKid-addchild-screen.png` (853 × 1844 px → a 393 × 852 pt screen, 1 pt = 2.170 px,
same calibration as the auth screen). Simulator: iPhone 17 Pro, 402 × 874 pt.

## Calibration & measurements (off the reference, not eyeballed)

| Element | Measured (pt) |
|---|---|
| Background | mock `#FEFDFB`; used design-system `#FBF9F6` (bg-background) |
| Heading "Add a child" | y 109–138, cap ≈ 19 → 28pt bold, **rounded** (H2) |
| Avatar circle | Ø ≈ 152–162, centre (200, 232), lavender bg `#E3E0ED`, camera badge overlapping ~4:30 |
| First-name label | cap ≈ 10 → ~15pt (Body), medium, ink |
| Input "Rufus" | y 354–406, h 52, value cap ≈ 14 → ~20pt (new `field` token) |
| Year-group chips | y 456–501, chip ≈ 38 × 44, selected Y3 fill teal `#057779` ≈ primary |
| Birth month/year dropdowns | y 558–605, h ≈ 47, value ~17–20pt, chevron.down right |
| Privacy row | y 648–666, shield + ~17pt text-secondary `#696D76` |
| Add-child button | y 733–786, h ≈ 53, x 31–360 (page padding ≈ 32 = px-8), teal, **pill** |

### Decisions before writing code
- **"3. Add a Child" step label and the outer rounded card frame are mock chrome, omitted.**
  Same call as the auth screen's "2. Parent Welcome": these are the design file's frame numbering
  + a faint device-frame border (measured `#EDEDEB` at x≈14pt, same bg inside and out). The real
  screen is full-bleed.
- **Camera badge is baked into the avatar asset.** The badge overlaps the fox circle's edge, so a
  clean circular crop can't exclude it. Cropped the square (fox + lavender + badge), shifted the
  paper corners to bg-background so it seams invisibly (auth-hero pattern). Not yet an interactive
  photo-picker — visual only. → `assets/images/gokid-child-avatar.png` (347 × 348 px).
- **Year group is 7 separate rounded chips with gaps**, not the design-system's connected
  segmented control. The screen (source of truth) shows discrete chips; matched that.

### Tokens added to `tailwind.config.js`
| Token | Value | Basis |
|---|---|---|
| `spacing.13` | 52px | **inferred** — input/button height; off the 8pt grid (48/56 bracket it) |
| `text-field` | 20 / 24 | **inferred** — input value & button label; between Body Large (17) and H3 (22) |
| `w-avatar` / `h-avatar` | 160px | avatar crop's on-screen size |

Everything else (colours, px-8 page padding, chip radius md=12, h-11 chip, primary fill, pill via
rounded-full) is an existing design-system token.

---

## Iteration 1

Renders on the simulator (routed via a temporary `index.tsx` bypass of auth — reverted at the end).
`npx tsc --noEmit` and `npm run lint` both clean before the screenshot.

**Band compare (normalised to pt), ref → shot:**
- Content span heading→privacy: ref 557pt, mine 555pt — matches in aggregate. ✓
- Input h 52.5 → 52.0 ✓ · chips h 45 → 44 ✓ · dropdowns h 47 → 48 ✓ · privacy row aligned ✓
- **Button ~15pt too low**: ref sits 66pt above the screen bottom, mine 50pt (safe-area 34 + mb-4 16).
- Heading sits ~24pt higher than the reference at the top — a consequence of dropping the card
  frame + the sim being 22pt taller. The mid-section (input/chips) still lands on the reference,
  so the top/bottom split is the taller-screen trade-off (same as auth: bottom-anchored).

**Fixes for iteration 2:** button `mb-4 → mb-8` (raise it to the reference's 66pt bottom gap);
header `mt-4 → mt-6` for a little more air under the Dynamic Island.

**Deliberately inferred:** the three tokens above; the chrome-omission decisions.

---

## Iteration 2

Applied: button `mb-4 → mb-8`, header `mt-4 → mt-6`. tsc + lint clean.

Band compare: **button bottom gap now 66pt = the reference exactly** ✓. Input/chips/dropdown
heights still match. Remaining: the form section measured ~43pt more spread than the reference —
too much air above and below the avatar (heading→avatar +14, avatar→label +18) — which pushed the
mid-content 12–18pt low while the heading sat ~24pt high.

## Iteration 3

Applied: header `mt-6 → mt-10` (push the heading/​grouping down), avatar `mt-5 → mt-2` and
first-name `mt-6 → mt-3` (tighten the avatar's air to the reference's tight grouping). tsc + lint clean.

Band compare, ref → shot (both pt):
- Heading **109 = 109** ✓ · Avatar 156 → 150 (6 high) · Input 354 → 352 ✓ · YG label 430 → 434 ✓
- Chips 456 → 462 (6 low) · Dropdowns 558 → 568 (10 low) · Privacy 648 → 644 ✓ · Button gap 66 ✓
- Every band now within ~10pt on an 852pt screen (≈1%). The avatar's air matches the reference.

## Iteration 4 — STOP

Applied: back chevron `weight semibold → medium` (the reference reads lighter). tsc + lint clean.
Layout identical to iteration 3 (stable) — chevron only. Screenshot is indistinguishable from the
reference at a glance, and iterations 3→4 produced no new fixable layout diff. **Stopping** (stop
condition 1).

## What still differs, and why

1. **Dropdowns ~10pt lower than the reference** (accumulated from chips being ~6pt low). Sub-1%
   on the screen height; not visible at a glance. Fully closing it would over-tighten the
   birth-section gap, which reads worse.
2. **Camera badge is baked into the avatar asset**, so its soft drop-shadow is clipped by the
   crop's square bottom edge — a faint seam at the badge's lower-right. Fixing it properly means
   rebuilding the badge as a live component (white circle + `camera` SF Symbol + shadow) over a
   badge-free fox crop, which needs the fox body inpainted where the badge currently sits. Left as
   the baked asset for the visual match; flagged for the real photo-picker work.
3. **Screen height** — reference is 393 × 852pt, the simulator 402 × 874pt. Content is
   effectively bottom-anchored (button gap pinned), so the extra 22pt lands as a slightly larger
   heading→button span, exactly as on the auth screen.
4. **Background `#FBF9F6`** (design-system token) vs the mock's `#FEFDFB`. Avatar crop corners
   were shifted to the token so they seam invisibly.

## Values inferred rather than read from the design system

| Token | Value | Basis |
|---|---|---|
| `spacing.13` | 52px | Input & button height measured 52 / 52.5; off the 8pt grid (48/56 bracket it). |
| `text-field` | 20 / 24 | Input value & button-label cap heights → ~20px; between Body Large (17) and H3 (22). |
| `w/h-avatar` | 160px | Avatar crop's on-screen size; the fox circle Ø ≈ 152 matches the reference. |
| Page padding | px-8 (32) | Button fill measured x31.8 inset → 32; not the auth screen's 48. |
| Chip radius / height | md (12) / h-11 (44) | Chip measured 38 × 44, corner ≈ 12 — existing tokens. |
| Button shape | rounded-full pill | Reference "Add child" is a full pill (h ≈ 52, radius ≈ h/2). |

Colours (primary teal, ink, border, text-secondary), the 44pt chip height, and the 12pt chip
radius are existing design-system tokens and landed on the reference.

## Verification note

The screen **renders on the booted iPhone 17 Pro simulator** (iterations 1–4 are live screenshots),
reached via a temporary `index.tsx` route that bypassed Clerk auth. That temporary route has been
**reverted** — `index.tsx` is back to the auth gate. The screen file lives at
`src/app/(app)/add-child.tsx`; it is not yet linked from any in-app navigation (no button routes to
it), and the form is static demo data — both are future wiring, out of scope for this visual build.
