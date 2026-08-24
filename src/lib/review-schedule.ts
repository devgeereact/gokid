/**
 * The spaced-repetition engine, as pure functions over plain data.
 *
 * Split out of `reviews.ts` for the same reason `api-contract.ts` was split out of `api.ts`, and
 * `quiz-scoring.ts` out of `study.ts`: the arithmetic that decides when a card comes back is the
 * single most consequential logic in the app — every mastery figure, every "cards due" count and
 * every progress bar derives from it — and it lived in a module that imports `@sentry/react-native`
 * and `expo-secure-store` at the top. Nothing could load it outside a running app, so nothing tested
 * it.
 *
 * Everything here takes `now` as an argument rather than reading the clock. `reviews.ts` supplies
 * `Date.now()` at its own exported boundary (which also keeps the React Compiler happy — it treats a
 * `Date.now()` in a component body as impure), and a test can pin an instant and assert an exact
 * date. A function that reads the clock itself cannot be checked at a boundary, and boundaries —
 * midnight, the day a card falls due — are exactly where a scheduler goes wrong.
 *
 * `reviews.ts` re-exports every name here, so `from "@/lib/reviews"` is unchanged at all call sites.
 */

/** Per-card feedback from the flashcard runner. */
export type Rating = "tricky" | "gotit"

/** Days until a card comes back, indexed by box. Box 0 is the wireframe's "Tomorrow"; the first
 *  "Got it" moves to box 1 = "+5 Days". Beyond that the interval widens as recall holds. */
export const INTERVALS_DAYS = [1, 5, 12, 30, 90]

export const MAX_BOX = INTERVALS_DAYS.length - 1
export const DAY_MS = 86_400_000

export type ReviewCard = {
  setId: string
  cardId: string
  /** Index into INTERVALS_DAYS — higher means better retained. */
  box: number
  /** Epoch ms the card is next due. */
  dueAt: number
  lastRating: Rating
  lastReviewedAt: number
}

/** One finished study or quiz session — the rows behind the study-history screen. */
export type SessionRecord = {
  id: string
  setId: string
  setTitle: string
  subject: string
  /** Epoch ms the session finished. */
  at: number
  cardsReviewed: number
  minutes: number
  /** Quiz score, when the session ended in a quiz. */
  score?: number
  scoreTotal?: number
}

/** Next box for a rating. "Tricky" drops the card back to box 0 (tomorrow); "Got it" promotes. */
export function schedule(card: ReviewCard | undefined, rating: Rating): ReviewCard["box"] {
  const box = card?.box ?? 0
  if (rating === "tricky") return 0
  return Math.min(box + 1, MAX_BOX)
}

/** When a card in `box` next falls due, from `now`. */
export function dueDateFor(box: number, now: number) {
  // A box outside the ladder would index `undefined` and produce a NaN due date, which compares
  // false against every clock reading — the card would silently never come back. Clamp instead: a
  // record written by a future version with a longer ladder is stale data, not a reason to lose a
  // card. Box 0 is also the floor, so a negative can never shorten the interval below "tomorrow".
  const clamped = Math.min(Math.max(Math.trunc(box) || 0, 0), MAX_BOX)
  return now + INTERVALS_DAYS[clamped] * DAY_MS
}

/** Human label for a due date, relative to `now` — "Tomorrow", "In 5 days", "Ready now". */
export function dueLabelAt(dueAt: number, now: number) {
  const days = Math.ceil((dueAt - now) / DAY_MS)
  if (days <= 0) return "Ready now"
  if (days === 1) return "Tomorrow"
  return `In ${days} days`
}

/** The interval a rating would earn, as a label — what the answer screen promises the child. */
export function nextDueLabelAt(card: ReviewCard | undefined, rating: Rating, now: number) {
  return dueLabelAt(dueDateFor(schedule(card, rating), now), now)
}

/**
 * How a child's rated cards split across the mastery ladder. `box` is the Leitner position, so this
 * is the engine's own view of retention rather than an authored percentage: 0–1 is still being
 * learned, 2–3 is coming good, 4+ has survived the widest intervals.
 */
export function masterySplit(cards: ReviewCard[]) {
  const learning = cards.filter((c) => c.box <= 1).length
  const getting = cards.filter((c) => c.box === 2 || c.box === 3).length
  const mastered = cards.filter((c) => c.box >= 4).length
  const total = cards.length
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
  return { learning, getting, mastered, total, pctLearning: pct(learning), pctGetting: pct(getting), pctMastered: pct(mastered) }
}

/** How many cards are due at `now`. */
export function dueCardCountAt(cards: ReviewCard[], now: number): number {
  return cards.filter((c) => c.dueAt <= now).length
}

/** Minutes studied on the calendar day containing `now` (design/gokid-screens.md §10). */
export function minutesTodayAt(sessions: SessionRecord[], now: number): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const from = start.getTime()
  return sessions.filter((s) => s.at >= from).reduce((sum, s) => sum + s.minutes, 0)
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** The last `count` days ending at `now`, oldest first, flagged with whether the child studied. */
export function recentActivityAt(sessions: SessionRecord[], now: number, count = 7) {
  const studied = new Set(sessions.map((s) => dayKey(s.at)))
  const today = new Date(now)
  const out: { key: string; label: string; done: boolean; isToday: boolean }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const key = dayKey(d.getTime())
    out.push({ key, label: DAY_LABELS[d.getDay()], done: studied.has(key), isToday: i === 0 })
  }
  return out
}

/**
 * Merge a server record into a local one.
 *
 * **Later review wins, per card** — the same rule the server applies, so the two sides converge
 * without negotiating. A card is identified by `${setId}:${cardId}`, and whichever side saw it more
 * recently is kept; this is why a tablet syncing yesterday's work cannot roll back what the phone
 * did this morning.
 *
 * Sessions are unioned by id. They are immutable facts about something that happened, so there is
 * nothing to reconcile — only duplicates to avoid, which would inflate every study-time figure in
 * the Progress section.
 */
export function mergeProgress(
  local: { cards: Record<string, ReviewCard>; sessions: SessionRecord[] },
  remoteCards: ReviewCard[],
  remoteSessions: SessionRecord[]
): { cards: Record<string, ReviewCard>; sessions: SessionRecord[] } {
  const cards: Record<string, ReviewCard> = { ...local.cards }
  for (const remote of remoteCards) {
    const key = `${remote.setId}:${remote.cardId}`
    const mine = cards[key]
    if (!mine || remote.lastReviewedAt > mine.lastReviewedAt) cards[key] = remote
  }

  const byId = new Map(local.sessions.map((s) => [s.id, s]))
  for (const remote of remoteSessions) if (!byId.has(remote.id)) byId.set(remote.id, remote)
  const sessions = [...byId.values()].sort((a, b) => b.at - a.at)

  return { cards, sessions }
}
