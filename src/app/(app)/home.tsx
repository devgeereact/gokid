import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Animated, Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { RoundedHeading } from "@/components/rounded-heading"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { setActiveChild } from "@/lib/active-child"
import { type Child, DEFAULT_AVATAR, useChildren, washFor } from "@/lib/children"
import { useReduceMotion } from "@/lib/preferences"

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
 *    tint is now a property of the child — chosen by the parent in add-child (§2 "Avatar
 *    Customisation"), falling back to a hash of their id for children created before it was
 *    offered — so every card in a household differs and keeps its colour. See `washFor`.
 * 2. **The avatar is a centred disc, not full-bleed art.** The reference bleeds the animal off the
 *    card's left edge, cropped. Cropping a head-and-chest bust to a card-height column reads as a
 *    zoomed-in face, and it only ever applied to the two preset animals — emoji and photo children
 *    got a different layout entirely. One centred, uncropped disc treats every avatar kind alike.
 */

function yearLabel(yearGroup: string) {
  return yearGroup === "Rec" ? "Reception" : `Year ${yearGroup.slice(1)}`
}

/**
 * §2 "Switch Child Animation". Picking a child used to set the active id and navigate in the same
 * synchronous tick: the card gave no sign it had been chosen, and on a slow push the screen simply
 * changed. A short confirming press — the card dips, then settles — acknowledges the tap before the
 * navigation lands.
 *
 * Native driver, so the animation runs on the UI thread and cannot be stuttered by JS work during
 * navigation. Reanimated is in package.json but its babel plugin is not configured here, and
 * Animated does this job with no build-config risk.
 *
 * Reduce Motion is honoured: with it on there is no animation and no delay at all — the navigation
 * happens on touch, exactly as before. A motion-sensitive user gets a faster app, not a degraded one.
 */
const PRESS_IN_MS = 90
const PRESS_OUT_MS = 130

function ChildCard({ child }: { child: Child }) {
  // Children added before the avatar field existed have no `avatar` — fall back to the default.
  const avatar = child.avatar ?? DEFAULT_AVATAR
  const reduceMotion = useReduceMotion()
  // Lazy state, not a ref: the React Compiler (on for this project) rejects reading `ref.current`
  // during render, and the transform below needs the value at render time. The initialiser runs
  // once, so the Animated.Value is still stable across renders.
  const [scale] = useState(() => new Animated.Value(1))

  function open() {
    // Everything downstream (schedule, history, progress) is keyed on the child who was picked.
    setActiveChild(child.id)
    router.push({ pathname: "/study", params: { id: child.id } })
  }

  function onPress() {
    if (reduceMotion) {
      open()
      return
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: PRESS_IN_MS, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: PRESS_OUT_MS, useNativeDriver: true }),
    ]).start()
    // Fires with the settle rather than after it: waiting for the full sequence would make the tap
    // feel laggy, and the push animation covers the remainder.
    setTimeout(open, PRESS_IN_MS)
  }

  return (
    // The one place this file uses an inline style. AGENTS.md bans them in favour of NativeWind
    // className, but a className cannot carry an Animated.Value — this is the documented API for
    // an animated transform, not a styling shortcut. Everything visual stays in className below.
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${child.name}, ${yearLabel(child.yearGroup)}`}
        className={`mb-5 h-card flex-row items-center overflow-hidden rounded-card px-5 active:opacity-90 ${washFor(child)}`}
        onPress={onPress}
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

        {/* No edit/delete affordance here. This is the child's own picker: a pencil that led to a
            "Delete child" button let a child wipe a sibling's profile and progress behind a single
            Alert. Editing and removing a child now lives in the parent-gated children manager
            (/children), and add-child's edit mode is itself gated — see add-child.tsx. */}
      </Pressable>
    </Animated.View>
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

      {/* Parent settings — into the passcode-gated Parent Zone (app-ui screen 11). */}
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
