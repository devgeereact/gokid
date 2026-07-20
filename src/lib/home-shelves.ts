import { useMemo } from "react"

import type { ApiSet } from "./api"
import type { ReviewCard, SessionRecord } from "./reviews"

/**
 * The Home shelves (design/gokid-screens.md §3 → "Recently Studied", "Recommended For You",
 * "Recently Mastered").
 *
 * Each one is derived from the child's own record joined to the real set catalogue. Nothing here
 * invents an ordering: "recent" means a real timestamp, "mastered" means the spaced-repetition
 * engine's own box-4 threshold, and "recommended" is a stated rule (below) rather than a shuffle
 * dressed up as personalisation.
 *
 * Two §3 shelves are deliberately absent, because the data to build them honestly does not exist:
 *
 *  - **New This Week** needs a per-set publication date. `study_sets.created_at` exists, but every
 *    row carries the same seed timestamp, so the shelf would show all 27 sets or none. It becomes
 *    real when sets are published incrementally, not before.
 *  - **Seasonal Learning** needs each topic mapped to a school term. `currentTerm()` knows what term
 *    it is today, but no curriculum row says which term covers it, so any grouping would be guessed.
 */

/** How many sets a horizontal shelf carries before it stops being a shelf and becomes a list. */
const SHELF_LIMIT = 6

/**
 * Recently Studied — the sets behind this child's most recent sessions, newest first.
 *
 * Deduplicated by set: three sessions on the same set is one entry on the shelf, at the time of the
 * most recent one. Sessions are already newest-first, so the first sighting of a set is its latest.
 */
export function recentlyStudied(sessions: SessionRecord[], sets: ApiSet[], limit = SHELF_LIMIT): ApiSet[] {
  const byId = new Map(sets.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const out: ApiSet[] = []
  for (const session of sessions) {
    if (seen.has(session.setId)) continue
    seen.add(session.setId)
    const set = byId.get(session.setId)
    // A session for a set no longer on this child's shelf (year changed, set retired) is skipped
    // rather than rendered as a broken card.
    if (set) out.push(set)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Recently Mastered — sets where this child has pushed cards to box 4, ordered by when they most
 * recently did it.
 *
 * Box 4 is the engine's own top interval (90 days — see INTERVALS_DAYS in lib/reviews.ts), not a
 * display constant invented here, so "mastered" on this shelf means the same thing it means on the
 * progress donut and in the mastery split.
 */
export function recentlyMastered(
  cards: ReviewCard[],
  sets: ApiSet[],
  limit = SHELF_LIMIT
): { set: ApiSet; count: number; at: number }[] {
  const byId = new Map(sets.map((s) => [s.id, s]))
  const bySet = new Map<string, { count: number; at: number }>()
  for (const card of cards) {
    if (card.box < 4) continue
    const row = bySet.get(card.setId) ?? { count: 0, at: 0 }
    row.count += 1
    row.at = Math.max(row.at, card.lastReviewedAt)
    bySet.set(card.setId, row)
  }
  return [...bySet.entries()]
    .map(([setId, row]) => ({ set: byId.get(setId), ...row }))
    .filter((r): r is { set: ApiSet; count: number; at: number } => Boolean(r.set))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
}

export type Recommendation = { set: ApiSet; reason: string }

/**
 * Recommended For You — a stated rule, in priority order, so a parent could read this list back and
 * check it. The previous "recommendation" was the subject hub's year-group sort, which recommended
 * the same thing to every child in the year and was not personalised at all.
 *
 * 1. **Due for review.** Cards the engine says are due today. Bringing work back at the right
 *    interval is the whole point of the SRS, so it outranks anything new.
 * 2. **Started but unfinished.** Cards seen, but not all of them — finishing beats starting again.
 * 3. **Not yet started.** A fresh set from a subject they have touched least, so the shelf widens
 *    their coverage rather than deepening the one subject they already favour.
 *
 * Each carries the reason it is there. A recommendation a child cannot interrogate is just a nudge.
 */
export function recommendedFor(
  cards: ReviewCard[],
  sets: ApiSet[],
  now: number,
  limit = SHELF_LIMIT
): Recommendation[] {
  const out: Recommendation[] = []
  const taken = new Set<string>()

  const push = (set: ApiSet | undefined, reason: string) => {
    if (!set || taken.has(set.id) || out.length >= limit) return
    taken.add(set.id)
    out.push({ set, reason })
  }

  const cardsFor = (setId: string) => cards.filter((c) => c.setId === setId)

  // 1. Due for review — most overdue first.
  const dueBySet = new Map<string, number>()
  for (const card of cards) {
    if (card.dueAt > now) continue
    dueBySet.set(card.setId, (dueBySet.get(card.setId) ?? 0) + 1)
  }
  for (const [setId, count] of [...dueBySet.entries()].sort((a, b) => b[1] - a[1])) {
    push(
      sets.find((s) => s.id === setId),
      count === 1 ? "1 card due for review" : `${count} cards due for review`
    )
  }

  // 2. Started but not finished.
  const started = sets
    .filter((s) => {
      const mine = cardsFor(s.id)
      return mine.length > 0 && mine.length < s.cardsTotal
    })
    .sort((a, b) => cardsFor(b.id).length - cardsFor(a.id).length)
  for (const set of started) {
    const seen = cardsFor(set.id).length
    push(set, `${seen} of ${set.cardsTotal} cards seen`)
  }

  // 3. Not started, from their least-covered subject first.
  const touched = new Map<string, number>()
  for (const set of sets) {
    if (cardsFor(set.id).length === 0) continue
    touched.set(set.subject, (touched.get(set.subject) ?? 0) + 1)
  }
  const fresh = sets
    .filter((s) => cardsFor(s.id).length === 0)
    .sort((a, b) => (touched.get(a.subject) ?? 0) - (touched.get(b.subject) ?? 0))
  for (const set of fresh) {
    push(set, touched.get(set.subject) ? `More ${set.subject.toLowerCase()}` : `New in ${set.subject.toLowerCase()}`)
  }

  return out
}

/** Clock read inside the module — the React Compiler treats `Date.now()` during render as impure. */
function nowMs() {
  return Date.now()
}

/** Everything the Home shelves need, computed once per change of the underlying record. */
export function useHomeShelves(cards: ReviewCard[], sessions: SessionRecord[], sets: ApiSet[]) {
  return useMemo(() => {
    const now = nowMs()
    return {
      recent: recentlyStudied(sessions, sets),
      mastered: recentlyMastered(cards, sets),
      recommended: recommendedFor(cards, sets, now),
    }
  }, [cards, sessions, sets])
}
