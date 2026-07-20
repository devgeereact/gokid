import { useUser } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { useCallback, useMemo } from "react"

import { useActiveChildId } from "./active-child"

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

/**
 * The seven per-child card washes (design/GoKid-design-system.png §07 → Child Profile Card, where
 * Amara and Rufus carry different tints). Stored as the token name, never the hex: the palette lives
 * in design/tokens.js and a stored hex would fossilise today's value into every child's profile.
 */
export const CARD_TINTS = ["lavender", "cream", "mint", "sky", "blush", "peach", "sage"] as const

export type CardTint = (typeof CARD_TINTS)[number]

const TINT_CLASS: Record<CardTint, string> = {
  lavender: "bg-card-wash-lavender",
  cream: "bg-card-wash-cream",
  mint: "bg-card-wash-mint",
  sky: "bg-card-wash-sky",
  blush: "bg-card-wash-blush",
  peach: "bg-card-wash-peach",
  sage: "bg-card-wash-sage",
}

export type Child = {
  id: string
  name: string
  /** One of YEAR_GROUPS. */
  yearGroup: string
  birthMonth: string
  birthYear: string
  avatar: Avatar
  /** Card colour, chosen in add-child. Absent on children created before it was offered — those
   *  keep the hashed colour they have always had (see `washFor`). */
  tint?: CardTint
}

/**
 * Fallback tint for a child who has never been given one. Keyed on the id rather than the list
 * index so a card keeps its colour when a sibling above it is deleted — the tint is part of how a
 * child recognises their own card, and it must not shuffle.
 */
function hashedTint(id: string): CardTint {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return CARD_TINTS[hash % CARD_TINTS.length]
}

/**
 * The NativeWind class for a child's card wash — their own choice if they have one, otherwise the
 * colour they have always had. Never derive this from list position.
 */
export function washFor(child: Pick<Child, "id" | "tint">): string {
  return TINT_CLASS[child.tint ?? hashedTint(child.id)]
}

/** Same lookup for a bare tint — used by the picker to render its own swatches. */
export function tintClass(tint: CardTint): string {
  return TINT_CLASS[tint]
}

/**
 * The colour to pre-select in the add-child form.
 *
 * Editing an existing child: whatever they already have — their stored choice, or the hashed colour
 * their card has always carried, so opening the form never silently repaints it.
 *
 * Adding a new one: the first tint no sibling is using. Two children in the same house with the same
 * card colour defeats the point of the colour, and the old hash could easily collide.
 */
export function suggestTint(existing: Pick<Child, "id" | "tint"> | undefined, siblings: Child[]): CardTint {
  if (existing) return existing.tint ?? hashedTint(existing.id)
  const taken = new Set(siblings.map((c) => c.tint ?? hashedTint(c.id)))
  return CARD_TINTS.find((t) => !taken.has(t)) ?? CARD_TINTS[siblings.length % CARD_TINTS.length]
}

type ChildrenMetadata = {
  children?: Child[]
}

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

  return { children, addChild, updateChild, removeChild }
}

/**
 * The child a study/progress screen should act on. Prefers the explicitly-picked child, then the
 * parent's first real child, and returns null only when there is genuinely no profile.
 *
 * This replaces the demo-profile fallback that was copy-pasted across a dozen screens.
 * That fallback silently routed a deep-linked child's spaced-repetition ratings into a demo profile's
 * bucket whenever the in-memory active id was unset (a cold start, a notification tap). Falling back
 * to a real child instead means writes land on real data; a null result is a routing condition the
 * write screens handle by sending the child back to who's-studying, not a value to write against.
 */
export function useStudyingChildId(): string | null {
  const activeId = useActiveChildId()
  const { children } = useChildren()
  return activeId ?? children[0]?.id ?? null
}
