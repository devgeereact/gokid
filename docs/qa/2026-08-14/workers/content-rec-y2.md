# Content audit — Reception, Year 1, Year 2 (`src/lib/study.ts`)

Scope: every study set, flashcard and quiz question with `yearCode` "Rec", "Y1", "Y2" in
`src/lib/study.ts` (9 sets, 54 cards, 45 quiz questions — no `mixedQuiz` exists for this scope, it is
only on the Y3 `place-value` core set). Also read `src/lib/subjects.ts` strand names, `src/lib/curriculum.ts`
objectives/strand wiring, `src/lib/analytics.ts` (to check how `topic` is actually consumed), and
`src/lib/openrouter.ts` / `src/app/api/admin/generate+api.ts` for the generation prompt. No simulator,
no dev server, no DB access was used — source reading only, per the resource contract.

The 9 sets in scope:

| set id | year | subject | topic (authored) |
|---|---|---|---|
| `rec-numbers-to-10` | Rec | Maths | Number and place value |
| `rec-letter-sounds` | Rec | English | Phonics |
| `rec-plants-animals` | Rec | Science | Living things |
| `y1-add-subtract-20` | Y1 | Maths | Addition and subtraction |
| `y1-common-words` | Y1 | English | Word reading |
| `y1-seasons-weather` | Y1 | Science | Seasonal changes |
| `y2-times-tables` | Y2 | Maths | Multiplication and division |
| `y2-word-classes` | Y2 | English | Grammar and punctuation |
| `y2-habitats` | Y2 | Science | Living things and their habitats |

## Headline finding, stated up front

Every quiz answer in this scope is factually correct (I recomputed all 45: arithmetic, phonics facts,
grammar, seasons). The defects are not "wrong answers" — they are a severe, systemic **answer-position
bias** that makes the quizzes gameable, plus a **code-level curriculum-mapping bug** that makes some of
this correctly-taught content invisible to the app's own coverage/progress screens. Both are mechanical,
provable from the source, and both are more serious than any individual factual slip.

---

## Per-item table

### 1. Answer-position bias (Critical, systemic — every hand-authored quiz in scope)

Across the 45 quiz questions in Rec/Y1/Y2, the correct answer sits at **`options` index 1 (the second
choice) 28 times — 62%**. Distribution: index 0 → 7, index 1 → 28, index 2 → 9, index 3 → 1. A child (or
a sibling, or a reviewer) who always taps the second option scores ~62% without reading a single
question. Three sets are worse than the average — 4 of their 5 answers sit at index 1 (80%):
`y1-common-words`, `y2-word-classes`, `y2-habitats`. This is exactly the "distractor pattern repeated
often enough that the answer becomes guessable by position" failure mode called out in the brief, and it
is invisible on a normal content review because each question looks fine in isolation — it only shows up
when you tabulate `answer` across a set, which is precisely why it survived authoring.

Mechanical fix: for each flagged question, swap `options[currentIndex]` with `options[targetIndex]` (this
only reorders the array — the option text and correctness are untouched) and set `answer: targetIndex`.
Question ids with no change needed are omitted.

| set id | year · subject | severity | question ids: current → target index |
|---|---|---|---|
| `rec-numbers-to-10` | Rec · Maths | Critical | `rec-num-q1` 1→0, `rec-num-q2` 2→1, `rec-num-q3` 0→2, `rec-num-q4` 1→3, `rec-num-q5` 1→0 |
| `rec-letter-sounds` | Rec · English | Critical | `rec-let-q1` 0→1, `rec-let-q2` 0→2, `rec-let-q3` 1→3, `rec-let-q4` 1→0 (`rec-let-q5` already 1, target 1 — no change) |
| `rec-plants-animals` | Rec · Science | Critical | `rec-pla-q1` 1→2, `rec-pla-q2` 0→3, `rec-pla-q3` 1→0, `rec-pla-q4` 2→1, `rec-pla-q5` 1→2 |
| `y1-add-subtract-20` | Y1 · Maths | Critical | `y1-add-q1` 2→3, `y1-add-q2` 2→0, `y1-add-q4` 1→2, `y1-add-q5` 1→3 (`y1-add-q3` already 1, target 1 — no change) |
| `y1-common-words` | Y1 · English | Critical (worst: 4/5 at index 1) | `y1-cw-q1` 1→0, `y1-cw-q2` 2→1, `y1-cw-q3` 1→2, `y1-cw-q4` 1→3, `y1-cw-q5` 1→0 |
| `y1-seasons-weather` | Y1 · Science | High | `y1-sea-q1` 2→1, `y1-sea-q2` 0→2, `y1-sea-q4` 1→0, `y1-sea-q5` 2→1 (`y1-sea-q3` already 3, target 3 — no change) |
| `y2-times-tables` | Y2 · Maths | Critical | `y2-tt-q1` 1→2, `y2-tt-q2` 2→3, `y2-tt-q3` 2→0, `y2-tt-q5` 1→2 (`y2-tt-q4` already 1, target 1 — no change) |
| `y2-word-classes` | Y2 · English | Critical (worst: 4/5 at index 1) | `y2-wc-q1` 1→3, `y2-wc-q4` 1→2, `y2-wc-q5` 1→3 (`y2-wc-q2` already 0, `y2-wc-q3` already 1 — no change, targets match) |
| `y2-habitats` | Y2 · Science | Critical (worst: 4/5 at index 1) | `y2-hab-q1` 1→0, `y2-hab-q3` 1→2, `y2-hab-q4` 0→3, `y2-hab-q5` 1→0 (`y2-hab-q2` already 1, target 1 — no change) |

