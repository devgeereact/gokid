import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { ProgressRing } from "@/components/progress-ring"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useActiveChildId } from "@/lib/active-child"
import { useChildren } from "@/lib/children"
import {
  curriculumForYear,
  currentTerm,
  getYearGroup,
  type Objective,
  type SubjectCoverage,
  YEAR_GROUPS,
  yearCoverage,
  yearObjectives,
} from "@/lib/curriculum"
import type { StudySet } from "@/lib/study"

/**
 * Curriculum Browser — the National Curriculum, Reception to Year 6, one year at a time
 * (design/gokid-screens.md §5 "Study Sets → Curriculum Browser"; also the spine of §21 "Curriculum
 * Explorer": the year screens, Curriculum Objectives, Learning Outcomes and the NC browser are all
 * this screen at a different year / expanded section).
 *
 * **No mockup exists for this screen.** Every element is taken from a component the design system
 * (design/GoKid-design-system.png) already draws, rather than invented:
 *   - the year picker is 09. INPUTS' segmented control, which spells out Rec · Y1 … Y6 exactly;
 *   - the year capsule is 06. CHIPS / BADGES' "Year 3 · Autumn term" curriculum capsule;
 *   - the set rows are 07. CARDS' "Set Card (List)" — thumb, title, "Maths · Number and place
 *     value" sub-label, mastery chip;
 *   - the summary ring, white-card-on-cream surface, strand-style bars and pills match the Subject
 *     Hub (src/app/(app)/subject/[subject].tsx), which is one tap away and must not read as a
 *     different app.
 *
 * The browser differs from the Subject Hub on purpose: the hub answers "how is my child doing in
 * Maths", this answers "what does Year 3 actually cover, and how much of it have we touched" —
 * which is what §21 asks the Curriculum Explorer to be.
 *
 * Content is demo data (src/lib/curriculum.ts, derived from src/lib/study.ts). The Neon/Drizzle
 * content and progress APIs land later (AGENTS.md).
 */

// Tone thresholds match the Subject Hub's, for the same reason: the two screens show the same
// percentages one tap apart, so a number must not change colour between them.
function toneFor(pct: number): { bar: string; text: string } {
  if (pct >= 63) return { bar: "bg-study-teal", text: "text-study-teal" }
  if (pct >= 40) return { bar: "bg-status-learning", text: "text-status-learning" }
  return { bar: "bg-error", text: "text-error" }
}

// NativeWind compiles the classes it can read in the source, so a computed `w-[${pct}%]` emits
// nothing. Percentages round to the nearest 5 — same table as the Subject Hub.
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

