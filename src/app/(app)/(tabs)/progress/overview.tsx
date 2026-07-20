import { router } from "expo-router"
import { Fragment, type ReactNode } from "react"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Line, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { SubjectMark } from "@/components/subject-mark"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { type ActivityDay, formatMinutes, useWeeklyReport } from "@/lib/calendar"
import { DEFAULT_AVATAR, useChildren, useStudyingChildId, yearLabel } from "@/lib/children"
import { useProgress } from "@/lib/reviews"
import { getSubject, subjectSlug } from "@/lib/subjects"

/**
 * Progress Overview (design/GoKid-progressoverview-screen.png, screen 16) — the parent-facing weekly
 * report: three summary tiles, a combined bar+line "Daily activity" chart, per-subject bars, recent
 * achievements, and the entry into detailed progress.
 *
 * Every figure is the child's own. The tiles and the chart come from the sessions they actually
 * finished in the last 7 days (`useWeeklyReport`), the subject bars from their spaced-repetition
 * record joined to the real set catalogue, and the achievement counts from both. The screen was
 * previously a fully-authored report — a parent reading "2h 45m, 24 sets, 78%" was reading fiction.
 *
 * Trends compare against the previous 7 days and are HIDDEN when there is no baseline: reporting
 * "+100%" against a week the child never opened the app would be worse than saying nothing.
 *
 * The "16. Progress Overview" title is a mockup annotation — dropped. Achievement badges are tinted
 * SF Symbols on an SVG hexagon (no illustration assets exist for them — inferred).
 */

// Data-driven bar widths as literal classes so NativeWind's compiler emits them (it scans source
// text — a `w-[${x}%]` template would never be seen). Same pattern as lesson/[id].tsx.
const PCT: Record<number, string> = {
  0: "w-[0%]", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-[100%]",
}
const barWidth = (pct: number) => PCT[Math.max(0, Math.min(100, Math.round(pct / 5) * 5))]

// --- Daily activity chart geometry ------------------------------------------------------------
// Two series over the last 7 days: study minutes as teal bars (left axis) and sets completed as a
// grey line (right axis). Coordinates live in the SVG's 320×200 viewBox; the SVG stretches to the
// card width. Both axes now scale to the child's real data instead of a fixed 0–100 / 0–25.
const VB_W = 320
const VB_H = 200
const PLOT_L = 30
const PLOT_R = 300
const PLOT_B = 168
const PLOT_T = 16
const PLOT_H = PLOT_B - PLOT_T
const BAR_W = 16

/** Round an axis maximum up to four whole steps so the ticks read 0/15/30/45/60 rather than
 *  0/14/27/41/54. Scaling to the data keeps a quiet week readable; a fixed axis would flatten it. */
const TICK_STEPS = [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200]
function niceMax(max: number) {
  const step = TICK_STEPS.find((s) => s * 4 >= max) ?? Math.ceil(max / 4)
  return step * 4
}

