# Fix: `src/lib/curriculum.ts` OBJECTIVES — Y3 Geography/Science + broader pass

Scope: `src/lib/curriculum.ts` only (per instruction, all other files were being edited by other
agents). No changes to `src/lib/study.ts` or `src/lib/subjects.ts` — I only read them to check every
objective against what's actually taught and against the current strand names.

## The keep-vs-remove rule (also written into the file's comments, above `OBJECTIVES`)

An objective describing content that no set in its year/subject teaches is:

- **Kept as honest coverage information** when (a) it is genuine UK National Curriculum content for
  that year group, and (b) at least one *other* objective in the same list is actually taught by a
  real set — so the taught content is never crowded out and a parent can still see what their child
  studies. The `/curriculum` coverage ring is computed from real card-progress (`cardPct` in this
  file), never from the objectives list, so an untaught-but-real objective sitting here doesn't
  inflate any number — it only tells a parent "this is on the curriculum, GoKid has no set for it
  yet," which is true and is the whole point of the coverage ring reading as a gap rather than 100%.

- **Fixed** when:
  1. **none** of a list's objectives match what the year's set(s) for that subject actually teach —
     the taught content becomes invisible and the list actively misleads (this was the Y3 Geography
     and Y3 Science cases named in the brief, and — found during the wider pass — the same shape in
     Rec Science, Y1 Science, Y2 English and Y2 Science: none of their objectives named what the
     one set in that section covers);
  2. an objective is **verbatim another year's actual set topic**, not a plausible unbuilt gap but a
     direct collision with real authored content elsewhere in the file (Y3 Geography's "rivers and
     mountains" — word for word the Year 5 Geography set's own topic); or
  3. the objective's `strand` doesn't match the strand the taught set itself carries, so a
     genuinely-taught objective silently fails to register as "met" for the right strand (Y6 Maths,
     Y6 Science).

## Per year group

**Reception** — `Rec:Science` retagged both objectives to the strand the actual set (*Plants and
animals*, strand `Living things and their habitats`, newly valid on `subjects.ts` since 15 Aug) uses;
neither original objective (Plants / Animals-including-humans) named a habitat or mentioned the
set's actual content (baby-animal names, where fish live, roots, sorting living/non-living). Now: one
taught line (`Living things and their habitats`) + one honest `Plants` gap. `Rec:Maths`/`Rec:English`
were already accurate and correctly tagged — left as-is, only tightened "Subitise small quantities…"
to name the "up to 5" the real EYFS ELG specifies.

**Year 1** — `Y1:Science`: the set is *Seasons and Weather*, but neither original objective (Plants /
Animals-and-diets) mentioned seasons at all. Added the taught line (`Seasonal changes`, a strand
`subjects.ts` gained 15 Aug) first; kept the other two as real, non-colliding Y1 NC gaps (Plants;
naming common animals — dropped "diets" since that's a separate NC bullet being conflated).
`Y1:Maths`/`Y1:English` were already accurate — unchanged.

**Year 2** — `Y2:English`: the set is *Nouns, Verbs and Adjectives*; neither original objective
(syllable reading / capital letters) named a word class. Added a taught line ("Identify nouns, verbs
and adjectives… expanded noun phrases" — nouns/adjectives/verbs are literally the Year 2 grammar
terminology list, and expanded noun phrases are a real Year 2 statutory bullet). `Y2:Science`: the
set is *Living Things and Their Habitats*; neither original objective (Materials / animal-survival)
named a habitat, and neither used the `Living things and their habitats` strand the set itself
carries. Added the taught habitat line first. `Y2:Maths` was already accurate — unchanged.

**Year 3** — the two cases named in the brief:
- `Y3:Geography`: both original objectives were wrong for the actual set (*Capital Cities of
  Europe*). "UK counties" matches nothing it teaches; "rivers and mountains" is — verbatim — the
  Year 5 Geography set's own topic, so it doubly mislabelled another year's real content as Year 3's.
  Replaced with what the set actually teaches ("Locate the world's countries, with a focus on
  Europe, and name and locate their capital cities," strand `Locational knowledge`) plus one
  non-colliding KS2 gap under `Human geography` (settlement and land use — deliberately *not*
  physical geography, so it can't be mistaken for the rivers/mountains content that belongs to Y5).
- `Y3:Science`: the only set is *The Human Skeleton*, and none of the three original objectives
  (flowering-plant parts / nutrition / forces on surfaces) mentioned a skeleton. Added the taught
  line first ("Identify that humans and some animals have skeletons and muscles for support,
  protection and movement," same strand — `Animals, including humans` — the set already carries).
  Kept the other three as real, distinct Y3 NC gaps (nutrition is the *other* real bullet under the
  same strand — not a restatement of the taught line; plants and forces are separate strands
  entirely, both real Y3 content, neither colliding with any other year).

`Y3:Maths` and `Y3:History` were already fine — in both, at least one objective (place value; Roman
impact) matches the actual taught set, so the untaught ones (multiplication tables, tenths; Stone Age
to Iron Age) are honest gaps, not left unchanged. `Y3:English` **removed outright** — see below.

**Year 4** — already accurate. Only wording tightened: "Identify how sounds are made and travel" →
"Identify how sounds are made, associating some of them with something vibrating" (closer to the
actual Y4 NC Sound bullet; the general phrase risked reading as taught by the *States of matter* set,
which it isn't — Sound is a separate, real, untaught Y4 NC unit).

**Year 5** — `Y5:Maths` item 3 tightened from "Compare and order fractions whose denominators are
multiples" (not what the set quizzes) to "Add and subtract fractions with the same denominator, and
denominators that are multiples of the same number" — the actual Y5 NC bullet the set's cards
exercise (equivalent fractions, adding/subtracting with a shared or related denominator).
"Identify prime numbers, factors and multiples" → "Identify prime numbers, prime factors and
composite numbers" (matches the real NC vocabulary bullet precisely); kept as an honest gap — no Y5
Maths set covers it, doesn't collide with any other year. `Y5:Science` was already fine ("gravity,
friction and air resistance" is real Y5 NC, kept as an honest gap alongside the taught Earth-and-space
line). `Y5:English` **removed outright** — see below.

**Year 6** — strand fixes, not content fixes (the wording was already accurate):
- `Y6:Maths`: "Use simple formulae and express missing numbers algebraically" was tagged `Number and
  place value`; it's Algebra (a strand `subjects.ts` added 15 Aug) — retagged. "Solve problems
  involving ratio and proportion" — the objective that IS the taught set — was tagged
  `Multiplication and division` instead of `Ratio and proportion`, so the one taught line in the
  section wasn't counting against its own set's strand. Retagged.
- `Y6:English`: neither original objective ("passive voice and the subjunctive form" / "semicolons,
  colons and dashes") named the set's actual main content (main/subordinate/relative clauses).
  Added the taught clauses line first; split "passive voice" from "the subjunctive form" into its
  own accurate NC bullet (they're two separate statutory lines being conflated into one, and
  subjunctive is a much rarer/harder point to defend as "the same thing") and kept passive voice as
  an honest gap.
- `Y6:Science`: both objectives already match the taught set (*Evolution and Inheritance*) content-
  wise, but were tagged `Animals, including humans` / `Plants` instead of `Evolution and
  inheritance` (the strand `subjects.ts` added 15 Aug specifically because this set had nowhere to
  land). Retagged only — text was already accurate to the real Y6 NC wording.

## Dead keys removed: `Y3:English`, `Y5:English`

Neither Year 3 nor Year 5 has an English study set anywhere in `src/lib/study.ts`.
`objectivesFor(yearCode, subject, sets)` is only ever called from `curriculumForYear`'s loop over a
year's *actual* subject list (`names = [...new Set(yearSets.map(s => s.subject))]`), so these two
keys could never be looked up — they were literal dead code, and worse, they violated the module's
own stated invariant ("Only the year/subject pairs the demo shelf actually has sets for are
curated"). I removed them rather than fixing their content, since there is nothing for them to
describe honestly: Year 3 and Year 5 genuinely have no English set, and that's a real content gap for
`study.ts` to close (out of my scope), not something `curriculum.ts` can paper over with objectives
for a subject that isn't there. The gap still shows correctly — `curriculumForYear("Y3")` simply
never produces an English row for Year 3, so the coverage ring (computed from real sets, not this
file) reflects the true gap.

## Incidental fix: missing `strandOf` import

`derivedObjectives` (the fallback for any year/subject not in the curated table) already called
`strandOf(set)` in the working tree before I started editing, but the import line only pulled in
`STUDY_SETS` and `StudySet` — `strandOf` was not imported, which would fail `tsc --noEmit`. Added it
to the import (`import { STUDY_SETS, strandOf, type StudySet } from "./study"`). This is the one
line I touched outside the `OBJECTIVES` table and its surrounding comment.

## What I was unsure about

- **`Y3:History`'s "Stone Age to Iron Age"** — real KS2 content, no set anywhere teaches it, and it
  sits next to a correctly-taught "Roman impact" objective. I judged this as the clean "keep" case
  (rule 1), but it's the closest call in the file: unlike Science/Geography, History's *strand* field
  (`Stone Age to Iron Age`) is distinct from the taught strand (`Ancient Rome`), so there's no
  strand-level ambiguity, but a parent skimming quickly could still read two roughly-equal-looking
  History bullets as "both being studied." I left it, on the basis that the alternative — describing
  the KS2 History programme without ever mentioning the Stone Age, which genuinely opens KS2 history
  and is on every parent's radar — is a worse omission than a compact section listing a taught line
  plus one clearly-labelled adjacent gap.
- **`Y3:Maths`'s three untaught NC gaps** (addition/subtraction to 3 digits, 3/4/8 tables, tenths) —
  each is real and each is its own distinct Y3 NC bullet, so I kept all three per rule 1 rather than
  trimming for brevity. If the intent is "objectives lists should stay short," this section (4 rows,
  1 taught) is the longest ratio of gap-to-taught in the file and would be the first candidate to
  prune — I left it as-is because none of the four collides with another year or is inaccurate.
- **Whether "coverage gap" rows should be visually distinguished from "taught" rows in the UI** — out
  of scope for this fix (screens are frozen for me), but the underlying design gap remains: nothing
  in `Objective`, `SubjectCoverage`, or the screen that renders it currently tells a parent *which*
  objectives in a list are backed by a real set versus genuinely aspirational. My rule assumes "at
  least one taught objective present" is enough to keep a list honest, but a parent still can't tell
  the taught one from the three gap ones without cross-referencing the set list themselves. Flagging
  for whoever owns the screen/data-model side of this: a `taught: boolean` (or equivalent, derived
  the same way `derivedObjectives` already derives strand from a set) would remove the ambiguity
  entirely rather than relying on curators to keep applying this rule by hand.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `node scripts/check-strands.mjs` — `27 sets checked, 10 subjects, 0 unmatched.` (unaffected by this
  change — it checks `study.ts` sets against `subjects.ts`, not this file's objectives; run to confirm
  I hadn't broken anything upstream).
- Ad hoc script cross-checking every `Objective.strand` in `curriculum.ts` against the real strand
  list per subject in `subjects.ts`: **58 objective rows checked, 0 bad strand refs.**
- Confirmed no duplicate `${yearCode}:${subject}` keys remain (21 keys, was 23 before removing the
  two dead English entries).
