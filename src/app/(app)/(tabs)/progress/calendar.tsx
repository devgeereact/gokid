import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import {
  type CalendarView,
  type DayCell,
  formatMinutes,
  type Period,
  useLearningCalendar,
  viewDays,
} from "@/lib/calendar"
import { DEFAULT_AVATAR, useChildren, useStudyingChildId, yearLabel } from "@/lib/children"
import { useProgress } from "@/lib/reviews"

/**
 * Learning Calendar (design/gokid-screens.md §8 — "Learning Calendar"). The period switch also
 * covers §8's "Weekly Progress" / "Monthly Progress" / "Yearly Progress" rows: they are the same
 * record at three zoom levels, not three screens.
 *
 * No design reference covers this screen. Surface, type scale, radius and the stat-tile geometry are
 * taken from design/GoKid-progressoverview-screen.png (screen 16) — the same white cards on the
 * cream page, the same three-up wash tiles, the same teal progress fill. The heat ramp itself is
 * inferred (see `colors.calendar` in src/design/tokens.js).
 *
 * Every day's record is the child's own: src/lib/calendar.ts builds each cell from the sessions they
 * actually finished, so an untouched calendar is honestly empty rather than seeded with a study
 * history that never happened. Sessions are on-device today; the Neon progress API lands later
 * (AGENTS.md).
 */

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
]

/** Monday-first, matching the UK school week the week/month grids are built on. */
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

// Literal classes per heat step — NativeWind's compiler scans source text, so a template like
// `bg-calendar-heat${n}` would never be emitted. Same pattern as overview.tsx's PCT map.
const HEAT: Record<DayCell["level"], string> = {
  0: "bg-calendar-heat0",
  1: "bg-calendar-heat1",
  2: "bg-calendar-heat2",
  3: "bg-calendar-heat3",
  4: "bg-calendar-heat4",
}

/** The two darkest steps need white numerals to stay legible. */
function heatInk(level: DayCell["level"]) {
  return level >= 3 ? "text-white" : "text-ink"
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

function StatTile({ icon, wash, disc, label, value }: { icon: SFSymbol; wash: string; disc: string; label: string; value: string }) {
  return (
    <View className={`flex-1 rounded-2xl p-3 ${wash}`}>
      <View className="flex-row items-center gap-1">
        {/* 28pt disc, not overview.tsx's 32 — three tiles across leave ~47pt of label track, and
            "Accuracy" needs ~46 of it at the tile step. */}
        <View className={`h-7 w-7 items-center justify-center rounded-full ${disc}`}>
          <SymbolView name={icon} size={15} tintColor={colors.white} weight="semibold" />
        </View>
        {/* text-tile, not overview.tsx's text-caption: three tiles across leave ~60pt of label
            width here, and at 13px "Accuracy" breaks mid-word. */}
        <Text numberOfLines={1} className="flex-1 font-text text-tile text-text-secondary">
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} className="mt-2 font-text text-h3 font-bold text-ink">
        {value}
      </Text>
    </View>
  )
}

/** One of the day sheet's four mini tiles. Four across is tight — both lines are pinned to one. */
function DayStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-lg bg-gamify-tile p-2">
      <Text numberOfLines={1} className="font-text text-tile text-text-secondary">
        {label}
      </Text>
      <Text numberOfLines={1} className="mt-1 font-text text-body-lg font-bold text-ink">
        {value}
      </Text>
    </View>
  )
}

