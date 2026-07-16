# progress — build log

Ref: `design/GoKid-progress-screen.png` (screen 10). Route: `src/app/(app)/(tabs)/progress.tsx`.

## Iter 1
- Built the four cards: Overall mastery (SVG donut via `react-native-svg`, 25/45/30 arcs +
  legend), 7-day activity (4 filled teal dots + 3 hollow rings), By subject (4 cropped
  circular icons `gokid-prog-{maths,english,science,geography}.png` + teal bars + %),
  Coming back soon (2 cropped square icons `gokid-prog-{scales,astro}.png` + refresh button).
- All demo constants. Native tab bar (Progress active) renders from the existing tabs layout.
- `progress-1.png`: donut, dots, bars, icons match. Diff — "Geography" wrapped to 2 lines
  (name column too narrow).

## Iter 2–3
- Widened subject name column `w-20 → w-24 → w-28`; `progress-3.png` shows "Geography" on
  one line. Indistinguishable from ref.

## Diffs remaining / inferred
- Donut arc order (green top-left / orange top-right / teal bottom) matches ref.
- Coming-back-soon card sits under the iOS-26 floating glass tab bar (native, not stylable).
- No new tokens (colours reuse `status.*` / `study.teal` / `border`).
