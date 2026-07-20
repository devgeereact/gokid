import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useDownloads } from "@/lib/downloads"
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

type DownloadTarget = "device" | "icloud"

const TARGETS: { key: DownloadTarget; symbol: SFSymbol; title: string; sub: string }[] = [
  { key: "device", symbol: "iphone", title: "This device", sub: "iPhone" },
  { key: "icloud", symbol: "icloud", title: "iCloud", sub: "All your devices" },
]

/**
 * "Works offline / Use anywhere" and "Yours forever / Keep forever" were claims about a download
 * that never happened — the same falsehood as the button below, in a different shape. Only the
 * child-safety claim is true today (no ads, no trackers — see app/data-usage.tsx), so it is the only
 * one that stays. The other two return when there is a pipeline that makes them true.
 */
const FEATURES: { symbol: SFSymbol; tint: string; title: string; sub: string }[] = [
  { symbol: "checkmark.shield", tint: colors.success, title: "Child-safe", sub: "No ads, ever" },
  { symbol: "book", tint: colors.primary, title: "Curriculum", sub: "UK National" },
  { symbol: "wifi", tint: colors.primary, title: "Needs internet", sub: "For now" },
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
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const { isDownloaded, download, remove } = useDownloads()

  if (!set) return <Redirect href="/home" />

  const setId = set.id
  const downloaded = isDownloaded(setId)
  const previews = set.quiz.slice(0, 5)

  async function start() {
    setBusy(true)
    setFailed(false)
    const ok = await download(setId)
    if (!ok) setFailed(true)
    setBusy(false)
  }

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

        {/* Download to — kept visible but disabled: it picks between two destinations that do not
            exist, and an enabled control implies a choice that has an effect. */}
        <Text className="mb-3 mt-6 font-text text-h3 font-bold text-ink">Download to</Text>
        <View className="flex-row gap-3">
          {TARGETS.map((t) => {
            const selected = target === t.key
            return (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityLabel={`Download to ${t.title}. Not available yet.`}
                accessibilityState={{ disabled: true }}
                disabled
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

        {/* Real now: writes the set's cards and questions to disk via lib/downloads.ts. This button
            previously called `router.back()` under the words "Available offline". */}
        {failed ? (
          <View className="mt-6">
            <AlertBanner
              title="That didn’t save"
              body="Nothing was downloaded. Check your connection and space, then try again."
              onDismiss={() => setFailed(false)}
            />
          </View>
        ) : null}

        {downloaded ? (
          <>
            <View className="mt-6 flex-row items-center rounded-2xl bg-badge-strong p-4">
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.badge["strong-ink"]} weight="semibold" />
              <Text className="ml-3 flex-1 font-text text-body-lg font-bold text-badge-strong-ink">
                Saved for offline use
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove this download"
              className="mt-4 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
              onPress={() => remove(setId)}
            >
              <Text className="font-text text-body-lg font-bold text-ink">Remove download</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download this set"
            accessibilityState={{ busy: busy, disabled: busy }}
            className={`mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90 ${
              busy ? "opacity-60" : ""
            }`}
            disabled={busy}
            onPress={() => void start()}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <SymbolView name="arrow.down" size={20} tintColor={colors.white} weight="semibold" />
            )}
            <Text className="font-text text-body-lg font-bold text-white">
              {busy ? "Saving…" : "Download set"}
            </Text>
          </Pressable>
        )}

        <Text className="mt-3 text-center font-text text-caption text-text-secondary">
          {downloaded
            ? "The cards and quiz are on this device. They work with no connection."
            : "Saves the cards and quiz to this device so they work with no connection."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
