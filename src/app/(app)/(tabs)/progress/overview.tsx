import { router } from "expo-router"
import { Fragment, type ReactNode } from "react"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Line, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg"

import { ChildAvatar } from "@/components/child-avatar"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"

/**
 * Progress Overview (design/GoKid-progressoverview-screen.png, screen 16) — the parent-facing weekly
 * report: three summary tiles, a combined bar+line "Daily activity" chart, per-subject bars with
 * trend chips, recent-achievement badges, and the entry into detailed progress. All numbers are demo
 * constants (the Neon/Drizzle progress API lands later — AGENTS.md); they match the reference PNG. The
 * "16. Progress Overview" title is a mockup annotation — dropped. The "This week ⌄" period pill and
 * the header calendar icon are static (no picker wired yet). Subject / achievement icons: the four
 * gokid-prog-*.png assets for subjects; achievement badges are tinted SF Symbols on an SVG hexagon
 * (no illustration assets exist for them — inferred).
 */

// Data-driven bar/subject widths as literal classes so NativeWind's compiler emits them (it scans
// source text — a `w-[${x}%]` template would never be seen). Same pattern as lesson/[id].tsx.
const PCT: Record<number, string> = {
  55: "w-[55%]",
  65: "w-[65%]",
  70: "w-[70%]",
  80: "w-[80%]",
}

type Stat = { label: string; value: string; trend: string; wash: string; disc: string; icon: SFSymbol }

const STATS: Stat[] = [
  { label: "Total study time", value: "2h 45m", trend: "35m", wash: "bg-gamify-green-wash", disc: "bg-gamify-green", icon: "clock.fill" },
  { label: "Sets completed", value: "24", trend: "6", wash: "bg-gamify-purple-wash", disc: "bg-gamify-purple", icon: "target" },
  { label: "Accuracy", value: "78%", trend: "12%", wash: "bg-gamify-amber-wash", disc: "bg-accent", icon: "star.fill" },
]

type Subject = { name: string; key: string; pct: number; trend: number; up: boolean; icon: number }

const SUBJECTS: Subject[] = [
  { name: "Maths", key: "maths", pct: 80, trend: 15, up: true, icon: require("../../../../../assets/images/gokid-prog-maths.png") },
  { name: "English", key: "english", pct: 65, trend: 8, up: true, icon: require("../../../../../assets/images/gokid-prog-english.png") },
  { name: "Science", key: "science", pct: 55, trend: 5, up: false, icon: require("../../../../../assets/images/gokid-prog-science.png") },
  { name: "Geography", key: "geography", pct: 70, trend: 10, up: true, icon: require("../../../../../assets/images/gokid-prog-geography.png") },
]

type Achievement = { title: string; sub: string; fill: string; icon: SFSymbol }

const ACHIEVEMENTS: Achievement[] = [
  { title: "7-Day Streak", sub: "Studied 7 days in a row", fill: colors.gamify.green, icon: "checkmark" },
  { title: "Accuracy Pro", sub: "Scored 80% or higher 5 times", fill: colors.gamify.purple, icon: "target" },
  { title: "Set Champion", sub: "Completed 20 sets this week", fill: colors.accent, icon: "trophy.fill" },
]

// --- Daily activity chart geometry (precomputed at module scope) ------------------------------
// Two series over Mon–Sun: study minutes as teal bars (left axis 0–100) and sets completed as a
// grey line (right axis 0–25). Coordinates live in the SVG's 320×200 viewBox; the SVG stretches to
// the card width.
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const STUDY = [25, 40, 55, 30, 60, 35, 20]
const SETS = [8, 12, 15, 9, 18, 11, 7]

const VB_W = 320
const VB_H = 200
const PLOT_L = 30
const PLOT_R = 300
const PLOT_T = 16
const PLOT_B = 168
const PLOT_H = PLOT_B - PLOT_T
const STEP = (PLOT_R - PLOT_L) / DAY_LABELS.length
const BAR_W = 16

