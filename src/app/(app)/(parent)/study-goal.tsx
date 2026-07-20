import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { duration } from "@/lib/analytics"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { setPreference, usePreferences } from "@/lib/preferences"
import { useProgress } from "@/lib/reviews"
import { statisticsFor } from "@/lib/mastery-timeline"

/**
 * Daily Study Goal (design/gokid-screens.md §10 → Settings → "Daily Study Goal").
 *
 * The design decision that matters here is that the goal is **off by default and stays optional**.
 * §9 rejected streaks and leaderboards because they manufacture pressure; a daily minute target is
 * the same mechanic wearing a parent's face. It ships because some parents genuinely want a shape to
 * the week, and it ships with hard limits on how it may behave:
 *
 *  - Nothing counts down to it, and no screen tells a child they are behind.
 *  - Missing it is never reported as a loss — a day with no session simply has no session.
 *  - It is parent-set, in the parent area, because a child setting their own target is how a target
 *    becomes a source of guilt.
 *
 * The suggested figures come from the child's own recent average rather than a number picked to look
 * ambitious, so a parent is choosing near what already happens rather than against it.
 */

const OPTIONS = [0, 5, 10, 15, 20, 30] as const

export default function StudyGoal() {
  const { dailyGoalMinutes } = usePreferences()
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]
  const { cards, sessions } = useProgress(childId)
  const { sets } = useSets(child?.yearGroup)
  const stats = statisticsFor(cards, sessions, sets)

  const name = child?.name ?? "your child"
  // What actually happens, so the parent picks against reality rather than an aspiration.
  const typical = stats.daysStudied > 0 ? Math.round(stats.minutes / stats.daysStudied) : null

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Daily study goal</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-body-lg text-text-secondary">
          A gentle target for {name}. Optional, and off unless you choose one.
        </Text>

        {typical !== null ? (
          <View className="mt-4 flex-row items-center rounded-2xl border border-border bg-white p-4">
            <SymbolView name="chart.bar" size={18} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body text-text-secondary">
              On the days {name} studies, it is usually about {duration(typical)}.
            </Text>
          </View>
        ) : null}

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Minutes a day</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          {OPTIONS.map((minutes, i) => {
            const active = dailyGoalMinutes === minutes
            return (
              <Pressable
                key={minutes}
                accessibilityRole="radio"
                accessibilityLabel={minutes === 0 ? "No goal" : `${minutes} minutes a day`}
                accessibilityState={{ selected: active }}
                className={`h-14 flex-row items-center active:opacity-60 ${
                  i === OPTIONS.length - 1 ? "" : "border-b border-border"
                }`}
                onPress={() => setPreference("dailyGoalMinutes", minutes)}
              >
                <Text className="flex-1 font-text text-body-lg text-ink">
                  {minutes === 0 ? "No goal" : `${minutes} minutes`}
                </Text>
                {minutes === 0 ? (
                  <Text className="mr-3 font-text text-caption text-text-secondary">Default</Text>
                ) : null}
                <SymbolView
                  name={active ? "largecircle.fill.circle" : "circle"}
                  size={20}
                  tintColor={active ? colors.primary : colors["text-secondary"]}
                  weight="semibold"
                />
              </Pressable>
            )
          })}
        </View>

        <View className="mt-6 rounded-2xl border border-border bg-white p-4">
          <View className="flex-row items-center">
            <SymbolView name="hand.raised" size={18} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 font-text text-body-lg font-bold text-ink">How this behaves</Text>
          </View>
          <Text className="mt-2 font-text text-body text-text-secondary">
            A goal shows as a quiet marker on {name}’s progress — nothing counts down, nothing
            goes red, and a missed day is never shown to them as a failure. GoKid has no streaks, and
            this does not add one.
          </Text>
        </View>

        {dailyGoalMinutes > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Turn the goal off"
            className="mt-6 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
            onPress={() => setPreference("dailyGoalMinutes", 0)}
          >
            <Text className="font-text text-body-lg font-bold text-ink">Turn the goal off</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
