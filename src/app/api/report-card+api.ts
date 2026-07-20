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
 */

/** Must match the options offered in the report sheet. */
const REASONS = ["wrong-answer", "confusing", "typo", "not-curriculum", "other"] as const

const MAX_DETAIL = 500

export async function POST(request: Request): Promise<Response> {
  try {
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
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
