import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { EmptyState } from "@/components/empty-state"
import { SubjectMark } from "@/components/subject-mark"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { useStudyingChildId } from "@/lib/children"
import { usePreferences } from "@/lib/preferences"
import { dueLabel, masterySplit, minutesToday, recentActivity, useProgress } from "@/lib/reviews"
import { getSubject, subjectSlug } from "@/lib/subjects"

/**
 * Progress (child-facing) — the Progress tab (design/GoKid-progress-screen.png, screen 10). Overall
 * mastery donut, a 7-day activity strip, per-subject bars, and a "Coming back soon" list.
 *
 * Every figure here is now the child's own record. The donut splits their rated cards by Leitner box
 * (`masterySplit`), the strip marks the days they actually studied (`recentActivity`), the subject
 * bars are computed from their cards joined to the real set catalogue from the database, and the
 * queue is the genuine spaced-repetition schedule. Nothing is authored: a child who has not studied
 * sees an honest empty state rather than someone else's 65%.
 */

const MASTERY_META = [
  { key: "learning" as const, label: "Learning", color: colors.status.learning, dot: "bg-status-learning" },
  { key: "getting" as const, label: "Getting it", color: colors.study.teal, dot: "bg-study-teal" },
  { key: "mastered" as const, label: "Mastered", color: colors.status.getting, dot: "bg-status-getting" },
]

// Donut geometry — three arcs on one 104pt ring.
const R = 46
const STROKE = 20
const C = 2 * Math.PI * R

