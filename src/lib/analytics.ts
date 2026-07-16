import type { SFSymbol } from "expo-symbols"

import { SUBJECTS, type Subject } from "./subjects"

/**
 * Parent-area analytics (design/gokid-screens.md §10 → Analytics: Study Time, Curriculum Coverage,
 * Weak Areas, Strong Areas, AI Insights, Weekly Summary, Monthly Summary, Comparison Over Time).
 *
 * Demo data, like ./subjects and ./study: these figures stand in for the Neon/Drizzle reporting API
 * (AGENTS.md — the client never queries Postgres). The screen imports `analyticsFor` only, never the
 * internals, so this function is the single seam to swap when the API lands.
 *
 * Every number is *derived*, not hand-written per child: strand mastery comes from ./subjects (so a
 * strand the Subject Hub calls weak is weak here too), and per-child variation comes from a hash of
 * the child's id. That means seven demo children give seven different-looking dashboards without
 * seven tables of invented numbers, and the same child always reads the same on every launch —
 * `Math.random` here would reshuffle the charts on every re-render.
 */

export type Period = "week" | "month"

/** One bar in the Study Time chart, and one point in the Comparison line. */
export type Bucket = { label: string; minutes: number; sets: number }

/** A strand called out under Strong Areas / Weak Areas. */
export type AreaRow = { subject: string; slug: string; strand: string; pct: number; ink: string }

/** One AI Insights card. `tone` picks the wash; the copy is templated with the child's name. */
export type Insight = { tone: "win" | "focus" | "tip"; title: string; body: string; icon: SFSymbol }

export type Analytics = {
  /** Weekly Summary / Monthly Summary — the three tiles at the top. */
  summary: { minutes: number; sets: number; accuracy: number; minutesTrend: number; setsTrend: number; accuracyTrend: number }
  /** Study Time — minutes per bucket over the period. */
  buckets: Bucket[]
  /** Comparison Over Time — this period against the one before it. */
  comparison: { current: number[]; previous: number[]; labels: string[] }
  /** Curriculum Coverage — strands touched, of those in the child's year. */
  coverage: { pct: number; covered: number; total: number; bySubject: { name: string; slug: string; pct: number; ink: string }[] }
  strong: AreaRow[]
  weak: AreaRow[]
  insights: Insight[]
}

