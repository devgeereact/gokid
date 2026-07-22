import { and, eq } from "drizzle-orm"

import { authenticate, childFor } from "@/db/auth"
import { db } from "@/db/client"
import { questionImpressions, quizQuestions } from "@/db/schema"

/**
 * Child-aware quiz serving — `GET /api/quiz?setId=&clientId=&count=`.
 *
 * This is the endpoint the product rule lives in: "a child must not see the same question twice
 * within 12 hours." `GET /api/sets/:id` serves a set's questions in fixed order, identical for every
 * user — fine for an offline download, wrong for a live quiz, because a child would meet the same
 * five questions every session and be answering from memory of the last screen, not from recall.
 *
 * Here, the question set is chosen *for this child*: anything they have seen in the last 12 hours is
 * excluded, the remainder is shuffled, and each served question's options are re-shuffled so a right
 * answer can't be a memorised position. When the whole eligible pool has been seen inside the window
 * — a small pool, or a very keen child — it re-serves the questions seen longest ago rather than
 * blocking practice (product decision). That "allow oldest-seen to repeat" fallback is why a deep,
 * generated pool matters: the deeper the pool, the rarer any repeat.
 *
 * Auth: requires a verified Clerk parent (via db/auth). The child is resolved by (verified parent,
 * clientId) so a caller can only ever serve their own child's queue. Only `published` questions are
 * eligible — drafts from the generator never reach a child here.
 */

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
const MAX_COUNT = 20

type Row = typeof quizQuestions.$inferSelect

/** Fisher–Yates over an index array — used both to pick questions and to re-order options. */
function shuffledIndices(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

/**
 * Re-shuffle the options of an mcq/multi question and remap the answer index/indices to match, so the
 * correct answer sits in a different place each time the question is served. Other kinds (fill, order,
 * match) carry no positional answer here — the client shuffles their display order — so they pass
 * through untouched.
 */
function reshuffleOptions(kind: Row["kind"], payload: Record<string, unknown>): Record<string, unknown> {
  if (kind !== "mcq" && kind !== "multi") return payload
  const options = payload.options
  if (!Array.isArray(options) || options.length < 2) return payload

  const order = shuffledIndices(options.length)
  const newOptions = order.map((i) => options[i])
  // inverse[originalIndex] = new position
  const inverse = new Map<number, number>()
  order.forEach((orig, pos) => inverse.set(orig, pos))

  if (kind === "mcq") {
    const answer = payload.answer
    const mapped = typeof answer === "number" ? inverse.get(answer) : undefined
    return { ...payload, options: newOptions, answer: mapped ?? answer }
  }
  // multi
  const answers = Array.isArray(payload.answers) ? payload.answers : []
  const mapped = answers.map((a) => (typeof a === "number" ? inverse.get(a) ?? a : a))
  return { ...payload, options: newOptions, answers: mapped }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return Response.json({ ok: false, message: "Not signed in." }, { status: 401 })

    const url = new URL(request.url)
    const setId = url.searchParams.get("setId") ?? ""
    const clientId = url.searchParams.get("clientId") ?? ""
    const countParam = Number(url.searchParams.get("count"))
    const count = Number.isFinite(countParam) && countParam > 0 ? Math.min(countParam, MAX_COUNT) : 8

    if (!setId || !clientId) {
      return Response.json({ ok: false, message: "setId and clientId are required." }, { status: 400 })
    }

    // Existing child only — serving a no-repeat queue needs a real child to track impressions against.
    // (Sync creates the child; a quiz for an unknown child is a client bug, not a row to invent here.)
    const child = await childFor(parent, clientId)
    if (!child) return Response.json({ ok: false, message: "Unknown child." }, { status: 404 })

    // The eligible pool: published questions for this set. Drafts are excluded by construction.
    const pool = await db
      .select()
      .from(quizQuestions)
      .where(and(eq(quizQuestions.setId, setId), eq(quizQuestions.status, "published")))
    if (pool.length === 0) {
      return Response.json({ ok: false, message: "No questions available for this set." }, { status: 404 })
    }

    // This child's impressions for this set. servedAt lets us both apply the 12h window and, if the
    // whole pool is inside it, order the fallback by who was seen longest ago.
    const impressions = await db
      .select({ questionId: questionImpressions.questionId, servedAt: questionImpressions.servedAt })
      .from(questionImpressions)
      .where(and(eq(questionImpressions.childId, child.id), eq(questionImpressions.setId, setId)))
    const seenAt = new Map<string, number>()
    for (const im of impressions) seenAt.set(im.questionId, im.servedAt.getTime())

    const now = Date.now()
    const cutoff = now - TWELVE_HOURS_MS

    // Fresh = never seen or last seen before the 12h window. These are served first, shuffled.
    const fresh = pool.filter((q) => (seenAt.get(q.id) ?? 0) <= cutoff)
    // Recent = seen inside the window. Only drawn on if `fresh` can't fill the request, oldest first.
    const recent = pool
      .filter((q) => (seenAt.get(q.id) ?? 0) > cutoff)
      .sort((a, b) => (seenAt.get(a.id) ?? 0) - (seenAt.get(b.id) ?? 0))

    const freshOrder = shuffledIndices(fresh.length).map((i) => fresh[i])
    const chosen: Row[] = freshOrder.slice(0, count)
    let repeated = 0
    if (chosen.length < count) {
      const topUp = recent.slice(0, count - chosen.length)
      repeated = topUp.length
      chosen.push(...topUp)
    }

    // Record an impression for everything served — upsert so a repeat just bumps servedAt.
    if (chosen.length > 0) {
      const served = new Date(now)
      await db
        .insert(questionImpressions)
        .values(chosen.map((q) => ({ childId: child.id, questionId: q.id, setId, servedAt: served })))
        .onConflictDoUpdate({
          target: [questionImpressions.childId, questionImpressions.questionId],
          set: { servedAt: served, setId },
        })
    }

    return Response.json({
      ok: true,
      setId,
      count: chosen.length,
      // Signals for the client / analytics: how many served questions were forced repeats because the
      // pool was exhausted inside the window. A non-zero value here is the "grow the pool" signal.
      repeated,
      poolSize: pool.length,
      questions: chosen.map((q) => ({
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        payload: reshuffleOptions(q.kind, q.payload),
      })),
    })
  } catch (error) {
    // Log the real error to the server console (captured by the host's logs); never return it to the
    // client — a raw DB/driver message is an information leak on an unauthenticated-reachable route.
    console.error("[api/quiz] 500", error)
    return Response.json({ ok: false, message: "Something went wrong serving this quiz." }, { status: 500 })
  }
}
