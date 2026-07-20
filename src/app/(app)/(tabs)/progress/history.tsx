import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useStudyingChildId } from "@/lib/children"
import { dueLabel, type SessionRecord, useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Study history + upcoming reviews (MVP → Progress Tracking → "Basic study history", "Upcoming
 * review cards"). Reached from the Progress tab. Rows come from src/lib/reviews.ts — real sessions
 * the child finished on this device, not demo constants.
 *
 * No design reference covers this screen: the layout is inferred from the "Coming back soon" card on
 * design/GoKid-progress-screen.png (screen 10) — the same white card, 11pt thumb slot replaced by a
 * subject-tinted symbol disc, and the same title / secondary-line pairing.
 */

const SUBJECT_WASH: Record<string, string> = {
  Maths: "bg-subject-maths",
  English: "bg-subject-english",
  Science: "bg-subject-science",
  Geography: "bg-subject-geography",
  History: "bg-subject-history",
}

/** The card's own question, so the review queue reads like the deck rather than like ids. */
function cardQuestion(setId: string, cardId: string) {
  return getStudySet(setId)?.cards.find((c) => c.id === cardId)?.question ?? "Review card"
}

/** "Today" / "Yesterday" / "3 days ago" / "12 Mar". Reads the clock itself — see dueLabel. */
function dayLabel(at: number) {
  const days = Math.floor((Date.now() - at) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function SessionRow({ session }: { session: SessionRecord }) {
  const scored = session.score !== undefined && session.scoreTotal !== undefined
  return (
    <View className="mb-4 flex-row items-center last:mb-0">
      <View className={`h-11 w-11 items-center justify-center rounded-md ${SUBJECT_WASH[session.subject] ?? "bg-gamify-tile"}`}>
        <SymbolView name="book.closed" size={20} tintColor={colors.ink} weight="regular" />
      </View>
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="font-text text-body-lg font-semibold text-ink">
          {session.setTitle}
        </Text>
        <Text className="mt-0.5 font-text text-body text-text-secondary">
          {dayLabel(session.at)} · {session.cardsReviewed} cards · {session.minutes} min
        </Text>
      </View>
      {scored ? (
        <View className="rounded-md bg-badge-strong px-3 py-1.5">
          <Text className="font-text text-body font-bold text-badge-strong-ink">
            {session.score}/{session.scoreTotal}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default function History() {
  const childId = useStudyingChildId() ?? ""
  const { sessions, upcoming } = useProgress(childId)
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const totalCards = sessions.reduce((sum, s) => sum + s.cardsReviewed, 0)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Study history</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
        {/* Totals — computed from the recorded sessions, so an empty history reads zero, not a fake. */}
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-white p-3">
            <Text className="font-text text-caption text-text-secondary">Sessions</Text>
            <Text className="mt-2 font-text text-h3 font-bold text-ink">{sessions.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-white p-3">
            <Text className="font-text text-caption text-text-secondary">Cards seen</Text>
            <Text className="mt-2 font-text text-h3 font-bold text-ink">{totalCards}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-white p-3">
            <Text className="font-text text-caption text-text-secondary">Time</Text>
            <Text className="mt-2 font-text text-h3 font-bold text-ink">{totalMinutes}m</Text>
          </View>
        </View>

        {/* Coming back soon — the live spaced-repetition queue. */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Coming back soon</Text>
          {upcoming.length === 0 ? (
            <Text className="font-text text-body text-text-secondary">
              Rate some flashcards and they&apos;ll queue up here for review.
            </Text>
          ) : (
            upcoming.slice(0, 6).map((card) => (
              <View key={`${card.setId}:${card.cardId}`} className="mb-4 flex-row items-center last:mb-0">
                <View
                  className={`h-11 w-11 items-center justify-center rounded-full ${
                    card.lastRating === "tricky" ? "bg-badge-practice" : "bg-badge-strong"
                  }`}
                >
                  <SymbolView
                    name="arrow.clockwise"
                    size={18}
                    tintColor={card.lastRating === "tricky" ? colors.badge["practice-ink"] : colors.badge["strong-ink"]}
                    weight="semibold"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text numberOfLines={1} className="font-text text-body-lg font-semibold text-ink">
                    {cardQuestion(card.setId, card.cardId)}
                  </Text>
                  <Text className="mt-0.5 font-text text-body text-text-secondary">
                    {card.lastRating === "tricky" ? "Marked tricky" : "Got it"} · {dueLabel(card.dueAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sessions */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Recent sessions</Text>
          {sessions.length === 0 ? (
            <EmptyState
              symbol="clock.arrow.circlepath"
              title="No study history yet"
              body="Finish a set and it will show up here with the cards seen and the time spent."
              actionLabel="Start studying"
              onAction={() => router.push("/study")}
            />
          ) : (
            sessions.map((s) => <SessionRow key={s.id} session={s} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
