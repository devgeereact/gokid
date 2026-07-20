import { useMemo } from "react"

import type { ApiSet } from "./api"
import type { ReviewCard, SessionRecord } from "./reviews"

/**
 * The Learning Journey (design/gokid-screens.md §9 → "Learning Journey", "Personal Best",
 * "Finished Subject", "Finished Year Group", "End-of-Term Summary").
 *
 * §9's brief is the hard part, not the arithmetic: streaks and leaderboards were deliberately
 * rejected, so nothing here may manufacture urgency or compare one child to another. Every figure
 * below is therefore either something the child genuinely did, or a completion that genuinely
 * happened. Specifically:
 *
 *  - **Personal best is a child's own record, never a target.** Comparing you to yourself is
 *    intrinsic; comparing you to someone else is not. It is also *persistent* — the old "best day"
 *    was scoped to the current week, so a good day silently stopped existing seven days later, which
 *    is the same manipulative pattern as a streak resetting.
 *  - **Completion is reported, not rewarded.** "You have finished every Maths set for Year 4" is a
 *    fact about the curriculum. There is no prize attached and nothing is withheld until you get
 *    there.
 *  - **No target the child hasn't set.** Nothing here says "3 more to go!" — the counts are stated
 *    plainly and the child decides what to do with them.
 */

const DAY_MS = 86_400_000

/** English school year: Autumn Sep–Dec, Spring Jan–Mar, Summer Apr–Aug. Matches `currentTerm`. */
function termOf(date: Date): { name: string; start: Date; end: Date } {
  const year = date.getFullYear()
  const month = date.getMonth()
  if (month >= 8) {
    return { name: "Autumn term", start: new Date(year, 8, 1), end: new Date(year, 11, 31, 23, 59, 59) }
  }
  if (month <= 2) {
    return { name: "Spring term", start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59) }
  }
  return { name: "Summer term", start: new Date(year, 3, 1), end: new Date(year, 7, 31, 23, 59, 59) }
}

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export type TermSummary = {
  name: string
  start: number
  end: number
  /** True once the term is over — the summary then reads as a closed record, not a running total. */
  finished: boolean
  minutes: number
  sessions: number
  cardsLearned: number
  subjects: string[]
  setsFinished: number
}

export type PersonalBest = {
  /** Longest single day by minutes, across the child's whole record. */
  bestDayMinutes: number
  bestDayAt: number | null
  /** Most cards reviewed in one session. */
  bestSessionCards: number
  /** Most sets finished in a single day. */
  bestDaySets: number
}

export type SubjectCompletion = {
  subject: string
  total: number
  finished: number
  /** True when every set in this subject, for this child's year, has been finished. */
  complete: boolean
}

export type Journey = {
  term: TermSummary
  best: PersonalBest
  subjects: SubjectCompletion[]
  /** True when every set in the child's year group has been finished. */
  yearComplete: boolean
  yearFinished: number
  yearTotal: number
  /** Nothing has happened yet — the screen shows an honest empty state rather than a row of zeros. */
  hasData: boolean
}

/** Clock read inside the module — the React Compiler treats `Date.now()` during render as impure. */
function nowMs() {
  return Date.now()
}

export function journeyFor(cards: ReviewCard[], sessions: SessionRecord[], sets: ApiSet[]): Journey {
  const now = nowMs()
  const term = termOf(new Date(now))
  const termStart = term.start.getTime()
  const termEnd = term.end.getTime()

  const inTerm = sessions.filter((s) => s.at >= termStart && s.at <= termEnd)
  const finishedSetIds = new Set(sessions.map((s) => s.setId))

  // --- Personal best, over the child's whole record rather than the current week.
  const byDay = new Map<string, { at: number; minutes: number; sets: Set<string> }>()
  for (const session of sessions) {
    const key = String(startOfDay(session.at))
    const row = byDay.get(key) ?? { at: startOfDay(session.at), minutes: 0, sets: new Set<string>() }
    row.minutes += session.minutes
    row.sets.add(session.setId)
    byDay.set(key, row)
  }
  const days = [...byDay.values()]
  const bestDay = days.slice().sort((a, b) => b.minutes - a.minutes)[0]
  const bestDaySets = days.reduce((max, d) => Math.max(max, d.sets.size), 0)
  const bestSessionCards = sessions.reduce((max, s) => Math.max(max, s.cardsReviewed), 0)

  // --- Completion, per subject and for the year as a whole.
  const subjects = [...new Set(sets.map((s) => s.subject))]
    .map((subject) => {
      const mine = sets.filter((s) => s.subject === subject)
      const finished = mine.filter((s) => finishedSetIds.has(s.id)).length
      return { subject, total: mine.length, finished, complete: mine.length > 0 && finished === mine.length }
    })
    .sort((a, b) => b.finished / Math.max(1, b.total) - a.finished / Math.max(1, a.total))

  const yearFinished = sets.filter((s) => finishedSetIds.has(s.id)).length

  return {
    term: {
      name: term.name,
      start: termStart,
      end: termEnd,
      finished: now > termEnd,
      minutes: inTerm.reduce((sum, s) => sum + s.minutes, 0),
      sessions: inTerm.length,
      // Cards learned is a lifetime figure on the card, not a per-term one — the record does not say
      // *when* a card crossed into box 2, so it is counted for the term only via sessions studied.
      cardsLearned: cards.filter((c) => c.box >= 2).length,
      subjects: [...new Set(inTerm.map((s) => s.subject))],
      setsFinished: new Set(inTerm.map((s) => s.setId)).size,
    },
    best: {
      bestDayMinutes: bestDay?.minutes ?? 0,
      bestDayAt: bestDay?.at ?? null,
      bestSessionCards,
      bestDaySets,
    },
    subjects,
    yearComplete: sets.length > 0 && yearFinished === sets.length,
    yearFinished,
    yearTotal: sets.length,
    hasData: sessions.length > 0 || cards.length > 0,
  }
}

/** Days remaining in the current term — used only to label the summary, never to create urgency. */
export function daysLeftInTerm(term: TermSummary, now = nowMs()): number {
  return Math.max(0, Math.ceil((term.end - now) / DAY_MS))
}

export function useJourney(cards: ReviewCard[], sessions: SessionRecord[], sets: ApiSet[]): Journey {
  return useMemo(() => journeyFor(cards, sessions, sets), [cards, sessions, sets])
}
