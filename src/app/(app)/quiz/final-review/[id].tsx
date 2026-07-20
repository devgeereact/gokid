import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useMemo } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { resolveItems } from "@/lib/served-quiz"
import {
  decodeAnswers,
  encodeAnswers,
  getStudySet,
  isResponseCorrect,
  type MixedQuestion,
  type QuizResponse,
  quizItems,
  responseLabel,
} from "@/lib/study"

/**
 * Final Review (design/gokid-screens.md §7 → "Final Review": a review-before-scoring pass).
 *
 * Only reachable from a quiz taken in **test** mode. In practice mode every question is marked the
 * instant it is answered, which is good for learning but makes a review pass meaningless — there is
 * nothing left to reconsider once you have already been told. So the two modes are offered on the
 * instructions screen and this screen belongs to one of them.
 *
 * The crucial property: **nothing here says right or wrong.** It lists what the child answered and
 * lets them go back and change any of it. Showing correctness at this point would turn the review
 * into the result screen and delete the only moment in the flow where a child re-reads their own
 * work — which is the specific study skill this pass exists to build.
 *
 * Unanswered questions are called out, because "I skipped it" and "I answered it" are different
 * states and only one of them is worth going back for.
 */

function ReviewRow({
  question,
  response,
  index,
  onEdit,
}: {
  question: MixedQuestion
  response: QuizResponse | undefined
  index: number
  onEdit: () => void
}) {
  const given = response ? responseLabel(question, response) : ""
  const answered = given.trim().length > 0

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        answered
          ? `Question ${index + 1}. You answered ${given}. Tap to change.`
          : `Question ${index + 1}. Not answered. Tap to answer.`
      }
      className="mb-3 rounded-2xl border border-border bg-white p-4 active:opacity-80"
      onPress={onEdit}
    >
      <View className="flex-row items-center">
        <View
          className={`h-7 w-7 items-center justify-center rounded-full ${
            answered ? "bg-quiz-chip" : "bg-badge-practice"
          }`}
        >
          <Text
            className={`font-text text-caption font-bold ${
              answered ? "text-ink" : "text-badge-practice-ink"
            }`}
          >
            {index + 1}
          </Text>
        </View>
        <Text numberOfLines={2} className="ml-3 flex-1 font-text text-body font-semibold text-ink">
          {question.prompt}
        </Text>
        <SymbolView name="chevron.right" size={14} tintColor={colors["text-secondary"]} weight="semibold" />
      </View>

      <View className="mt-3 rounded-xl bg-background px-3 py-2">
        <Text className="font-text text-caption text-text-secondary">
          {answered ? "Your answer" : "Not answered yet"}
        </Text>
        {answered ? (
          <Text className="mt-1 font-text text-body font-semibold text-ink">{given}</Text>
        ) : null}
      </View>
    </Pressable>
  )
}

export default function FinalReview() {
  const { id, answers } = useLocalSearchParams<{ id: string; answers?: string }>()
  const set = getStudySet(id)
  // The exact questions the runner served this child (from the store), else the local set.
  const items = useMemo(() => (set ? resolveItems(set.id, quizItems(set)) : []), [set])
  const responses = useMemo(() => decodeAnswers(answers), [answers])

  if (!set) return <Redirect href="/home" />
  if (items.length === 0) return <Redirect href="/home" />

  const setId = set.id
  const unanswered = items.filter((q, i) => {
    const r = responses[i]
    return !r || responseLabel(q, r).trim().length === 0
  }).length

  function submit() {
    // Scored here, from the responses as they finally stand — a child who changed an answer during
    // the review must be marked on what they ended up with, not on a tally kept while answering.
    const score = items.reduce(
      (sum, item, i) => sum + (responses[i] && isResponseCorrect(item, responses[i]) ? 1 : 0),
      0
    )
    router.replace({
      pathname: "/result/[id]",
      params: { id: setId, score: String(score), answers: encodeAnswers(responses) },
    })
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Check your answers</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-4 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-body-lg text-text-secondary">
          {unanswered > 0
            ? `You've still got ${unanswered === 1 ? "1 question" : `${unanswered} questions`} to answer. Tap any question to go back to it.`
            : "Tap any question to change your answer. Nothing is marked until you finish."}
        </Text>

        <View className="mt-5">
          {items.map((question, i) => (
            <ReviewRow
              key={question.id}
              question={question}
              response={responses[i]}
              index={i}
              onEdit={() =>
                router.replace({
                  pathname: "/quiz/[id]",
                  params: { id: setId, mode: "test", start: String(i), answers: encodeAnswers(responses) },
                })
              }
            />
          ))}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finish and see results"
        className="mb-2 mt-3 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
        onPress={submit}
      >
        <Text className="font-text text-body-lg font-bold text-white">Finish and see results</Text>
      </Pressable>
    </SafeAreaView>
  )
}