const CX = DAY_LABELS.map((_, i) => PLOT_L + STEP * i + STEP / 2)
const BARS = STUDY.map((v, i) => {
  const h = (v / 100) * PLOT_H
  return { x: CX[i] - BAR_W / 2, y: PLOT_B - h, h, v, cx: CX[i] }
})
const POINTS = SETS.map((s, i) => ({ x: CX[i], y: PLOT_B - (s / 25) * PLOT_H, s }))
const LINE = POINTS.map((p) => `${p.x},${p.y}`).join(" ")
const LEFT_TICKS = [0, 20, 40, 60, 80, 100]
const RIGHT_TICKS = [0, 5, 10, 15, 20, 25]

function Card({ children }: { children: ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

function TrendChip({ up, value }: { up: boolean; value: number }) {
  return (
    <View className={`flex-row items-center gap-1 rounded-md px-2 py-1 ${up ? "bg-gamify-green-wash" : "bg-gamify-red-wash"}`}>
      <SymbolView name={up ? "arrow.up" : "arrow.down"} size={12} tintColor={up ? colors.success : colors.error} weight="bold" />
      <Text className={`font-text text-caption font-bold ${up ? "text-success" : "text-error"}`}>{value}%</Text>
    </View>
  )
}

function Hexagon({ fill, icon }: { fill: string; icon: SFSymbol }) {
  return (
    <View className="h-12 w-12 items-center justify-center">
      <Svg width={48} height={48} viewBox="0 0 48 48">
        <Polygon points="24,2 43,13 43,35 24,46 5,35 5,13" fill={fill} />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <SymbolView name={icon} size={22} tintColor={colors.white} weight="bold" />
      </View>
    </View>
  )
}

function DailyActivityChart() {
  return (
    <Svg width="100%" height={200} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {/* gridlines + left/right axis ticks */}
      {LEFT_TICKS.map((t, i) => {
        const y = PLOT_B - (t / 100) * PLOT_H
        return (
          <Fragment key={t}>
            <Line x1={PLOT_L} y1={y} x2={PLOT_R} y2={y} stroke={colors.gamify.track} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={PLOT_L - 6} y={y + 3} fontSize={8} fill={colors["text-secondary"]} textAnchor="end">
              {t}
            </SvgText>
            <SvgText x={PLOT_R + 6} y={y + 3} fontSize={8} fill={colors["text-secondary"]} textAnchor="start">
              {RIGHT_TICKS[i]}
            </SvgText>
          </Fragment>
        )
      })}

      {/* study-time bars + value labels */}
      {BARS.map((b, i) => (
        <Fragment key={`bar-${i}`}>
          <Rect x={b.x} y={b.y} width={BAR_W} height={b.h} rx={3} fill={colors.study.teal} />
          <SvgText x={b.cx} y={b.y - 4} fontSize={9} fontWeight="bold" fill={colors.ink} textAnchor="middle">
            {b.v}
          </SvgText>
        </Fragment>
      ))}

      {/* sets-completed line + markers + value labels */}
      <Polyline points={LINE} fill="none" stroke={colors.border} strokeWidth={2} strokeLinejoin="round" />
      {POINTS.map((p, i) => (
        <Fragment key={`pt-${i}`}>
          <Rect x={p.x - 3} y={p.y - 3} width={6} height={6} rx={3} fill={colors.border} />
          <SvgText x={p.x} y={p.y - 8} fontSize={9} fontWeight="bold" fill={colors.ink} textAnchor="middle">
            {p.s}
          </SvgText>
        </Fragment>
      ))}

      {/* day labels */}
      {DAY_LABELS.map((d, i) => (
        <SvgText key={d} x={CX[i]} y={PLOT_B + 16} fontSize={10} fill={colors["text-secondary"]} textAnchor="middle">
          {d}
        </SvgText>
      ))}
    </Svg>
  )
}

export default function ProgressOverview() {
  const { children } = useChildren()
  const child = children[0]

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Progress Overview</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Learning calendar"
          className="h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.push("/progress/calendar")}
        >
          <SymbolView name="calendar" size={24} tintColor={colors.ink} weight="regular" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Child row + period pill */}
        <View className="flex-row items-center">
          <ChildAvatar avatar={child?.avatar ?? DEFAULT_AVATAR} className="h-14 w-14" />
          <View className="ml-3 flex-1">
            <Text className="font-text text-h3 font-bold text-ink">{child?.name ?? "Amara"}</Text>
            <Text className="font-text text-body text-text-secondary">{yearLabel(child?.yearGroup ?? "Y3")}</Text>
          </View>
          {/* The reference draws a period dropdown; the calendar is where a period is actually
              chosen, so the pill opens it rather than growing a second, parallel picker. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change period"
            className="flex-row items-center gap-2 rounded-full border border-border bg-white px-4 py-2 active:opacity-70"
            onPress={() => router.push({ pathname: "/progress/calendar", params: { period: "week" } })}
          >
            <Text className="font-text text-body font-semibold text-ink">This week</Text>
            <SymbolView name="chevron.down" size={14} tintColor={colors["text-secondary"]} weight="semibold" />
          </Pressable>
        </View>

        {/* Summary stat tiles */}
        <View className="mt-5 flex-row gap-3">
          {STATS.map((s) => (
            <View key={s.label} className={`flex-1 rounded-2xl p-3 ${s.wash}`}>
              <View className="flex-row items-center gap-2">
                <View className={`h-8 w-8 items-center justify-center rounded-full ${s.disc}`}>
                  <SymbolView name={s.icon} size={16} tintColor={colors.white} weight="semibold" />
                </View>
                <Text className="flex-1 font-text text-caption text-text-secondary">{s.label}</Text>
              </View>
              <Text className="mt-2 font-text text-h3 font-bold text-ink">{s.value}</Text>
              <View className="mt-1 flex-row items-center gap-1">
                <SymbolView name="arrow.up" size={11} tintColor={colors.success} weight="bold" />
                <Text className="font-text text-caption font-semibold text-success">{s.trend} vs last week</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Daily activity chart */}
        <Card>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">Daily activity</Text>
          </View>
          <View className="mb-3 flex-row items-center gap-4">
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-study-teal" />
              <Text className="font-text text-caption text-text-secondary">Study time (mins)</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-border" />
              <Text className="font-text text-caption text-text-secondary">Sets completed</Text>
            </View>
          </View>
          <DailyActivityChart />
        </Card>

        {/* By subject */}
        <Card>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">By subject</Text>
            <Text className="font-text text-body font-semibold text-primary">View all</Text>
          </View>
          {SUBJECTS.map((s) => (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityLabel={`${s.name} progress`}
              className="mb-4 flex-row items-center last:mb-0 active:opacity-70"
              onPress={() => router.push({ pathname: "/progress/subject/[subject]", params: { subject: s.key } })}
            >
              <Image
                accessibilityIgnoresInvertColors
                className="h-9 w-9 rounded-full"
                contentFit="cover"
                source={s.icon}
              />
              <Text numberOfLines={1} className="ml-3 w-20 font-text text-body-lg text-ink">
                {s.name}
              </Text>
              <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
                <View className={`h-full rounded-full bg-study-teal ${PCT[s.pct]}`} />
              </View>
              <Text className="w-11 text-right font-text text-body-lg font-bold text-ink">{s.pct}%</Text>
              <View className="ml-2 w-14 items-end">
                <TrendChip up={s.up} value={s.trend} />
              </View>
            </Pressable>
          ))}
        </Card>

        {/* Recent achievements */}
        <Card>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">Recent achievements</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all achievements"
              className="active:opacity-60"
              onPress={() => router.push("/progress/achievements")}
            >
              <Text className="font-text text-body font-semibold text-primary">View all</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            {ACHIEVEMENTS.map((a) => (
              <View key={a.title} className="flex-1 flex-row items-start gap-2">
                <Hexagon fill={a.fill} icon={a.icon} />
                <View className="flex-1">
                  <Text className="font-text text-caption font-bold text-ink">{a.title}</Text>
                  <Text className="mt-0.5 font-text text-caption text-text-secondary">{a.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* View detailed progress */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View detailed progress"
          className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.push({ pathname: "/progress/subject/[subject]", params: { subject: "maths" } })}
        >
          <SymbolView name="chart.bar" size={20} tintColor={colors.white} weight="semibold" />
          <Text className="font-text text-body-lg font-bold text-white">View detailed progress</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
