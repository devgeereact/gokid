import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useMemo, useState } from "react"
import { Pressable, ScrollView, Text, TextInput, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import {
  blankResponse,
  decodeAnswers,
  encodeAnswers,
  getStudySet,
  isResponseCorrect,
  type MixedQuestion,
  type QuizResponse,
  quizItems,
} from "@/lib/study"

/**
 * Quiz runner (design/GoKid-quiz-screen.png, screen 8; §7 for the extra question types). One question
 * at a time — MCQ, multi-select, fill-in-the-blank, put-in-order or match — then "Check answer" locks
 * it and reveals right/wrong before advancing. Finishing pushes the results screen with the score and
 * the encoded responses.
 *
 * The set's questions come from `quizItems` (a set's `mixedQuiz` when it has one, otherwise its MCQ
 * `quiz`), so a set with only MCQs behaves exactly as before. Interactions are all tap-based — no
 * literal dragging — which is both kinder to young hands and reachable by VoiceOver.
 */

// Deterministic shuffle keyed on the question id (order/match display order must be stable across
// re-renders, and Math.random in render is impure under the React Compiler). Simple LCG over a seed.
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const arr = items.map((value, index) => ({ value, index }))
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.map((a) => a.value)
}

const FILL: Record<string, string> = {
  "1/4": "w-1/4", "2/4": "w-2/4", "3/4": "w-3/4", "4/4": "w-full",
  "1/5": "w-1/5", "2/5": "w-2/5", "3/5": "w-3/5", "4/5": "w-4/5", "5/5": "w-full",
  "1/6": "w-1/6", "2/6": "w-2/6", "3/6": "w-3/6", "4/6": "w-4/6", "5/6": "w-5/6", "6/6": "w-full",
}

const optionCard = (state: "idle" | "selected" | "correct" | "wrong") =>
  state === "selected"
    ? "border-primary bg-quiz-option-sel"
    : state === "correct"
      ? "border-status-getting bg-quiz-option-sel"
      : state === "wrong"
        ? "border-error bg-quiz-option-sel"
        : "border-border bg-quiz-option"

