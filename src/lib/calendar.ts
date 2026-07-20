import { useMemo } from "react"

import { type SessionRecord, useProgress } from "./reviews"

/**
 * Learning Calendar data (design/gokid-screens.md §8 — "Learning Calendar", and the Weekly / Monthly
 * / Yearly Progress rows the calendar's period switch stands in for).
 *
 * Every day is the child's own record. This module used to generate a deterministic *seeded* history
 * so the grids had something to draw, with real sessions overlaid on top — which meant a parent read
 * a month of studying that never happened. The generator is gone: a day with no sessions is a rest
 * day, and an untouched calendar is honestly empty.
 *
 * Sessions come from ./reviews.ts (on-device today, the Neon progress API later — AGENTS.md); screens
 * import the hook, never the builders.
 */

/** Local midnight for an epoch ms. */
function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Today at local midnight, read per call rather than pinned at module load — an app left open past
 * midnight used to keep yesterday's "today", so the highlight and the future-day cutoff silently
 * drifted. The clock read lives inside this function, never in a component body, because the React
 * Compiler treats a render-time `Date.now()` as impure (same rule as `dueLabel` in ./reviews.ts).
 */
export function todayStart() {
  return startOfDay(Date.now())
}

/** "2026-07-16" — a stable local-date key. `toISOString` would shift across the UTC boundary. */
export function dayKey(at: number) {
  const d = new Date(at)
  const m = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

/** One day in any of the three grids. `minutes === 0` means a rest day. */
export type DayCell = {
  key: string
  /** Epoch ms at local midnight. */
  at: number
  minutes: number
  sets: number
  cards: number
  /** 0–100. Only meaningful when `minutes > 0`. */
  accuracy: number
  subjects: string[]
  /** Heat step, 0 (rest) … 4 (heaviest) — drives the swatch colour. */
  level: 0 | 1 | 2 | 3 | 4
  isToday: boolean
  /** Days after today have no record and are drawn muted. */
  isFuture: boolean
}

function heatLevel(minutes: number): DayCell["level"] {
  if (minutes <= 0) return 0
  if (minutes <= 15) return 1
  if (minutes <= 30) return 2
  if (minutes <= 50) return 3
  return 4
}

/** Totals for the sessions a child finished on one day. */
function realDay(sessions: SessionRecord[]) {
  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const cards = sessions.reduce((sum, s) => sum + s.cardsReviewed, 0)
  const scored = sessions.filter((s) => s.score !== undefined && s.scoreTotal)
  const accuracy = scored.length
    ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0) / (s.scoreTotal ?? 1), 0) / scored.length) * 100)
    : 0
  return {
    minutes,
    sets: sessions.length,
    cards,
    accuracy,
    subjects: [...new Set(sessions.map((s) => s.subject))],
  }
}

const REST_DAY = { minutes: 0, sets: 0, cards: 0, accuracy: 0, subjects: [] as string[] }

function buildDay(at: number, byDay: Map<string, SessionRecord[]>, today: number): DayCell {
  const key = dayKey(at)
  const sessions = byDay.get(key)
  // No sessions means no study — a rest day, not an invented one.
  const base = sessions?.length ? realDay(sessions) : REST_DAY
  return {
    key,
    at,
    ...base,
    level: heatLevel(base.minutes),
    isToday: at === today,
    isFuture: at > today,
  }
}

/** Totals across a set of days — drives the summary tiles under every period. */
export type Summary = {
  daysStudied: number
  totalDays: number
  minutes: number
  sets: number
  cards: number
  /** Mean accuracy across the days that have one. */
  accuracy: number
  /** The heaviest day, or null when nothing was studied. */
  bestDay: DayCell | null
}

export function summarize(days: DayCell[]): Summary {
  const studied = days.filter((d) => d.minutes > 0)
  const scored = studied.filter((d) => d.accuracy > 0)
  return {
    daysStudied: studied.length,
    totalDays: days.filter((d) => !d.isFuture).length,
    minutes: studied.reduce((sum, d) => sum + d.minutes, 0),
    sets: studied.reduce((sum, d) => sum + d.sets, 0),
    cards: studied.reduce((sum, d) => sum + d.cards, 0),
    accuracy: scored.length ? Math.round(scored.reduce((sum, d) => sum + d.accuracy, 0) / scored.length) : 0,
    bestDay: studied.reduce<DayCell | null>((best, d) => (!best || d.minutes > best.minutes ? d : best), null),
  }
}

