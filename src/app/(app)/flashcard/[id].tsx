import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { getStudySet } from "@/lib/study"

/**
 * Flashcard runner (design/GoKid-flashcard-screen.png, screen 7). Walks the set's demo cards:
 * tap to flip question↔answer, then rate "Tricky" / "Got it" to advance. Finishing (or ✕) returns
 * to the set detail. The "7. Flashcard" title is a mockup annotation — dropped.
 */
export default function FlashcardRunner() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!set) return <Redirect href="/home" />

  const setId = set.id
  const total = set.cards.length
  const card = set.cards[index]

  function advance() {
    // Finished the deck → straight into the quiz for this set (app-ui order 7 → 8).
    if (index + 1 >= total) {
      router.replace({ pathname: "/quiz/[id]", params: { id: setId } })
      return
    }
    setIndex(index + 1)
    setFlipped(false)
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
        <View className="h-11 w-11" />
      </View>

      {/* Segmented progress — one cell per card, filled up to the current one */}
      <View className="mt-1 flex-row gap-1">
        {set.cards.map((c, i) => (
          <View
            key={c.id}
            className={`h-2 flex-1 rounded-full ${i <= index ? "bg-study-teal" : "bg-study-track"}`}
          />
        ))}
      </View>

      {/* Card — tap to flip */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipped ? "Show question" : "Show answer"}
        className="mt-6 flex-1 overflow-hidden rounded-2xl border border-border bg-white active:opacity-95"
        onPress={() => setFlipped(!flipped)}
      >
        {flipped ? (
          <View className="flex-1 items-center justify-center bg-study-wash px-6">
            <Text className="font-text text-caption font-semibold uppercase text-primary">Answer</Text>
            <Text className="mt-4 text-center font-text text-h2 font-bold text-ink">{card.answer}</Text>
          </View>
        ) : (
          <View className="flex-1">
            <View className="flex-[3] items-center justify-center bg-study-wash p-4">
              <Image
                accessibilityIgnoresInvertColors
                className="h-full w-full"
                contentFit="contain"
                source={set.hero}
              />
            </View>
            <View className="flex-[2] items-center justify-center px-6">
              <Text className="text-center font-text text-h2 font-bold text-ink">{card.question}</Text>
            </View>
          </View>
        )}
      </Pressable>

      <Text className="mt-4 text-center font-text text-body text-text-secondary">Tap to flip</Text>

      {/* Rate */}
      <View className="mb-2 mt-4 flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tricky"
          className="h-14 flex-1 items-center justify-center rounded-full bg-error active:opacity-90"
          onPress={advance}
        >
          <Text className="font-text text-body-lg font-bold text-white">Tricky</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Got it"
          className="h-14 flex-1 items-center justify-center rounded-full bg-status-getting active:opacity-90"
          onPress={advance}
        >
          <Text className="font-text text-body-lg font-bold text-white">Got it</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
