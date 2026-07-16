# parentcontent — build log

Ref: `design/GoKid-parentcontent-screen.png` (screen 12). Route: `src/app/(app)/parent-content.tsx`.

## Iter 1
- Built: "Parent area" title, child switcher chips (cropped faces `gokid-pc-{amara,rufus}.png`
  + a + button → add-child), Progress overview (3 stat tiles), Curriculum strengths (Maths,
  `gokid-pc-maths.png`, green "Strong" badge), Curriculum to focus on (English,
  `gokid-pc-english.png`, amber "Needs practice" badge), and an account card
  (Subscription → paywall, Account settings).
- All demo figures. `parentcontent-1.png`: match strong. Diff — "Sets completed" truncated
  in its narrow tile.

## Iter 2
- Added `adjustsFontSizeToFit` (minScale 0.85) to the stat-tile top label; `parentcontent-2.png`
  shows "Sets completed" in full. Indistinguishable from ref.

## Diffs remaining / inferred
- New badge tokens `badge.strong/-ink/practice/-ink` (sampled — pale fill + saturated ink,
  distinct from the study status pills).
- Reached via the parent gate (screen 11); the maths thumb reuses the parent-content crop
  (a mountain), matching the ref rather than the study globe.
