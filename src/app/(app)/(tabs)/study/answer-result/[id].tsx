import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { nextDueLabel, useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Answer Result (design/GoKid-answerresult-screen.png, screen 20). Per-question feedback shown after
 * a card is answered in the study session: a correct/incorrect badge, a recall ring, the child's
 * answer beside the correct one, an explanation, session stats and the "what's next" entry point.
 * The "20. Answer Result" title is a mockup annotation — dropped.
 *
 * The reference rewards a correct answer with "+10 points" and shows a streak counter. Both are
 * extrinsic mechanics that design/gokid-screens.md §9 rejects. The honest reward for recalling a
 * card is what the spaced-repetition engine does with it: the card moves up a box and comes back
 * later. So the ring now shows the recall interval the answer just earned — "Back in 5 days" — which
 * is a real consequence rather than a number invented to feel good.
 *
 * Inferred (no design-system token / asset for these):
 *   - Accuracy is still a demo constant — the Neon/Drizzle progress API lands later (AGENTS.md).
 *   - Ring + confetti drawn with react-native-svg / tinted views (the ref art has no asset).
 *   - "What's next" bar illustration is a tinted `chart.bar.fill` SymbolView (no bundled asset).
 *   - The Hundreds/Tens/Ones place-value table is rendered only for the place-value set, as in the ref.
 */

// Progress-bar fill is data-driven (card index / total), so the percentage is not a fixed literal.
// NativeWind only emits width classes it finds as literal source text, so the rounded-to-5 percentage
// is looked up in this map rather than interpolated into a `w-[..%]` string.
const BAR: Record<number, string> = {
  0: "w-[0%]", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-[100%]",
}

/**
 * The reward ring. Fills on a correct recall and names the interval the card just earned; on a miss
 * it stays open and says the card comes back tomorrow. Both are true statements about the schedule,
 * which is the point — the child is being told what happens next, not handed a score.
 */
function RecallRing({ correct, label }: { correct: boolean; label: string }) {
  const r = 56
  const c = 2 * Math.PI * r
  const filled = correct ? c : 0
  return (
    <View className="h-[132px] w-[132px] items-center justify-center">
      <Svg width={132} height={132} viewBox="0 0 132 132">
        <Circle cx={66} cy={66} r={r} fill="none" stroke={colors.gamify["green-wash"]} strokeWidth={10} />
        <Circle
          cx={66}
          cy={66}
          r={r}
          fill="none"
          stroke={colors.gamify.green}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90 66 66)"
        />
      </Svg>
      <View className="absolute items-center px-4">
        <SymbolView
          name={correct ? "checkmark.circle.fill" : "arrow.clockwise"}
          size={26}
          tintColor={correct ? colors.gamify.green : colors.accent}
          weight="semibold"
        />
        <Text className="mt-1 text-center font-text text-caption text-text-secondary">Back</Text>
        <Text
          numberOfLines={1}
          className={`text-center font-text text-body-lg font-bold ${correct ? "text-gamify-green" : "text-accent"}`}
        >
          {label}
        </Text>
      </View>
    </View>
  )
}

function Confetti() {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      <View className="absolute left-2 top-6 h-2.5 w-2.5 rotate-45 rounded-sm bg-gamify-blue" />
      <View className="absolute right-2 top-3 h-2.5 w-2.5 rotate-12 rounded-sm bg-accent" />
      <View className="absolute right-6 top-16 h-2.5 w-2.5 -rotate-12 rounded-sm bg-gamify-blue" />
      <View className="absolute left-4 top-20 h-2.5 w-2.5 rotate-45 rounded-sm bg-error" />
      <View className="absolute left-1 top-14 h-2.5 w-2.5 rotate-12 rounded-sm bg-accent" />
    </View>
  )
}

function Stat({
  symbol,
  tint,
  wash,
  label,
  value,
  foot,
  footWash,
  footInk,
}: {
  symbol: SFSymbol
  tint: string
  wash: string
  label: string
  value: string
  foot: string
  footWash: string
  footInk: string
}) {
  return (
    <View className="flex-1 items-center">
      <View className={`h-14 w-14 items-center justify-center rounded-full ${wash}`}>
        <SymbolView name={symbol} size={26} tintColor={tint} weight="semibold" />
      </View>
      <Text className="mt-3 text-center font-text text-caption text-text-secondary">{label}</Text>
      <Text className="mt-1 font-text text-h3 font-bold text-ink">{value}</Text>
      <View className={`mt-2 rounded-full px-3 py-1 ${footWash}`}>
        <Text className={`font-text text-caption font-semibold ${footInk}`}>{foot}</Text>
      </View>
    </View>
  )
}

