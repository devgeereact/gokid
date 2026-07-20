import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useCallback, useSyncExternalStore } from "react"

/**
 * Bookmarked sets (design/gokid-screens.md §3 → "Favourites", "Bookmarked Sets").
 *
 * The bookmark glyphs on the set cards were decorative — they rendered, they even highlighted, and
 * nothing was ever stored. A child could tap the ribbon on a set they liked, come back the next day,
 * and find it forgotten. This is the store that makes them real.
 *
 * Keyed by child, not by device: siblings share a phone, and one child's favourites appearing on
 * another's shelf is the same mistake as showing them a sibling's progress.
 *
 * Persisted through SecureStore for the same reason lib/reviews.ts is — it is the only key-value
 * store already in package.json. The data is not secret; it just rides along.
 */

const STORAGE_KEY = "gokid.bookmarks.v1"

/**
 * Key → ids bookmarked under it, newest first.
 *
 * Sets live under the bare `childId`; cards under `${childId}#card` (design/gokid-screens.md §6 →
 * "Mark Favourite" — the flashcard glyph marks an individual card, not the set it belongs to). Sets
 * deliberately keep the bare key so bookmarks saved before cards existed are not orphaned.
 */
type Store = Record<string, string[]>

export type BookmarkScope = "set" | "card"

function keyFor(childId: string, scope: BookmarkScope) {
  return scope === "set" ? childId : `${childId}#${scope}`
}

let store: Store = {}
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
    // Set the flag before parsing, not after the await returns: a second subscriber arriving mid-read
    // must not kick off a competing hydrate that overwrites this one. Same rule as lib/reviews.ts.
    hydrated = true
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      store = parsed as Store
    }
  } catch (error) {
    // A corrupt blob is kept under a `.corrupt` key rather than silently dropped — losing a child's
    // favourites without trace is exactly the kind of quiet data loss this project has already fixed
    // once in lib/reviews.ts.
    Sentry.captureException(error, { tags: { flow: "bookmarks", op: "read" } })
    hydrated = true
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY)
      if (raw) await SecureStore.setItemAsync(`${STORAGE_KEY}.corrupt`, raw)
    } catch {
      // Nothing more to do — the original failure is already reported.
    }
  } finally {
    hydrating = null
    emit()
  }
}

function persist() {
  return SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(store)).catch((error: unknown) => {
    Sentry.captureException(error, { tags: { flow: "bookmarks", op: "write" } })
  })
}

function getSnapshot() {
  return store
}

const EMPTY: string[] = []

/** Erase every child's bookmarks — called by the account-deletion path alongside the study record. */
export async function clearAllBookmarks(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
  await SecureStore.deleteItemAsync(`${STORAGE_KEY}.corrupt`).catch(() => undefined)
  store = {}
  hydrated = true
  emit()
}

export function useBookmarks(childId: string, scope: BookmarkScope = "set") {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const key = keyFor(childId, scope)
  const ids = snapshot[key] ?? EMPTY

  const toggle = useCallback(
    (id: string) => {
      if (!childId) return
      const storeKey = keyFor(childId, scope)
      const current = store[storeKey] ?? []
      // Newest first, so the Favourites shelf leads with what they just saved.
      const next = current.includes(id) ? current.filter((s) => s !== id) : [id, ...current]
      store = { ...store, [storeKey]: next }
      emit()
      void persist()
    },
    [childId, scope]
  )

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids])

  return { ids, toggle, isBookmarked }
}
