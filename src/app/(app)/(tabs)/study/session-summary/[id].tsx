import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg"

import { ChildAvatar } from "@/components/child-avatar"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren } from "@/lib/children"
import { getStudySet } from "@/lib/study"

/**
 * Session Summary (design/GoKid-sectionsummary-screen.png, screen 21). End-of-session recap: a hero
 * with points earned, five overview stat tiles, an accuracy-trend line chart, a performance-by-
 * difficulty donut, top-strengths / needs-practice bar cards, a study tip, an achievements strip and
 * the two continue/break actions. Every number here is a demo constant (the Neon/Drizzle progress API
 * lands later — AGENTS.md), matched to the mockup. The "21. Session Summary" numbering is a mockup
 * annotation — dropped. The header share glyph is a static (non-navigating) icon per the design.
 * Confetti flecks around the hero are decorative in the mock and omitted. Row icons use the nearest SF
 * Symbols (the mock draws bespoke illustrations) — inferred.
 */

// Data-driven bar/segment widths as literal classes so NativeWind's compiler emits them (it scans
// source text — an interpolated `w-[${n}%]` would never be generated).
const PCT: Record<number, string> = {
  40: "w-[40%]",
  50: "w-[50%]",
  88: "w-[88%]",
  95: "w-[95%]",
  100: "w-[100%]",
}

type Stat = { symbol: SFSymbol; wash: string; tint: string; label: string; value: string }

const STATS: Stat[] = [
  { symbol: "clock", wash: "bg-gamify-green-wash", tint: colors.success, label: "Time spent", value: "18m 30s" },
  { symbol: "rectangle.stack.fill", wash: "bg-gamify-purple-wash", tint: colors.gamify.purple, label: "Cards studied", value: "20" },
  { symbol: "target", wash: "bg-gamify-blue-wash", tint: colors.gamify.blue, label: "Accuracy", value: "90%" },
  { symbol: "flame.fill", wash: "bg-gamify-flame-wash", tint: colors.gamify.flame, label: "Best streak", value: "9" },
  { symbol: "star.fill", wash: "bg-gamify-amber-wash", tint: colors.accent, label: "New high score", value: "120" },
]

// Accuracy-trend line chart geometry — five points across a 320×160 viewBox. Precomputed at module
// scope so nothing is recomputed per render.
const TREND = [72, 78, 82, 85, 90]
const TREND_LABELS = ["May 6", "May 7", "May 8", "May 9", "Today"]
const TREND_X = TREND.map((_, i) => 44 + i * ((300 - 44) / 4))
const TREND_Y = TREND.map((v) => 12 + ((100 - v) / 100) * 118)
const TREND_POINTS = TREND.map((v, i) => `${TREND_X[i]},${TREND_Y[i]}`).join(" ")
const GRID = [100, 75, 50, 25, 0].map((v) => ({ v, y: 12 + ((100 - v) / 100) * 118 }))

// Performance-by-difficulty donut — three arcs on one ring. Segment lengths are a visual split that
// reproduces the mock's proportions (the underlying scores are shown as the legend %); reused donut
// maths from progress.tsx. easy=success / medium=accent / hard=error per the token convention.
type Difficulty = { label: string; pct: number; ratio: string; color: string; dot: string; weight: number }
const DIFFICULTY: Difficulty[] = [
  { label: "Easy", pct: 100, ratio: "(10/10)", color: colors.success, dot: "bg-success", weight: 42 },
  { label: "Medium", pct: 80, ratio: "(6/8)", color: colors.accent, dot: "bg-accent", weight: 30 },
  { label: "Hard", pct: 50, ratio: "(1/2)", color: colors.error, dot: "bg-error", weight: 28 },
]
const R = 40
const STROKE = 16
const C = 2 * Math.PI * R
const ARCS = DIFFICULTY.reduce<{ color: string; len: number; offset: number }[]>((acc, seg) => {
  const len = (seg.weight / 100) * C
  const offset = acc.reduce((sum, a) => sum + a.len, 0)
  acc.push({ color: seg.color, len, offset })
  return acc
}, [])

type BarRow = { symbol: SFSymbol; wash: string; tint: string; label: string; pct: number; bar: string }

const STRENGTHS: BarRow[] = [
  { symbol: "square.grid.2x2.fill", wash: "bg-gamify-green-wash", tint: colors.success, label: "Number and place value", pct: 100, bar: "bg-success" },
  { symbol: "plus.forwardslash.minus", wash: "bg-gamify-amber-wash", tint: colors.accent, label: "Addition and subtraction", pct: 95, bar: "bg-success" },
  { symbol: "multiply", wash: "bg-gamify-blue-wash", tint: colors.gamify.blue, label: "Multiplication", pct: 88, bar: "bg-success" },
]

