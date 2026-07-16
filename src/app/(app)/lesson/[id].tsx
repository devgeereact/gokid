import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { getStudySet } from "@/lib/study"

/**
 * Set detail (design/GoKid-lessondetails-screen.png, screen 6). Hero illustration, blurb, card /
 * time meta, a three-part mastery bar, and the entry into the flashcard runner. The "6. Set Detail"
 * title is a mockup annotation — dropped, like the other screens.
 */

// Mastery segment widths come from demo data (per set), so the percentages are a known, small set.
// Listing them as literal classes lets NativeWind's compiler emit them (it scans source text) —
// keeps the bar data-driven with no inline `style`.
const PCT: Record<number, string> = {
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
}

function Meta({ symbol, label }: { symbol: SFSymbol; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <SymbolView name={symbol} size={20} tintColor={colors["text-secondary"]} weight="regular" />
      <Text className="font-text text-body text-text-secondary">{label}</Text>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={`h-3 w-3 rounded-sm ${color}`} />
      <Text className="font-text text-body text-text-secondary">{label}</Text>
    </View>
  )
}

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  if (!set) return <Redirect href="/home" />

  const { mastery } = set

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Back · download this set for offline (design/GoKid-downloadset-screen.png, screen 15). */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download this set"
          className="-mr-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.push({ pathname: "/download/[id]", params: { id: set.id } })}
        >
          <SymbolView name="arrow.down.circle" size={24} tintColor={colors.ink} weight="regular" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
        <View className="h-64 items-center justify-center">
          <Image
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            contentFit="contain"
            source={set.hero}
          />
        </View>

        <Text className="mt-2 font-text text-h1 font-bold text-ink">{set.title}</Text>
        <Text className="mt-3 font-text text-body-lg text-text-secondary">{set.description}</Text>

        <View className="mt-6 flex-row items-center gap-8">
          <Meta symbol="square.stack" label={`${set.cardsTotal} cards`} />
          <Meta symbol="clock" label={`~${set.minutes} min`} />
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Mastery</Text>
        <View className="h-11 flex-row overflow-hidden rounded-md">
          <View className={`h-full items-center justify-center bg-status-learning ${PCT[mastery.learning]}`}>
            <Text className="font-text text-body font-bold text-white">{mastery.learning}%</Text>
          </View>
          <View className={`h-full items-center justify-center bg-study-teal ${PCT[mastery.getting]}`}>
            <Text className="font-text text-body font-bold text-white">{mastery.getting}%</Text>
          </View>
          <View className={`h-full flex-1 items-center justify-center bg-status-getting`}>
            <Text className="font-text text-body font-bold text-white">{mastery.mastered}%</Text>
          </View>
        </View>
        <View className="mt-3 flex-row justify-between">
          <Legend color="bg-status-learning" label="Learning" />
          <Legend color="bg-study-teal" label="Getting it" />
          <Legend color="bg-status-getting" label="Mastered" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Study cards"
          className="mt-8 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.push({ pathname: "/flashcard/[id]", params: { id: set.id } })}
        >
          <Text className="font-text text-body-lg font-bold text-white">Study cards</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take the quiz"
          className="mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push({ pathname: "/quiz/[id]", params: { id: set.id } })}
        >
          <Text className="font-text text-body-lg font-bold text-ink">Take the quiz</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
