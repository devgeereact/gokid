import { type SFSymbol, SymbolView } from "expo-symbols"
import { Text, View } from "react-native"

/**
 * The one stat tile — a washed icon disc over a label and a value. This shape recurs ~6 times
 * (congratulations, answer-result, set-result, session-summary, calendar) with small differences in
 * disc size and an optional footer chip. The wash and tint arrive as class/token values, matching how
 * the screens already pass them, so no colour literal leaks in.
 */

export type StatTileProps = {
  symbol: SFSymbol
  /** Icon disc wash class, e.g. "bg-gamify-green-wash". */
  wash: string
  /** SF Symbol tint — a colour token value (SymbolView takes a colour prop, not a class). */
  tint: string
  label: string
  value: string
  /** Optional footer line under the value, e.g. "In this set". */
  foot?: string
  /** Footer text tone class, e.g. "text-gamify-green". */
  footTone?: string
}

export function StatTile({ symbol, wash, tint, label, value, foot, footTone = "text-text-secondary" }: StatTileProps) {
  return (
    <View className="flex-1 items-center">
      <View className={`h-14 w-14 items-center justify-center rounded-full ${wash}`}>
        <SymbolView name={symbol} size={26} tintColor={tint} weight="semibold" />
      </View>
      <Text numberOfLines={1} className="mt-3 text-center font-text text-caption text-text-secondary">
        {label}
      </Text>
      <Text className="mt-1 font-text text-h3 font-bold text-ink">{value}</Text>
      {foot ? <Text className={`mt-1 font-text text-caption font-semibold ${footTone}`}>{foot}</Text> : null}
    </View>
  )
}
