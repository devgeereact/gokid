import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { getStudySet } from "@/lib/study"

/**
 * Set results (design/GoKid-setresult-screen.png, screen 18). Post-quiz breakdown: an accuracy ring
 * summary card, a four-stat row, per-difficulty rings, a horizontal question-review strip, and a
 * "what to try next" prompt. All figures (accuracy %, correct/incorrect counts, time, streak, the
 * difficulty splits, completion time) are demo constants matching the mockup — the Neon/Drizzle
 * progress API lands later (AGENTS.md). The "18. Set Results" title annotation is dropped. The
 * "what to try next" chart is a tinted SF Symbol (no bundled asset for it) — inferred.
 */

// Per-difficulty performance — demo data, numbers taken from the mockup.
const DIFFICULTY = [
  { label: "Easy", pct: 100, ratio: "10 / 10", color: colors.success, text: "text-success" },
  { label: "Medium", pct: 80, ratio: "6 / 8", color: colors.accent, text: "text-accent" },
  { label: "Hard", pct: 50, ratio: "1 / 2", color: colors.error, text: "text-error" },
] as const

// Single-arc percentage ring (a light track circle + a coloured arc). The label is overlaid on top,
// centred over the SVG box.
function Ring({
  pct,
  color,
  size,
  stroke,
  children,
}: {
  pct: number
  color: string
  size: number
  stroke: number
  children: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const len = (pct / 100) * c
  return (
    <View className="relative items-center justify-center">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.gamify.track} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len} ${c - len}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">{children}</View>
    </View>
  )
}

function MetaRow({ symbol, label }: { symbol: SFSymbol; label: string }) {
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <SymbolView name={symbol} size={16} tintColor={colors["text-secondary"]} weight="regular" />
      <Text className="font-text text-body text-text-secondary">{label}</Text>
    </View>
  )
}

function Stat({
  symbol,
  tint,
  value,
  label,
}: {
  symbol: SFSymbol
  tint: string
  value: string
  label: string
}) {
  return (
    <View className="flex-1 items-center">
      <SymbolView name={symbol} size={26} tintColor={tint} weight="regular" />
      <Text className="mt-2 font-text text-body-lg font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-center font-text text-caption text-text-secondary">{label}</Text>
    </View>
  )
}

