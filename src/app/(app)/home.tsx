import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { RoundedHeading } from "@/components/rounded-heading"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { setActiveChild } from "@/lib/active-child"
import { type Child, DEFAULT_AVATAR, useChildren } from "@/lib/children"

/**
 * "Who's studying?" — the signed-in landing (design/GoKid-whoisstudying-screen.png, screen 4).
 * Lists the parent's children (from useChildren — the demo store is Clerk metadata) and the
 * entry point to add another, then reaches "Parent settings".
 *
 * Two deliberate deviations from the reference, both requested:
 *
 * 1. **A wash per child, not per preset.** The reference draws exactly two children and gives each
 *    its own tint. Keying the tint off the *picture* (fox → cream, elephant → lavender) only works
 *    for those two: a third child, or two children on emoji, collided on one fallback wash. The
 *    tint is now keyed off the child's identity, so every card in a household differs.
 * 2. **The avatar is a centred disc, not full-bleed art.** The reference bleeds the animal off the
 *    card's left edge, cropped. Cropping a head-and-chest bust to a card-height column reads as a
 *    zoomed-in face, and it only ever applied to the two preset animals — emoji and photo children
 *    got a different layout entirely. One centred, uncropped disc treats every avatar kind alike.
 */

// Ordered so adjacent cards contrast: the two sampled reference tints lead, then the mixed ones
// alternate cool/warm rather than running through neighbouring hues.
const WASHES = [
  "bg-card-wash-lavender",
  "bg-card-wash-cream",
  "bg-card-wash-mint",
  "bg-card-wash-blush",
  "bg-card-wash-sky",
  "bg-card-wash-peach",
  "bg-card-wash-sage",
] as const

/**
 * Pick a child's wash. Keyed on the id, not the list index, so a card keeps its colour when a
 * sibling above it is deleted — the tint is part of how a child recognises their own card, and
 * it must not shuffle. Seven washes for seven year groups; an eighth child wraps and repeats.
 */
function washFor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return WASHES[hash % WASHES.length]
}

function yearLabel(yearGroup: string) {
  return yearGroup === "Rec" ? "Reception" : `Year ${yearGroup.slice(1)}`
}

function ChildCard({ child }: { child: Child }) {
  // Children added before the avatar field existed have no `avatar` — fall back to the default.
  const avatar = child.avatar ?? DEFAULT_AVATAR

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${child.name}, ${yearLabel(child.yearGroup)}`}
      className={`mb-5 h-card flex-row items-center overflow-hidden rounded-card px-5 active:opacity-90 ${washFor(
        child.id
      )}`}
      onPress={() => {
        // Everything downstream (schedule, history, progress) is keyed on the child who was picked.
        setActiveChild(child.id)
        router.push({ pathname: "/study", params: { id: child.id } })
      }}
    >
      {/* `contain` so the whole animal sits in the disc — at 120pt a cover-crop reads as a zoom.
          Transparent, so the art sits straight on the card wash the way the reference draws it: the
          preset cutouts and emoji both have their own silhouette, and a filled disc behind them
          reads as a hole punched in the tint. An uploaded photo is rectangular and still gets the
          circle, because the component clips it. */}
      <View className="w-[46%] items-center justify-center">
        <ChildAvatar avatar={avatar} className="h-30 w-30 bg-transparent" fit="contain" />
      </View>
      <View className="flex-1 items-center">
        <Text className="font-text text-h2 font-bold text-ink">{child.name}</Text>
        <Text className="mt-1 font-text text-field text-text-secondary">
          {yearLabel(child.yearGroup)}
        </Text>
      </View>

      {/* Edit / delete this child — opens the prefilled form. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${child.name}`}
        className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white/80 active:opacity-70"
        hitSlop={6}
        onPress={() => router.push({ pathname: "/add-child", params: { id: child.id } })}
      >
        <SymbolView name="pencil" size={16} tintColor={colors.ink} />
      </Pressable>
    </Pressable>
  )
}

export default function Home() {
  const { children } = useChildren()

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <StatusBar style="dark" />

      <View className="mt-14 items-center">
        <RoundedHeading
          color={colors.ink}
          fallbackClassName="text-center text-h1 font-bold text-ink"
          size={34}
          weight="bold"
        >
          Who’s studying?
        </RoundedHeading>
      </View>

      <ScrollView
        className="mt-10 flex-1"
        contentContainerClassName="pb-4"
        showsVerticalScrollIndicator={false}
      >
        {/* No children yet — the first-run state. The dashed tile below is still the action, so the
            empty state explains rather than duplicating the CTA. */}
        {children.length === 0 ? (
          <EmptyState
            symbol="person.badge.plus"
            title="No one here yet"
            body="Add your first child and GoKid will build sets for their year group."
          />
        ) : (
          children.map((child) => <ChildCard key={child.id} child={child} />)
        )}

        {/* Add a child — dashed tile with a mint plus-disc. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a child"
          className="h-card items-center justify-center rounded-card border-2 border-dashed border-card-dash active:opacity-70"
          onPress={() => router.push("/add-child")}
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-card-add">
            <SymbolView name="plus" size={32} tintColor={colors.primary} weight="medium" />
          </View>
          <Text className="mt-3 font-text text-field text-text-secondary">Add a child</Text>
        </Pressable>
      </ScrollView>

      {/* Parent settings — into the maths-gated Parent Zone (app-ui screen 11). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Parent settings"
        className="mb-8 mt-4 flex-row items-center justify-center gap-2 active:opacity-60"
        onPress={() => router.push("/parent")}
      >
        <SymbolView name="lock" size={20} tintColor={colors["text-secondary"]} />
        <Text className="font-text text-field text-text-secondary">Parent settings</Text>
      </Pressable>
    </SafeAreaView>
  )
}
