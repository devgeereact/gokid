import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { ProgressRing } from "@/components/progress-ring"
import { SubjectMark } from "@/components/subject-mark"
import { BackButton } from "@/components/primitives"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useActiveChildId } from "@/lib/active-child"
import { plural, type StrandProgress, useSubjectProgress } from "@/lib/analytics"
import { useChildren, yearLabel } from "@/lib/children"
import type { StudySet } from "@/lib/study"
import {
  getSubject,
  recommendedSets,
  type Subject,
  subjectSetCount,
} from "@/lib/subjects"

/**
 * Subject Hub — the landing page for one subject (design/gokid-screens.md §4: "Each page contains
 * curriculum strands · progress · recommended sets · illustrations"). Reached from the study
 * dashboard's subject row; pushes on to a set, or to the deeper Subject Progress breakdown.
 *
 * **No mockup exists for this screen.** Surface, type, radius and spacing are taken from the nearest
 * reference, design/GoKid-subjectprogress-screen.png (screen 17) — the same white cards on the cream
 * page, the same 96pt mastery ring, the same strand row (wash disc + name + sub-label + bar + bold
 * percent + chevron) and the same lightbulb focus card. The hub differs from that screen on purpose:
 * screen 17 reports on *past* work (recent sets, scores), the hub points at *next* work (recommended
 * sets, strands to open), which is what §4 asks a subject landing page to do.
 *
 * Content is demo data (src/lib/subjects.ts + src/lib/study.ts) — the Neon/Drizzle content and
 * progress APIs land later (AGENTS.md).
 */

// Mastery tone. Screen 17 tags each row explicitly (Division at 50% is teal, Fractions at 50% is
// amber), which no rule can reproduce — INFERRED: the hub derives tone from the percentage instead,
// at the thresholds those rows imply (teal from ~63 up, red below ~40).
function toneFor(pct: number): { bar: string; text: string } {
  if (pct >= 63) return { bar: "bg-study-teal", text: "text-study-teal" }
  if (pct >= 40) return { bar: "bg-status-learning", text: "text-status-learning" }
  return { bar: "bg-error", text: "text-error" }
}

/**
 * The standing badge beside the subject name. Screen 17 shows one state only — "Strong" on 80% —
 * so the threshold is INFERRED: 65% and up is Strong, below that the child is still working, which
 * takes the design system's amber "practice" badge rather than inventing a third colour.
 */
function standingFor(pct: number): { label: string; wash: string; ink: string } {
  return pct >= 65
    ? { label: "Strong", wash: "bg-badge-strong", ink: "text-badge-strong-ink" }
    : { label: "Practice", wash: "bg-badge-practice", ink: "text-badge-practice-ink" }
}

// Bar widths must be literal classes — NativeWind compiles what it can read in the source, so a
// computed `w-[${pct}%]` emits nothing. Strand percentages round to the nearest 5.
const BAR: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
}

