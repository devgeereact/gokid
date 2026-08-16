import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Alert, Linking, ScrollView, Text, View } from "react-native"

import { BackButton, Row, Section } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Help & Support (design/gokid-screens.md §18). App Review expects a support surface — a way to reach
 * a human, report a problem, and see what the app is — so this is a launch requirement, not a
 * nice-to-have. Lives in the `(parent)` group: support, feedback and billing questions are the
 * parent's concern, and the gate keeps a child from firing off emails.
 *
 * There is no support backend yet, so "contact" and "report a bug" are honest `mailto:` links rather
 * than a form that pretends to file a ticket. When a helpdesk lands they become API calls.
 */

const SUPPORT_EMAIL = "support@gokid.app"
// No real App Store listing exists yet (pre-launch) — deliberately `null`, not a placeholder numeric
// id. A placeholder like "0000000000" still passes `Linking.canOpenURL` for `itms-apps://`: the OS
// only checks that the App Store app can handle the SCHEME, not that the id resolves to anything, so
// `openExternal`'s honest failure path never fired and a pre-launch tap opened the App Store on a
// broken page. Set this to the real numeric id once the listing exists — the row needs no other change.
const APP_STORE_ID: string | null = null

async function openExternal(url: string, failureMessage: string) {
  try {
    const ok = await Linking.canOpenURL(url)
    if (!ok) throw new Error(`cannot open ${url}`)
    await Linking.openURL(url)
  } catch {
    // No mail client, no Store, or the scheme is unhandled — tell the parent rather than failing silently.
    Alert.alert("Couldn't open that", failureMessage)
  }
}

function mailto(subject: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

export default function Help() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Help &amp; Support</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Friendly intro card */}
        <View className="mt-4 flex-row items-center rounded-2xl bg-study-wash p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
            <SymbolView name="lifepreserver" size={24} tintColor={colors.primary} weight="regular" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">We&apos;re here to help</Text>
            <Text className="mt-0.5 font-text text-body text-text-secondary">
              Answers to common questions, or reach a real person.
            </Text>
          </View>
        </View>

        <Section title="Common questions" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row symbol="questionmark.circle" label="FAQ" onPress={() => router.push("/faq")} />
        </View>

        <Section title="Get in touch" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row
            symbol="envelope"
            label="Contact support"
            border
            onPress={() => openExternal(mailto("GoKid support"), `Email us at ${SUPPORT_EMAIL}.`)}
          />
          <Row
            symbol="text.bubble"
            label="Send feedback"
            border
            onPress={() => openExternal(mailto("GoKid feedback"), `Email us at ${SUPPORT_EMAIL}.`)}
          />
          <Row
            symbol="ant"
            label="Report a bug"
            onPress={() => openExternal(mailto("GoKid bug report"), `Email us at ${SUPPORT_EMAIL}.`)}
          />
        </View>

        <Section title="About" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row
            symbol="star"
            label="Rate GoKid"
            border
            onPress={() =>
              APP_STORE_ID
                ? openExternal(
                    `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`,
                    "The App Store isn't available on this device."
                  )
                : Alert.alert("Not on the App Store yet", "GoKid isn't listed yet, so there's nothing to rate. Check back after launch.")
            }
          />
          <Row symbol="info.circle" label="About GoKid" onPress={() => router.push("/about")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
