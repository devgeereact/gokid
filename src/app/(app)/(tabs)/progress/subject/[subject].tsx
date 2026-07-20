import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { SubjectMark } from "@/components/subject-mark"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren, yearLabel } from "@/lib/children"
import { plural, type StrandProgress, useSubjectProgress } from "@/lib/analytics"
import { getSubject, recommendedSets, type Subject } from "@/lib/subjects"

/**
 * Subject Progress (design/GoKid-subjectprogress-screen.png, screen 17). A subject summary card with
 * an "Overall" ring, a per-topic breakdown with coloured mastery bars, a horizontal strip of recent
 * sets, and a focus suggestion. The strand percentages are still demo values (the Neon/Drizzle
 * progress API lands later — AGENTS.md), but they now come from the real subject the route names.
 *
 * The screen previously hardcoded Maths topics and Maths sets and only re-cased the `subject` param
 * for the title, so `/progress/subject/english` showed Maths data under an "English" heading —
 * silently wrong, which is worse than an error. It now reads `getSubject(slug)` for the strands and
 * `recommendedSets` for the recent strip, and shows an empty state for a slug with no subject.
 *
 * Inferred: the header filter glyph is static/decorative. Topic icons and the focus lightbulb are
 * tinted SF Symbols. "View all" has no target screen yet, so it is an inert demo link.
 */

type Tone = "teal" | "amber" | "red"

const TONE: Record<Tone, { bar: string; text: string }> = {
  teal: { bar: "bg-study-teal", text: "text-study-teal" },
  amber: { bar: "bg-status-learning", text: "text-status-learning" },
  red: { bar: "bg-error", text: "text-error" },
}

// Bar widths rounded to the nearest 5% — listed as literal classes so NativeWind's compiler emits
// them (it scans source text), keeping the bar data-driven with no inline `style`.
const PCT: Record<number, string> = {
  0: "w-[0%]", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-[100%]",
}

const barWidth = (pct: number) => PCT[Math.max(0, Math.min(100, Math.round(pct / 5) * 5))]

// A pct maps to a tone: strong (teal), building (amber), needs-work (red). Derived, not authored, so
// it is consistent across every subject rather than hand-set per Maths topic.
const toneFor = (pct: number): Tone => (pct >= 65 ? "teal" : pct >= 45 ? "amber" : "red")

// Rotating icon wash so stacked topic rows read as distinct, the way the mockup varied them.
const WASHES = ["bg-gamify-green-wash", "bg-gamify-amber-wash", "bg-gamify-blue-wash", "bg-gamify-purple-wash", "bg-gamify-red-wash"]

type Topic = { name: string; sets: string; pct: number | null; tone: Tone; icon: SFSymbol; tint: string; wash: string }

