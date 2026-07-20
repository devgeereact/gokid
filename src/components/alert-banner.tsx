import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, Text, View } from "react-native"

import { colors } from "@/design/tokens"

/**
 * Alert / Info banner (design/GoKid-design-system.png §12 → "Alert / Info Banner": tinted card, icon
 * left, bold title, secondary body, dismiss cross top-right).
 *
 * Built for §1 "Authentication Error", which until now went to Sentry and nowhere else — an SSO
 * failure left the parent staring at a button that had simply stopped doing anything. Three tones
 * because the same shape carries all three cases the auth flow needs: a failure, a connectivity
 * warning, and a neutral note.
 */

export type BannerTone = "error" | "warning" | "info"

const TONE: Record<BannerTone, { wash: string; ink: string; tint: string; symbol: SFSymbol }> = {
  error: { wash: "bg-badge-practice", ink: "text-badge-practice-ink", tint: colors.badge["practice-ink"], symbol: "exclamationmark.triangle.fill" },
  warning: { wash: "bg-badge-practice", ink: "text-badge-practice-ink", tint: colors.badge["practice-ink"], symbol: "wifi.slash" },
  info: { wash: "bg-badge-strong", ink: "text-badge-strong-ink", tint: colors.badge["strong-ink"], symbol: "info.circle.fill" },
}

export function AlertBanner({
  tone = "error",
  title,
  body,
  symbol,
  onDismiss,
}: {
  tone?: BannerTone
  title: string
  body?: string
  symbol?: SFSymbol
  onDismiss?: () => void
}) {
  const t = TONE[tone]
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={body ? `${title}. ${body}` : title}
      className={`flex-row items-start rounded-xl px-4 py-3 ${t.wash}`}
    >
      <View className="mt-0.5">
        <SymbolView name={symbol ?? t.symbol} size={18} tintColor={t.tint} weight="semibold" />
      </View>
      <View className="ml-3 flex-1">
        <Text className={`font-text text-body font-bold ${t.ink}`}>{title}</Text>
        {body ? <Text className={`mt-1 font-text text-caption ${t.ink}`}>{body}</Text> : null}
      </View>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          className="ml-2 active:opacity-60"
          hitSlop={10}
          onPress={onDismiss}
        >
          <SymbolView name="xmark" size={14} tintColor={t.tint} weight="semibold" />
        </Pressable>
      ) : null}
    </View>
  )
}