/**
 * "2h 45m" / "45m" / "—". Shared by the tiles and the day sheet.
 *
 * Past 10 hours the minutes are dropped ("77h", not "77h 22m"): a year's total overflows the stat
 * tile at the H3 step, and at that magnitude the minutes are noise. INFERRED — no reference covers
 * a duration this large.
 */
export function formatMinutes(minutes: number) {
  if (minutes <= 0) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  if (h >= 10 || !m) return `${h}h`
  return `${h}h ${m}m`
}

/** Which period the calendar is showing. Covers §8's Weekly / Monthly / Yearly Progress rows. */
export type Period = "week" | "month" | "year"

export type WeekView = { kind: "week"; label: string; days: DayCell[] }
/** `weeks` are Monday-first rows; a null pads a cell outside the month. */
export type MonthView = { kind: "month"; label: string; weeks: (DayCell | null)[][] }
export type YearMonth = { label: string; short: string; days: DayCell[] }
export type YearView = { kind: "year"; label: string; months: YearMonth[] }
export type CalendarView = WeekView | MonthView | YearView

/** Monday-first weekday index (0 = Mon … 6 = Sun). The UK school week the design assumes. */
function mondayIndex(at: number) {
  return (new Date(at).getDay() + 6) % 7
}

function addDays(at: number, n: number) {
  const d = new Date(at)
  d.setDate(d.getDate() + n)
  return startOfDay(d.getTime())
}

/** `offset` counts periods back from the current one: 0 = this week / month / year, -1 = the last.
 *  `today` is threaded in (rather than read from a module constant) so the grid never goes stale. */
function weekView(byDay: Map<string, SessionRecord[]>, offset: number, today: number): WeekView {
  const monday = addDays(today, -mondayIndex(today) + offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => buildDay(addDays(monday, i), byDay, today))
  const sunday = days[6].at
  const sameMonth = new Date(monday).getMonth() === new Date(sunday).getMonth()
  const from = new Date(monday).toLocaleDateString("en-GB", sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })
  const to = new Date(sunday).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  const label = offset === 0 ? "This week" : `${from} – ${to}`
  return { kind: "week", label, days }
}

function monthView(byDay: Map<string, SessionRecord[]>, offset: number, today: number): MonthView {
  const anchor = new Date(today)
  anchor.setDate(1)
  anchor.setMonth(anchor.getMonth() + offset)
  const first = startOfDay(anchor.getTime())
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()

  const cells: (DayCell | null)[] = Array.from({ length: mondayIndex(first) }, () => null)
  for (let i = 0; i < daysInMonth; i++) cells.push(buildDay(addDays(first, i), byDay, today))
  while (cells.length % 7) cells.push(null)

  const weeks: (DayCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return { kind: "month", label: anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), weeks }
}

function yearView(byDay: Map<string, SessionRecord[]>, offset: number, today: number): YearView {
  const year = new Date(today).getFullYear() + offset
  const months: YearMonth[] = Array.from({ length: 12 }, (_, m) => {
    const first = startOfDay(new Date(year, m, 1).getTime())
    const count = new Date(year, m + 1, 0).getDate()
    return {
      label: new Date(year, m, 1).toLocaleDateString("en-GB", { month: "long" }),
      short: new Date(year, m, 1).toLocaleDateString("en-GB", { month: "short" }),
      days: Array.from({ length: count }, (_, i) => buildDay(addDays(first, i), byDay, today)),
    }
  })
  return { kind: "year", label: `${year}`, months }
}

/** One bar in the Progress Overview's daily-activity chart. */
export type ActivityDay = { key: string; label: string; at: number; minutes: number; sets: number; isToday: boolean }

/** Totals for one stretch of days. `accuracy` is the mean across scored sessions only. */
export type PeriodTotals = { minutes: number; sets: number; accuracy: number; scored: boolean }

