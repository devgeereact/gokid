import { useUser } from "@clerk/expo"
import { Redirect, router } from "expo-router"
import { useEffect } from "react"

import { EmptyState } from "@/components/empty-state"
import { Splash } from "@/components/splash"
import { SafeAreaView } from "@/components/styled"
import { useChildren } from "@/lib/children"
import { useSessionState } from "@/lib/clerk-offline"
import { useIntroSeen } from "@/lib/intro"
import { isNewAccount, setWelcomeUser, useWelcomeSeen } from "@/lib/welcome"

/**
 * Entry gate. Hold the splash while Clerk rehydrates, then fork:
 *   signed out, first launch     → intro (the launch carousel, once per install)
 *   signed out                   → sign-in
 *   signed in, brand-new account → welcome (account creation success, once)
 *   signed in, no child          → add-child (onboarding: a first child is required)
 *   signed in, has child         → who's-studying
 *
 * The wait for Clerk is bounded (`useSessionState`). It used to be `if (!isLoaded) return <Splash/>`
 * with nothing else, and Clerk's `isLoaded` never becomes true with no network — its bootstrap call
 * hangs rather than failing — so a cold start offline sat on the splash for as long as anyone was
 * willing to watch. The app's whole offline story was unreachable behind it.
 */
export default function Index() {
  const session = useSessionState()
  const { isLoaded: userLoaded, user } = useUser()
  const { children } = useChildren()
  const intro = useIntroSeen()
  const welcome = useWelcomeSeen()

  // The welcome flag is per-account, so the store needs to know which account before it can read it.
  useEffect(() => {
    setWelcomeUser(session.status === "signed-in" && user ? user.id : null)
  }, [session.status, user])

  if (session.status === "loading" || !intro.isLoaded) return <Splash />

  // Clerk is unreachable and this device has never seen a signed-in parent, so there is nothing to
  // fall back to and nothing useful to show: sign-in is SSO-only and cannot complete offline either.
  // Say so, rather than presenting a sign-in button that cannot work.
  if (session.status === "unreachable") return <NoConnection />

  if (session.status === "signed-out") return <Redirect href={intro.seen ? "/sign-in" : "/intro"} />

  // Offline, `userLoaded` is false forever and `welcome` never resolves for a user it cannot name.
  // Both are online-only refinements — a returning parent has seen the welcome screen already, and
  // the fallback path only ever runs for a device that was signed in before.
  if (session.offline) return <Redirect href={children.length > 0 ? "/home" : "/add-child"} />

  if (!userLoaded || !welcome.isLoaded) return <Splash />

  // Both conditions, not either. The flag alone would re-welcome a long-standing parent who deleted
  // their last child; the age check alone would re-welcome a new parent on every launch until they
  // added one. Together they mean exactly one showing, to an account that really was just created.
  if (!welcome.seen && isNewAccount(user?.createdAt ?? null)) return <Redirect href="/welcome" />

  return <Redirect href={children.length > 0 ? "/home" : "/add-child"} />
}

/**
 * The honest dead end: no connection, and no previous session on this device to open the app with.
 * Retrying is the only useful action, and it is the one offered — signing in needs Apple or Google,
 * which needs a connection, so a sign-in button here would be a control that cannot do what it says.
 */
function NoConnection() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background">
      <EmptyState
        symbol="wifi.slash"
        title="No connection"
        body="GoKid needs the internet to sign you in for the first time. Once you're signed in, downloaded sets work offline."
        actionLabel="Try again"
        onAction={() => router.replace("/")}
      />
    </SafeAreaView>
  )
}
