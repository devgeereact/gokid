import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Offline / sync state (design/GoKid-offlinesync-screen.png, screen 14). Shown when the child opens
 * Study with no connection — a reassuring hero and the sets already downloaded for offline use.
 * Reached from the Study dashboard header (downloads icon); each row re-enters that set's detail
 * (app-ui order 14 → 6), so the screen isn't a dead end. The hero (headline baked in) is cropped off
 * the reference. In the mock this sits inside the Study tab (the native tab bar shows below); as a
 * pushed route it has a back chevron instead — logged. Downloaded state is demo data.
 */

const DOWNLOADED = [
  { id: "place-value", title: "Place Value to 1,000", cards: 20, thumb: require("../../../assets/images/gokid-offline-placevalue.png") },
  { id: "human-skeleton", title: "The Human Skeleton", cards: 18, thumb: require("../../../assets/images/gokid-offline-skeleton.png") },
  { id: "capital-cities", title: "Capital Cities of Europe", cards: 20, thumb: require("../../../assets/images/gokid-offline-capitals.png") },
]

export default function Offline() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-1" showsVerticalScrollIndicator={false}>
        {/* Hero — headline is baked into the cropped illustration */}
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="You're offline — everything's saved."
          className="aspect-[820/636] w-full rounded-2xl"
          contentFit="cover"
          source={require("../../../assets/images/gokid-offline-hero.png")}
        />

        <Text className="mb-4 mt-8 font-text text-h2 font-bold text-ink">Downloaded sets</Text>

        {DOWNLOADED.map((s, i) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}, ${s.cards} cards, downloaded`}
            className={`flex-row items-center py-4 active:opacity-70 ${i < DOWNLOADED.length - 1 ? "border-b border-border" : ""}`}
            onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: s.id } })}
          >
            <Image accessibilityIgnoresInvertColors className="h-14 w-14 rounded-lg" contentFit="cover" source={s.thumb} />
            <View className="ml-4 flex-1">
              <Text className="font-text text-body-lg font-bold text-ink">{s.title}</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">{s.cards} cards</Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-study-teal">
              <SymbolView name="arrow.down" size={22} tintColor={colors.study.teal} weight="semibold" />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
