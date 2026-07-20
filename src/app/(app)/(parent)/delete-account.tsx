import { useUser } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren } from "@/lib/children"
import { clearAllBookmarks } from "@/lib/bookmarks"
import { clearAllDownloads } from "@/lib/downloads"
import { clearAllProgress } from "@/lib/reviews"

/**
 * Delete Account (design/gokid-screens.md §16 → Privacy → "Delete Account"). Until now the only exit
 * was Sign out, which leaves every trace in place — App Store Review rejects account-creating apps
 * that offer no deletion, and UK GDPR Article 17 requires it regardless.
 *
 * Already behind the parent maths gate by virtue of living in `(parent)`. On top of that it asks the
 * parent to type DELETE, because this cannot be undone and a mis-tap must not be enough. That is not
 * friction for its own sake: the thing being destroyed is a child's entire learning history.
 *
 * Order matters. Clerk goes first, and the local study record is only wiped once the account is
 * really gone — the reverse would strand a parent whose deletion failed with their progress already
 * destroyed. Deleting the Clerk user invalidates the session, so the root guard lands them back on
 * sign-in without an explicit navigation.
 */

const CONFIRM_WORD = "DELETE"

export default function DeleteAccount() {
  const { user } = useUser()
  const { children } = useChildren()
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const armed = typed.trim().toUpperCase() === CONFIRM_WORD && !busy

  async function reallyDelete() {
    setBusy(true)
    setFailed(false)
    try {
      // Clerk first: this is the step that can fail, and the one that must succeed for the rest to
      // be safe. It removes the account, the children in unsafeMetadata, and the session with it.
      await user?.delete()
      // Only now is destroying the on-device data correct. Every on-device store has to be listed
      // here — a store added later and not added here leaves a child's data behind after a deletion
      // the parent was told was complete.
      await clearAllProgress()
      await clearAllBookmarks()
      clearAllDownloads()
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "delete-account" } })
      setFailed(true)
      setBusy(false)
    }
  }

  function confirm() {
    if (!armed) return
    Alert.alert(
      "Delete your account?",
      "This erases your account and every child's learning history. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete everything", style: "destructive", onPress: () => void reallyDelete() },
      ]
    )
  }

  const childCount =
    children.length === 0 ? "No child profiles" : children.length === 1 ? "1 child profile" : `${children.length} child profiles`

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Delete account</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <View className="mt-4 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-badge-practice">
            <SymbolView
              name="exclamationmark.triangle.fill"
              size={30}
              tintColor={colors.badge["practice-ink"]}
              weight="semibold"
            />
          </View>
          <Text className="mt-4 text-center font-text text-h2 font-bold text-ink">This cannot be undone</Text>
          <Text className="mt-2 text-center font-text text-body-lg text-text-secondary">
            Deleting your account erases everything below, immediately and permanently.
          </Text>
        </View>

        {failed ? (
          <View className="mt-6">
            <AlertBanner
              title="We couldn’t delete your account"
              body="Nothing was deleted and you are still signed in. Try again, or contact us from Help if it keeps failing."
              onDismiss={() => setFailed(false)}
            />
          </View>
        ) : null}

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">What gets deleted</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          {[
            { label: "Your account", detail: user?.primaryEmailAddress?.emailAddress ?? "Your sign-in" },
            { label: "Child profiles", detail: childCount },
            { label: "All learning history", detail: "Cards and sessions" },
            { label: "Certificates and achievements", detail: "Everything earned" },
          ].map((row, i) => (
            <View key={row.label} className={`flex-row items-center py-4 ${i === 0 ? "" : "border-t border-border"}`}>
              <SymbolView name="trash" size={20} tintColor={colors.error} weight="semibold" />
              <Text className="ml-3 flex-1 font-text text-body-lg text-ink">{row.label}</Text>
              <Text numberOfLines={1} className="max-w-[45%] font-text text-caption text-text-secondary">
                {row.detail}
              </Text>
            </View>
          ))}
        </View>

        {/* Offered before the destructive control, not after — a parent who wants a copy should not
            have to discover that on the far side of deleting it. */}
        <Pressable
          accessibilityRole="button"
          className="mt-4 flex-row items-center rounded-2xl border border-border bg-white p-4 active:opacity-70"
          onPress={() => router.push("/data-export")}
        >
          <SymbolView name="square.and.arrow.up" size={20} tintColor={colors.primary} weight="semibold" />
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">Export your data first</Text>
            <Text className="mt-0.5 font-text text-caption text-text-secondary">
              Keep a copy of their progress before it goes.
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={colors["text-secondary"]} weight="semibold" />
        </Pressable>

        <Text className="mb-2 mt-8 font-text text-h3 font-bold text-ink">
          Type {CONFIRM_WORD} to confirm
        </Text>
        <TextInput
          accessibilityLabel={`Type ${CONFIRM_WORD} to confirm deletion`}
          autoCapitalize="characters"
          autoCorrect={false}
          className="h-14 rounded-xl border border-border bg-white px-4 font-text text-body-lg text-ink"
          editable={!busy}
          onChangeText={setTyped}
          placeholder={CONFIRM_WORD}
          placeholderTextColor={colors["text-secondary"]}
          value={typed}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete my account permanently"
          accessibilityState={{ busy, disabled: !armed }}
          className={`mt-4 h-14 flex-row items-center justify-center gap-3 rounded-button active:opacity-80 ${
            armed ? "bg-error" : "bg-error/40"
          }`}
          disabled={!armed}
          onPress={confirm}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : null}
          <Text className="font-text text-body-lg font-bold text-white">
            {busy ? "Deleting…" : "Delete my account"}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center font-text text-caption text-text-secondary">
          Changed your mind? Just go back — nothing has happened yet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
