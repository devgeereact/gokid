import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { encodeAnswers, getStudySet, type QuizQuestion } from "@/lib/study"

/**
 * Quiz question (design/GoKid-quiz-screen.png, screen 8). One MCQ at a time: pick A–D, "Check
 * answer" locks it and reveals right/wrong, then the button advances. Finishing pushes the results
 * screen with the score. Questions are demo data (src/lib/study.ts). The "8. Quiz Question" title is
 * a mockup annotation — dropped. A close ✕ is added top-left (the mock shows none) so the runner is
 * escapable — logged as inferred.
 */

// Progress-bar fill widths — one class per (index+1)/total so NativeWind's compiler emits them.
const FILL: Record<string, string> = {
  "1/4": "w-1/4",
  "2/4": "w-2/4",
  "3/4": "w-3/4",
  "4/4": "w-full",
  "1/5": "w-1/5",
  "2/5": "w-2/5",
  "3/5": "w-3/5",
  "4/5": "w-4/5",
  "5/5": "w-full",
  "1/6": "w-1/6",
  "2/6": "w-2/6",
  "3/6": "w-3/6",
  "4/6": "w-4/6",
  "5/6": "w-5/6",
  "6/6": "w-full",
}

const LETTERS = ["A", "B", "C", "D"]

function Option({
  letter,
  label,
  state,
  onPress,
}: {
  letter: string
  label: string
  state: "idle" | "selected" | "correct" | "wrong"
  onPress: () => void
}) {
  const card =
    state === "selected"
      ? "border-primary bg-quiz-option-sel"
      : state === "correct"
        ? "border-status-getting bg-quiz-option-sel"
        : state === "wrong"
          ? "border-error bg-quiz-option-sel"
          : "border-border bg-quiz-option"
  const disc =
    state === "selected"
      ? "bg-primary"
      : state === "correct"
        ? "bg-status-getting"
        : state === "wrong"
          ? "bg-error"
          : "bg-quiz-chip"
  const discText = state === "idle" ? "text-ink" : "text-white"

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${letter}. ${label}`}
      className={`mb-3 h-16 flex-row items-center rounded-2xl border px-3 active:opacity-90 ${card}`}
      onPress={onPress}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${disc}`}>
        <Text className={`font-text text-body-lg font-bold ${discText}`}>{letter}</Text>
      </View>
      <Text className="ml-4 flex-1 font-text text-field font-semibold text-ink">{label}</Text>
    </Pressable>
  )
}

export default function Quiz() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  // Every pick, in question order — replayed by the Incorrect Answers review.
  const [answers, setAnswers] = useState<number[]>([])

  if (!set) return <Redirect href="/home" />

  const setId = set.id
  const total = set.quiz.length
  const q: QuizQuestion = set.quiz[index]

  function optionState(i: number): "idle" | "selected" | "correct" | "wrong" {
    if (!checked) return selected === i ? "selected" : "idle"
    if (i === q.answer) return "correct"
    if (i === selected) return "wrong"
    return "idle"
  }

  function onPrimary() {
    if (!checked) {
      if (selected === null) return
      if (selected === q.answer) setScore((s) => s + 1)
      setAnswers((a) => {
        const next = [...a]
        next[index] = selected
        return next
      })
      setChecked(true)
      return
    }
    // Advance — or finish → results. `score` / `answers` are read after the check re-render, so
    // this question's pick is already in them.
    if (index + 1 >= total) {
      router.replace({
        pathname: "/result/[id]",
        params: { id: setId, score: String(score), answers: encodeAnswers(answers) },
      })
      return
    }
    setIndex(index + 1)
    setSelected(null)
    setChecked(false)
  }

  const primaryLabel = !checked ? "Check answer" : index + 1 >= total ? "See results" : "Next"

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close quiz"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="xmark" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-4" showsVerticalScrollIndicator={false}>
        <Text className="text-center font-text text-body-lg font-semibold text-ink">
          Question {index + 1} of {total}
        </Text>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-study-track">
          <View className={`h-full rounded-full bg-study-teal ${FILL[`${index + 1}/${total}`]}`} />
        </View>

        {q.illustration ? (
          <View className="mt-6 rounded-2xl bg-quiz-card px-4 pb-3 pt-4">
            <Image
              accessibilityIgnoresInvertColors
              className="h-40 w-full"
              contentFit="contain"
              source={q.illustration}
            />
            <View className="mt-2 flex-row">
              <Text className="flex-1 text-center font-text text-body font-semibold text-ink">Hundreds</Text>
              <Text className="flex-1 text-center font-text text-body font-semibold text-ink">Tens</Text>
              <Text className="flex-1 text-center font-text text-body font-semibold text-ink">Ones</Text>
            </View>
          </View>
        ) : null}

        <Text className="mb-6 mt-8 text-center font-text text-h1 font-bold leading-[40px] text-ink">
          {q.prompt}
        </Text>

        {q.options.map((opt, i) => (
          <Option
            key={i}
            letter={LETTERS[i]}
            label={opt}
            state={optionState(i)}
            onPress={() => !checked && setSelected(i)}
          />
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        disabled={!checked && selected === null}
        className={`mb-2 mt-3 h-14 items-center justify-center rounded-full active:opacity-90 ${
          !checked && selected === null ? "bg-study-track" : "bg-study-teal"
        }`}
        onPress={onPrimary}
      >
        <Text className="font-text text-body-lg font-bold text-white">{primaryLabel}</Text>
      </Pressable>
    </SafeAreaView>
  )
}
