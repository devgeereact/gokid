import type { SFSymbol } from "expo-symbols"

import { colors } from "@/design/tokens"

import { STUDY_SETS, type StudySet } from "./study"

/**
 * Subject Hub content (design/gokid-screens.md §4 — "Each subject deserves its own landing page …
 * curriculum strands · progress · recommended sets · illustrations"). Ten subjects, one hub each.
 *
 * Demo data, like ./study: the strand percentages and set counts stand in for the Neon/Drizzle
 * progress API (AGENTS.md). Screens import `getSubject` / `recommendedSets`, never the arrays, so
 * this module is the single seam to swap when the API lands.
 *
 * Strand names follow the UK National Curriculum programmes of study for KS1/KS2, so a strand is
 * the same shape of thing a real curriculum row will be.
 */

/** One curriculum strand — a row in the hub's "Curriculum strands" card. */
export type Strand = {
  name: string
  icon: SFSymbol
}

export type Subject = {
  /** Route param — `/subject/maths`. */
  slug: string
  /** Display name. Matches `StudySet.subject` for the subjects that have sets. */
  name: string
  /** Name for the dashboard tile, where the label is one line under a 48pt disc. Only differs
   *  where the full name cannot fit — "Religious Education" is "RE" on the tile, as schools write it. */
  short: string
  blurb: string
  /** Pale card wash — `colors.subject[slug]`, as a Tailwind class. */
  wash: string
  /** Saturated accent — `colors["subject-ink"][slug]`. Passed to native props (SymbolView tint). */
  ink: string
  /** Hub illustration. Absent for the subjects the repo has no art for — `symbol` covers those. */
  art?: number
  /** Fallback glyph, and the strand-card header icon. */
  symbol: SFSymbol
  strands: Strand[]
  /** One-line AI-ish nudge for the hub's focus card. `{child}` is replaced with the child's name. */
  focus: string
}

// Reuses ./study's art registry idea: illustration slots are keys, resolved to `require`d numbers
// once. The repo has seven usable subject illustrations for ten subjects — Music and Religious
// Education fall back to their SF Symbol (see `symbol`), and Computing borrows the cube stack.
const ART = {
  maths: require("../../assets/images/gokid-prog-maths.png"),
  english: require("../../assets/images/gokid-prog-english.png"),
  science: require("../../assets/images/gokid-prog-science.png"),
  geography: require("../../assets/images/gokid-prog-geography.png"),
  history: require("../../assets/images/gokid-prog-scales.png"),
  computing: require("../../assets/images/gokid-cube-stack.png"),
  art: require("../../assets/images/gokid-subject-mountain.png"),
  languages: require("../../assets/images/gokid-subject-globe.png"),
} as const