export default function SetResult() {
  const { id, score } = useLocalSearchParams<{ id: string; score?: string }>()
  const set = getStudySet(id)
  if (!set) return <Redirect href="/home" />

  // Demo figures (mockup). If a score was passed from the quiz it drives the "Correct" stat; the rest
  // stay demo until the progress API lands.
  const correct = Number(score) || 17
  const total = 20

  // Question review — the first four quiz entries. #3 is marked wrong (matching the mockup) with a
  // stand-in incorrect answer and the correct answer revealed below.
  const review = set.quiz.slice(0, 4).map((q, i) => {
    const correctText = q.options[q.answer]
    const wrong = i === 2
    const yourText = wrong ? (q.options.find((_, idx) => idx !== q.answer) ?? correctText) : correctText
    return { key: q.id, n: i + 1, prompt: q.prompt, correctText, yourText, wrong }
  })

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back / title / share */}
      <View className="mt-1 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Set Results</Text>
        <View className="h-11 w-11 items-center justify-center">
          <SymbolView name="square.and.arrow.up" size={22} tintColor={colors.ink} weight="regular" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View className="rounded-2xl border border-border bg-white p-4">
          <View className="flex-row">
            <Image
              accessibilityIgnoresInvertColors
              className="h-20 w-20 rounded-xl"
              contentFit="cover"
              source={set.hero}
            />
            <View className="ml-3 flex-1">
              <Text className="font-text text-h3 font-bold text-ink">{set.title}</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                {set.cardsTotal} cards • {set.subject} • {set.yearGroup}
              </Text>
            </View>
            <View className="ml-2 items-center">
              <Ring pct={85} color={colors.primary} size={92} stroke={8}>
                <Text className="font-text text-body-lg font-bold text-ink">85%</Text>
                <Text className="font-text text-caption text-text-secondary">Accuracy</Text>
              </Ring>
              <View className="mt-2 flex-row items-center gap-1 rounded-full bg-gamify-green-wash px-3 py-1">
                <SymbolView name="star.fill" size={13} tintColor={colors.success} weight="regular" />
                <Text className="font-text text-caption font-bold text-success">Great job!</Text>
              </View>
            </View>
          </View>
          <MetaRow symbol="calendar" label="Completed today, 10:30 AM" />
          <MetaRow symbol="clock" label="Time taken: 12m 45s" />
        </View>

        {/* Four-stat row */}
        <View className="mt-4 flex-row rounded-2xl border border-border bg-white p-4">
          <Stat symbol="checkmark.circle.fill" tint={colors.success} value={`${correct} / ${total}`} label="Correct" />
          <Stat symbol="xmark.circle.fill" tint={colors.error} value="3 / 20" label="Incorrect" />
          <Stat symbol="clock" tint={colors.accent} value="12m 45s" label="Time taken" />
          <Stat symbol="target" tint={colors.gamify.purple} value="8" label="Longest streak" />
        </View>

        {/* Performance by difficulty */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Performance by difficulty</Text>
        <View className="flex-row gap-3">
          {DIFFICULTY.map((d) => (
            <View key={d.label} className="flex-1 items-center rounded-2xl border border-border bg-white py-4">
              <Text className={`mb-3 font-text text-body-lg font-bold ${d.text}`}>{d.label}</Text>
              <Ring pct={d.pct} color={d.color} size={76} stroke={7}>
                <Text className={`font-text text-body-lg font-bold ${d.text}`}>{d.pct}%</Text>
              </Ring>
              <Text className="mt-3 font-text text-body text-text-secondary">{d.ratio}</Text>
            </View>
          ))}
        </View>

        {/* Question review */}
        <View className="mb-3 mt-8 flex-row items-center justify-between">
          <Text className="font-text text-h3 font-bold text-ink">Question review</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review all questions"
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <Text className="font-text text-body-lg font-bold text-primary">Review all</Text>
            <SymbolView name="chevron.right" size={15} tintColor={colors.primary} weight="semibold" />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="pr-5"
          className="-mr-5"
        >
          {review.map((q) => (
            <View key={q.key} className="mr-3 w-64 rounded-2xl border border-border bg-white p-4">
              <View className="flex-row items-center justify-between">
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${q.wrong ? "bg-error" : "bg-success"}`}
                >
                  <Text className="font-text text-body font-bold text-white">{q.n}</Text>
                </View>
                <SymbolView
                  name={q.wrong ? "xmark" : "checkmark"}
                  size={16}
                  tintColor={q.wrong ? colors.error : colors.success}
                  weight="bold"
                />
              </View>
              <Text numberOfLines={2} className="mt-3 min-h-11 font-text text-body font-semibold text-ink">
                {q.prompt}
              </Text>
              <View className={`mt-3 rounded-xl p-3 ${q.wrong ? "bg-gamify-red-wash" : "bg-gamify-green-wash"}`}>
                <Text className="text-center font-text text-caption text-text-secondary">Your answer</Text>
                <Text
                  className={`mt-0.5 text-center font-text text-body-lg font-bold ${q.wrong ? "text-error" : "text-success"}`}
                >
                  {q.yourText}
                </Text>
                {q.wrong ? (
                  <Text className="mt-1 text-center font-text text-caption text-error">
                    Correct answer: {q.correctText}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* What to try next */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">What to try next</Text>
        <View className="flex-row items-center rounded-2xl border border-border bg-white p-4">
          <View className="h-16 w-16 items-center justify-center rounded-xl bg-gamify-purple-wash">
            <SymbolView name="chart.bar.fill" size={30} tintColor={colors.gamify.purple} weight="regular" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">Build on your progress!</Text>
            <Text className="mt-1 font-text text-body text-text-secondary">
              Try more medium and hard questions to strengthen your skills.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Practice more"
              className="mt-3 h-11 flex-row items-center justify-center gap-1 self-start rounded-full border border-primary px-4 active:opacity-70"
              onPress={() => router.push({ pathname: "/study/session/[id]", params: { id: set.id } })}
            >
              <Text className="font-text text-body font-bold text-primary">Practice more</Text>
              <SymbolView name="chevron.right" size={14} tintColor={colors.primary} weight="semibold" />
            </Pressable>
          </View>
        </View>

        {/* Bottom actions */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue studying"
          className="mt-8 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.replace({ pathname: "/study/congratulations/[id]", params: { id: set.id } })}
        >
          <Text className="font-text text-body-lg font-bold text-white">Continue studying</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sets"
          className="mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.replace("/study")}
        >
          <Text className="font-text text-body-lg font-bold text-primary">Back to sets</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
