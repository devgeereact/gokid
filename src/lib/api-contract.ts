import type { MixedQuestion } from "@/lib/study-types"

/**
 * The client↔API wire contract: the shapes the routes return, plus the pure reshaping between the
 * server's storage layout and the client's union.
 *
 * Deliberately a LEAF module — types and pure functions only, no `fetch`, no React, no Sentry. The
 * curriculum in `lib/study.ts` reaches this file through `lib/set-content.ts`, and `study.ts` is
 * imported by `api/admin/seed+api.ts`, which runs on Cloudflare Workers. When these lived in
 * `lib/api.ts` that import chain dragged `@sentry/react-native` into the worker bundle, where its
 * module-scope `setInterval` is illegal ("Disallowed operation called within global scope") and the
 * deploy failed outright. Keep this file free of anything with an import side effect.
 *
 * `lib/api.ts` re-exports all three, so client code keeps importing them from there.
 */

/** What `GET /api/sets` returns per set. Content only — a child's progress is layered on separately. */
export type ApiSet = {
  id: string
  title: string
  subject: string
  topic: string
  yearCode: string
  description: string
  minutes: number
  /** Derived server-side from the real row count, so it can never drift from the cards that exist. */
  cardsTotal: number
  quizCount: number
}

/**
 * A no-repeat quiz served for a specific child — `GET /api/quiz` (see api/quiz+api.ts).
 *
 * Unlike `getStudySet`, which returns a set's fixed question list identical for everyone, this asks
 * the server for questions this child has NOT seen in the last 12 hours, already shuffled and with
 * option positions re-randomised. The server owns the no-repeat rule; the client just renders what it
 * is handed. `repeated > 0` means the pool was exhausted inside the window and some questions were
 * re-served — the signal to grow the pool with the generator.
 */
export type ServedQuiz = {
  ok: boolean
  setId: string
  count: number
  repeated: number
  poolSize: number
  questions: {
    id: string
    kind: MixedQuestion["kind"]
    prompt: string
    explanation: string | null
    topic: string | null
    difficulty: number
    payload: Record<string, unknown>
  }[]
}

/**
 * Reassemble a served row into the flat `MixedQuestion` the quiz runner consumes. The server stores
 * the kind-specific fields under `payload` (options/answer, accept, items, pairs …); the client union
 * carries them at the top level, so this is the inverse of the server's `toStoredColumns` split.
 */
export function servedToMixed(row: ServedQuiz["questions"][number]): MixedQuestion {
  const base = {
    id: row.id,
    prompt: row.prompt,
    ...(row.explanation ? { explanation: row.explanation } : {}),
    ...(row.topic ? { topic: row.topic } : {}),
  }
  return { ...base, kind: row.kind, ...row.payload } as MixedQuestion
}
