# Curriculum & AI-content audit — 14 August 2026

Consolidated from [`workers/content-rec-y2.md`](workers/content-rec-y2.md) (9 sets, 54 cards, 45
questions) and [`workers/content-y3-y6.md`](workers/content-y3-y6.md) (18 sets). Per-item tables with
corrected values live in those two files; this is the rollup.

## Verdict on the differentiator

GoKid's stated differentiator is genuine UK National Curriculum alignment rather than generic
age-appropriate filler. Split answer:

- **On factual correctness and British-English fidelity: the claim survives.** ~96–100% of cards are
  correct. Every maths answer recomputed independently checks out. No answer-key errors. No American
  spelling or terminology anywhere in 27 sets. That is a genuinely good result and better than the
  category norm.
- **On alignment and breadth: the claim does not survive.** Most of the curriculum is missing, and the
  objectives displayed next to what exists are disconnected from it roughly half the time.

## The four findings that matter

### 1. Answer-position bias — assessment integrity (P1)

Found independently by both workers in disjoint scopes, which is what makes it systematic rather than
coincidental.

| Scope | Bias |
| --- | --- |
| Rec–Y2 | 62% of correct answers at `options[1]`; 80% in `y1-common-words`, `y2-word-classes`, `y2-habitats` |
| Y3–Y6 | `y4-fronted-adverbials` and `y4-states-of-matter` — 100% at index 0. `y3-roman-britain`, `y3-algorithms`, `y6-evolution` — 80% at index 1 |

A child who always taps the same position scores highly without reading. This corrupts the one
mechanism meant to prove learning happened, and it feeds the SRS engine — so a biased quiz produces
false mastery, which then suppresses genuine review scheduling. Fixes are mechanical
(`swap options[i]/options[j]; answer: j`) and written out per question id in the worker reports.

### 2. Coverage is much thinner than the UI implies (P2)

| Year | Subjects with content |
| --- | --- |
| Rec, Y1, Y2 | 3 of 10 — no Geography, History, Computing, Art, Music, Languages, RE. Geography and History are **statutory from KS1** |
| Y3 | 9 of 10 hubs, but no English set at all |
| Y4, Y5, Y6 | 3 of 10 each. Y5 also has no English |

`yearCoverage()` in `curriculum.ts` is genuinely computed, not authored — but it only counts subjects
that already have at least one set, so a subject with zero content is invisible rather than scored 0%.
The ring therefore structurally overstates breadth. Combined with finding 3 below, the coverage number
is unreliable in both directions at once.

### 3. Objectives disconnected from content (P1)

Roughly half the curated `OBJECTIVES` rows for Y3–Y6 describe content no set teaches (Stone Age,
algebra, primes, gravity/friction, passive voice). Two are worse than dangling:

- **Y3 Geography** — its two objectives (UK counties; rivers and mountains) match neither its own set's
  content (European capital cities) nor the right year group: rivers and mountains is the Y5 set's topic.
- **Y3 Science** — three objectives, none mentioning skeletons, though the only Y3 Science set *is* the
  skeleton.

A parent reading "Year 3 · Geography · UK counties" above a set about European capitals is being told
something untrue about their child's learning.

### 4. A code bug hides real coverage (P1)

`src/lib/analytics.ts` matches a set to a subject-hub strand by exact string equality
(`set.topic === strand.name`). Four of nine Rec–Y2 sets carry a `topic` matching no strand in
`subjects.ts` — and for two of them, `subjects.ts` is missing the NC-mandated unit entirely
("Seasonal changes", "Living things and their habitats"). The content is taught correctly and is
invisible to the app's own progress and coverage screens.

`subjects.ts` is also missing "Ratio and proportion" / "Algebra" (Maths) and "Evolution and inheritance"
(Science) as strands even though sets exist for exactly that content, which forces `curriculum.ts` to
mis-file those objectives under adjacent strands.

Naming: the strand `"Animals and humans"` should be the DfE's `"Animals, including humans"`.

## Factual errors — only two, both worth fixing

- A Y1 science card calls snow **"frozen rain"**. Snow is ice crystals formed by deposition; frozen rain
  is sleet or hail. Checked against Met Office / RMetS.
- Two Reception phonics cards teach **"kuh"** and **"duh"** — a schwa on the consonant, contrary to
  current UK "pure sounds" phonics practice. This is the kind of error a teacher objects to and a parent
  repeats at home.

Plus some low-severity distractor ambiguity, itemised in the worker reports.

## The systematic fix

`src/lib/openrouter.ts`'s `systemPrompt()` claims UK curriculum alignment but:

- never forbids American spelling or vocabulary
- never constrains the distribution of correct-answer indices across a generated batch

Both defects found by hand in the human-authored content will therefore reproduce in every AI-generated
batch. **Fixing the prompt is worth more than fixing the five biased quizzes**, because it stops the
defect at the source rather than at the symptom. `quiz-validate.ts` already proves shape and
answerability; it does not and cannot prove content correctness or answer-position spread — that
belongs in the prompt plus a distribution check at insert time.

Note: the generation pipeline is currently non-functional (REPORT.md P0-1), so no generated content
existed to audit. This section covers the authored content and the prompt only.
