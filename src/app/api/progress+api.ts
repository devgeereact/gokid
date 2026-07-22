import { eq, sql } from "drizzle-orm"

import { authenticate, childFor } from "@/db/auth"
import { db } from "@/db/client"
import { reviews, sessions } from "@/db/schema"

/**
 * Progress sync — `GET/POST /api/progress` (design/gokid-screens.md §14 → "Sync Conflict",
 * "Retry Sync").
 *
 * Until now a child's entire learning record lived only in SecureStore on one device. That is fine
 * until the phone is lost, replaced, or the app reinstalled — at which point months of spaced
 * repetition are gone with no way back. This is the server side of fixing that.
 *
 * ## Conflict policy, stated once
 *
 * **Last-write-wins per card, by `lastReviewedAt`.** A review is a fact with a timestamp, and the
 * later observation of the same card is the better one — a card reviewed on the phone at 5pm should
 * beat the tablet's 2pm record, whichever device syncs second. This avoids a merge UI that a child
 * could never answer and a parent should never be asked.
 *
 * Sessions are append-only and deduplicated by their client id, so replaying the same batch (a retry
 * after a dropped connection) cannot inflate a child's study time — which would quietly corrupt every
 * figure in the Progress section.
 *
 * Every row is scoped to a child resolved from the *verified* parent id. See db/auth.ts.
 */

type IncomingReview = {
  setId: string
  cardId: string
  box: number
  dueAt: number
  lastRating: "tricky" | "gotit"
  lastReviewedAt: number
}

type IncomingSession = {
  id: string
  setId: string
  setTitle: string
  subject: string
  at: number
  cardsReviewed: number
  minutes: number
  score?: number
  scoreTotal?: number
}

// Small helpers so the conflict clause below reads as SQL rather than as Drizzle plumbing.
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`)
}
function sqlRaw(text: string) {
  return sql.raw(text)
}

function unauthorised() {
  return Response.json({ ok: false, message: "Not signed in." }, { status: 401 })
}

/** `GET /api/progress?child=<clientId>` — this child's reviews and sessions. */
export async function GET(request: Request): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return unauthorised()

    const clientId = new URL(request.url).searchParams.get("child") ?? ""
    const child = await childFor(parent, clientId)
    // No row means either no such child or not this parent's — the same answer either way, which is
    // deliberate: a different message would let a caller probe for which ids exist.
    if (!child) return Response.json({ ok: true, reviews: [], sessions: [] })

    const [rows, sessionRows] = await Promise.all([
      db.select().from(reviews).where(eq(reviews.childId, child.id)),
      db.select().from(sessions).where(eq(sessions.childId, child.id)),
    ])

    return Response.json({
      ok: true,
      reviews: rows.map((r) => ({
        setId: r.setId,
        cardId: r.cardId,
        box: r.box,
        dueAt: r.dueAt.getTime(),
        lastRating: r.lastRating,
        lastReviewedAt: r.lastReviewedAt.getTime(),
      })),
      sessions: sessionRows.map((s) => ({
        // Return the device's id, so a client merging this back recognises its own sessions.
        id: s.clientId ?? s.id,
        setId: s.setId,
        setTitle: s.setTitle,
        subject: s.subject,
        at: s.at.getTime(),
        cardsReviewed: s.cardsReviewed,
        minutes: s.minutes,
        score: s.score ?? undefined,
        scoreTotal: s.scoreTotal ?? undefined,
      })),
    })
  } catch (error) {
    // Log server-side; return generic copy. A raw error string is a data-shape leak on a route that
    // serves a named child's record.
    console.error("[api/progress GET] 500", error)
    return Response.json({ ok: false, message: "Couldn’t load progress." }, { status: 500 })
  }
}

/** `POST /api/progress` — upload this device's record. Idempotent; safe to retry. */
export async function POST(request: Request): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return unauthorised()

    const body = (await request.json()) as {
      child?: { clientId?: string; name?: string; yearCode?: string }
      reviews?: IncomingReview[]
      sessions?: IncomingSession[]
    }

    const clientId = body.child?.clientId ?? ""
    const child = await childFor(
      parent,
      clientId,
      body.child?.name && body.child?.yearCode
        ? { name: body.child.name, yearCode: body.child.yearCode }
        : undefined
    )
    if (!child) return Response.json({ ok: false, message: "Unknown child." }, { status: 400 })

    const incomingReviews = Array.isArray(body.reviews) ? body.reviews : []
    const incomingSessions = Array.isArray(body.sessions) ? body.sessions : []

    if (incomingReviews.length > 0) {
      await db
        .insert(reviews)
        .values(
          incomingReviews.map((r) => ({
            childId: child.id,
            setId: r.setId,
            cardId: r.cardId,
            box: r.box,
            dueAt: new Date(r.dueAt),
            lastRating: r.lastRating,
            lastReviewedAt: new Date(r.lastReviewedAt),
          }))
        )
        // Last-write-wins on the card's own timestamp — see the conflict policy above. The `where`
        // is what makes it "latest observation wins" rather than "whoever synced last wins".
        .onConflictDoUpdate({
          target: [reviews.childId, reviews.setId, reviews.cardId],
          set: {
            box: sqlExcluded("box"),
            dueAt: sqlExcluded("due_at"),
            lastRating: sqlExcluded("last_rating"),
            lastReviewedAt: sqlExcluded("last_reviewed_at"),
          },
          setWhere: sqlRaw(`excluded.last_reviewed_at > reviews.last_reviewed_at`),
        })
    }

    if (incomingSessions.length > 0) {
      // Sessions carry a client-generated id; the DB deduplicates on (childId, clientId). Do it in
      // the insert with onConflictDoNothing rather than a read-then-filter: the old select-known-ids
      // approach was check-then-act, so two concurrent retries could both pass the filter and the
      // second insert would hit the unique index and 500 instead of being the intended no-op.
      await db
        .insert(sessions)
        .values(
          incomingSessions.map((s) => ({
            // `id` is a server-side uuid; the device's own id goes in `clientId`, which is what
            // deduplicates a replayed batch. Passing the client id as `id` fails outright — the
            // column is a uuid — and that failure is how sessions silently never synced.
            clientId: s.id,
            childId: child.id,
            setId: s.setId,
            setTitle: s.setTitle,
            subject: s.subject,
            at: new Date(s.at),
            cardsReviewed: s.cardsReviewed,
            minutes: s.minutes,
            score: s.score ?? null,
            scoreTotal: s.scoreTotal ?? null,
          }))
        )
        .onConflictDoNothing({ target: [sessions.childId, sessions.clientId] })
    }

    return Response.json({ ok: true, syncedAt: Date.now() })
  } catch (error) {
    console.error("[api/progress POST] 500", error)
    return Response.json({ ok: false, message: "Couldn’t sync progress." }, { status: 500 })
  }
}
