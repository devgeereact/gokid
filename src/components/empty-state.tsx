import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, Text, View } from "react-native"

import { colors } from "@/design/tokens"

/**
 * Empty state (MVP "Essential System States"). No design reference covers empties, so the shape is
 * inferred from the surfaces that do exist: a token-washed symbol disc, an h3 title, a secondary
 * body line, and the same pill CTA the dashboard uses. Centred in whatever box it is given.
 */
export function EmptyState({
  symbol,
  title,
  body,
  actionLabel,
  onAction,
}: {
  symbol: SFSymbol
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View className="items-center justify-center px-6 py-10">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-study-wash">
        <SymbolView name={symbol} size={34} tintColor={colors.primary} weight="regular" />
      </View>
      <Text className="mt-5 text-center font-text text-h3 font-bold text-ink">{title}</Text>
      <Text className="mt-2 text-center font-text text-body text-text-secondary">{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="mt-6 h-12 items-center justify-center rounded-full bg-study-teal px-6 active:opacity-90"
          onPress={onAction}
        >
          <Text className="font-text text-body-lg font-bold text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
