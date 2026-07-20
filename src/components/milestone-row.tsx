import { SymbolView } from "expo-symbols"
import { Text, View } from "react-native"

import { colors } from "@/design/tokens"
import { BAR, barPct, type Milestone } from "@/lib/milestones"

/**
 * One milestone row (design/gokid-screens.md §2 → "Child Achievement Profile", §9 → Milestones).
 *
 * Shared by the child's own Milestones tab and the parent-side per-child profile, so the two can
 * never drift into showing the same threshold differently. An unearned milestone shows its real
 * progress and states its criterion; an earned one shows a check. Nothing is a mystery box.
 */
export function MilestoneRow({ m, earned }: { m: Milestone; earned: boolean }) {
  const progress = barPct((m.have / m.need) * 100)
  return (
    <View className="mb-4 flex-row items-center last:mb-0">
      <View className={`h-12 w-12 items-center justify-center rounded-full ${earned ? m.wash : "bg-gamify-tile"}`}>
        <SymbolView
          name={m.symbol}
          size={22}
          tintColor={earned ? m.tint : colors["text-secondary"]}
          weight="semibold"
        />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{m.title}</Text>
        <Text className="mt-0.5 font-text text-body text-text-secondary">{m.sub}</Text>
        {earned ? null : (
          <View className="mt-2 flex-row items-center">
            <View className="mr-3 h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
              <View className={`h-full rounded-full bg-study-teal ${BAR[progress]}`} />
            </View>
            <Text className="font-text text-body font-bold text-ink">
              {Math.min(m.have, m.need)} / {m.need}
            </Text>
          </View>
        )}
      </View>
      {earned ? (
        <View className="ml-2">
          <SymbolView name="checkmark.circle.fill" size={24} tintColor={colors.success} weight="regular" />
        </View>
      ) : null}
    </View>
  )
}
