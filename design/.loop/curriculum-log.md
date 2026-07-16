# Curriculum Browser — design-match log

Screen: `src/app/(app)/curriculum.tsx` (route `/curriculum`, params `?year=`, `?subject=`)
Data: `src/lib/curriculum.ts`
Reference: **none exists.** `design/gokid-screens.md` §5 lists "Curriculum Browser" as missing and
§21 ("Curriculum Explorer") asks for Reception–Year 6 + Curriculum Objectives + Learning Outcomes +
National Curriculum Browser. No PNG was ever drawn for any of them.

Because there is no mockup, the match target is **`design/GoKid-design-system.png` component-by-component**
plus the nearest built screen (`src/app/(app)/subject/[subject].tsx`, the Subject Hub), which sits one
tap away and must not read as a different app. Every element below traces to a component the design
system already draws — nothing was improvised.

| Element | Sourced from |
|---|---|
| Year picker (Rec · Y1…Y6) | design system **09. INPUTS → Segmented Control**, which spells out those exact seven segments |
| Year capsule ("Summer term") | **06. CHIPS / BADGES → Curriculum Capsule** ("Year 3 · Autumn term") |
| Set rows | **07. CARDS → Set Card (List)** — thumb, title, "Maths · Number and place value", mastery chip |
| Mastery chip | **06. CHIPS / BADGES** — solid fill + white label (`status.getting` / `status.learning`) |
| Summary ring, white-card-on-cream, bars, pills | Subject Hub (screen 17 lineage) |
| Icons | `expo-symbols` SF Symbols, per **08. ICONS** |

---

## Iteration 1

Rendered on iPhone 17 Pro sim via the preview-route trick (see below). Read `curriculum-1.png` back
against the design system.

**Diffs found:**
1. **Third meta pill overflowed the card** — "3/8 object…" clipped at the right edge. Three pills at
   that wording overrun the 313pt inner card row.
2. **Subject sub-labels wrapped to two lines** — "1 set • 1/3 objectives" broke. The bar (`w-16`) +
   percent (`w-10`) + chevron squeezed the text column to ~111pt.
3. **Subject art drew a white square inside the round wash disc** — `subject.art` PNGs are
   square-backed; at a 40pt disc the box is obvious.

**Changes:**
1. Dropped the "Key Stage 1" pill — it already heads the section directly below (`National
   Curriculum • Key Stage 1`), so it was duplicated ink. Pills are now subjects · sets · done.
   (Same overflow the Subject Hub hit and solved by shortening its wording.)
2. Bar to `w-12`, margins to `mx-2`, sub-label `numberOfLines={1}` — text column ~143pt, fits.
3. Collapsed rows now use the subject's **SF Symbol tinted with `subject.ink`**, not its
   illustration — exactly what the Subject Hub's own strand rows do at this size.

## Iteration 2

`curriculum-2.png`: all three fixed. Pills fit inside the card, sub-labels are single-line, discs
carry clean tinted glyphs. No new diffs.

## Iteration 3 — expanded state

`simctl` cannot tap, so instead of a throwaway hack the screen gained a real `?subject=` param
(the Subject Hub deep-links back in with it). `curriculum-3-expanded.png` (`?year=Y3&subject=maths`)
and `curriculum-4-sets.png` (`?year=Y6&subject=science`) verify the objectives checklist: met rows
take `checkmark.circle.fill` in `success`, unmet take an empty `circle` in `border`, each with its
strand as a sub-label, and the row chevron flips `chevron.down` → `chevron.up`.

## Iteration 4 — set rows

The set rows sat below the fold and `simctl` cannot scroll, so the ScrollView was temporarily given
`contentOffset={{x:0,y:1100}}`, screenshotted (`curriculum-5-setrows.png`), and **the offset was
reverted**. Confirms the Set Card (List): thumb, title, "Science • Evolution and inheritance",
amber "Learning" pill, "9 of 15 cards", chevron. Matches the design system's card.

**Stopped here** — no reference to converge on, every design-system component accounted for, and the
last two iterations produced no new fixable diffs.

---

## Inferred (NOT read from a reference)

Listed because there is no mockup for this screen, so *the layout itself* is inferred; these are the
specific judgement calls a reviewer should challenge:

- **The whole layout.** Header → year picker → summary card → accordion. Assembled from design-system
  components; no PNG defines this arrangement.
- **Accordion, not a push.** §21 asks the browser to let a parent *compare* what a year covers;
  comparing means opening two subjects without losing your place. A push navigation would lose it.
- **Objectives met** (`metCount`, `src/lib/curriculum.ts`). The demo shelf tracks progress per *card*,
  not per objective, so a section that is `pct` complete is treated as having met that share of its
  objectives, front-loaded. Real per-objective mastery needs the progress API (AGENTS.md).
- **Objective wording.** Curated from the UK National Curriculum programmes of study (EYFS/KS1/KS2) —
  the same reasoning `src/lib/subjects.ts` applies to its strand names. Year/subject pairs the shelf
  has sets for are curated; anything else falls back to `derivedObjectives` (one objective per set
  topic) so no section is empty.
- **Year blurbs and key-stage labels.** Written for this screen; no reference supplies them.
- **Tone thresholds** (teal ≥63, amber ≥40, red below). Copied from the Subject Hub deliberately —
  the two screens show the same percentages one tap apart, so a number must not change colour
  between them.
- **Term boundaries** (`currentTerm`): Autumn Sep–Dec, Spring Jan–Mar, Summer Apr–Aug. The summer
  holiday reads as the term just finished, which is the term whose work a parent is still looking at.
- **`w-12` bar / `mx-2`**, tighter than the Subject Hub's `w-20` / `mx-3` — this row carries a longer
  sub-label than the hub's "5 of 7 sets" and wrapped at the hub's widths.
- **Key stage demoted** from a pill to the section subheading (see iteration 1).

## Not verified

- **Tapping.** `simctl` cannot tap, so the accordion toggle, year switching and row navigation were
  verified by rendering each state via params + reading the `useState` logic — not by pressing them.
- **No token was added.** Every value resolves to an existing token in `tailwind.config.js` /
  `src/design/tokens.js`; the screen needed no new ones.

## Repro

```bash
printf 'export { default } from "./(app)/curriculum"\n' > src/app/curriculum-preview.tsx
xcrun simctl openurl booted "gokid://intro" ; sleep 3
xcrun simctl openurl booted "gokid://curriculum-preview?year=Y3&subject=maths" ; sleep 5
xcrun simctl io booted screenshot "$PWD/design/.loop/curriculum-N.png"
rm src/app/curriculum-preview.tsx   # delete when done — it bypasses the Clerk auth guard
```

The preview route is required because `(app)/_layout.tsx` redirects to `/sign-in` when Clerk is
signed out, and `simctl` cannot tap through Apple/Google sign-in. Bouncing through `gokid://intro`
first is required because deep-linking the same path with different params is a no-op.
