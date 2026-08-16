# Fix: positional answer bias in nine authored quizzes

Scope: `src/lib/study.ts`, `quiz:` arrays only, in the nine sets flagged by
`scripts/check-answer-bias.mjs`. No cards, topics, strands, `mixedQuiz`, prompts,
explanations or distractor text were touched. No question was added, removed or
renumbered; no question id changed.

Method: for each biased quiz, picked the minimum number of over-represented
questions and, for each, moved the correct answer's option *text* to a different
index in its own `options` array, updating that question's `answer` index to
match. The answer string itself was never edited — see the verification section.

## Per-set before/after

### place-value (Y3 Maths)
Before: `B×4 C×2` (pvq2 B, pvq3 B, pvq4 B, pvq5 B, pvq1 C, pvq6 C)
After: `A×1 B×2 C×2 D×1`
Moved: **pvq3**, **pvq4** (2 of the 4 B's).
Untouched: pvq1, pvq2, pvq5, pvq6.

| id | before options / answer | after options / answer | correct text |
|---|---|---|---|
| pvq3 | `["6,308","638","683","68"]` idx 1 (B) | `["638","6,308","683","68"]` idx 0 (A) | "638" |
| pvq4 | `["405","450","Equal","None"]` idx 1 (B) | `["405","Equal","None","450"]` idx 3 (D) | "450" |

**Judgement call (rule 3):** pvq1 (`["4","40","400","4,000"]`, answer 400) and
pvq5 (`["1","10","100","1,000"]`, answer 10) are strictly ascending place-value
sequences a child is meant to read as a sequence — moving them would produce
exactly the "4,000 / 400 / 40" scramble the brief warns about, so they were left
alone even though both hold "B". pvq6 (`["281","292","301","391"]`) is likewise
ascending and left alone. pvq3's list (`"6,308","638","683","68"`) is not sorted
in any order (already out of magnitude order), so reordering it changes nothing
about readability. pvq4's list mixes two numbers with "Equal"/"None" — it was
never a sorted numeric sequence, so moving "450" to the end doesn't create a
new one.

### y1-common-words (Y1 English)
Before: `B×4 C×1`
After: `A×1 B×1 C×2 D×1`
Moved: **y1-cw-q1**, **y1-cw-q3**, **y1-cw-q4**.
Untouched: y1-cw-q2, y1-cw-q5.

| id | before | after | correct text |
|---|---|---|---|
| y1-cw-q1 | `["sed","said","sayd","sedd"]` idx 1 | `["said","sed","sayd","sedd"]` idx 0 | "said" |
| y1-cw-q3 | `["wun","one","won","onne"]` idx 1 | `["wun","won","onne","one"]` idx 3 | "one" |
| y1-cw-q4 | `["cat","the","sit","pin"]` idx 1 | `["cat","sit","the","pin"]` idx 2 | "the" |

No ordering judgement needed — all four options in every question are
alternative spellings/words with no sequence, chronology or magnitude relation.

### y2-word-classes (Y2 English)
Before: `A×1 B×4`
After: `A×1 B×1 C×1 D×2`
Moved: **y2-wc-q3**, **y2-wc-q4**.
Untouched: y2-wc-q1, y2-wc-q2, y2-wc-q5.

| id | before | after | correct text |
|---|---|---|---|
| y2-wc-q3 | `["run","happy","dog","sing"]` idx 1 | `["run","dog","happy","sing"]` idx 2 | "happy" |
| y2-wc-q4 | `["The","big","dog","barks"]` idx 1 | `["The","dog","barks","big"]` idx 3 | "big" |

No ordering judgement needed — word lists, no sequence.

### y2-habitats (Y2 Science)
Before: `A×1 B×4`
After: `A×1 B×1 C×1 D×2`
Moved: **y2-hab-q2**, **y2-hab-q3**.
Untouched: y2-hab-q1, y2-hab-q4, y2-hab-q5.

| id | before | after | correct text |
|---|---|---|---|
| y2-hab-q2 | `["A type of food","The home of a living thing","A kind of weather","A baby animal"]` idx 1 | `["A type of food","A kind of weather","A baby animal","The home of a living thing"]` idx 3 | "The home of a living thing" |
| y2-hab-q3 | `["A tree","A rock","A worm","A daisy"]` idx 1 | `["A tree","A worm","A rock","A daisy"]` idx 2 | "A rock" |

No ordering judgement needed.

### y4-fronted-adverbials (Y4 English)
Before: `A×5` (fully biased)
After: `A×2 B×1 C×1 D×1`
Moved: **y4-fa-q1**, **y4-fa-q2**, **y4-fa-q5** (3 of 5, to bring A from 5 down to ≤3).
Untouched: y4-fa-q3, y4-fa-q4 (both stayed on A).

| id | before | after | correct text |
|---|---|---|---|
| y4-fa-q1 | `["After lunch,","played","we","outside"]` idx 0 | `["played","we","After lunch,","outside"]` idx 2 | "After lunch," |
| y4-fa-q2 | `["A comma","A full stop","A question mark","An apostrophe"]` idx 0 | `["A full stop","A comma","A question mark","An apostrophe"]` idx 1 | "A comma" |
| y4-fa-q5 | `["Yesterday","Happily","Loudly","Carefully"]` idx 0 | `["Happily","Loudly","Carefully","Yesterday"]` idx 3 | "Yesterday" |

No ordering judgement needed — none of these five option lists are a sequence
(sentence fragments, punctuation names, or adverb examples).

### y4-states-of-matter (Y4 Science)
Before: `A×5` (fully biased)
After: `A×2 B×1 C×1 D×1`
Moved: **y4-sm-q1**, **y4-sm-q2**, **y4-sm-q4**.
Untouched: y4-sm-q3, y4-sm-q5 (both stayed on A).

| id | before | after | correct text |
|---|---|---|---|
| y4-sm-q1 | `["Ice","Water","Steam","Air"]` idx 0 | `["Water","Ice","Steam","Air"]` idx 1 | "Ice" |
| y4-sm-q2 | `["It turns into a gas","It turns into a solid","It freezes","It stays the same"]` idx 0 | `["It turns into a solid","It freezes","It turns into a gas","It stays the same"]` idx 2 | "It turns into a gas" |
| y4-sm-q4 | `["Condensation","Evaporation","Melting","Freezing"]` idx 0 | `["Evaporation","Melting","Freezing","Condensation"]` idx 3 | "Condensation" |

**Judgement call (rule 3) considered and rejected:** y4-sm-q3's options
(`["0°C","100°C","50°C","10°C"]`) look numeric but are *not* in ascending or
descending order already (0, 100, 50, 10), so there is no existing sequence to
protect; it was left untouched only because A was already reduced to 2 by the
other three moves, not because of an ordering concern.

### y6-evolution (Y6 Science)
Before: `A×1 B×4`
After: `A×1 B×2 C×1 D×1`
Moved: **y6-ev-q1**, **y6-ev-q3**.
Untouched: y6-ev-q2, y6-ev-q4, y6-ev-q5.

| id | before | after | correct text |
|---|---|---|---|
| y6-ev-q1 | `["Getting money from family","Passing characteristics from parents to offspring","Changing your environment","Learning a new skill"]` idx 1 | `["Getting money from family","Changing your environment","Learning a new skill","Passing characteristics from parents to offspring"]` idx 3 | "Passing characteristics from parents to offspring" |
| y6-ev-q3 | `["living animals today","the remains or traces of things that lived long ago","rocks with no history","modern animal bones"]` idx 1 | `["living animals today","rocks with no history","the remains or traces of things that lived long ago","modern animal bones"]` idx 2 | "the remains or traces of things that lived long ago" |

No ordering judgement needed.

### y3-roman-britain (Y3 History)
Before: `A×1 B×4`
After: `A×1 B×2 C×1 D×1`
Moved: **y3-rb-q2**, **y3-rb-q3**.
Untouched: y3-rb-q1, y3-rb-q4, y3-rb-q5.

| id | before | after | correct text |
|---|---|---|---|
| y3-rb-q2 | `["carry water to cities","guard the north of Roman Britain","hold back the sea","mark a Roman road"]` idx 1 | `["carry water to cities","hold back the sea","mark a Roman road","guard the north of Roman Britain"]` idx 3 | "guard the north of Roman Britain" |
| y3-rb-q3 | `["The Saxons","The Iceni","The Vikings","The Picts"]` idx 1 | `["The Saxons","The Vikings","The Iceni","The Picts"]` idx 2 | "The Iceni" |

**Judgement call (rule 3) considered and rejected:** y3-rb-q1's options
(`["AD 43","AD 410","55 BC","AD 1066"]`) are dates but already out of
chronological order in the source (55 BC is earliest, listed third), so there
was no chronology to preserve — moot anyway, since q1 was already index A and
did not need to move.

### y3-algorithms (Y3 Computing)
Before: `A×1 B×4`
After: `A×1 B×2 C×1 D×1`
Moved: **y3-al-q1**, **y3-al-q4**.
Untouched: y3-al-q2, y3-al-q3, y3-al-q5.

| id | before | after | correct text |
|---|---|---|---|
| y3-al-q1 | `["a type of computer","a list of steps in order","a picture on screen","a broken program"]` idx 1 | `["a type of computer","a picture on screen","a broken program","a list of steps in order"]` idx 3 | "a list of steps in order" |
| y3-al-q4 | `["It looks tidier","The computer follows them exactly as written","It uses less battery","It makes the screen brighter"]` idx 1 | `["It looks tidier","It uses less battery","The computer follows them exactly as written","It makes the screen brighter"]` idx 2 | "The computer follows them exactly as written" |

No ordering judgement needed.

## Verification

### 1. `node scripts/check-answer-bias.mjs`

```
27 quizzes checked, 0 biased.
```
Exit code 0.

### 2. `npx tsc --noEmit`

Clean — no output, exit code 0.

### 3. Answer-text diff against the pre-edit snapshot

Wrote a throwaway extractor
(`/private/tmp/claude-501/.../scratchpad/extract_answers.mjs`) that re-parses
every `{ id, prompt, options, answer }` quiz question out of the edited
`study.ts` the same way the pre-existing snapshot
(`scratchpad/answers-before.json`) was built, resolves each `answer` index
against its `options` array to get the correct-answer text, and diffs that
against the snapshot
(`/private/tmp/claude-501/.../scratchpad/diff_answers.py`).

```
Before count: 135  After count: 135
Missing in after (extraction failed to find): []
New/unexpected in after: []
Answer TEXT differences: 0

RESULT: PASS — every question's correct answer text is identical.
```

All 135 quiz questions across all 27 sets (not just the nine touched) resolve
to the exact same correct-answer string before and after the edit.

## Notes

- The working tree already carried unrelated, pre-existing uncommitted changes
  to `study.ts` (an `illustrationAlt` field for accessibility, a `strand`
  field for hub-matching) from other in-flight work. `git diff` on the file
  includes those; the diff isolated to this task (grepped by the 21 touched
  question ids) is limited to the `options`/`answer` pairs listed above — no
  prompt, explanation, card, topic, strand or `mixedQuiz` line was changed by
  this task.
- Nine sets fixed, 21 individual questions edited, 0 questions added/removed,
  0 question ids changed, 0 answer texts changed.
