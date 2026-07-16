import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useEffect, useRef, useState } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useActiveChildId } from "@/lib/active-child"
import { elapsedMinutes, elapsedSeconds, type Rating, useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Flashcard runner (design/GoKid-flashcard-screen.png, screen 7). Walks the set's cards: tap for a
 * 3D flip to the answer, then rate "Tricky" / "Got it" to advance. The rating goes to the
 * spaced-repetition engine (src/lib/reviews.ts) — "Tricky" brings the card back tomorrow, "Got it"
 * pushes it out. Finishing the deck records the session and rolls into the set's quiz.
 * The "7. Flashcard" title is a mockup annotation — dropped.
 */

const FLIP_MS = 420

export default function FlashcardRunner() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  const childId = useActiveChildId() ?? "demo-amara"
  const { rateCard, recordSession } = useProgress(childId)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // Running tally handed to the pause screen — it shows the session so far and banks these if the
  // child ends early.
  const [gotit, setGotit] = useState(0)
  const [tricky, setTricky] = useState(0)
  // Clock reads stay out of render — the React Compiler treats Date.now() as impure there.
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  // Drives both faces: 0 = question, 1 = answer. Reanimated owns the value, so the flip runs on the
  // UI thread rather than through a JS re-render. get()/set() (not `.value`) keep the shared value
  // legible to the React Compiler, which is on for this project (app.json → experiments).
  const spin = useSharedValue(0)

  const frontStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden",
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(spin.get(), [0, 1], [0, 180])}deg` }],
  }))
  const backStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden",
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(spin.get(), [0, 1], [180, 360])}deg` }],
  }))

  if (!set) return <Redirect href="/home" />

  const setId = set.id
  const total = set.cards.length
  const card = set.cards[index]

  function flip() {
    const next = !flipped
    setFlipped(next)
    spin.set(withTiming(next ? 1 : 0, { duration: FLIP_MS }))
  }

  function pause() {
    router.push({
      pathname: "/flashcard/paused",
      params: {
        id: setId,
        index: `${index}`,
        gotit: `${gotit}`,
        tricky: `${tricky}`,
        seconds: `${elapsedSeconds(startedAt.current)}`,
      },
    })
  }

  function rate(rating: Rating) {
    rateCard(setId, card.id, rating)
    if (rating === "gotit") setGotit(gotit + 1)
    else setTricky(tricky + 1)

    // Finished the deck → record the session, then straight into the quiz (app-ui order 7 → 8).
    if (index + 1 >= total) {
      recordSession({
        setId,
        setTitle: set!.title,
        subject: set!.subject,
        cardsReviewed: total,
        minutes: elapsedMinutes(startedAt.current),
      })
      router.replace({ pathname: "/quiz/instructions/[id]", params: { id: setId } })
      return
    }
    setIndex(index + 1)
    setFlipped(false)
    spin.set(0)
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — dismiss + position */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="xmark" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="font-text text-body-lg font-bold text-ink">
          {index + 1} / {total}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause session"
          className="-mr-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={pause}
        >
          <SymbolView name="pause.circle" size={26} tintColor={colors.ink} weight="semibold" />
        </Pressable>
      </View>

      {/* Segmented progress — one cell per card, filled up to the current one */}
      <View className="mt-1 flex-row gap-1">
        {set.cards.map((c, i) => (
          <View key={c.id} className={`h-2 flex-1 rounded-full ${i <= index ? "bg-study-teal" : "bg-study-track"}`} />
        ))}
      </View>

      {/* Card — tap for a 3D flip. Both faces are stacked and counter-rotated; whichever is turned
          away is hidden by backfaceVisibility, so only one is ever readable. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipped ? "Show question" : "Show answer"}
        className="mt-6 flex-1"
        onPress={flip}
      >
        <Animated.View
          className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-white"
          style={frontStyle}
        >
          <View className="flex-[3] items-center justify-center bg-study-wash p-4">
            <Image accessibilityIgnoresInvertColors className="h-full w-full" contentFit="contain" source={set.hero} />
          </View>
          <View className="flex-[2] items-center justify-center px-6">
            <Text className="text-center font-text text-h2 font-bold text-ink">{card.question}</Text>
          </View>
        </Animated.View>

        <Animated.View
          className="absolute inset-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-study-wash px-6"
          style={backStyle}
        >
          <Text className="font-text text-caption font-semibold uppercase text-primary">Answer</Text>
          <Text className="mt-4 text-center font-text text-h2 font-bold text-ink">{card.answer}</Text>
        </Animated.View>
      </Pressable>

      <Text className="mt-4 text-center font-text text-body text-text-secondary">Tap to flip</Text>

      {/* Rate — feeds the spaced-repetition schedule */}
      <View className="mb-2 mt-4 flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tricky"
          className="h-14 flex-1 items-center justify-center rounded-full bg-error active:opacity-90"
          onPress={() => rate("tricky")}
        >
          <Text className="font-text text-body-lg font-bold text-white">Tricky</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Got it"
          className="h-14 flex-1 items-center justify-center rounded-full bg-status-getting active:opacity-90"
          onPress={() => rate("gotit")}
        >
          <Text className="font-text text-body-lg font-bold text-white">Got it</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