function barWidth(pct: number): string {
  return BAR[Math.round(pct / 5) * 5] ?? "w-0"
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

function MetaPill({ symbol, label }: { symbol: SFSymbol; label: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-gamify-tile px-3 py-2">
      <SymbolView name={symbol} size={14} tintColor={colors["text-secondary"]} weight="regular" />
      <Text className="ml-2 font-text text-caption font-medium text-text-secondary">{label}</Text>
    </View>
  )
}

/** The subject's illustration, or its SF Symbol where the repo has no art for it. */
function SubjectArt({ subject }: { subject: Subject }) {
  return <SubjectMark subject={subject} className="h-16 w-16" symbolSize={28} />
}

function StrandRow({ strand, subject, first }: { strand: StrandProgress; subject: Subject; first: boolean }) {
  // A strand they have not opened has no percentage to show. Rendering 0% there would read as
  // "tried it, learned nothing" — the opposite of the truth.
  const started = strand.pct !== null
  const tone = toneFor(strand.pct ?? 0)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        started
          ? `${strand.name}, ${strand.pct} percent, ${strand.setsDone} of ${plural(strand.sets, "set")}`
          : `${strand.name}, not started, ${plural(strand.sets, "set")}`
      }
      className={`flex-row items-center py-3 active:opacity-70 ${first ? "" : "border-t border-border"}`}
      onPress={() => router.push({ pathname: "/progress/subject/[subject]", params: { subject: subject.slug } })}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${subject.wash}`}>
        <SymbolView name={strand.icon} size={18} tintColor={subject.ink} weight="semibold" />
      </View>
      <View className="ml-3 flex-1">
        {/* Wraps rather than truncates — "Number and place value" runs to two lines on the matched
            Subject Progress screen (screen 17) at this width, and the strand name is the row. */}
        <Text className="font-text text-body font-semibold text-ink">{strand.name}</Text>
        <Text className="mt-0.5 font-text text-caption text-text-secondary">
          {started
            ? `${strand.setsDone} of ${plural(strand.sets, "set")}`
            : `${plural(strand.sets, "set")} · not started`}
        </Text>
      </View>
      <View className="mx-3 h-2 w-20 overflow-hidden rounded-full bg-gamify-track">
        {started ? <View className={`h-full rounded-full ${tone.bar} ${barWidth(strand.pct ?? 0)}`} /> : null}
      </View>
      <Text
        className={`w-10 text-right font-text text-body-lg font-bold ${started ? tone.text : "text-text-secondary"}`}
      >
        {started ? `${strand.pct}%` : "—"}
      </Text>
      <SymbolView
        name="chevron.right"
        size={14}
        tintColor={colors["text-secondary"]}
        weight="semibold"
        style={{ marginLeft: 8 }}
      />
    </Pressable>
  )
}

function SetCard({ set, mine }: { set: StudySet; mine: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}, ${set.yearGroup}, ${set.cardsTotal} cards`}
      className="mr-3 h-40 w-40 justify-between rounded-2xl border border-border bg-white p-4 active:opacity-80"
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      <Image accessibilityIgnoresInvertColors className="h-12 w-12 rounded-md" contentFit="cover" source={set.thumb} />
      <View>
        <Text numberOfLines={2} className="font-text text-body font-bold text-ink">
          {set.title}
        </Text>
        <Text className="mt-1 font-text text-caption text-text-secondary">
          {mine ? `${set.cardsTotal} cards` : `${set.yearGroup} • ${set.cardsTotal} cards`}
        </Text>
      </View>
    </Pressable>
  )
}

