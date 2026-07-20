import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Data Usage Explanation (design/gokid-screens.md §1 → "Data Usage Explanation").
 *
 * Deliberately a root route, not a `(app)` one: it is linked from the sign-in screen, where there is
 * no session yet, and from Settings, where there is. A parent must be able to read what we collect
 * *before* deciding to create an account — putting it behind the auth guard would defeat the point.
 *
 * Every claim here is checked against what the app actually does, and must be re-checked whenever
 * that changes. Getting this wrong is not a copy bug, it is a false privacy representation about a
 * children's product (UK GDPR / the Children's Code):
 *   - children's names, year groups and avatars live in Clerk `unsafeMetadata` (see lib/children.ts)
 *   - study progress is the spaced-repetition record in lib/reviews.ts, on-device via expo-secure-store
 *   - Sentry runs with `sendDefaultPii: false` (see app/_layout.tsx) — no IPs, no user identifiers
 *   - there is no ad SDK, no analytics SDK, and no third-party tracker in package.json
 */

const PRIVACY_URL = "https://gokid.app/privacy"

type Entry = { symbol: SFSymbol; title: string; body: string }

const COLLECTED: Entry[] = [
  {
    symbol: "envelope",
    title: "Your email address",
    body: "From Apple or Google when you sign in. It identifies your account and is the only way we can reach you. Nothing else comes across from them.",
  },
  {
    symbol: "person.2",
    title: "Your child’s first name and school year",
    body: "You type these in. They personalise the app and pick the right curriculum. A first name is enough — please don’t add a surname.",
  },
  {
    symbol: "chart.bar",
    title: "What your child has studied",
    body: "Which sets they opened, how long for, and how well each card is sticking. This is what powers the progress screens and decides what comes back for review.",
  },
]

const NOT_COLLECTED = [
  "No advertising, and no ad networks in the app",
  "No selling or sharing of your data with anyone",
  "No location, contacts, photos, microphone or camera",
  "No third-party analytics or tracking",
  "No account for your child, and no way for them to message anyone",
]

function EntryRow({ entry, first }: { entry: Entry; first: boolean }) {
  return (
    <View className={`flex-row py-4 ${first ? "" : "border-t border-border"}`}>
      <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-study-wash">
        <SymbolView name={entry.symbol} size={18} tintColor={colors.primary} weight="semibold" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{entry.title}</Text>
        <Text className="mt-1 font-text text-body text-text-secondary">{entry.body}</Text>
      </View>
    </View>
  )
}

export default function DataUsage() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Your data</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mt-4 font-text text-h2 font-bold text-ink">What GoKid collects</Text>
        <Text className="mt-2 font-text text-body-lg text-text-secondary">
          The short version: enough to teach your child, and nothing else. Here is the whole list.
        </Text>

        <View className="mt-6 rounded-2xl border border-border bg-white px-4">
          {COLLECTED.map((entry, i) => (
            <EntryRow key={entry.title} entry={entry} first={i === 0} />
          ))}
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">What we never do</Text>
        <View className="rounded-2xl border border-border bg-white px-4 py-2">
          {NOT_COLLECTED.map((line) => (
            <View key={line} className="flex-row items-start py-2">
              <View className="mt-0.5">
                <SymbolView name="checkmark.circle.fill" size={18} tintColor={colors.success} weight="semibold" />
              </View>
              <Text className="ml-3 flex-1 font-text text-body text-ink">{line}</Text>
            </View>
          ))}
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Where it lives</Text>
        <View className="rounded-2xl border border-border bg-white p-4">
          <Text className="font-text text-body text-text-secondary">
            Your child’s study record is stored on this device. Your account and your children’s
            profiles are held by Clerk, our sign-in provider. Crash reports go to Sentry with personal
            details switched off, so we see the fault and not the person.
          </Text>
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">You stay in control</Text>
        <View className="rounded-2xl border border-border bg-white p-4">
          <Text className="font-text text-body text-text-secondary">
            You can export everything we hold, or delete your account and all of it, at any time from
            Settings → Privacy. Deleting is immediate and cannot be undone.
          </Text>
        </View>

        <Text
          accessibilityRole="link"
          className="mt-8 text-center font-text text-body font-semibold text-primary"
          onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
        >
          Read the full privacy policy
        </Text>

        <Text
          accessibilityRole="button"
          className="mt-6 text-center font-text text-body font-semibold text-text-secondary"
          onPress={() => router.back()}
        >
          Close
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
