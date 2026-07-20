import type { MixedQuestion } from "@/lib/study"

/**
 * Runtime validation for a `MixedQuestion` coming from an untrusted source — specifically the AI
 * generator (see lib/openrouter.ts). The TypeScript union in lib/study.ts is a compile-time promise;
 * an LLM's JSON is a runtime unknown, and a malformed question that reaches a child is exactly the
 * harm the whole review pipeline exists to prevent. So nothing generated is trusted until it has
 * passed through here.
 *
 * The checks are deliberately strict about *answerability*, not just shape: an `mcq` whose `answer`
 * points outside `options`, a `match` with a duplicated side, an `order` with one item — these parse
 * as objects but cannot be answered correctly, so they are rejected, not stored. Throwing (rather
 * than returning null) means the generator can attribute the failure to a specific question and drop
 * it while keeping the rest of the batch.
 */

export class QuestionValidationError extends Error {}

function fail(msg: string): never {
  throw new QuestionValidationError(msg)
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) fail("question is not an object")
  return raw as Record<string, unknown>
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string" || v.trim() === "") fail(`${field} must be a non-empty string`)
  return v
}

function asStringArray(v: unknown, field: string, min: number): string[] {
  if (!Array.isArray(v) || v.length < min) fail(`${field} must be an array of at least ${min}`)
  return v.map((x, i) => asString(x, `${field}[${i}]`))
}

function asIndex(v: unknown, field: string, len: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= len) {
    fail(`${field} must be an integer index into a length-${len} array`)
  }
  return v
}

/** The optional base fields shared by every kind. `illustration` is never generated (no images yet). */
function base(r: Record<string, unknown>): { prompt: string; explanation?: string; topic?: string } {
  const out: { prompt: string; explanation?: string; topic?: string } = {
    prompt: asString(r.prompt, "prompt"),
  }
  if (r.explanation !== undefined) out.explanation = asString(r.explanation, "explanation")
  if (r.topic !== undefined) out.topic = asString(r.topic, "topic")
  return out
}

/**
 * Validate one raw question and return it as a `MixedQuestion` carrying the supplied `id`. The id is
 * assigned by the caller, not taken from the model — an LLM cannot be trusted to produce a unique,
 * collision-free primary key.
 */
export function validateMixedQuestion(raw: unknown, id: string): MixedQuestion {
  const r = asRecord(raw)
  const b = base(r)

  switch (r.kind) {
    case "mcq": {
      const options = asStringArray(r.options, "options", 2)
      const answer = asIndex(r.answer, "answer", options.length)
      return { id, kind: "mcq", ...b, options, answer }
    }
    case "multi": {
      const options = asStringArray(r.options, "options", 2)
      if (!Array.isArray(r.answers) || r.answers.length < 1) fail("answers must be a non-empty array")
      const answers = [...new Set(r.answers.map((a, i) => asIndex(a, `answers[${i}]`, options.length)))]
      if (answers.length === options.length) fail("multi cannot mark every option correct")
      return { id, kind: "multi", ...b, options, answers }
    }
    case "fill": {
      const accept = asStringArray(r.accept, "accept", 1)
      return { id, kind: "fill", ...b, accept }
    }
    case "order": {
      const items = asStringArray(r.items, "items", 2)
      if (new Set(items).size !== items.length) fail("order items must be distinct")
      return { id, kind: "order", ...b, items }
    }
    case "match": {
      if (!Array.isArray(r.pairs) || r.pairs.length < 2) fail("pairs must have at least 2 entries")
      const pairs = r.pairs.map((p, i) => {
        const pr = asRecord(p)
        return { left: asString(pr.left, `pairs[${i}].left`), right: asString(pr.right, `pairs[${i}].right`) }
      })
      if (new Set(pairs.map((p) => p.left)).size !== pairs.length) fail("match left sides must be distinct")
      if (new Set(pairs.map((p) => p.right)).size !== pairs.length) fail("match right sides must be distinct")
      return { id, kind: "match", ...b, pairs }
    }
    default:
      return fail(`unknown kind: ${JSON.stringify(r.kind)}`)
  }
}

/**
 * Split a validated `MixedQuestion` into the (kind, prompt, explanation, topic, payload) shape the
 * `quiz_questions` table stores — the same decomposition the seed route uses, so generated and
 * hand-authored rows are indistinguishable to the serving endpoint.
 */
export function toStoredColumns(q: MixedQuestion): {
  kind: MixedQuestion["kind"]
  prompt: string
  explanation: string | null
  topic: string | null
  payload: Record<string, unknown>
} {
  const { id: _id, kind, prompt, explanation, topic, illustration: _ill, ...rest } = q
  return {
    kind,
    prompt,
    explanation: explanation ?? null,
    topic: topic ?? null,
    payload: rest as Record<string, unknown>,
  }
}
