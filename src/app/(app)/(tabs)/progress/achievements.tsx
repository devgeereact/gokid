import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Polygon } from "react-native-svg"

import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Achievements (design/GoKid-achievements-screen.png, screen 22). Gamification overview — a hero
 * progress card (points / level / level-up bar), earned + in-progress + locked badges, and a
 * leaderboard banner. Every value is a demo constant matching the mockup (the Neon/Drizzle
 * gamification API lands later — AGENTS.md); the "22. Achievements" title is a mockup annotation,
 * dropped.
 *
 * Inferred (no asset / no route for these): there is no leaderboard route, so "View leaderboard",
 * "View all" and every badge/row tap are no-op Pressables with an accessibilityLabel. The illustrated
 * emblems in the reference are stood in for by single-colour SF Symbols (shield / target / flame /
 * book / lock / …) per the build brief; the green level badge is drawn as an SVG hexagon + star; the
 * trophy and podium are emoji.
 */

// Bar / level-up widths as literal classes so NativeWind's compiler emits them (it scans source
// text) — a data-driven width can't be string-interpolated into `w-[..]`.
const PCT: Record<number, string> = {
  60: "w-[60%]", // Speed Learner 3/5
  64: "w-[64%]", // Consistent Learner 9/14
  74: "w-[74%]", // Level 5 — 520/700
  75: "w-[75%]", // Set Champion 15/20
}

type ChipKind = "earned" | "progress" | "locked"

type Badge = {
  key: string
  symbol: SFSymbol
  tint: string
  title: string
  sub: string
  chip: ChipKind
  chipLabel?: string
}

const BADGES: Badge[] = [
  { key: "streak", symbol: "shield.fill", tint: colors.gamify.green, title: "7-Day Streak", sub: "Study 7 days in a row", chip: "earned" },
  { key: "accuracy", symbol: "target", tint: colors.gamify.blue, title: "Accuracy Pro", sub: "Score 80% or higher 5 times", chip: "earned" },
  { key: "hot", symbol: "flame.fill", tint: colors.gamify.flame, title: "Hot Streak", sub: "Get a streak of 10 correct", chip: "earned" },
  { key: "setmaster", symbol: "book.fill", tint: colors.gamify.purple, title: "Set Master", sub: "Complete 50 sets", chip: "progress", chipLabel: "32 / 50" },
  { key: "perfect", symbol: "lock.fill", tint: colors["text-secondary"], title: "Perfectionist", sub: "Score 100% on a set", chip: "locked" },
]

type Progress = {
  key: string
  symbol: SFSymbol
  tint: string
  wash: string
  bar: string
  pct: number
  title: string
  sub: string
  count: string
}

const IN_PROGRESS: Progress[] = [
  { key: "champion", symbol: "star.fill", tint: colors.accent, wash: "bg-gamify-amber-wash", bar: "bg-accent", pct: 75, title: "Set Champion", sub: "Complete 20 sets this week", count: "15 / 20" },
  { key: "speed", symbol: "bolt.fill", tint: colors.gamify.purple, wash: "bg-gamify-purple-wash", bar: "bg-gamify-purple", pct: 60, title: "Speed Learner", sub: "Complete a set in under 5 minutes", count: "3 / 5" },
  { key: "consistent", symbol: "checkmark.shield.fill", tint: colors.gamify.blue, wash: "bg-gamify-blue-wash", bar: "bg-gamify-blue", pct: 64, title: "Consistent Learner", sub: "Study 14 days this month", count: "9 / 14" },
]

type Locked = { key: string; symbol: SFSymbol; title: string; sub: string }

const LOCKED: Locked[] = [
  { key: "wizard", symbol: "diamond.fill", title: "Maths Wizard", sub: "Master all topics in Maths" },
  { key: "top", symbol: "crown.fill", title: "Top Performer", sub: "Be in the top 10% of learners" },
  { key: "monthly", symbol: "calendar", title: "Monthly Master", sub: "Study 30 days in a month" },
  { key: "expert", symbol: "rosette", title: "100% Expert", sub: "Get 100% accuracy 10 times" },
  { key: "brain", symbol: "brain.head.profile", title: "Brain Builder", sub: "Complete 200 sets" },
]

function HexBadge() {
  return (
    <View className="h-11 w-11 items-center justify-center">
      <View className="absolute inset-0 items-center justify-center">
        <Svg width={44} height={44} viewBox="0 0 44 44">
          <Polygon points="22,3 39,13 39,31 22,41 5,31 5,13" fill={colors.gamify.green} />
        </Svg>
      </View>
      <SymbolView name="star.fill" size={18} tintColor={colors.white} weight="bold" />
    </View>
  )
}

function Chip({ kind, label }: { kind: ChipKind; label?: string }) {
  if (kind === "earned") {
    return (
      <View className="mt-3 flex-row items-center gap-1 self-start rounded-full bg-gamify-green-wash px-3 py-1">
        <SymbolView name="checkmark.circle.fill" size={14} tintColor={colors.gamify.green} weight="semibold" />
        <Text className="font-text text-caption font-bold text-gamify-green">Earned</Text>
      </View>
    )
  }
  if (kind === "progress") {
    return (
      <View className="mt-3 self-start rounded-full bg-gamify-purple-wash px-3 py-1">
        <Text className="font-text text-caption font-bold text-gamify-purple">{label}</Text>
      </View>
    )
  }
  return (
    <View className="mt-3 self-start rounded-full bg-gamify-tile px-3 py-1">
      <Text className="font-text text-caption font-bold text-text-secondary">Locked</Text>
    </View>
  )
}

