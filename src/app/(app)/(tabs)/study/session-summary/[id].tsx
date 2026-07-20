import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren, useStudyingChildId } from "@/lib/children"
import { dueLabel, useProgress } from "@/lib/reviews"
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

// "Best streak" and "New high score" were on the reference; both are extrinsic mechanics §9 rejects
// (and a "high score" invites the comparison a leaderboard would). Replaced by what the session
// actually produced.
type BarRow = { symbol: SFSymbol; wash: string; tint: string; label: string; pct: number; bar: string }

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
  const childId = useStudyingChildId() ?? ""
  const set = getStudySet(id)
  const { children } = useChildren()
  const { cards, sessions } = useProgress(childId)

  if (!set) return <Redirect href="/home" />

  const child = children[0]
  const name = child?.name ?? "Amara"

  // Real outcomes from the spaced-repetition record. Box 2+ means recalled correctly at least twice
  // across widening gaps — the engine's own definition of "learned", not a display constant.
  const setCards = cards.filter((c) => c.setId === set.id)
  const learned = setCards.filter((c) => c.box >= 2).length
  const upcoming = setCards
    .slice()
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, 3)
    .map((card) => ({ card, title: getStudySet(card.setId)?.title ?? set.title }))

  // The session that was just recorded for this set — the source for time and cards studied.
  const lastSession = sessions.find((session) => session.setId === set.id)
  const recalled = setCards.filter((c) => c.lastRating === "gotit").length
  const accuracy = setCards.length ? Math.round((recalled / setCards.length) * 100) : null

  const stats: Stat[] = [
    {
      symbol: "clock",
      wash: "bg-gamify-green-wash",
      tint: colors.success,
      label: "Time spent",
      value: lastSession ? `${lastSession.minutes}m` : "—",
    },
    {
      symbol: "rectangle.stack.fill",
      wash: "bg-gamify-purple-wash",
      tint: colors.gamify.purple,
      label: "Cards studied",
      value: lastSession ? String(lastSession.cardsReviewed) : String(setCards.length),
    },
    {
      symbol: "target",
      wash: "bg-gamify-blue-wash",
      tint: colors.gamify.blue,
      label: "Recall",
      value: accuracy === null ? "—" : `${accuracy}%`,
    },
  ]

  // Strengths / needs-practice across every topic this child has cards in — real mastery, ranked.
  const byTopic = new Map<string, { seen: number; learned: number }>()
  for (const card of cards) {
    const topic = getStudySet(card.setId)?.topic
    if (!topic) continue
    const row = byTopic.get(topic) ?? { seen: 0, learned: 0 }
    row.seen += 1
    if (card.box >= 2) row.learned += 1
    byTopic.set(topic, row)
  }
  const topicRows: BarRow[] = [...byTopic.entries()]
    .map(([label, r]) => ({
      symbol: "square.grid.2x2.fill" as SFSymbol,
      wash: "bg-gamify-green-wash",
      tint: colors.success,
      label,
      pct: r.seen ? Math.round((r.learned / r.seen) * 100) : 0,
      bar: "bg-success",
    }))
    .sort((a, b) => b.pct - a.pct)
  const strengths = topicRows.filter((r) => r.pct >= 60).slice(0, 3)
  const practice = topicRows
    .filter((r) => r.pct < 60)
    .map((r) => ({ ...r, wash: "bg-gamify-amber-wash", tint: colors.accent, bar: "bg-accent" }))
    .slice(0, 3)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
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
          {/* The reference put "120 points earned" here. Points are a proxy; cards learned is the
              thing itself, and it is what the engine actually recorded. */}
          <View className="ml-2 flex-row items-center">
            <SymbolView name="brain.head.profile" size={38} tintColor={colors.success} weight="regular" />
            <View className="ml-2">
              <Text className="font-text text-h3 font-bold text-ink">{learned}</Text>
              <Text className="font-text text-caption text-text-secondary">cards learned</Text>
            </View>
          </View>
        </View>

        {/* Session overview */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Session overview</Text>
          <View className="flex-row gap-2">
            {stats.map((s) => (
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

        {/* Top strengths / Needs more practice */}
        {strengths.length > 0 ? <BarList rows={strengths} title="Top strengths" /> : null}
        {practice.length > 0 ? <BarList rows={practice} title="Needs more practice" /> : null}

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

        {/* Coming back — replaces the reference's badge strip (a 7-Day Streak, an "Accuracy Pro" and
            a "Set Champion", none of which §9 allows). This is the retention mechanic that brief
            asks for: not a nudge to return today, just when the work is genuinely due. */}
        {upcoming.length > 0 ? (
          <View className="mt-4 rounded-2xl bg-gamify-blue-wash p-4">
            <Text className="font-text text-body-lg font-bold text-ink">Coming back</Text>
            <Text className="mt-0.5 font-text text-body text-text-secondary">
              We&apos;ll bring these back so they stick.
            </Text>
            {upcoming.map(({ card, title }) => (
              <View key={`${card.setId}:${card.cardId}`} className="mt-3 flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                  <SymbolView name="arrow.clockwise" size={16} tintColor={colors.gamify.blue} weight="semibold" />
                </View>
                <Text numberOfLines={1} className="ml-3 flex-1 font-text text-body font-semibold text-ink">
                  {title}
                </Text>
                <Text className="ml-2 font-text text-body font-bold text-gamify-blue">{dueLabel(card.dueAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}

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
