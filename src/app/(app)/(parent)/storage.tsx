import * as SecureStore from "expo-secure-store"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useEffect, useState } from "react"
import { ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { plural } from "@/lib/analytics"
import { useDownloads } from "@/lib/downloads"

/**
 * Storage Usage (design/gokid-screens.md §10 → Settings → "Storage Usage").
 *
 * Measures what is genuinely on this device: the app's own key-value records, sized by reading each
 * store and counting the bytes of what comes back. Nothing is estimated and nothing is padded.
 *
 * What this screen deliberately does **not** claim: a total for the app bundle, caches, or downloaded
 * sets. There is no download pipeline yet (that needs `expo-file-system`), and reporting a made-up
 * "downloads: 42 MB" would be exactly the kind of confident-but-invented figure this project has
 * spent several passes removing. When downloads land, they get a row here and this note goes.
 *
 * The honest headline is that GoKid's own records are tiny — which is itself the useful answer for a
 * parent wondering what a learning app is keeping on their child's device.
 */

const STORES: { key: string; label: string; detail: string; symbol: SFSymbol }[] = [
  {
    key: "gokid.progress.v1",
    label: "Study record",
    detail: "Every card and session — what powers progress",
    symbol: "chart.bar",
  },
  { key: "gokid.bookmarks.v1", label: "Favourites", detail: "Sets and cards saved for later", symbol: "bookmark" },
  { key: "gokid.prefs.v1", label: "Preferences", detail: "Accessibility and study goal", symbol: "gearshape" },
  { key: "gokid.intro.seen", label: "App state", detail: "Whether the intro has been shown", symbol: "iphone" },
]

function formatBytes(bytes: number) {
  if (bytes <= 0) return "Empty"
  if (bytes < 1024) return plural(bytes, "byte")
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Row = { key: string; bytes: number }

export default function Storage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const { totalBytes: downloadBytes } = useDownloads()

  useEffect(() => {
    let active = true
    Promise.all(
      STORES.map(async (store) => {
        try {
          const raw = await SecureStore.getItemAsync(store.key)
          // Byte length, not character count — a JSON blob of card ids is ASCII, but a child's name
          // may not be, and reporting the wrong unit on a screen about sizes would be careless.
          return { key: store.key, bytes: raw ? new TextEncoder().encode(raw).length : 0 }
        } catch {
          // A store that cannot be read is reported as 0 rather than failing the whole screen: this
          // is an informational page, not a critical path.
          return { key: store.key, bytes: 0 }
        }
      })
    ).then((result) => {
      if (active) setRows(result)
    })
    return () => {
      active = false
    }
  }, [])

  const total = (rows?.reduce((sum, r) => sum + r.bytes, 0) ?? 0) + downloadBytes

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Storage</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border border-border bg-white p-5">
          <Text className="font-text text-h1 font-bold text-ink">
            {rows === null ? "…" : formatBytes(total)}
          </Text>
          <Text className="mt-1 font-text text-body-lg text-text-secondary">
            kept on this device by GoKid
          </Text>
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">What that is</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          {STORES.map((store, i) => {
            const row = rows?.find((r) => r.key === store.key)
            return (
              <View
                key={store.key}
                className={`flex-row items-center py-4 ${i === STORES.length - 1 ? "" : "border-b border-border"}`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-study-wash">
                  <SymbolView name={store.symbol} size={16} tintColor={colors.primary} weight="semibold" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-text text-body-lg font-semibold text-ink">{store.label}</Text>
                  <Text numberOfLines={2} className="mt-0.5 font-text text-caption text-text-secondary">
                    {store.detail}
                  </Text>
                </View>
                <Text className="ml-2 font-text text-body font-bold text-ink">
                  {rows === null ? "…" : formatBytes(row?.bytes ?? 0)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Downloads are real files now, so they are measured like everything else rather than
            carrying a "not here yet" note. */}
        <View className="mt-4 flex-row items-center rounded-2xl border border-border bg-white px-4 py-4">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-study-wash">
            <SymbolView name="arrow.down.circle" size={16} tintColor={colors.primary} weight="semibold" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-semibold text-ink">Downloaded sets</Text>
            <Text className="mt-0.5 font-text text-caption text-text-secondary">
              Cards and quizzes saved for offline study
            </Text>
          </View>
          <Text className="ml-2 font-text text-body font-bold text-ink">{formatBytes(downloadBytes)}</Text>
        </View>

        <Text className="mt-6 text-center font-text text-caption text-text-secondary">
          Deleting your account removes all of this. See Settings → Privacy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
