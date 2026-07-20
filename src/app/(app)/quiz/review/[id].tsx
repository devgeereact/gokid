import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { resolveItems } from "@/lib/served-quiz"
import { decodeAnswers, getStudySet, quizAttempt, quizItems, type QuizReviewRow } from "@/lib/study"

/**
 * Incorrect Answers (design/gokid-screens.md §7). Replays the questions the child got wrong after a
 * quiz: what they picked beside the right answer, why it is the right answer, and the strand to go
 * back to. "Retake quiz" sends them round again.
 *
 * INFERRED — no mockup exists for this screen. Every surface is lifted from
 * design/GoKid-answerresult-screen.png (screen 20), which is the same idea for a single card: the
 * "Your answer" / "Correct answer" pair, the lightbulb Explanation card on its pale blue wash, and
 * the stat-tile row. The list, the empty state and the CTAs are composed from those parts.
 */

function Stat({ value, label, tone }: { value: string; label: string; tone: "red" | "green" | "tile" }) {
  const fill = tone === "red" ? "bg-gamify-red-wash" : tone === "green" ? "bg-gamify-green-wash" : "bg-gamify-tile"
  return (
    <View className={`h-20 flex-1 items-center justify-center rounded-lg ${fill}`}>
      <Text className="font-text text-h3 font-bold text-ink">{value}</Text>
      <Text className="mt-1 font-text text-tile text-text-secondary">{label}</Text>
    </View>
  )
}

function AnswerTile({ label, value, tone }: { label: string; value: string; tone: "wrong" | "right" }) {
  return (
    <View className="flex-1">
      <Text className="mb-2 font-text text-body font-semibold text-ink">{label}</Text>
      <View
        className={`h-16 items-center justify-center rounded-md px-3 ${
          tone === "wrong" ? "bg-gamify-red-wash" : "bg-gamify-green-wash"
        }`}
      >
        <Text
          adjustsFontSizeToFit
          className={`font-text text-h3 font-bold ${tone === "wrong" ? "text-error" : "text-status-getting"}`}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  )
}

function ReviewCard({ row }: { row: QuizReviewRow }) {
  return (
    <View className="mt-4 rounded-2xl border border-border bg-white p-4">
      <View className="flex-row items-center">
        <View className="h-8 items-center justify-center rounded-full bg-gamify-red-wash px-3">
          <Text className="font-text text-caption font-bold text-error">Question {row.number}</Text>
        </View>
        <View className="ml-2 h-8 items-center justify-center rounded-full bg-quiz-chip px-3">
          <Text className="font-text text-caption font-semibold text-text-secondary">{row.topic}</Text>
        </View>
      </View>

      <Text className="mt-3 font-text text-body-lg font-bold text-ink">{row.question.prompt}</Text>

      <View className="mt-4 flex-row items-stretch">
        <AnswerTile label="Your answer" value={row.pickedLabel} tone="wrong" />
        {/* The ref rules the answer pair apart rather than just spacing it. */}
        <View className="mx-4 w-px bg-border" />
        <AnswerTile label="Correct answer" value={row.correctLabel} tone="right" />
      </View>

      <View className="mt-4 rounded-md bg-gamify-blue-wash p-3">
        <View className="flex-row items-center">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-gamify-blue">
            <SymbolView name="lightbulb.fill" size={16} tintColor={colors.white} weight="semibold" />
          </View>
          <Text className="ml-3 font-text text-body-lg font-bold text-ink">Explanation</Text>
        </View>
        <Text className="mt-2 font-text text-body text-ink">{row.explanation}</Text>
      </View>
    </View>
  )
}

export default function QuizReview() {
  const { id, answers } = useLocalSearchParams<{ id: string; answers?: string }>()
  const set = getStudySet(id)

  if (!set) return <Redirect href="/home" />

  const setId = set.id
  // Grade against the questions actually served this child, not a freshly-derived local list.
  const attempt = quizAttempt(set, decodeAnswers(answers), resolveItems(set.id, quizItems(set)))
  const allRight = attempt.wrong.length === 0

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* Chrome copies design/GoKid-answerresult-screen.png: arrow + "Back" left, title centred. */}
      <View className="h-11 flex-row items-center px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-11 w-24 flex-row items-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="arrow.left" size={20} tintColor={colors.ink} weight="semibold" />
          <Text className="ml-2 font-text text-body-lg font-semibold text-ink">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center font-text text-body-lg font-bold text-ink">Incorrect answers</Text>
        <View className="h-11 w-24" />
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-6 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-h2 font-bold leading-[34px] text-ink">
          {allRight ? "Nothing to fix." : attempt.wrong.length === 1 ? "One to look at." : `${attempt.wrong.length} to look at.`}
        </Text>
        <Text className="mt-2 font-text text-body text-text-secondary">
          {allRight
            ? `You got every question in ${set.title} right. There is nothing to review.`
            : "Here is what you picked, what the answer was, and why."}
        </Text>

        <View className="mt-5 flex-row">
          <Stat value={`${attempt.correct}/${attempt.total}`} label="Score" tone="green" />
          <View className="w-3" />
          <Stat value={`${attempt.accuracy}%`} label="Accuracy" tone="tile" />
          <View className="w-3" />
          <Stat value={String(attempt.wrong.length)} label="To review" tone={allRight ? "tile" : "red"} />
        </View>

        {allRight ? (
          <View className="mt-6 items-center rounded-2xl border border-border bg-white px-5 py-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gamify-green-wash">
              <SymbolView name="checkmark" size={30} tintColor={colors.status.getting} weight="bold" />
            </View>
            <Text className="mt-4 text-center font-text text-body-lg font-bold text-ink">A clean sweep</Text>
            <Text className="mt-2 text-center font-text text-body text-text-secondary">
              Every answer was right, so there is nothing here to go back over.
            </Text>
          </View>
        ) : (
          attempt.wrong.map((row) => <ReviewCard key={row.question.id} row={row} />)
        )}

        {allRight ? null : (
          <View className="mt-4 rounded-2xl border border-border bg-white p-4">
            <Text className="font-text text-body-lg font-bold text-ink">Worth another look</Text>
            <View className="mt-3 flex-row flex-wrap">
              {[...new Set(attempt.wrong.map((r) => r.topic))].map((topic) => (
                <View key={topic} className="mb-2 mr-2 h-9 items-center justify-center rounded-lg bg-accent px-4">
                  <Text className="font-text text-body font-bold text-white">{topic}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-1 font-text text-body text-text-secondary">
              We&apos;ll bring these cards back soon.
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="px-5 pb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retake quiz"
          className="h-14 items-center justify-center rounded-full bg-primary active:opacity-90"
          onPress={() => router.replace({ pathname: "/quiz/[id]", params: { id: setId } })}
        >
          <Text className="font-text text-body-lg font-bold text-white">Retake quiz</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review the cards"
          className="mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.replace({ pathname: "/flashcard/[id]", params: { id: setId } })}
        >
          <Text className="font-text text-body-lg font-bold text-ink">Review the cards</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