export const SUBJECTS: Subject[] = [
  {
    slug: "maths",
    name: "Maths",
    short: "Maths",
    blurb: "Number and place value, addition, subtraction, multiplication, division and more.",
    wash: "bg-subject-maths",
    ink: colors["subject-ink"].maths,
    art: ART.maths,
    symbol: "number",
    focus: "{child} could use more practice with Geometry and Measurement to build confidence.",
    strands: [
      { name: "Number and place value", icon: "number" },
      { name: "Addition and subtraction", icon: "plus.forwardslash.minus" },
      { name: "Multiplication and division", icon: "multiply" },
      { name: "Fractions", icon: "chart.pie.fill" },
      { name: "Measurement", icon: "ruler.fill" },
      { name: "Geometry", icon: "triangle.fill" },
    ],
  },
  {
    slug: "english",
    name: "English",
    short: "English",
    blurb: "Reading, writing, spelling, grammar, punctuation and speaking with confidence.",
    wash: "bg-subject-english",
    ink: colors["subject-ink"].english,
    art: ART.english,
    symbol: "text.book.closed.fill",
    focus: "{child} is flying through reading — a few more spelling sets would round it out.",
    strands: [
      { name: "Reading", icon: "book.fill" },
      { name: "Phonics", icon: "textformat.abc" },
      { name: "Writing", icon: "pencil.and.outline" },
      { name: "Grammar and punctuation", icon: "text.quote" },
      { name: "Spelling", icon: "character.cursor.ibeam" },
    ],
  },
  {
    slug: "science",
    name: "Science",
    short: "Science",
    blurb: "Living things, materials, forces, light, sound and working scientifically.",
    wash: "bg-subject-science",
    ink: colors["subject-ink"].science,
    art: ART.science,
    symbol: "leaf.fill",
    focus: "{child} knows the human body well — forces and magnets are the next gap to close.",
    strands: [
      { name: "Plants", icon: "leaf.fill" },
      { name: "Animals and humans", icon: "figure.walk" },
      { name: "Materials", icon: "cube.fill" },
      { name: "Forces and magnets", icon: "bolt.fill" },
      { name: "Light and sound", icon: "lightbulb.fill" },
      { name: "Earth and space", icon: "globe.europe.africa.fill" },
    ],
  },
  {
    slug: "geography",
    name: "Geography",
    short: "Geography",
    blurb: "Places, maps, rivers, mountains, climate and the world beyond the classroom.",
    wash: "bg-subject-geography",
    ink: colors["subject-ink"].geography,
    art: ART.geography,
    symbol: "globe.europe.africa.fill",
    focus: "{child} has European capitals down — physical geography needs another pass.",
    strands: [
      { name: "Locational knowledge", icon: "mappin.and.ellipse" },
      { name: "Place knowledge", icon: "map.fill" },
      { name: "Physical geography", icon: "mountain.2.fill" },
      { name: "Human geography", icon: "building.2.fill" },
      { name: "Maps and fieldwork", icon: "location.north.line.fill" },
    ],
  },
  {
    slug: "history",
    name: "History",
    short: "History",
    blurb: "The Romans, the Stone Age, ancient civilisations and how we know what happened.",
    wash: "bg-subject-history",
    ink: colors["subject-ink"].history,
    art: ART.history,
    symbol: "scroll.fill",
    focus: "{child} enjoys the Romans — chronology across periods is worth revisiting.",
    strands: [
      { name: "Chronology", icon: "clock.fill" },
      { name: "Stone Age to Iron Age", icon: "hammer.fill" },
      { name: "Ancient Rome", icon: "building.columns.fill" },
      { name: "Ancient civilisations", icon: "pyramid.fill" },
      { name: "Historical enquiry", icon: "magnifyingglass" },
    ],
  },
  {
    slug: "computing",
    name: "Computing",
    short: "Computing",
    blurb: "Algorithms, programming, debugging and staying safe online.",
    wash: "bg-subject-computing",
    ink: colors["subject-ink"].computing,
    art: ART.computing,
    symbol: "chevron.left.forwardslash.chevron.right",
    focus: "{child} sequences algorithms well — debugging is the strand to push next.",
    strands: [
      { name: "Algorithms", icon: "list.number" },
      { name: "Programming", icon: "chevron.left.forwardslash.chevron.right" },
      { name: "Debugging", icon: "ant.fill" },
      { name: "Data", icon: "chart.bar.fill" },
      { name: "Online safety", icon: "lock.shield.fill" },
    ],
  },
  {
    slug: "art",
    name: "Art",
    short: "Art",
    blurb: "Drawing, painting, colour, sculpture and the artists behind the work.",
    wash: "bg-subject-art",
    ink: colors["subject-ink"].art,
    art: ART.art,
    symbol: "paintpalette.fill",
    focus: "{child} mixes colour confidently — try a set on famous artists next.",
    strands: [
      { name: "Drawing", icon: "pencil.tip" },
      { name: "Painting", icon: "paintbrush.fill" },
      { name: "Sculpture", icon: "cube.transparent.fill" },
      { name: "Great artists", icon: "photo.artframe" },
    ],
  },
  {
    slug: "music",
    name: "Music",
    short: "Music",
    blurb: "Pulse, rhythm, pitch, notation and listening to music from around the world.",
    wash: "bg-subject-music",
    ink: colors["subject-ink"].music,
    symbol: "music.note",
    focus: "{child} keeps a steady pulse — reading notation is the next step.",
    strands: [
      { name: "Pulse and rhythm", icon: "metronome.fill" },
      { name: "Pitch and melody", icon: "music.note" },
      { name: "Notation", icon: "music.note.list" },
      { name: "Listening", icon: "ear.fill" },
    ],
  },
  {
    slug: "languages",
    name: "Languages",
    short: "Languages",
    blurb: "French greetings, numbers, colours and everyday phrases you can use today.",
    wash: "bg-subject-languages",
    ink: colors["subject-ink"].languages,
    art: ART.languages,
    symbol: "character.bubble.fill",
    focus: "{child} greets well in French — numbers past twenty need another look.",
    strands: [
      { name: "Greetings", icon: "hand.wave.fill" },
      { name: "Numbers and colours", icon: "paintpalette.fill" },
      { name: "Everyday phrases", icon: "character.bubble.fill" },
      { name: "Listening and speaking", icon: "waveform" },
    ],
  },
  {
    slug: "re",
    name: "Religious Education",
    short: "RE",
    blurb: "Beliefs, festivals, places of worship and the big questions people ask.",
    wash: "bg-subject-re",
    ink: colors["subject-ink"].re,
    symbol: "hands.sparkles.fill",
    focus: "{child} knows the major festivals — places of worship would build on that.",
    strands: [
      { name: "Beliefs and teachings", icon: "book.closed.fill" },
      { name: "Festivals", icon: "sparkles" },
      { name: "Places of worship", icon: "building.columns.fill" },
      { name: "Big questions", icon: "questionmark.circle.fill" },
    ],
  },
]

export function getSubject(slug: string | undefined): Subject | undefined {
  return SUBJECTS.find((s) => s.slug === slug)
}

/** Slug for a `StudySet.subject` name — the hub link from a set row / search chip. */
export function subjectSlug(name: string): string | undefined {
  return SUBJECTS.find((s) => s.name === name)?.slug
}

/** Sets finished across the subject — the hub's "N sets completed" pill. */
export function subjectSetCount(subject: Subject): number {
  return STUDY_SETS.filter((s) => s.subject === subject.name).length
}

/**
 * The hub's "Recommended sets". The child's own year group first (their curriculum is the point),
 * then the rest of the subject's shelf so a hub is never empty when other years have content.
 */
export function recommendedSets(subject: Subject, yearCode: string | undefined): StudySet[] {
  const mine = STUDY_SETS.filter((s) => s.subject === subject.name)
  if (!yearCode) return mine
  return [...mine].sort((a, b) => Number(b.yearCode === yearCode) - Number(a.yearCode === yearCode))
}
