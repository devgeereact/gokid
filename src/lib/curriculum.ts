import { STUDY_SETS, strandOf, type StudySet } from "./study"
import { getSubject, type Subject, subjectSlug } from "./subjects"

/**
 * Curriculum Browser data (design/gokid-screens.md §5 "Study Sets → Curriculum Browser", and the
 * spine of §21 "Curriculum Explorer" — Reception → Year 6, Curriculum Objectives, Learning
 * Outcomes, National Curriculum Browser).
 *
 * Coverage is *derived* from the demo shelf in ./study rather than hand-written, so the browser can
 * never disagree with the sets it links to. Objectives are curated UK National Curriculum
 * statements — see OBJECTIVES. When the Neon/Drizzle content API lands (AGENTS.md) this module is
 * the seam: the screen calls `curriculumForYear`, never the data.
 */

export type YearGroup = {
  /** Matches `StudySet.yearCode` and `Child.yearGroup`. */
  code: string
  /** Full display label — "Reception", "Year 3". */
  label: string
  /** Segmented-control label. The design system's segmented control (09. INPUTS) draws exactly
   *  these seven: Rec · Y1 · Y2 · Y3 · Y4 · Y5 · Y6. */
  short: string
  /** UK key stage the year sits in — the capsule beside the year name. */
  keyStage: string
  /** One line on what the year is about, for the summary card. */
  blurb: string
}

export const YEAR_GROUPS: YearGroup[] = [
  {
    code: "Rec",
    label: "Reception",
    short: "Rec",
    keyStage: "EYFS",
    blurb: "Counting, letter sounds and the world around us — learning through play.",
  },
  {
    code: "Y1",
    label: "Year 1",
    short: "Y1",
    keyStage: "Key Stage 1",
    blurb: "Numbers to 100, phonics, and asking questions about living things.",
  },
  {
    code: "Y2",
    label: "Year 2",
    short: "Y2",
    keyStage: "Key Stage 1",
    blurb: "Times tables, fluent reading, and materials and their uses.",
  },
  {
    code: "Y3",
    label: "Year 3",
    short: "Y3",
    keyStage: "Lower Key Stage 2",
    blurb: "Place value to 1,000, joined writing, and the Stone Age to the Romans.",
  },
  {
    code: "Y4",
    label: "Year 4",
    short: "Y4",
    keyStage: "Lower Key Stage 2",
    blurb: "Tables to 12, fractions and decimals, and states of matter.",
  },
  {
    code: "Y5",
    label: "Year 5",
    short: "Y5",
    keyStage: "Upper Key Stage 2",
    blurb: "Long multiplication, prime numbers, forces, and Earth and space.",
  },
  {
    code: "Y6",
    label: "Year 6",
    short: "Y6",
    keyStage: "Upper Key Stage 2",
    blurb: "Algebra, ratio, evolution and inheritance — and getting ready for SATs.",
  },
]

export function getYearGroup(code: string | undefined): YearGroup | undefined {
  return YEAR_GROUPS.find((y) => y.code === code)
}

/** One National Curriculum objective — a row in a subject's "Objectives" list. */
export type Objective = {
  /** The statement, phrased as the curriculum phrases it ("Count to and across 100…"). */
  text: string
  /** The programme-of-study strand it belongs to — matches `Strand.name` on ./subjects. */
  strand: string
}

