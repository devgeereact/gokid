import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useSyncExternalStore } from "react"

import type { Child } from "./children"

/**
 * What this device knows about its parent while Clerk cannot answer.
 *
 * ## The bug this exists for
 *
 * `useAuth().isLoaded` never becomes true with no network. Clerk's client bootstraps by calling its
 * own API, and offline that call never resolves — it does not fail, it hangs. Both gates in the app
 * (`app/index.tsx` and `app/(app)/_layout.tsx`) held `<Splash />` on `!isLoaded`, so a cold start
 * with the network off sat on the GoKid lion **forever**. Verified on 24 Aug 2026: sixty seconds in,
 * still the splash, with `{"isLoaded":false,"userLoaded":false}` logged on every render.
 *
 * That made the Download Set screen's promise — "The cards and quiz are on this device. They work
 * with no connection." — false in the one situation it is for. The download was complete and
 * correct on disk; the child simply could never reach a screen to use it.
 *
 * ## What is cached, and why it is not a new exposure
 *
 * Whether a parent is signed in, and the child roster that already lives in their Clerk
 * `unsafeMetadata`. Clerk's own token cache already keeps the session on this device, and the
 * roster is already written to this device by Clerk's client store; this is the same data under our
 * own key so the app can read it without Clerk's network round trip. First name and year group are
 * the whole of it — the same data minimisation `db/schema.ts` and `data-usage.tsx` describe.
 *
 * ## What it does NOT do
 *
 * It is not an authentication decision. Nothing server-side trusts it: every API route verifies a
 * Clerk token, and offline there is no token to send, so those calls fail and the screens that need
 * them say so. The cache answers one narrow question — "should this device show the app or the
 * sign-in screen while Clerk is unreachable" — and the answer is the last thing Clerk itself said.
 *
 * The parent passcode is unaffected: it lives in its own SecureStore key and gates the parent area
 * whether or not Clerk has loaded.
 */

const KEY = "gokid.session.v1"

export type CachedSession = {
  /** What Clerk last reported. `false` means signed out, not "unknown" — that is `null` state below. */
  signedIn: boolean
  children: Child[]
  /** Epoch ms the cache was last written from a live Clerk user. */
  at: number
}

type State = {
  /** False until the SecureStore read lands. */
  isLoaded: boolean
  /** Null when this device has never seen a signed-in parent. */
  session: CachedSession | null
}

let state: State = { isLoaded: false, session: null }
let reading = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function load() {
  if (reading || state.isLoaded) return
  reading = true
  SecureStore.getItemAsync(KEY)
    .then((raw) => {
      state = { isLoaded: true, session: raw ? (JSON.parse(raw) as CachedSession) : null }
    })
    .catch((error: unknown) => {
      // A keychain read that fails must not strand anyone on the splash — that is the whole bug this
      // module exists to fix. Report it and carry on as "nothing cached".
      Sentry.captureException(error, { tags: { flow: "session-cache", op: "read" } })
      state = { isLoaded: true, session: null }
    })
    .finally(emit)
}

/** Read the cache at app start, so the entry gate never has to wait for a subscriber to mount. */
export function hydrateSessionCache() {
  load()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  load()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useCachedSession(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** The cache without a hook — for module-level code that cannot subscribe. */
export function cachedSession(): State {
  return state
}

/**
 * Record what Clerk currently reports. Called from `useChildren` on every render where the Clerk
 * user is loaded, so the cache is never more than one online session behind.
 *
 * Writes are skipped when nothing changed: this runs on every render of every screen that reads
 * children, and a SecureStore write per render would be both slow and pointless.
 */
export function rememberSession(next: { signedIn: boolean; children: Child[] }) {
  const current = state.session
  if (
    current &&
    current.signedIn === next.signedIn &&
    JSON.stringify(current.children) === JSON.stringify(next.children)
  ) {
    return
  }
  const session: CachedSession = { signedIn: next.signedIn, children: next.children, at: Date.now() }
  state = { isLoaded: true, session }
  emit()
  SecureStore.setItemAsync(KEY, JSON.stringify(session)).catch((error: unknown) => {
    Sentry.captureException(error, { tags: { flow: "session-cache", op: "write" } })
  })
}

/** Forget everything — sign-out and account deletion. Both are promises made to a parent. */
export function forgetSession() {
  state = { isLoaded: true, session: null }
  emit()
  SecureStore.deleteItemAsync(KEY).catch((error: unknown) => {
    Sentry.captureException(error, { tags: { flow: "session-cache", op: "clear" } })
  })
}