// A topic row for the child in front of us. `pct` is null until they have seen a card in the strand;
// the row then shows "not started" rather than a 0% bar, which would read as failure.
function topicsFor(subject: Subject, strands: StrandProgress[]): Topic[] {
  return strands.map((s, i) => ({
    name: s.name,
    sets: s.pct === null ? `${plural(s.sets, "set")} · not started` : `${s.setsDone} of ${plural(s.sets, "set")}`,
    pct: s.pct,
    tone: toneFor(s.pct ?? 0),
    icon: s.icon,
    tint: subject.ink,
    wash: WASHES[i % WASHES.length],
  }))
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

  const subj = getSubject(subject ?? "maths")
  const child = children[0]
  const progress = useSubjectProgress(subj, child?.id ?? "")
  const childName = child?.name ?? "your child"

  // Unknown slug — an honest empty state beats rendering another subject's data under this heading.
  if (!subj) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
        <StatusBar style="dark" />
        <View className="mt-1 flex-row items-center">
          <BackButton />
        </View>
        <EmptyState symbol="questionmark.circle" title="Subject not found" body="We couldn't find progress for that subject." />
      </SafeAreaView>
    )
  }

  const topics = topicsFor(subj, progress.strands)
  const overall = progress.pct ?? 0
  const setsDone = progress.setsDone
  const recent = recommendedSets(subj, child?.yearGroup).slice(0, 6)
  const focus = subj.focus.replace("{child}", childName)
  const strong = overall >= 65

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="mt-1 flex-row items-center">
        <BackButton />
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
                <SubjectMark subject={subj} className="h-16 w-16" symbolSize={30} />
                <View className="ml-4 flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-text text-h3 font-bold text-ink">{subj.name}</Text>
                    <View className={`ml-3 rounded-full px-3 py-1 ${strong ? "bg-badge-strong" : "bg-badge-practice"}`}>
                      <Text
                        className={`font-text text-caption font-bold ${strong ? "text-badge-strong-ink" : "text-badge-practice-ink"}`}
                      >
                        {strong ? "Strong" : "Building"}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-1 font-text text-body text-text-secondary">{subj.blurb}</Text>
                </View>
              </View>
              <View className="mt-4 flex-row gap-3">
                {child ? <MetaPill symbol="graduationcap.fill" label={yearLabel(child.yearGroup)} /> : null}
                <MetaPill symbol="target" label={`${setsDone} Sets Completed`} />
              </View>
            </View>
            <View className="ml-3">
              <Ring pct={overall} />
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
            {topics.map((t, i) => (
              <Pressable
                key={t.name}
                accessibilityRole="button"
                accessibilityLabel={`${t.name}, ${t.pct} percent, ${t.sets}`}
                className={`flex-row items-center py-3 active:opacity-70 ${i > 0 ? "border-t border-border" : ""}`}
                onPress={() => (recent[0] ? router.push({ pathname: "/lesson/[id]", params: { id: recent[0].id } }) : undefined)}
              >
                <View className={`h-10 w-10 items-center justify-center rounded-full ${t.wash}`}>
                  <SymbolView name={t.icon} size={18} tintColor={t.tint} weight="semibold" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-text text-body font-semibold text-ink">{t.name}</Text>
                  <Text className="mt-0.5 font-text text-caption text-text-secondary">{t.sets}</Text>
                </View>
                <View className="mx-3 h-2 w-20 overflow-hidden rounded-full bg-gamify-track">
                  {t.pct === null ? null : (
                    <View className={`h-full rounded-full ${TONE[t.tone].bar} ${barWidth(t.pct)}`} />
                  )}
                </View>
                <Text
                  className={`w-10 text-right font-text text-body-lg font-bold ${
                    t.pct === null ? "text-text-secondary" : TONE[t.tone].text
                  }`}
                >
                  {t.pct === null ? "—" : `${t.pct}%`}
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
            {recent.map((set) => {
              const badge =
                set.status === "getting"
                  ? { bg: "bg-gamify-green-wash", text: "text-success" }
                  : { bg: "bg-gamify-amber-wash", text: "text-status-learning" }
              return (
                <Pressable
                  key={set.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${set.title}, ${set.statusLabel}`}
                  className="mr-3 h-32 w-40 justify-between rounded-2xl border border-border bg-white p-4 active:opacity-80"
                  onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
                >
                  <View>
                    <Text numberOfLines={2} className="font-text text-body font-bold text-ink">
                      {set.title}
                    </Text>
                    <Text className="mt-1 font-text text-caption text-text-secondary">{set.cardsTotal} cards</Text>
                  </View>
                  <View className={`self-start rounded-full px-2 py-1 ${badge.bg}`}>
                    <Text className={`font-text text-caption font-bold ${badge.text}`}>{set.statusLabel}</Text>
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
              <Text className="mt-1 font-text text-body text-text-secondary">{focus}</Text>
            </View>
          </View>
          {recent[0] ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start practice"
              className="mt-4 h-12 items-center justify-center rounded-full border border-primary bg-white active:opacity-70"
              onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: recent[0].id } })}
            >
              <Text className="font-text text-body-lg font-bold text-primary">Start practice</Text>
            </Pressable>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
