import { useAuth, useUser } from "@clerk/expo"
import { Redirect } from "expo-router"

import { Splash } from "@/components/splash"
import { useChildren } from "@/lib/children"

/**
 * Entry gate. Hold the splash while Clerk rehydrates, then fork:
 *   signed out            → sign-in
 *   signed in, no child   → add-child (onboarding: a first child is required)
 *   signed in, has child  → who's-studying
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded } = useUser()
  const { children } = useChildren()

  if (!isLoaded || (isSignedIn && !userLoaded)) return <Splash />
  if (!isSignedIn) return <Redirect href="/sign-in" />
  return <Redirect href={children.length > 0 ? "/home" : "/add-child"} />
}
