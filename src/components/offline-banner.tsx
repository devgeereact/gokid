import { router } from "expo-router"
import { SymbolView } from "expo-symbols"
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network"
import { useEffect, useRef, useState } from "react"
import { Pressable, Text, View } from "react-native"

import { colors } from "@/design/tokens"

/**
 * Connectivity banner (MVP → Essential System States → "Offline state", "Network recovery").
 * Subscribes to expo-network: when the connection drops the banner offers the downloaded sets, and
 * when it returns it flips to a "Back online — syncing" confirmation for 2.5s, then hides.
 *
 * The state comes from a listener rather than `useNetworkState()` so the recovery transition is
 * driven by the event itself — the React Compiler (on for this project) rejects deriving it with a
 * setState inside an effect body.
 *
 * No design reference covers the banner, so its shape is inferred: a full-bleed pill in the page
 * gutter, the parent-zone badge tints (practice = offline, strong = recovered), app radius + type.
 */

const RECOVERY_MS = 2500

type Status = "unknown" | "online" | "offline" | "recovered"

export function OfflineBanner() {
  const [status, setStatus] = useState<Status>("unknown")
  // Read inside the listener only — a ref keeps the subscription from re-arming on every change.
  const previous = useRef<Status>("unknown")

  useEffect(() => {
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined

    function apply(reachable: boolean | undefined) {
      // `undefined` means the platform has not decided yet — say nothing rather than flash a banner.
      if (reachable === undefined) return
      const next: Status = reachable ? "online" : "offline"
      const wasOffline = previous.current === "offline"
      previous.current = next

      if (next === "offline") {
        clearTimeout(recoveryTimer)
        setStatus("offline")
        return
      }
      if (!wasOffline) {
        setStatus("online")
        return
      }
      // Only celebrate a recovery we actually watched drop.
      setStatus("recovered")
      recoveryTimer = setTimeout(() => setStatus("online"), RECOVERY_MS)
    }

    getNetworkStateAsync()
      .then((state) => apply(state.isInternetReachable))
      // A failed probe is not evidence of being offline — leave the banner hidden.
      .catch(() => undefined)

    const subscription = addNetworkStateListener((state) => apply(state.isInternetReachable))
    return () => {
      clearTimeout(recoveryTimer)
      subscription.remove()
    }
  }, [])

  if (status === "unknown" || status === "online") return null

  if (status === "recovered") {
    return (
      <View className="mt-2 flex-row items-center rounded-xl bg-badge-strong px-4 py-3">
        <SymbolView
          name="arrow.triangle.2.circlepath"
          size={18}
          tintColor={colors.badge["strong-ink"]}
          weight="semibold"
        />
        <Text className="ml-3 flex-1 font-text text-body font-semibold text-badge-strong-ink">
          Back online — syncing your progress
        </Text>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="You are offline. Open downloaded sets."
      className="mt-2 flex-row items-center rounded-xl bg-badge-practice px-4 py-3 active:opacity-90"
      onPress={() => router.push("/offline")}
    >
      <SymbolView name="wifi.slash" size={18} tintColor={colors.badge["practice-ink"]} weight="semibold" />
      <Text className="ml-3 flex-1 font-text text-body font-semibold text-badge-practice-ink">
        No internet — your downloads still work
      </Text>
      <SymbolView name="chevron.right" size={14} tintColor={colors.badge["practice-ink"]} weight="semibold" />
    </Pressable>
  )
}
