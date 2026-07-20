import type { SFSymbol } from "expo-symbols"
import { useMemo } from "react"

import { type ApiSet, useSets } from "./api"
import { type SessionRecord, useProgress } from "./reviews"
import { getSubject, type Subject, subjectSlug } from "./subjects"

/**
 * Parent-area analytics (design/gokid-screens.md §10 → Analytics: Study Time, Curriculum Coverage,
 * Weak Areas, Strong Areas, AI Insights, Weekly Summary, Monthly Summary, Comparison Over Time).
 *
 * Every figure is the child's own. This module used to synthesise the whole report from an FNV hash
 * of the child's id — seven children gave seven different-looking dashboards, none of which described
 * anything that happened. A parent could not tell whether their child had learned a single thing.
 *
 * Now: study time and accuracy come from the sessions they finished, coverage and mastery from their
 * spaced-repetition record joined to the real set catalogue, and the "insights" are sentences derived
 * from those same numbers rather than invented encouragement. Nothing is reported without data behind
 * it — an empty record produces an empty report, which is the honest answer.
 */

export type Period = "week" | "month"

/** One bar in the Study Time chart, and one point in the Comparison line. */
export type Bucket = { label: string; minutes: number; sets: number }

/** A topic called out under Strong Areas / Weak Areas. */
export type AreaRow = { subject: string; slug: string; strand: string; pct: number; ink: string }

/** One Insights card. `tone` picks the wash; copy is generated from the child's real figures. */
export type Insight = { tone: "win" | "focus" | "tip"; title: string; body: string; icon: SFSymbol }

export type Analytics = {
  /** Weekly Summary / Monthly Summary — the three tiles at the top. */
  summary: { minutes: number; sets: number; accuracy: number; minutesTrend: number; setsTrend: number; accuracyTrend: number }
  /** True once there is anything at all to report. */
  hasData: boolean
  /** True when the previous period has data to compare against — trends are meaningless without it. */
  hasBaseline: boolean
  /** Study Time — minutes per bucket over the period. */
  buckets: Bucket[]
  /** Comparison Over Time — this period against the one before it. */
  comparison: { current: number[]; previous: number[]; labels: string[] }
  /** Curriculum Coverage — sets started, of those in the child's year. */
  coverage: { pct: number; covered: number; total: number; bySubject: { name: string; slug: string; pct: number; ink: string }[] }
  strong: AreaRow[]
  weak: AreaRow[]
  insights: Insight[]
}

const DAY_MS = 86_400_000

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Clock read inside the module, never in a component body (React Compiler rule). */
function todayMs() {
  return startOfDay(Date.now())
}

