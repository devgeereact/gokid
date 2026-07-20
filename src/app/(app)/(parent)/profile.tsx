import { useUser } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Profile (design/gokid-screens.md §12 → General → "Profile": read-only Clerk name/email, no
 * editable fields).
 *
 * The name is now editable. The email deliberately is not, and that is a decision rather than an
 * omission: every account here is created through Apple or Google SSO, so the address *is* the
 * identity the provider vouches for. Letting a parent type a different one in-app would either be a
 * lie (a display value diverging from the account that actually signs them in) or a full
 * change-email flow with re-verification, which SSO makes redundant. The screen says which it is.
 *
 * This is a parent screen behind the maths gate. The only name stored is the parent's own — children
 * are first names in `unsafeMetadata` and are edited in the child form, not here.
 */

export default function Profile() {
  const { user, isLoaded } = useUser()
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState(false)

  const email = user?.primaryEmailAddress?.emailAddress
  // Trimmed comparison: whitespace-only edits are not changes worth enabling a save button for.
  const dirty =
    firstName.trim() !== (user?.firstName ?? "").trim() || lastName.trim() !== (user?.lastName ?? "").trim()

  async function save() {
    if (!user || !dirty || saving) return
    setSaving(true)
    setFailed(false)
    setSaved(false)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setSaved(true)
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "profile-update" } })
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Your profile</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {failed ? (
          <View className="mb-4">
            <AlertBanner
              title="We couldn’t save that"
              body="Nothing was changed. Check your connection and try again."
              onDismiss={() => setFailed(false)}
            />
          </View>
        ) : null}
        {saved ? (
          <View className="mb-4">
            <AlertBanner tone="info" title="Saved" symbol="checkmark.circle.fill" onDismiss={() => setSaved(false)} />
          </View>
        ) : null}

        <Text className="mb-3 font-text text-h3 font-bold text-ink">Your name</Text>
        <View className="rounded-2xl border border-border bg-white p-4">
          <Text className="font-text text-caption text-text-secondary">First name</Text>
          <TextInput
            accessibilityLabel="Your first name"
            autoCapitalize="words"
            autoCorrect={false}
            className="mt-2 h-13 rounded-xl border border-border bg-background px-4 font-text text-body-lg text-ink"
            editable={!saving && isLoaded}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors["text-secondary"]}
            value={firstName}
          />

          <Text className="mt-4 font-text text-caption text-text-secondary">Last name</Text>
          <TextInput
            accessibilityLabel="Your last name"
            autoCapitalize="words"
            autoCorrect={false}
            className="mt-2 h-13 rounded-xl border border-border bg-background px-4 font-text text-body-lg text-ink"
            editable={!saving && isLoaded}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors["text-secondary"]}
            value={lastName}
          />

          <Text className="mt-3 font-text text-caption text-text-secondary">
            This is your name, not your child’s. Children are edited in the Children screen.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save your name"
          accessibilityState={{ disabled: !dirty || saving, busy: saving }}
          className={`mt-4 h-14 flex-row items-center justify-center gap-2 rounded-button active:opacity-80 ${
            dirty && !saving ? "bg-primary" : "bg-primary/40"
          }`}
          disabled={!dirty || saving}
          onPress={() => void save()}
        >
          {saving ? <ActivityIndicator color={colors.white} /> : null}
          <Text className="font-text text-body-lg font-bold text-white">{saving ? "Saving…" : "Save"}</Text>
        </Pressable>

        {/* Read-only, and said out loud rather than shown greyed with no explanation. */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Sign-in</Text>
        <View className="rounded-2xl border border-border bg-white p-4">
          <View className="flex-row items-center">
            <SymbolView name="envelope" size={18} tintColor={colors.primary} weight="semibold" />
            <Text numberOfLines={1} className="ml-3 flex-1 font-text text-body-lg text-ink">
              {email ?? "Signed in"}
            </Text>
          </View>
          <Text className="mt-3 font-text text-caption text-text-secondary">
            You sign in with Apple or Google, so this address comes from them and can’t be changed
            here. Change it with your provider and it updates the next time you sign in.
          </Text>
        </View>

        <View className="mt-6 rounded-2xl border border-border bg-white px-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="What data we collect"
            className="h-14 flex-row items-center active:opacity-60"
            onPress={() => router.push("/data-usage")}
          >
            <SymbolView name="eye" size={20} tintColor={colors.ink} weight="regular" />
            <Text className="ml-4 flex-1 font-text text-body-lg font-semibold text-ink">
              What we collect about you
            </Text>
            <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
