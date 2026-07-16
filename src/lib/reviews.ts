import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useCallback, useSyncExternalStore } from "react"

/**
 * Spaced-repetition engine + study history (design/flow-wireframe.md → "SPACED REPETITION ENGINE",
 * MVP → "Per-card feedback", "Spaced repetition scheduling", "Upcoming review cards", "Basic study
 * history"). Card ratings and finished sessions are recorded here.
 *
 * Storage is on-device (expo-secure-store) and keyed per child, so the who's-studying switcher gives
 * each child their own schedule. This module is the seam to swap when the Neon/Drizzle progress API
 * lands (AGENTS.md) — screens depend on the hook, not on where the rows live.
 */

/** Per-card feedback from the flashcard runner. */
export type Rating = "tricky" | "gotit"

/** Days until a card comes back, indexed by box. Box 0 is the wireframe's "Tomorrow"; the first
 *  "Got it" moves to box 1 = "+5 Days". Beyond that the interval widens as recall holds. */
const INTERVALS_DAYS = [1, 5, 12, 30, 90]

const MAX_BOX = INTERVALS_DAYS.length - 1
const DAY_MS = 86_400_000

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

type ChildProgress = {
  cards: Record<string, ReviewCard>
  sessions: SessionRecord[]
}

type Store = Record<string, ChildProgress>

const STORAGE_KEY = "gokid.progress.v1"
const EMPTY: ChildProgress = { cards: {}, sessions: [] }

// Module-scope store + useSyncExternalStore: every screen reading progress re-renders on a rating
// without threading a provider through the router tree.
let store: Store = {}
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!hydrated) void hydrate()
  return () => listeners.delete(listener)
}

async function hydrate() {
  hydrated = true
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (raw) store = JSON.parse(raw) as Store
    emit()
  } catch (error) {
    // A corrupt or unreadable blob must not take the app down — start clean and report it.
    Sentry.captureException(error, { tags: { flow: "progress-hydrate" } })
    store = {}
  }
}

async function persist() {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "progress-persist" } })
  }
}

function getSnapshot() {
  return store
}

function progressFor(childId: string): ChildProgress {
  return store[childId] ?? EMPTY
}

/** Next box for a rating. "Tricky" drops the card back to box 0 (tomorrow); "Got it" promotes. */
export function schedule(card: ReviewCard | undefined, rating: Rating): ReviewCard["box"] {
  const box = card?.box ?? 0
  if (rating === "tricky") return 0
  return Math.min(box + 1, MAX_BOX)
}

export function dueDateFor(box: number, now: number) {
  return now + INTERVALS_DAYS[box] * DAY_MS
}

/**
 * Human label for a due date — "Tomorrow", "In 5 days", "Ready now". Reads the clock itself: the
 * React Compiler (on for this project) rejects a Date.now() call in a component body, and a label
 * this coarse does not need the caller to pin a render-stable "now".
 */
export function dueLabel(dueAt: number) {
  const days = Math.ceil((dueAt - Date.now()) / DAY_MS)
  if (days <= 0) return "Ready now"
  if (days === 1) return "Tomorrow"
  return `In ${days} days`
}

/** Whole minutes since `since`, floored at 1 — a finished session is never "0 min". Reads the clock
 *  here rather than in a screen, which the React Compiler treats as impure. */
export function elapsedMinutes(since: number) {
  return Math.max(1, Math.round((Date.now() - since) / 60_000))
}

/** Whole seconds since `since` — the pause screen's "Time spent" tile. Same clock-reads-here rule
 *  as `elapsedMinutes` above. */
export function elapsedSeconds(since: number) {
  return Math.max(0, Math.round((Date.now() - since) / 1000))
}

export function useProgress(childId: string) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const progress = snapshot[childId] ?? EMPTY

  /** Record one flashcard rating and schedule its next appearance. */
  const rateCard = useCallback(
    (setId: string, cardId: string, rating: Rating) => {
      const now = Date.now()
      const key = `${setId}:${cardId}`
      const current = progressFor(childId).cards[key]
      const box = schedule(current, rating)
      const next: ReviewCard = {
        setId,
        cardId,
        box,
        dueAt: dueDateFor(box, now),
        lastRating: rating,
        lastReviewedAt: now,
      }
      const child = progressFor(childId)
      store = { ...store, [childId]: { ...child, cards: { ...child.cards, [key]: next } } }
      emit()
      void persist()
      return next
    },
    [childId]
  )

  /** Append a finished session to the child's history. */
  const recordSession = useCallback(
    (record: Omit<SessionRecord, "id" | "at">) => {
      const now = Date.now()
      const entry: SessionRecord = { ...record, id: `${now}`, at: now }
      const child = progressFor(childId)
      store = { ...store, [childId]: { ...child, sessions: [entry, ...child.sessions].slice(0, 100) } }
      emit()
      void persist()
      return entry
    },
    [childId]
  )

  return {
    /** Every rated card, newest schedule first. */
    cards: Object.values(progress.cards),
    /** Cards whose due date has passed or lands soonest — the "Coming back soon" list. */
    upcoming: Object.values(progress.cards).sort((a, b) => a.dueAt - b.dueAt),
    sessions: progress.sessions,
    rateCard,
    recordSession,
  }
}
