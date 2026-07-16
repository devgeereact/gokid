import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren } from "@/lib/children"

/**
 * Subject Progress (design/GoKid-subjectprogress-screen.png, screen 17). A subject summary card with
 * an 80% "Overall" ring, a per-topic breakdown with coloured mastery bars, a horizontal strip of
 * recent sets, and a focus suggestion. All values are demo constants (the Neon/Drizzle progress API
 * lands later — AGENTS.md). The "17. Subject Progress" title is a mockup annotation — dropped, as is
 * the drawn bottom tab bar (this is a pushed stack screen).
 *
 * Inferred: the header filter glyph is static/decorative. The topic-row icons and the focus lightbulb
 * are tinted SF Symbols (no per-topic illustration assets exist) — the round wash colours follow the
 * design's palette. The subject icon uses gokid-prog-maths.png per the task. Bar/percent colour is
 * taken from the design (Division at 50% is teal while Fractions at 50% is amber), so each topic
 * carries an explicit tone rather than deriving it purely from the percentage. "View all" has no
 * target screen yet, so it is an inert demo link.
 */

type Tone = "teal" | "amber" | "red"

const TONE: Record<Tone, { bar: string; text: string }> = {
  teal: { bar: "bg-study-teal", text: "text-study-teal" },
  amber: { bar: "bg-status-learning", text: "text-status-learning" },
  red: { bar: "bg-error", text: "text-error" },
}

// Bar widths are a known, small set — listed as literal classes so NativeWind's compiler emits them
// (it scans source text), keeping the bar data-driven with no inline `style`.
const PCT: Record<number, string> = {
  25: "w-[25%]",
  40: "w-[40%]",
  50: "w-[50%]",
  63: "w-[63%]",
  78: "w-[78%]",
  80: "w-[80%]",
}

type Topic = {
  name: string
  sets: string
  pct: number
  tone: Tone
  icon: SFSymbol
  tint: string
  wash: string
}

const TOPICS: Topic[] = [
  { name: "Number and place value", sets: "8 of 10 sets", pct: 80, tone: "teal", icon: "number", tint: colors.gamify.green, wash: "bg-gamify-green-wash" },
  { name: "Addition and subtraction", sets: "7 of 9 sets", pct: 78, tone: "teal", icon: "plus.forwardslash.minus", tint: colors.accent, wash: "bg-gamify-amber-wash" },
  { name: "Multiplication", sets: "5 of 8 sets", pct: 63, tone: "teal", icon: "multiply", tint: colors.gamify.blue, wash: "bg-gamify-blue-wash" },
  { name: "Division", sets: "4 of 8 sets", pct: 50, tone: "teal", icon: "divide", tint: colors.gamify.purple, wash: "bg-gamify-purple-wash" },
  { name: "Fractions", sets: "3 of 6 sets", pct: 50, tone: "amber", icon: "chart.pie.fill", tint: colors.error, wash: "bg-gamify-red-wash" },
  { name: "Measurement", sets: "2 of 5 sets", pct: 40, tone: "amber", icon: "chart.bar.fill", tint: colors.gamify.purple, wash: "bg-gamify-purple-wash" },
  { name: "Geometry", sets: "1 of 4 sets", pct: 25, tone: "red", icon: "triangle.fill", tint: colors.primary, wash: "bg-subject-maths" },
]

type Recent = { title: string; cards: string; score: number; when: string }

const RECENT: Recent[] = [
  { title: "Place Value to 1,000", cards: "20 cards", score: 92, when: "Today" },
  { title: "Add 2-Digit Numbers", cards: "15 cards", score: 85, when: "Yesterday" },
  { title: "Multiply by 2, 5, 10", cards: "18 cards", score: 70, when: "2 days ago" },
  { title: "Divide by 2", cards: "12 cards", score: 55, when: "3 days ago" },
]

function scoreBadge(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: "bg-gamify-green-wash", text: "text-success" }
  if (score >= 60) return { bg: "bg-gamify-amber-wash", text: "text-status-learning" }
  return { bg: "bg-gamify-red-wash", text: "text-error" }
}

// Single teal "Overall" arc — one Circle with strokeDasharray over a full track ring.
const RING_R = 40
const RING_C = 2 * Math.PI * RING_R

