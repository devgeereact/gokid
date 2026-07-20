import type { MixedQuestion } from "@/lib/study"

/**
 * In-memory hand-off for a child's server-served quiz (see api/quiz + lib/api.ts `fetchServedQuiz`).
 *
 * The quiz flow is four screens — runner, result, final-review, review — and each one independently
 * rebuilds the question list from `getStudySet`/`quizItems`. That is correct for the local demo
 * content (deterministic, same every time) but wrong for a no-repeat server quiz, where the questions
 * are chosen fresh for this child on entry: the other three screens must score and review *exactly*
 * the questions the child was shown, not a freshly-derived local list.
 *
 * So the runner stashes the served list here, keyed by set id, and the downstream screens read it via
 * `resolveItems`. It is deliberately a plain module-level map, not persisted: a quiz attempt is a
 * single foreground session, and if the store is ever empty (cold reload mid-quiz) `resolveItems`
 * falls back to the local list — the worst case is the pre-server behaviour, never a crash.
 */

const store = new Map<string, MixedQuestion[]>()

export function setServedQuiz(setId: string, questions: MixedQuestion[]): void {
  store.set(setId, questions)
}

export function getServedQuiz(setId: string): MixedQuestion[] | null {
  return store.get(setId) ?? null
}

export function clearServedQuiz(setId: string): void {
  store.delete(setId)
}

/**
 * The questions the downstream screens should use: the served list when one was stashed for this set,
 * otherwise the local fallback the caller passes in. This is the single seam that keeps result,
 * final-review and review aligned with what the runner actually showed.
 */
export function resolveItems(setId: string, fallback: MixedQuestion[]): MixedQuestion[] {
  return store.get(setId) ?? fallback
}