function PlaceValueTable() {
  const cols = [
    { head: "Hundreds", wash: "bg-gamify-green-wash", digit: "7", hi: false },
    { head: "Tens", wash: "bg-gamify-blue-wash", digit: "2", hi: true },
    { head: "Ones", wash: "bg-gamify-amber-wash", digit: "8", hi: false },
  ]
  return (
    <View className="mt-4 flex-row overflow-hidden rounded-md border border-border">
      {cols.map((col, idx) => (
        <View key={col.head} className={`flex-1 ${idx < 2 ? "border-r border-border" : ""}`}>
          <View className={`items-center py-2 ${col.wash}`}>
            <Text className="font-text text-caption font-semibold text-ink">{col.head}</Text>
          </View>
          <View className="items-center bg-white py-4">
            <Text className={`font-text text-h3 font-bold ${col.hi ? "text-gamify-blue underline" : "text-ink"}`}>
              {col.digit}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

export default function AnswerResult() {
  const { id, index, choice } = useLocalSearchParams<{ id: string; index?: string; choice?: string }>()
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const { cards } = useProgress(childId)
  const set = getStudySet(id)
  if (!set) return <Redirect href="/home" />

  const name = (children.find((c) => c.id === childId) ?? children[0])?.name ?? "there"

  const i = Number(index ?? 0) || 0
  const q = set.quiz[i % set.quiz.length]
  const chosen = Number(choice ?? -1)
  const correct = chosen === q.answer

  // What this answer earns on the schedule. `nextDueLabel` runs the same `schedule` the flashcard
  // runner writes through, so the ring promises exactly what the engine will do — tomorrow on a
  // miss, a widening gap on a recall.
  const existing = cards.find((c) => c.setId === set.id && c.cardId === q.id)
  const nextLabel = nextDueLabel(existing, correct ? "gotit" : "tricky")

  const setCards = cards.filter((c) => c.setId === set.id)
  const learned = setCards.filter((c) => c.box >= 2).length
  const returning = setCards.filter((c) => c.box < 2).length

  // This set's real recall rate: of the cards rated so far, how many came back as "got it".
  const recalled = setCards.filter((c) => c.lastRating === "gotit").length
  const accuracy = setCards.length ? Math.round((recalled / setCards.length) * 100) : null

  const yourAnswer = q.options[chosen] ?? "—"
  const correctAnswer = q.options[q.answer]

  const filled = Math.min(100, Math.max(0, Math.round(((i + 1) / set.cardsTotal) * 20) * 5))

  const onNext = () => {
    const next = i + 1
    if (next < set.cards.length) {
      router.replace({ pathname: "/study/session/[id]", params: { id: set.id, index: String(next) } })
    } else {
      router.replace({ pathname: "/study/session-summary/[id]", params: { id: set.id } })
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center">
        <BackButton />
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Answer Result</Text>
        <View className="h-11 w-11 items-center justify-center">
          <SymbolView name="bookmark" size={24} tintColor={colors.ink} weight="regular" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-35 pt-2" showsVerticalScrollIndicator={false}>
        {/* Result + reward */}
        <View className="mt-2 overflow-hidden rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-start">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center">
                <SymbolView
                  name={correct ? "checkmark.seal.fill" : "xmark.seal.fill"}
                  size={30}
                  tintColor={correct ? colors.success : colors.error}
                  weight="semibold"
                />
                <Text className={`ml-2 font-text text-h3 font-bold ${correct ? "text-success" : "text-error"}`}>
                  {correct ? "Correct!" : "Not quite"}
                </Text>
              </View>
              <Text className="mt-4 font-text text-h3 font-bold text-ink">
                {correct ? `Great job, ${name}! 🎉` : `Good try, ${name}!`}
              </Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                {correct ? "You answered correctly." : "The correct answer is shown below."}
              </Text>
            </View>
            <View className="relative">
              {correct ? <Confetti /> : null}
              <RecallRing correct={correct} label={nextLabel} />
            </View>
          </View>

          <View className="my-5 h-px bg-border" />

          {/* Your answer / Correct answer */}
          <View className="flex-row">
            <View className="flex-1 border-r border-border pr-4">
              <Text className="font-text text-body font-semibold text-ink">Your answer</Text>
              <View
                className={`mt-2 items-center justify-center rounded-md py-4 ${
                  correct ? "bg-gamify-green-wash" : "bg-gamify-red-wash"
                }`}
              >
                <Text
                  numberOfLines={1}
                  className={`font-text text-h2 font-bold ${correct ? "text-success" : "text-error"}`}
                >
                  {yourAnswer}
                </Text>
              </View>
            </View>
            <View className="flex-1 pl-4">
              <Text className="font-text text-body font-semibold text-ink">Correct answer</Text>
              <View className="mt-2 items-center justify-center rounded-md bg-gamify-green-wash py-4">
                <Text numberOfLines={1} className="font-text text-h2 font-bold text-success">
                  {correctAnswer}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Explanation */}
        <View className="mt-4 rounded-2xl bg-gamify-blue-wash p-5">
          <View className="flex-row items-center">
            <SymbolView name="lightbulb.fill" size={22} tintColor={colors.gamify.blue} weight="semibold" />
            <Text className="ml-2 font-text text-h3 font-bold text-ink">Explanation</Text>
          </View>
          <Text className="mt-3 font-text text-body-lg text-ink">
            The correct answer is {correctAnswer}.
          </Text>
          <Text className="mt-1 font-text text-body text-text-secondary">
            Read the question again and check each option against it — the right choice always matches every clue.
          </Text>
          {set.id === "place-value" ? <PlaceValueTable /> : null}
        </View>

        {/* Session stats. The reference's "Current streak" and "Points earned" tiles are gone (§9);
            what stands in their place is this set's real recall state. */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Keep it up! You&apos;re doing well.</Text>
          <View className="flex-row">
            <Stat
              symbol="target"
              tint={colors.success}
              wash="bg-gamify-green-wash"
              label="Accuracy"
              value={accuracy === null ? "—" : `${accuracy}%`}
              foot={accuracy === null ? "No cards rated yet" : `${recalled} of ${setCards.length} recalled`}
              footWash="bg-gamify-green-wash"
              footInk="text-success"
            />
            <Stat
              symbol="brain.head.profile"
              tint={colors.gamify.green}
              wash="bg-gamify-green-wash"
              label="Cards learned"
              value={String(learned)}
              foot="In this set"
              footWash="bg-gamify-green-wash"
              footInk="text-gamify-green"
            />
            <Stat
              symbol="arrow.clockwise"
              tint={colors.gamify.blue}
              wash="bg-gamify-blue-wash"
              label="Coming back"
              value={String(returning)}
              foot="To make it stick"
              footWash="bg-gamify-blue-wash"
              footInk="text-gamify-blue"
            />
          </View>
        </View>

        {/* What's next */}
        <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">What&apos;s next?</Text>
        <View className="rounded-2xl border border-border bg-white p-4">
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-lg bg-gamify-purple-wash">
              <SymbolView name="chart.bar.fill" size={30} tintColor={colors.gamify.purple} weight="semibold" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-text text-body-lg font-bold text-ink">Keep going!</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                You&apos;re on a roll. Ready for the next card?
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next card"
            className="mt-4 h-14 flex-row items-center justify-center rounded-full bg-study-teal active:opacity-90"
            onPress={onNext}
          >
            <Text className="font-text text-body-lg font-bold text-white">Next card</Text>
            <SymbolView name="arrow.right" size={18} tintColor={colors.white} weight="bold" style={{ marginLeft: 10 }} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to set"
            className="mt-3 h-11 items-center justify-center active:opacity-60"
            onPress={() => router.replace({ pathname: "/lesson/[id]", params: { id: set.id } })}
          >
            <Text className="font-text text-body-lg font-bold text-study-teal underline">Back to set</Text>
          </Pressable>
        </View>

        {/* Progress in this set */}
        <View className="mt-8 flex-row items-center justify-between">
          <Text className="font-text text-body font-semibold text-ink">Progress in this set</Text>
          <Text className="font-text text-body text-text-secondary">
            {i + 1} / {set.cardsTotal} cards
          </Text>
        </View>
        <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-gamify-track">
          <View className={`h-full rounded-full bg-study-teal ${BAR[filled]}`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
