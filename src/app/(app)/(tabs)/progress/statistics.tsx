import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { duration, plural } from "@/lib/analytics"
import { useChildren, useStudyingChildId, yearLabel } from "@/lib/children"
import { useProgressInsights } from "@/lib/mastery-timeline"
import { useParentGate } from "@/lib/parent-gate"
import { dueLabel, useProgress } from "@/lib/reviews"
import { shareAboutChild } from "@/lib/share"

/**
 * Statistics (design/gokid-screens.md §8 → "Statistics": figures existed but were scattered across
 * five screens with no single place to read them).
 *
 * Every figure comes from `statisticsFor` (lib/mastery-timeline.ts) rather than being recomputed
 * here. That is the point of the screen as much as the layout is: five screens each deriving their
 * own "cards learned" is how two screens end up disagreeing about the same child, and a parent who
 * spots that stops trusting all of them.
 *
 * Nothing is padded to look fuller. A child who has not been scored on a quiz has no accuracy, so
 * the accuracy tile says so rather than showing 0% — which would read as "got everything wrong".
 */

function Tile({
  symbol,
  value,
  label,
  hint,
}: {
  symbol: SFSymbol
  value: string
  label: string
  hint?: string
}) {
  return (
    <View className="mb-3 flex-1 rounded-2xl border border-border bg-white p-4">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-study-wash">
        <SymbolView name={symbol} size={17} tintColor={colors.primary} weight="semibold" />
      </View>
      <Text className="mt-3 font-text text-h2 font-bold text-ink">{value}</Text>
      <Text numberOfLines={2} className="mt-1 font-text text-caption text-text-secondary">
        {label}
      </Text>
      {hint ? (
        <Text numberOfLines={2} className="mt-1 font-text text-caption text-text-secondary">
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center border-b border-border py-3 last:border-b-0">
      <Text className="flex-1 font-text text-body-lg text-ink">{label}</Text>
      <Text className="font-text text-body-lg font-bold text-ink">{value}</Text>
    </View>
  )
}

export default function Statistics() {
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]
  const { cards, sessions } = useProgress(childId)
  const { sets } = useSets(child?.yearGroup)
  const { stats } = useProgressInsights(cards, sessions, sets)
  const { unlocked } = useParentGate()

  /**
   * §8 "Export Progress". Human-readable, not the JSON of §1's Data Export — those answer different
   * questions. That one is GDPR portability (everything we hold, machine-readable, for the parent's
   * own records); this is "send my child's progress to their teacher or tutor", which wants a few
   * lines someone can read in a message.
   *
   * Gated through lib/share.ts like every other outbound share: it carries a child's first name,
   * year group and attainment, and a child must not be able to publish that unsupervised.
   */
  function exportProgress() {
    const name = child?.name ?? "Your child"
    const lines = [
      `${name}'s GoKid progress${child ? ` — ${yearLabel(child.yearGroup)}` : ""}`,
      "",
      `Cards seen: ${stats.cardsSeen}`,
      `Cards learned: ${stats.cardsLearned}`,
      `Cards mastered: ${stats.cardsMastered}`,
      `Sets started: ${stats.setsStarted} · finished: ${stats.setsFinished}`,
      `Subjects studied: ${stats.subjects}`,
      `Time studying: ${duration(stats.minutes)} across ${plural(stats.sessions, "session")}`,
      `Days studied: ${stats.daysStudied}`,
      stats.accuracy === null ? "Quiz accuracy: no quizzes yet" : `Quiz accuracy: ${stats.accuracy}%`,
    ]
    shareAboutChild({ unlocked, message: lines.join("\n") })
  }

  const hasData = stats.cardsSeen > 0 || stats.sessions > 0

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Statistics</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-35 pt-2" showsVerticalScrollIndicator={false}>
        {!hasData ? (
          <EmptyState
            symbol="chart.bar"
            title="No statistics yet"
            body="Finish a study session and every figure on this screen starts filling in."
            actionLabel="Go to study"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
            <Text className="font-text text-body-lg text-text-secondary">
              {child ? `${child.name} · ${yearLabel(child.yearGroup)}` : "Everything recorded so far"}
            </Text>

            <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">Cards</Text>
            <View className="flex-row gap-3">
              <Tile symbol="rectangle.on.rectangle" value={String(stats.cardsSeen)} label="Cards seen" />
              <Tile
                symbol="brain.head.profile"
                value={String(stats.cardsLearned)}
                label="Learned"
                hint="Recalled twice"
              />
            </View>
            <View className="flex-row gap-3">
              <Tile
                symbol="checkmark.seal.fill"
                value={String(stats.cardsMastered)}
                label="Mastered"
                hint="At the longest gap"
              />
              <Tile
                symbol="clock.arrow.circlepath"
                value={String(stats.dueNow)}
                label="Due now"
                hint={
                  stats.dueNow === 0 && stats.nextDueAt ? `Next ${dueLabel(stats.nextDueAt).toLowerCase()}` : undefined
                }
              />
            </View>

            <Text className="mb-3 mt-4 font-text text-h3 font-bold text-ink">Time</Text>
            <View className="rounded-2xl border border-border bg-white px-4">
              <Row label="Total time studying" value={duration(stats.minutes)} />
              <Row label="Sessions finished" value={String(stats.sessions)} />
              <Row
                label="Average session"
                value={stats.averageSession > 0 ? duration(stats.averageSession) : "—"}
              />
              <Row label="Days studied" value={plural(stats.daysStudied, "day")} />
              <Row
                label="Busiest day"
                value={stats.bestDay ? duration(stats.bestDay.minutes) : "—"}
              />
            </View>

            <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">Coverage</Text>
            <View className="rounded-2xl border border-border bg-white px-4">
              <Row label="Sets started" value={String(stats.setsStarted)} />
              <Row label="Sets finished" value={String(stats.setsFinished)} />
              <Row label="Subjects studied" value={String(stats.subjects)} />
              {/* Null, not 0: a child who has never been scored has not scored zero. */}
              <Row
                label="Quiz accuracy"
                value={stats.accuracy === null ? "No quizzes yet" : `${stats.accuracy}%`}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export this progress"
              className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
              onPress={exportProgress}
            >
              <SymbolView name="square.and.arrow.up" size={20} tintColor={colors.white} weight="semibold" />
              <Text className="font-text text-body-lg font-bold text-white">Export progress</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the mastery timeline"
              className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
              onPress={() => router.push("/progress/mastery-timeline")}
            >
              <SymbolView name="calendar.badge.clock" size={20} tintColor={colors.ink} weight="regular" />
              <Text className="font-text text-body-lg font-bold text-ink">See the mastery timeline</Text>
            </Pressable>

            <Text className="mt-6 text-center font-text text-caption text-text-secondary">
              Every figure here is counted from this device’s own record of what was studied.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