/** One tappable day square. Sized by its parent so the same cell serves the week and month grids. */
function DaySquare({ day, selected, onSelect }: { day: DayCell; selected: boolean; onSelect: (key: string) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${new Date(day.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} — ${
        day.isFuture ? "not studied yet" : day.minutes > 0 ? `${day.minutes} minutes studied` : "rest day"
      }`}
      className={`aspect-square flex-1 items-center justify-center rounded-md ${HEAT[day.level]} ${day.isFuture ? "opacity-40" : ""} ${
        selected ? "border-2 border-ink" : day.isToday ? "border-2 border-study-teal" : ""
      } active:opacity-70`}
      disabled={day.isFuture}
      onPress={() => onSelect(day.key)}
    >
      <Text className={`font-text text-caption font-semibold ${heatInk(day.level)}`}>{new Date(day.at).getDate()}</Text>
    </Pressable>
  )
}

function WeekGrid({ days, selected, onSelect }: { days: DayCell[]; selected: string | null; onSelect: (key: string) => void }) {
  return (
    <View className="flex-row gap-2">
      {days.map((day, i) => (
        <View key={day.key} className="flex-1 items-center">
          <Text className="mb-2 font-text text-caption font-semibold text-text-secondary">{WEEKDAYS[i]}</Text>
          <View className="w-full">
            <DaySquare day={day} selected={selected === day.key} onSelect={onSelect} />
          </View>
          <Text className="mt-2 font-text text-tile text-text-secondary">{day.minutes > 0 ? `${day.minutes}m` : "—"}</Text>
        </View>
      ))}
    </View>
  )
}

function MonthGrid({ weeks, selected, onSelect }: { weeks: (DayCell | null)[][]; selected: string | null; onSelect: (key: string) => void }) {
  return (
    <View>
      <View className="mb-2 flex-row gap-1">
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} className="flex-1 text-center font-text text-caption font-semibold text-text-secondary">
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week.find((d) => d)?.key ?? `pad-${weeks.indexOf(week)}`} className="mb-1 flex-row gap-1 last:mb-0">
          {week.map((day, i) =>
            day ? (
              <DaySquare key={day.key} day={day} selected={selected === day.key} onSelect={onSelect} />
            ) : (
              <View key={`blank-${i}`} className="aspect-square flex-1" />
            )
          )}
        </View>
      ))}
    </View>
  )
}

/** Every month row is padded to 31 slots, so day-of-month lines up as a column down the year. */
const MONTH_SLOTS = Array.from({ length: 31 }, (_, i) => i)

/**
 * Year view: one row per month, one swatch per day, the whole year at a glance.
 *
 * The swatches are sized by `flex-1` inside a fixed 31-slot row rather than pinned to a spacing
 * token — 31 cells at any token width overflow the card and wrap into ragged rows that no longer
 * line up with their month label.
 */
function YearGrid({ view, onSelect }: { view: Extract<CalendarView, { kind: "year" }>; onSelect: (key: string) => void }) {
  return (
    <View>
      {view.months.map((month) => (
        <View key={month.short} className="mb-2 flex-row items-center last:mb-0">
          <Text className="w-8 font-text text-tile font-semibold text-text-secondary">{month.short}</Text>
          <View className="flex-1 flex-row gap-0.5">
            {MONTH_SLOTS.map((slot) => {
              const day = month.days[slot]
              // Short months leave their tail slots empty rather than shrinking the row.
              if (!day) return <View key={`pad-${slot}`} className="aspect-square flex-1" />
              return (
                <Pressable
                  key={day.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${month.label} ${slot + 1} — ${
                    day.isFuture ? "not studied yet" : day.minutes > 0 ? `${day.minutes} minutes studied` : "rest day"
                  }`}
                  className={`aspect-square flex-1 rounded-xs ${HEAT[day.level]} ${day.isFuture ? "opacity-40" : ""} active:opacity-60`}
                  disabled={day.isFuture}
                  onPress={() => onSelect(day.key)}
                />
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

function Legend() {
  return (
    <View className="mt-4 flex-row items-center justify-end gap-1">
      <Text className="mr-1 font-text text-tile text-text-secondary">Less</Text>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <View key={level} className={`h-3 w-3 rounded-xs ${HEAT[level]}`} />
      ))}
      <Text className="ml-1 font-text text-tile text-text-secondary">More</Text>
    </View>
  )
}

