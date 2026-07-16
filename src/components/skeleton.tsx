import { useEffect } from "react"
import { View } from "react-native"
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"

/**
 * Loading skeletons (design/GoKid-design-system.png — MVP "Essential System States"). The design
 * references show no skeleton frames, so the shape is inferred: token-grey blocks on the page fill,
 * pulsing opacity 1 → 0.4 → 1 over 1.2s, matching the radius of the real surface they stand in for.
 *
 * `Skeleton` is the primitive; the set/list variants below match the card geometry of the screens
 * they cover so the swap to real content does not shift the layout.
 */

const PULSE_MS = 1200

export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: PULSE_MS / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [opacity])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return <Animated.View accessibilityElementsHidden importantForAccessibility="no" className={`bg-gamify-track ${className ?? ""}`} style={style} />
}

/** Stands in for one "Ready for you" lesson row (study dashboard) / set row. */
export function SetRowSkeleton() {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-border bg-white p-3">
      <Skeleton className="h-14 w-14 rounded-lg" />
      <View className="ml-3 flex-1">
        <Skeleton className="h-4 w-1/2 rounded-sm" />
        <Skeleton className="mt-2 h-3 w-3/4 rounded-sm" />
      </View>
    </View>
  )
}

/** Stands in for a stat tile row (progress / parent dashboards). */
export function StatRowSkeleton() {
  return (
    <View className="flex-row gap-3">
      {[0, 1, 2].map((i) => (
        <View key={i} className="flex-1 rounded-2xl border border-border bg-white p-3">
          <Skeleton className="h-3 w-2/3 rounded-sm" />
          <Skeleton className="mt-2 h-6 w-1/2 rounded-sm" />
          <Skeleton className="mt-2 h-3 w-1/3 rounded-sm" />
        </View>
      ))}
    </View>
  )
}

/** Full-list placeholder — `count` set rows. */
export function SetListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <SetRowSkeleton key={i} />
      ))}
    </View>
  )
}
