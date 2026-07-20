import { sql } from "drizzle-orm"

import { db } from "@/db/client"
import { cards, quizQuestions, studySets } from "@/db/schema"
import { STUDY_SETS } from "@/lib/study"

/**
 * One-shot content seed: loads the curriculum from `lib/study.ts` and writes the text into Postgres.
 * It runs in the Expo SERVER bundle, where Metro resolves the set's image `require(...)` calls to
 * asset descriptors — so importing the content module works here even though a plain-node script
 * (which can't require a PNG) can't. Images are ignored on purpose: they move to ImageKit later, so
 * only text lands in the DB.
 *
 * Idempotent — every insert is `onConflictDoNothing`, so re-running tops up without duplicating.
 * Guarded: a seed endpoint must never be openly writable, so it only runs on a local dev server or
 * with the admin token. This is scaffolding for the migration, not a public route.
 */
function authorised(request: Request): boolean {
  // Fail closed. Keying the open path off `NODE_ENV !== "production"` would leave the route
  // world-writable on any hosted deployment whose runtime does not set NODE_ENV to exactly
  // "production" — a preview deploy, say. Only an explicit "development" opens it, and once
  // ADMIN_SEED_TOKEN is set the token is required everywhere, including locally.
  const token = process.env.ADMIN_SEED_TOKEN
  if (token) return request.headers.get("x-admin-token") === token
  return process.env.NODE_ENV === "development"
}

export async function POST(request: Request): Promise<Response> {
  if (!authorised(request)) return Response.json({ ok: false, error: "unauthorised" }, { status: 401 })

  try {
    // Collect every row first, then bulk-insert each table in ONE statement. The neon-http driver
    // makes one HTTP round-trip per query, so per-row inserts meant ~400 serial round-trips and the
    // request timed out. Three bulk inserts is three round-trips.
    const setRows: (typeof studySets.$inferInsert)[] = []
    const cardRows: (typeof cards.$inferInsert)[] = []
    const quizRows: (typeof quizQuestions.$inferInsert)[] = []

    for (const set of STUDY_SETS) {
      setRows.push({
        id: set.id,
        title: set.title,
        subject: set.subject,
        topic: set.topic,
        yearCode: set.yearCode,
        description: set.description,
        minutes: set.minutes,
        mastered: set.mastered,
        revisit: set.revisit,
      })

      set.cards.forEach((c, i) =>
        cardRows.push({ id: c.id, setId: set.id, question: c.question, answer: c.answer, position: i })
      )

      // Plain MCQ quiz — the study-session questions (mixed = false).
      set.quiz.forEach((q, i) =>
        quizRows.push({
          id: q.id,
          setId: set.id,
          kind: "mcq",
          prompt: q.prompt,
          explanation: q.explanation ?? null,
          topic: q.topic ?? null,
          payload: { options: q.options, answer: q.answer },
          mixed: false,
          position: i,
        })
      )

      // Richer mixedQuiz — kind-tagged payloads (mixed = true).
      ;(set.mixedQuiz ?? []).forEach((q, i) => {
        const { id, prompt, explanation, topic, kind, ...rest } = q
        quizRows.push({
          id,
          setId: set.id,
          kind,
          prompt,
          explanation: explanation ?? null,
          topic: topic ?? null,
          payload: rest as Record<string, unknown>,
          mixed: true,
          position: i,
        })
      })
    }

    if (setRows.length) await db.insert(studySets).values(setRows).onConflictDoNothing()
    if (cardRows.length) await db.insert(cards).values(cardRows).onConflictDoNothing()
    if (quizRows.length) await db.insert(quizQuestions).values(quizRows).onConflictDoNothing()
    const setCount = setRows.length
    const cardCount = cardRows.length
    const quizCount = quizRows.length

    const totals = (
      await db.execute(sql`select
        (select count(*)::int from study_sets) as sets,
        (select count(*)::int from cards) as cards,
        (select count(*)::int from quiz_questions) as quiz`)
    ).rows[0] as { sets: number; cards: number; quiz: number }

    return Response.json({
      ok: true,
      inserted: { sets: setCount, cards: cardCount, quiz: quizCount },
      totals,
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
