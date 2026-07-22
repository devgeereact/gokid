import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Fragment, type ReactNode, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { ProgressRing } from "@/components/progress-ring"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { type AreaRow, duration, type Insight, type Period, useAnalytics } from "@/lib/analytics"
import { DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"

/**
 * Parent Analytics (design/gokid-screens.md §10 → Analytics). One screen carrying all eight items
 * that section lists: Weekly Summary / Monthly Summary (the period control + tiles), Study Time,
 * Comparison Over Time, Curriculum Coverage, Strong Areas, Weak Areas, and AI Insights. They are
 * sections of one report rather than eight routes because a parent reads them together — splitting
 * them would mean eight taps to answer "how is she doing?".
 *
 * INFERRED: no mockup covers this screen. Every value is a token, and the layout reuses the idioms
 * already matched pixel-for-pixel against the references — the card, tile, trend chip and bar-row
 * from design/GoKid-progressoverview-screen.png (screen 16), the SVG chart geometry from the same,
 * the ring from design/GoKid-subjectprogress-screen.png (screen 17), and the segmented control from
 * the design system's 09. INPUTS. Nothing new is designed here.
 *
 * All figures are demo data from src/lib/analytics.ts — the reporting API lands later (AGENTS.md).
 * Switching child or period redraws every section, so each one is demoable on its own.
 */

// Data-driven widths as literal classes: NativeWind compiles by scanning source text, so a
// `w-[${n}%]` template would never be emitted. Same pattern as progress/overview.tsx. Percentages
// round to the nearest 5 — indistinguishable on a ~200pt track, and 21 classes instead of 101.
const PCT: Record<number, string> = {
  0: "w-0", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-full",
}

function track(pct: number) {
  return PCT[Math.max(0, Math.min(100, Math.round(pct / 5) * 5))]
}

const TONE: Record<Insight["tone"], { wash: string; disc: string; tint: string }> = {
  win: { wash: "bg-gamify-green-wash", disc: "bg-gamify-green", tint: colors.gamify.green },
  focus: { wash: "bg-gamify-amber-wash", disc: "bg-accent", tint: colors.accent },
  tip: { wash: "bg-gamify-purple-wash", disc: "bg-gamify-purple", tint: colors.gamify.purple },
}

// --- Chart geometry (the 320×200 viewBox from progress/overview.tsx) ---------------------------
const VB_W = 320
const VB_H = 200
const PLOT_L = 30
const PLOT_R = 300
const PLOT_T = 16
const PLOT_B = 168
const PLOT_H = PLOT_B - PLOT_T

/** Round an axis maximum up to four whole tick steps, so the gridlines read 0/15/30/45/60 rather
 *  than 0/14/27/41/54. The charts scale to the data (a quiet week should still have shape), which is
 *  exactly what leaves a raw max with unreadable ticks.
 *
 *  Picks the *smallest* allowed step that still contains the data: a fixed step ladder rounds a
 *  54-minute peak up to an 80-minute axis and wastes a third of the plot on headroom. */
const TICK_STEPS = [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200]

function niceMax(max: number) {
  const step = TICK_STEPS.find((s) => s * 4 >= max) ?? Math.ceil(max / 4)
  return step * 4
}

function Card({ children }: { children: ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="font-text text-h3 font-bold text-ink">{title}</Text>
      {hint ? <Text className="font-text text-caption text-text-secondary">{hint}</Text> : null}
    </View>
  )
}

function TrendChip({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0
  return (
    <View className={`flex-row items-center gap-1 rounded-md px-2 py-1 ${up ? "bg-gamify-green-wash" : "bg-gamify-red-wash"}`}>
      <SymbolView name={up ? "arrow.up" : "arrow.down"} size={11} tintColor={up ? colors.success : colors.error} weight="bold" />
      <Text className={`font-text text-caption font-bold ${up ? "text-success" : "text-error"}`}>
        {Math.abs(value)}
        {suffix}
      </Text>
    </View>
  )
}

/** A Weekly/Monthly Summary tile. `adjustsFontSizeToFit` on the label is the same guard
 *  parent-content.tsx uses: at a third of the screen "Accuracy" wraps to "Accura / cy" and the
 *  three tile values stop baseline-aligning across the row. */
function Tile({
  label,
  value,
  trend,
  wash,
  disc,
  icon,
}: {
  label: string
  value: string
  trend: number
  wash: string
  disc: string
  icon: SFSymbol
}) {
  return (
    <View className={`flex-1 rounded-2xl p-3 ${wash}`}>
      <View className="flex-row items-center gap-2">
        <View className={`h-8 w-8 items-center justify-center rounded-full ${disc}`}>
          <SymbolView name={icon} size={16} tintColor={colors.white} weight="semibold" />
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          className="flex-1 font-text text-caption text-text-secondary"
        >
          {label}
        </Text>
      </View>
      <Text className="mt-2 font-text text-h3 font-bold text-ink">{value}</Text>
      <View className="mt-1 flex-row">
        <TrendChip value={trend} />
      </View>
    </View>
  )
}

/** Study Time — minutes per bucket. Bars scale to the tallest bucket, not a fixed axis, so a quiet
 *  week still reads as a shape rather than a flat line at the bottom of the plot. */
function StudyTimeChart({ buckets }: { buckets: { label: string; minutes: number }[] }) {
  const max = niceMax(Math.max(...buckets.map((b) => b.minutes), 1))
  const step = (PLOT_R - PLOT_L) / buckets.length
  const barW = Math.min(24, step * 0.45)
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <Svg width="100%" height={200} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {ticks.map((t) => {
        const y = PLOT_B - t * PLOT_H
        return (
          <Fragment key={t}>
            <Line x1={PLOT_L} y1={y} x2={PLOT_R} y2={y} stroke={colors.gamify.track} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={PLOT_L - 6} y={y + 3} fontSize={8} fill={colors["text-secondary"]} textAnchor="end">
              {Math.round(t * max)}
            </SvgText>
          </Fragment>
        )
      })}
      {buckets.map((b, i) => {
        const cx = PLOT_L + step * i + step / 2
        const h = (b.minutes / max) * PLOT_H
        return (
          <Fragment key={b.label}>
            <Rect x={cx - barW / 2} y={PLOT_B - h} width={barW} height={h} rx={3} fill={colors.study.teal} />
            <SvgText x={cx} y={PLOT_B - h - 4} fontSize={9} fontWeight="bold" fill={colors.ink} textAnchor="middle">
              {b.minutes}
            </SvgText>
            <SvgText x={cx} y={PLOT_B + 16} fontSize={10} fill={colors["text-secondary"]} textAnchor="middle">
              {b.label}
            </SvgText>
          </Fragment>
        )
      })}
    </Svg>
  )
}

/** Comparison Over Time — this period's minutes over the previous period's, on a shared axis. */
function ComparisonChart({ current, previous, labels }: { current: number[]; previous: number[]; labels: string[] }) {
  const max = Math.max(...current, ...previous, 1)
  const step = (PLOT_R - PLOT_L) / labels.length
  const cx = labels.map((_, i) => PLOT_L + step * i + step / 2)
  const path = (series: number[]) => series.map((v, i) => `${cx[i]},${PLOT_B - (v / max) * PLOT_H}`).join(" ")

  return (
    <Svg width="100%" height={200} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {[0, 0.5, 1].map((t) => (
        <Line
          key={t}
          x1={PLOT_L}
          y1={PLOT_B - t * PLOT_H}
          x2={PLOT_R}
          y2={PLOT_B - t * PLOT_H}
          stroke={colors.gamify.track}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}

      {/* Previous period sits behind, dashed and grey — context, not a second headline. */}
      <Polyline points={path(previous)} fill="none" stroke={colors.border} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
      <Polyline points={path(current)} fill="none" stroke={colors.study.teal} strokeWidth={2.5} strokeLinejoin="round" />
      {current.map((v, i) => (
        <Rect key={i} x={cx[i] - 3} y={PLOT_B - (v / max) * PLOT_H - 3} width={6} height={6} rx={3} fill={colors.study.teal} />
      ))}
      {labels.map((l, i) => (
        <SvgText key={l} x={cx[i]} y={PLOT_B + 16} fontSize={10} fill={colors["text-secondary"]} textAnchor="middle">
          {l}
        </SvgText>
      ))}
    </Svg>
  )
}

function AreaList({ rows, tone }: { rows: AreaRow[]; tone: "strong" | "weak" }) {
  return (
    <>
      {rows.map((r) => (
        <Pressable
          key={`${r.slug}-${r.strand}`}
          accessibilityRole="button"
          accessibilityLabel={`${r.subject}, ${r.strand}, ${r.pct} percent`}
          className="mb-4 flex-row items-center last:mb-0 active:opacity-70"
          onPress={() => router.push({ pathname: "/subject/[subject]", params: { subject: r.slug } })}
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              {/* The subject's own accent (colors["subject-ink"][slug]), so a row is identifiable by
                  colour the way the Subject Hub is. A per-subject value can't be a Tailwind class,
                  and AGENTS.md rules out inline style — hence an 8pt SVG dot. */}
              <Svg width={8} height={8}>
                <Circle cx={4} cy={4} r={4} fill={r.ink} />
              </Svg>
              <Text className="font-text text-body-lg font-semibold text-ink">{r.subject}</Text>
            </View>
            <Text numberOfLines={1} className="mt-0.5 font-text text-body text-text-secondary">
              {r.strand}
            </Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-gamify-track">
              <View className={`h-full rounded-full ${tone === "strong" ? "bg-badge-strong-ink" : "bg-accent"} ${track(r.pct)}`} />
            </View>
          </View>
          <Text className="ml-3 w-11 text-right font-text text-body-lg font-bold text-ink">{r.pct}%</Text>
          <SymbolView name="chevron.right" size={16} tintColor={colors["text-secondary"]} weight="semibold" />
        </Pressable>
      ))}
    </>
  )
}

export default function ParentAnalytics() {
  const { children } = useChildren()
  // The parent's real roster. There is no demo fallback: a parent with no children should be told
  // so, not shown a fabricated family's report.
  const roster = children
  const [childId, setChildId] = useState(roster[0]?.id)

  // Period lives in the route, not in `useState`, so the monthly report is a linkable thing —
  // `/parent-analytics?period=month`. A future "monthly summary" notification needs to land the
  // parent on the month, not on the week with an extra tap.
  const { period: periodParam } = useLocalSearchParams<{ period?: string }>()
  const period: Period = periodParam === "month" ? "month" : "week"

  const child = roster.find((c) => c.id === childId) ?? roster[0]
  const data = useAnalytics(child, period)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header. A pushed route behind the passcode gate — it gets no tab bar, so the chevron is the
          only way back, as on parent-content. */}
      <View className="flex-row items-center">
        <BackButton />
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Analytics</Text>
        {/* Balances the chevron so the title centres on the screen, not on the space beside it. */}
        <View className="h-11 w-11" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {/* Child switching (§10 → Child Management). Horizontal — households can have several. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-5">
          {roster.map((c) => {
            const on = c.id === child?.id
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`Show ${c.name}'s analytics`}
                accessibilityState={{ selected: on }}
                className={`flex-row items-center rounded-2xl border py-2 pl-2 pr-4 active:opacity-70 ${
                  on ? "border-primary bg-white" : "border-border bg-white opacity-60"
                }`}
                onPress={() => setChildId(c.id)}
              >
                <ChildAvatar avatar={c.avatar ?? DEFAULT_AVATAR} className="h-11 w-11" />
                <View className="ml-2">
                  <Text className="font-text text-body-lg font-bold text-ink">{c.name}</Text>
                  <Text className="font-text text-body text-text-secondary">{yearLabel(c.yearGroup)}</Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* Period — the design system's segmented control (09. INPUTS). Drives Weekly Summary vs
            Monthly Summary and every chart below. */}
        <View className="mt-5 flex-row rounded-md border border-border bg-white p-1">
          {(["week", "month"] as const).map((p) => (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityLabel={p === "week" ? "This week" : "This month"}
              accessibilityState={{ selected: period === p }}
              className={`h-10 flex-1 items-center justify-center rounded-sm ${period === p ? "bg-primary" : ""}`}
              onPress={() => router.setParams({ period: p })}
            >
              <Text className={`font-text text-body font-bold ${period === p ? "text-white" : "text-text-secondary"}`}>
                {p === "week" ? "This week" : "This month"}
              </Text>
            </Pressable>
          ))}
        </View>

        {!data.hasData ? (
          <EmptyState
            symbol="chart.bar.doc.horizontal"
            title="Nothing to report yet"
            body={`Once ${child?.name ?? "your child"} studies, this report fills in — study time, accuracy, curriculum coverage and where they're strongest.`}
            actionLabel="Go to study"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
        {/* Weekly / Monthly Summary */}
        <View className="mt-4 flex-row gap-3">
          <Tile
            label="Study time"
            value={duration(data.summary.minutes)}
            trend={data.summary.minutesTrend}
            wash="bg-gamify-green-wash"
            disc="bg-gamify-green"
            icon="clock.fill"
          />
          <Tile
            label="Sets done"
            value={`${data.summary.sets}`}
            trend={data.summary.setsTrend}
            wash="bg-gamify-purple-wash"
            disc="bg-gamify-purple"
            icon="target"
          />
          <Tile
            label="Accuracy"
            value={`${data.summary.accuracy}%`}
            trend={data.summary.accuracyTrend}
            wash="bg-gamify-amber-wash"
            disc="bg-accent"
            icon="star.fill"
          />
        </View>

        {/* Study Time */}
        <Card>
          <SectionHead title="Study time" hint={period === "week" ? "Minutes per day" : "Minutes per week"} />
          <StudyTimeChart buckets={data.buckets} />
        </Card>

        {/* Comparison Over Time */}
        <Card>
          <SectionHead title="Comparison over time" />
          <View className="mb-3 flex-row items-center gap-4">
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-study-teal" />
              <Text className="font-text text-caption text-text-secondary">{period === "week" ? "This week" : "This month"}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-border" />
              <Text className="font-text text-caption text-text-secondary">{period === "week" ? "Last week" : "Last month"}</Text>
            </View>
          </View>
          <ComparisonChart current={data.comparison.current} previous={data.comparison.previous} labels={data.comparison.labels} />
        </Card>

        {/* Curriculum Coverage */}
        <Card>
          <SectionHead title="Curriculum coverage" />
          <View className="flex-row items-center">
            <ProgressRing pct={data.coverage.pct} label="Covered" size={96} />
            <View className="ml-5 flex-1">
              <Text className="font-text text-body text-text-secondary">
                {data.coverage.covered} of {data.coverage.total} curriculum strands touched for {yearLabel(child?.yearGroup ?? "Y3")}.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse the curriculum"
                className="mt-3 self-start active:opacity-60"
                hitSlop={8}
                onPress={() => router.push("/curriculum")}
              >
                <Text className="font-text text-body font-bold text-primary">Browse curriculum</Text>
              </Pressable>
            </View>
          </View>
          <View className="mt-5 border-t border-border pt-4">
            {data.coverage.bySubject.map((s) => (
              <Pressable
                key={s.slug}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${s.pct} percent covered`}
                className="mb-3 flex-row items-center last:mb-0 active:opacity-70"
                onPress={() => router.push({ pathname: "/subject/[subject]", params: { subject: s.slug } })}
              >
                <Text numberOfLines={1} className="w-20 font-text text-body text-ink">
                  {s.name}
                </Text>
                <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
                  <View className={`h-full rounded-full bg-study-teal ${track(s.pct)}`} />
                </View>
                <Text className="w-11 text-right font-text text-body font-bold text-ink">{s.pct}%</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Strong Areas */}
        <Card>
          <SectionHead title="Strong areas" hint="Top strands" />
          <AreaList rows={data.strong} tone="strong" />
        </Card>

        {/* Weak Areas */}
        <Card>
          <SectionHead title="Areas to focus on" hint="Lowest strands" />
          <AreaList rows={data.weak} tone="weak" />
        </Card>

        {/* Insights. Each sentence is generated from the same real figures the charts draw, so an
            insight can never contradict the chart above it, and none appears without data behind it.
            Not labelled "AI" — nothing here is generated by a model. An Inngest-backed generator is
            the future step (AGENTS.md). */}
        {data.insights.length > 0 ? (
          <Card>
            <View className="mb-4 flex-row items-center gap-2">
              <SymbolView name="sparkles" size={20} tintColor={colors.gamify.purple} weight="semibold" />
              <Text className="flex-1 font-text text-h3 font-bold text-ink">Insights</Text>
            </View>
            {data.insights.map((insight) => (
              <View key={insight.title} className={`mb-3 rounded-lg p-4 last:mb-0 ${TONE[insight.tone].wash}`}>
                <View className="flex-row items-center gap-2">
                  <View className={`h-7 w-7 items-center justify-center rounded-full ${TONE[insight.tone].disc}`}>
                    <SymbolView name={insight.icon} size={14} tintColor={colors.white} weight="semibold" />
                  </View>
                  <Text className="flex-1 font-text text-body-lg font-bold text-ink">{insight.title}</Text>
                </View>
                <Text className="mt-2 font-text text-body text-text-secondary">{insight.body}</Text>
              </View>
            ))}
          </Card>
        ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
