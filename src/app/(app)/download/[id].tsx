import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { getStudySet } from "@/lib/study"

/**
 * Download Set (design/GoKid-downloadset-screen.png, screen 15). A pushed stack screen: set summary,
 * "What's included" tiles, a horizontal answer preview, feature reassurance tiles, a download-target
 * radio group, and the primary download action. The "15. Download Set" title is a mockup annotation —
 * dropped, the human title "Download Set" is kept as a centered header.
 *
 * Inferred / demo-only (no data-layer source): the download size + offline footer, the "This device /
 * iPhone" + "iCloud / All your devices" target labels, and the tile SF Symbols (design uses colourful
 * illustrations we have no asset for — tinted SF Symbols stand in).
 */

const DOWNLOAD_SIZE = "8.4 MB"

type DownloadTarget = "device" | "icloud"

const TARGETS: { key: DownloadTarget; symbol: SFSymbol; title: string; sub: string }[] = [
  { key: "device", symbol: "iphone", title: "This device", sub: "iPhone" },
  { key: "icloud", symbol: "icloud", title: "iCloud", sub: "All your devices" },
]

const FEATURES: { symbol: SFSymbol; tint: string; title: string; sub: string }[] = [
  { symbol: "arrow.down.circle", tint: colors.primary, title: "Works offline", sub: "Use anywhere" },
  { symbol: "checkmark.shield", tint: colors.success, title: "Child-safe", sub: "No ads, ever" },
  { symbol: "lock", tint: colors.success, title: "Yours forever", sub: "Keep forever" },
]

function IncludedTile({
  symbol,
  tint,
  value,
  label,
}: {
  symbol: SFSymbol
  tint: string
  value: string
  label: string
}) {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-lg bg-gamify-tile p-3">
      <SymbolView name={symbol} size={26} tintColor={tint} weight="regular" />
      <View className="flex-1">
        <Text numberOfLines={1} className="font-text text-body-lg font-bold text-ink">
          {value}
        </Text>
        <Text numberOfLines={2} className="font-text text-caption text-text-secondary">
          {label}
        </Text>
      </View>
    </View>
  )
}

export default function DownloadSet() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  const [target, setTarget] = useState<DownloadTarget>("device")

  if (!set) return <Redirect href="/home" />

  const previews = set.quiz.slice(0, 5)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back chevron + centered title */}
      <View className="h-11 flex-row items-center justify-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="absolute left-0 -ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="font-text text-h3 font-bold text-ink">Download Set</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8 pt-2" showsVerticalScrollIndicator={false}>
        {/* Set summary card */}
        <View className="flex-row gap-4 rounded-2xl border border-border bg-white p-4">
          <Image
            accessibilityIgnoresInvertColors
            className="h-28 w-28 rounded-lg bg-gamify-tile"
            contentFit="cover"
            source={set.hero}
          />
          <View className="flex-1">
            <Text className="font-text text-h3 font-bold text-ink">{set.title}</Text>
            <Text className="mt-1 font-text text-body text-text-secondary">{set.cardsTotal} cards</Text>
            <Text className="mt-2 font-text text-body text-text-secondary">{set.description}</Text>
            <View className="mt-3 flex-row items-center gap-2 self-start rounded-full border border-border bg-background px-3 py-1.5">
              <SymbolView name="star.fill" size={16} tintColor={colors.study.teal} weight="regular" />
              <Text className="font-text text-body font-semibold text-ink">
                {set.subject} • {set.yearGroup}
              </Text>
            </View>
          </View>
        </View>

        {/* What's included */}
        <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">What&apos;s included</Text>
        <View className="flex-row gap-3">
          <IncludedTile symbol="square.stack.fill" tint={colors.success} value={`${set.cardsTotal}`} label="Cards" />
          <IncludedTile
            symbol="questionmark.circle.fill"
            tint={colors.accent}
            value={`${set.quiz.length}`}
            label="Practice questions"
          />
          <IncludedTile
            symbol="clock.fill"
            tint={colors.gamify.purple}
            value={`${set.minutes - 5}–${set.minutes}`}
            label="Minutes"
          />
        </View>

        {/* Preview */}
        <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">Preview</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 pr-1"
        >
          {previews.map((q) => (
            <View key={q.id} className="h-44 w-40 justify-between rounded-lg border border-border bg-white p-3">
              <Text numberOfLines={3} className="text-center font-text text-caption text-text-secondary">
                {q.prompt}
              </Text>
              <View className="items-center justify-center rounded-md border border-border bg-background py-2">
                <Text numberOfLines={1} className="font-text text-body-lg font-bold text-ink">
                  {q.options[q.answer]}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Feature reassurance tiles */}
        <View className="mt-6 flex-row gap-3">
          {FEATURES.map((f) => (
            <View key={f.title} className="flex-1 rounded-lg bg-gamify-tile p-3">
              <SymbolView name={f.symbol} size={24} tintColor={f.tint} weight="regular" />
              <Text className="mt-2 font-text text-body font-bold text-ink">{f.title}</Text>
              <Text className="mt-0.5 font-text text-caption text-text-secondary">{f.sub}</Text>
            </View>
          ))}
        </View>

        {/* Download to */}
        <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">Download to</Text>
        <View className="flex-row gap-3">
          {TARGETS.map((t) => {
            const selected = target === t.key
            return (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityLabel={`Download to ${t.title}`}
                className={`flex-1 flex-row items-center gap-3 rounded-lg border p-3 active:opacity-70 ${
                  selected ? "border-study-teal bg-quiz-option-sel" : "border-border bg-white"
                }`}
                onPress={() => setTarget(t.key)}
              >
                <SymbolView name={t.symbol} size={26} tintColor={colors.ink} weight="regular" />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-text text-body font-bold text-ink">
                    {t.title}
                  </Text>
                  <Text numberOfLines={1} className="font-text text-caption text-text-secondary">
                    {t.sub}
                  </Text>
                </View>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? "border-study-teal" : "border-border"
                  }`}
                >
                  {selected ? <View className="h-3 w-3 rounded-full bg-study-teal" /> : null}
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Primary action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download set"
          className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.back()}
        >
          <SymbolView name="arrow.down" size={20} tintColor={colors.white} weight="semibold" />
          <Text className="font-text text-body-lg font-bold text-white">Download set</Text>
        </Pressable>

        <Text className="mt-3 text-center font-text text-body text-text-secondary">
          Size: {DOWNLOAD_SIZE} • Available offline
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
