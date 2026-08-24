import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useCallback, useSyncExternalStore } from "react"

import {
  dueCardCountAt,
  dueDateFor,
  dueLabelAt,
  mergeProgress,
  minutesTodayAt,
  nextDueLabelAt,
  recentActivityAt,
  type Rating,
  type ReviewCard,
  schedule,
  type SessionRecord,
} from "./review-schedule"

/**
 * Spaced-repetition engine + study history (design/flow-wireframe.md → "SPACED REPETITION ENGINE",
 * MVP → "Per-card feedback", "Spaced repetition scheduling", "Upcoming review cards", "Basic study
 * history"). Card ratings and finished sessions are recorded here.
 *
 * Storage is on-device (expo-secure-store) and keyed per child, so the who's-studying switcher gives
 * each child their own schedule. This module is the seam to swap when the Neon/Drizzle progress API
 * lands (AGENTS.md) — screens depend on the hook, not on where the rows live.
 */

/**
 * The scheduling arithmetic itself lives in `./review-schedule`, a leaf module with no native
 * imports so it can be unit tested. Everything there takes `now` as an argument; this file is where
 * the clock is read and where the on-device store lives. Re-exported so `from "@/lib/reviews"` keeps
 * working at every call site.
 */
export {
  dueDateFor,
  masterySplit,
  schedule,
  type Rating,
  type ReviewCard,
  type SessionRecord,
} from "./review-schedule"

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

/**
 * Erase one child's study record, leaving their siblings' untouched.
 *
 * The counterpart to `clearAllProgress` for deleting a single child. Without it, removing a child
 * left their reviews and sessions in this store forever: invisible, because nothing lists a child
 * who no longer exists, and liable to resurface under a new child that happened to reuse the id.
 *
 * Same failure discipline as `clearAllProgress` — throws rather than resolving quietly, because the
 * caller is in the middle of telling a parent that this child's record is gone.
 */
export async function clearChildProgress(childId: string): Promise<void> {
  if (!store[childId]) return
  const next = { ...store }
  delete next[childId]
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next))
  store = next
  emit()
}

function progressFor(childId: string): ChildProgress {
  return store[childId] ?? EMPTY
}

/**
 * Human label for a due date — "Tomorrow", "In 5 days", "Ready now". Reads the clock itself: the
 * React Compiler (on for this project) rejects a Date.now() call in a component body, and a label
 * this coarse does not need the caller to pin a render-stable "now".
 */
export function dueLabel(dueAt: number) {
  return dueLabelAt(dueAt, Date.now())
}

/**
 * The interval a rating would earn, as a label — "Tomorrow", "In 5 days". Lets the answer screen
 * promise exactly what `rateCard` will do, since both go through `schedule`. Reads the clock here
 * rather than in a component body, which the React Compiler treats as impure (same rule as
 * `dueLabel` above).
 */
export function nextDueLabel(card: ReviewCard | undefined, rating: Rating) {
  return nextDueLabelAt(card, rating, Date.now())
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
 * How many cards are due right now. Reads the clock here rather than in a component body, which the
 * React Compiler treats as impure — the same rule `dueLabel` follows.
 */
export function dueCardCount(cards: ReviewCard[]): number {
  return dueCardCountAt(cards, Date.now())
}

/** Minutes studied today (design/gokid-screens.md §10 → "Daily Study Goal"). Same clock rule. */
export function minutesToday(sessions: SessionRecord[]): number {
  return minutesTodayAt(sessions, Date.now())
}

/** The last `count` days, oldest first, flagged with whether the child studied that day. Same rule:
 *  the `new Date()` happens here, not in a screen body. */
export function recentActivity(sessions: SessionRecord[], count = 7) {
  return recentActivityAt(sessions, Date.now(), count)
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
  const merged = mergeProgress(progressFor(childId), remoteCards, remoteSessions)

  store = { ...store, [childId]: merged }
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