function totalsFor(sessions: SessionRecord[]): PeriodTotals {
  const scored = sessions.filter((s) => s.score !== undefined && s.scoreTotal)
  return {
    minutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    sets: sessions.length,
    accuracy: scored.length
      ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0) / (s.scoreTotal ?? 1), 0) / scored.length) * 100)
      : 0,
    scored: scored.length > 0,
  }
}

/** Percent change, or null when there is no baseline to compare against — an honest "no trend yet"
 *  beats reporting "+100%" against a week the child did not use the app. */
function change(now: number, before: number): number | null {
  if (before <= 0) return null
  return Math.round(((now - before) / before) * 100)
}

/**
 * The Progress Overview report: the last 7 days of real activity, the 7 before it as a baseline, and
 * the trend between them. Everything is computed from sessions the child actually finished.
 */
export function useWeeklyReport(childId: string) {
  const { sessions } = useProgress(childId)
  const now = todayStart()

  return useMemo(() => {
    const inRange = (s: SessionRecord, fromDaysAgo: number, toDaysAgo: number) => {
      const from = addDays(now, -fromDaysAgo)
      const to = addDays(now, -toDaysAgo + 1)
      return s.at >= from && s.at < to
    }
    const thisWeek = sessions.filter((s) => inRange(s, 6, 0))
    const lastWeek = sessions.filter((s) => inRange(s, 13, 7))

    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const days: ActivityDay[] = Array.from({ length: 7 }, (_, i) => {
      const at = addDays(now, -(6 - i))
      const key = dayKey(at)
      const onDay = sessions.filter((s) => dayKey(s.at) === key)
      return {
        key,
        label: labels[new Date(at).getDay()],
        at,
        minutes: onDay.reduce((sum, s) => sum + s.minutes, 0),
        sets: onDay.length,
        isToday: at === now,
      }
    })

    const totals = totalsFor(thisWeek)
    const previous = totalsFor(lastWeek)
    return {
      days,
      totals,
      previous,
      trend: {
        minutes: change(totals.minutes, previous.minutes),
        sets: change(totals.sets, previous.sets),
        accuracy: previous.scored && totals.scored ? totals.accuracy - previous.accuracy : null,
      },
    }
  }, [sessions, now])
}

/** Every day in a view, flattened — what `summarize` takes. */
export function viewDays(view: CalendarView): DayCell[] {
  if (view.kind === "week") return view.days
  if (view.kind === "month") return view.weeks.flat().filter((d): d is DayCell => d !== null)
  return view.months.flatMap((m) => m.days)
}

/**
 * The calendar for one child at one period. `offset` counts periods back from the present.
 * Returns the grid, its totals, and today's cell for the day sheet's initial selection.
 *
 * Deliberately no streak. A streak counts *consecutive* days and resets to zero on a miss, which
 * makes a broken chain the loudest fact on the screen — loss aversion, not learning. The grid and
 * `summary.daysStudied` already say how much a child studied without punishing a day off.
 */
export function useLearningCalendar(childId: string, period: Period, offset: number) {
  const { sessions } = useProgress(childId)

  const byDay = useMemo(() => {
    const map = new Map<string, SessionRecord[]>()
    for (const s of sessions) {
      const key = dayKey(s.at)
      const list = map.get(key)
      if (list) list.push(s)
      else map.set(key, [s])
    }
    return map
  }, [sessions])

  // Read once per render pass and threaded down, so every cell in a grid agrees on what "today" is.
  const now = todayStart()

  const view = useMemo<CalendarView>(() => {
    if (period === "week") return weekView(byDay, offset, now)
    if (period === "month") return monthView(byDay, offset, now)
    return yearView(byDay, offset, now)
  }, [byDay, period, offset, now])

  const summary = useMemo(() => summarize(viewDays(view)), [view])
  const today = useMemo(() => buildDay(now, byDay, now), [byDay, now])

  /** Sessions the child finished on a day — the day sheet's detail rows. Empty on a rest day. */
  const sessionsOn = useMemo(() => (key: string) => byDay.get(key) ?? [], [byDay])

  return { view, summary, today, sessionsOn }
}