export default function LearningCalendar() {
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]

  // The period lives in the URL, not in state: it makes each of §8's Weekly / Monthly / Yearly
  // views a linkable address (the overview's "This week" pill lands straight on the week), and a
  // caller re-entering an already-mounted calendar with a different `?period=` gets the view it
  // asked for rather than whatever the last visit left behind.
  const { period: periodParam } = useLocalSearchParams<{ period?: string }>()
  const period: Period = PERIODS.some((p) => p.key === periodParam) ? (periodParam as Period) : "month"
  const [offset, setOffset] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const { view, summary, today, sessionsOn } = useLearningCalendar(childId, period, offset)

  // Cards the child has genuinely retained — a card in box 2 or higher has been recalled at least
  // twice across widening intervals. Intrinsic and cumulative: unlike a streak, a day off never
  // takes it away.
  const { cards } = useProgress(childId)
  const retained = cards.filter((c) => c.box >= 2).length

  // Nothing picked yet (or the pick fell outside the period the user just switched to) — the day
  // sheet falls back to today, which is always a real cell.
  const selected = viewDays(view).find((d) => d.key === selectedKey) ?? today
  const sessions = sessionsOn(selected.key)

  // Stepping the period resets to the present: "3 weeks ago" has no sensible reading as a month.
  function choosePeriod(next: Period) {
    setOffset(0)
    setSelectedKey(null)
    router.setParams({ period: next })
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Learning Calendar</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          className="h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => {
            setOffset(0)
            setSelectedKey(null)
          }}
        >
          <SymbolView name="calendar.badge.clock" size={22} tintColor={colors.ink} weight="regular" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Child + cards retained. Not a streak: this only ever goes up, so a day off costs nothing. */}
        <View className="flex-row items-center">
          <ChildAvatar avatar={child?.avatar ?? DEFAULT_AVATAR} className="h-14 w-14" />
          <View className="ml-3 flex-1">
            <Text className="font-text text-h3 font-bold text-ink">{child?.name ?? "Amara"}</Text>
            <Text className="font-text text-body text-text-secondary">{yearLabel(child?.yearGroup ?? "Y3")}</Text>
          </View>
          <View className="flex-row items-center gap-2 rounded-full bg-gamify-green-wash px-4 py-2">
            <SymbolView name="brain.head.profile" size={14} tintColor={colors.success} weight="semibold" />
            <Text className="font-text text-body font-bold text-ink">{retained} learned</Text>
          </View>
        </View>

        {/* Period switch — Weekly / Monthly / Yearly progress on one record. */}
        <View className="mt-5 flex-row rounded-full border border-border bg-white p-1">
          {PERIODS.map((p) => {
            const active = p.key === period
            return (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${p.label} view`}
                className={`h-9 flex-1 items-center justify-center rounded-full ${active ? "bg-study-teal" : ""} active:opacity-70`}
                onPress={() => choosePeriod(p.key)}
              >
                <Text className={`font-text text-body font-bold ${active ? "text-white" : "text-text-secondary"}`}>{p.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* Summary tiles */}
        <View className="mt-4 flex-row gap-3">
          <StatTile
            icon="calendar"
            wash="bg-gamify-green-wash"
            disc="bg-gamify-green"
            label="Days"
            value={`${summary.daysStudied}/${summary.totalDays}`}
          />
          <StatTile icon="clock.fill" wash="bg-gamify-purple-wash" disc="bg-gamify-purple" label="Time" value={formatMinutes(summary.minutes)} />
          <StatTile
            icon="target"
            wash="bg-gamify-amber-wash"
            disc="bg-accent"
            label="Accuracy"
            value={summary.accuracy ? `${summary.accuracy}%` : "—"}
          />
        </View>

        {/* The grid */}
        <Card>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Previous ${period}`}
              className="h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-60"
              onPress={() => setOffset(offset - 1)}
            >
              <SymbolView name="chevron.left" size={16} tintColor={colors.ink} weight="semibold" />
            </Pressable>
            <Text className="font-text text-body-lg font-bold text-ink">{view.label}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Next ${period}`}
              // The future has no record — stepping past the present is disabled, not empty.
              className={`h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-60 ${offset >= 0 ? "opacity-30" : ""}`}
              disabled={offset >= 0}
              onPress={() => setOffset(offset + 1)}
            >
              <SymbolView name="chevron.right" size={16} tintColor={colors.ink} weight="semibold" />
            </Pressable>
          </View>

          {view.kind === "week" ? (
            <WeekGrid days={view.days} selected={selectedKey} onSelect={setSelectedKey} />
          ) : view.kind === "month" ? (
            <MonthGrid weeks={view.weeks} selected={selectedKey} onSelect={setSelectedKey} />
          ) : (
            <YearGrid view={view} onSelect={setSelectedKey} />
          )}

          <Legend />
        </Card>

        {/* Selected day */}
        <Card>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-text text-h3 font-bold text-ink">
              {selected.isToday ? "Today" : new Date(selected.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </Text>
            <View className={`h-6 w-6 rounded-md ${HEAT[selected.level]}`} />
          </View>

          {selected.minutes === 0 ? (
            <Text className="font-text text-body text-text-secondary">
              {selected.isToday ? "Nothing studied yet today — a good day to start." : "A rest day. Rest days are part of the plan."}
            </Text>
          ) : (
            <>
              <View className="flex-row gap-2">
                <DayStat label="Time" value={formatMinutes(selected.minutes)} />
                <DayStat label="Sets" value={`${selected.sets}`} />
                <DayStat label="Cards" value={`${selected.cards}`} />
                <DayStat label="Accuracy" value={selected.accuracy ? `${selected.accuracy}%` : "—"} />
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {selected.subjects.map((s) => (
                  <View key={s} className="rounded-md bg-badge-strong px-3 py-1">
                    <Text className="font-text text-caption font-semibold text-badge-strong-ink">{s}</Text>
                  </View>
                ))}
              </View>

              {/* The individual sessions behind this day's totals. */}
              {sessions.map((s) => (
                <View key={s.id} className="mt-3 flex-row items-center">
                  <View className="h-9 w-9 items-center justify-center rounded-md bg-gamify-tile">
                    <SymbolView name="book.closed" size={16} tintColor={colors.ink} weight="regular" />
                  </View>
                  <Text numberOfLines={1} className="ml-3 flex-1 font-text text-body font-semibold text-ink">
                    {s.setTitle}
                  </Text>
                  <Text className="font-text text-caption text-text-secondary">{s.minutes}m</Text>
                </View>
              ))}
            </>
          )}
        </Card>

        {/* Best day in the period — an honest superlative, and one a day off cannot take away. */}
        {summary.bestDay ? (
          <Card>
            <Text className="mb-2 font-text text-h3 font-bold text-ink">Best day</Text>
            <Text className="font-text text-body text-text-secondary">
              {new Date(summary.bestDay.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} —{" "}
              {formatMinutes(summary.bestDay.minutes)} across {summary.bestDay.sets} {summary.bestDay.sets === 1 ? "set" : "sets"}.
            </Text>
          </Card>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Study history"
          className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push("/progress/history")}
        >
          <SymbolView name="clock.arrow.circlepath" size={20} tintColor={colors.ink} weight="regular" />
          <Text className="font-text text-body-lg font-bold text-ink">Study history</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
