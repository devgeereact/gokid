import { useSyncExternalStore } from "react"

/**
 * Which child is studying right now (design/GoKid-whoisstudying-screen.png → Home). Set when a card
 * on the who's-studying screen is tapped; read by the study, progress and history screens so each
 * child's schedule and history stay their own.
 *
 * Deliberately in-memory: picking a profile is a per-session act, and the app returning to
 * who's-studying on a cold start is the intended behaviour, not a bug.
 */

let activeChildId: string | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return activeChildId
}

export function setActiveChild(id: string) {
  activeChildId = id
  for (const listener of listeners) listener()
}

export function useActiveChildId() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
