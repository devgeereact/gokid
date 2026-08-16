# Content audit — Y3, Y4, Y5, Y6 (src/lib/study.ts + subjects.ts + curriculum.ts)

Auditor scope: every study set, flashcard and quiz question for `yearCode` Y3/Y4/Y5/Y6 in
`src/lib/study.ts`, plus the `mixedQuiz` array (only `place-value` carries one, and it is Y3, so it
is in scope), plus `src/lib/subjects.ts` strands and `src/lib/curriculum.ts` objectives for those
year groups. Read-only; no simulator, no DB queries, no dev server (per resource contract). Facts
were independently recomputed/verified: all named historical dates (Claudius' invasion AD 43,
Hadrian's Wall, the end of Roman Britain c. AD 410), Everest as the highest mountain, Darwin/the
Galápagos, water freezing at 0 °C, and every maths calculation, all check out — see the "what's
actually correct" note in the synthesis before reading the table, because the table is dominated by
structural findings, not wrong answers.

Sets in scope (18 total):
- Y3: `place-value`, `capital-cities`, `human-skeleton` (CORE_SETS) + `y3-roman-britain`,
  `y3-algorithms`, `y3-colour-mixing`, `y3-pulse-rhythm`, `y3-french-greetings`, `y3-festivals`
  (subject-hub shelf).
- Y4: `y4-mult-div`, `y4-fronted-adverbials`, `y4-states-of-matter`.
- Y5: `y5-fractions`, `y5-rivers-mountains`, `y5-earth-space`.
- Y6: `y6-ratio-proportion`, `y6-grammar-clauses`, `y6-evolution`.

## Per-item table

| Set id · card/question id | Year | Subject | Issue type | Severity | The problem | Corrected value |
|---|---|---|---|---|---|---|
| `y4-fronted-adverbials` · `y4-fa-q1`–`y4-fa-q5` (all 5) | Y4 | English | Answer-index integrity / positional pattern | High | Every one of the 5 MCQ answers is `answer: 0` (option A). A child who always taps the first option scores 100% without reading a single question — this is invisible in a code review that checks each question in isolation, only visible when you read the array as a set, as required. | Re-shuffle correct-answer positions across the 5 questions so no single index dominates (e.g. target roughly 1–2 occurrences per index across 4 options). Mechanically: reorder `options` arrays (keeping the correct text) so `answer` becomes e.g. `[2, 0, 3, 1, 0]` or similar, verifying against the prompt text each time. |
| `y4-states-of-matter` · `y4-sm-q1`–`y4-sm-q5` (all 5) | Y4 | Science | Answer-index integrity / positional pattern | High | Same defect: all 5 answers are `answer: 0`. Two Y4 quizzes back-to-back are both 100% "always A" — this is a systematic authoring pattern in this file, not a one-off. | Same fix as above: redistribute the correct index per question, e.g. `[0, 3, 1, 2, 0]`, keeping the option text/order defensible. |
| `y3-roman-britain` · `y3-rb-q1`–`y3-rb-q5` | Y3 | History | Answer-index integrity / positional pattern | Medium | 4 of 5 answers are `answer: 1` (option B); only `y3-rb-q1` breaks the pattern. Still guessable well above chance. | Redistribute indices, e.g. `[0, 1, 2, 3, 0]`. |
| `y3-algorithms` · `y3-al-q1`–`y3-al-q5` | Y3 | Computing | Answer-index integrity / positional pattern | Medium | 4 of 5 answers are `answer: 1`. Same pattern as above. | Redistribute, e.g. `[1, 2, 0, 3, 1]`. |
| `y6-evolution` · `y6-ev-q1`–`y6-ev-q5` | Y6 | Science | Answer-index integrity / positional pattern | Medium | 4 of 5 answers are `answer: 1`. Same pattern. | Redistribute, e.g. `[1, 0, 2, 3, 1]`. |
| `y5-earth-space` · `y5-es-q1`–`y5-es-q5` | Y5 | Science | Answer-index integrity / positional pattern | Low | Option A (index 0) is never the correct answer across all 5 questions — the inverse tell (a child can drop A as a strategy). | Move at least one correct answer to index 0. |
| `y6-grammar-clauses` · `y6-gc-q1`–`y6-gc-q5` | Y6 | English | Answer-index integrity / positional pattern | Low | Option A (index 0) is never correct across all 5 questions. | Move at least one correct answer to index 0. |
| — (n/a, coverage) | Y3 | English | Coverage gap | High | Year 3 has **no English study set at all**. All other 9 subject hubs have exactly one Y3 set (Maths, Geography, Science, History, Computing, Art, Music, Languages, RE), but the core subject — reading/writing/grammar — is entirely absent for the year the demo household's child (Amara) is actually in. | Author a Y3 English set (e.g. "Paragraphs and Conjunctions" or similar, matching `Y3:English` objectives already curated in `curriculum.ts`: prefixes/suffixes, drafting sentences, conjunctions for time/cause) so `getStudySetsForYear("Y3")` returns an English entry. |
| — (n/a, coverage) | Y4 | All | Coverage gap | High | Year 4 has sets in only 3 of 10 subject hubs (Maths, English, Science). Geography, History, Computing, Art, Music, Languages and RE have zero Y4 content — 70% of the subject hubs are empty for this year group. | Author at least one Y4 set per missing subject, or explicitly relabel the `/curriculum` and subject-hub screens as "coming soon" for those pairs instead of silently omitting the row. |
| — (n/a, coverage) | Y5 | English + 6 others | Coverage gap | High | Year 5 has sets in only 3 of 10 subject hubs (Maths, Geography, Science) — and notably **no English set**, same gap as Y3. History, Computing, Art, Music, Languages, RE also absent. | Same remediation as Y4: author missing sets or mark the gaps explicitly rather than silently dropping subjects from the accordion. |
| — (n/a, coverage) | Y6 | All | Coverage gap | High | Year 6 has sets in only 3 of 10 subject hubs (Maths, English, Science). Geography, History, Computing, Art, Music, Languages, RE absent — the same 70% gap as Y4. | Same remediation. |
| `src/lib/curriculum.ts` · `yearCoverage()` / `ProgressRing` on `/curriculum` and `parent-analytics.tsx` | Y3–Y6 (all) | n/a | Coverage-metric integrity | High | The "coverage ring" (the 42% referenced in the brief) is **computed**, not authored — it is `cardPct()`, i.e. cards-reviewed ÷ cards-total, from `curriculumForYear()`. But `curriculumForYear()` only builds a row for a subject if that subject already has at least one set for the year (`names = [...new Set(yearSets.map(s => s.subject))]`); a subject with **zero** sets never appears as a 0% row and is never counted in the denominator. So the ring measures "how much of the *existing* content has this child studied," not "how much of the National Curriculum does GoKid cover" — for Y4/Y5/Y6, where 7 of 10 subjects have no content at all, the ring silently excludes that missing 70% rather than reporting it as 0%, which structurally overstates the coverage claim it's implicitly making. Same mechanism drives `objectives.met`/`objectives.total` on the same screens. | Either (a) compute a second, honest "curriculum breadth" metric — subjects-with-content ÷ 10 total subject hubs, surfaced separately from the study-progress ring — or (b) relabel the existing ring explicitly as "of the sets you have" rather than implying National Curriculum coverage. |
| `src/lib/subjects.ts` · Maths `strands` | Y6 | Maths | Invented/missing strand taxonomy | Medium | The Maths strand list (`Number and place value`, `Addition and subtraction`, `Multiplication and division`, `Fractions`, `Measurement`, `Geometry`) omits three real NC domains: **Ratio and proportion** (Y6-only), **Algebra** (Y6-only) and **Statistics** (Y2+). `y6-ratio-proportion` exists as a set but has nowhere to file under a matching strand. | Add `"Ratio and proportion"` and `"Algebra"` (and ideally `"Statistics"`) to `SUBJECTS[0].strands` in `subjects.ts`. |
| `src/lib/subjects.ts` · Science `strands` | Y6 | Science | Invented/missing strand taxonomy | Medium | Science strands (`Plants`, `Animals and humans`, `Materials`, `Forces and magnets`, `Light and sound`, `Earth and space`) omit **Evolution and inheritance** — the exact, literal Y6 National Curriculum unit title — despite `y6-evolution` existing as a set. Also missing: `Rocks` (Y3) and `Electricity` (Y4/Y6). | Add `"Evolution and inheritance"` to `SUBJECTS[2].strands` (Science) at minimum, since a set already exists for it. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y6:Maths"]`, row 1 | Y6 | Maths | Invented/mis-tagged objective strand | Medium | `"Use simple formulae and express missing numbers algebraically"` is tagged `strand: "Number and place value"`. That is an Algebra-domain NC statement, not place value. | Retag `strand: "Algebra"` (after adding the strand — see above). |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y6:Maths"]`, row 2 | Y6 | Maths | Invented/mis-tagged objective strand | Medium | `"Solve problems involving ratio and proportion"` is tagged `strand: "Multiplication and division"` rather than `"Ratio and proportion"`. It is the only Y6:Maths objective that is actually backed by an authored set (`y6-ratio-proportion`), so the mis-tag is doubly unfortunate — the one objective the app can prove it teaches is filed under the wrong heading. | Retag `strand: "Ratio and proportion"`. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y6:Science"]`, row 1 | Y6 | Science | Invented/mis-tagged objective strand | Medium | `"Recognise that living things have changed over time"` — the literal Evolution-and-inheritance NC statement — is tagged `strand: "Animals and humans"`. | Retag `strand: "Evolution and inheritance"` (after adding the strand). |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y6:Science"]`, row 2 | Y6 | Science | Invented/mis-tagged objective strand | Medium | `"Identify how animals and plants are adapted to their environment"` is tagged `strand: "Plants"` rather than `"Evolution and inheritance"`, where adaptation belongs in the Y6 programme of study. | Retag `strand: "Evolution and inheritance"`. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y3:Geography"]` (both rows) | Y3 | Geography | Objective/content mismatch | High | The only authored Y3 Geography set is `capital-cities` ("Capital Cities of Europe" — locating European countries and capitals). Neither curated Y3:Geography objective reflects that: row 1 is "Name and locate counties and cities of the United Kingdom" (a UK-locational-knowledge objective with **no corresponding set anywhere in the shelf**), and row 2 is "Describe and understand rivers and mountains" — which is not Y3 content at all, it is the exact subject of the **Y5** set `y5-rivers-mountains`. A parent opening the Y3 Geography accordion sees two official-sounding NC statements, tracks "objectives met" against them, and neither describes what the child is actually studying. | Replace with an objective that matches the real Y3 content, e.g. `{ text: "Name and locate the world's countries, concentrating on Europe, including key physical and human characteristics and major cities", strand: "Locational knowledge" }`, and drop the misplaced rivers/mountains line from Y3 (it already exists correctly, unlabelled/derived, for Y5). |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y3:History"]`, row 1 | Y3 | History | Objective/content mismatch | Medium | "Describe changes from the Stone Age to the Iron Age" has no backing set — the only Y3 History set is `y3-roman-britain`. Stone Age content does not exist anywhere in the demo shelf (Rec–Y6). | Either remove the row (leave only the Roman-Britain-backed "Explain the Roman impact on Britain") or author a Stone Age set to back it. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y3:Science"]` (all 3 rows) | Y3 | Science | Objective/content mismatch | High | The only authored Y3 Science set is `human-skeleton` (bones, the skeleton's role in support/protection/movement). None of the three curated Y3:Science objectives is that statement: "parts of a flowering plant" (Plants — no plant set exists for Y3), "humans and animals need the right nutrition" (Animals and humans — the actual set is about the skeleton, not nutrition), "compare how things move on different surfaces" (Forces and magnets — no forces set exists for Y3). The real NC statement that matches the authored content almost verbatim — *"identify that humans and animals have skeletons and muscles for support, protection and movement"* — was not the one chosen. | Replace row 2 with `{ text: "Identify that humans and animals have skeletons and muscles for support, protection and movement", strand: "Animals and humans" }` to match `human-skeleton`. Keep or drop the other two rows depending on whether Plants/Forces sets get authored for Y3. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y4:Maths"]`, rows 2–3 | Y4 | Maths | Objective/content mismatch | Medium | "Round any number to the nearest 10, 100 or 1,000" and "Recognise and write decimal equivalents of tenths and hundredths" have no backing — `y4-mult-div` tests only multiplication/division facts and the standard written method, not rounding or decimals. Only row 1 (times tables to 12×12) is backed. | Remove the two unbacked rows, or author Y4 sets for rounding and decimals. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y4:English"]`, row 2 | Y4 | English | Objective/content mismatch | Low | "Spell homophones correctly" has no backing — the only Y4 English set (`y4-fronted-adverbials`) is grammar/punctuation, not spelling. | Remove the row, or author a Y4 homophones spelling set. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y4:Science"]`, row 2 | Y4 | Science | Objective/content mismatch | Low | "Identify how sounds are made and travel" has no backing — the only Y4 Science set (`y4-states-of-matter`) is solids/liquids/gases, not sound. | Remove the row, or author a Y4 Sound set. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y5:Maths"]`, rows 1–2 | Y5 | Maths | Objective/content mismatch | Medium | "Multiply numbers up to four digits by a two-digit number" and "Identify prime numbers, factors and multiples" have no backing — `y5-fractions` only tests equivalent fractions and addition/subtraction of fractions. | Remove the two unbacked rows, or author sets for long multiplication and for primes/factors/multiples. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y5:Science"]`, row 2 | Y5 | Science | Objective/content mismatch | Medium | "Identify the effects of gravity, friction and air resistance" has no backing — the only Y5 Science set (`y5-earth-space`) is the solar system/day-night, not forces. | Remove the row, or author a Y5 Forces set. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y6:Maths"]`, rows 1 and 3 | Y6 | Maths | Objective/content mismatch | Medium | Neither the algebra objective (row 1) nor "Calculate the area of parallelograms and triangles" (row 3, Geometry) has a backing set — only row 2 (ratio and proportion) is backed by `y6-ratio-proportion`. | Remove the two unbacked rows, or author Y6 Algebra and Geometry sets. |
| `src/lib/curriculum.ts` · `OBJECTIVES["Y6:English"]`, row 1 | Y6 | English | Objective/content mismatch | Medium | "Use the passive voice and the subjunctive form" has no backing — the only Y6 English set (`y6-grammar-clauses`) covers main/subordinate/relative clauses and semicolons, not passive voice or the subjunctive. | Remove the row, or author a Y6 passive-voice/subjunctive set. |
| `y4-fronted-adverbials` · `mastered` array | Y4 | English | Authoring quality (content–topic mismatch, low severity) | Low | The set's `mastered` list — "Spotting adverbs", "Using capital letters", "Ending sentences with full stops" — is KS1-level sentence mechanics (Y1/Y2 punctuation), unrelated in specificity to fronted adverbials the way every other set's `mastered` array is a genuine simpler subtopic of its own topic (e.g. `y2-times-tables`'s `mastered` list is sub-skills of times tables). Reads as generic filler rather than a real prerequisite ladder for this specific set. | Replace with fronted-adverbial-adjacent prerequisites, e.g. "Using commas in a list", "Writing complete sentences", "Identifying adverbs of time/place/manner". |
| `src/lib/openrouter.ts` · `systemPrompt()` | n/a (generation pipeline) | n/a | Systematic / prompt gap | High | The generation system prompt claims "UK primary-school teacher... England National Curriculum" but never explicitly forbids American spelling/vocabulary (`color`, `math`, `grade`, `fall` for autumn, `practice` as a verb, etc.), and the demo content in `study.ts` is hand-authored so this gap has not yet surfaced there — but it is the exact mechanism by which AI-generated rows (in `quiz_questions`, including whatever is sitting in `draft`/`rejected`) would fail the UK-ness bar invisibly, since nothing in the prompt or (from what's readable here) the validator checks spelling. | Add an explicit line to `systemPrompt()`: "Use British English spelling and vocabulary throughout (colour not color, maths not math, autumn not fall, etc.) — this is a UK National Curriculum product." |
| `src/lib/openrouter.ts` · `systemPrompt()` | n/a (generation pipeline) | n/a | Systematic / prompt gap | Medium | No instruction constrains the distribution of the correct answer's position across a batch of `mcq`/`multi` questions. Given the positional-bias pattern already found by hand in the *human-authored* demo content (two Y4 quizzes are 100% "always A"), an unconstrained model asked to write several MCQs in one call is equally likely to cluster the correct index, and nothing in the prompt or (as far as is visible from `openrouter.ts`) the validator (`quiz-validate.ts`, not read in this pass) checks for it. | Add to `systemPrompt()`: "Vary the position of the correct answer across the batch — do not put it at the same option index more than twice in a row." Also worth a validator-side check across a generated batch, not just per-question. |

## Synthesis

**What's actually correct.** Every maths answer in the Y3–Y6 scope was independently recomputed and
is right (place value, the four times-tables/division facts, fraction addition/subtraction and
equivalence, ratio/proportion, percentages, map scale). Every history, geography and science fact
checked out against what I already know with high confidence and did not need `WebSearch` for
(Claudius/AD 43, Hadrian's Wall's purpose, the end of Roman Britain c. AD 410, Everest, Darwin and
the Galápagos finches, water freezing at 0 °C, the mechanics of evaporation/condensation, day/night
from Earth's rotation, evolution/adaptation/inheritance). All 18 sets are written in consistent
British English — no `color`/`math`/`grade`/`fall`/`recess` anywhere in this scope, and UK-specific
vocabulary is used correctly and idiomatically (crotchet not quarter note, £-free but metric units,
"fronted adverbials" as the actual UK grammar term with no US equivalent). No shaming or patronising
tone anywhere — there are in fact zero authored `explanation` strings in this whole file (checked
with `grep`), so every wrong-answer explanation a child in this scope sees is the generic fallback
string built in `quizAttempt()` (`study.ts` line ~1411), which is plain and non-shaming.

**One-off authoring errors:** genuinely rare in this scope. I did not find a wrong answer index, an
incomplete `answers` array, an unsolvable `order`/`match` payload, a duplicated card, or an ambiguous
distractor anywhere in Y3–Y6. The `y4-fronted-adverbials` `mastered`-list mismatch is the closest
thing to a pure one-off content-quality nit.

**Systematic flaws — these are the real story:**

1. **Answer-position bias is a pattern, not an accident.** Two entire Y4 quizzes (`y4-fronted-adverbials`,
   `y4-states-of-matter`) put the correct answer at index 0 for all 5 questions — a child gets 100% by
   always tapping the first option, never reading a word. Three more quizzes (`y3-roman-britain`,
   `y3-algorithms`, `y6-evolution`) put it at index 1 for 4 of 5. This is invisible reviewing any one
   question and only shows up reading a quiz as a set, which is exactly what this audit was asked to
   do. It recurs across four different subjects and three different year groups authored by the same
   hand, so it reads as a habit of the person/process that wrote these arrays, not one bad set. **Fix
   is mechanical** (redistribute indices — given in the table) and there's a matching **prompt fix**:
   `openrouter.ts`'s `systemPrompt()` has no instruction constraining answer-index distribution, so the
   AI pipeline is set up to reproduce the same defect at scale unless that's added.

2. **The curriculum-objective table is disconnected from the actual sets roughly half the time.**
   Across Y3–Y6, of the ~24 curated `OBJECTIVES` rows I checked against the real content of the sets
   that exist, only about 10 are actually taught by an authored set; the rest are real, defensibly-worded
   NC statements that simply describe content GoKid doesn't have (Stone Age, UK counties, rounding,
   decimals, prime numbers, gravity/friction, algebra, geometry area, passive voice/subjunctive,
   sound, homophones). Worse, in two cases (Y3 Geography, Y3 Science) the objectives shown for a year
   don't match the set that year actually has *at all* — Y3 Geography's set is about European capital
   cities and its two objectives are about UK counties and about rivers/mountains (which is actually
   the Y5 set's topic); Y3 Science's set is the human skeleton and none of its three objectives mention
   skeletons, muscles, support or protection — the one NC statement that would have matched almost
   verbatim was not the one chosen. This is a content-authoring/data-modelling issue in
   `curriculum.ts`, not a prompt issue (this file is hand-curated, not AI-generated) — the objectives
   table appears to have been written from the National Curriculum in the abstract rather than checked
   against `STUDY_SETS`.

3. **The "42% coverage" ring measures the wrong thing, and does so honestly-but-misleadingly.** It
   is genuinely *computed* (`yearCoverage()` → `cardPct()`, cards-reviewed ÷ cards-total), not a typed
   literal — so it is not "fake" in the sense of being hardcoded. But `curriculumForYear()` only
   includes a subject in the denominator if that subject already has at least one set for the year; a
   subject with zero content is invisible rather than counted as 0%. For Y4/Y5/Y6, where 7 of 10
   subject hubs have no content at all, the ring silently ignores that 70% gap rather than reflecting
   it, so the number a parent sees is "progress through what exists," not "coverage of the National
   Curriculum" — which is what the screen visually claims to be (it's titled "Curriculum coverage" on
   `parent-analytics.tsx`). This is the single biggest risk to the marketing claim: the number is real,
   but it answers a different, much rosier question than the one it's presented as answering.

4. **Subject taxonomy in `subjects.ts` lags the content that already exists.** Two authored sets
   (`y6-ratio-proportion`, `y6-evolution`) test material that has no matching strand in `subjects.ts`
   at all (Ratio and proportion, Algebra, Evolution and inheritance are all missing from the Maths and
   Science strand lists respectively), which is why `curriculum.ts` had to mis-file their objectives
   under adjacent strands (found above) — the mis-tagging is a downstream symptom of this gap.

**Does the curriculum-alignment claim survive, for Y3–Y6?** Partially, and unevenly by dimension.
The content that exists is factually solid and genuinely British — nothing here would embarrass the
"UK National Curriculum aligned" claim on a fact-check or a spelling audit; the maths, history,
geography and science are correct and pitched at roughly the right year group (Y6's ratio/proportion
and evolution-and-inheritance content in particular are exact NC Y6-only units, done well). But the
claim is not just "the facts are right" — it's "genuinely aligned rather than generic filler," and on
that stronger reading it does **not** survive for these four year groups: 7 of 10 subjects have zero
content in three of the four years audited, the objectives shown alongside the content that does
exist are right roughly half the time and are actively wrong (describing different content than the
set teaches) in at least two places, and the one metric parents actually see as "curriculum coverage"
is calculated over a silently-shrunk denominator that hides most of the gap. A skeptical reviewer
comparing what `/curriculum` implies against what `STUDY_SETS` actually contains for Y4–Y6 would
reasonably conclude the alignment claim is currently aspirational for those years, resting on Y3's
comparatively complete (9/10 subjects, missing only English) shelf to carry the impression.

## Files read

- `/Users/mrgee/WebstormProjects/gokid/src/lib/study.ts` (full file, 1446 lines)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/subjects.ts` (full file)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/curriculum.ts` (full file)
- `/Users/mrgee/WebstormProjects/gokid/src/lib/openrouter.ts` (full file)
- `/Users/mrgee/WebstormProjects/gokid/src/app/(app)/curriculum.tsx` (lines 260–339, to confirm how
  the coverage ring and objectives pill are computed and labelled)
- Grep checks: `explanation:` occurrences in `study.ts` (none authored), US-spelling/terminology
  patterns in `study.ts` (none found), `yearCoverage`/`coverage` usage across `src/app` (confirms the
  ring feeds `curriculum.tsx` and `parent-analytics.tsx`)

Not read in this pass (out of scope or explicitly forbidden): `src/app/api/admin/generate+api.ts`
(the admin generation route itself — only its downstream `openrouter.ts` prompt was read),
`src/lib/quiz-validate.ts` (referenced by `openrouter.ts` but not opened — a follow-up worth doing to
confirm whether the validator catches positional-bias or US-spelling issues before a generated
question reaches `quiz_questions`), and the live `quiz_questions` Postgres table (explicitly
off-limits this run — another worker owns DB probing).
