import { and, asc, eq } from "drizzle-orm"

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
 *
 * The quiz query filters `status = "published"`, matching `GET /api/quiz`. `admin/generate` writes AI
 * questions as `draft` specifically so nothing unreviewed reaches a child — but `lib/downloads.ts`
 * builds an offline download straight from this route's response, and an offline download has no
 * server round-trip to re-check status later. Without this filter, a draft that failed nothing except
 * "not yet reviewed by a human" could still ship to a child's device the moment it existed, even
 * though the live no-repeat quiz path already excludes it correctly.
 */
export async function GET(request: Request, { id }: { id: string }): Promise<Response> {
  try {
    if (!id) return Response.json({ ok: false, message: "Missing set id." }, { status: 400 })

    const [set] = await db.select().from(studySets).where(eq(studySets.id, id)).limit(1)
    if (!set) return Response.json({ ok: false, message: "Set not found." }, { status: 404 })

    const [setCards, setQuestions] = await Promise.all([
      db.select().from(cards).where(eq(cards.setId, id)).orderBy(asc(cards.position)),
      db
        .select()
        .from(quizQuestions)
        .where(and(eq(quizQuestions.setId, id), eq(quizQuestions.status, "published")))
        .orderBy(asc(quizQuestions.position)),
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
      // `prompt` is the question itself, and it used to be left out of this response entirely: a
      // download was written to disk holding option lists and an answer index with nothing to ask the
      // child. `explanation` and `topic` follow it because the review screens read them, and `mixed`
      // because the client keeps plain session MCQs and the richer quiz in two separate arrays — the
      // study session must never be handed a non-MCQ question. Same field set as `GET /api/quiz`, so
      // an offline quiz and an online one are assembled from identical data.
      quiz: setQuestions.map((q) => ({
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        explanation: q.explanation,
        topic: q.topic,
        mixed: q.mixed,
        payload: q.payload,
      })),
    })
  } catch (error) {
    // Log server-side; return generic copy — this is public content with no per-user secrets in it,
    // but the raw driver message still leaks the query/schema shape for no benefit to the caller.
    console.error("[api/sets/:id] 500", error)
    return Response.json({ ok: false, message: "Couldn’t load this set." }, { status: 500 })
  }
}
