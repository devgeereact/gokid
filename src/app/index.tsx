import { useAuth, useUser } from "@clerk/expo"
import { Redirect } from "expo-router"

import { Splash } from "@/components/splash"
import { useChildren } from "@/lib/children"
import { useIntroSeen } from "@/lib/intro"

/**
 * Entry gate. Hold the splash while Clerk rehydrates, then fork:
 *   signed out, first launch → intro (the launch carousel, once per install)
 *   signed out               → sign-in
 *   signed in, no child      → add-child (onboarding: a first child is required)
 *   signed in, has child     → who's-studying
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded } = useUser()
  const { children } = useChildren()
  const intro = useIntroSeen()

  if (!isLoaded || (isSignedIn && !userLoaded) || !intro.isLoaded) return <Splash />
  if (!isSignedIn) return <Redirect href={intro.seen ? "/sign-in" : "/intro"} />
  return <Redirect href={children.length > 0 ? "/home" : "/add-child"} />
}
