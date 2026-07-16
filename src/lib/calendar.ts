import { useMemo } from "react"

import { type SessionRecord, useProgress } from "./reviews"

/**
 * Learning Calendar data (design/gokid-screens.md §8 — "Learning Calendar", and the Weekly / Monthly
 * / Yearly Progress rows the calendar's period switch stands in for).
 *
 * Every child's history here is a **demo**: a deterministic, seeded study record so the week, month
 * and year views all have something to draw before the Neon/Drizzle progress API lands (AGENTS.md).
 * Real sessions recorded by ./reviews.ts on this device are overlaid on top of the demo day, so a
 * day the child actually studied reads their real minutes rather than the seed's. Screens import the
 * hook, never the generator — this module is the single seam to swap when the API arrives.
 */

/** How far back the demo record runs. Long enough for the year view plus a full previous year. */
const HISTORY_DAYS = 800

/** Local midnight for an epoch ms. */
function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Today, pinned at module load. Screens must not read the clock during render — the React Compiler
 * (on for this project) treats `Date.now()` in a component body as impure. Same rule as
 * `dueLabel` / `elapsedMinutes` in ./reviews.ts, which read the clock inside the module too.
 */
export const TODAY = startOfDay(Date.now())

/** "2026-07-16" — a stable local-date key. `toISOString` would shift across the UTC boundary. */
export function dayKey(at: number) {
  const d = new Date(at)
  const m = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

// FNV-1a over the seed string, then an avalanche mix — a stable 0–1 draw per (child, day, field).
// A PRNG sequence would depend on iteration order; hashing the key means a day's numbers are the
// same no matter which view asks for them.
function rand01(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

const DEMO_SUBJECTS = ["Maths", "English", "Science", "Geography", "History"]

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
  /** True when this day carries sessions the child really finished, not the seeded demo. */
  real: boolean
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

/** The seeded demo day: rest days are likelier at the weekend, minutes cluster 8–60. */
function demoDay(childId: string, at: number) {
  const key = dayKey(at)
  const dow = new Date(at).getDay()
  const rest = dow === 0 ? 0.55 : dow === 6 ? 0.42 : 0.17
  if (rand01(`${childId}:${key}:rest`) < rest) return { minutes: 0, sets: 0, cards: 0, accuracy: 0, subjects: [] }

  const minutes = 8 + Math.round(rand01(`${childId}:${key}:min`) * 52)
  const sets = Math.max(1, Math.round(minutes / 14))
  const cards = sets * (6 + Math.round(rand01(`${childId}:${key}:cards`) * 8))
  const accuracy = 58 + Math.round(rand01(`${childId}:${key}:acc`) * 38)

  const first = Math.floor(rand01(`${childId}:${key}:s1`) * DEMO_SUBJECTS.length)
  const subjects = [DEMO_SUBJECTS[first]]
  if (rand01(`${childId}:${key}:s2`) > 0.45) {
    const second = (first + 1 + Math.floor(rand01(`${childId}:${key}:s3`) * (DEMO_SUBJECTS.length - 1))) % DEMO_SUBJECTS.length
    subjects.push(DEMO_SUBJECTS[second])
  }
  return { minutes, sets, cards, accuracy, subjects }
}

/** Real sessions win over the seed for the days they cover. */
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

function buildDay(childId: string, at: number, byDay: Map<string, SessionRecord[]>): DayCell {
  const key = dayKey(at)
  const isFuture = at > TODAY
  const sessions = byDay.get(key)
  const base = isFuture
    ? { minutes: 0, sets: 0, cards: 0, accuracy: 0, subjects: [] as string[] }
    : sessions?.length
      ? realDay(sessions)
      : demoDay(childId, at)
  return {
    key,
    at,
    ...base,
    level: heatLevel(base.minutes),
    real: Boolean(sessions?.length),
    isToday: at === TODAY,
    isFuture,
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

/** `offset` counts periods back from the current one: 0 = this week / month / year, -1 = the last. */
function weekView(childId: string, byDay: Map<string, SessionRecord[]>, offset: number): WeekView {
  const monday = addDays(TODAY, -mondayIndex(TODAY) + offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => buildDay(childId, addDays(monday, i), byDay))
  const sunday = days[6].at
  const sameMonth = new Date(monday).getMonth() === new Date(sunday).getMonth()
  const from = new Date(monday).toLocaleDateString("en-GB", sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })
  const to = new Date(sunday).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  const label = offset === 0 ? "This week" : `${from} – ${to}`
  return { kind: "week", label, days }
}

function monthView(childId: string, byDay: Map<string, SessionRecord[]>, offset: number): MonthView {
  const anchor = new Date(TODAY)
  anchor.setDate(1)
  anchor.setMonth(anchor.getMonth() + offset)
  const first = startOfDay(anchor.getTime())
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()

  const cells: (DayCell | null)[] = Array.from({ length: mondayIndex(first) }, () => null)
  for (let i = 0; i < daysInMonth; i++) cells.push(buildDay(childId, addDays(first, i), byDay))
  while (cells.length % 7) cells.push(null)

  const weeks: (DayCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return { kind: "month", label: anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), weeks }
}

function yearView(childId: string, byDay: Map<string, SessionRecord[]>, offset: number): YearView {
  const year = new Date(TODAY).getFullYear() + offset
  const months: YearMonth[] = Array.from({ length: 12 }, (_, m) => {
    const first = startOfDay(new Date(year, m, 1).getTime())
    const count = new Date(year, m + 1, 0).getDate()
    return {
      label: new Date(year, m, 1).toLocaleDateString("en-GB", { month: "long" }),
      short: new Date(year, m, 1).toLocaleDateString("en-GB", { month: "short" }),
      days: Array.from({ length: count }, (_, i) => buildDay(childId, addDays(first, i), byDay)),
    }
  })
  return { kind: "year", label: `${year}`, months }
}

/** Every day in a view, flattened — what `summarize` takes. */
export function viewDays(view: CalendarView): DayCell[] {
  if (view.kind === "week") return view.days
  if (view.kind === "month") return view.weeks.flat().filter((d): d is DayCell => d !== null)
  return view.months.flatMap((m) => m.days)
}

/** Consecutive studied days ending today or yesterday. Zero once a day is skipped. */
function currentStreak(childId: string, byDay: Map<string, SessionRecord[]>) {
  let streak = 0
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const day = buildDay(childId, addDays(TODAY, -i), byDay)
    if (day.minutes > 0) streak++
    // Today not yet studied doesn't break a streak that ran up to yesterday.
    else if (i > 0) break
  }
  return streak
}

/**
 * The calendar for one child at one period. `offset` counts periods back from the present.
 * Returns the grid, its totals, the child's current streak, and today's cell for the day sheet's
 * initial selection.
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

  const view = useMemo<CalendarView>(() => {
    if (period === "week") return weekView(childId, byDay, offset)
    if (period === "month") return monthView(childId, byDay, offset)
    return yearView(childId, byDay, offset)
  }, [childId, byDay, period, offset])

  const summary = useMemo(() => summarize(viewDays(view)), [view])
  const streak = useMemo(() => currentStreak(childId, byDay), [childId, byDay])
  const today = useMemo(() => buildDay(childId, TODAY, byDay), [childId, byDay])

  /** Sessions the child really finished on a day — the day sheet's detail rows. Empty on a demo day. */
  const sessionsOn = useMemo(() => (key: string) => byDay.get(key) ?? [], [byDay])

  return { view, summary, streak, today, sessionsOn }
}
