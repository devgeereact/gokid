import { asc, eq } from "drizzle-orm"

import { cards, quizQuestions, studySets } from "@/db/schema"
import { db } from "@/db/client"

/**
 * One set with all of its content — `GET /api/sets/:id`.
 *
 * `GET /api/sets` returns the catalogue: titles, subjects and *counts*, which is all a shelf needs.
 * Downloading a set for offline use needs the actual cards and questions, and there was no endpoint
 * that returned them. This is that endpoint, and it is what makes an offline download a real thing
 * rather than a stored title with nothing behind it.
 *
 * Server-side only (Expo Router `+api.ts`), so the Neon connection string never reaches the bundle.
 * Cards and questions come back in their stored `position` order — a set whose cards arrive shuffled
 * would teach a different lesson offline than online.
 */
export async function GET(request: Request, { id }: { id: string }): Promise<Response> {
  try {
    if (!id) return Response.json({ ok: false, message: "Missing set id." }, { status: 400 })

    const [set] = await db.select().from(studySets).where(eq(studySets.id, id)).limit(1)
    if (!set) return Response.json({ ok: false, message: "Set not found." }, { status: 404 })

    const [setCards, setQuestions] = await Promise.all([
      db.select().from(cards).where(eq(cards.setId, id)).orderBy(asc(cards.position)),
      db.select().from(quizQuestions).where(eq(quizQuestions.setId, id)).orderBy(asc(quizQuestions.position)),
    ])

    return Response.json({
      ok: true,
      set: {
        id: set.id,
        title: set.title,
        subject: set.subject,
        topic: set.topic,
        yearCode: set.yearCode,
        description: set.description,
        minutes: set.minutes,
        cardsTotal: setCards.length,
        quizCount: setQuestions.length,
      },
      cards: setCards.map((c) => ({ id: c.id, question: c.question, answer: c.answer })),
      quiz: setQuestions.map((q) => ({ id: q.id, kind: q.kind, payload: q.payload })),
    })
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
