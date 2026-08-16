import { eq } from "drizzle-orm"

import { authenticate } from "@/db/auth"
import { db } from "@/db/client"
import { children, subscriptions } from "@/db/schema"

/**
 * `DELETE /api/account` — erase everything this parent's account holds on the server.
 *
 * The account-level counterpart to `DELETE /api/children/:clientId`. `(parent)/delete-account.tsx`
 * tells a parent that deleting their account erases their child profiles, all learning history and
 * their certificates "immediately and permanently". Until this route existed that sentence was
 * false: the screen deleted the Clerk user and three on-device stores, and left every Postgres row
 * standing. See the route file for children for why that class of untruth matters more than a
 * missing feature.
 *
 * Deletes:
 *  - every `children` row for the verified parent, which cascades to that child's `reviews`,
 *    `sessions`, `certificates` and `question_impressions` (all declared `onDelete: "cascade"`)
 *  - the `subscriptions` row, which is keyed by `clerk_user_id` rather than by child so it is not
 *    reached by that cascade. It has no writer today, but erasure must not depend on which features
 *    happen to be wired yet — a row written next year by a billing webhook must be covered by the
 *    promise made to the parent now.
 *
 * `card_reports` is intentionally untouched: it stores no child or parent identifier at all.
 *
 * The parent id comes from the verified token only. There is no request body and no id parameter,
 * so this route cannot be pointed at another account.
 *
 * The Clerk user itself is deleted by the client (it holds the session), and this route must be
 * called FIRST — once the Clerk user is gone the token is void and the server rows become
 * unreachable forever, which is precisely the state this fixes.
 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return Response.json({ ok: false, message: "Not signed in." }, { status: 401 })

    const removedChildren = await db
      .delete(children)
      .where(eq(children.clerkUserId, parent.clerkUserId))
      .returning({ id: children.id })

    await db.delete(subscriptions).where(eq(subscriptions.clerkUserId, parent.clerkUserId))

    return Response.json({ ok: true, childrenDeleted: removedChildren.length })
  } catch (error) {
    console.error("DELETE /api/account failed", error)
    return Response.json({ ok: false, message: "Couldn't delete your account data." }, { status: 500 })
  }
}
