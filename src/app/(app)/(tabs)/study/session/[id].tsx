import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useBookmarks } from "@/lib/bookmarks"
import { useStudyingChildId } from "@/lib/children"
import { hintFor } from "@/lib/hints"
import { useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Study Session (design/GoKid-studysection-screen.png, screen 19). A single MCQ card inside a
 * gamified session shell: set summary + progress, a big question card with a hint / answer toggle and
 * four answer pills, a Previous / Skip / Next action row, and a session-goal + accuracy footer. The
 * "19. Study Session" title is a mockup annotation — dropped. Session-goal and accuracy numbers are
 * demo constants (the Neon/Drizzle progress API lands later — AGENTS.md); "Cards learned" is real,
 * read from the spaced-repetition record. The mock's 🔥 streak chip is gone — design/gokid-screens.md
 * §9 rejects streaks, and a live correct-in-a-row counter beside a child mid-question is pressure
 * rather than encouragement. The mock's underlined "728" digit art isn't reproduced — the real
 * prompt (q.prompt) is shown instead. Target / trophy glyphs are SF Symbols (no bespoke assets).
 */

// Demo session numbers shown in the mock.

// Bar fill widths as literal classes so NativeWind's compiler emits them (it scans source text).
// Data-driven widths round to the nearest 5% and index this map — no inline `style`, no interpolation.
const PCT: Record<number, string> = {
  0: "w-[0%]",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-[100%]",
}

const pct = (n: number) => PCT[Math.max(0, Math.min(100, Math.round(n / 5) * 5))]

function Bar({ fill }: { fill: string }) {
  return (
    <View className="h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
      <View className={`h-full rounded-full bg-study-teal ${fill}`} />
    </View>
  )
}

export default function StudySession() {
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>()
  const childId = useStudyingChildId() ?? ""
  // §6 "Mark Favourite" — this glyph was accessibilityRole="image" and stored nothing.
  const { toggle: toggleFavourite, isBookmarked } = useBookmarks(childId, "card")
  const { cards } = useProgress(childId)
  const set = getStudySet(id)
  const [selected, setSelected] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  if (!set) return <Redirect href="/home" />

  const i = Math.max(0, Math.min(Number(index ?? 0) || 0, set.cards.length - 1))
  const q = set.quiz[i % set.quiz.length]

  // Box 2+ — recalled at least twice across widening gaps. Cumulative, so it never counts down.
  const setCards = cards.filter((c) => c.setId === set.id)
  const learned = setCards.filter((c) => c.box >= 2).length

  // The goal is this set's real length, and accuracy is how many of the cards they have rated in it
  // came back as "got it" — both replacing hard-coded 20 / 85%.
  const goalCards = set.cards.length
  const recalled = setCards.filter((c) => c.lastRating === "gotit").length
  const accuracy = setCards.length ? Math.round((recalled / setCards.length) * 100) : null

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 flex-row items-center px-2 active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={22} tintColor={colors.ink} weight="semibold" />
          <Text className="ml-1 font-text text-body-lg font-semibold text-ink">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center font-text text-body-lg font-bold text-ink">Study Session</Text>
        <View
          className="-mr-2 h-11 w-11 items-center justify-center"
          accessibilityRole="image"
          accessibilityLabel="Session settings"
        >
          <SymbolView name="gearshape" size={24} tintColor={colors.ink} weight="regular" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Set summary + progress */}
        <View className="flex-row items-center rounded-2xl border border-border bg-white p-4">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Image
                accessibilityIgnoresInvertColors
                className="h-16 w-16 rounded-xl"
                contentFit="cover"
                source={set.hero}
              />
              <View className="ml-3 flex-1">
                <Text numberOfLines={1} className="font-text text-body-lg font-bold text-ink">
                  {set.title}
                </Text>
                <Text className="mt-1 font-text text-body text-text-secondary">
                  {`${set.cardsTotal} cards • ${set.subject} • ${set.yearGroup}`}
                </Text>
              </View>
            </View>
            <Text className="mb-2 mt-4 font-text text-body font-semibold text-ink">Progress</Text>
            <View className="flex-row items-center">
              <Bar fill={pct((i / set.cardsTotal) * 100)} />
              <Text className="ml-3 font-text text-body font-bold text-ink">{`${i} / ${set.cardsTotal}`}</Text>
            </View>
          </View>

          {/* Cards learned. Was a 🔥 "Current streak" chip — a live counter of correct-answers-in-a-row
              sitting next to the child while they answer, which is pressure, not encouragement (§9). */}
          <View className="ml-4 items-center justify-center rounded-2xl bg-gamify-green-wash px-4 py-4">
            <View className="flex-row items-center">
              <SymbolView name="brain.head.profile" size={18} tintColor={colors.gamify.green} weight="semibold" />
              <Text className="ml-1 font-text text-h3 font-bold text-gamify-green">{learned}</Text>
            </View>
            <Text className="mt-1 font-text text-caption font-semibold text-text-secondary">Cards learned</Text>
          </View>
        </View>

        {/* Question card */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-center justify-between">
            <View className="rounded-full bg-gamify-green-wash px-3 py-1.5">
              <Text className="font-text text-body font-bold text-gamify-green">
                {`Card ${i + 1} of ${set.cardsTotal}`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isBookmarked(q.id) ? "Remove this card from favourites" : "Save this card to favourites"
              }
              accessibilityState={{ selected: isBookmarked(q.id) }}
              className="h-9 w-9 items-center justify-center active:opacity-60"
              hitSlop={8}
              onPress={() => toggleFavourite(q.id)}
            >
              <SymbolView
                name={isBookmarked(q.id) ? "bookmark.fill" : "bookmark"}
                size={22}
                tintColor={isBookmarked(q.id) ? colors.primary : colors.ink}
                weight={isBookmarked(q.id) ? "semibold" : "regular"}
              />
            </Pressable>
          </View>

          <Text className="mb-6 mt-6 text-center font-text text-h2 font-bold leading-[34px] text-ink">
            {q.prompt}
          </Text>

          {/* Hint / answer */}
          <View className="flex-row items-center rounded-2xl border border-border bg-background px-4 py-3">
            <Text className="text-body-lg">💡</Text>
            <View className="ml-3 flex-1">
              <Text className="font-text text-body font-bold text-ink">Hint</Text>
              <Text className="mt-0.5 font-text text-caption text-text-secondary">
                {/* Was "Read each option carefully before choosing." on every single card — identical
                    text regardless of the question, which teaches a child the hint is worthless.
                    Now a real cue derived from the correct option (see lib/hints.ts). */}
                {showAnswer
                  ? `Answer: ${q.options[q.answer]}`
                  : (hintFor(q.options[q.answer]) ?? "Read each option carefully before choosing.")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showAnswer ? "Hide answer" : "Show answer"}
              className="flex-row items-center rounded-full border border-border bg-white px-3 py-2 active:opacity-70"
              onPress={() => setShowAnswer((s) => !s)}
            >
              <SymbolView name="eye" size={16} tintColor={colors.primary} weight="regular" />
              <Text className="ml-1.5 font-text text-body font-semibold text-primary">
                {showAnswer ? "Hide answer" : "Show answer"}
              </Text>
            </Pressable>
          </View>

          <Text className="mb-3 mt-6 text-center font-text text-body font-semibold text-text-secondary">
            Choose your answer
          </Text>
          <View className="flex-row gap-2">
            {q.options.map((opt, idx) => {
              const isSel = selected === idx
              return (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  accessibilityLabel={opt}
                  className={`h-14 flex-1 items-center justify-center rounded-2xl border active:opacity-90 ${
                    isSel ? "border-study-teal bg-quiz-option-sel" : "border-border bg-white"
                  }`}
                  onPress={() => setSelected(idx)}
                >
                  <Text numberOfLines={1} className="font-text text-body-lg font-bold text-ink">
                    {opt}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Action row */}
          <View className="mt-6 flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous card"
              className="h-12 flex-row items-center justify-center rounded-full border border-study-teal bg-white px-5 active:opacity-70"
              onPress={() =>
                i > 0
                  ? router.replace({ pathname: "/study/session/[id]", params: { id: set.id, index: String(i - 1) } })
                  : router.back()
              }
            >
              <SymbolView name="chevron.left" size={16} tintColor={colors["study"].teal} weight="bold" />
              <Text className="ml-1.5 font-text text-body font-bold text-study-teal">Previous</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip card"
              className="flex-1 flex-row items-center justify-center active:opacity-60"
              onPress={() =>
                router.replace({
                  pathname: "/study/session/[id]",
                  params: { id: set.id, index: String(Math.min(i + 1, set.cards.length - 1)) },
                })
              }
            >
              {/* Was a bookmark glyph, which is the icon for the favourite control directly above. */}
              <SymbolView name="forward.end" size={16} tintColor={colors["text-secondary"]} weight="regular" />
              <Text className="ml-1.5 font-text text-body font-semibold text-text-secondary">Skip</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next card"
              className="h-12 flex-row items-center justify-center rounded-full bg-study-teal px-6 active:opacity-90"
              onPress={() =>
                router.push({
                  pathname: "/study/answer-result/[id]",
                  params: { id: set.id, index: String(i), choice: String(selected ?? -1) },
                })
              }
            >
              <Text className="mr-1.5 font-text text-body font-bold text-white">Next</Text>
              <SymbolView name="arrow.right" size={16} tintColor={colors.white} weight="bold" />
            </Pressable>
          </View>
        </View>

        {/* Session goal + accuracy */}
        <View className="mt-4 flex-row rounded-2xl border border-border bg-white p-4">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-gamify-purple-wash">
                <SymbolView name="target" size={22} tintColor={colors.gamify.purple} weight="regular" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-text text-body font-bold text-ink">Session goal</Text>
                <Text className="mt-0.5 font-text text-caption text-text-secondary">Finish {goalCards} cards</Text>
              </View>
            </View>
            <View className="mt-3 flex-row items-center">
              <Bar fill={pct((i / goalCards) * 100)} />
              <Text className="ml-2 font-text text-caption font-bold text-ink">{`${i} / ${goalCards}`}</Text>
            </View>
          </View>

          <View className="w-px bg-border" />

          <View className="flex-1 pl-4">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-gamify-amber-wash">
                <SymbolView name="trophy.fill" size={20} tintColor={colors.accent} weight="regular" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-text text-body font-bold text-ink">Accuracy</Text>
                <Text className="mt-0.5 font-text text-caption text-text-secondary">
                  {accuracy === null ? "No cards rated yet" : `${accuracy}% so far`}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row items-center">
              <Bar fill={pct(accuracy ?? 0)} />
              <Text className="ml-2 font-text text-caption font-bold text-ink">
                {accuracy === null ? "—" : `${accuracy}%`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
