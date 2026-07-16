# quiz — build log

Ref: `design/GoKid-quiz-screen.png` (screen 8). Route: `src/app/(app)/quiz/[id].tsx`.

## Iter 1
- Built: "Question N of M" + teal progress bar, peach base-10 blocks card
  (`gokid-quiz-blocks.png`, cropped 95,395→812,705 off the ref), H1 prompt, A–D option
  cards, "Check answer" CTA. Data = demo MCQ in `src/lib/study.ts` (`QuizQuestion[]`).
- Interaction (verified by reading state, not tap — simctl can't tap): select locks on
  "Check answer" → reveals correct/wrong via border+disc colour, button flips to
  "Next"/"See results"; last question `router.replace` → `/result/[id]?score=`.
- Screenshot `quiz-1.png` vs ref: indistinguishable — peach card, blocks, labels,
  question, options, disabled (grey) CTA pre-selection all match.

## Diffs remaining / inferred
- Added a close ✕ top-left — the mock shows no chrome, but a runner must be escapable.
- Blocks illustration only shown on place-value questions (`illustration` field). Other
  sets' quizzes render the prompt without an illustration (ref only shows the maths one).
- Counter reads "of 6" (demo set length), not the ref's "of 10" — ref count is illustrative.
- New tokens: `quiz.card/option/option-sel/chip` (sampled, not in the design-system PNG).
