import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { BackButton } from "@/components/primitives"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useStudyingChildId } from "@/lib/children"
import { useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Set results (design/GoKid-setresult-screen.png, screen 18). Post-quiz breakdown: an accuracy ring
 * summary card, a four-stat row, per-difficulty rings, a horizontal question-review strip, and a
 * "what to try next" prompt. Accuracy %, correct/incorrect counts, time and the difficulty splits
 * are still demo constants matching the mockup — the Neon/Drizzle progress API lands later
 * (AGENTS.md); "Cards learned" is real, read from the spaced-repetition record. The mockup's
 * "Longest streak" tile is gone — design/gokid-screens.md §9 rejects streaks. The "18. Set Results"
 * title annotation is dropped. The "what to try next" chart is a tinted SF Symbol (no bundled asset
 * for it) — inferred.
 */

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
  const childId = useStudyingChildId() ?? ""
  const { cards } = useProgress(childId)
  const set = getStudySet(id)
  if (!set) return <Redirect href="/home" />

  // Box 2+ — recalled correctly at least twice across widening gaps. Real, from the SRS record.
  const learned = cards.filter((c) => c.setId === set.id && c.box >= 2).length

  // Real figures: the quiz's own length, and the score the runner passed. A score is only shown when
  // one was actually recorded — this screen is also reached from progress, with no quiz behind it.
  const total = set.quiz.length
  const scored = score !== undefined && score !== ""
  const correct = Math.min(Number(score) || 0, total)
  const accuracy = scored && total > 0 ? Math.round((correct / total) * 100) : null

  // The per-question review the mockup drew is gone: this screen is handed a score, not the child's
  // answers, so it previously invented one — always marking question 3 wrong. The real per-question
  // replay lives on /quiz/review/[id], which does receive the responses.

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back / title / share */}
      <View className="mt-1 flex-row items-center">
        <BackButton />
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
              <Ring pct={accuracy ?? 0} color={colors.primary} size={92} stroke={8}>
                <Text className="font-text text-body-lg font-bold text-ink">
                  {accuracy === null ? "—" : `${accuracy}%`}
                </Text>
                <Text className="font-text text-caption text-text-secondary">Accuracy</Text>
              </Ring>
              <View className="mt-2 flex-row items-center gap-1 rounded-full bg-gamify-green-wash px-3 py-1">
                <SymbolView name="star.fill" size={13} tintColor={colors.success} weight="regular" />
                <Text className="font-text text-caption font-bold text-success">Great job!</Text>
              </View>
            </View>
          </View>
          <MetaRow symbol="square.stack" label={`${set.cardsTotal} cards • ${total} questions`} />
        </View>

        {/* Four-stat row */}
        <View className="mt-4 flex-row rounded-2xl border border-border bg-white p-4">
          <Stat symbol="checkmark.circle.fill" tint={colors.success} value={`${correct} / ${total}`} label="Correct" />
          <Stat
            symbol="xmark.circle.fill"
            tint={colors.error}
            value={scored ? `${total - correct} / ${total}` : "—"}
            label="Incorrect"
          />
          {/* The reference's fourth tile was "Longest streak: 8" — a run of consecutive correct
              answers, which rewards not slipping rather than learning (§9). Replaced with the
              schedule outcome: how many of this set's cards are now genuinely retained. */}
          <Stat symbol="brain.head.profile" tint={colors.gamify.green} value={String(learned)} label="Cards learned" />
        </View>

        {/* Question review lives on the screen that actually has the answers. */}
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