/** A tappable answer row shared by MCQ (radio) and multi-select (checkbox). */
function OptionRow({
  glyph,
  label,
  state,
  onPress,
  disabled,
}: {
  glyph: string
  label: string
  state: "idle" | "selected" | "correct" | "wrong"
  onPress: () => void
  disabled: boolean
}) {
  const disc =
    state === "selected" ? "bg-primary" : state === "correct" ? "bg-status-getting" : state === "wrong" ? "bg-error" : "bg-quiz-chip"
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: state === "selected" }}
      disabled={disabled}
      className={`mb-3 h-16 flex-row items-center rounded-2xl border px-3 active:opacity-90 ${optionCard(state)}`}
      onPress={onPress}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${disc}`}>
        <Text className={`font-text text-body-lg font-bold ${state === "idle" ? "text-ink" : "text-white"}`}>{glyph}</Text>
      </View>
      <Text className="ml-4 flex-1 font-text text-field font-semibold text-ink">{label}</Text>
    </Pressable>
  )
}

const LETTERS = ["A", "B", "C", "D", "E", "F"]

/**
 * Renders one question and reports responses upward. Everything is driven by `response` + `onChange`,
 * so the parent owns state and can lock the card once `checked`.
 */
/**
 * §7 "Image Questions". Any question kind may carry a picture (see `MixedBase` in lib/study.ts) —
 * this renders it, or nothing, so each branch below is one line rather than a repeated block that
 * only some kinds remembered to include.
 */
function Illustration({ source }: { source?: number }) {
  if (!source) return null
  return (
    <View className="mb-6 rounded-2xl bg-quiz-card px-4 pb-3 pt-4">
      <Image accessibilityIgnoresInvertColors className="h-40 w-full" contentFit="contain" source={source} />
    </View>
  )
}

function Question({
  q,
  response,
  onChange,
  checked,
}: {
  q: MixedQuestion
  response: QuizResponse
  onChange: (r: QuizResponse) => void
  checked: boolean
}) {
  if (q.kind === "mcq" && response.kind === "mcq") {
    return (
      <View>
        <Illustration source={q.illustration} />
        {q.options.map((opt, i) => {
          const state = checked
            ? i === q.answer
              ? "correct"
              : i === response.choice
                ? "wrong"
                : "idle"
            : response.choice === i
              ? "selected"
              : "idle"
          return (
            <OptionRow
              key={i}
              glyph={LETTERS[i]}
              label={opt}
              state={state}
              disabled={checked}
              onPress={() => onChange({ kind: "mcq", choice: i })}
            />
          )
        })}
      </View>
    )
  }

  if (q.kind === "multi" && response.kind === "multi") {
    const toggle = (i: number) => {
      const has = response.choices.includes(i)
      onChange({ kind: "multi", choices: has ? response.choices.filter((c) => c !== i) : [...response.choices, i] })
    }
    return (
      <View>
        <Illustration source={q.illustration} />
        <Text className="mb-4 text-center font-text text-body text-text-secondary">Choose all that apply.</Text>
        {q.options.map((opt, i) => {
          const picked = response.choices.includes(i)
          const isAnswer = q.answers.includes(i)
          const state = checked ? (isAnswer ? "correct" : picked ? "wrong" : "idle") : picked ? "selected" : "idle"
          return (
            <OptionRow
              key={i}
              glyph={picked || (checked && isAnswer) ? "✓" : ""}
              label={opt}
              state={state}
              disabled={checked}
              onPress={() => toggle(i)}
            />
          )
        })}
      </View>
    )
  }

  if (q.kind === "fill" && response.kind === "fill") {
    const right = isResponseCorrect(q, response)
    return (
      <View>
        <Illustration source={q.illustration} />
        <TextInput
          accessibilityLabel="Your answer"
          editable={!checked}
          value={response.text}
          onChangeText={(text) => onChange({ kind: "fill", text })}
          placeholder="Type your answer"
          placeholderTextColor={colors["text-secondary"]}
          className={`h-16 rounded-2xl border px-4 text-center font-text text-h3 font-bold text-ink ${
            checked ? (right ? "border-status-getting bg-quiz-option-sel" : "border-error bg-quiz-option-sel") : "border-border bg-quiz-option"
          }`}
        />
        {checked && !right ? (
          <Text className="mt-3 text-center font-text text-body text-text-secondary">
            Answer: <Text className="font-bold text-ink">{q.accept[0]}</Text>
          </Text>
        ) : null}
      </View>
    )
  }

  if (q.kind === "order" && response.kind === "order") {
    // The child taps items in the order they choose; tapping again removes. Display order is the
    // shuffle; `response.order` holds the ORIGINAL indices in the picked sequence.
    const display = shuffled(
      q.items.map((_, i) => i),
      q.id
    )
    const positionOf = (origIndex: number) => response.order.indexOf(origIndex)
    const tap = (origIndex: number) => {
      const at = positionOf(origIndex)
      onChange({ kind: "order", order: at >= 0 ? response.order.filter((v) => v !== origIndex) : [...response.order, origIndex] })
    }
    return (
      <View>
        <Illustration source={q.illustration} />
        <Text className="mb-4 text-center font-text text-body text-text-secondary">Tap in order, smallest first.</Text>
        {display.map((origIndex) => {
          const pos = positionOf(origIndex)
          const correctPos = checked ? origIndex : -1
          const state = checked ? (pos === correctPos ? "correct" : "wrong") : pos >= 0 ? "selected" : "idle"
          return (
            <OptionRow
              key={origIndex}
              glyph={pos >= 0 ? String(pos + 1) : ""}
              label={q.items[origIndex]}
              state={state}
              disabled={checked}
              onPress={() => tap(origIndex)}
            />
          )
        })}
      </View>
    )
  }

  if (q.kind === "match" && response.kind === "match") {
    return <MatchQuestion q={q} pairs={response.pairs} onChange={(pairs) => onChange({ kind: "match", pairs })} checked={checked} />
  }

  return null
}

/** Match is the one type needing per-question local state (which left is "active" awaiting a right).
 *  A separate component so that state is a normal useState, reset by the keyed remount per question. */
function MatchQuestion({
  q,
  pairs,
  onChange,
  checked,
}: {
  q: Extract<MixedQuestion, { kind: "match" }>
  pairs: number[]
  onChange: (pairs: number[]) => void
  checked: boolean
}) {
  const [activeLeft, setActiveLeft] = useState<number | null>(null)
  const rightOrder = shuffled(
    q.pairs.map((_, i) => i),
    q.id
  )
  const rightTakenBy = (rightIdx: number) => pairs.findIndex((v) => v === rightIdx)
  const pickLeft = (i: number) => setActiveLeft(activeLeft === i ? null : i)
  const pickRight = (rightIdx: number) => {
    if (activeLeft === null) return
    onChange(
      pairs.map((v, i) => {
        if (i === activeLeft) return rightIdx
        if (v === rightIdx) return -1 // a right can only belong to one left
        return v
      })
    )
    setActiveLeft(null)
  }
  return (
    <View>
      <Illustration source={q.illustration} />
      <View className="flex-row gap-3">
      <View className="flex-1">
        {q.pairs.map((p, i) => {
          const state = checked ? (pairs[i] === i ? "correct" : "wrong") : activeLeft === i || pairs[i] >= 0 ? "selected" : "idle"
          return (
            <Pressable
              key={p.left}
              accessibilityRole="button"
              accessibilityLabel={p.left}
              disabled={checked}
              className={`mb-3 h-14 items-center justify-center rounded-2xl border px-2 active:opacity-90 ${optionCard(state)}`}
              onPress={() => pickLeft(i)}
            >
              <Text className="font-text text-body font-bold text-ink">{p.left}</Text>
            </Pressable>
          )
        })}
      </View>
      <View className="flex-1">
        {rightOrder.map((rightIdx) => {
          const takenBy = rightTakenBy(rightIdx)
          const state = checked
            ? takenBy === rightIdx
              ? "correct"
              : takenBy >= 0
                ? "wrong"
                : "idle"
            : takenBy >= 0
              ? "selected"
              : "idle"
          return (
            <Pressable
              key={q.pairs[rightIdx].right}
              accessibilityRole="button"
              accessibilityLabel={q.pairs[rightIdx].right}
              disabled={checked}
              className={`mb-3 h-14 flex-row items-center justify-center rounded-2xl border px-2 active:opacity-90 ${optionCard(state)}`}
              onPress={() => pickRight(rightIdx)}
            >
              {takenBy >= 0 ? (
                <View className="mr-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Text className="font-text text-caption font-bold text-white">{takenBy + 1}</Text>
                </View>
              ) : null}
              <Text className="font-text text-body font-bold text-ink">{q.pairs[rightIdx].right}</Text>
            </Pressable>
          )
        })}
      </View>
      </View>
    </View>
  )
}

export default function Quiz() {
  const { id, mode, start, answers } = useLocalSearchParams<{
    id: string
    mode?: string
    /** Question to open on — set when returning from the Final Review to change one answer. */
    start?: string
    /** Answers carried back from the Final Review, so nothing the child typed is lost. */
    answers?: string
  }>()
  const set = getStudySet(id)
  // §7 "Final Review". In test mode nothing is marked until the child has answered everything and
  // looked back over it — which is the whole point of a review pass, and impossible while each
  // question is scored the instant it is answered. Practice keeps the instant feedback.
  const testMode = mode === "test"
  const items = useMemo(() => (set ? quizItems(set) : []), [set])

  // Lazy initialisers, so re-entering from the review restores the child's work and lands them on
  // the question they tapped rather than back at question one with an empty sheet.
  const [index, setIndex] = useState(() => {
    const n = Number(start)
    return Number.isFinite(n) && n >= 0 ? n : 0
  })
  const [checked, setChecked] = useState(false)
  const [responses, setResponses] = useState<QuizResponse[]>(() => decodeAnswers(answers))

  if (!set) return <Redirect href="/home" />
  if (items.length === 0) return <Redirect href="/home" />

  const setId = set.id
  const total = items.length
  const q = items[index]
  const response = responses[index] ?? blankResponse(q)

  const answered = (() => {
    switch (response.kind) {
      case "mcq":
        return response.choice !== null
      case "multi":
        return response.choices.length > 0
      case "fill":
        return response.text.trim().length > 0
      case "order":
        return response.order.length === (q.kind === "order" ? q.items.length : 0)
      case "match":
        return response.pairs.every((v) => v >= 0)
    }
  })()

  function setResponse(r: QuizResponse) {
    setResponses((prev) => {
      const next = [...prev]
      next[index] = r
      return next
    })
  }

  function finish(finalResponses: QuizResponse[]) {
    // Score from the responses rather than a running tally: in test mode a child can go back and
    // change an answer, so a counter incremented at answer-time would be wrong.
    const total = items.reduce(
      (sum, item, i) => sum + (finalResponses[i] && isResponseCorrect(item, finalResponses[i]) ? 1 : 0),
      0
    )
    router.replace({
      pathname: "/result/[id]",
      params: { id: setId, score: String(total), answers: encodeAnswers(finalResponses) },
    })
  }

  function onPrimary() {
    if (testMode) {
      // No marking here — just move on. The last question hands over to the review pass.
      if (!answered) return
      if (index + 1 >= total) {
        router.replace({
          pathname: "/quiz/final-review/[id]",
          params: { id: setId, answers: encodeAnswers(responses) },
        })
        return
      }
      setIndex(index + 1)
      return
    }

    if (!checked) {
      if (!answered) return
      // No running tally: `finish` scores from the responses as they finally stand, which is the
      // only correct source once a child can go back and change one.
      setChecked(true)
      return
    }
    if (index + 1 >= total) {
      finish(responses)
      return
    }
    setIndex(index + 1)
    setChecked(false)
  }

  const primaryLabel = testMode
    ? index + 1 >= total
      ? "Review answers"
      : "Next"
    : !checked
      ? "Check answer"
      : index + 1 >= total
        ? "See results"
        : "Next"

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
          <View className={`h-full rounded-full bg-study-teal ${FILL[`${index + 1}/${total}`] ?? "w-full"}`} />
        </View>

        <Text className="mb-6 mt-8 text-center font-text text-h2 font-bold leading-[34px] text-ink">{q.prompt}</Text>

        {/* key on the question id so per-question local state (match's active-left) resets cleanly */}
        <Question key={q.id} q={q} response={response} onChange={setResponse} checked={checked && !testMode} />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        disabled={!checked && !answered}
        className={`mb-2 mt-3 h-14 items-center justify-center rounded-full active:opacity-90 ${
          !checked && !answered ? "bg-study-track" : "bg-study-teal"
        }`}
        onPress={onPrimary}
      >
        <Text className="font-text text-body-lg font-bold text-white">{primaryLabel}</Text>
      </Pressable>
    </SafeAreaView>
  )
}