/** The design system's segmented control (09. INPUTS) — Rec · Y1 … Y6, selected segment in teal. */
function YearPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return (
    <View className="mt-4 flex-row rounded-md border border-border bg-white p-1">
      {YEAR_GROUPS.map((year) => {
        const on = year.code === value
        return (
          <Pressable
            key={year.code}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={year.label}
            className={`h-9 flex-1 items-center justify-center rounded-sm ${on ? "bg-primary" : "active:opacity-60"}`}
            onPress={() => onChange(year.code)}
          >
            <Text className={`font-text text-body font-semibold ${on ? "text-white" : "text-text-secondary"}`}>
              {year.short}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** One objective — a Learning Outcome row (§21). Met rows take the success tick, the rest an
 *  empty ring, so the list reads as a checklist rather than a wall of text. */
function ObjectiveRow({ objective, met }: { objective: Objective; met: boolean }) {
  return (
    <View className="mt-3 flex-row items-start">
      <SymbolView
        name={met ? "checkmark.circle.fill" : "circle"}
        size={18}
        tintColor={met ? colors.success : colors.border}
        weight="regular"
        style={{ marginTop: 2 }}
      />
      <View className="ml-3 flex-1">
        <Text className={`font-text text-body ${met ? "text-ink" : "text-text-secondary"}`}>{objective.text}</Text>
        <Text className="mt-0.5 font-text text-caption text-text-secondary">{objective.strand}</Text>
      </View>
    </View>
  )
}

/** The design system's "Set Card (List)" — thumb, title, subject · topic, mastery chip. */
function SetRow({ set }: { set: StudySet }) {
  // Solid fill + white label, matching the study dashboard's StatusPill — the design system tints
  // these two states only as solids (`status.getting` / `status.learning`), with no pale wash.
  const chip = set.status === "getting" ? "bg-status-getting" : "bg-status-learning"
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}, ${set.subject}, ${set.cardsTotal} cards, ${set.statusLabel}`}
      className="mt-3 flex-row items-center rounded-lg border border-border bg-white p-3 active:opacity-80"
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      <Image accessibilityIgnoresInvertColors className="h-12 w-12 rounded-md" contentFit="cover" source={set.thumb} />
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="font-text text-body font-bold text-ink">
          {set.title}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 font-text text-caption text-text-secondary">
          {set.subject} • {set.topic}
        </Text>
        <View className="mt-2 flex-row items-center">
          <View className={`rounded-full px-2 py-0.5 ${chip}`}>
            <Text className="font-text text-caption font-semibold text-white">{set.statusLabel}</Text>
          </View>
          <Text className="ml-2 font-text text-caption text-text-secondary">
            {set.cardsDone} of {set.cardsTotal} cards
          </Text>
        </View>
      </View>
      <SymbolView name="chevron.right" size={14} tintColor={colors["text-secondary"]} weight="semibold" />
    </Pressable>
  )
}

/**
 * One subject's section. Collapsed it is a Subject-Hub strand row (wash disc, name, sub-label, bar,
 * bold percent); expanded it reveals the objectives and the sets that teach them. An accordion, not
 * a push: §21 asks the browser to *compare* what a year covers, and comparing means seeing two
 * subjects' objectives without losing your place.
 */
function SubjectSection({
  row,
  open,
  first,
  onToggle,
}: {
  row: SubjectCoverage
  open: boolean
  first: boolean
  onToggle: () => void
}) {
  const { subject } = row
  const tone = toneFor(row.pct)
  return (
    // Explicit `first`, not a `first:` variant — NativeWind has no positional variants.
    <View className={first ? "" : "border-t border-border"}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${subject.name}, ${row.pct} percent covered, ${row.sets.length} sets`}
        className="flex-row items-center py-3 active:opacity-70"
        onPress={onToggle}
      >
        {/* The subject's SF Symbol, not its illustration. The hub's art is square-backed, so at a
            40pt disc it draws a visible white box inside the round wash — the Subject Hub's own
            strand rows use a tinted symbol at this size for the same reason. */}
        <View className={`h-10 w-10 items-center justify-center rounded-full ${subject.wash}`}>
          <SymbolView name={subject.symbol} size={18} tintColor={subject.ink} weight="semibold" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-text text-body font-semibold text-ink">{subject.name}</Text>
          <Text numberOfLines={1} className="mt-0.5 font-text text-caption text-text-secondary">
            {row.sets.length} {row.sets.length === 1 ? "set" : "sets"} • {row.met}/{row.objectives.length} objectives
          </Text>
        </View>
        {/* w-12 / mx-2, tighter than the Subject Hub's w-20 / mx-3: this row carries a longer
            sub-label than the hub's "5 of 7 sets", and at the hub's widths it wrapped to two lines. */}
        <View className="mx-2 h-2 w-12 overflow-hidden rounded-full bg-gamify-track">
          <View className={`h-full rounded-full ${tone.bar} ${barWidth(row.pct)}`} />
        </View>
        <Text className={`w-10 text-right font-text text-body-lg font-bold ${tone.text}`}>{row.pct}%</Text>
        <SymbolView
          name={open ? "chevron.up" : "chevron.down"}
          size={14}
          tintColor={colors["text-secondary"]}
          weight="semibold"
          style={{ marginLeft: 8 }}
        />
      </Pressable>

      {open ? (
        <View className="pb-4">
          <Text className="mt-1 font-text text-caption font-bold uppercase tracking-wide text-text-secondary">
            Objectives
          </Text>
          {row.objectives.map((objective, i) => (
            <ObjectiveRow key={objective.text} objective={objective} met={i < row.met} />
          ))}

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="font-text text-caption font-bold uppercase tracking-wide text-text-secondary">
              Sets
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open the ${subject.name} hub`}
              className="active:opacity-60"
              onPress={() => router.push({ pathname: "/subject/[subject]", params: { subject: subject.slug } })}
            >
              <Text className="font-text text-caption font-bold text-primary">Subject hub</Text>
            </Pressable>
          </View>
          {row.sets.map((set) => (
            <SetRow key={set.id} set={set} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

export default function CurriculumBrowser() {
  // Params let another screen land on an exact place in the curriculum: `year` picks the segment
  // ("/curriculum?year=Y3"), `subject` opens that section already expanded — which is how the
  // Subject Hub links back in ("where does Maths sit in Year 3?"). Without either, the browser
  // opens on the active child's year, unexpanded: the curriculum a parent came to look at.
  const { year: param, subject: openParam } = useLocalSearchParams<{ year?: string; subject?: string }>()
  const activeId = useActiveChildId()
  const { children } = useChildren()
  const child = children.find((c) => c.id === activeId) ?? children[0]

  const initial = getYearGroup(param)?.code ?? getYearGroup(child?.yearGroup)?.code ?? "Y3"
  const [selected, setSelected] = useState(initial)
  const [open, setOpen] = useState<string | null>(openParam ?? null)

  const year = getYearGroup(selected) ?? YEAR_GROUPS[0]
  const rows = curriculumForYear(year.code)
  const coverage = yearCoverage(rows)
  const objectives = yearObjectives(rows)
  const setCount = rows.reduce((sum, r) => sum + r.sets.length, 0)
  const term = currentTerm()

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

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
        <Text numberOfLines={1} className="flex-1 text-center font-text text-h3 font-bold text-ink">
          Curriculum
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search sets"
          className="h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.push("/search")}
        >
          <SymbolView name="magnifyingglass" size={24} tintColor={colors.ink} weight="regular" />
        </Pressable>
      </View>

      {/* Year picker sits outside the ScrollView: it is the screen's control, and scrolling it away
          would leave a long objectives list with no way back to another year. */}
      <YearPicker value={selected} onChange={(code) => { setSelected(code); setOpen(null) }} />

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-1" showsVerticalScrollIndicator={false}>
        {/* Year summary. Same three-row shape as the Subject Hub's summary card — name, then blurb
            beside the ring, then pills — so the two screens stack consistently. */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-center">
            <Text className="flex-1 font-text text-h3 font-bold text-ink">{year.label}</Text>
            {/* The design system's curriculum capsule, verbatim in shape: "Year 3 · Autumn term". */}
            <View className="rounded-full border border-border bg-background px-3 py-1">
              <Text className="font-text text-caption font-medium text-text-secondary">{term}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            <Text className="flex-1 pr-4 font-text text-body text-text-secondary">{year.blurb}</Text>
            <ProgressRing pct={coverage} />
          </View>

          {/* Key stage is deliberately not a pill: it already heads the section below, and three
              pills at the reference's wording overrun the 313pt card row — the same overflow the
              Subject Hub hit and solved by shortening. Sets · subjects · objectives all fit. */}
          <View className="mt-4 flex-row items-center gap-2">
            <MetaPill symbol="square.grid.2x2.fill" label={`${rows.length} subjects`} />
            <MetaPill symbol="rectangle.stack.fill" label={`${setCount} sets`} />
            <MetaPill symbol="checklist" label={`${objectives.met}/${objectives.total} done`} />
          </View>
        </View>

        <Card>
          <Text className="font-text text-h3 font-bold text-ink">What {year.label} covers</Text>
          <Text className="mt-1 font-text text-caption text-text-secondary">
            National Curriculum • {year.keyStage}
          </Text>

          {rows.length === 0 ? (
            <View className="mt-2">
              <EmptyState
                symbol="tray"
                title="No sets yet"
                body={`We're still writing ${year.label} sets. New ones land every week.`}
              />
            </View>
          ) : (
            <View className="mt-2">
              {rows.map((row, i) => (
                <SubjectSection
                  key={row.subject.slug}
                  row={row}
                  first={i === 0}
                  open={open === row.subject.slug}
                  onToggle={() => setOpen(open === row.subject.slug ? null : row.subject.slug)}
                />
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