/** Stable per-child jitter. FNV-1a over the child id — same id, same dashboard, every launch. */
function seed(id: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic pseudo-random in [0,1) — `n`th draw off a seed. */
function draw(s: number, n: number) {
  const x = Math.imul(s ^ Math.imul(n + 1, 0x9e3779b9), 0x85ebca6b) >>> 0
  return x / 0x100000000
}

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_LABELS = ["W1", "W2", "W3", "W4"]

/** Flatten every subject's strands into rows, ranked by mastery. */
function strandRows(s: number): AreaRow[] {
  const rows = SUBJECTS.flatMap((subject: Subject, si) =>
    subject.strands.map((strand, i) => ({
      subject: subject.name,
      slug: subject.slug,
      strand: strand.name,
      // The Subject Hub's own mastery, nudged ±6 per child so two children never rank identically.
      pct: Math.max(4, Math.min(99, Math.round(strand.pct + (draw(s, si * 13 + i) - 0.5) * 12))),
      ink: subject.ink,
    }))
  )
  return rows.sort((a, b) => b.pct - a.pct)
}

/**
 * One strand per subject, so Strong/Weak never lists the same subject twice — and never the same
 * subject as the other list. A subject has many strands, so its best can rank top-3 while its worst
 * ranks bottom-3; without `exclude`, Religious Education reads as both a strength and a weakness on
 * the same screen, which is a contradiction a parent has no way to resolve.
 */
function pickDistinct(rows: AreaRow[], count: number, exclude: Set<string> = new Set()) {
  const seen = new Set(exclude)
  const out: AreaRow[] = []
  for (const row of rows) {
    if (seen.has(row.slug)) continue
    seen.add(row.slug)
    out.push(row)
    if (out.length === count) break
  }
  return out
}

export function analyticsFor(child: { id: string; name: string } | undefined, period: Period): Analytics {
  const s = seed(child?.id ?? "demo")
  const labels = period === "week" ? WEEK_LABELS : MONTH_LABELS

  // A month's bucket is a whole week, so it carries roughly a week's worth of minutes.
  const base = period === "week" ? 34 : 150
  const buckets: Bucket[] = labels.map((label, i) => {
    const minutes = Math.round(base * (0.45 + draw(s, i) * 1.15))
    return { label, minutes, sets: Math.max(1, Math.round(minutes / 11)) }
  })

  const minutes = buckets.reduce((t, b) => t + b.minutes, 0)
  const sets = buckets.reduce((t, b) => t + b.sets, 0)
  const accuracy = 62 + Math.round(draw(s, 41) * 30)

  // The period before this one — same shape, drawn off an offset seed so it sits near but not on top
  // of the current series.
  const previous = labels.map((_, i) => Math.round(base * (0.4 + draw(s, i + 97) * 1.05)))

  const rows = strandRows(s)
  // Strong is picked first and locks its subjects out of Weak — a subject the parent has just been
  // told is a strength must not reappear two cards down as a weakness.
  const strong = pickDistinct(rows, 3)
  const weak = pickDistinct([...rows].reverse(), 3, new Set(strong.map((r) => r.slug)))

  const bySubject = SUBJECTS.slice(0, 5).map((subject, i) => ({
    name: subject.name,
    slug: subject.slug,
    pct: Math.round(
      subject.strands.reduce((t, st) => t + st.pct, 0) / subject.strands.length + (draw(s, i + 61) - 0.5) * 10
    ),
    ink: subject.ink,
  }))

  const total = SUBJECTS.reduce((t, subject) => t + subject.strands.length, 0)
  const covered = rows.filter((r) => r.pct >= 20).length
  const name = child?.name ?? "your child"

  const insights: Insight[] = [
    {
      tone: "win",
      title: `${strong[0].subject} is ${name}'s strongest subject`,
      body: `${strong[0].strand} is at ${strong[0].pct}% mastery. Sets in this strand are landing first time — a good place to stretch into harder cards.`,
      icon: "sparkles",
    },
    {
      tone: "focus",
      title: `${weak[0].strand} needs another pass`,
      body: `${weak[0].subject} sits at ${weak[0].pct}%. Two short sessions this week would move it more than one long one.`,
      icon: "target",
    },
    {
      tone: "tip",
      title: buckets[0].minutes > buckets[buckets.length - 1].minutes ? "Sessions taper off later in the period" : "Momentum is building",
      body:
        buckets[0].minutes > buckets[buckets.length - 1].minutes
          ? `${name} starts strong and drifts. A fixed 10-minute slot keeps the spacing engine's reviews on schedule.`
          : `${name} is studying more as the period goes on. Reviews are landing when they are due — keep the current rhythm.`,
      icon: "lightbulb",
    },
  ]

  return {
    summary: {
      minutes,
      sets,
      accuracy,
      // Trends are this period against the drawn previous one, so the arrow always agrees with the
      // Comparison chart below it rather than being an independent invention.
      minutesTrend: pctDelta(minutes, previous.reduce((t, v) => t + v, 0)),
      setsTrend: pctDelta(sets, Math.round(previous.reduce((t, v) => t + v, 0) / 11)),
      accuracyTrend: Math.round((draw(s, 73) - 0.35) * 24),
    },
    buckets,
    comparison: { current: buckets.map((b) => b.minutes), previous, labels },
    coverage: { pct: Math.round((covered / total) * 100), covered, total, bySubject },
    strong,
    weak,
    insights,
  }
}

function pctDelta(now: number, before: number) {
  if (!before) return 0
  return Math.round(((now - before) / before) * 100)
}

/** Minutes → "2h 45m" / "45m", as the parent area writes durations. */
export function duration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}
