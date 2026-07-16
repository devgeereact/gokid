# Search Sets — design-match log

Route: `/search` (`src/app/(app)/search.tsx`) · index + history: `src/lib/search.ts`

**No mockup exists for this screen.** `design/gokid-screens.md` §3 lists "Search Sets" under Home
Experience as missing, and `design/LOOP-PROMPT.md` never assigned it a reference. Every surface is
therefore inferred from `design/GoKid-design-system.png` — block 09 (Text Input), block 06 (Subject
Chip), block 07 (Set Card, List) — with the result rows copied from the "Ready for you" geometry on
`design/GoKid-studydashboard-screen.png` so a set reads identically wherever it is listed.

No new tokens were added: every value resolves to one already in `tailwind.config.js`.

## Iteration 1 — `search-1.png`

Screenshot harness: `/search` sits inside the `(app)` group, whose layout redirects to `/sign-in`
when Clerk reports signed-out, and `simctl` cannot tap through Apple/Google sign-in. The first
`gokid://search` deep link landed on the auth screen. Worked around with a throwaway root route
(`src/app/search-preview.tsx`, a one-line re-export outside the guard), screenshotted, **then
deleted**. The screen itself has no Clerk dependency, so the preview render is faithful.

Rendered correctly on the first pass. Diffs found by reading the pixels:

- **Subject chips were alphabetical** (English, Geography, Maths, Science). The design system's
  "Subject tints" block orders them Maths → English → Science → Geography → History. Fixed: `SUBJECTS`
  now sorts by the tint-block order, with any untinted subject falling to the end alphabetically.
- **No History chip.** Not a bug — `src/lib/study.ts` has no History set (Maths 7, Science 7,
  English 5, Geography 2). The chip list is derived from the shelf, so the tint exists with no dead
  chip attached. It appears the day a History set is authored.

## Iteration 2 — `search-2.png`

Chip order now matches the design system. No further diffs on the empty-query state.

## Iterations 3–6 — section demos

`simctl` cannot tap, so the screen took `q` / `subject` deep-link params to make every section
reachable. These are **not** test-only scaffolding — they are how "Filter by Subject" and the
recommendation shelves (`design/gokid-screens.md` §3) link into a prepared search instead of
reimplementing a result list. Navigating to the same path with different params is a no-op in
expo-router, so each capture bounced through `gokid://intro` first to force a remount.

| Section | Deep link | Shot |
|---|---|---|
| Results | `gokid://search?q=fractions` | `search-3-results.png` |
| Filter by subject | `gokid://search?subject=Science` | `search-4-filter.png` |
| No results | `gokid://search?q=dinosaurs` | `search-5-noresults.png` |
| Recent searches | `gokid://search` (after the two above) | `search-6-recent.png` |
| Empty / first run | `gokid://search` (clean history) | `search-2.png` |

All four verified against the pixels. Selected chip flips to `bg-primary` + white label; the "All"
chip correctly drops to the bordered-white idle state when a subject is active; result count reads
"1 set" / "7 sets" with the h3 weight of "Ready for you"; recents order most-recent-first.

## Deliberately inferred (no reference defines these)

- **Search field.** Design-system Text Input geometry: `h-12` (48pt), `rounded-md` (12px),
  `border-border`, white fill. Placeholder at Body Large (17/24) — the input in block 09 is a
  single-line field at body scale.
- **Header layout.** Back chevron beside the field rather than a titled nav bar, so the field owns
  the row. Matches the chevron size/weight (24pt, semibold) on the study dashboard.
- **Chips.** `h-9` (36pt), `rounded-full`, `px-4`, Body semibold. The design system draws the chip
  but dimensions it only by eye; 36pt is the smallest step on the 8pt grid that clears a 15pt label
  with the block's visual padding.
- **Year pill on result rows.** The dashboard's rows carry a mastery status pill; a search result is
  cross-year, so year is the useful metadatum. Reuses `bg-gamify-tile` + secondary ink rather than
  inventing a colour.
- **Recent-search rows.** `h-12`, `clock.arrow.circlepath` leading, `xmark` trailing. Nothing in the
  design system covers a history list.
- **History store is in-memory** (same reasoning as `src/lib/active-child.ts`): a search trail is a
  per-session thing, and a cold start opening on a clean field is intended. `MAX_RECENT = 6`.

## Still differs / known limits

- **Repeated thumbnails.** Every Science result shows the same skeleton art. That is the demo image
  registry in `src/lib/study.ts` reusing one illustration per subject — pre-existing and intentional
  (documented there), not a search bug. Real per-set art lands with the content API.
- **Keyboard not in any shot.** `autoFocus` is on for a bare `/search`, but the simulator screenshot
  does not capture the software keyboard. The field shows its caret.
- **Tap-driven states unverified by pixel.** Chip toggling, "Clear", per-row remove, and submit-to-
  remember were verified by reading the state logic and by the deep-linked equivalents; `simctl`
  cannot tap.