/**
 * Curated objectives, keyed `${yearCode}:${subject}`. Wording follows the UK National Curriculum
 * programmes of study for EYFS/KS1/KS2 so a row is the same shape of thing a real curriculum row
 * will be — the same reasoning ./subjects applies to its strand names.
 *
 * Only the year/subject pairs the demo shelf actually has sets for are curated; anything else falls
 * back to `derivedObjectives` below, so the browser has no dead sections. Two keys used to break this
 * invariant — `Y3:English` and `Y5:English` — describing objectives for subjects that have NO set in
 * that year anywhere in ./study. `objectivesFor` is only ever called for a year's actual subject
 * list, so those rows could never be looked up; they were pure dead weight, not even wrong content a
 * parent could see. Removed rather than fixed, since Year 3 and Year 5 genuinely have no English set
 * yet — that's a real content gap for ./study to close, not something this file can paper over.
 *
 * KEEP-VS-REMOVE RULE for an objective describing content no set in its year/subject actually teaches
 * (audited 2026-08-14, docs/qa/2026-08-14/workers/content-y3-y6.md §3 and content-rec-y2.md; fixed
 * 2026-08-15, docs/qa/2026-08-15/workers/fix-curriculum.md):
 *
 *   KEEP as honest coverage information when (a) it is genuine UK National Curriculum content for
 *   that year group, AND (b) at least one OTHER objective in the same list is actually taught by a
 *   real set, so the taught content is never crowded out. The `/curriculum` coverage ring is computed
 *   from real card-progress (`cardPct`), never from this list, so an untaught objective sitting here
 *   does not inflate it — it only tells a parent "this is on the curriculum, GoKid has no set for it
 *   yet", which is true and useful, exactly the way §21's "42% coverage" ring is meant to read.
 *
 *   FIX when:
 *     (a) NONE of a list's objectives match what the year's set(s) actually teach — the taught
 *         content is then invisible and the whole list misleads (this was Y3 Geography and Y3
 *         Science; more mildly, Rec/Y1/Y2 Science and Y2 English below had the same shape — none of
 *         their objectives named what the one set in that section actually covers). Fixed by writing
 *         an objective for what the real set teaches, in the strand that set itself carries.
 *     (b) an objective is verbatim another year's actual set topic — not a plausible unbuilt gap but
 *         a direct collision with real authored content elsewhere in this file, contradicting that
 *         other year's row (Y3 Geography's "rivers and mountains" was, word for word, the Y5
 *         Geography set's own topic).
 *     (c) the objective's `strand` does not match the strand the taught set itself carries, so a
 *         genuinely-taught objective silently fails to register as "met" for the right strand (Y6
 *         Maths tagged its taught ratio-and-proportion line "Multiplication and division"; Y6 Science
 *         tagged both its evolution lines "Animals, including humans" / "Plants" instead of the new
 *         "Evolution and inheritance" strand).
 */
