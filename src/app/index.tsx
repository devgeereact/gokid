import { useAuth, useUser } from "@clerk/expo"
import { Redirect } from "expo-router"
import { useEffect } from "react"

import { Splash } from "@/components/splash"
import { useChildren } from "@/lib/children"
import { useIntroSeen } from "@/lib/intro"
import { isNewAccount, setWelcomeUser, useWelcomeSeen } from "@/lib/welcome"

/**
 * Entry gate. Hold the splash while Clerk rehydrates, then fork:
 *   signed out, first launch     → intro (the launch carousel, once per install)
 *   signed out                   → sign-in
 *   signed in, brand-new account → welcome (account creation success, once)
 *   signed in, no child          → add-child (onboarding: a first child is required)
 *   signed in, has child         → who's-studying
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded, user } = useUser()
  const { children } = useChildren()
  const intro = useIntroSeen()
  const welcome = useWelcomeSeen()

  // The welcome flag is per-account, so the store needs to know which account before it can read it.
  useEffect(() => {
    setWelcomeUser(isSignedIn && user ? user.id : null)
  }, [isSignedIn, user])

  if (!isLoaded || (isSignedIn && !userLoaded) || !intro.isLoaded) return <Splash />
  if (!isSignedIn) return <Redirect href={intro.seen ? "/sign-in" : "/intro"} />
  if (!welcome.isLoaded) return <Splash />

  // Both conditions, not either. The flag alone would re-welcome a long-standing parent who deleted
  // their last child; the age check alone would re-welcome a new parent on every launch until they
  // added one. Together they mean exactly one showing, to an account that really was just created.
  if (!welcome.seen && isNewAccount(user?.createdAt ?? null)) return <Redirect href="/welcome" />

  return <Redirect href={children.length > 0 ? "/home" : "/add-child"} />
}
