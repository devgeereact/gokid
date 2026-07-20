import { addNetworkStateListener, getNetworkStateAsync } from "expo-network"
import { useEffect, useState } from "react"

/**
 * Connectivity, as a hook (design/gokid-screens.md §1 → "Internet Required for First Login").
 *
 * `components/offline-banner.tsx` already tracked this, but privately — the sign-in screen could not
 * see it, so a parent with no connection tapped "Continue with Apple", watched the OAuth sheet fail
 * to load, and got nothing back. The listener lives here now and both callers share it.
 *
 * Three states, not two. `null` means the platform has not decided yet: never block a parent on a
 * verdict we do not have. Callers gate on `=== false`, never on falsiness.
 */
export function useIsOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    const apply = (reachable: boolean | undefined) => {
      if (active && reachable !== undefined) setOnline(reachable)
    }

    getNetworkStateAsync()
      .then((state) => apply(state.isInternetReachable))
      // A failed probe is not evidence of being offline — stay undecided rather than lock the UI.
      .catch(() => undefined)

    const subscription = addNetworkStateListener((state) => apply(state.isInternetReachable))
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return online
}
