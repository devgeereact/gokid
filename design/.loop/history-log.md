# history — design-match log

Route: `/progress/history` (`src/app/(app)/(tabs)/progress/history.tsx`). Reached from the Progress
tab → "Study history".

**There is no reference PNG for this screen.** `design/mvp1.md` requires "Basic study history" and
"Upcoming review cards". Closest ref used for fidelity: `design/GoKid-progress-screen.png`
(screen 10) — its "Coming back soon" card is the same shape of content.

## Iteration 1

**Built from** the screen-10 cards, reusing verbatim:
- Card surface: `rounded-2xl border border-border bg-white p-5`, heading `text-h3 font-bold text-ink`
  with `mb-4`.
- Row geometry: 11pt thumb slot, `ml-3` title `text-body-lg font-semibold text-ink`, secondary line
  `mt-0.5 text-body text-text-secondary`, `mb-4 last:mb-0`.
- Stat tiles copied from the parent-content "Progress overview" trio (`flex-1 rounded-2xl border
  border-border bg-white p-3`, `text-caption` label over `text-h3 font-bold` value).

**Screenshot:** `design/.loop/history-1.png` (deep link `gokid://progress/history`). Read back against
`GoKid-progress-screen.png`: card radius, borders, heading rhythm and row spacing match.

**Deliberately inferred (not read from any reference):**
- Screen 10's rows carry a cropped illustration in the thumb slot. History rows have no per-session
  art, so the slot became a subject-tinted symbol disc: `subject.{maths,english,science,geography,
  history}` wash + `book.closed`. Review rows reuse the parent-content badge tints
  (`badge-practice` = last rated Tricky, `badge-strong` = Got it) with `arrow.clockwise`.
- Quiz score chip on a session row: `badge-strong` pill — same pill as the screen-12 "Strong" badge.
- The three-tile totals row (Sessions / Cards seen / Time) — no reference has it.
- Date phrasing: "Today" / "Yesterday" / "N days ago" / "12 Mar"; due phrasing "Ready now" /
  "Tomorrow" / "In N days" (the wireframe's Tricky→Tomorrow, Got it→+5 days).

**Data is real, not demo.** Rows come from `src/lib/reviews.ts` — the spaced-repetition engine this
task added. Ratings from the flashcard runner persist per child (expo-secure-store, keyed by the
child picked on who's-studying via `src/lib/active-child.ts`). Totals are computed from recorded
sessions, so an empty history reads a true zero rather than a fabricated number.

**Screenshot shows all-zero + both empty states** — correct: `simctl` cannot tap, so no session has
ever been recorded on this simulator. The populated state was verified by reading the store logic,
not by playing a deck through. That is the one thing this log cannot claim from pixels.

**Honest gaps:**
- Interval ladder (1 / 5 / 12 / 30 / 90 days) is inferred. `design/flow-wireframe.md` only fixes the
  first two rungs (Tricky → Tomorrow, Got it → +5 Days); the rest is a reasonable SM-2-lite widening.
- Storage is on-device only. Background sync of history to a server is not built (no API yet —
  AGENTS.md). A reinstall loses history.
- History is not child-scoped until a child is tapped on who's-studying; a direct deep link falls
  back to `demo-amara`.

**Stop reason:** no reference to converge on; the populated state is untestable without taps.
