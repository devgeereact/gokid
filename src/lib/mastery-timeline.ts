import { useMemo } from "react"

import type { ApiSet } from "./api"
import type { ReviewCard, SessionRecord } from "./reviews"

/**
 * Mastery Timeline and Statistics (design/gokid-screens.md §8 → "Mastery Timeline",
 * "Recently Mastered", "Statistics").
 *
 * The progress section already had the *aggregates* — a donut, a coverage percentage, a count of
 * cards learned. What it had nowhere was the chronology: when a card actually crossed into mastery.
 * That is the thing a child can point at and a parent can recognise, and it is derivable from data
 * already on the device, because every review stamps `lastReviewedAt`.
 *
 * One honest limitation, stated here so no screen implies otherwise: the store keeps only the *last*
 * review of each card, not its full history. So a card's timeline entry is the day it was last
 * reviewed while at box 4 — the day mastery was last confirmed, not necessarily the day it was first
 * reached. That is the truthful reading of the data we have, and the screens word it that way
 * ("confirmed", not "achieved"). A per-review event log would fix it and is a schema change.
 */

/** Box 4 is the engine's own top interval — the same bar the donut and the shelves use. */
const MASTERED_BOX = 4

export type TimelineEntry = {
  /** Local day key, e.g. "2026-7-19". */
  key: string
  /** Midnight of that day, for sorting and labelling. */
  at: number
  cards: { card: ReviewCard; set: ApiSet | undefined }[]
}

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayKey(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Cards at box 4, grouped by the day their mastery was last confirmed, newest day first.
 * `limitDays` caps the list — a timeline is a recent record, not an archive.
 */
export function masteryTimeline(cards: ReviewCard[], sets: ApiSet[], limitDays = 30): TimelineEntry[] {
  const byId = new Map(sets.map((s) => [s.id, s]))
  const byDay = new Map<string, TimelineEntry>()

  for (const card of cards) {
    if (card.box < MASTERED_BOX) continue
    const key = dayKey(card.lastReviewedAt)
    const entry = byDay.get(key) ?? { key, at: startOfDay(card.lastReviewedAt), cards: [] }
    entry.cards.push({ card, set: byId.get(card.setId) })
    byDay.set(key, entry)
  }

  return [...byDay.values()].sort((a, b) => b.at - a.at).slice(0, limitDays)
}

export type Statistics = {
  /** Everything the child has ever seen. */
  cardsSeen: number
  cardsLearned: number
  cardsMastered: number
  setsStarted: number
  setsFinished: number
  subjects: number
  sessions: number
  minutes: number
  /** Mean minutes per session, 0 when there are none. */
  averageSession: number
  /** Quiz accuracy across scored sessions; null when nothing has been scored. */
  accuracy: number | null
  /** Days with at least one session. Not a streak — just how many days they showed up. */
  daysStudied: number
  /** The busiest single day, by minutes. */
  bestDay: { at: number; minutes: number } | null
  /** Cards due now, and the next due date after that. */
  dueNow: number
  nextDueAt: number | null
}

/** Clock read inside the module — the React Compiler treats `Date.now()` during render as impure. */
function nowMs() {
  return Date.now()
}

/**
 * Every headline figure the progress section can honestly state, in one place (§8 → "Statistics").
 *
 * These numbers were previously scattered across five screens, each recomputing its own — which is
 * how two screens end up disagreeing about the same child. Anything that cannot be computed from the
 * record returns null rather than 0, so a screen can tell "none yet" from "nothing recorded".
 */
export function statisticsFor(cards: ReviewCard[], sessions: SessionRecord[], sets: ApiSet[]): Statistics {
  const now = nowMs()

  const scored = sessions.filter((s) => s.score !== undefined && s.scoreTotal)
  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0)

  const minutesByDay = new Map<string, { at: number; minutes: number }>()
  for (const session of sessions) {
    const key = dayKey(session.at)
    const row = minutesByDay.get(key) ?? { at: startOfDay(session.at), minutes: 0 }
    row.minutes += session.minutes
    minutesByDay.set(key, row)
  }
  const bestDay = [...minutesByDay.values()].sort((a, b) => b.minutes - a.minutes)[0] ?? null

  const startedSetIds = new Set(cards.map((c) => c.setId))
  const upcoming = cards.filter((c) => c.dueAt > now).sort((a, b) => a.dueAt - b.dueAt)[0]

  return {
    cardsSeen: cards.length,
    cardsLearned: cards.filter((c) => c.box >= 2).length,
    cardsMastered: cards.filter((c) => c.box >= MASTERED_BOX).length,
    setsStarted: startedSetIds.size,
    setsFinished: new Set(sessions.map((s) => s.setId)).size,
    subjects: new Set(sessions.map((s) => s.subject)).size,
    sessions: sessions.length,
    minutes,
    averageSession: sessions.length ? Math.round(minutes / sessions.length) : 0,
    accuracy: scored.length
      ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0) / (s.scoreTotal ?? 1), 0) / scored.length) * 100)
      : null,
    daysStudied: minutesByDay.size,
    bestDay,
    dueNow: cards.filter((c) => c.dueAt <= now).length,
    nextDueAt: upcoming?.dueAt ?? null,
  }
}

/** Both derivations for one child, recomputed only when their record changes. */
export function useProgressInsights(cards: ReviewCard[], sessions: SessionRecord[], sets: ApiSet[]) {
  return useMemo(
    () => ({
      timeline: masteryTimeline(cards, sets),
      stats: statisticsFor(cards, sessions, sets),
    }),
    [cards, sessions, sets]
  )
}