const OBJECTIVES: Record<string, Objective[]> = {
  "Rec:Maths": [
    { text: "Count objects, actions and sounds reliably to 10", strand: "Number and place value" },
    { text: "Subitise small quantities, recognising up to 5 without counting", strand: "Number and place value" },
    { text: "Compare quantities using more than, less than and the same", strand: "Number and place value" },
  ],
  "Rec:English": [
    { text: "Say a sound for each letter of the alphabet", strand: "Phonics" },
    { text: "Blend sounds into words to read short sentences", strand: "Reading" },
    { text: "Write recognisable letters, most correctly formed", strand: "Writing" },
  ],
  // Both retagged to the strand the actual set (Plants and animals) carries — neither objective
  // named a moment ago mentioned habitats at all, so the taught content was invisible. See rule (a).
  "Rec:Science": [
    { text: "Explore the natural world around them, making observations of plants and animals", strand: "Living things and their habitats" },
    { text: "Understand what a plant needs to grow, and name its basic parts", strand: "Plants" },
  ],
  "Y1:Maths": [
    { text: "Count to and across 100, forwards and backwards", strand: "Number and place value" },
    { text: "Read and write numbers to 100 in numerals", strand: "Number and place value" },
    { text: "Add and subtract one-digit and two-digit numbers to 20", strand: "Addition and subtraction" },
  ],
  "Y1:English": [
    { text: "Apply phonic knowledge to decode words", strand: "Phonics" },
    { text: "Read common exception words on sight", strand: "Reading" },
    { text: "Leave spaces between words when writing", strand: "Writing" },
  ],
  // The actual Y1 Science set is Seasons and Weather — neither of the two original objectives (both
  // Plants / Animals) named seasons at all. Added the taught line first; the other two are honest
  // gaps (real Y1 NC, no set yet) rather than a second and third way of not mentioning what's taught.
  "Y1:Science": [
    { text: "Observe changes across the four seasons, and describe the weather associated with each", strand: "Seasonal changes" },
    { text: "Identify and name a variety of common wild and garden plants", strand: "Plants" },
    { text: "Identify and name a variety of common animals, including fish, amphibians, reptiles, birds and mammals", strand: "Animals, including humans" },
  ],
  "Y2:Maths": [
    { text: "Recall the 2, 5 and 10 multiplication tables", strand: "Multiplication and division" },
    { text: "Recognise the place value of each digit in a two-digit number", strand: "Number and place value" },
    { text: "Recognise, find, name and write 1/3, 1/4, 2/4 and 3/4", strand: "Fractions" },
  ],
  // The actual set is Nouns, Verbs and Adjectives; neither original objective named a word class, so
  // the taught content wasn't represented at all. Added it first (real Y2 NC — nouns, adjectives and
  // verbs are the Year 2 grammar terminology, and expanded noun phrases are a Year 2 statutory line).
  "Y2:English": [
    { text: "Identify nouns, verbs and adjectives, and use expanded noun phrases to describe and specify", strand: "Grammar and punctuation" },
    { text: "Use capital letters, full stops, question marks and exclamation marks to demarcate sentences", strand: "Grammar and punctuation" },
    { text: "Read accurately words of two or more syllables", strand: "Reading" },
  ],
  // The actual set is Living Things and Their Habitats — neither original objective (Materials /
  // Animals-needs) named a habitat. Added the taught line first, in the strand the set itself uses.
  "Y2:Science": [
    { text: "Identify that most living things live in habitats suited to them, and describe how habitats meet their basic needs", strand: "Living things and their habitats" },
    { text: "Find out about and describe the basic needs of animals, including humans, for survival", strand: "Animals, including humans" },
    { text: "Identify and compare the suitability of everyday materials for particular uses", strand: "Materials" },
  ],
  "Y3:Maths": [
    { text: "Recognise the place value of each digit in a three-digit number", strand: "Number and place value" },
    { text: "Add and subtract numbers with up to three digits", strand: "Addition and subtraction" },
    { text: "Recall the 3, 4 and 8 multiplication tables", strand: "Multiplication and division" },
    { text: "Count up and down in tenths", strand: "Fractions" },
  ],
  // Y3:English removed — no Year 3 English set exists in ./study, so this key could never be looked
  // up by `objectivesFor` (it only ever queries a year's actual subject list). See the file note above.
  //
  // The only Y3 Science set is The Human Skeleton, and none of the three original objectives
  // (Plants / nutrition / Forces) mentioned a skeleton — the one thing actually taught was the one
  // thing absent from the list. Added the skeleton line first, real Y3 NC wording, same strand the
  // set itself carries ("Animals, including humans"). The other three are honest KS2 Y3 Science
  // coverage gaps — real, no set yet, and each its own distinct NC bullet rather than restating
  // the taught line under a different wrapper.
  "Y3:Science": [
    { text: "Identify that humans and some animals have skeletons and muscles for support, protection and movement", strand: "Animals, including humans" },
    { text: "Identify that animals, including humans, need the right types and amount of nutrition and cannot make their own food", strand: "Animals, including humans" },
    { text: "Identify and describe the functions of different parts of flowering plants, including roots, stem, leaves and flowers", strand: "Plants" },
    { text: "Compare how things move on different surfaces, and notice that some forces need contact between two objects", strand: "Forces and magnets" },
  ],
  "Y3:History": [
    // "Stone Age to Iron Age" is real KS2 content with no set anywhere in the demo shelf — kept as an
    // honest gap because the OTHER objective in this list (Roman impact) IS what the one Y3 History
    // set actually teaches, so the taught content is still represented. See rule (a) vs the keep case.
    { text: "Describe changes from the Stone Age to the Iron Age", strand: "Stone Age to Iron Age" },
    { text: "Explain the Roman impact on Britain", strand: "Ancient Rome" },
  ],
  // Both original objectives were wrong for the actual set (Capital Cities of Europe): "UK counties"
  // matches nothing it teaches, and "rivers and mountains" is — verbatim — the Year 5 Geography set's
  // own topic, so it also mislabelled a different year's real content as Year 3's. See rule (b).
  // Replaced with the objective the set actually teaches, plus one distinct, non-colliding KS2 gap.
  "Y3:Geography": [
    { text: "Locate the world's countries, with a focus on Europe, and name and locate their capital cities", strand: "Locational knowledge" },
    { text: "Understand geographical similarities and differences through studying human geography, including types of settlement and land use", strand: "Human geography" },
  ],
  "Y4:Maths": [
    { text: "Recall multiplication facts up to 12 × 12", strand: "Multiplication and division" },
    { text: "Round any number to the nearest 10, 100 or 1,000", strand: "Number and place value" },
    { text: "Recognise and write decimal equivalents of tenths and hundredths", strand: "Fractions" },
  ],
  "Y4:English": [
    { text: "Use fronted adverbials with a comma", strand: "Grammar and punctuation" },
    { text: "Spell homophones correctly", strand: "Spelling" },
  ],
  "Y4:Science": [
    { text: "Compare and group materials as solids, liquids or gases", strand: "Materials" },
    { text: "Identify how sounds are made, associating some of them with something vibrating", strand: "Light and sound" },
  ],
  // Item 3 tightened to the actual NC Y5 fractions line the set exercises (adding/subtracting with the
  // same or a related denominator) rather than "compare and order", which the set doesn't quiz.
  "Y5:Maths": [
    { text: "Multiply numbers up to four digits by a two-digit number", strand: "Multiplication and division" },
    { text: "Identify prime numbers, prime factors and composite numbers", strand: "Multiplication and division" },
    { text: "Add and subtract fractions with the same denominator, and denominators that are multiples of the same number", strand: "Fractions" },
  ],
  // Y5:English removed — no Year 5 English set exists in ./study; same dead-key reasoning as Y3:English.
  "Y5:Science": [
    { text: "Describe the movement of the Earth and other planets", strand: "Earth and space" },
    { text: "Identify the effects of gravity, friction and air resistance", strand: "Forces and magnets" },
  ],
  // Objective 1 was tagged "Number and place value" (it is Algebra, a strand subjects.ts added
  // 15 Aug) and objective 2 — the one that actually IS the taught set — was tagged "Multiplication
  // and division" instead of "Ratio and proportion", so the one taught objective in the whole section
  // failed to register under its own set's strand. Both retagged; text unchanged, both already accurate.
  "Y6:Maths": [
    { text: "Use simple formulae and express missing numbers algebraically", strand: "Algebra" },
    { text: "Solve problems involving ratio and proportion", strand: "Ratio and proportion" },
    { text: "Calculate the area of parallelograms and triangles", strand: "Geometry" },
  ],
  // The actual set (Clauses and Punctuation) is mostly about main/subordinate/relative clauses, which
  // neither original objective named — "passive voice and the subjunctive" and "semicolons, colons
  // and dashes" are both real but neither is the set's main content. Added the clauses line the set
  // actually teaches first; split "passive voice" from "the subjunctive form" into its own accurate
  // NC bullet (they are two separate statutory lines, not one) and kept it as an honest Y6 gap.
  "Y6:English": [
    { text: "Use subordinate and relative clauses, choosing an appropriate relative pronoun or omitting it", strand: "Grammar and punctuation" },
    { text: "Use a semi-colon, colon or dash to mark the boundary between independent clauses", strand: "Grammar and punctuation" },
    { text: "Use the passive voice to affect the presentation of information in a sentence", strand: "Grammar and punctuation" },
  ],
  // Both objectives ARE what the set (Evolution and Inheritance) teaches, but were tagged "Animals,
  // including humans" / "Plants" — strands that exist but aren't this set's. Retagged to "Evolution
  // and inheritance", the strand subjects.ts added 15 Aug specifically because this set had nowhere
  // to land; text unchanged, both already accurate to the real Y6 NC wording.
  "Y6:Science": [
    { text: "Recognise that living things have changed over time and that fossils provide evidence for evolution", strand: "Evolution and inheritance" },
    { text: "Identify how animals and plants are adapted to suit their environment in different ways, and that adaptation may lead to evolution", strand: "Evolution and inheritance" },
  ],
}

