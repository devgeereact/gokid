import { Stack } from "expo-router"

import { ParentGate } from "@/components/parent-gate"
import { useParentGate } from "@/lib/parent-gate"

/**
 * Guard for the parent zone. Every route in this group — settings, children, paywall, the dashboard
 * and analytics — mounts through here, so a locked gate blocks all of them at once, including a cold
 * deep link straight to `gokid://settings`. This mirrors the `(app)` auth guard one level up: same
 * pattern, one gate instead of a sign-in redirect.
 *
 * The group is path-transparent — `(parent)` adds no URL segment — so the routes keep their existing
 * paths (`/settings`, `/paywall`, …). What changed is that reaching any of them now requires passing
 * the gate first; previously nothing did.
 */
export default function ParentLayout() {
  const { unlocked } = useParentGate()

  if (!unlocked) return <ParentGate />

  return <Stack screenOptions={{ headerShown: false }} />
}
