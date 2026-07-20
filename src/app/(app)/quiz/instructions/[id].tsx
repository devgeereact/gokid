import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useStudyingChildId } from "@/lib/children"
import { masterySplit, useProgress } from "@/lib/reviews"
import { getStudySet, quizBrief } from "@/lib/study"

/**
 * Quiz Instructions (design/gokid-screens.md §7). The gate between set detail / the flashcard deck
 * and the quiz runner: what the quiz covers, how long it takes, and the rules, before any question
 * is scored.
 *
 * INFERRED — no mockup exists for this screen. Surface, type, radius and the peach illustration
 * wash are taken from design/GoKid-quiz-screen.png (screen 8) so it reads as the quiz runner's
 * front door; the stat tiles reuse the geometry of design/GoKid-sectionsummary-screen.png.
 */

/** How the quiz behaves — fixed rules, so module scope, not demo data. */
const RULES: { symbol: SFSymbol; title: string; body: string }[] = [
  {
    symbol: "hand.tap",
    title: "Pick one answer",
    body: "Tap A, B, C or D. You can change your mind before you check.",
  },
  {
    symbol: "checkmark.circle",
    title: "Check it",
    body: "We show you straight away whether it was right.",
  },
  {
    symbol: "arrow.uturn.left",
    title: "No rush",
    body: "There is no timer. Take as long as you like on each question.",
  },
  {
    symbol: "chart.bar",
    title: "See how you did",
    body: "At the end you get your score and what to revisit.",
  },
]

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View className="h-20 flex-1 items-center justify-center rounded-lg bg-gamify-tile">
      <Text className="font-text text-h3 font-bold text-ink">{value}</Text>
      <Text className="mt-1 font-text text-tile text-text-secondary">{label}</Text>
    </View>
  )
}

function Rule({ symbol, title, body }: { symbol: SFSymbol; title: string; body: string }) {
  return (
    <View className="mb-3 flex-row items-start rounded-2xl border border-border bg-quiz-option p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-quiz-option-sel">
        <SymbolView name={symbol} size={20} tintColor={colors.primary} weight="semibold" />
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{title}</Text>
        <Text className="mt-1 font-text text-body text-text-secondary">{body}</Text>
      </View>
    </View>
  )
}

export default function QuizInstructions() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const childId = useStudyingChildId() ?? ""
  const { cards } = useProgress(childId)
  const set = getStudySet(id)
  // §7 "Quiz Difficulty" — a real, selectable control rather than a read-only label. Practice keeps
  // the instant feedback the runner has always had; Test defers it so the child answers everything,
  // reviews, then scores. Practice leads because it is the right default for learning.
  const [mode, setMode] = useState<"practice" | "test">("practice")
  if (!set) return <Redirect href="/home" />

  const setId = set.id
  // Difficulty is this child's retention of this set, not a catalogue constant.
  const setCards = cards.filter((c) => c.setId === set.id)
  const brief = quizBrief(set, setCards.length === 0 ? null : masterySplit(setCards).pctMastered)

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-4" showsVerticalScrollIndicator={false}>
        <View
          className={`mt-2 h-40 items-center justify-center rounded-2xl px-4 pb-3 pt-4 ${
            brief.illustrated ? "bg-quiz-card" : "bg-gamify-tile"
          }`}
        >
          <Image
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            contentFit="contain"
            source={brief.illustration}
          />
        </View>

        <Text className="mt-6 text-center font-text text-h1 font-bold text-ink">Ready for your quiz?</Text>
        <Text className="mt-3 text-center font-text text-body-lg text-text-secondary">
          {set.title} — {set.yearGroup} · {set.subject}
        </Text>

        <View className="mt-6 flex-row gap-3">
          <Tile value={String(brief.questions)} label="Questions" />
          <Tile value={`~${brief.minutes}m`} label="Time" />
          {/* Null until they have studied the set — being told a quiz is "Easy" before seeing a
              single card is worse than being told nothing. */}
          <Tile value={brief.difficulty ?? "—"} label={brief.difficulty ? "For you" : "Not started"} />
        </View>

        {/* §7 "Quiz Difficulty" as a control the child actually sets. */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">How do you want to do it?</Text>
        <View className="flex-row gap-3">
          {(
            [
              { key: "practice" as const, title: "Practice", body: "Check each answer as you go." },
              { key: "test" as const, title: "Test", body: "Answer them all, then review before scoring." },
            ]
          ).map((option) => {
            const active = mode === option.key
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={`${option.title}. ${option.body}`}
                accessibilityState={{ selected: active }}
                className={`flex-1 rounded-2xl border p-4 active:opacity-80 ${
                  active ? "border-study-teal bg-quiz-option-sel" : "border-border bg-white"
                }`}
                onPress={() => setMode(option.key)}
              >
                <View className="flex-row items-center">
                  <SymbolView
                    name={active ? "largecircle.fill.circle" : "circle"}
                    size={18}
                    tintColor={active ? colors.study.teal : colors["text-secondary"]}
                    weight="semibold"
                  />
                  <Text className="ml-2 font-text text-body-lg font-bold text-ink">{option.title}</Text>
                </View>
                <Text className="mt-2 font-text text-caption text-text-secondary">{option.body}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">How it works</Text>
        {RULES.map((r) => (
          <Rule key={r.title} symbol={r.symbol} title={r.title} body={r.body} />
        ))}

        <Text className="mb-3 mt-5 font-text text-h3 font-bold text-ink">What it covers</Text>
        <View className="flex-row flex-wrap gap-2">
          {brief.topics.map((t) => (
            <View key={t} className="rounded-full bg-quiz-chip px-4 py-2">
              <Text className="font-text text-caption font-semibold text-ink">{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start quiz"
        className="mt-3 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
        onPress={() => router.replace({ pathname: "/quiz/[id]", params: { id: setId, mode } })}
      >
        <Text className="font-text text-body-lg font-bold text-white">Start quiz</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Review cards first"
        className="mb-2 mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
        onPress={() => router.push({ pathname: "/flashcard/[id]", params: { id: setId } })}
      >
        <Text className="font-text text-body-lg font-bold text-ink">Review cards first</Text>
      </Pressable>
    </SafeAreaView>
  )
}