/**
 * Fallback for a year/subject the table above doesn't cover: each set in the section stands in for
 * one objective, phrased from its topic. Keeps a section honest (it can only claim what the shelf
 * teaches) instead of showing an empty objectives list.
 */
function derivedObjectives(sets: StudySet[]): Objective[] {
  const seen = new Set<string>()
  const out: Objective[] = []
  for (const set of sets) {
    if (seen.has(set.topic)) continue
    seen.add(set.topic)
    // `strand` must be the strand NAME (subjects.ts) so the row groups correctly; the text
    // stays phrased from the specific topic, which is what a parent recognises.
    out.push({ text: `Understand ${set.topic.toLowerCase()}`, strand: strandOf(set) })
  }
  return out
}

export function objectivesFor(yearCode: string, subject: string, sets: StudySet[]): Objective[] {
  return OBJECTIVES[`${yearCode}:${subject}`] ?? derivedObjectives(sets)
}

/** One subject's section in a year — the browser's accordion row, expanded to objectives + sets. */
export type SubjectCoverage = {
  subject: Subject
  /** The year's sets for this subject, in shelf order. */
  sets: StudySet[]
  /** Sets the child has finished (every card reviewed), of `sets.length`. */
  done: number
  /** Cards reviewed across the section, of `cardsTotal` — the bar and the percentage. */
  pct: number
  objectives: Objective[]
  /** Objectives counted as met — see `metCount`. */
  met: number
}

