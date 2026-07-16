# Incorrect Answers — design-match log

Route: `/quiz/review/[id]` (`src/app/(app)/quiz/review/[id].tsx`)
Ref: **none** — `design/gokid-screens.md` §7 lists "Incorrect Answers" as missing with no mockup.
Closest ref: `design/GoKid-answerresult-screen.png` (screen 20) — the same idea for a single card, so
its chrome, its "Your answer" / "Correct answer" pair, its lightbulb Explanation card on the pale
blue wash and its stat row are the match target. `design/GoKid-result-screen.png` (screen 9) supplies
the "Worth another look" amber chip card, which this screen reuses verbatim.

## Iteration 1

Built: back chevron + centred title, headline + subtitle, a three stat tile row
(Score / Accuracy / To review), one card per missed question (question + topic chips, the answer
pair, the Explanation block), a "Worth another look" chip card, and the "Retake quiz" /
"Review the cards" CTAs. All-correct renders a "clean sweep" empty state instead of the list.

Data comes from a new `quizAttempt(set, answers)` seam in `src/lib/study.ts` — the same swap point
as the rest of the content.

Read `incorrect-1.png` back against the ref. Diffs:

- **Chrome was wrong.** Ref's header is `arrow.left` + a "Back" label; I had a bare `chevron.left`.
- **No divider between the answer pair.** The ref rules "Your answer" and "Correct answer" apart with
  a hairline; I had only a gap.
- **Answer values a step small** (`text-body-lg`), and their labels were `text-caption`
  text-secondary. The ref sets the value at ~28px bold and the label in body-weight ink.
- **Explanation radius** was `rounded-lg` (16); the ref's corner is ~12.

## Iteration 2

Fixed all four. `incorrect-2.png` now matches the ref's card anatomy: header reads "← Back
· Incorrect answers", the answer pair is ruled apart, values render at `text-h3` in
error-red / getting-green on their washes, Explanation sits on `rounded-md`.

Answer values carry `adjustsFontSizeToFit numberOfLines={1}` — a long option ("Compare numbers")
would otherwise wrap out of the 64pt tile. Inferred; the ref only ever shows a 3-digit number.

## Iteration 3 — all-correct state

`incorrect-3-allright.png` (`answers=2,1,1,1,1,2`): reads "Nothing to fix.", 6/6 · 100% · 0, and the
green-check "A clean sweep" card in place of the list. The "To review" tile drops from red to
neutral. Correct.

## Iteration 4 — single-wrong state

`incorrect-4-single.png` (`answers=2,1,1,1,1,0`): headline goes singular ("One to look at."), 5/6 ·
83% · 1, topic chip cycles to "Compare numbers", and the skipped/wrong labels resolve. Correct.

Stopped here: the last two iterations produced no new fixable diffs.

## Still differs / could not verify

- **"Worth another look" chip card sits below the fold** on every demo set, and `simctl` cannot
  scroll. Verified by code only — it is the same chip markup already proven on `/result/[id]`.
- Headings render in plain SF Pro, not SF Pro Rounded (project-wide; see `design/.loop/SPLASH-log.md`).

## Inferred values (not read from the design system)

| Thing | Value | Why |
|---|---|---|
| Whole layout | — | No mockup exists. Composed from screen 20's parts. |
| Stat tile | `h-20` · `rounded-lg` · value `text-h3` above label `text-tile` | Matches the tile geometry the rest of the app uses (`design/GoKid-sectionsummary-screen.png`). Screen 20's stat row puts the label above the value and adds an icon disc; that shape is per-session, not per-tile, so the app's own tile won. |
| Tile tone | Score green-wash · Accuracy neutral · To review red-wash (neutral at zero) | Reuses `gamify.*-wash`. Inferred. |
| Answer tile | `h-16` · `rounded-md` · red/green wash + matching ink | Sampled off screen 20's "728" pair. |
| Question chip | `bg-gamify-red-wash` / `text-error` | Inferred — no reference chips a question number. |
| Topic chip | `bg-quiz-chip` · `text-caption` | Same choice the Quiz Instructions screen made. |
| `quizAttempt.explanation` | `"<answer>" is the answer. Look back at the <topic> cards in <set> …` | No demo set authors an explanation. The `explanation` field is now on `QuizQuestion`, so authored copy overrides this the moment the content API lands. |
| `quizAttempt.topic` | `set.revisit` cycled by question index | No per-question topic tags; same fallback `quizBrief` uses. |
| Skipped answer | Renders "Skipped" | A partial attempt (`-1`) must still review. |
| Secondary CTA | "Review the cards" | Not in any reference. Retaking is not the only sane exit from a wrong answer. |

No new tokens were needed — every value resolves to one already in `tailwind.config.js`.

## Flow wiring

`design/flow-wireframe.md` §QUIZ FLOW calls for an Explanation step after each answer. The runner
already reveals right/wrong inline; this screen is the per-question explanation at the end of it.

- `quiz/[id]` now records every pick and passes it to the results screen as `?answers=2,1,-1,…`
  (`encodeAnswers` / `decodeAnswers` in `src/lib/study.ts`).
- `result/[id]` shows a "See what you missed →" button — **only when the score is short of full** —
  which pushes `/quiz/review/[id]` with those answers.
- Review "Retake quiz" → `router.replace` `/quiz/[id]`; "Review the cards" → `/flashcard/[id]`.
  Back chevron → results.

Back-nav audit across all 38 routes: every pushed route carries a back affordance. The only screens
without one are `home` (who's-studying, the child area's root), the three tab roots, `intro` (skip →
sign-in) and `+not-found` (→ home) — all correct, none are pushed.
