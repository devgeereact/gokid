import { useSyncExternalStore } from "react"
import { AppState } from "react-native"

/**
 * Parent-gate lock state. The maths gate used to be a `View` rendered over one tab, which guarded
 * nothing: every parent route was a plain `(app)` screen reachable by deep link (`gokid://settings`
 * opened Account Settings, name and email on screen, with no challenge). This store is the real
 * guard — the `(parent)` route group's layout reads `unlocked` and renders the gate instead of the
 * screen until it flips, so every route inside the group is protected by construction, deep link or
 * not.
 *
 * The lock is deliberately not persisted: it lives in memory and resets to locked on every cold
 * start, and re-locks when the app backgrounds (a child picking the phone up after a parent set it
 * down) or after a short idle timeout. There is nothing to steal off disk and no "stay unlocked"
 * escape hatch.
 */

/** Re-lock this long after unlocking, even if the app stays foregrounded. */
const RELOCK_MS = 5 * 60_000
/** Wrong answers allowed before the pad locks out and the parent must dismiss and retry. */
export const MAX_ATTEMPTS = 5

type GateState = {
  unlocked: boolean
  /** Failed attempts since the last unlock — drives the lockout and the "N tries left" copy. */
  attempts: number
}

let state: GateState = { unlocked: false, attempts: 0 }
const listeners = new Set<() => void>()
let relockTimer: ReturnType<typeof setTimeout> | null = null

function emit() {
  for (const listener of listeners) listener()
}

function set(next: GateState) {
  state = next
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

/** Open the gate. Resets attempts and arms the idle re-lock timer. */
export function unlockGate() {
  if (relockTimer) clearTimeout(relockTimer)
  relockTimer = setTimeout(lockGate, RELOCK_MS)
  set({ unlocked: true, attempts: 0 })
}

/** Close the gate. Called on a correct-answer timeout, on background, and on a full dismiss. */
export function lockGate() {
  if (relockTimer) {
    clearTimeout(relockTimer)
    relockTimer = null
  }
  set({ unlocked: false, attempts: 0 })
}

/** Record a wrong answer. Returns the new attempt count so the gate can show tries remaining. */
export function recordFailedAttempt() {
  set({ ...state, attempts: state.attempts + 1 })
  return state.attempts
}

// Re-lock the moment the app leaves the foreground — the highest-value trigger, since the risk is a
// child picking up a phone a parent unlocked and set down. Registered once at module load.
AppState.addEventListener("change", (status) => {
  if (status !== "active") lockGate()
})

export function useParentGate() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
