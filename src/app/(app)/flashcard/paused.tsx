import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"

import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useStudyingChildId } from "@/lib/children"
import { useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Session Paused (design/gokid-screens.md §6). No mockup was ever drawn for it — the surface,
 * stat tiles and buttons are inferred from design/GoKid-sectionsummary-screen.png (screen 21) and
 * the header/CTA geometry from design/GoKid-flashcard-screen.png (screen 7). See
 * design/.loop/sessionpaused-log.md.
 *
 * Pushed over the still-mounted flashcard runner, so "Resume" is a plain back() and the deck picks
 * up on the same card. "End session" banks the cards already reviewed before leaving, so a child
 * who stops halfway keeps the progress they earned.
 */

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

/** Deep-link params are unvalidated strings — `Number("")` is 0 but `Number("x")` is NaN. */
function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(Math.trunc(n), min), max)
}

/** "18m 30s" — matches the Time-spent tile on the session-summary reference. */
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}m ${pad(seconds % 60)}s`
}

type Tile = {
  label: string
  value: string
  symbol: string
  tint: string
  wash: string
}

export default function SessionPaused() {
  const params = useLocalSearchParams<{
    id: string
    index: string
    gotit: string
    tricky: string
    seconds: string
  }>()
  const set = getStudySet(params.id)
  // As in the runner: bank the session against the real active child, never a demo profile.
  const childId = useStudyingChildId()
  const { recordSession } = useProgress(childId ?? "")
  const [confirming, setConfirming] = useState(false)

  if (!set) return <Redirect href="/home" />
  if (!childId) return <Redirect href="/home" />

  const total = set.cards.length
  // Params arrive as strings off a deep link, so every one is clamped rather than trusted — an
  // out-of-range index would otherwise render "7 / 5" and a negative cards-left count.
  const index = clamp(Number(params.index), 0, total - 1)
  const gotit = clamp(Number(params.gotit), 0, total)
  const tricky = clamp(Number(params.tricky), 0, total)
  const seconds = clamp(Number(params.seconds), 0, Number.MAX_SAFE_INTEGER)
  const reviewed = Math.min(gotit + tricky, total)
  const left = total - reviewed
  const accuracy = reviewed === 0 ? 0 : Math.round((gotit / reviewed) * 100)

  const tiles: Tile[] = [
    { label: "Time spent", value: clock(seconds), symbol: "clock.fill", tint: colors.success, wash: "bg-gamify-green-wash" },
    { label: "Cards studied", value: `${reviewed}`, symbol: "rectangle.on.rectangle", tint: colors.gamify.purple, wash: "bg-gamify-purple-wash" },
    { label: "Got it", value: `${accuracy}%`, symbol: "target", tint: colors.gamify.blue, wash: "bg-gamify-blue-wash" },
    { label: "Tricky", value: `${tricky}`, symbol: "flame.fill", tint: colors.gamify.flame, wash: "bg-gamify-flame-wash" },
  ]

  /** Bank the cards already rated, then drop back to the set the child came from. */
  function endSession() {
    if (reviewed > 0) {
      recordSession({
        setId: set!.id,
        setTitle: set!.title,
        subject: set!.subject,
        cardsReviewed: reviewed,
        minutes: Math.max(1, Math.round(seconds / 60)),
      })
    }
    router.dismissTo({ pathname: "/lesson/[id]", params: { id: set!.id } })
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back returns to the card that was on screen when the child paused */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to your card"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="font-text text-body-lg font-bold text-ink">Session paused</Text>
        <View className="h-11 w-11" />
      </View>

      <View className="flex-1 justify-center">
        {/* Hero */}
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-study-wash">
            <SymbolView name="pause.fill" size={36} tintColor={colors.study.teal} weight="semibold" />
          </View>
          <Text className="mt-5 text-center font-text text-h2 font-bold text-ink">Take a breath</Text>
          <Text className="mt-2 text-center font-text text-body-lg text-text-secondary">
            Your progress is saved. Pick up right where you left off.
          </Text>
        </View>

        {/* Where the child is in the deck */}
        <View className="mt-8 rounded-lg border border-border bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="font-text text-body font-semibold text-ink" numberOfLines={1}>
              {set.title}
            </Text>
            <Text className="font-text text-body text-text-secondary">
              {index + 1} / {total}
            </Text>
          </View>
          <View className="mt-3 h-2 flex-row gap-1">
            {set.cards.map((c, i) => (
              <View key={c.id} className={`h-2 flex-1 rounded-full ${i < index ? "bg-study-teal" : "bg-study-track"}`} />
            ))}
          </View>
          <Text className="mt-3 font-text text-caption text-text-secondary">
            {left === 0 ? "Last card — you're nearly there" : `${left} ${left === 1 ? "card" : "cards"} left in this set`}
          </Text>
        </View>

        {/* Session so far — tile geometry lifted from the session-summary reference */}
        <View className="mt-3 flex-row gap-2">
          {tiles.map((t) => (
            <View key={t.label} className="flex-1 items-center rounded-lg border border-border bg-white py-4">
              <View className={`h-9 w-9 items-center justify-center rounded-full ${t.wash}`}>
                <SymbolView name={t.symbol as never} size={18} tintColor={t.tint} weight="semibold" />
              </View>
              <Text className="mt-2 text-center font-text text-tile text-text-secondary" numberOfLines={1}>
                {t.label}
              </Text>
              <Text className="mt-1 font-text text-body-lg font-bold text-ink">{t.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View className="mb-2 gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resume session"
          className="h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.back()}
        >
          <SymbolView name="play.fill" size={18} tintColor={colors.white} weight="semibold" />
          <Text className="font-text text-body-lg font-bold text-white">Resume session</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirming ? "Yes, end session" : "End session"}
          className={`h-14 items-center justify-center rounded-full border active:opacity-90 ${
            confirming ? "border-error bg-error" : "border-border bg-white"
          }`}
          onPress={() => (confirming ? endSession() : setConfirming(true))}
        >
          <Text className={`font-text text-body-lg font-bold ${confirming ? "text-white" : "text-text-secondary"}`}>
            {confirming ? "Yes, end session" : "End session"}
          </Text>
        </Pressable>

        {/* Exit confirmation, inlined — a child tapping "End session" once never loses their deck */}
        {confirming ? (
          <Text className="text-center font-text text-caption text-text-secondary">
            {reviewed > 0
              ? `We'll keep the ${reviewed} ${reviewed === 1 ? "card" : "cards"} you studied.`
              : "You haven't studied any cards yet."}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  )
}
