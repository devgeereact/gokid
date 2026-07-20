import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useEffect, useRef, useState } from "react"
import { Alert, Pressable, Text, View } from "react-native"
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

import { CardZoom } from "@/components/card-zoom"
import { ReportCardSheet } from "@/components/report-card-sheet"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useBookmarks } from "@/lib/bookmarks"
import { useStudyingChildId } from "@/lib/children"
import { useHaptics } from "@/lib/haptics"
import { hintFor } from "@/lib/hints"
import { useReadingClasses, useReduceMotion } from "@/lib/preferences"
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
  const reduceMotion = useReduceMotion()
  // §19 "Dyslexia Reading Mode" — applied on the card faces, which is where the reading is.
  const reading = useReadingClasses()
  // Never write ratings against a demo profile: if no child is active (a cold deep link into a card),
  // redirect to who's-studying below rather than banking this session into someone else's schedule.
  const childId = useStudyingChildId()
  const { rateCard, recordSession } = useProgress(childId ?? "")
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // §5 "Report Incorrect Card" — opened from the header, always on the card in front of them.
  const [reporting, setReporting] = useState(false)
  // §6 "Card Hint" — a retrieval cue derived from the answer, revealed only on request so it never
  // short-circuits the recall effort that makes the card work.
  const [hintShown, setHintShown] = useState(false)
  // §6 "Card Zoom" / "Illustration Viewer".
  const [zoomed, setZoomed] = useState(false)
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

  // §6 "Mark Favourite" — the glyph was decorative and stored nothing. Card-scoped, so favouriting a
  // card does not favourite the whole set. Above the early returns below: hooks must run in the same
  // order every render.
  const { toggle: toggleFavourite, isBookmarked } = useBookmarks(childId ?? "", "card")
  const haptics = useHaptics()

  const frontStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden",
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(spin.get(), [0, 1], [0, 180])}deg` }],
  }))
  const backStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden",
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(spin.get(), [0, 1], [180, 360])}deg` }],
  }))

  if (!set) return <Redirect href="/home" />
  if (!childId) return <Redirect href="/home" />

  const setId = set.id
  const total = set.cards.length
  const card = set.cards[index]
  const hint = hintFor(card.answer)

  function flip() {
    haptics.select()
    const next = !flipped
    setFlipped(next)
    // Reduce Motion (in-app or the OS setting) → snap to the face with no rotation; otherwise the
    // 3D flip. Same end state either way, so nothing downstream depends on how we got there.
    spin.set(reduceMotion ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: FLIP_MS }))
  }

  // §6 "Exit Confirmation". The ✕ used to drop straight out of a session in progress, discarding
  // the run silently. Rated cards are already persisted, so nothing is lost from the SRS record —
  // but the child loses their place mid-deck, which is worth one tap to confirm. Pause is offered
  // as the non-destructive alternative rather than only "are you sure?".
  function confirmExit() {
    if (index === 0 && !flipped) {
      router.back()
      return
    }
    Alert.alert("Leave this session?", "Your answers so far are saved. You can pause instead and pick up where you left off.", [
      { text: "Keep studying", style: "cancel" },
      { text: "Pause", onPress: pause },
      { text: "Leave", style: "destructive", onPress: () => router.back() },
    ])
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
    // Confirms the tap landed without needing the child to see or hear anything — see lib/haptics.ts.
    if (rating === "gotit") haptics.success()
    else haptics.warning()
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
    // A hint belongs to the card that was on screen — carrying it to the next one would hand over a
    // cue for a question the child has not tried yet.
    setHintShown(false)
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
          onPress={confirmExit}
        >
          <SymbolView name="xmark" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="font-text text-body-lg font-bold text-ink">
          {index + 1} / {total}
        </Text>
        <View className="-mr-2 flex-row items-center">
          {/* Reporting a bad card has to be reachable from the card itself — a child who spots a
              wrong answer will not go looking for a settings menu. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isBookmarked(card.id) ? "Remove this card from favourites" : "Save this card to favourites"
            }
            accessibilityState={{ selected: isBookmarked(card.id) }}
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => toggleFavourite(card.id)}
          >
            <SymbolView
              name={isBookmarked(card.id) ? "bookmark.fill" : "bookmark"}
              size={20}
              tintColor={isBookmarked(card.id) ? colors.primary : colors.ink}
              weight="semibold"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report a problem with this card"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => setReporting(true)}
          >
            <SymbolView name="exclamationmark.bubble" size={22} tintColor={colors.ink} weight="semibold" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause session"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={pause}
          >
            <SymbolView name="pause.circle" size={26} tintColor={colors.ink} weight="semibold" />
          </Pressable>
        </View>
      </View>

      <ReportCardSheet
        visible={reporting}
        cardId={card.id}
        setId={setId}
        onClose={() => setReporting(false)}
      />

      <CardZoom
        visible={zoomed}
        source={set.hero}
        caption={card.question}
        onClose={() => setZoomed(false)}
      />

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Look at the picture more closely"
            className="flex-[3] items-center justify-center bg-study-wash p-4"
            // Stops the tap reaching the card's own flip handler — looking at the picture and
            // turning the card over are different intentions.
            onPress={() => setZoomed(true)}
          >
            <Image accessibilityIgnoresInvertColors className="h-full w-full" contentFit="contain" source={set.hero} />
          </Pressable>
          <View className="flex-[2] items-center justify-center px-6">
            <Text className={`font-text text-h2 font-bold text-ink ${reading.align} ${reading.text}`}>
              {card.question}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          className="absolute inset-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-study-wash px-6"
          style={backStyle}
        >
          <Text className="font-text text-caption font-semibold uppercase text-primary">Answer</Text>
          <Text className={`mt-4 font-text text-h2 font-bold text-ink ${reading.align} ${reading.text}`}>
            {card.answer}
          </Text>
        </Animated.View>
      </Pressable>

      {/* §6 "Card Hint". Offered only on the question side and only before the answer is shown —
          a hint next to the answer is noise. Hidden entirely when the answer is too short to cue
          without giving away (see lib/hints.ts). */}
      {!flipped && hint ? (
        <View className="mt-4 flex-row items-center rounded-2xl border border-border bg-white px-4 py-3">
          <SymbolView name="lightbulb" size={18} tintColor={colors.accent} weight="semibold" />
          <Text className="ml-3 flex-1 font-text text-body text-text-secondary">
            {hintShown ? hint : "Stuck? Get a clue without the answer."}
          </Text>
          {hintShown ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show a hint"
              className="rounded-full border border-border bg-white px-3 py-2 active:opacity-70"
              hitSlop={6}
              onPress={() => setHintShown(true)}
            >
              <Text className="font-text text-caption font-bold text-primary">Hint</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Text className="mt-4 text-center font-text text-body text-text-secondary">Tap to flip</Text>
      )}

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