function Ring({ pct }: { pct: number }) {
  const len = (pct / 100) * RING_C
  return (
    <View className="h-24 w-24 items-center justify-center">
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Circle cx={48} cy={48} r={RING_R} fill="none" stroke={colors.gamify.track} strokeWidth={9} />
        <Circle
          cx={48}
          cy={48}
          r={RING_R}
          fill="none"
          stroke={colors.study.teal}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${len} ${RING_C - len}`}
          transform="rotate(-90 48 48)"
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-text text-h3 font-bold text-ink">{pct}%</Text>
        <Text className="font-text text-caption text-text-secondary">Overall</Text>
      </View>
    </View>
  )
}

function MetaPill({ symbol, label }: { symbol: SFSymbol; label: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-gamify-tile px-3 py-2">
      <SymbolView name={symbol} size={14} tintColor={colors["text-secondary"]} weight="regular" />
      <Text className="ml-2 font-text text-caption font-medium text-text-secondary">{label}</Text>
    </View>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

export default function SubjectProgress() {
  const { subject } = useLocalSearchParams<{ subject: string }>()
  const { children } = useChildren()

  const raw = subject ?? "maths"
  const display = raw.charAt(0).toUpperCase() + raw.slice(1)
  const childName = children[0]?.name ?? "Amara"

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
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
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Subject Progress</Text>
        <View className="h-11 w-11 items-center justify-center">
          <SymbolView name="line.3.horizontal.decrease.circle" size={24} tintColor={colors.ink} weight="regular" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Subject summary */}
        <View className="rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-center">
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-subject-maths">
                  <Image
                    accessibilityIgnoresInvertColors
                    className="h-12 w-12"
                    contentFit="contain"
                    source={require("../../../../../../assets/images/gokid-prog-maths.png")}
                  />
                </View>
                <View className="ml-4 flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-text text-h3 font-bold text-ink">{display}</Text>
                    <View className="ml-3 rounded-full bg-badge-strong px-3 py-1">
                      <Text className="font-text text-caption font-bold text-badge-strong-ink">Strong</Text>
                    </View>
                  </View>
                  <Text className="mt-1 font-text text-body text-text-secondary">
                    Number and place value, addition, subtraction, multiplication, division and more.
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row gap-3">
                <MetaPill symbol="graduationcap.fill" label="Year 3" />
                <MetaPill symbol="target" label="15 Sets Completed" />
              </View>
            </View>
            <View className="ml-3">
              <Ring pct={80} />
            </View>
          </View>
        </View>

        {/* Topic breakdown */}
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">Topic breakdown</Text>
          </View>
          <View className="mt-3 flex-row items-center gap-4">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-study-teal" />
              <Text className="font-text text-caption text-text-secondary">Mastered</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-status-learning" />
              <Text className="font-text text-caption text-text-secondary">Learning</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-border" />
              <Text className="font-text text-caption text-text-secondary">Needs practice</Text>
            </View>
          </View>

          <View className="mt-2">
            {TOPICS.map((t, i) => (
              <Pressable
                key={t.name}
                accessibilityRole="button"
                accessibilityLabel={`${t.name}, ${t.pct} percent, ${t.sets}`}
                className={`flex-row items-center py-3 active:opacity-70 ${i > 0 ? "border-t border-border" : ""}`}
                onPress={() => router.push({ pathname: "/study/session/[id]", params: { id: "place-value" } })}
              >
                <View className={`h-10 w-10 items-center justify-center rounded-full ${t.wash}`}>
                  <SymbolView name={t.icon} size={18} tintColor={t.tint} weight="semibold" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-text text-body font-semibold text-ink">{t.name}</Text>
                  <Text className="mt-0.5 font-text text-caption text-text-secondary">{t.sets}</Text>
                </View>
                <View className="mx-3 h-2 w-20 overflow-hidden rounded-full bg-gamify-track">
                  <View className={`h-full rounded-full ${TONE[t.tone].bar} ${PCT[t.pct]}`} />
                </View>
                <Text className={`w-10 text-right font-text text-body-lg font-bold ${TONE[t.tone].text}`}>
                  {t.pct}%
                </Text>
                <SymbolView
                  name="chevron.right"
                  size={14}
                  tintColor={colors["text-secondary"]}
                  weight="semibold"
                  style={{ marginLeft: 8 }}
                />
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Recent sets */}
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">Recent sets</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all recent sets"
              className="active:opacity-60"
              onPress={() => {
                // Demo — the full "all sets" list screen is not built yet.
              }}
            >
              <Text className="font-text text-body font-bold text-primary">View all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            className="mt-4 -mx-1"
            contentContainerClassName="px-1"
            showsHorizontalScrollIndicator={false}
          >
            {RECENT.map((r) => {
              const badge = scoreBadge(r.score)
              return (
                <Pressable
                  key={r.title}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.title}, ${r.score} percent, ${r.when}`}
                  className="mr-3 h-32 w-40 justify-between rounded-2xl border border-border bg-white p-4 active:opacity-80"
                  onPress={() => router.push({ pathname: "/study/set-result/[id]", params: { id: "place-value" } })}
                >
                  <View>
                    <Text numberOfLines={2} className="font-text text-body font-bold text-ink">
                      {r.title}
                    </Text>
                    <Text className="mt-1 font-text text-caption text-text-secondary">{r.cards}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className={`rounded-full px-2 py-1 ${badge.bg}`}>
                      <Text className={`font-text text-caption font-bold ${badge.text}`}>{r.score}%</Text>
                    </View>
                    <Text className="font-text text-caption text-text-secondary">{r.when}</Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </Card>

        {/* Focus suggestion */}
        <Card>
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-gamify-amber-wash">
              <SymbolView name="lightbulb.fill" size={26} tintColor={colors.accent} weight="regular" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-text text-body-lg font-bold text-ink">Focus suggestion</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                {childName} could use more practice with Geometry and Measurement to build confidence.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start practice"
            className="mt-4 h-12 items-center justify-center rounded-full border border-primary bg-white active:opacity-70"
            onPress={() => router.push({ pathname: "/study/session/[id]", params: { id: "place-value" } })}
          >
            <Text className="font-text text-body-lg font-bold text-primary">Start practice</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
