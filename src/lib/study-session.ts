/**
 * Session clock for the study-session flow (`(tabs)/study/session` → `answer-result` →
 * `session-summary` → `set-result` → `congratulations`).
 *
 * The flashcard runner can time itself with a ref, because the whole deck lives on one screen. The
 * study session cannot: every card is a fresh `router.replace` onto a new screen, so a ref dies with
 * each card and there is nowhere to keep "when did this session start".
 *
 * That gap is why the session flow recorded nothing at all — it reached its own summary screen with
 * no session to report, and told a child who had just answered six questions correctly that they had
 * studied 0 cards. The work was real; only the record of it was missing.
 *
 * A module-level map, deliberately not persisted — the same shape as `served-quiz.ts`, and for the
 * same reason: a study session is one foreground run. If the app is killed mid-session the clock is
 * gone, and `minutesFor` falls back to a floor of 1 rather than reporting a session that took no time.
 */

const startedAt = new Map<string, number>()

/** Start the clock for a set, if it is not already running. Safe to call on every card. */
export function beginSession(setId: string, now: number): void {
  if (!startedAt.has(setId)) startedAt.set(setId, now)
}

/** Whole minutes elapsed, floored at 1 — a completed session never reads as 0 minutes of work. */
export function minutesFor(setId: string, now: number): number {
  const start = startedAt.get(setId)
  if (!start) return 1
  return Math.max(1, Math.round((now - start) / 60_000))
}

/** Clear the clock once the session has been banked, so a second attempt times itself afresh. */
export function endSession(setId: string): void {
  startedAt.delete(setId)
}
