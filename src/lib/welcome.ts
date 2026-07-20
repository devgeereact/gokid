import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useSyncExternalStore } from "react"

/**
 * "Has this account seen the welcome screen?" (gokid-screens.md §1 → "Account Creation Success").
 *
 * Same shape as lib/intro.ts, with one difference that matters: the flag is keyed by Clerk user id,
 * not by install. The intro carousel is a property of the device; this is a property of the account,
 * so a second parent signing in on the same phone still gets welcomed, and one parent signing in on
 * a second device does not get welcomed twice.
 *
 * The entry gate pairs this with an account-age check (see app/index.tsx) — the flag alone would
 * also fire for a long-standing parent who happened to delete their last child profile, and telling
 * them their account was just created would be a lie.
 */

const PREFIX = "gokid.welcome.seen."

type State = { isLoaded: boolean; seen: boolean }

let userId: string | null = null
let state: State = { isLoaded: false, seen: false }
let reading = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function load() {
  if (reading || state.isLoaded || !userId) return
  reading = true
  const key = `${PREFIX}${userId}`
  SecureStore.getItemAsync(key)
    .then((value) => {
      state = { isLoaded: true, seen: value === "1" }
    })
    .catch((error: unknown) => {
      // A keychain failure must not strand a parent on the splash. Treat it as "already seen": the
      // welcome screen is a nicety, and skipping it costs less than blocking the way in.
      Sentry.captureException(error, { tags: { flow: "welcome", op: "read" } })
      state = { isLoaded: true, seen: true }
    })
    .finally(() => {
      reading = false
      emit()
    })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  load()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

/** Called by the entry gate once Clerk knows who is signed in. */
export function setWelcomeUser(id: string | null) {
  if (id === userId) return
  userId = id
  state = { isLoaded: id === null, seen: false }
  reading = false
  emit()
  load()
}

export function markWelcomeSeen() {
  state = { isLoaded: true, seen: true }
  emit()
  if (!userId) return
  SecureStore.setItemAsync(`${PREFIX}${userId}`, "1").catch((error: unknown) => {
    Sentry.captureException(error, { tags: { flow: "welcome", op: "write" } })
  })
}

export function useWelcomeSeen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Was this Clerk account created just now, as part of the sign-in the parent has only this second
 * finished? Ten minutes is generous for an OAuth round trip that may include creating an Apple or
 * Google account first, and far short of a returning session.
 *
 * The clock is read here rather than in a component body — the React Compiler treats `Date.now()`
 * during render as impure, and it is the same rule the rest of the app follows.
 */
const NEW_ACCOUNT_MS = 10 * 60 * 1000

export function isNewAccount(createdAt: Date | null): boolean {
  if (!createdAt) return false
  return Date.now() - createdAt.getTime() < NEW_ACCOUNT_MS
}