Root cause / pipeline note: this is hand-authored content (`RAW_EXTRA` in `study.ts`, not AI-generated —
`openrouter.ts` / `generate+api.ts` are not involved in these 9 sets). It is an **authoring-pipeline gap,
not a prompt bug**: nothing in the authoring process validates answer-position distribution before a set
ships. The generation prompt (`systemPrompt()` in `src/lib/openrouter.ts`) also has no instruction to vary
correct-answer position, and `src/lib/quiz-validate.ts` (the runtime validator both paths share) is worth
checking for whether it could catch this mechanically per-set (e.g. reject a batch where >50% of answers
share one index) before content ships from either path.

### 2. Curriculum-strand mapping bug (High, systemic — code, not just content)

`src/lib/analytics.ts` builds each subject hub's "Curriculum strands" progress list by filtering a
child's sets to `s.topic === strand.name` (line ~291, `useSubjectProgress`), where `strand.name` comes
from the fixed list in `src/lib/subjects.ts`. Four of the nine sets in scope carry a `topic` string that
does **not** match any strand name on their subject's `strands` array, so their real, correctly-authored
content can never appear under any strand row, in subject search (`src/app/(app)/search.tsx` filters by
`hit.strand`), or in the strand-level "strong/weak areas" nudges (`src/lib/analytics.ts` lines ~163–202).
The content exists and is taught; the app's own coverage machinery cannot see it. This directly undercuts
the product's central "genuinely curriculum-aligned" claim, because the claim is expressed to a parent
via exactly this mechanism (the subject hub, the curriculum browser, the coverage ring).

| set id | year · subject | issue type | severity | the problem | the corrected value |
|---|---|---|---|---|---|
| `subjects.ts` (Science strand list) | Rec–Y6 (root cause) | Coverage / integrity | High | Science's `strands` array (`Plants`, `Animals and humans`, `Materials`, `Forces and magnets`, `Light and sound`, `Earth and space`) has no slot at all for the statutory Y1 unit "Seasonal changes" or the statutory Y2 unit "Living things and their habitats" — both of which have authored sets. There is no strand these two sets could ever match, even if their `topic` were renamed. | Add two strands to `SUBJECTS.find(s=>s.slug==="science").strands`: `{ name: "Seasonal changes", icon: "cloud.sun.fill" }` and `{ name: "Living things and their habitats", icon: "leaf.fill" }` (adjust icons to taste), positioned to match year-appropriate sequencing. |
| `rec-plants-animals` | Rec · Science | Coverage / integrity | Medium | `topic: "Living things"` matches no Science strand name (`Plants`, `Animals and humans`, …) — this set's progress is invisible in the Science hub. | Change `topic` to `"Living things and their habitats"` (once that strand exists per the row above), or to `"Plants"` if the set is deliberately scoped there. |
| `y1-seasons-weather` | Y1 · Science | Coverage / integrity | Medium | `topic: "Seasonal changes"` matches no Science strand name. | Change `topic` to `"Seasonal changes"` and add that strand to `subjects.ts` (see root-cause row) — the set's own topic text is already correct NC wording; the hub is missing the slot. |
| `y2-habitats` | Y2 · Science | Coverage / integrity | Medium | `topic: "Living things and their habitats"` matches no Science strand name. | Same as above — add the strand to `subjects.ts`; no change needed to the set itself. |
| `y1-common-words` | Y1 · English | Coverage / integrity | Medium | `topic: "Word reading"` matches no English strand name (`Reading`, `Phonics`, `Writing`, `Grammar and punctuation`, `Spelling`). | Change `topic` to `"Reading"` (English strands already has this slot — cheapest fix, no `subjects.ts` change needed). |