const PRACTICE: BarRow[] = [
  { symbol: "divide", wash: "bg-gamify-purple-wash", tint: colors.gamify.purple, label: "Division", pct: 50, bar: "bg-accent" },
  { symbol: "chart.pie.fill", wash: "bg-gamify-red-wash", tint: colors.error, label: "Fractions", pct: 50, bar: "bg-accent" },
  { symbol: "gauge.medium", wash: "bg-gamify-blue-wash", tint: colors.gamify.blue, label: "Measurement", pct: 40, bar: "bg-error" },
]

type Achievement = { symbol: SFSymbol; title: string; sub: string; progress: string }
const ACHIEVEMENTS: Achievement[] = [
  { symbol: "calendar", title: "7-Day Streak", sub: "You're on fire!", progress: "checks" },
  { symbol: "target", title: "Accuracy Pro", sub: "Scored 80% or higher 5 times", progress: "5/5" },
  { symbol: "trophy.fill", title: "Set Champion", sub: "Completed 20 sets this week", progress: "20/20" },
]

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

function BarList({ rows, title }: { rows: BarRow[]; title: string }) {
  return (
    <Card>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-text text-h3 font-bold text-ink">{title}</Text>
        <Text className="font-text text-body font-bold text-primary">View all</Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} className="mb-4 flex-row items-center last:mb-0">
          <View className={`h-10 w-10 items-center justify-center rounded-full ${r.wash}`}>
            <SymbolView name={r.symbol} size={18} tintColor={r.tint} weight="semibold" />
          </View>
          <View className="ml-3 flex-1">
            <Text numberOfLines={1} className="font-text text-body font-semibold text-ink">
              {r.label}
            </Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-gamify-track">
              <View className={`h-full rounded-full ${r.bar} ${PCT[r.pct]}`} />
            </View>
          </View>
          <Text className="ml-3 w-11 text-right font-text text-body-lg font-bold text-ink">{r.pct}%</Text>
        </View>
      ))}
    </Card>
  )
}

