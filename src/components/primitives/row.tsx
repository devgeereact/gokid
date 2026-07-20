import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, Text, View } from "react-native"

import { colors } from "@/design/tokens"

/**
 * The one settings/list row. `Row` was redefined in settings.tsx, parent-content.tsx and parent.tsx
 * (as `ChildRow`) — same leading icon, label, optional trailing value, optional chevron. This is the
 * settings.tsx shape (the fullest of the three) lifted verbatim.
 *
 * A tappable row renders a chevron and reports as a button; a static row (no `onPress`) renders
 * neither, so the same primitive serves both the "Notifications ›" and the "Billing  Apple" rows.
 */

export type RowProps = {
  symbol: SFSymbol
  label: string
  /** Trailing value text, e.g. a plan name or a count. */
  value?: string
  /** Draw a bottom hairline — for stacking rows inside one card. */
  border?: boolean
  destructive?: boolean
  onPress?: () => void
}

export function Row({ symbol, label, value, border, destructive, onPress }: RowProps) {
  const tint = destructive ? colors.error : colors.ink
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      className={`h-14 flex-row items-center ${onPress ? "active:opacity-60" : ""} ${border ? "border-b border-border" : ""}`}
    >
      <SymbolView name={symbol} size={24} tintColor={tint} weight="regular" />
      <Text className={`ml-4 flex-1 font-text text-body-lg font-semibold ${destructive ? "text-error" : "text-ink"}`}>
        {label}
      </Text>
      {value ? <Text className="mr-2 font-text text-body-lg font-bold text-text-secondary">{value}</Text> : null}
      {onPress ? (
        <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
      ) : (
        <View className="w-0" />
      )}
    </Pressable>
  )
}
