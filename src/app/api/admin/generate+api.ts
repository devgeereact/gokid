import { eq, sql } from "drizzle-orm"

import { isAdmin } from "@/db/admin-auth"
import { db } from "@/db/client"
import { curriculumObjectives, quizQuestions, studySets } from "@/db/schema"
import { generateQuestions } from "@/lib/openrouter"
import { toStoredColumns } from "@/lib/quiz-validate"
import type { MixedQuestion } from "@/lib/study"

/**
 * Admin-only question generator — `POST /api/admin/generate`.
 *
 * Grows the question pool for one set by asking the model (via lib/openrouter.ts) for questions that
 * test a curriculum objective, then storing the ones that pass validation as `draft`. Draft
 * questions are invisible to children until a human publishes them, so this endpoint can never put
 * unreviewed content in front of a learner — it only fills the review queue.
 *
 * This is the enabler for the "never the same question in 12h" rule: no-repeat serving only works if
 * each topic holds far more questions than a session uses, and hand-authoring that volume is not
 * feasible. Generation is how the pool gets deep enough.
 *
 * Guarded by the shared admin token (db/admin-auth.ts). Server-side only — it spends OpenRouter
 * credit and writes shared content, so it must never be openly callable.
 *
 * Body: { setId: string, count?: number, objectiveId?: string, kinds?: MixedQuestion["kind"][] }
 */

const MAX_COUNT = 25

export async function POST(request: Request): Promise<Response> {
  if (!isAdmin(request)) return Response.json({ ok: false, error: "unauthorised" }, { status: 401 })

  try {
    const body = (await request.json()) as {
      setId?: unknown
      count?: unknown
      objectiveId?: unknown
      kinds?: unknown
    }

    const setId = typeof body.setId === "string" ? body.setId : ""
    if (!setId) return Response.json({ ok: false, error: "setId is required" }, { status: 400 })

    const count =
      typeof body.count === "number" && body.count > 0 ? Math.min(Math.floor(body.count), MAX_COUNT) : 10
    const kinds = Array.isArray(body.kinds)
      ? (body.kinds.filter((k) => typeof k === "string") as MixedQuestion["kind"][])
      : undefined

    const [set] = await db.select().from(studySets).where(eq(studySets.id, setId)).limit(1)
    if (!set) return Response.json({ ok: false, error: "set not found" }, { status: 404 })

    // Resolve the objective spine: an explicit objective row if given, otherwise fall back to the
    // set's own topic + description so generation works before the objectives table is populated.
    let objectiveId: string | null = null
    let objectiveText = `${set.topic}. ${set.description}`
    if (typeof body.objectiveId === "string" && body.objectiveId) {
      const [obj] = await db
        .select()
        .from(curriculumObjectives)
        .where(eq(curriculumObjectives.id, body.objectiveId))
        .limit(1)
      if (!obj) return Response.json({ ok: false, error: "objective not found" }, { status: 404 })
      objectiveId = obj.id
      objectiveText = obj.statement
    }

    const dropped: { index: number; reason: string }[] = []
    const idPrefix = `gen_${setId}_${Date.now()}`
    const generated = await generateQuestions(
      {
        subject: set.subject,
        yearCode: set.yearCode,
        topic: set.topic,
        objective: objectiveText,
        count,
        kinds,
      },
      idPrefix,
      (index, reason) => dropped.push({ index, reason })
    )

    if (generated.length === 0) {
      return Response.json({
        ok: true,
        setId,
        requested: count,
        generated: 0,
        inserted: 0,
        dropped,
      })
    }

    // Append after the current highest position so generated questions do not collide with the seed's
    // ordering. Serving shuffles anyway, but a stable, non-overlapping position keeps admin listing sane.
    const [{ maxPos }] = (await db
      .select({ maxPos: sql<number>`coalesce(max(${quizQuestions.position}), -1)::int` })
      .from(quizQuestions)
      .where(eq(quizQuestions.setId, setId))) as { maxPos: number }[]

    const rows = generated.map((g, i) => {
      const cols = toStoredColumns(g.question)
      return {
        id: g.question.id,
        setId,
        kind: cols.kind,
        prompt: cols.prompt,
        explanation: cols.explanation,
        topic: cols.topic,
        payload: cols.payload,
        // Generated questions are the rich types, not plain study-session MCQ; keep them on mixed.
        mixed: true,
        position: maxPos + 1 + i,
        status: "draft" as const,
        objectiveId,
        difficulty: g.difficulty,
        source: "ai" as const,
      }
    })

    await db.insert(quizQuestions).values(rows).onConflictDoNothing()

    return Response.json({
      ok: true,
      setId,
      requested: count,
      generated: generated.length,
      inserted: rows.length,
      dropped,
      note: "Inserted as draft — review and publish before children see them.",
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
