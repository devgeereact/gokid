# Subject Hub — design-match log

Screen: `/subject/[subject]` (`src/app/(app)/subject/[subject].tsx`), ten hubs — Maths, English,
Science, Geography, History, Computing, Art, Music, Languages, Religious Education.

**There is no mockup for this screen.** `design/gokid-screens.md` §4 specifies it in words only
("curriculum strands · progress · recommended sets · illustrations"). The closest reference is
`design/GoKid-subjectprogress-screen.png` (screen 17), which is what every surface below is matched
against — cards, type, radius, ring, strand row, focus card. Screen 17 reports on *past* work; the
hub points at *next* work. That difference is the screen's whole reason to exist, so section content
differs from the reference on purpose while every pixel value comes from it.

Simulator: iPhone 17 Pro (iOS 26.5), Expo dev client, hot reload. All shots via
`xcrun simctl openurl booted "gokid://subject/<slug>"` → `xcrun simctl io booted screenshot`.

---

## Iteration 1 — `subjecthub-1.png` (Maths)

First render. Compared against screen 17 **and** against the built `/progress/subject/maths` on the
same simulator (`dbg-sibling.png`), because that screen is the matched one and the device is wider
than the mockup's canvas — anything the sibling does at this width is the established behaviour, not
a diff.

Differed:
- Strand names truncated to one line ("Number and p…"); the sibling wraps to two. → dropped
  `numberOfLines`.
- Bar `w-16`; sibling/reference is `w-20`. → widened.
- Ring drawn in the subject accent (blue for Maths). Screen 17 draws it in study teal. → reverted to
  teal. The subject accent stays on the strand icons and washes.
- Meta pill read "26 sets completed"; the reference capitalises "15 Sets Completed". → matched.

Not fixable from code: `gokid-prog-maths.png` (and the other `prog-*` art) carries an opaque
near-white square, so a white box shows inside the wash disc. The matched screen 17 build has the
identical artefact with the identical asset — it is the asset, not the layout.

## Iteration 2 — `subjecthub-2.png` (Science), `subjecthub-3.png` (Music)

Differed:
- Long strand names ("Materials and their properties") wrapped to **three** lines, making rows ~150pt
  tall against the reference's two-line maximum. → shortened the strand labels in
  `src/lib/subjects.ts` to the curriculum's short forms ("Materials", "Plants", "Reading", …).
  Names that read as two lines on the reference ("Number and place value") were left alone.
- Verified the lower half by temporarily setting the ScrollView's `contentOffset` (removed after the
  shot — `simctl` cannot scroll). Recommended-sets strip and focus card render as designed; Music
  correctly falls back to its SF Symbol with no art.

## Iteration 3 — `subjecthub-4-entry.png` (study dashboard)

The new "Subjects" row on the dashboard truncated "Geo…" at `w-24`. → tiles to `w-28`, and `Subject`
gained a `short` field so "Religious Education" renders as "RE" on a tile (full name everywhere else).

## Iteration 4 — `subjecthub-5..10.png` (RE, English, Geography, History, Maths)

The standing badge ("Strong" / "Practice") that screen 17 sets inline beside the subject name does
not fit at ten subjects. Three placements were tried against the pixels:

1. Inline beside the name (as the reference) — wrapped onto its own line for every subject, because
   the name column is ~306px here against the reference's ~420px.
2. As a third pill in the meta row — wrapped the meta row to two lines; three pills need ~604px and
   the column is ~489px. Shortening the pill to "26 sets done" was tried and reverted: it bought the
   row but lost the reference's wording for a layout that still looked loose.
3. **Centred under the ring** (shipped) — no wrap, no reworded pills, and it reads with the number it
   grades: "56% Overall · Practice".

## Iteration 5 — `subjecthub-12.png` (Music), `subjecthub-13.png` (RE) — summary card restacked

Requested: art + subject name on top, blurb and ring below that, then the year / sets / standing
pills. The card is now three stacked rows instead of screen 17's two columns. This is the biggest
deliberate departure from the reference, and it pays for itself at ten subjects:

- The name gets the card's full width — "Religious Education" is one line again (was two).
- The blurb gets ~150pt more width — three lines against the old five, closer to the reference's two
  than the two-column version ever got at this device width.
- The standing badge is back in the pill row, where the other subject facts live.

## Iteration 6 — `subjecthub-14.png` (RE) — pill row on one line

The badge first wrapped onto a second line: three pills at the reference's "10 Sets Completed"
wording need ~343pt against the card's 322pt row. Shortened the sets pill to "10 sets" (the only
value in it either way) and tightened the row's gap from 12 to 8pt. All three pills now sit on one
line with ~85pt spare, so "Reception" — the widest year label — still fits.

---

## Still differs from screen 17, and why

- **Card is stacked, not two columns** — see iteration 5. The blurb still runs three lines where the
  mockup shows two; the mockup's canvas is narrower relative to its type, and the *matched* Subject
  Progress screen wraps to five at this device width.
- **White box behind the subject art** — an asset artefact in `gokid-prog-*.png`, present in the
  matched screen 17 build too. The symbol-only hubs (Music, RE) have no such box and look cleaner.
- **Standing badge is under the ring, not beside the name** — see iteration 4.
- **Strand icon discs all carry the subject's wash**, where screen 17 gives each topic row its own
  colour. Ten subjects × ~5 strands would need ~50 arbitrary tints; one wash per subject is what
  makes a hub recognisably *its* subject.
- **No "Recent sets" strip and no score badges.** Those are screen 17's job, one tap away via the
  card's "Progress" link.

## Inferred (not read from the design system)

Tokens added to `src/design/tokens.js`:
- `subject.computing / art / music / languages / re` — the design system tints five subjects; §4 needs
  ten. Mixed to the same recipe (very pale, ~L*95, warm-leaning) and hue-separated from the five.
- `subject-ink.*` — a saturated accent per subject for strand icons. The design system defines washes
  only; each is its wash's hue pushed to ~L*45 for contrast on white.

Screen decisions:
- **Mastery tone from percentage** (`teal ≥63`, `amber 40–62`, `red <40`). Screen 17 tags each row
  explicitly — Division at 50% is teal while Fractions at 50% is amber — which no rule reproduces.
  The thresholds are read off the rows that agree.
- **Standing threshold**: Strong at ≥65%, otherwise the design system's amber "practice" badge. The
  reference shows one state only ("Strong" on 80%).
- **Strand data** — names follow the UK National Curriculum programmes of study; percentages and set
  counts are demo constants (`src/lib/subjects.ts`), the same stand-in status as `src/lib/study.ts`.
- **Illustrations**: seven of ten subjects reuse existing art (History ← scales, Computing ← cube
  stack, Art ← mountain, Languages ← globe). Music and RE have no plausible asset and render their SF
  Symbol instead — the component takes either. Music's *set thumbnail* borrows the astronaut, which
  is a poor fit and wants real art.
- **Ring size 96pt**, matching screen 17, via the new shared `components/progress-ring.tsx`. That
  component's defaults reproduce screen 17's geometry exactly; the hub passes no overrides.

## Demo data added

- `src/lib/subjects.ts` — ten subjects: blurb, wash, accent, art/symbol, 4–6 strands each with
  progress, and a focus line. Every section of the hub has demo content for every subject.
- `src/lib/study.ts` — one Year 3 set each for History, Computing, Art, Music, Languages and RE
  (cards + quiz + mastered/revisit), so every hub's "Recommended sets" fills and its
  set → flashcards → quiz → results flow runs end to end. Previously only four subjects had sets.