export default function SessionSummary() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  const { children } = useChildren()

  if (!set) return <Redirect href="/home" />

  const child = children[0]
  const name = child?.name ?? "Amara"

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Session Summary</Text>
        <View className="-mr-2 h-11 w-11 items-center justify-center">
          <SymbolView name="square.and.arrow.up" size={22} tintColor={colors.ink} weight="regular" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="flex-row items-center rounded-2xl bg-gamify-green-wash p-4">
          <ChildAvatar avatar={child?.avatar ?? DEFAULT_AVATAR} className="h-16 w-16" />
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">Amazing work, {name}! ⭐</Text>
            <Text className="mt-1 font-text text-body text-text-secondary">You completed your study session.</Text>
          </View>
          <View className="ml-2 flex-row items-center">
            <SymbolView name="shield.fill" size={40} tintColor={colors.success} weight="regular" />
            <View className="ml-2">
              <Text className="font-text text-h3 font-bold text-ink">120</Text>
              <Text className="font-text text-caption text-text-secondary">points earned</Text>
            </View>
          </View>
        </View>

        {/* Session overview */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Session overview</Text>
          <View className="flex-row gap-2">
            {STATS.map((s) => (
              <View key={s.label} className="flex-1 items-center rounded-xl border border-border bg-white p-2">
                <View className={`h-9 w-9 items-center justify-center rounded-full ${s.wash}`}>
                  <SymbolView name={s.symbol} size={18} tintColor={s.tint} weight="semibold" />
                </View>
                <Text numberOfLines={2} className="mt-2 text-center font-text text-caption text-text-secondary">
                  {s.label}
                </Text>
                <Text numberOfLines={1} className="mt-1 font-text text-body font-bold text-ink">
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Accuracy trend */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Accuracy trend</Text>
          <Svg width="100%" height={160} viewBox="0 0 320 160">
            {GRID.map((g) => (
              <Line key={g.v} x1={44} y1={g.y} x2={300} y2={g.y} stroke={colors.border} strokeWidth={1} />
            ))}
            {GRID.map((g) => (
              <SvgText key={`l-${g.v}`} x={38} y={g.y + 4} fontSize={11} fill={colors["text-secondary"]} textAnchor="end">
                {g.v}%
              </SvgText>
            ))}
            <Polyline points={TREND_POINTS} fill="none" stroke={colors.success} strokeWidth={2.5} />
            {TREND.map((v, i) => (
              <Circle key={`c-${v}`} cx={TREND_X[i]} cy={TREND_Y[i]} r={4} fill={colors.success} />
            ))}
            {TREND.map((v, i) => (
              <SvgText
                key={`v-${v}`}
                x={TREND_X[i]}
                y={TREND_Y[i] - 9}
                fontSize={12}
                fontWeight="bold"
                fill={i === TREND.length - 1 ? colors.success : colors.ink}
                textAnchor="middle"
              >
                {v}%
              </SvgText>
            ))}
            {TREND_LABELS.map((label, i) => (
              <SvgText key={label} x={TREND_X[i]} y={150} fontSize={11} fill={colors["text-secondary"]} textAnchor="middle">
                {label}
              </SvgText>
            ))}
          </Svg>
        </Card>

        {/* Performance by difficulty */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Performance by difficulty</Text>
          <View className="flex-row items-center">
            <Svg width={104} height={104} viewBox="0 0 104 104">
              {ARCS.map((arc) => (
                <Circle
                  key={arc.color}
                  cx={52}
                  cy={52}
                  r={R}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${arc.len} ${C - arc.len}`}
                  strokeDashoffset={-arc.offset}
                  transform="rotate(-90 52 52)"
                />
              ))}
            </Svg>
            <View className="ml-6 flex-1">
              {DIFFICULTY.map((d) => (
                <View key={d.label} className="mb-3 flex-row items-center last:mb-0">
                  <View className={`h-3 w-3 rounded-full ${d.dot}`} />
                  <Text className="ml-3 flex-1 font-text text-body-lg text-text-secondary">{d.label}</Text>
                  <View className="items-end">
                    <Text className="font-text text-body-lg font-bold text-ink">{d.pct}%</Text>
                    <Text className="font-text text-caption text-text-secondary">{d.ratio}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Top strengths / Needs more practice */}
        <BarList rows={STRENGTHS} title="Top strengths" />
        <BarList rows={PRACTICE} title="Needs more practice" />

        {/* Study tip */}
        <View className="mt-4 flex-row items-center rounded-2xl bg-gamify-amber-wash p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
            <SymbolView name="lightbulb.fill" size={22} tintColor={colors.accent} weight="semibold" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">Study tip for you</Text>
            <Text className="mt-0.5 font-text text-body text-text-secondary">
              Keep practicing a little every day. You&apos;re building great habits!
            </Text>
          </View>
          <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
        </View>

        {/* Achievements strip */}
        <View className="mt-4 flex-row gap-3 rounded-2xl bg-gamify-purple-wash p-4">
          {ACHIEVEMENTS.map((a) => (
            <View key={a.title} className="flex-1">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <SymbolView name={a.symbol} size={20} tintColor={colors.gamify.purple} weight="semibold" />
              </View>
              <Text numberOfLines={1} className="mt-2 font-text text-body font-bold text-ink">
                {a.title}
              </Text>
              <Text numberOfLines={2} className="mt-0.5 font-text text-caption text-text-secondary">
                {a.sub}
              </Text>
              {a.progress === "checks" ? (
                <View className="mt-2 flex-row gap-1">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <SymbolView key={n} name="checkmark.circle.fill" size={14} tintColor={colors.gamify.purple} weight="semibold" />
                  ))}
                </View>
              ) : (
                <View className="mt-2 flex-row items-center">
                  <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                    <View className="h-full w-[100%] rounded-full bg-gamify-purple" />
                  </View>
                  <Text className="ml-2 font-text text-caption font-bold text-ink">{a.progress}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="mt-6 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue studying"
            className="h-14 flex-[2] flex-row items-center justify-center rounded-full bg-study-teal active:opacity-90"
            onPress={() => router.replace({ pathname: "/study/set-result/[id]", params: { id: set.id } })}
          >
            <SymbolView name="book" size={20} tintColor={colors.white} weight="semibold" style={{ marginRight: 8 }} />
            <Text className="font-text text-body-lg font-bold text-white">Continue studying</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take a break"
            className="h-14 flex-1 flex-row items-center justify-center rounded-full border border-border bg-white active:opacity-70"
            onPress={() => router.replace("/home")}
          >
            <SymbolView name="cup.and.saucer" size={20} tintColor={colors.ink} weight="semibold" style={{ marginRight: 8 }} />
            <Text className="font-text text-body-lg font-bold text-ink">Take a break</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
