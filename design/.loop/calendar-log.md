# Learning Calendar — design-match loop log

**Screen:** `/progress/calendar` (`src/app/(app)/(tabs)/progress/calendar.tsx`)
**Scope:** `design/gokid-screens.md` §8 → "Learning Calendar". The period switch also stands in for
§8's "Weekly Progress" / "Monthly Progress" / "Yearly Progress" — the same record at three zoom
levels, not three screens.

**No design reference exists for this screen.** Closest ref, used for surface / type / radius /
tile geometry only: `design/GoKid-progressoverview-screen.png` (screen 16). Per LOOP-PROMPT's
"screens with NO design reference" rule, this is matched to that ref's *language*, not to its layout.

**Data:** every child's history is demo — `src/lib/calendar.ts`, a deterministic seeded record
(FNV-1a hash per child+day+field, so a day's numbers are identical no matter which view asks).
Real sessions from `src/lib/reviews.ts` are overlaid on the days they cover. Single seam to swap
when the Neon/Drizzle progress API lands (AGENTS.md).

---

## Iteration 1 — `calendar-1.png`

First render. Month view, real Clerk child (Gideon / Year 6), streak pill, heat grid, legend, day
sheet all present.

Diffs found:
- **Stat-tile labels wrapped.** "Days studied" broke to two lines and "Accuracy" broke mid-word to
  "Accura / cy". Three tiles across leave ~47pt of label track after the 32pt disc — overview.tsx's
  `text-caption` (13px) does not fit there.
- **`rounded-sm` (8px) turns small swatches into circles.** The legend chips (12pt) and the year
  grid's day cells (8pt) read as dots, not squares. The design system's smallest radius is `sm`.

Changed:
- Tile labels → `text-tile` (11/14) + `numberOfLines={1}`; labels shortened to "Days" / "Time" /
  "Accuracy".
- Added `borderRadius.xs = 3px` token (INFERRED — see below); legend + year cells use it.

## Iteration 2 — `calendar-2.png`

Legend swatches now read as squares. "Accura…" still truncating (ellipsis rather than a wrap, so
the `numberOfLines` took but the track is genuinely too narrow).

Changed:
- Stat-tile disc 32pt → 28pt, `gap-2` → `gap-1`, symbol 16 → 15. Buys ~10pt of label track; the
  ref's 32pt disc does not survive three-up at this label length.

## Iteration 3 — `calendar-3-week.png`, `calendar-4-week.png`

"Accuracy" now fits on one line — tile fix confirmed.

**Loop-tooling finding (not a screen diff):** `gokid://progress/calendar?period=week` was a no-op —
the screen stayed on Month. This is the documented same-path-different-params trap
(`gokid-screenshot-auth-guard` memory), and bouncing through `gokid://study` did not clear it
because the Progress stack keeps the calendar mounted.

Changed (a real fix, not a test hack): the period moved **out of `useState` and into the URL**
(`?period=`), with `router.setParams` on switch. This makes each of §8's Weekly/Monthly/Yearly views
a linkable address, lets the overview's "This week" pill land on the week view, and means a caller
re-entering an already-mounted calendar gets the view it asked for. It also made the remaining
views screenshot-able by flipping the fallback (`simctl` cannot tap — per the design-loop memory).

## Iteration 4 — `calendar-5-week.png` (week view)

Week grid renders: 7 columns, per-day minutes under each swatch, future days at `opacity-40` with
"—", today ringed in teal, tiles read 5/5 · 3h 9m · 81%. Day sheet shows today's real session
(24m · 2 sets · 28 cards · 78% · Geography chip) — the reviews.ts overlay works.

Diff found:
- **Day-sheet mini tiles wrapped** — "Accurac / y" again, four tiles across.

Changed: extracted `DayStat`, `p-3` → `p-2`, `gap-3` → `gap-2`, both lines `numberOfLines={1}`.

## Iteration 5 — `calendar-6-year.png` (year view)

Two real bugs:
- **Time tile truncated to "77h 2…".** A year's total ("77h 22m") overflows the tile at the H3 step.
- **Year grid wrapped into ragged rows.** 31 swatches at 8pt + 4pt gap = 372pt against ~277pt of
  card track, so `flex-wrap` broke each month across 2–3 rows of differing height. The month labels
  no longer lined up with their own rows — the grid was unreadable.

Changed:
- `formatMinutes` drops the minutes past 10 hours ("77h") — INFERRED.
- Year grid rewritten: fixed 31-slot rows, swatches sized by `flex-1` (not a spacing token, which
  cannot fit 31 cells), short months pad their tail slots so day-of-month aligns as a column down
  the year. Added `spacing[0.5] = 2px` for the gutter. Label `w-9` → `w-8`.

## Iteration 6 — `calendar-7-year.png` — **stop**

All 12 month rows align with their labels, "77h" fits, day-sheet tiles are all single-line. Week,
month and year all verified on the simulator. Last iteration produced no new fixable diffs.

---

## Still differs / not fixable from code

- **There is no reference to converge on.** The stop condition "indistinguishable from the ref" does
  not apply; the screen is matched to `GoKid-progressoverview-screen.png`'s design language
  (cream page, white `rounded-2xl` cards with a `border-border` hairline, three-up wash tiles, teal
  fills, H3 card headings) rather than to a mockup of itself.
- **Headings render in SF Pro, not SF Pro Rounded** — project-wide, see the `gokid-expo-ui-host-crashes`
  memory. Not specific to this screen.
- **Year swatches read slightly round.** At ~7pt a 3px radius is most of the cell. Sizing them larger
  would overflow the card; leaving them square-cornered would break the app's radius language.
- **Interactions verified by code, not by tapping** — `simctl` cannot tap. The period switch was
  verified by rendering all three views; day selection, the offset arrows and the "jump to today"
  button are verified by reading the state/param logic only.

## Values INFERRED (not read from the design system)

| Value | Where | Why |
|---|---|---|
| `colors.calendar.heat0…heat4` | `src/design/tokens.js` | The design system defines no sequential scale. Five steps interpolated between the dashboards' rest grey (`gamify.track`) and `study.teal`, spaced on lightness, so a heavier day reads as more of the same teal rather than a new hue. |
| `borderRadius.xs = 3px` | `tailwind.config.js` | Smallest system radius (`sm`, 8px) is a circle on a 12pt legend chip. |
| `spacing[0.5] = 2px` | `tailwind.config.js` | Widest gutter that fits a 31-day month across one card row. Used nowhere else. |
| 28pt stat-tile disc (ref: 32pt) | `StatTile` | "Accuracy" does not fit the label track three-up at the ref's disc size. |
| `text-tile` for tile labels (ref: `text-caption`) | `StatTile`, `DayStat` | Same reason. |
| `formatMinutes` drops minutes past 10h | `src/lib/calendar.ts` | No reference covers a duration this large; "77h 22m" overflows the tile. |
| Heat thresholds (≤15 / ≤30 / ≤50 / >50 min) | `src/lib/calendar.ts` | No reference defines what "a heavy day" is for a primary-school child. |
| Monday-first weeks | `WEEKDAYS`, `mondayIndex` | The app is UK National Curriculum; the school week starts Monday. |
| Rest-day rates (Sun 55% / Sat 42% / weekday 17%) | `demoDay` | Demo shape only — makes the grid read like a real child's term rather than a solid block. |
