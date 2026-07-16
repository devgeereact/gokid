import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Progress (child-facing) — the Progress tab (design/GoKid-progress-screen.png, screen 10). Overall
 * mastery donut, a 7-day activity strip, per-subject bars, and a "Coming back soon" spaced-repetition
 * list. All values are demo constants (the Neon/Drizzle progress API lands later — AGENTS.md). The
 * "10. Progress" title is a mockup annotation — dropped. Subject / activity icons are cropped off the
 * reference (design-loop asset pattern).
 */

const MASTERY = [
  { label: "Learning", pct: 25, color: colors.status.learning, dot: "bg-status-learning" },
  { label: "Getting it", pct: 45, color: colors.study.teal, dot: "bg-study-teal" },
  { label: "Mastered", pct: 30, color: colors.status.getting, dot: "bg-status-getting" },
]

const DAYS = [
  { key: "mon", label: "M", done: true },
  { key: "tue", label: "T", done: true },
  { key: "wed", label: "W", done: true },
  { key: "thu", label: "T", done: true },
  { key: "fri", label: "F", done: false },
  { key: "sat", label: "S", done: false },
  { key: "sun", label: "S", done: false },
]

const SUBJECTS = [
  { name: "Maths", pct: 65, bar: "w-[65%]", icon: require("../../../../../assets/images/gokid-prog-maths.png") },
  { name: "English", pct: 60, bar: "w-[60%]", icon: require("../../../../../assets/images/gokid-prog-english.png") },
  { name: "Science", pct: 55, bar: "w-[55%]", icon: require("../../../../../assets/images/gokid-prog-science.png") },
  { name: "Geography", pct: 70, bar: "w-[70%]", icon: require("../../../../../assets/images/gokid-prog-geography.png") },
]

const COMING = [
  {
    title: "Compare numbers to 1,000",
    sub: "We'll check this again tomorrow",
    icon: require("../../../../../assets/images/gokid-prog-scales.png"),
  },
  {
    title: "Roman numerals to 100",
    sub: "We'll show this in 3 days",
    icon: require("../../../../../assets/images/gokid-prog-astro.png"),
  },
]

// Donut geometry — three arcs on one 104pt ring. Cumulative offsets are precomputed at module
// scope (not during render) so each arc starts where the previous ended.
const R = 46
const STROKE = 20
const C = 2 * Math.PI * R
const ARCS = MASTERY.reduce<{ color: string; len: number; offset: number }[]>((acc, seg) => {
  const len = (seg.pct / 100) * C
  const offset = acc.reduce((sum, a) => sum + a.len, 0)
  acc.push({ color: seg.color, len, offset })
  return acc
}, [])

function Donut() {
  return (
    <Svg width={112} height={112} viewBox="0 0 112 112">
      {ARCS.map((arc) => (
        <Circle
          key={arc.color}
          cx={56}
          cy={56}
          r={R}
          fill="none"
          stroke={arc.color}
          strokeWidth={STROKE}
          strokeDasharray={`${arc.len} ${C - arc.len}`}
          strokeDashoffset={-arc.offset}
          transform="rotate(-90 56 56)"
        />
      ))}
    </Svg>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

export default function Progress() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="text-center font-text text-h1 font-bold text-ink">Your progress</Text>

        {/* Overall mastery */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Overall mastery</Text>
          <View className="flex-row items-center">
            <Donut />
            <View className="ml-6 flex-1">
              {MASTERY.map((seg) => (
                <View key={seg.label} className="mb-3 flex-row items-center last:mb-0">
                  <View className={`h-4 w-4 rounded-sm ${seg.dot}`} />
                  <Text className="ml-3 flex-1 font-text text-body-lg text-text-secondary">{seg.label}</Text>
                  <Text className="font-text text-body-lg font-bold text-ink">{seg.pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* 7-day activity */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">7-day activity</Text>
          <View className="flex-row justify-between">
            {DAYS.map((d) => (
              <View key={d.key} className="items-center">
                <Text className="mb-3 font-text text-body-lg font-semibold text-ink">{d.label}</Text>
                {d.done ? (
                  <View className="h-6 w-6 rounded-full bg-study-teal" />
                ) : (
                  <View className="h-6 w-6 rounded-full border-2 border-border" />
                )}
              </View>
            ))}
          </View>
        </Card>

        {/* By subject */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">By subject</Text>
          {SUBJECTS.map((s) => (
            <View key={s.name} className="mb-4 flex-row items-center last:mb-0">
              <Image
                accessibilityIgnoresInvertColors
                className="h-9 w-9 rounded-full"
                contentFit="cover"
                source={s.icon}
              />
              <Text numberOfLines={1} className="ml-3 w-28 font-text text-body-lg text-ink">
                {s.name}
              </Text>
              <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-border">
                <View className={`h-full rounded-full bg-study-teal ${s.bar}`} />
              </View>
              <Text className="w-11 text-right font-text text-body-lg font-bold text-ink">{s.pct}%</Text>
            </View>
          ))}
        </Card>

        {/* Coming back soon */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Coming back soon</Text>
          {COMING.map((c) => (
            <View key={c.title} className="mb-4 flex-row items-center last:mb-0">
              <Image
                accessibilityIgnoresInvertColors
                className="h-11 w-11 rounded-md"
                contentFit="cover"
                source={c.icon}
              />
              <View className="ml-3 flex-1">
                <Text className="font-text text-body-lg font-semibold text-ink">{c.title}</Text>
                <Text className="mt-0.5 font-text text-body text-text-secondary">{c.sub}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${c.title} — coming back soon`}
                className="h-11 w-11 items-center justify-center rounded-full bg-background active:opacity-60"
              >
                <SymbolView name="arrow.clockwise" size={20} tintColor={colors["text-secondary"]} weight="regular" />
              </Pressable>
            </View>
          ))}
        </Card>

        {/* Into the richer child progress dashboards (design screens 16 / 22). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View detailed progress"
          className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.push("/progress/overview")}
        >
          <SymbolView name="chart.bar" size={20} tintColor={colors.white} weight="semibold" />
          <Text className="font-text text-body-lg font-bold text-white">View detailed progress</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Achievements"
          className="mb-2 mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/achievements")}
        >
          <SymbolView name="trophy" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Achievements</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