function Card({ children }: { children: ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
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

function DailyActivityChart({ days }: { days: ActivityDay[] }) {
  const step = (PLOT_R - PLOT_L) / days.length
  const cx = days.map((_, i) => PLOT_L + step * i + step / 2)
  const maxMinutes = niceMax(Math.max(...days.map((d) => d.minutes), 1))
  const maxSets = niceMax(Math.max(...days.map((d) => d.sets), 1))

  const bars = days.map((d, i) => {
    const h = (d.minutes / maxMinutes) * PLOT_H
    return { x: cx[i] - BAR_W / 2, y: PLOT_B - h, h, v: d.minutes, cx: cx[i] }
  })
  const points = days.map((d, i) => ({ x: cx[i], y: PLOT_B - (d.sets / maxSets) * PLOT_H, s: d.sets }))
  const line = points.map((p) => `${p.x},${p.y}`).join(" ")
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <Svg width="100%" height={200} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {/* gridlines + left (minutes) / right (sets) axis ticks, both scaled to the real data */}
      {ticks.map((t) => {
        const y = PLOT_B - t * PLOT_H
        return (
          <Fragment key={t}>
            <Line x1={PLOT_L} y1={y} x2={PLOT_R} y2={y} stroke={colors.gamify.track} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={PLOT_L - 6} y={y + 3} fontSize={8} fill={colors["text-secondary"]} textAnchor="end">
              {Math.round(t * maxMinutes)}
            </SvgText>
            <SvgText x={PLOT_R + 6} y={y + 3} fontSize={8} fill={colors["text-secondary"]} textAnchor="start">
              {Math.round(t * maxSets)}
            </SvgText>
          </Fragment>
        )
      })}

      {/* study-time bars + value labels (a zero day draws no bar and no label) */}
      {bars.map((b, i) => (
        <Fragment key={`bar-${days[i].key}`}>
          {b.h > 0 ? <Rect x={b.x} y={b.y} width={BAR_W} height={b.h} rx={3} fill={colors.study.teal} /> : null}
          {b.v > 0 ? (
            <SvgText x={b.cx} y={b.y - 4} fontSize={9} fontWeight="bold" fill={colors.ink} textAnchor="middle">
              {b.v}
            </SvgText>
          ) : null}
        </Fragment>
      ))}

      {/* sets-completed line + markers */}
      <Polyline points={line} fill="none" stroke={colors.border} strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <Fragment key={`pt-${days[i].key}`}>
          <Rect x={p.x - 3} y={p.y - 3} width={6} height={6} rx={3} fill={colors.border} />
          {p.s > 0 ? (
            <SvgText x={p.x} y={p.y - 8} fontSize={9} fontWeight="bold" fill={colors.ink} textAnchor="middle">
              {p.s}
            </SvgText>
          ) : null}
        </Fragment>
      ))}

      {/* day labels — today is emphasised */}
      {days.map((d, i) => (
        <SvgText
          key={d.key}
          x={cx[i]}
          y={PLOT_B + 16}
          fontSize={10}
          fontWeight={d.isToday ? "bold" : "normal"}
          fill={d.isToday ? colors.primary : colors["text-secondary"]}
          textAnchor="middle"
        >
          {d.label}
        </SvgText>
      ))}
    </Svg>
  )
}

