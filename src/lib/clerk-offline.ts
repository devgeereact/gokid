import { useAuth } from "@clerk/expo"
import { useEffect, useState } from "react"

import { useCachedSession } from "./session-cache"

/**
 * How long to hold the splash for Clerk before falling back to what this device already knows.
 *
 * Online, Clerk loads in well under a second, so this is never reached on a healthy launch. Offline
 * it is never reached *at all* — `isLoaded` does not go false-then-true, it simply never resolves —
 * which is why a timeout is the only way out. Four seconds is long enough that a slow-but-working
 * connection is not treated as an outage, and short enough that a child on a train is not staring
 * at a lion wondering whether the app is broken.
 */
const CLERK_GRACE_MS = 4_000

export type SessionState =
  /** Clerk has not answered yet and the grace period has not expired. Show the splash. */
  | { status: "loading" }
  /** Clerk answered, or the cache stands in for it: there is a parent signed in on this device. */
  | { status: "signed-in"; offline: boolean }
  /** Clerk answered, or the cache stands in for it: nobody is signed in. */
  | { status: "signed-out"; offline: boolean }
  /** Clerk cannot answer and this device has never seen a signed-in parent. Nothing to fall back to. */
  | { status: "unreachable" }

/**
 * The one place that decides whether the app may open, used by both gates so they cannot disagree.
 *
 * Before this existed, `app/index.tsx` and `app/(app)/_layout.tsx` each did
 * `if (!isLoaded) return <Splash />`, and Clerk's `isLoaded` never becomes true with no network. A
 * cold start offline therefore sat on the splash indefinitely — the app's offline downloads worked
 * perfectly and could not be reached. See lib/session-cache.ts for why the fallback is safe.
 */
export function useSessionState(): SessionState {
  const { isLoaded, isSignedIn } = useAuth()
  const cached = useCachedSession()
  const [graceExpired, setGraceExpired] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    const timer = setTimeout(() => setGraceExpired(true), CLERK_GRACE_MS)
    return () => clearTimeout(timer)
  }, [isLoaded])

  // Clerk answered. Its word is final, and the cache is being kept current by `useChildren`.
  if (isLoaded) return { status: isSignedIn ? "signed-in" : "signed-out", offline: false }

  // Still within the grace period, or the cache itself has not been read off disk yet.
  if (!graceExpired || !cached.isLoaded) return { status: "loading" }

  if (!cached.session) return { status: "unreachable" }
  return { status: cached.session.signedIn ? "signed-in" : "signed-out", offline: true }
}

/**
 * `getToken()` with a deadline, for the places that only want a token as an *enhancement*.
 *
 * Clerk's `getToken` does not fail offline — it hangs, the same way its bootstrap does. The quiz
 * runner awaited it before fetching a no-repeat draw and then fell back to the set's own questions
 * "on any failure"; with no network there was never a failure to fall back from, so the quiz sat on
 * its loading spinner forever. A child with a downloaded set could open the quiz and never be given
 * a question — an infinite spinner in place of content the app had promised worked offline.
 *
 * Returns null instead of throwing: every caller here treats "no token" as a reason to use the local
 * path, which is exactly what a null means.
 */
export async function tokenWithin(
  getToken: () => Promise<string | null>,
  ms = 5_000
): Promise<string | null> {
  return Promise.race([
    getToken().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}
