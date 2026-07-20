import Constants from "expo-constants"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { ScrollView, Text, View } from "react-native"

import { BackButton, Row } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * About GoKid (design/gokid-screens.md §18 → "About GoKid", "App Version"). App identity, the build
 * version App Review and support both ask for, and the legal links. Version is read from
 * `expo-constants` so it always matches the shipped build rather than a typed string that drifts.
 */

const PRIVACY_URL = "https://gokid.app/privacy"
const TERMS_URL = "https://gokid.app/terms"

// `version` is the JS/OTA version from app.json; `nativeBuildVersion` is the store build number when
// present (a dev client may not expose it). Shown together the way a support agent needs them.
const version = Constants.expoConfig?.version ?? "1.0.0"
const build = Constants.nativeBuildVersion
// Computed once at module load — a copyright year does not need a render-time clock read (which the
// React Compiler treats as impure anyway).
const year = new Date().getFullYear()

export default function About() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">About GoKid</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View className="mt-6 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-study-wash">
            <SymbolView name="graduationcap.fill" size={38} tintColor={colors.primary} weight="semibold" />
          </View>
          <Text className="mt-4 font-text text-h2 font-bold text-ink">GoKid</Text>
          <Text className="mt-1 font-text text-body text-text-secondary">
            Version {version}
            {build ? ` (${build})` : ""}
          </Text>
          <Text className="mt-4 px-4 text-center font-text text-body text-text-secondary">
            Calm, curriculum-aligned learning for primary school. No streaks, no ads — just what your
            child is learning, and when to bring it back.
          </Text>
        </View>

        <View className="mt-8 rounded-2xl border border-border bg-white px-4">
          <Row
            symbol="hand.raised"
            label="Privacy policy"
            border
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
          <Row symbol="doc.text" label="Terms of service" onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)} />
        </View>

        <View className="mt-8 rounded-2xl border border-border bg-white px-4">
          <Row symbol="questionmark.circle" label="Help &amp; Support" onPress={() => router.push("/help")} />
        </View>

        <Text className="mt-8 text-center font-text text-caption text-text-secondary">
          Made for curious kids. © {year} GoKid
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
