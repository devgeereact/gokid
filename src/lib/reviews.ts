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
// Once a hydrate is in flight it is shared, so N subscribers that mount before the disk read
// resolves trigger exactly one read — not N racing reads that overwrite each other.
let hydrating: Promise<void> | null = null
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!hydrated && !hydrating) hydrating = hydrate()
  return () => listeners.delete(listener)
}

async function hydrate() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (raw) {
      const disk = JSON.parse(raw) as Store
      // `hydrated` flips only here, AFTER the await. A rateCard/recordSession that fired during the
      // read wrote into the live `store` for its child; merging with disk-as-base and the live entry
      // winning per child means that in-flight write survives instead of being clobbered by the
      // wholesale assignment this used to do.
      store = { ...disk, ...store }
    }
  } catch (error) {
    // A corrupt or unreadable blob must not take the app down, and must not be silently discarded:
    // overwriting it with {} on the next persist() would erase every child's progress for good. Copy
    // it aside for recovery, keep whatever is already live, and report it.
    Sentry.captureException(error, { tags: { flow: "progress-hydrate" } })
    await backupCorruptBlob()
  } finally {
    hydrated = true
    hydrating = null
    // Always emit: screens that rendered the empty pre-hydration snapshot must be told to re-read,
    // even on the error path, or they keep showing {} and the next write persists {} over real data.
    emit()
  }
}

/** Preserve an unparseable progress blob under a side key so a parse bug can never destroy data that
 *  a later fix could have read. Best-effort — a failure here is itself reported, never thrown. */
async function backupCorruptBlob() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (raw) await SecureStore.setItemAsync(`${STORAGE_KEY}.corrupt`, raw)
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "progress-hydrate-backup" } })
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

/**
 * The whole study record, every child (design/gokid-screens.md §16 → Privacy → "Data Export").
 * Subject to the same hydrate-on-subscribe as `useProgress`, so an export cannot read an empty store
 * that simply had not loaded yet and present it to a parent as "you have no data".
 */
export function useAllProgress(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Erase every child's study record, on disk and in memory (§16 → Privacy → "Delete Account").
 *
 * Throws on a storage failure rather than resolving quietly: the caller is in the middle of telling
 * a parent their data is gone, and a silent failure there is a false promise about deleted personal
 * data, not a cosmetic bug. The in-memory wipe happens only after the disk delete succeeds, so a
 * failure leaves a consistent state that a retry can finish.
 */
export async function clearAllProgress(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
  // Best-effort: a backup written by a past corrupt-blob recovery would otherwise outlive the delete.
  await SecureStore.deleteItemAsync(`${STORAGE_KEY}.corrupt`).catch(() => undefined)
  store = {}
  hydrated = true
  emit()
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

/**
 * The interval a rating would earn, as a label — "Tomorrow", "In 5 days". Lets the answer screen
 * promise exactly what `rateCard` will do, since both go through `schedule`. Reads the clock here
 * rather than in a component body, which the React Compiler treats as impure (same rule as
 * `dueLabel` above).
 */
export function nextDueLabel(card: ReviewCard | undefined, rating: Rating) {
  return dueLabel(dueDateFor(schedule(card, rating), Date.now()))
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

/**
 * The last `count` days, oldest first, flagged with whether the child studied that day. The clock is
 * read here, inside an imported helper, rather than in a screen body — the React Compiler treats a
 * render-time `new Date()` as impure (same rule as `dueLabel` / `elapsedMinutes`).
 */
/**
 * Minutes studied today (design/gokid-screens.md §10 → "Daily Study Goal").
 *
 * The clock is read here rather than in a component body — the React Compiler treats `Date.now()`
 * during render as impure, and it is the rule the rest of the app follows.
 */
/**
 * How many cards are due right now. Reads the clock here rather than in a component body, which the
 * React Compiler treats as impure — the same rule `dueLabel` follows.
 */
export function dueCardCount(cards: ReviewCard[]): number {
  const now = Date.now()
  return cards.filter((c) => c.dueAt <= now).length
}

export function minutesToday(sessions: SessionRecord[]): number {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const from = start.getTime()
  return sessions.filter((s) => s.at >= from).reduce((sum, s) => sum + s.minutes, 0)
}

export function recentActivity(sessions: SessionRecord[], count = 7) {
  const dayKey = (ms: number) => {
    const d = new Date(ms)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }
  const studied = new Set(sessions.map((s) => dayKey(s.at)))
  const labels = ["S", "M", "T", "W", "T", "F", "S"]
  const now = new Date()
  const out: { key: string; label: string; done: boolean; isToday: boolean }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = dayKey(d.getTime())
    out.push({ key, label: labels[d.getDay()], done: studied.has(key), isToday: i === 0 })
  }
  return out
}

/**
 * This child's record as plain arrays, for upload (see lib/sync.ts). Reads the live store rather
 * than a hook, so sync can run from an event handler.
 */
export function snapshotFor(childId: string): { cards: ReviewCard[]; sessions: SessionRecord[] } {
  const child = progressFor(childId)
  return { cards: Object.values(child.cards), sessions: child.sessions }
}

/**
 * Merge a server record into the local one.
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
export function mergeRemoteProgress(childId: string, remoteCards: ReviewCard[], remoteSessions: SessionRecord[]) {
  const local = progressFor(childId)

  const cards: Record<string, ReviewCard> = { ...local.cards }
  for (const remote of remoteCards) {
    const key = `${remote.setId}:${remote.cardId}`
    const mine = cards[key]
    if (!mine || remote.lastReviewedAt > mine.lastReviewedAt) cards[key] = remote
  }

  const byId = new Map(local.sessions.map((s) => [s.id, s]))
  for (const remote of remoteSessions) if (!byId.has(remote.id)) byId.set(remote.id, remote)
  const sessions = [...byId.values()].sort((a, b) => b.at - a.at)

  store = { ...store, [childId]: { cards, sessions } }
  emit()
  void persist()
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
