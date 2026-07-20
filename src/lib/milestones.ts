import type { SFSymbol } from "expo-symbols"

import { colors } from "@/design/tokens"

/**
 * Milestone definitions (design/gokid-screens.md §2 → "Child Achievement Profile", §9 → Milestones).
 *
 * Lifted out of `(tabs)/progress/achievements.tsx` so the per-child profile in the parent area and
 * the child's own Milestones tab compute from one definition. Two copies of a threshold list is two
 * places for them to drift, and a parent reading "Five sets finished" on one screen while the child
 * sees a different bar on another is a bug that is very hard to notice and very easy to introduce.
 *
 * Every milestone is a threshold on something the child demonstrably did — counts of learning (cards
 * recalled, sets finished, subjects touched, curriculum objectives met). No time-based or
 * consecutive-day criteria: those would smuggle a streak back in under another name, and this app
 * deliberately rejected streaks. Locked milestones state their own criterion rather than teasing a
 * mystery, so nothing here can fire early or be gamed by opening the app.
 */

export type Milestone = {
  key: string
  symbol: SFSymbol
  tint: string
  wash: string
  title: string
  /** States the criterion in the child's own terms — never a mystery to be unlocked. */
  sub: string
  have: number
  need: number
}

/** The four real counts every milestone is measured against. */
export type MilestoneCounts = {
  /** Cards in box 2+: recalled correctly at least twice across widening intervals. */
  retained: number
  setsFinished: number
  subjects: number
  objectivesMet: number
}

export function milestonesFor({ retained, setsFinished, subjects, objectivesMet }: MilestoneCounts): Milestone[] {
  return [
    {
      key: "first",
      symbol: "sparkles",
      tint: colors.success,
      wash: "bg-gamify-green-wash",
      title: "First card learned",
      sub: "Recall one card correctly twice",
      have: retained,
      need: 1,
    },
    {
      key: "ten",
      symbol: "brain.head.profile",
      tint: colors.gamify.blue,
      wash: "bg-gamify-blue-wash",
      title: "Ten cards learned",
      sub: "Recall ten cards across widening gaps",
      have: retained,
      need: 10,
    },
    {
      key: "fifty",
      symbol: "books.vertical.fill",
      tint: colors.gamify.purple,
      wash: "bg-gamify-purple-wash",
      title: "Fifty cards learned",
      sub: "Recall fifty cards across widening gaps",
      have: retained,
      need: 50,
    },
    {
      key: "set",
      symbol: "checkmark.seal.fill",
      tint: colors.accent,
      wash: "bg-gamify-amber-wash",
      title: "Set finished",
      sub: "Finish a study set from start to end",
      have: setsFinished,
      need: 1,
    },
    {
      key: "fivesets",
      symbol: "square.stack.3d.up.fill",
      tint: colors.gamify.purple,
      wash: "bg-gamify-purple-wash",
      title: "Five sets finished",
      sub: "Finish five study sets",
      have: setsFinished,
      need: 5,
    },
    {
      key: "subjects",
      symbol: "circle.grid.2x2.fill",
      tint: colors.gamify.blue,
      wash: "bg-gamify-blue-wash",
      title: "Three subjects explored",
      sub: "Study sets from three different subjects",
      have: subjects,
      need: 3,
    },
    {
      key: "objectives",
      symbol: "list.bullet.clipboard.fill",
      tint: colors.success,
      wash: "bg-gamify-green-wash",
      title: "Five objectives met",
      sub: "Cover five National Curriculum objectives",
      have: objectivesMet,
      need: 5,
    },
  ]
}

/**
 * Bar widths as literal classes so NativeWind's compiler emits them — it scans source text, and an
 * interpolated `w-[${n}%]` is never generated. Milestone progress rounds to the nearest 5%.
 */
export const BAR: Record<number, string> = {
  0: "w-[0%]", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-[100%]",
}

export const barPct = (n: number) => Math.min(100, Math.max(0, Math.round(n / 5) * 5))