export default function SubjectHub() {
  const { subject: slug } = useLocalSearchParams<{ subject: string }>()
  // The child who was tapped on "Who's studying?" — their year decides which sets lead the shelf.
  // Reached without one (deep link, no profiles) → the hub still renders, unfiltered.
  const activeId = useActiveChildId()
  const { children } = useChildren()
  const child = children.find((c) => c.id === activeId) ?? children[0]
  const subject = getSubject(slug)
  // Before the early return below: hooks cannot sit behind a conditional.
  const progress = useSubjectProgress(subject, child?.id ?? "")

  if (!subject) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
        <StatusBar style="dark" />
        <EmptyState
          symbol="questionmark.folder"
          title="Subject not found"
          body="That subject isn’t part of the curriculum yet."
          actionLabel="Back to study"
          onAction={() => router.replace("/study")}
        />
      </SafeAreaView>
    )
  }

  // Real standing for this child in this subject, not an average of authored strand figures.
  const overall = progress.pct ?? 0
  const standing = standingFor(overall)
  const sets = recommendedSets(subject, child?.yearGroup)
  const childName = child?.name ?? "Your child"
  const year = child ? yearLabel(child.yearGroup) : "All years"

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — title is the subject, not a screen name: the hub *is* the subject. */}
      <View className="mt-1 flex-row items-center">
        <BackButton />
        <Text numberOfLines={1} className="flex-1 text-center font-text text-h3 font-bold text-ink">
          {subject.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Search ${subject.name} sets`}
          className="h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.push({ pathname: "/search", params: { subject: subject.name } })}
        >
          <SymbolView name="magnifyingglass" size={24} tintColor={colors.ink} weight="regular" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Subject summary. Three stacked rows — art + name, then blurb beside the ring, then the
            pills — rather than screen 17's two columns. Ten subjects broke that layout: the name
            column is ~306pt wide here, so "Religious Education" wrapped, the blurb ran five lines
            against the reference's two, and the standing badge had nowhere to sit. Giving the name
            the full card width and dropping the blurb below it buys ~150pt for both. */}
        <View className="rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-center">
            <SubjectArt subject={subject} />
            <Text className="ml-4 flex-1 font-text text-h3 font-bold text-ink">{subject.name}</Text>
          </View>

          <View className="mt-4 flex-row items-center">
            <Text className="flex-1 pr-4 font-text text-body text-text-secondary">{subject.blurb}</Text>
            {/* Teal ring, not the subject accent: screen 17 draws this ring in study teal, and the
                hub sits one tap from it — two rings in two colours for the same number would read
                as two different measures. The subject accent stays on the washes and strand icons. */}
            <ProgressRing pct={overall} />
          </View>

          {/* Year · sets · standing, one row. Screen 17 sets the standing badge inline beside the
              subject name; at this width it wrapped there, and the pill row is where the other
              subject facts already live. Its "15 Sets Completed" wording is shortened to "10 sets"
              because three pills at the reference's wording overrun the 322pt row by ~20pt. */}
          <View className="mt-4 flex-row items-center gap-2">
            <MetaPill symbol="graduationcap.fill" label={year} />
            <MetaPill
              symbol="target"
              label={`${progress.setsDone} of ${plural(subjectSetCount(subject), "set")}`}
            />
            <View className={`justify-center rounded-full px-3 py-2 ${standing.wash}`}>
              <Text className={`font-text text-caption font-bold ${standing.ink}`}>{standing.label}</Text>
            </View>
          </View>
        </View>

        {/* Curriculum strands */}
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">Curriculum strands</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Full ${subject.name} progress`}
              className="active:opacity-60"
              onPress={() =>
                router.push({ pathname: "/progress/subject/[subject]", params: { subject: subject.slug } })
              }
            >
              <Text className="font-text text-body font-bold text-primary">Progress</Text>
            </Pressable>
          </View>
          {/* The subheading is the way into the Curriculum Browser, with this subject already
              expanded — "where does Maths sit in Year 3?". A link, not a new row: the line already
              names the thing it opens. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See ${subject.name} in the ${year} curriculum`}
            className="mt-1 flex-row items-center active:opacity-60"
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: "/curriculum",
                params: { subject: subject.slug, ...(child ? { year: child.yearGroup } : {}) },
              })
            }
          >
            <Text className="font-text text-caption text-text-secondary">
              National Curriculum • {year}
            </Text>
            <SymbolView
              name="chevron.right"
              size={10}
              tintColor={colors["text-secondary"]}
              weight="semibold"
              style={{ marginLeft: 4 }}
            />
          </Pressable>
          <View className="mt-2">
            {progress.strands.map((strand, i) => (
              <StrandRow key={strand.name} strand={strand} subject={subject} first={i === 0} />
            ))}
          </View>
        </Card>

        {/* Recommended sets */}
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">Recommended sets</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View all ${subject.name} sets`}
              className="active:opacity-60"
              onPress={() => router.push({ pathname: "/search", params: { subject: subject.name } })}
            >
              <Text className="font-text text-body font-bold text-primary">View all</Text>
            </Pressable>
          </View>
          {sets.length === 0 ? (
            <View className="mt-2">
              <EmptyState
                symbol="tray"
                title="No sets yet"
                body={`We're still writing ${subject.name} sets. New ones land every week.`}
              />
            </View>
          ) : (
            <ScrollView
              horizontal
              className="-mx-1 mt-4"
              contentContainerClassName="px-1"
              showsHorizontalScrollIndicator={false}
            >
              {sets.map((set) => (
                <SetCard key={set.id} set={set} mine={set.yearCode === child?.yearGroup} />
              ))}
            </ScrollView>
          )}
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
                {subject.focus.replace("{child}", childName)}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start practice"
            className="mt-4 h-12 items-center justify-center rounded-full border border-primary bg-white active:opacity-70"
            disabled={sets.length === 0}
            onPress={() => {
              const first = sets[0]
              if (first) router.push({ pathname: "/lesson/[id]", params: { id: first.id } })
            }}
          >
            <Text className="font-text text-body-lg font-bold text-primary">Start practice</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
