# quizinstructions — design-match log

Route: `/quiz/instructions/[id]` (`src/app/(app)/quiz/instructions/[id].tsx`)
Ref: **none** — `design/gokid-screens.md` §7 lists "Quiz Instructions" as missing with no mockup.
Closest ref: `design/GoKid-quiz-screen.png` (screen 8) for surface / type / radius / the peach
illustration wash, plus `design/GoKid-design-system.png` for tokens.

## Iteration 1

Built the screen: back chevron, peach hero card, H1 "Ready for your quiz?", set subtitle, three
stat tiles (Questions / Time / Difficulty), a four-row "How it works" list, a "What it covers"
chip row, and the two CTAs ("Start quiz" → `router.replace` the runner, "Review cards first" →
the flashcard deck).

Every section is demo-driven through the new `quizBrief(set)` seam in `src/lib/study.ts` — the
same swap point as the rest of the content, so nothing here is hardcoded per set.

Diffs found reading `quizinstructions-1.png` back:

- **Hero art sat in a white box inside the peach wash.** `set.hero`
  (`gokid-set-placevalue-hero.png`) is drawn on white, so it did not seam into `bg-quiz-card`
  the way the base-10 blocks do on the quiz reference.

## Iteration 2

- Hero now sources `brief.illustration` — the quiz's own art
  (`gokid-quiz-blocks.png`, cropped for the peach wash on the quiz reference) where the set has
  one. Sets whose quiz carries no illustration fall back to `set.hero` on the neutral
  `bg-gamify-tile` fill instead of peach, so a white-background thumbnail never shows a seam.
  Verified against `quizinstructions-2.png`: the blocks now bleed into the wash exactly as on
  `design/GoKid-quiz-screen.png`.

Still off, and why:

- A ~2px white sliver on the right edge of `gokid-quiz-blocks.png`. It is baked into the cropped
  asset and shows on the quiz runner too — an asset fix, not a code one.
- Headings render in plain SF Pro, not SF Pro Rounded (project-wide; see
  `design/.loop/SPLASH-log.md`).

## Inferred values (not read from the design system)

| Thing | Value | Why |
|---|---|---|
| Whole layout | — | No mockup exists. Composed from the quiz runner's surfaces. |
| Hero card height | `h-40` (160pt) | Matches the quiz runner's illustration card height. |
| Stat tile | `h-20` · `rounded-lg` · `bg-gamify-tile` · value `text-h3` / label `text-tile` | Same tile geometry as `design/GoKid-sectionsummary-screen.png`. |
| Rule row | `rounded-2xl` · `border-border` · `bg-quiz-option` · 40pt `bg-quiz-option-sel` icon disc | Reuses the quiz answer-option card exactly. |
| Topic chip | `rounded-full` · `bg-quiz-chip` · `text-caption` | `bg-quiz-chip` is the quiz's idle A/B/C/D disc fill; the design system's chips are the mastery pills, which carry a different meaning. |
| `quizBrief.minutes` | `ceil(questions × 45s)`, floor 1 | No authored duration on demo sets. |
| `quizBrief.difficulty` | mastered ≥ 50 → Easy · learning ≥ 40 → Tricky · else Steady | No authored difficulty; derived from the set's mastery split. |
| `quizBrief.topics` | `mastered ∪ revisit`, capped at 6 | No per-question topic tags; reuses the lists the results screen shows. |
| Secondary CTA | "Review cards first" | Not in any reference. The screen would otherwise be a one-way door into the runner. |

No new tokens were needed — every value resolves to one already in `tailwind.config.js`.