/** Percentage-driven donut. Arcs are derived per render because the split is now live data. */
function Donut({ segments }: { segments: { color: string; pct: number }[] }) {
  // Cumulative offsets without mutation: the React Compiler's `immutability` rule bans reassigning a
  // `let` during render, and these arcs are live data so they can't be precomputed at module scope.
  const arcs = segments.map((seg, i) => ({
    color: seg.color,
    len: (seg.pct / 100) * C,
    offset: segments.slice(0, i).reduce((sum, prev) => sum + (prev.pct / 100) * C, 0),
  }))
  return (
    <Svg width={112} height={112} viewBox="0 0 112 112">
      {/* Track, so a partly-rated deck still reads as a ring rather than a floating sliver. */}
      <Circle cx={56} cy={56} r={R} fill="none" stroke={colors.gamify.track} strokeWidth={STROKE} />
      {arcs.map((arc) => (
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

// Subject bar widths as literal classes so NativeWind's compiler emits them.
const BAR: Record<number, string> = {
  0: "w-[0%]", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-[100%]",
}
const barWidth = (pct: number) => BAR[Math.max(0, Math.min(100, Math.round(pct / 5) * 5))]

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

export default function Progress() {
  const childId = useStudyingChildId() ?? ""
  const { cards, sessions, upcoming } = useProgress(childId)
  // The real catalogue, so a rated card can be resolved to its set and subject.
  const { sets } = useSets()
  const setById = new Map(sets.map((s) => [s.id, s]))

  const split = masterySplit(cards)
  const days = recentActivity(sessions)
  // §10 "Daily Study Goal" — a quiet marker, only when a parent has set one. See lib/preferences.ts
  // for why this is opt-in and why it must never read as a failure.
  const { dailyGoalMinutes } = usePreferences()
  const todayMinutes = minutesToday(sessions)
  const studied = cards.length > 0

  // Per subject: of the cards this child has rated in that subject, how many are retained (box 2+).
  // Only subjects they have actually touched appear — no placeholder rows.
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
      pct: seen === 0 ? 0 : Math.round((learned / seen) * 100),
      // The whole subject, not just its art: SubjectMark needs the wash/ink/symbol to fall back
      // properly for a subject with no illustration (Music, RE).
      subject: getSubject(subjectSlug(name) ?? ""),
    }))
    .sort((a, b) => b.pct - a.pct)

  // The genuine spaced-repetition queue — soonest due first.
  const coming = upcoming.slice(0, 3).map((c) => {
    const set = setById.get(c.setId)
    return {
      key: `${c.setId}:${c.cardId}`,
      title: set?.title ?? "Review card",
      sub: `We'll check this again ${dueLabel(c.dueAt).toLowerCase()}`,
      art: getSubject(subjectSlug(set?.subject ?? "") ?? "")?.art,
      setId: c.setId,
    }
  })

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="text-center font-text text-h1 font-bold text-ink">Your progress</Text>

        {/* Nothing studied yet — one honest message instead of four cards of invented numbers. */}
        {!studied ? (
          <EmptyState
            symbol="chart.bar"
            title="No progress yet"
            body="Study a set and this fills in — what you're learning, the days you studied, and when each card comes back."
            actionLabel="Start studying"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
            {/* Overall mastery — the child's rated cards split by Leitner box. */}
            <Card>
              <Text className="mb-4 font-text text-h3 font-bold text-ink">Overall mastery</Text>
              <View className="flex-row items-center">
                <Donut
                  segments={[
                    { color: colors.status.learning, pct: split.pctLearning },
                    { color: colors.study.teal, pct: split.pctGetting },
                    { color: colors.status.getting, pct: split.pctMastered },
                  ]}
                />
                <View className="ml-6 flex-1">
                  {MASTERY_META.map((seg) => {
                    const count = split[seg.key]
                    const pct = seg.key === "learning" ? split.pctLearning : seg.key === "getting" ? split.pctGetting : split.pctMastered
                    return (
                      <View key={seg.label} className="mb-3 flex-row items-center last:mb-0">
                        <View className={`h-4 w-4 rounded-sm ${seg.dot}`} />
                        <Text className="ml-3 flex-1 font-text text-body-lg text-text-secondary">{seg.label}</Text>
                        <Text className="font-text text-body-lg font-bold text-ink">{count}</Text>
                        <Text className="ml-2 w-11 text-right font-text text-body text-text-secondary">{pct}%</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
              <Text className="mt-2 font-text text-body text-text-secondary">
                {split.total} {split.total === 1 ? "card" : "cards"} studied so far.
              </Text>
            </Card>

            {/* 7-day activity — the days they really studied. */}
            <Card>
              <Text className="mb-4 font-text text-h3 font-bold text-ink">7-day activity</Text>
              {/* §10 "Daily Study Goal" — shown only when a parent set one, and worded so a day
                  under the goal is never a failure: it states minutes, not a shortfall, and there
                  is no bar to fill, no colour change and no countdown. */}
              {dailyGoalMinutes > 0 ? (
                <View className="mb-4 flex-row items-center rounded-xl bg-background px-3 py-2">
                  <SymbolView
                    name={todayMinutes >= dailyGoalMinutes ? "checkmark.circle.fill" : "target"}
                    size={16}
                    tintColor={todayMinutes >= dailyGoalMinutes ? colors.success : colors["text-secondary"]}
                    weight="semibold"
                  />
                  <Text className="ml-2 flex-1 font-text text-caption text-text-secondary">
                    {todayMinutes >= dailyGoalMinutes
                      ? `Today's goal of ${dailyGoalMinutes} minutes met — ${todayMinutes} minutes so far.`
                      : `Today: ${todayMinutes} of ${dailyGoalMinutes} minutes. Any amount counts.`}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row justify-between">
                {days.map((d) => (
                  <View key={d.key} className="items-center">
                    <Text
                      className={`mb-3 font-text text-body-lg font-semibold ${d.isToday ? "text-primary" : "text-ink"}`}
                    >
                      {d.label}
                    </Text>
                    {d.done ? (
                      <View className="h-6 w-6 rounded-full bg-study-teal" />
                    ) : (
                      <View className={`h-6 w-6 rounded-full border-2 ${d.isToday ? "border-primary" : "border-border"}`} />
                    )}
                  </View>
                ))}
              </View>
            </Card>

            {/* By subject — only subjects this child has actually studied. */}
            {subjectRows.length > 0 ? (
              <Card>
                <Text className="mb-4 font-text text-h3 font-bold text-ink">By subject</Text>
                {subjectRows.map((s) => (
                  <View key={s.name} className="mb-4 flex-row items-center last:mb-0">
                    {s.subject ? (
                      <SubjectMark subject={s.subject} className="h-9 w-9" symbolSize={16} />
                    ) : (
                      <View className="h-9 w-9 rounded-full bg-study-wash" />
                    )}
                    <Text numberOfLines={1} className="ml-3 w-28 font-text text-body-lg text-ink">
                      {s.name}
                    </Text>
                    <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <View className={`h-full rounded-full bg-study-teal ${barWidth(s.pct)}`} />
                    </View>
                    {/* w-14, not w-11: "100%" wrapped to a second line in the narrower column. */}
                    <Text numberOfLines={1} className="w-14 text-right font-text text-body-lg font-bold text-ink">
                      {s.pct}%
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Coming back soon — the real spaced-repetition queue. */}
            {coming.length > 0 ? (
              <Card>
                <Text className="mb-4 font-text text-h3 font-bold text-ink">Coming back soon</Text>
                {coming.map((c) => (
                  <Pressable
                    key={c.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.title} — ${c.sub}`}
                    className="mb-4 flex-row items-center last:mb-0 active:opacity-70"
                    onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: c.setId } })}
                  >
                    {c.art ? (
                      <Image
                        accessibilityIgnoresInvertColors
                        className="h-11 w-11 rounded-md"
                        contentFit="cover"
                        source={c.art}
                      />
                    ) : (
                      <View className="h-11 w-11 items-center justify-center rounded-md bg-study-wash">
                        <SymbolView name="arrow.clockwise" size={18} tintColor={colors.primary} weight="semibold" />
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text numberOfLines={1} className="font-text text-body-lg font-semibold text-ink">
                        {c.title}
                      </Text>
                      <Text className="mt-0.5 font-text text-body text-text-secondary">{c.sub}</Text>
                    </View>
                    <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
                  </Pressable>
                ))}
              </Card>
            ) : null}
          </>
        )}

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
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/achievements")}
        >
          <SymbolView name="trophy" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Achievements</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Learning calendar"
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/calendar")}
        >
          <SymbolView name="calendar" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Learning calendar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Learning journey"
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/journey")}
        >
          <SymbolView name="map" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Learning journey</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Statistics"
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/statistics")}
        >
          <SymbolView name="list.number" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Statistics</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mastery timeline"
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/mastery-timeline")}
        >
          <SymbolView name="calendar.badge.clock" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Mastery timeline</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Study history"
          className="mb-2 mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/history")}
        >
          <SymbolView name="clock.arrow.circlepath" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Study history</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
