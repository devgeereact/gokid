import { authenticate } from "@/db/auth"
import { cardReports } from "@/db/schema"
import { db } from "@/db/client"

/**
 * Report an incorrect card (design/gokid-screens.md §5 → "Report Incorrect Card").
 *
 * A wrong flashcard in a learning app is not a cosmetic bug — the spaced-repetition engine will keep
 * bringing it back and reinforcing the wrong answer until a human fixes it. So a report is written to
 * the database, where it can be triaged, rather than fired at Sentry and lost among crash noise.
 *
 * Runs server-side only (Expo Router `+api.ts`), so the Neon connection string never reaches the app
 * bundle. No child identifier is accepted or stored: knowing who reported a card adds nothing to
 * fixing it. The reason must be one of the offered options — free text from a child-facing screen is
 * not accepted, and the optional detail field is length-capped rather than trusted.
 *
 * Requires a signed-in parent (`authenticate()` — any valid Clerk session, not a specific one). This
 * was the only content-write route in the API with no auth and no rate limit: an unauthenticated
 * caller could fill `card_reports` with fabricated ids indefinitely. Authentication and
 * identification are two different things, and only one of them was ever the design decision here —
 * the docstring above ("no child identifier… adds nothing") argues against *identification*, not
 * against requiring *a* valid session. Gating on `authenticate()` closes the anonymous-spam surface
 * without storing anything about who reported, which parent it was, or which of their children hit
 * the flashcard: the insert below still carries only `cardId`/`setId`/`reason`/`detail`, exactly as
 * before.
 */

/** Must match the options offered in the report sheet. */
const REASONS = ["wrong-answer", "confusing", "typo", "not-curriculum", "other"] as const

const MAX_DETAIL = 500

export async function POST(request: Request): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return Response.json({ ok: false, message: "Not signed in." }, { status: 401 })

    const body: unknown = await request.json()
    if (typeof body !== "object" || body === null) {
      return Response.json({ ok: false, message: "Expected a JSON object." }, { status: 400 })
    }
    const { cardId, setId, reason, detail } = body as Record<string, unknown>

    if (typeof cardId !== "string" || !cardId || typeof setId !== "string" || !setId) {
      return Response.json({ ok: false, message: "cardId and setId are required." }, { status: 400 })
    }
    if (typeof reason !== "string" || !REASONS.includes(reason as (typeof REASONS)[number])) {
      return Response.json({ ok: false, message: "Unknown reason." }, { status: 400 })
    }
    // Truncate rather than reject: a report that is too long is still a real report, and losing it
    // to a validation error would be the worst outcome for the one thing this endpoint exists to do.
    const trimmed = typeof detail === "string" ? detail.slice(0, MAX_DETAIL) : null

    await db.insert(cardReports).values({
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cardId,
      setId,
      reason,
      detail: trimmed,
    })

    return Response.json({ ok: true })
  } catch (error) {
    // Log server-side; return generic copy — same discipline as progress+api.ts/quiz+api.ts. A raw
    // driver error string would leak the query shape for no benefit to the caller.
    console.error("[api/report-card] 500", error)
    return Response.json({ ok: false, message: "Couldn’t submit this report." }, { status: 500 })
  }
}
