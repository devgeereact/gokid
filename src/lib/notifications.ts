import type { SFSymbol } from "expo-symbols"
import { useMemo } from "react"

import type { ApiSet } from "./api"
import { milestonesFor } from "./milestones"
import type { ReviewCard, SessionRecord } from "./reviews"

/**
 * The in-app notification feed (design/gokid-screens.md §13 → "Notification Centre",
 * "Weekly Summary", "Achievement Notification").
 *
 * **This is not push.** `expo-notifications` is not installed, so nothing here is delivered to the
 * lock screen, scheduled, or sent while the app is closed. Everything below is derived from the
 * child's own record at the moment the screen is opened — which is exactly why it can be trusted:
 * an entry exists only if the thing it describes actually happened.
 *
 * That distinction is the whole point. The previous feed mixed one real item (cards coming back)
 * with a hardcoded one — "Capital Cities of Europe has been added… Yesterday" — which was never
 * true for anyone, on any day. A notification is a claim that something occurred; a fabricated one
 * is worse than a wrong figure on a chart, because the entire purpose of the surface is to be
 * believed.
 *
 * When `expo-notifications` lands, these same derivations become the *content* of scheduled local
 * notifications. The feed stays; delivery is added on top.
 */

export type Note = {
  id: string
  symbol: SFSymbol
  /** Token name resolved by the screen — this module stays free of design imports. */
  tone: "primary" | "success" | "accent"
  title: string
  body: string
  /** Epoch ms of the event this describes. Drives ordering and the unread mark. */
  at: number
}

const DAY_MS = 86_400_000

/** Clock read inside the module — the React Compiler treats `Date.now()` during render as impure. */
function nowMs() {
  return Date.now()
}

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Builds the feed. Ordered newest first; returns an empty array when nothing has happened, so the
 * screen shows an honest empty state rather than padding itself out.
 */
export function notificationsFor({
  childName,
  cards,
  sessions,
  sets,
  yearGroup,
  objectivesMet,
}: {
  childName: string
  cards: ReviewCard[]
  sessions: SessionRecord[]
  sets: ApiSet[]
  yearGroup: string
  objectivesMet: number
}): Note[] {
  const now = nowMs()
  const notes: Note[] = []
  const setById = new Map(sets.map((s) => [s.id, s]))

  // --- Cards due now. The one genuinely time-sensitive thing the app knows.
  const due = cards.filter((c) => c.dueAt <= now)
  if (due.length > 0) {
    // Name the set with the most due, so the prompt points somewhere specific.
    const bySet = new Map<string, number>()
    for (const card of due) bySet.set(card.setId, (bySet.get(card.setId) ?? 0) + 1)
    const [topSetId, topCount] = [...bySet.entries()].sort((a, b) => b[1] - a[1])[0]
    const set = setById.get(topSetId)
    notes.push({
      id: "due",
      symbol: "bell.badge.fill",
      tone: "primary",
      title: "Ready for review",
      body: set
        ? `${childName} has ${topCount} ${topCount === 1 ? "card" : "cards"} coming back in ${set.title}.`
        : `${childName} has ${due.length} ${due.length === 1 ? "card" : "cards"} ready for review.`,
      // Dated to the oldest due card: that is when this actually became true.
      at: Math.min(...due.map((c) => c.dueAt)),
    })
  }

  // --- Milestones earned (§13 "Achievement Notification"). Same definitions as the Milestones tab,
  // so the two can never disagree about what has been earned.
  const retained = cards.filter((c) => c.box >= 2).length
  const setsFinished = new Set(sessions.map((s) => s.setId)).size
  const subjects = new Set(sessions.map((s) => s.subject)).size
  for (const milestone of milestonesFor({ retained, setsFinished, subjects, objectivesMet })) {
    if (milestone.have < milestone.need) continue
    // Dated to the most recent session, the closest thing the record has to "when this was earned".
    // The store keeps no per-milestone timestamp — see the same limitation in lib/mastery-timeline.
    const at = sessions[0]?.at ?? now
    notes.push({
      id: `milestone-${milestone.key}`,
      symbol: milestone.symbol,
      tone: "success",
      title: milestone.title,
      body: `${childName} reached this — ${milestone.sub.toLowerCase()}.`,
      at,
    })
  }

  // --- Weekly summary (§13 "Weekly Summary"), only once there is a week worth summarising.
  const weekAgo = startOfDay(now) - 6 * DAY_MS
  const thisWeek = sessions.filter((s) => s.at >= weekAgo)
  if (thisWeek.length > 0) {
    const minutes = thisWeek.reduce((sum, s) => sum + s.minutes, 0)
    const setCount = new Set(thisWeek.map((s) => s.setId)).size
    notes.push({
      id: "weekly",
      symbol: "chart.bar.fill",
      tone: "accent",
      title: "This week so far",
      body: `${thisWeek.length} ${thisWeek.length === 1 ? "session" : "sessions"} across ${setCount} ${
        setCount === 1 ? "set" : "sets"
      }, ${minutes} ${minutes === 1 ? "minute" : "minutes"} in total. Year group: ${yearGroup}.`,
      at: thisWeek[0].at,
    })
  }

  return notes.sort((a, b) => b.at - a.at)
}

/**
 * Positional rather than an options object: an object literal is a new reference every render, so
 * `useMemo` over it would recompute every time and the dependency list would have to be silenced.
 */
export function useNotifications(
  childName: string,
  cards: ReviewCard[],
  sessions: SessionRecord[],
  sets: ApiSet[],
  yearGroup: string,
  objectivesMet: number
): Note[] {
  return useMemo(
    () => notificationsFor({ childName, cards, sessions, sets, yearGroup, objectivesMet }),
    [childName, cards, sessions, sets, yearGroup, objectivesMet]
  )
}
