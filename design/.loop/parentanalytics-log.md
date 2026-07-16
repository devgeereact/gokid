# Parent Analytics — design-match log

Screen: `src/app/(app)/parent-analytics.tsx` (design/gokid-screens.md §10 → Analytics).
Data seam: `src/lib/analytics.ts`.

**There is no reference PNG for this screen.** `design/` has no analytics mockup, so the match target
is the design system (`design/GoKid-design-system.png`) plus the two nearest already-matched screens:
`design/GoKid-progressoverview-screen.png` (screen 16 — card, stat tile, trend chip, bar row, SVG
chart geometry) and `design/GoKid-parentcontent-screen.png` (screen 12 — the parent-area page frame,
child switcher, section heads). Nothing new was designed: every component is an idiom already
pixel-matched against a reference elsewhere in the app, and every value is a token.

Covers all eight items §10 lists under Analytics — Study Time, Curriculum Coverage, Weak Areas,
Strong Areas, AI Insights, Weekly Summary, Monthly Summary, Comparison Over Time — as sections of one
report rather than eight routes, because a parent reads them together.

---

## Iteration 1 — `parentanalytics-1.png`

Screen renders; all sections present and correct.

Differed from the reference idiom:

- **Tile labels wrapped.** "Accuracy" broke to "Accura / cy" and "Study time" / "Sets done" to two
  lines, so the three tile values stopped baseline-aligning across the row.
  `design/GoKid-progressoverview-screen.png` keeps every tile label on one line.
- **Y-axis ticks unrounded** — 0/14/27/41/54. The chart scales to the data max (deliberate: a quiet
  week should still read as a shape, not a flat line), which is what produced the unreadable ticks.

Changed: pulled the three duplicated tiles into one `Tile` component carrying
`numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}` — the same guard
`parent-content.tsx` already uses on its stat tiles. Added `niceMax` to round the axis to four whole
tick steps.

## Iteration 2 — `parentanalytics-2.png`

Labels on one line; ticks read 0/20/40/60/80. Both fixed.

Still off: **the axis rounded a 54-minute peak up to 80**, wasting ~⅓ of the plot on headroom — the
first `niceMax` used a fixed step ladder (10/20/50). Replaced with a step *ladder search*: pick the
smallest step from `[5,10,15,20,25,30,50,75,100,150,200]` whose ×4 still contains the data. 54 → 60.

## Iteration 3 — `parentanalytics-3-mid.png` (Coverage / Strong / Weak)

`simctl` cannot scroll, so the below-fold sections were shot by temporarily pinning
`contentOffset={{x:0, y:1100}}` on the ScrollView (per the loop recipe) and removing it after.

Found a real content bug, not a pixel one: **Religious Education appeared in both "Strong areas" and
"Areas to focus on"** simultaneously. `pickDistinct` deduped *within* a list but not *across* the
two — a subject has many strands, so its best can rank top-3 while its worst ranks bottom-3. A parent
reading "RE is a strength *and* a weakness" has no way to resolve that. Fixed: Strong is picked first
and locks its subjects out of Weak (`exclude` set).

Also replaced a placeholder empty dot (`<View className="h-2 w-2 rounded-full" />` — no colour, so it
rendered as nothing) with an 8pt SVG circle carrying the subject's own accent
(`colors["subject-ink"][slug]`), matching how the Subject Hub colour-codes a subject. It is SVG and
not a class because a per-subject colour cannot be a Tailwind class and AGENTS.md rules out inline
`style`.

## Iteration 4 — `parentanalytics-4-insights.png` (AI Insights)

RE collision gone — Strong is Maths / RE / English, Weak is Music / Languages / Art, no overlap.
Insight copy agrees with the cards above it (Maths 86% and Music 21% both match their rows), which is
the point of templating the copy off the same figures the charts draw.

## Iteration 5 — `parentanalytics-5-month.png` (Monthly Summary)

`simctl` cannot tap, so the month period could not be verified by pressing the segmented control.
Rather than temporarily flipping a `useState` default, **period was moved into the route** —
`useLocalSearchParams` + `router.setParams`, per the loop recipe's preferred fix. This is the better
design independently: the monthly report is now a linkable thing (`/parent-analytics?period=month`),
which a future "monthly summary" notification needs.

Verified: segmented control flips, buckets become W1–W4, hint reads "Minutes per week", totals scale
(11h 17m / 62 sets), the Comparison legend follows ("This month" / "Last month"), and the trend chips
flip to green. Ticks 0/75/150/225/300.

Stopped here: the last two iterations produced no new fixable diffs.

---

## Values inferred rather than read from the design system

No reference PNG exists for this screen, so the *layout* is inferred throughout — but it is assembled
only from idioms already matched against screens 12 and 16. Specifically inferred:

- **Chart geometry** — the 320×200 viewBox, 30/300/16/168 plot insets and the `text-secondary` 8–10pt
  axis labels are lifted verbatim from `progress/overview.tsx`, which was matched against
  `design/GoKid-progressoverview-screen.png`. No mockup covers a monthly bucket chart.
- **`niceMax` tick ladder** — the design system says nothing about chart axes. Inferred.
- **Comparison chart's dashed grey previous-period line** — inferred. `colors.border` at 2pt with a
  `5 4` dash, so the previous period reads as context behind the teal current series rather than a
  second headline.
- **Segmented control** — the design system's 09. INPUTS defines one (`Rec Y1 Y2 [Y3] Y4 Y5 Y6`,
  selected segment in `primary`). Reused at two segments; the 40pt height and `rounded-sm` inner
  radius are inferred from that swatch.
- **AI-insight tone washes** — `gamify.{green,amber,purple}-wash` reused off the dashboards
  (screens 15–23). The design system has no "insight card".
- **Strong/weak bar fills** — `badge.strong-ink` (green) and `accent` (amber), borrowed from the
  curriculum badges on `design/GoKid-parentcontent-screen.png` so "strong" and "needs practice" carry
  the same two colours in the parent area as they do there.
- **All figures** are demo data from `src/lib/analytics.ts` — the reporting API lands later
  (AGENTS.md). Derived from `src/lib/subjects.ts` strand mastery plus an FNV-1a hash of the child's
  id, so each demo child reads differently and the same child reads identically on every launch
  (`Math.random` would reshuffle the charts on every re-render).

## What still differs / cannot be fixed from code

- Headings render in plain SF Pro, not SF Pro Rounded — pre-existing across the whole app, no
  resolvable family name for Rounded (see `components/rounded-heading.tsx`).
- The month axis still carries some headroom (237 → 300) because the tick ladder jumps 50 → 75.
  Tightening it further would put non-round numbers back on the gridlines; the trade was made in
  favour of round ticks.
