import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useSyncExternalStore } from "react"

/**
 * The parent passcode — the credential the gate checks (see `src/components/parent-gate.tsx`).
 *
 * It replaces the arithmetic challenge the gate used to pose. A maths question is a poor lock for
 * this app specifically: GoKid teaches multiplication, so the child most likely to try the door is
 * the one being drilled on exactly the skill it tests. Every Year-4 child who learns their tables
 * eventually walks straight through. A passcode does not decay as the child gets better at maths.
 *
 * Storage is `expo-secure-store` — Keychain on iOS, Keystore on Android — so the code is encrypted
 * at rest and never touches AsyncStorage or the bundle. It is stored as entered rather than hashed:
 * a four-digit space is 10,000 wide, so a hash buys nothing against anyone who can already read the
 * Keychain, and adding a digest would mean a new native dependency for no real gain. The security
 * boundary here is the Keychain, not the encoding.
 *
 * Deliberately *not* the same thing as `src/lib/parent-gate.ts`: this module owns the durable
 * secret, that one owns the in-memory locked/unlocked state. The passcode survives restarts; the
 * unlock never does.
 */

const KEY = "gokid.parent-passcode"

/** Digits in a passcode. The gate submits automatically once this many are entered. */
export const PASSCODE_LENGTH = 4

type PasscodeState = {
  /** False until the first Keychain read resolves — the gate holds a spinner rather than guessing. */
  isLoaded: boolean
  /** Whether a passcode exists. Drives create-vs-enter mode in the gate. */
  hasPasscode: boolean
}

let state: PasscodeState = { isLoaded: false, hasPasscode: false }
const listeners = new Set<() => void>()
let hydration: Promise<void> | null = null

function emit() {
  for (const listener of listeners) listener()
}

function set(next: PasscodeState) {
  state = next
  emit()
}

function getSnapshot() {
  return state
}

/**
 * Read the Keychain once per app run. A failure here is reported and then treated as "no passcode",
 * which sends the parent to the create flow — where the write will surface the real error rather
 * than silently locking them out of their own settings.
 */
async function load() {
  try {
    const stored = await SecureStore.getItemAsync(KEY)
    set({ isLoaded: true, hasPasscode: stored !== null })
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "parent-passcode", op: "load" } })
    set({ isLoaded: true, hasPasscode: false })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Hydrate on first subscriber rather than at module load: nothing should touch the Keychain until
  // a screen actually needs the answer.
  hydration ??= load()
  return () => listeners.delete(listener)
}

/** True for exactly PASSCODE_LENGTH digits — no spaces, no letters. */
export function isValidPasscode(code: string) {
  return new RegExp(`^\\d{${PASSCODE_LENGTH}}$`).test(code)
}

/**
 * Write a new passcode. Throws if the Keychain rejects the write, so the caller can tell the parent
 * the code was not saved instead of sending them back to a door whose key does not exist.
 */
export async function setPasscode(code: string) {
  if (!isValidPasscode(code)) throw new Error(`Passcode must be ${PASSCODE_LENGTH} digits`)
  try {
    await SecureStore.setItemAsync(KEY, code)
    set({ isLoaded: true, hasPasscode: true })
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "parent-passcode", op: "set" } })
    throw error
  }
}

/** Compare an entry against the stored code. A read failure is a failed check, never a free pass. */
export async function verifyPasscode(code: string) {
  try {
    const stored = await SecureStore.getItemAsync(KEY)
    return stored !== null && stored === code
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "parent-passcode", op: "verify" } })
    return false
  }
}

/** Forget the passcode — used by the forgot-passcode flow once the parent re-authenticates. */
export async function clearPasscode() {
  try {
    await SecureStore.deleteItemAsync(KEY)
    set({ isLoaded: true, hasPasscode: false })
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "parent-passcode", op: "clear" } })
    throw error
  }
}

export function useParentPasscode() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
