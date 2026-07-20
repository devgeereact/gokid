import * as Haptics from "expo-haptics"
import { Platform } from "react-native"

import { usePreferences } from "./preferences"

/**
 * Haptic feedback (design/gokid-screens.md §12 → General → "Haptics").
 *
 * Why this is worth having in a learning app rather than being a gimmick: rating a card is the
 * moment a child commits to an answer, and the visual confirmation is a small colour change on a
 * button they have just covered with their thumb. A tap confirms it landed without requiring them to
 * see or hear anything — which is the whole point for a child studying with the sound off, or one
 * who cannot hear it at all.
 *
 * Respects the `haptics` preference, and is a no-op on web where the API does not exist. Failures
 * are swallowed deliberately: a device with no haptic engine should not surface an error for
 * something purely supplementary.
 */
export function useHaptics() {
  const { haptics } = usePreferences()
  const enabled = haptics && Platform.OS !== "web"

  return {
    /** A correct answer, or a completed set. */
    success: () => {
      if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
    },
    /** A wrong answer. Deliberately the "warning" pattern, not "error" — getting one wrong while
     *  learning is normal and should not feel like a fault. */
    warning: () => {
      if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined)
    },
    /** A light tick for a selection: flipping a card, picking an option. */
    select: () => {
      if (enabled) void Haptics.selectionAsync().catch(() => undefined)
    },
  }
}
