import { Redirect, Stack } from "expo-router"

import { Splash } from "@/components/splash"
import { useSessionState } from "@/lib/clerk-offline"

/**
 * The authentication guard. Distinct from the passcode gate in `(parent)/_layout.tsx`: this one asks
 * whether a parent is signed in at all, that one keeps a child out of the grown-up area.
 *
 * It goes through `useSessionState` rather than `useAuth().isLoaded` directly, and both gates in the
 * app share that one decision so they cannot disagree. Clerk's `isLoaded` never becomes true with no
 * network, so `if (!isLoaded) return <Splash />` meant a cold start offline never rendered a single
 * screen — including the downloaded sets the app had promised would work with no connection.
 *
 * Redirecting to sign-in stays reserved for Clerk actually reporting a signed-out user, or this
 * device having no record of one. "Clerk has not answered yet" is not the same statement as "you are
 * signed out", and treating it as one would have thrown a signed-in parent back to a sign-in screen
 * that cannot complete without a connection.
 */
export default function AppLayout() {
  const session = useSessionState()

  if (session.status === "loading") return <Splash />
  if (session.status === "signed-out" || session.status === "unreachable") return <Redirect href="/" />

  return <Stack screenOptions={{ headerShown: false }} />
}
