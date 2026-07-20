import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { plural } from "@/lib/analytics"
import { useDownloads } from "@/lib/downloads"
import { SubjectMark } from "@/components/subject-mark"
import { getSubject, subjectSlug } from "@/lib/subjects"

/**
 * Downloads / offline (design/GoKid-offlinesync-screen.png, screen 14; gokid-screens.md §14 →
 * "Download Manager", "Download Queue", "Delete Download").
 *
 * Now a real manager over real files. Until `expo-file-system` was installed this screen could only
 * show an empty state, because nothing in the app could write to disk — and the mockup it came from
 * listed three "downloaded" sets, which told a parent their child could study on a plane when they
 * could not.
 *
 * The list is built by reading the downloads folder itself (see lib/downloads.ts), not a manifest
 * kept alongside it. A manifest claiming "downloaded" for a file the OS has since removed is exactly
 * the failure this feature exists to prevent.
 */

function formatBytes(bytes: number) {
  if (bytes <= 0) return "—"
  if (bytes < 1024) return plural(bytes, "byte")
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Offline() {
  const { entries, ids, totalBytes, remove } = useDownloads()

  function confirmRemove(setId: string, title: string) {
    Alert.alert("Remove download?", `${title} will need a connection again until you download it once more.`, [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => remove(setId) },
    ])
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Downloads</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-1" showsVerticalScrollIndicator={false}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="You're offline — everything's saved."
          className="aspect-[820/636] w-full rounded-2xl"
          contentFit="cover"
          source={require("../../../assets/images/gokid-offline-hero.png")}
        />

        {ids.length === 0 ? (
          <View className="mt-8">
            <EmptyState
              symbol="arrow.down.circle"
              title="No downloads yet"
              body="Open any set and tap Download to keep it on this device. Downloaded sets work with no connection at all."
              actionLabel="Find a set"
              onAction={() => router.replace("/study")}
            />
          </View>
        ) : (
          <>
            <View className="mb-4 mt-8 flex-row items-end justify-between">
              <Text className="font-text text-h2 font-bold text-ink">Downloaded sets</Text>
              <Text className="font-text text-caption text-text-secondary">
                {plural(ids.length, "set")} · {formatBytes(totalBytes)}
              </Text>
            </View>

            {ids.map((setId) => {
              const entry = entries[setId]
              // Title comes out of the downloaded file itself, so the manager reads correctly with
              // no connection — which is when it matters most.
              const title = entry?.title ?? setId
              const subject = getSubject(subjectSlug(entry?.subject ?? "") ?? "")
              return (
                <View
                  key={setId}
                  className="mb-3 flex-row items-center rounded-lg border border-border bg-white p-3"
                >
                  {subject ? (
                    <SubjectMark subject={subject} className="h-11 w-11" symbolSize={18} />
                  ) : (
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-study-wash">
                      <SymbolView name="arrow.down.circle.fill" size={20} tintColor={colors.primary} weight="semibold" />
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text numberOfLines={2} className="font-text text-body font-bold text-ink">
                      {title}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 font-text text-caption text-text-secondary">
                      {entry?.topic ? `${entry.topic} · ` : ""}
                      {formatBytes(entry?.bytes ?? 0)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${title} from downloads`}
                    className="ml-2 h-9 w-9 items-center justify-center active:opacity-60"
                    hitSlop={6}
                    onPress={() => confirmRemove(setId, title)}
                  >
                    <SymbolView name="trash" size={18} tintColor={colors.error} weight="semibold" />
                  </Pressable>
                </View>
              )
            })}

            <Text className="mt-2 font-text text-caption text-text-secondary">
              These work with no connection. Removing one frees its space and needs a connection to
              download again.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
