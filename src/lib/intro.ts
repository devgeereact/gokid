import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useSyncExternalStore } from "react"

/**
 * "Has this device seen the first-launch introduction?" (gokid-screens.md → Authentication &
 * Account → First Launch Introduction).
 *
 * Persisted, unlike the active child: the carousel is a once-per-install thing, so it has to
 * survive a cold start. SecureStore rather than a plain file because it is the only key-value
 * store already in package.json — the flag is not a secret, it just rides along.
 *
 * Read asynchronously on first subscribe; `isLoaded` is false until the read lands so the entry
 * gate can hold the splash instead of flashing the carousel at a returning parent.
 */

const KEY = "gokid.intro.seen"

let state: { isLoaded: boolean; seen: boolean } = { isLoaded: false, seen: false }
let reading = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function load() {
  if (reading || state.isLoaded) return
  reading = true
  SecureStore.getItemAsync(KEY)
    .then((value) => {
      state = { isLoaded: true, seen: value === "1" }
    })
    .catch((error: unknown) => {
      // A keychain read failure must not strand the parent on the splash. Show the carousel —
      // the worst case is a returning user seeing it twice.
      Sentry.captureException(error, { tags: { flow: "intro", op: "read" } })
      state = { isLoaded: true, seen: false }
    })
    .finally(emit)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  load()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function markIntroSeen() {
  state = { isLoaded: true, seen: true }
  emit()
  SecureStore.setItemAsync(KEY, "1").catch((error: unknown) => {
    Sentry.captureException(error, { tags: { flow: "intro", op: "write" } })
  })
}

export function useIntroSeen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