export default function ProgressOverview() {
  const { children } = useChildren()
  const childId = useStudyingChildId() ?? ""
  const child = children.find((c) => c.id === childId) ?? children[0]

  const { days, totals, trend } = useWeeklyReport(childId)
  const { cards, sessions } = useProgress(childId)
  const { sets } = useSets()
  const setById = new Map(sets.map((s) => [s.id, s]))

  // Summary tiles — the last 7 days of real sessions. `trend` is null with no baseline week.
  const stats = [
    {
      label: "Total study time",
      value: formatMinutes(totals.minutes),
      trend: trend.minutes,
      suffix: "%",
      wash: "bg-gamify-green-wash",
      disc: "bg-gamify-green",
      icon: "clock.fill" as SFSymbol,
    },
    {
      label: "Sets completed",
      value: String(totals.sets),
      trend: trend.sets,
      suffix: "%",
      wash: "bg-gamify-purple-wash",
      disc: "bg-gamify-purple",
      icon: "target" as SFSymbol,
    },
    {
      label: "Accuracy",
      value: totals.scored ? `${totals.accuracy}%` : "—",
      trend: trend.accuracy,
      suffix: "pts",
      wash: "bg-gamify-amber-wash",
      disc: "bg-accent",
      icon: "star.fill" as SFSymbol,
    },
  ]

  // Per subject: of the cards rated in that subject, how many are retained (box 2+). Mastery has no
  // week-over-week history to compare against, so these carry no trend chip — only a real figure.
  const bySubject = new Map<string, { seen: number; learned: number }>()
  for (const card of cards) {
    const subject = setById.get(card.setId)?.subject
    if (!subject) continue
    const row = bySubject.get(subject) ?? { seen: 0, learned: 0 }
    row.seen += 1
    if (card.box >= 2) row.learned += 1
    bySubject.set(subject, row)
  }
  const subjectRows = [...bySubject.entries()]
    .map(([name, { seen, learned }]) => ({
      name,
      slug: subjectSlug(name),
      pct: seen === 0 ? 0 : Math.round((learned / seen) * 100),
      // The whole subject, so SubjectMark can fall back to wash + symbol where there is no art.
      subject: getSubject(subjectSlug(name) ?? ""),
    }))
    .sort((a, b) => b.pct - a.pct)

  // Achievements as counts of things the child actually did.
  const achievements = [
    {
      title: "Cards learned",
      value: cards.filter((c) => c.box >= 2).length,
      sub: "Remembered across widening gaps",
      fill: colors.gamify.green,
      icon: "brain.head.profile" as SFSymbol,
    },
    {
      title: "Sets finished",
      value: new Set(sessions.map((s) => s.setId)).size,
      sub: "Study sets completed",
      fill: colors.accent,
      icon: "checkmark.seal.fill" as SFSymbol,
    },
    {
      title: "Subjects explored",
      value: bySubject.size,
      sub: "Subjects with cards studied",
      fill: colors.gamify.purple,
      icon: "circle.grid.2x2.fill" as SFSymbol,
    },
  ]

  const hasAnything = sessions.length > 0 || cards.length > 0

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center">
        <BackButton />
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

        {!hasAnything ? (
          <EmptyState
            symbol="chart.bar"
            title="No report yet"
            body="Once your child studies, this week's time, sets and accuracy appear here — with last week to compare against."
            actionLabel="Go to study"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
        {/* Summary stat tiles — the last 7 days. */}
        <View className="mt-5 flex-row gap-3">
          {stats.map((s) => (
            <View key={s.label} className={`flex-1 rounded-2xl p-3 ${s.wash}`}>
              <View className="flex-row items-center gap-2">
                <View className={`h-8 w-8 items-center justify-center rounded-full ${s.disc}`}>
                  <SymbolView name={s.icon} size={16} tintColor={colors.white} weight="semibold" />
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} className="flex-1 font-text text-caption text-text-secondary">
                  {s.label}
                </Text>
              </View>
              <Text className="mt-2 font-text text-h3 font-bold text-ink">{s.value}</Text>
              {/* No baseline week → no trend line, rather than a fabricated "+100%". */}
              {s.trend === null ? (
                <Text className="mt-1 font-text text-caption text-text-secondary">First week</Text>
              ) : (
                // Arrow + delta only: "vs last week" did not fit a third-width tile and truncated to
                // "57% vs la…". The period pill above already says which week this is.
                <View className="mt-1 flex-row items-center gap-1">
                  <SymbolView
                    name={s.trend >= 0 ? "arrow.up" : "arrow.down"}
                    size={11}
                    tintColor={s.trend >= 0 ? colors.success : colors.error}
                    weight="bold"
                  />
                  <Text
                    numberOfLines={1}
                    className={`font-text text-caption font-semibold ${s.trend >= 0 ? "text-success" : "text-error"}`}
                  >
                    {Math.abs(s.trend)}
                    {s.suffix}
                  </Text>
                </View>
              )}
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
          <DailyActivityChart days={days} />
        </Card>

        {/* By subject — only subjects this child has actually studied. */}
        {subjectRows.length > 0 ? (
          <Card>
            <Text className="mb-4 font-text text-h3 font-bold text-ink">By subject</Text>
            {subjectRows.map((s) => (
              <Pressable
                key={s.name}
                accessibilityRole="button"
                accessibilityLabel={`${s.name} progress, ${s.pct} percent`}
                className="mb-4 flex-row items-center last:mb-0 active:opacity-70"
                disabled={!s.slug}
                onPress={() =>
                  s.slug ? router.push({ pathname: "/progress/subject/[subject]", params: { subject: s.slug } }) : undefined
                }
              >
                {s.subject ? (
                  <SubjectMark subject={s.subject} className="h-9 w-9" symbolSize={16} />
                ) : (
                  <View className="h-9 w-9 rounded-full bg-study-wash" />
                )}
                <Text numberOfLines={1} className="ml-3 w-24 font-text text-body-lg text-ink">
                  {s.name}
                </Text>
                <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
                  <View className={`h-full rounded-full bg-study-teal ${barWidth(s.pct)}`} />
                </View>
                <Text numberOfLines={1} className="w-14 text-right font-text text-body-lg font-bold text-ink">
                  {s.pct}%
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

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
            {achievements.map((a) => (
              <View key={a.title} className="flex-1 flex-row items-start gap-2">
                <Hexagon fill={a.fill} icon={a.icon} />
                <View className="flex-1">
                  <Text className="font-text text-h3 font-bold text-ink">{a.value}</Text>
                  <Text className="font-text text-caption font-bold text-ink">{a.title}</Text>
                  <Text className="mt-0.5 font-text text-caption text-text-secondary">{a.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Into the subject the child has studied most — not a hard-coded "maths". */}
        {subjectRows[0]?.slug ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View detailed ${subjectRows[0].name} progress`}
            className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
            onPress={() =>
              router.push({ pathname: "/progress/subject/[subject]", params: { subject: subjectRows[0].slug! } })
            }
          >
            <SymbolView name="chart.bar" size={20} tintColor={colors.white} weight="semibold" />
            <Text className="font-text text-body-lg font-bold text-white">View detailed progress</Text>
          </Pressable>
        ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