### 3. Science strand naming vs the actual National Curriculum term

| set id | year · subject | issue type | severity | the problem | the corrected value |
|---|---|---|---|---|---|
| `subjects.ts` Science strands | Rec–Y6 (affects `rec-plants-animals`, `y1-seasons-weather` cards, `y2-habitats`) | UK-ness / curriculum-fit | Medium | Strand is named `"Animals and humans"`. The actual DfE National Curriculum programme-of-study strand is **"Animals, including humans"** — not a cosmetic difference: the NC's phrasing deliberately classifies humans as a kind of animal, addressing the common KS1/KS2 misconception that "animals" excludes people. `"Animals and humans"` reads as coordinating two separate categories and reinforces exactly the misconception the real curriculum wording is written to avoid. | Rename the strand to `"Animals, including humans"` in `src/lib/subjects.ts`, and update every `Objective.strand` value in `curriculum.ts` that currently reads `"Animals and humans"` (Rec/Y1/Y2/Y3/Y5/Y6 Science objective rows) to match. |

### 4. Factual/pedagogical correctness

| set id | card/question id | year · subject | issue type | severity | the problem | the corrected value |
|---|---|---|---|---|---|---|
| `y1-seasons-weather` | `y1-sea-c5` | Y1 · Science | Answer correctness | Medium | "What do we call frozen rain that falls in winter? → Snow." Snow is not frozen rain — it forms from ice crystals in clouds. Precipitation that is rain which has frozen (or partially melted-and-refrozen) falling to the ground is **sleet** or **freezing rain**, per the Met Office / Royal Meteorological Society (checked via web search). This card teaches the wrong causal mechanism for the phenomenon it names. | Reword the question, e.g. "What do we call frozen, flaky precipitation that falls in cold weather?" → "Snow." Or keep "frozen rain" as the definition but change the answer to "Sleet" (a separate card), and add a distinct snow card that says snow forms from tiny ice crystals in clouds. |
| `rec-letter-sounds` | `rec-let-c2` | Rec · English/Phonics | Answer correctness / pedagogy | Medium | "What is the first sound in 'cat'? → c, kuh." Current DfE-era UK phonics guidance (post Letters and Sounds, and the phonics screening check training all English primary schools use) explicitly teaches **pure sounds** — no added schwa ("uh") on stop consonants, because "kuh-a-tuh" makes blending to "cat" harder. Confirmed via web search. | Change the answer to "c — a short, sharp /k/ sound (no 'uh')" or simply "c". |
| `rec-letter-sounds` | `rec-let-c4` | Rec · English/Phonics | Answer correctness / pedagogy | Medium | Same issue: "What is the first sound in 'dog'? → d, duh." Adds a schwa to a stop consonant, contrary to current pure-sounds phonics teaching. | Change the answer to "d — a short /d/ sound (no 'uh')" or simply "d". Note `rec-let-c1` ("sss, like a snake") and `rec-let-c5` ("mmm") are correct — continuant sounds legitimately sustain without a schwa, so only the stop-consonant cards (`c`, `d`, and any `t`/`p`/`b` equivalents if added later) need this fix. |

### 5. Ambiguity / design inconsistency