function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View className="mt-6 flex-row items-center justify-between">
      <Text className="font-text text-h3 font-bold text-ink">{title}</Text>
      {onViewAll ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`View all — ${title}`} className="active:opacity-60" onPress={onViewAll}>
          <Text className="font-text text-body-lg font-bold text-primary">View all</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const noop = () => {}

export default function Achievements() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back / centred title / static settings glyph */}
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
        <Text className="flex-1 text-center font-text text-h2 font-bold text-ink">Achievements</Text>
        <View className="-mr-2 h-11 w-11 items-center justify-center">
          <SymbolView name="gearshape" size={24} tintColor={colors.ink} weight="regular" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Hero — progress + points sub-card */}
        <View className="mt-2 rounded-2xl bg-gamify-green-wash p-4">
          <View className="flex-row items-center">
            <View className="flex-1 pr-2">
              <Text className="mb-2 text-4xl">🏆</Text>
              <Text className="font-text text-h3 font-bold text-ink">You&apos;re making fantastic progress!</Text>
              <Text className="mt-2 font-text text-body text-text-secondary">Keep learning and unlock more achievements.</Text>
            </View>

            <View className="w-[46%] rounded-xl bg-white p-3">
              <Text className="font-text text-caption text-text-secondary">Total points</Text>
              <View className="flex-row items-center justify-between">
                <Text className="font-text text-h1 font-bold text-primary">520</Text>
                <HexBadge />
              </View>
              <View className="mt-1 flex-row items-center gap-1">
                <Text className="text-sm">⭐</Text>
                <Text className="font-text text-body-lg font-bold text-ink">Level 5</Text>
              </View>
              <View className="mt-2 h-2 overflow-hidden rounded-full bg-gamify-track">
                <View className={`h-full rounded-full bg-study-teal ${PCT[74]}`} />
              </View>
              <Text className="mt-1 text-center font-text text-caption text-text-secondary">520 / 700</Text>
            </View>
          </View>
        </View>

        {/* Your badges */}
        <SectionHeader title="Your badges (8 / 15)" onViewAll={noop} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerClassName="pr-1">
          {BADGES.map((b) => (
            <Pressable
              key={b.key}
              accessibilityRole="button"
              accessibilityLabel={`${b.title} — ${b.sub}`}
              className="mr-3 h-[196px] w-[150px] justify-between rounded-2xl border border-border bg-white p-4 active:opacity-70"
              onPress={noop}
            >
              <View className="items-center">
                <View className="h-14 items-center justify-center">
                  <SymbolView name={b.symbol} size={44} tintColor={b.tint} weight="semibold" />
                </View>
                <Text className="mt-1 text-center font-text text-body-lg font-bold text-ink">{b.title}</Text>
                <Text className="mt-1 text-center font-text text-body text-text-secondary">{b.sub}</Text>
              </View>
              <View className="items-center">
                <Chip kind={b.chip} label={b.chipLabel} />
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Badges in progress */}
        <Text className="mt-8 font-text text-h3 font-bold text-ink">Badges in progress</Text>
        {IN_PROGRESS.map((p) => (
          <Pressable
            key={p.key}
            accessibilityRole="button"
            accessibilityLabel={`${p.title} — ${p.sub}, ${p.count}`}
            className="mt-3 flex-row items-center rounded-2xl border border-border bg-white p-4 active:opacity-70"
            onPress={noop}
          >
            <View className={`h-12 w-12 items-center justify-center rounded-full ${p.wash}`}>
              <SymbolView name={p.symbol} size={24} tintColor={p.tint} weight="semibold" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-text text-body-lg font-bold text-ink">{p.title}</Text>
              <Text className="mt-0.5 font-text text-body text-text-secondary">{p.sub}</Text>
              <View className="mt-2 flex-row items-center">
                <View className="mr-3 h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
                  <View className={`h-full rounded-full ${p.bar} ${PCT[p.pct]}`} />
                </View>
                <Text className="font-text text-body font-bold text-ink">{p.count}</Text>
              </View>
            </View>
            <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" style={{ marginLeft: 8 }} />
          </Pressable>
        ))}

        {/* Locked badges */}
        <SectionHeader title="Locked badges" onViewAll={noop} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerClassName="pr-1">
          {LOCKED.map((l) => (
            <Pressable
              key={l.key}
              accessibilityRole="button"
              accessibilityLabel={`${l.title} — locked, ${l.sub}`}
              className="mr-3 h-[150px] w-[136px] items-center rounded-2xl bg-gamify-tile p-3 active:opacity-70"
              onPress={noop}
            >
              <View className="h-11 w-11 items-center justify-center">
                <SymbolView name={l.symbol} size={34} tintColor={colors["text-secondary"]} weight="regular" />
                <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-border bg-white">
                  <SymbolView name="lock.fill" size={11} tintColor={colors["text-secondary"]} weight="semibold" />
                </View>
              </View>
              <Text className="mt-2 text-center font-text text-body font-semibold text-ink">{l.title}</Text>
              <Text className="mt-1 text-center font-text text-caption text-text-secondary">{l.sub}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Leaderboard banner */}
        <View className="mt-6 rounded-2xl bg-gamify-green-wash p-4">
          <View className="flex-row items-center">
            <Text className="text-4xl">🏆</Text>
            <View className="ml-3 flex-1">
              <Text className="font-text text-body-lg font-bold text-primary">You&apos;re doing great!</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                Stay consistent, challenge yourself, and unlock even more achievements.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View leaderboard"
            className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-full border border-primary bg-white active:opacity-70"
            onPress={noop}
          >
            <SymbolView name="crown.fill" size={18} tintColor={colors.primary} weight="semibold" />
            <Text className="font-text text-body-lg font-bold text-primary">View leaderboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
