import { useUser } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { useCallback, useMemo } from "react"

// Children are stored on the parent's Clerk user under `unsafeMetadata`. It is the only
// user-writable store the client is allowed to touch (AGENTS.md: the app never talks to
// Postgres directly). When Neon/Drizzle land, this hook is the single seam to swap over to
// an API call — screens depend on the hook, not on where the data lives.

/** How a child's picture is stored. Presets and emoji are portable; an uploaded image is a
 *  local file URI for now — when ImageKit lands (AGENTS.md), `image` uploads there and this
 *  holds the remote URL instead. */
export type Avatar =
  | { kind: "preset"; value: "fox" | "elephant" | "lion" }
  | { kind: "emoji"; value: string }
  | { kind: "image"; uri: string }

export const DEFAULT_AVATAR: Avatar = { kind: "preset", value: "fox" }

/** "R3" → "Year 3", "Rec" → "Reception". Shared by who's-studying and the study dashboard. */
export function yearLabel(yearGroup: string) {
  return yearGroup === "Rec" ? "Reception" : `Year ${yearGroup.slice(1)}`
}

export type Child = {
  id: string
  name: string
  /** One of YEAR_GROUPS. */
  yearGroup: string
  birthMonth: string
  birthYear: string
  avatar: Avatar
}

type ChildrenMetadata = {
  children?: Child[]
}

/**
 * Demo children — one per year group, Reception → Year 6, so every age in the curriculum
 * (src/lib/study.ts) has a profile that resolves to real sets via `getStudySetsForYear`. Ages are
 * consistent with a mid-2026 school year. Used to seed the who's-studying / dashboard flow before a
 * real parent has added anyone; the wiring layer decides when to fall back to these.
 */
export const DEMO_CHILDREN: Child[] = [
  { id: "demo-leo", name: "Leo", yearGroup: "Rec", birthMonth: "September", birthYear: "2021", avatar: { kind: "preset", value: "lion" } },
  { id: "demo-mia", name: "Mia", yearGroup: "Y1", birthMonth: "October", birthYear: "2020", avatar: { kind: "emoji", value: "🐰" } },
  { id: "demo-noah", name: "Noah", yearGroup: "Y2", birthMonth: "March", birthYear: "2019", avatar: { kind: "preset", value: "elephant" } },
  { id: "demo-amara", name: "Amara", yearGroup: "Y3", birthMonth: "June", birthYear: "2018", avatar: { kind: "preset", value: "fox" } },
  { id: "demo-zara", name: "Zara", yearGroup: "Y4", birthMonth: "January", birthYear: "2017", avatar: { kind: "emoji", value: "🐨" } },
  { id: "demo-rufus", name: "Rufus", yearGroup: "Y5", birthMonth: "November", birthYear: "2016", avatar: { kind: "emoji", value: "🐻" } },
  { id: "demo-elsie", name: "Elsie", yearGroup: "Y6", birthMonth: "April", birthYear: "2015", avatar: { kind: "emoji", value: "🦉" } },
]

export function useChildren() {
  const { user } = useUser()
  const children = useMemo(
    () => (user?.unsafeMetadata as ChildrenMetadata | undefined)?.children ?? [],
    [user?.unsafeMetadata]
  )

  const addChild = useCallback(
    async (child: Omit<Child, "id">) => {
      if (!user) throw new Error("addChild called before the user loaded")
      const entry: Child = { ...child, id: `${Date.now()}` }
      try {
        await user.update({
          unsafeMetadata: { ...user.unsafeMetadata, children: [...children, entry] },
        })
      } catch (error) {
        Sentry.captureException(error, { tags: { flow: "add-child" } })
        throw error
      }
      return entry
    },
    [user, children]
  )

  const updateChild = useCallback(
    async (id: string, patch: Partial<Omit<Child, "id">>) => {
      if (!user) throw new Error("updateChild called before the user loaded")
      const next = children.map((c) => (c.id === id ? { ...c, ...patch } : c))
      try {
        await user.update({ unsafeMetadata: { ...user.unsafeMetadata, children: next } })
      } catch (error) {
        Sentry.captureException(error, { tags: { flow: "edit-child" } })
        throw error
      }
    },
    [user, children]
  )

  const removeChild = useCallback(
    async (id: string) => {
      if (!user) throw new Error("removeChild called before the user loaded")
      const next = children.filter((c) => c.id !== id)
      try {
        await user.update({ unsafeMetadata: { ...user.unsafeMetadata, children: next } })
      } catch (error) {
        Sentry.captureException(error, { tags: { flow: "delete-child" } })
        throw error
      }
    },
    [user, children]
  )

  /**
   * Replace the child list with DEMO_CHILDREN — one profile per year group, so every set in
   * src/lib/study.ts is reachable without typing seven forms. Reached from the children manager;
   * destructive, so callers confirm first.
   */
  const seedDemoChildren = useCallback(async () => {
    if (!user) throw new Error("seedDemoChildren called before the user loaded")
    try {
      await user.update({ unsafeMetadata: { ...user.unsafeMetadata, children: DEMO_CHILDREN } })
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "seed-demo-children" } })
      throw error
    }
  }, [user])

  return { children, addChild, updateChild, removeChild, seedDemoChildren }
}