/**
 * Objectives met. The demo shelf tracks progress per *card*, not per objective, so this is
 * INFERRED: a section that is `pct` complete has met that share of its objectives, front-loaded.
 * Real per-objective mastery arrives with the progress API (AGENTS.md).
 */
function metCount(pct: number, total: number): number {
  return Math.round((pct / 100) * total)
}

/** Cards reviewed across a group of sets, as a percentage of the cards those sets hold. */
function cardPct(sets: StudySet[]): number {
  const total = sets.reduce((sum, s) => sum + s.cardsTotal, 0)
  if (total === 0) return 0
  const done = sets.reduce((sum, s) => sum + s.cardsDone, 0)
  return Math.round((done / total) * 100)
}

/**
 * Every subject taught in a year, with its sets, coverage and objectives. Ordered by the subject
 * order on ./subjects (Maths, English, Science, …) so the browser reads the same way every year.
 */
export function curriculumForYear(yearCode: string): SubjectCoverage[] {
  const yearSets = STUDY_SETS.filter((s) => s.yearCode === yearCode)
  const names = [...new Set(yearSets.map((s) => s.subject))]

  const rows: SubjectCoverage[] = []
  for (const name of names) {
    const subject = getSubject(subjectSlug(name))
    // A set whose subject has no hub on ./subjects has nowhere to link and no wash to draw — skip
    // rather than render a colourless row.
    if (!subject) continue
    const sets = yearSets.filter((s) => s.subject === name)
    const pct = cardPct(sets)
    const objectives = objectivesFor(yearCode, name, sets)
    rows.push({
      subject,
      sets,
      done: sets.filter((s) => s.cardsDone >= s.cardsTotal).length,
      pct,
      objectives,
      met: metCount(pct, objectives.length),
    })
  }
  return rows.sort((a, b) => SUBJECT_ORDER.indexOf(a.subject.slug) - SUBJECT_ORDER.indexOf(b.subject.slug))
}

const SUBJECT_ORDER = ["maths", "english", "science", "geography", "history", "computing", "art", "music", "languages", "re"]

/** The year's overall coverage — the summary card's ring. Cards reviewed across every subject. */
export function yearCoverage(rows: SubjectCoverage[]): number {
  return cardPct(rows.flatMap((r) => r.sets))
}

/** Objectives met / total across the year — the summary card's pill. */
export function yearObjectives(rows: SubjectCoverage[]): { met: number; total: number } {
  return {
    met: rows.reduce((sum, r) => sum + r.met, 0),
    total: reduceTotal(rows),
  }
}

function reduceTotal(rows: SubjectCoverage[]): number {
  return rows.reduce((sum, r) => sum + r.objectives.length, 0)
}

/**
 * The school term for a date — the capsule beside the year name ("Year 3 · Autumn term" is the
 * design system's own example, 06. CHIPS / BADGES). English school year: Autumn Sep–Dec, Spring
 * Jan–Mar, Summer Apr–Aug (the summer holiday reads as the term just finished, which is the term
 * whose work a parent would still be looking at).
 */
export function currentTerm(date: Date = new Date()): string {
  const month = date.getMonth()
  if (month >= 8) return "Autumn term"
  if (month <= 2) return "Spring term"
  return "Summer term"
}
