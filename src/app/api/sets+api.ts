import { asc, count, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { cards, quizQuestions, studySets } from "@/db/schema"

/**
 * Study-set catalogue — the read side of the content API. `GET /api/sets` lists every set with its
 * real card/quiz counts; `GET /api/sets?year=Y3` filters to a year group. This is what the client
 * `useStudySets` seam will fetch once flipped; for now it is proven independently against the seeded
 * database.
 *
 * Public read — content is not per-user, so no auth. Per-child progress (which IS per-user) lives on
 * separate, Clerk-authed routes.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const year = new URL(request.url).searchParams.get("year")

    // Counts come from two grouped aggregates merged in code rather than a correlated subquery —
    // the inline `select count(*) … where set_id = study_sets.id` form did not bind to the outer row
    // and returned 0 for every set. Three round-trips, all correct.
    const [rows, cardCounts, quizCounts] = await Promise.all([
      db
        .select({
          id: studySets.id,
          title: studySets.title,
          subject: studySets.subject,
          topic: studySets.topic,
          yearCode: studySets.yearCode,
          description: studySets.description,
          minutes: studySets.minutes,
        })
        .from(studySets)
        .where(year ? eq(studySets.yearCode, year) : undefined)
        .orderBy(asc(studySets.yearCode), asc(studySets.subject)),
      db.select({ setId: cards.setId, n: count() }).from(cards).groupBy(cards.setId),
      db
        .select({ setId: quizQuestions.setId, n: count() })
        .from(quizQuestions)
        .where(eq(quizQuestions.mixed, false))
        .groupBy(quizQuestions.setId),
    ])

    const cardsBySet = new Map(cardCounts.map((r) => [r.setId, r.n]))
    const quizBySet = new Map(quizCounts.map((r) => [r.setId, r.n]))

    const sets = rows.map((s) => ({
      ...s,
      // Derived from the real row count — never a stored `cardsTotal` that could drift.
      cardsTotal: cardsBySet.get(s.id) ?? 0,
      quizCount: quizBySet.get(s.id) ?? 0,
    }))

    return Response.json({ ok: true, count: sets.length, sets })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
