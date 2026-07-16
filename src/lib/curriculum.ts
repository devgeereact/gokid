import { STUDY_SETS, type StudySet } from "./study"
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
 * back to `derivedObjectives` below, so the browser has no dead sections.
 */
const OBJECTIVES: Record<string, Objective[]> = {
  "Rec:Maths": [
    { text: "Count objects, actions and sounds reliably to 10", strand: "Number and place value" },
    { text: "Subitise small quantities without counting", strand: "Number and place value" },
    { text: "Compare quantities using more than, less than and the same", strand: "Number and place value" },
  ],
  "Rec:English": [
    { text: "Say a sound for each letter of the alphabet", strand: "Phonics" },
    { text: "Blend sounds into words to read short sentences", strand: "Reading" },
    { text: "Write recognisable letters, most correctly formed", strand: "Writing" },
  ],
  "Rec:Science": [
    { text: "Explore the natural world around them", strand: "Plants" },
    { text: "Describe what they see, hear and feel outside", strand: "Animals and humans" },
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
  "Y1:Science": [
    { text: "Identify and name a variety of common plants", strand: "Plants" },
    { text: "Identify and name common animals and their diets", strand: "Animals and humans" },
  ],
  "Y2:Maths": [
    { text: "Recall the 2, 5 and 10 multiplication tables", strand: "Multiplication and division" },
    { text: "Recognise the place value of each digit in a two-digit number", strand: "Number and place value" },
    { text: "Recognise, find, name and write 1/3, 1/4, 2/4 and 3/4", strand: "Fractions" },
  ],
  "Y2:English": [
    { text: "Read accurately words of two or more syllables", strand: "Reading" },
    { text: "Use capital letters, full stops and question marks", strand: "Grammar and punctuation" },
  ],
  "Y2:Science": [
    { text: "Identify and compare everyday materials and their uses", strand: "Materials" },
    { text: "Describe what animals need to survive", strand: "Animals and humans" },
  ],
  "Y3:Maths": [
    { text: "Recognise the place value of each digit in a three-digit number", strand: "Number and place value" },
    { text: "Add and subtract numbers with up to three digits", strand: "Addition and subtraction" },
    { text: "Recall the 3, 4 and 8 multiplication tables", strand: "Multiplication and division" },
    { text: "Count up and down in tenths", strand: "Fractions" },
  ],
  "Y3:English": [
    { text: "Use prefixes and suffixes to understand new words", strand: "Spelling" },
    { text: "Draft and write with an increasing range of sentences", strand: "Writing" },
    { text: "Use conjunctions to express time and cause", strand: "Grammar and punctuation" },
  ],
  "Y3:Science": [
    { text: "Identify the functions of parts of a flowering plant", strand: "Plants" },
    { text: "Identify that humans and animals need the right nutrition", strand: "Animals and humans" },
    { text: "Compare how things move on different surfaces", strand: "Forces and magnets" },
  ],
  "Y3:History": [
    { text: "Describe changes from the Stone Age to the Iron Age", strand: "Stone Age to Iron Age" },
    { text: "Explain the Roman impact on Britain", strand: "Ancient Rome" },
  ],
  "Y3:Geography": [
    { text: "Name and locate counties and cities of the United Kingdom", strand: "Locational knowledge" },
    { text: "Describe and understand rivers and mountains", strand: "Physical geography" },
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
    { text: "Identify how sounds are made and travel", strand: "Light and sound" },
  ],
  "Y5:Maths": [
    { text: "Multiply numbers up to four digits by a two-digit number", strand: "Multiplication and division" },
    { text: "Identify prime numbers, factors and multiples", strand: "Multiplication and division" },
    { text: "Compare and order fractions whose denominators are multiples", strand: "Fractions" },
  ],
  "Y5:English": [
    { text: "Use relative clauses to add detail", strand: "Grammar and punctuation" },
    { text: "Summarise the main ideas drawn from more than one paragraph", strand: "Reading" },
  ],
  "Y5:Science": [
    { text: "Describe the movement of the Earth and other planets", strand: "Earth and space" },
    { text: "Identify the effects of gravity, friction and air resistance", strand: "Forces and magnets" },
  ],
  "Y6:Maths": [
    { text: "Use simple formulae and express missing numbers algebraically", strand: "Number and place value" },
    { text: "Solve problems involving ratio and proportion", strand: "Multiplication and division" },
    { text: "Calculate the area of parallelograms and triangles", strand: "Geometry" },
  ],
  "Y6:English": [
    { text: "Use the passive voice and the subjunctive form", strand: "Grammar and punctuation" },
    { text: "Use semicolons, colons and dashes to mark clauses", strand: "Grammar and punctuation" },
  ],
  "Y6:Science": [
    { text: "Recognise that living things have changed over time", strand: "Animals and humans" },
    { text: "Identify how animals and plants are adapted to their environment", strand: "Plants" },
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
    out.push({ text: `Understand ${set.topic.toLowerCase()}`, strand: set.topic })
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
