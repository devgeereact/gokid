import { verifyToken } from "@clerk/backend"
import { and, eq } from "drizzle-orm"

import { children } from "@/db/schema"
import { db } from "@/db/client"

/**
 * Server-side auth for the progress API (design/gokid-screens.md §14 → Sync).
 *
 * Runs in Expo Router `+api.ts` routes only, never in the bundle: it reads `CLERK_SECRET_KEY`, which
 * must not reach a device.
 *
 * ## Why this file exists at all
 *
 * Everything the API served until now was public content — the set catalogue is the same for every
 * user, so it needed no auth. Progress is the opposite: it is a named child's learning record, and an
 * endpoint that accepts a child id and returns their history without checking who is asking is a
 * data-leak by construction.
 *
 * Two separate checks, and both matter:
 *
 *  1. **Authentication** — `verifyToken` validates the Clerk session JWT's signature and expiry.
 *     Without it, anyone can send any user id.
 *  2. **Authorisation** — `childFor` resolves a child by `(clerkUserId, clientId)` *together*. The
 *     parent id comes from the verified token, never from the request body, so a caller cannot reach
 *     another family's child by guessing an id: the lookup simply finds nothing. This is the property
 *     to preserve if these routes are ever refactored.
 */

const secretKey = process.env.CLERK_SECRET_KEY

export type AuthedParent = { clerkUserId: string }

/**
 * Verify the `Authorization: Bearer <token>` header. Returns null when absent or invalid — callers
 * must treat null as 401 and must not fall back to anything.
 */
export async function authenticate(request: Request): Promise<AuthedParent | null> {
  if (!secretKey) {
    // Fail closed. A missing key is a deployment error, and treating it as "allow" would expose
    // every child's record.
    throw new Error("CLERK_SECRET_KEY is not set — refusing to serve an unauthenticated progress API.")
  }
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization")
  if (!header?.startsWith("Bearer ")) return null

  try {
    const claims = await verifyToken(header.slice("Bearer ".length).trim(), { secretKey })
    return claims.sub ? { clerkUserId: claims.sub } : null
  } catch {
    // An invalid or expired token is a routine client condition, not a server fault worth reporting.
    return null
  }
}

/**
 * The child row for this parent's `clientId`, creating it on first sync.
 *
 * Children are authored on the device into Clerk metadata, so the server may be seeing one for the
 * first time. `name`/`yearCode` are accepted from the client because the client is the source of
 * truth for them — but the row is always written under the *verified* parent id, so an upsert can
 * never attach a child to someone else's account.
 */
export async function childFor(
  parent: AuthedParent,
  clientId: string,
  profile?: { name: string; yearCode: string }
): Promise<{ id: string } | null> {
  if (!clientId) return null

  const [existing] = await db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.clerkUserId, parent.clerkUserId), eq(children.clientId, clientId)))
    .limit(1)
  if (existing) return existing
  if (!profile) return null

  const [created] = await db
    .insert(children)
    .values({
      clerkUserId: parent.clerkUserId,
      clientId,
      name: profile.name,
      yearCode: profile.yearCode,
      // The client form collects these; sync does not, and inventing a birthday would be worse than
      // recording that we do not have one here.
      birthMonth: "",
      birthYear: "",
      avatarValue: "fox",
    })
    .returning({ id: children.id })
  return created ?? null
}