| set id | card/question id | year · subject | issue type | severity | the problem | the corrected value |
|---|---|---|---|---|---|---|
| `y2-word-classes` | `y2-wc-q1` | Y2 · English | Ambiguity | Low | "Which word is a noun?" options `["quickly","table","jump","shiny"]`, answer `table`. "jump" is presented bare, with no sentence context, and is equally valid as a noun ("a big jump") — the question relies on an unstated default reading. Common in KS1 worksheets, but avoidable. | Give `jump` sentence context, or swap it for an unambiguous verb-only distractor, e.g. `["quickly","table","sing","shiny"]`. |
| `y2-word-classes` | `y2-wc-q2` | Y2 · English | Ambiguity | Low | "Which word is a verb?" options `["swim","blue","chair","soft"]`, answer `swim`. Same bare-word issue — "swim" is also a common noun ("a swim"). | Swap for an unambiguous verb-only distractor, e.g. `["run","blue","chair","soft"]`, or add context: "Which word is a verb in 'I like to swim'?" |
| `y2-word-classes` | `y2-wc-q5` | Y2 · English | Design inconsistency | Low | "In 'Birds fly high', which word is the verb?" options include `"the"`, a word that does not appear anywhere in the given sentence — every other question in this set draws all four options from the sentence itself. Not incorrect (the right answer, `fly`, is still unambiguous), but an inconsistent distractor-sourcing pattern that a child could learn to exploit ("the odd-word-out that isn't in the sentence is never the answer"). | Replace `"the"` with a word actually drawn from the sentence's word class options, e.g. `"Birds"` (already close) — options `["Birds","fly","high","birds"]` won't work (duplicate); better: `["Birds","fly","high","quickly"]` keeping `high` and adding a same-family adverb distractor instead of an unrelated function word. |
| `y1-add-subtract-20` | `y1-add-c3` | Y1 · Maths | Tone / clarity | Low | "What two numbers make a bond to 10 with 3?" — grammatically ambiguous phrasing; unclear whether "3" is one of the two numbers being asked for or a separate given value until you read the answer. | Reword: "3 and what number make a bond to 10?" → answer "3 and 7." |

### 6. Coverage gaps

| set id | year · subject | issue type | severity | the problem | the corrected value |
|---|---|---|---|---|---|
| n/a — whole-catalogue gap | Rec, Y1, Y2 (all subjects) | Coverage | High | For each of Reception, Year 1 and Year 2, only 3 of the 10 subject hubs in `subjects.ts` (Maths, English, Science) have any sets at all. Geography, History, Computing, Art, Music, Languages and Religious Education have **zero** KS1/EYFS content — despite Geography and History both being statutory from Key Stage 1 (locational knowledge, place knowledge for KS1 Geography; "changes within living memory" for KS1 History) and RE, Art, Music, Computing all being taught from Reception in virtually every UK primary school. A parent of a Reception–Y2 child opening any of those 7 hubs sees an empty shelf with no year-appropriate content, which is a much larger gap than any single wrong answer. | Not a content-table fix — this is a scope decision. If reported honestly, the product should either (a) author at least one KS1/EYFS set per missing subject before claiming broad curriculum alignment for these year groups, or (b) make the marketing claim explicitly conditional on subject ("Maths, English and Science are fully mapped; other subjects are in progress") rather than an unqualified "National Curriculum aligned" claim. |
| n/a | Rec, Y1, Y2 | Design semantics | Medium (contextual, not a bug) | `curriculum.ts`'s coverage ring (`yearCoverage` → `cardPct`) is **computed**, not authored: it is `cardsDone / cardsTotal` across a year's sets — i.e. "how much of the shelf this child has studied," not "how much of the National Curriculum this shelf covers." Because 7 of 10 subjects have 0 sets in this scope, a child who studies 100% of the 3 available subjects would show a 100% ring despite covering roughly 30% of the statutory KS1/EYFS subject list. The ring is honestly computed from what exists, but what exists is a small slice of the full curriculum — the ring cannot distinguish "fully covered" from "fully studied, thinly covered." | Not a code bug to "fix" mechanically, but worth flagging to product: either compute a second, explicit "curriculum breadth" percentage (subjects with ≥1 set ÷ 10) alongside the completion ring, or relabel the ring so it cannot be read as a curriculum-coverage claim. |

### 7. Missing explanation copy (informational, not scored as an error)

None of the 45 quiz questions in this scope authors an `explanation` field. `quizAttempt()` in
`src/lib/study.ts` (line ~1411) falls back to a generic template: `"'<answer>' is the answer. Look back
at the <topic> cards in <title> — the same idea comes up there."` This is not patronising or
shame-based — it's neutral, on-brand copy — but it means the "why is this correct" pedagogy the review
screen promises does not actually exist yet for any Rec/Y1/Y2 question; every child sees the same
templated line regardless of which question they got wrong. Not itemised per-question (all 45 share the
gap); flagged once here as a completeness note, not a correctness defect.

---

## Synthesis

**Systematic vs one-off.**

