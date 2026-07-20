import { useUser } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren, yearLabel } from "@/lib/children"
import { useAllProgress } from "@/lib/reviews"

/**
 * Data Export (design/gokid-screens.md §16 → Privacy → "Data Export").
 *
 * UK GDPR Article 20 (portability) wants the data in a structured, commonly used, machine-readable
 * form — so it is JSON, not a formatted summary. It goes out through the system share sheet, which
 * lets the parent put it wherever they want (Files, Mail, Notes) without GoKid needing storage or
 * network permissions, and without a new native dependency.
 *
 * The payload is assembled here from the two places data actually lives — Clerk `unsafeMetadata` for
 * profiles, the on-device spaced-repetition store for study history. If a third store is ever added,
 * it has to be added here too, or this screen quietly starts lying about being complete.
 */

function exportedAt() {
  // Clock read outside the component body — the React Compiler rejects `Date.now()` during render.
  return new Date().toISOString()
}

export default function DataExport() {
  const { user } = useUser()
  const { children } = useChildren()
  const progress = useAllProgress()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const totalSessions = Object.values(progress).reduce((sum, p) => sum + p.sessions.length, 0)
  const totalCards = Object.values(progress).reduce((sum, p) => sum + Object.keys(p.cards).length, 0)

  async function exportData() {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      const payload = {
        exportedAt: exportedAt(),
        format: "gokid.export.v1",
        account: {
          id: user?.id ?? null,
          email: user?.primaryEmailAddress?.emailAddress ?? null,
          createdAt: user?.createdAt?.toISOString() ?? null,
        },
        children: children.map((child) => ({
          id: child.id,
          name: child.name,
          yearGroup: child.yearGroup,
          avatar: child.avatar,
          // Study record for this child, flattened out of the keyed store.
          cards: Object.values(progress[child.id]?.cards ?? {}),
          sessions: progress[child.id]?.sessions ?? [],
        })),
      }

      const result = await Share.share({
        title: "GoKid data export",
        message: JSON.stringify(payload, null, 2),
      })
      // `dismissedAction` is the parent closing the sheet — a decision, not a failure.
      if (result.action === Share.dismissedAction) return
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "data-export" } })
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Export your data</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mt-4 font-text text-body-lg text-text-secondary">
          A copy of everything GoKid holds about you and your children, as a JSON file you can save or
          send anywhere.
        </Text>

        {failed ? (
          <View className="mt-4">
            <AlertBanner
              title="Export didn’t finish"
              body="Nothing was sent. Have another go — we’ve logged what went wrong."
              onDismiss={() => setFailed(false)}
            />
          </View>
        ) : null}

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">What’s included</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          <View className="flex-row items-center border-b border-border py-4">
            <SymbolView name="person.crop.circle" size={20} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body-lg text-ink">Your account</Text>
            <Text className="font-text text-body text-text-secondary">Email, sign-up date</Text>
          </View>
          <View className="flex-row items-center border-b border-border py-4">
            <SymbolView name="person.2" size={20} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body-lg text-ink">Children</Text>
            <Text className="font-text text-body text-text-secondary">
              {children.length === 1 ? "1 profile" : `${children.length} profiles`}
            </Text>
          </View>
          <View className="flex-row items-center border-b border-border py-4">
            <SymbolView name="rectangle.on.rectangle" size={20} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body-lg text-ink">Card history</Text>
            <Text className="font-text text-body text-text-secondary">
              {totalCards === 1 ? "1 card" : `${totalCards} cards`}
            </Text>
          </View>
          <View className="flex-row items-center py-4">
            <SymbolView name="clock" size={20} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body-lg text-ink">Study sessions</Text>
            <Text className="font-text text-body text-text-secondary">
              {totalSessions === 1 ? "1 session" : `${totalSessions} sessions`}
            </Text>
          </View>
        </View>

        {children.length > 0 ? (
          <View className="mt-4 rounded-2xl border border-border bg-white px-4 py-2">
            {children.map((child) => (
              <View key={child.id} className="flex-row items-center py-2">
                <Text className="flex-1 font-text text-body text-ink">{child.name}</Text>
                <Text className="font-text text-caption text-text-secondary">{yearLabel(child.yearGroup)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export my data"
          accessibilityState={{ busy, disabled: busy }}
          className={`mt-8 h-14 flex-row items-center justify-center gap-3 rounded-button bg-primary active:opacity-80 ${
            busy ? "opacity-60" : ""
          }`}
          disabled={busy}
          onPress={() => void exportData()}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <SymbolView name="square.and.arrow.up" size={20} tintColor={colors.white} weight="semibold" />
          )}
          <Text className="font-text text-body-lg font-bold text-white">
            {busy ? "Preparing…" : "Export my data"}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center font-text text-caption text-text-secondary">
          The export contains your children’s first names. Keep it somewhere you would keep anything
          else about them.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