function totalsOf(sessions: SessionRecord[]) {
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

/** Percent change; 0 when there is no baseline (callers gate on `hasBaseline` before showing it). */
function pctDelta(now: number, before: number) {
  if (before <= 0) return 0
  return Math.round(((now - before) / before) * 100)
}

/**
 * "1 set" / "3 sets". A count and its noun, agreeing. Trivial, and worth having in one place: the
 * strand rows on both subject screens shipped reading "1 sets · not started", which is the kind of
 * thing that makes an app for children reading at Year-2 level look careless.
 */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function duration(mins: number) {
  if (mins <= 0) return "0m"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m}m`
  if (h >= 10 || !m) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * The parent report for one child over one period, computed from their real record.
 * `week` = the last 7 days by day; `month` = the last 4 weeks by week.
 */
export function useAnalytics(child: { id: string; name: string; yearGroup: string } | undefined, period: Period): Analytics {
  const childId = child?.id ?? ""
  const { sessions, cards } = useProgress(childId)
  const { sets } = useSets()

  return useMemo(() => {
    const today = todayMs()
    const bucketCount = period === "week" ? 7 : 4
    const bucketSpan = period === "week" ? 1 : 7
    const periodDays = bucketCount * bucketSpan

    const from = today - (periodDays - 1) * DAY_MS
    const prevFrom = from - periodDays * DAY_MS

    const inWindow = (s: SessionRecord, start: number, end: number) => s.at >= start && s.at < end + DAY_MS
    const current = sessions.filter((s) => inWindow(s, from, today))
    const previous = sessions.filter((s) => inWindow(s, prevFrom, from - DAY_MS))

    const now = totalsOf(current)
    const before = totalsOf(previous)

    // Buckets: one per day (week) or per 7 days (month), oldest first.
    const bucketFor = (list: SessionRecord[], windowStart: number) =>
      Array.from({ length: bucketCount }, (_, i) => {
        const start = windowStart + i * bucketSpan * DAY_MS
        const end = start + bucketSpan * DAY_MS
        const inBucket = list.filter((s) => s.at >= start && s.at < end)
        const label =
          period === "week"
            ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(start).getDay()]
            : `W${i + 1}`
        return {
          label,
          minutes: inBucket.reduce((sum, s) => sum + s.minutes, 0),
          sets: inBucket.length,
        }
      })

    const buckets = bucketFor(current, from)
    const prevBuckets = bucketFor(previous, prevFrom)

    // --- Coverage: sets in this child's year they have started, of all sets in that year.
    const setById = new Map(sets.map((s) => [s.id, s]))
    const yearSets = child ? sets.filter((s) => s.yearCode === child.yearGroup) : []
    const startedIds = new Set(cards.map((c) => c.setId))
    const covered = yearSets.filter((s) => startedIds.has(s.id)).length

    const bySubjectCoverage = [...new Set(yearSets.map((s) => s.subject))].map((name) => {
      const mine = yearSets.filter((s) => s.subject === name)
      const done = mine.filter((s) => startedIds.has(s.id)).length
      const slug = subjectSlug(name) ?? ""
      return {
        name,
        slug,
        pct: mine.length ? Math.round((done / mine.length) * 100) : 0,
        ink: getSubject(slug)?.ink ?? "#6E6A65",
      }
    })

    // --- Strong / weak: real mastery per TOPIC (the set's own curriculum strand).
    const byTopic = new Map<string, { subject: string; seen: number; learned: number }>()
    for (const card of cards) {
      const set: ApiSet | undefined = setById.get(card.setId)
      if (!set) continue
      const key = `${set.subject}::${set.topic}`
      const row = byTopic.get(key) ?? { subject: set.subject, seen: 0, learned: 0 }
      row.seen += 1
      if (card.box >= 2) row.learned += 1
      byTopic.set(key, row)
    }
    const areaRows: AreaRow[] = [...byTopic.entries()].map(([key, row]) => {
      const slug = subjectSlug(row.subject) ?? ""
      return {
        subject: row.subject,
        slug,
        strand: key.split("::")[1],
        pct: row.seen ? Math.round((row.learned / row.seen) * 100) : 0,
        ink: getSubject(slug)?.ink ?? "#6E6A65",
      }
    })
    const ranked = [...areaRows].sort((a, b) => b.pct - a.pct)
    const strong = ranked.filter((r) => r.pct >= 60).slice(0, 3)
    const weak = [...ranked].reverse().filter((r) => r.pct < 60).slice(0, 3)

    // --- Insights: sentences about the numbers above. No claim without data behind it.
    const name = child?.name ?? "Your child"
    const insights: Insight[] = []
    if (strong[0]) {
      insights.push({
        tone: "win",
        title: `${strong[0].strand} is going well`,
        body: `${name} has ${strong[0].pct}% of their ${strong[0].subject.toLowerCase()} cards in ${strong[0].strand} sticking.`,
        icon: "checkmark.seal.fill",
      })
    }
    if (weak[0]) {
      insights.push({
        tone: "focus",
        title: `${weak[0].strand} needs another look`,
        body: `Only ${weak[0].pct}% of these cards are sticking so far — a short session or two should shift it.`,
        icon: "target",
      })
    }
    if (now.minutes > 0) {
      const perSession = Math.round(now.minutes / Math.max(1, now.sets))
      insights.push({
        tone: "tip",
        title: "Little and often",
        body: `${name} studied ${duration(now.minutes)} across ${now.sets} ${
          now.sets === 1 ? "session" : "sessions"
        } — about ${perSession} minutes each. Short, spaced sessions beat one long one.`,
        icon: "lightbulb.fill",
      })
    }

    return {
      summary: {
        minutes: now.minutes,
        sets: now.sets,
        accuracy: now.accuracy,
        minutesTrend: pctDelta(now.minutes, before.minutes),
        setsTrend: pctDelta(now.sets, before.sets),
        accuracyTrend: before.scored && now.scored ? now.accuracy - before.accuracy : 0,
      },
      hasData: sessions.length > 0 || cards.length > 0,
      hasBaseline: previous.length > 0,
      buckets,
      comparison: {
        current: buckets.map((b) => b.minutes),
        previous: prevBuckets.map((b) => b.minutes),
        labels: buckets.map((b) => b.label),
      },
      coverage: {
        pct: yearSets.length ? Math.round((covered / yearSets.length) * 100) : 0,
        covered,
        total: yearSets.length,
        bySubject: bySubjectCoverage,
      },
      strong,
      weak,
      insights,
    }
  }, [sessions, cards, sets, child, period])
}

/** One curriculum strand of a subject, with the child's real standing in it. */
export type StrandProgress = {
  name: string
  icon: SFSymbol
  /** Sets in this strand, and how many the child has finished. */
  sets: number
  setsDone: number
  /** Mastery across the cards they have actually seen here; null when they have seen none. */
  pct: number | null
}

/**
 * A subject hub / subject progress screen for one child (design/gokid-screens.md §4, §9 → Subject).
 *
 * `lib/subjects.ts` used to carry `done`/`total`/`pct` per strand as authored literals, so every
 * child saw the same "8 of 10 sets · 80%" whether they had studied that subject or not. Those fields
 * are gone. Strand names and icons stay there (they are curriculum reference data, the same for
 * everyone); the numbers now come from the child's own sessions and spaced-repetition boxes, matched
 * to strands through each set's `topic`. A strand they have not touched reports null, not zero —
 * "not started" and "started and going badly" are different things and must not look alike.
 */
export function useSubjectProgress(subject: Subject | undefined, childId: string) {
  const { sessions, cards } = useProgress(childId)
  const { sets } = useSets()

  return useMemo(() => {
    const mine = subject ? sets.filter((s) => s.subject === subject.name) : []
    const doneSetIds = new Set(sessions.map((s) => s.setId))
    const setById = new Map(mine.map((s) => [s.id, s]))

    // Card mastery per topic, limited to this subject's sets.
    const byTopic = new Map<string, { seen: number; learned: number }>()
    for (const card of cards) {
      const set = setById.get(card.setId)
      if (!set) continue
      const row = byTopic.get(set.topic) ?? { seen: 0, learned: 0 }
      row.seen += 1
      if (card.box >= 2) row.learned += 1
      byTopic.set(set.topic, row)
    }

    const strands: StrandProgress[] = (subject?.strands ?? []).map((strand) => {
      const inStrand = mine.filter((s) => s.topic === strand.name)
      const seen = byTopic.get(strand.name)
      return {
        name: strand.name,
        icon: strand.icon,
        sets: inStrand.length,
        setsDone: inStrand.filter((s) => doneSetIds.has(s.id)).length,
        pct: seen && seen.seen > 0 ? Math.round((seen.learned / seen.seen) * 100) : null,
      }
    })

    const setsDone = mine.filter((s) => doneSetIds.has(s.id)).length
    const seenCards = cards.filter((c) => setById.has(c.setId))
    return {
      strands,
      setsDone,
      setsTotal: mine.length,
      /** Overall mastery for the subject; null until they have seen a card in it. */
      pct: seenCards.length
        ? Math.round((seenCards.filter((c) => c.box >= 2).length / seenCards.length) * 100)
        : null,
      hasData: seenCards.length > 0 || setsDone > 0,
    }
  }, [subject, sessions, cards, sets])
}
