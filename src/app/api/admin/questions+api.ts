import { and, eq, inArray } from "drizzle-orm"

import { isAdmin } from "@/db/admin-auth"
import { db } from "@/db/client"
import { quizQuestions } from "@/db/schema"

/**
 * Admin review queue for generated questions — `GET/POST /api/admin/questions`.
 *
 * The generator (api/admin/generate) writes questions as `draft`, invisible to children. Something
 * has to let a human read those drafts and move the good ones to `published` — without that step the
 * pool never grows and no-repeat serving stays starved. This is that step: the review gate that
 * stands between an LLM's output and a child's screen.
 *
 * GET  ?setId=&status=draft&limit=  — list questions (full content) for review. Defaults to drafts.
 * POST { ids: string[], status: "published" | "rejected" }  — approve or reject specific questions.
 *      Or { setId, from: "draft", status: "published" } to publish a whole set's drafts at once.
 *
 * Guarded by the shared admin token (db/admin-auth.ts). Server-side only.
 */

const STATUSES = ["draft", "published", "rejected"] as const
type Status = (typeof STATUSES)[number]

function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v)
}

export async function GET(request: Request): Promise<Response> {
  if (!isAdmin(request)) return Response.json({ ok: false, error: "unauthorised" }, { status: 401 })

  try {
    const url = new URL(request.url)
    const setId = url.searchParams.get("setId") ?? ""
    const statusParam = url.searchParams.get("status") ?? "draft"
    const status: Status = isStatus(statusParam) ? statusParam : "draft"
    const limitParam = Number(url.searchParams.get("limit"))
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 100

    const where = setId
      ? and(eq(quizQuestions.status, status), eq(quizQuestions.setId, setId))
      : eq(quizQuestions.status, status)

    const rows = await db.select().from(quizQuestions).where(where).limit(limit)

    return Response.json({
      ok: true,
      status,
      count: rows.length,
      questions: rows.map((q) => ({
        id: q.id,
        setId: q.setId,
        kind: q.kind,
        prompt: q.prompt,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        source: q.source,
        payload: q.payload,
      })),
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdmin(request)) return Response.json({ ok: false, error: "unauthorised" }, { status: 401 })

  try {
    const body = (await request.json()) as {
      ids?: unknown
      setId?: unknown
      from?: unknown
      status?: unknown
    }

    if (!isStatus(body.status) || body.status === "draft") {
      return Response.json(
        { ok: false, error: 'status must be "published" or "rejected"' },
        { status: 400 }
      )
    }
    const target: Status = body.status

    // Mode 1: explicit ids.
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const ids = body.ids.filter((x): x is string => typeof x === "string")
      if (ids.length === 0) return Response.json({ ok: false, error: "no valid ids" }, { status: 400 })
      const updated = await db
        .update(quizQuestions)
        .set({ status: target })
        .where(inArray(quizQuestions.id, ids))
        .returning({ id: quizQuestions.id })
      return Response.json({ ok: true, status: target, updated: updated.length })
    }

    // Mode 2: bulk — every question of one status in one set (default source status "draft").
    if (typeof body.setId === "string" && body.setId) {
      const from: Status = isStatus(body.from) ? body.from : "draft"
      const updated = await db
        .update(quizQuestions)
        .set({ status: target })
        .where(and(eq(quizQuestions.setId, body.setId), eq(quizQuestions.status, from)))
        .returning({ id: quizQuestions.id })
      return Response.json({ ok: true, status: target, from, setId: body.setId, updated: updated.length })
    }

    return Response.json(
      { ok: false, error: "provide either ids[] or setId" },
      { status: 400 }
    )
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