- The **answer-position bias** (finding 1) is the single most consequential defect in this scope, and it
  is systemic: it touches 8 of the 9 sets and 38 of the 45 questions need a position change. It is not a
  prompt/generation problem — these 9 sets are hand-authored (`RAW_EXTRA` in `study.ts`), not produced by
  `openrouter.ts`. The fix is a pipeline fix regardless: add a mechanical check (reject/flag a batch or a
  set where any single `answer` index exceeds, say, 35% of a set's questions) that runs on both authored
  and AI-generated content before publish. `src/lib/quiz-validate.ts` is the natural place, since both
  paths already funnel through it.
- The **curriculum-strand mapping bug** (finding 2) is also systemic, but it is a code/schema gap rather
  than a per-item authoring mistake: `subjects.ts`'s strand list is simply missing two NC-mandated Science
  units, and nothing validates that a set's `topic` matches an existing strand name at authoring time. It
  silently disconnects real content from the very screens that are supposed to prove curriculum coverage
  to a parent.
- The **science-strand naming** issue ("Animals and humans" vs the NC's actual "Animals, including
  humans") is a one-off wording choice, but it recurs everywhere that strand name is used (`subjects.ts`
  and every matching `curriculum.ts` objective row for Rec through Y6), so fixing it is one edit propagated
  to several call sites, not 6 independent errors.
- The **phonics schwa** issue (`rec-let-c2`, `rec-let-c4`) and the **"frozen rain" science card**
  (`y1-sea-c5`) are one-off authoring errors — isolated facts an author got wrong, not a pattern across
  the set.
- The **ambiguity/design-consistency** items (§5) and the **coverage gap** (§6) are, respectively, minor
  one-off phrasing choices and a scope/roadmap gap rather than bugs.
- No American spelling or terminology was found anywhere in this scope (checked every card, quiz prompt,
  option, mastered/revisit string, and description for "color", "math", "grade", "elementary", "fall" for
  autumn, "recess", "practice" as a verb, etc.) — the hand-authored Rec–Y2 content is UK-clean on that
  axis. That is worth stating plainly since it is the one dimension the brief is most anxious about, and
  it is not where this scope's problems are.

**Does the curriculum-alignment claim survive, for Reception–Year 2?**

Partially, and unevenly. The *content that exists* is factually sound (with two isolated authoring
mistakes out of 54 cards — a 96% accuracy rate on facts) and is written at the right level for its year
group against the real KS1/EYFS programmes of study I checked it against. But "genuinely UK National
Curriculum aligned" is a claim about completeness and about the machinery that proves alignment to a
parent, not just about individual facts being correct — and on both of those the claim does not survive
for this age range as currently shipped:

1. **Breadth**: 7 of 10 subject hubs have no Reception, Year 1 or Year 2 content at all, including two
   (Geography, History) that are statutory from Key Stage 1. A parent of a 5-, 6- or 7-year-old sees
   roughly 30% of the subjects the National Curriculum actually requires for their child's year group.
2. **Proof mechanism**: even within the 3 subjects that do have content, a real code bug (finding 2) makes
   4 of 9 sets' progress invisible in the exact screens (subject hub strands, curriculum browser,
   strand-level analytics) that are supposed to demonstrate alignment. The claim isn't just under-delivered
   on breadth — the app's own coverage UI can't correctly report the breadth it does have.
3. **Assessment integrity**: the 62% answer-position bias means the quizzes for this age range do not
   reliably measure what a child knows; a child could pass most Rec/Y1/Y2 quizzes by ignoring the
   questions entirely.

None of this means the underlying pedagogical judgement is bad — the cards that exist are well-targeted
and (with two exceptions) correct. But as a marketing claim of "genuinely National-Curriculum-aligned,
not generic filler," it currently overstates what a Reception–Year 2 parent actually gets, on both
coverage and on the reliability of the one thing (the quiz) that is supposed to prove learning happened.

---

## Files read

- `/Users/mrgee/WebstormProjects/gokid/src/lib/study.ts` (full file, 1445 lines — all 9 Rec/Y1/Y2 sets plus the `withTrueCardCount`/`quizAttempt`/`quizItems` machinery)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/subjects.ts` (full file)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/curriculum.ts` (full file)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/analytics.ts` (strand-matching logic, `grep`-scoped read)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/openrouter.ts` (system/user prompt, lines 1–90)
- `/Users/mrgee/WebstormProjects/gokid/src/app/api/admin/generate+api.ts` (full file)
- Web search: Met Office / Royal Meteorological Society on snow vs sleet vs freezing rain; UK phonics "pure sounds" / schwa guidance (DfE Letters and Sounds era, phonics screening check practice)
