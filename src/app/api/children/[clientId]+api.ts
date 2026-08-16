import { and, eq } from "drizzle-orm"

import { authenticate } from "@/db/auth"
import { db } from "@/db/client"
import { children } from "@/db/schema"

/**
 * `DELETE /api/children/:clientId` — erase a child's server-side record.
 *
 * ## Why this route had to exist
 *
 * Deleting a child used to remove one entry from the parent's Clerk `unsafeMetadata` and nothing
 * else. The Postgres `children` row — created lazily by `db/auth.ts:childFor` the first time that
 * child synced — survived, and with it every `reviews`, `sessions`, `certificates` and
 * `question_impressions` row hanging off it. There was no `DELETE` anywhere in the codebase, so the
 * data was not merely orphaned: it was unreachable and unremovable, sitting on a server after a
 * parent had been told their child's record was gone.
 *
 * That made `(parent)/delete-account.tsx`'s promise — "erases everything below, immediately and
 * permanently" — untrue, which is a different order of problem from a missing feature: it is a
 * factual claim to a parent about a child's data, and the kind of claim the UK Children's Code and
 * GDPR Article 17 attach to.
 *
 * ## How the erasure is complete
 *
 * One `DELETE` on `children` is enough. Every table that references a child does so with
 * `onDelete: "cascade"` (see db/schema.ts — reviews:208, question_impressions:241, sessions:271,
 * certificates:296), so Postgres removes the dependent rows in the same statement. Deleting them
 * individually first would be slower and could half-succeed; the cascade is atomic.
 *
 * `card_reports` is deliberately NOT touched: it stores no child identifier by design (schema.ts),
 * so there is nothing in it to erase and nothing to link back to a person.
 *
 * ## Authorisation
 *
 * The child is resolved by `(verified parent, clientId)` together, exactly as `childFor` does for
 * reads. The parent id comes from the verified Clerk token and never from the request, so a caller
 * cannot delete another family's child by guessing an id — the `where` simply matches nothing.
 *
 * A `clientId` that does not exist returns `200 { deleted: false }` rather than 404. Deletion is
 * idempotent (a retry after a dropped connection must not fail), and a distinct "no such child"
 * answer would let a caller probe which ids exist.
 */
export async function DELETE(request: Request, { clientId }: { clientId: string }): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return Response.json({ ok: false, message: "Not signed in." }, { status: 401 })

    if (!clientId) return Response.json({ ok: false, message: "Missing child id." }, { status: 400 })

    const removed = await db
      .delete(children)
      .where(and(eq(children.clerkUserId, parent.clerkUserId), eq(children.clientId, clientId)))
      .returning({ id: children.id })

    return Response.json({ ok: true, deleted: removed.length > 0 })
  } catch (error) {
    // Log server-side, return generic — the same discipline progress+api.ts uses, so a driver error
    // never reaches a client. Reported rather than swallowed (AGENTS.md §3).
    console.error("DELETE /api/children failed", error)
    return Response.json({ ok: false, message: "Couldn't delete that child." }, { status: 500 })
  }
}
