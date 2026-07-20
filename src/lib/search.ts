import { useSyncExternalStore } from "react"

import { curriculumForYear } from "./curriculum"
import { STUDY_SETS, type StudySet } from "./study"

/**
 * Search index + recent-search history for the Search Sets screen (design/gokid-screens.md §3,
 * "Home Experience → Search Sets"). No mockup was drawn for it; the surface is inferred from the
 * text input, subject chips and set-card rows in design/GoKid-design-system.png.
 *
 * Backed by the demo shelf in ./study for now. When the content API lands (AGENTS.md — Neon +
 * Drizzle behind a route handler) this module is the seam: screens call `searchSets`, never the data.
 */

/** Tailwind tint class per subject — the five swatches in the design system's "Subject tints" block. */
const SUBJECT_TINT: Record<string, string> = {
  Maths: "bg-subject-maths",
  English: "bg-subject-english",
  Science: "bg-subject-science",
  Geography: "bg-subject-geography",
  History: "bg-subject-history",
}

/**
 * Subject filter chips — only subjects the shelf actually has (History has a tint in the design
 * system but no sets yet, so no dead chip), ordered as the design system's tint block orders them.
 * A subject the design system never tinted sorts to the end alphabetically.
 */
const TINT_ORDER = Object.keys(SUBJECT_TINT)

export const SUBJECTS: string[] = [...new Set(STUDY_SETS.map((s) => s.subject))].sort((a, b) => {
  const ai = TINT_ORDER.indexOf(a)
  const bi = TINT_ORDER.indexOf(b)
  if (ai === -1 && bi === -1) return a.localeCompare(b)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
})

/** Falls back to the neutral stat-tile fill for a subject the design system never assigned a tint. */
export function subjectTint(subject: string): string {
  return SUBJECT_TINT[subject] ?? "bg-gamify-tile"
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Free-text search across title, subject, topic and year group, optionally narrowed to one subject.
 * Every term must hit somewhere in the set, so "year 3 maths" narrows rather than widens.
 */
export function searchSets(query: string, subject: string | null): StudySet[] {
  const terms = norm(query).split(/\s+/).filter(Boolean)
  return STUDY_SETS.filter((set) => {
    if (subject && set.subject !== subject) return false
    if (terms.length === 0) return true
    const haystack = norm(`${set.title} ${set.subject} ${set.topic} ${set.yearGroup}`)
    return terms.every((term) => haystack.includes(term))
  })
}

/**
 * Curriculum Search (design/gokid-screens.md §15 → "Curriculum Search": objectives and strands were
 * not searchable at all).
 *
 * Searching a curriculum app for "fronted adverbials" or "photosynthesis" should find the thing the
 * curriculum calls that, not only sets whose *title* happens to contain the phrase. Set titles are
 * marketing-ish ("Place Value to 1,000"); objectives are the wording a teacher or parent actually
 * uses, and are what a parent checking "is my child covering X?" types in.
 *
 * Returns the objective, the subject it belongs to, and the year it is taught — the year matters,
 * because the same strand recurs with different expectations across Reception to Year 6.
 */
export type CurriculumHit = {
  text: string
  strand: string
  subject: string
  subjectSlug: string
  yearCode: string
  yearGroup: string
}

const YEAR_CODES = ["Rec", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6"]

export function searchCurriculum(query: string, subject: string | null, limit = 12): CurriculumHit[] {
  const terms = norm(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const hits: CurriculumHit[] = []
  for (const yearCode of YEAR_CODES) {
    for (const row of curriculumForYear(yearCode)) {
      if (subject && row.subject.name !== subject) continue
      for (const objective of row.objectives) {
        const haystack = norm(`${objective.text} ${objective.strand} ${row.subject.name}`)
        if (!terms.every((term) => haystack.includes(term))) continue
        hits.push({
          text: objective.text,
          strand: objective.strand,
          subject: row.subject.name,
          subjectSlug: row.subject.slug,
          yearCode,
          yearGroup: yearCode === "Rec" ? "Reception" : `Year ${yearCode.slice(1)}`,
        })
        if (hits.length >= limit) return hits
      }
    }
  }
  return hits
}

// ---- Recent searches ------------------------------------------------------------------------
//
// In-memory for the same reason as lib/active-child.ts: a child's search history is a per-session
// trail, and a cold start opening on a clean field is the intended behaviour. Swap the store body
// for AsyncStorage the day the history needs to outlive the process.

const MAX_RECENT = 6

let recent: string[] = []
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return recent
}

function emit() {
  for (const listener of listeners) listener()
}

/** Records a submitted query, most-recent first, case-insensitively de-duplicated. */
export function rememberSearch(query: string) {
  const value = query.trim()
  if (!value) return
  recent = [value, ...recent.filter((r) => norm(r) !== norm(value))].slice(0, MAX_RECENT)
  emit()
}

export function forgetSearch(query: string) {
  recent = recent.filter((r) => r !== query)
  emit()
}

export function clearSearches() {
  recent = []
  emit()
}

export function useRecentSearches() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
