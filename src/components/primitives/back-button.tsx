import { router } from "expo-router"
import { SymbolView } from "expo-symbols"
import { Pressable } from "react-native"

import { colors } from "@/design/tokens"

/**
 * The header back chevron. This exact `-ml-2 h-11 w-11 … chevron.left` Pressable is hand-rolled at
 * the top of nearly every pushed screen; here once. Defaults to `router.back()`, with a safe fallback
 * so a screen reached by a cold deep link (no history) still has a way out instead of trapping.
 */
export type BackButtonProps = {
  onPress?: () => void
  /** Where to land when there is no navigation history. */
  fallback?: "/home"
  size?: number
}

export function BackButton({ onPress, fallback = "/home", size = 24 }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
      hitSlop={8}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)))}
    >
      <SymbolView name="chevron.left" size={size} tintColor={colors.ink} weight="semibold" />
    </Pressable>
  )
}
