import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { plural } from "@/lib/analytics"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { type TimelineEntry, useProgressInsights } from "@/lib/mastery-timeline"
import { useProgress } from "@/lib/reviews"

/**
 * Mastery Timeline (design/gokid-screens.md §8 → "Mastery Timeline", "Recently Mastered").
 *
 * The progress section had every aggregate — a donut, a coverage figure, a count of cards learned —
 * and no chronology at all. A number that only ever goes up is hard for a child to feel; a dated
 * list of the cards they actually cracked is the same information they can point at.
 *
 * "Recently Mastered" is the top of this list rather than a second screen: they are the same data at
 * two zoom levels, and building both would give a child two places to look for one thing.
 *
 * Wording note — "confirmed", not "achieved". The review store keeps only each card's *last* review,
 * so a card is dated by the day its mastery was last confirmed, which is not necessarily the day it
 * was first reached. The copy says what the data supports (see lib/mastery-timeline.ts).
 */

function dayLabel(at: number, today: number) {
  const days = Math.round((today - at) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
}

/** Clock read outside render — the React Compiler treats `Date.now()` during render as impure. */
function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function DayGroup({ entry, today }: { entry: TimelineEntry; today: number }) {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-badge-strong">
          <SymbolView name="checkmark" size={15} tintColor={colors.badge["strong-ink"]} weight="bold" />
        </View>
        <Text className="ml-3 flex-1 font-text text-body-lg font-bold text-ink">
          {dayLabel(entry.at, today)}
        </Text>
        <Text className="font-text text-caption text-text-secondary">
          {plural(entry.cards.length, "card")}
        </Text>
      </View>

      {/* Indented under the day marker so the column reads as one thread down the page. */}
      <View className="ml-4 border-l border-border pl-5">
        {entry.cards.map(({ card, set }) => (
          <View key={`${card.setId}:${card.cardId}`} className="mb-2 rounded-xl border border-border bg-white p-3">
            <Text numberOfLines={2} className="font-text text-body font-semibold text-ink">
              {set?.title ?? "A set you have since finished"}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 font-text text-caption text-text-secondary">
              {set ? `${set.subject} • ${set.topic}` : "No longer on this year's shelf"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function MasteryTimeline() {
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]
  const { cards, sessions } = useProgress(childId)
  const { sets } = useSets(child?.yearGroup)
  const { timeline, stats } = useProgressInsights(cards, sessions, sets)

  const today = todayStart()
  const name = child?.name ?? "You"

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Mastery timeline</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {timeline.length === 0 ? (
          <EmptyState
            symbol="calendar.badge.clock"
            title="Nothing mastered yet"
            body={`A card counts as mastered once ${name === "You" ? "you have" : `${name} has`} recalled it correctly across widening gaps. Keep studying and they'll start appearing here.`}
            actionLabel="Go to study"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
            {/* Recently Mastered, as a headline over the same data the list below expands. */}
            <View className="mb-6 rounded-2xl border border-border bg-white p-5">
              <Text className="font-text text-h1 font-bold text-ink">{stats.cardsMastered}</Text>
              <Text className="mt-1 font-text text-body-lg text-text-secondary">
                {stats.cardsMastered === 1 ? "card mastered" : "cards mastered"}, most recent first
              </Text>
              <Text className="mt-3 font-text text-caption text-text-secondary">
                Dated by when mastery was last confirmed — a mastered card comes back occasionally to
                check it has stuck.
              </Text>
            </View>

            {timeline.map((entry) => (
              <DayGroup key={entry.key} entry={entry} today={today} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
