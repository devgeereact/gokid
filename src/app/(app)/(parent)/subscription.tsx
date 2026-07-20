import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { ScrollView, Text, View } from "react-native"

import { BackButton, Row } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { entitlementLabel, manageSubscriptionUrl, useEntitlement } from "@/lib/subscription"

/**
 * Manage Subscription (design/gokid-screens.md §11 → "Manage Subscription").
 *
 * Previously the "Plan" row in Settings read `value="GoKid Plus"` as a hardcoded literal and opened
 * the paywall. Every parent was therefore told they held a paid plan, including parents who had
 * never seen a payment screen — and the only thing that row led to was an offer to buy it again.
 *
 * This screen states the real entitlement (see lib/subscription.ts, which is honest that no billing
 * SDK exists and everyone is on the free tier), and sends a parent who wants to change anything to
 * the platform's own subscription settings. That is not a workaround: Apple and Google both require
 * cancellation to happen there, so this link is correct now *and* after billing lands.
 *
 * Deliberately not built: Subscription Success, Trial Active, Trial Ending Soon, Subscription
 * Expired and Billing Failed. Each of those renders in response to a billing event, and this app can
 * receive none — a "Trial ending soon" screen with no trial behind it is a fabrication, and a more
 * damaging one than a wrong figure because a parent may act on it.
 */

export default function Subscription() {
  const entitlement = useEntitlement()
  const free = entitlement.status === "free"
  const manageUrl = manageSubscriptionUrl()
  const store = manageUrl.includes("apple") ? "Apple" : "Google"
  const account = store === "Apple" ? "Apple ID" : "Google Play"

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Subscription</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {/* Current status, from the entitlement seam rather than a literal. */}
        <View className="mt-2 rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-study-wash">
              <SymbolView name="star.circle" size={24} tintColor={colors.primary} weight="regular" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-text text-caption text-text-secondary">Current plan</Text>
              <Text className="mt-0.5 font-text text-h3 font-bold text-ink">
                {entitlementLabel(entitlement)}
              </Text>
            </View>
          </View>

          {free ? (
            <Text className="mt-4 font-text text-body text-text-secondary">
              You are not paying for GoKid, and nothing is being charged. Every set, quiz and progress
              screen in the app today is free to use.
            </Text>
          ) : null}
        </View>

        {/* Honest about the state of the product rather than showing an offer that cannot complete. */}
        {free ? (
          <View className="mt-4 rounded-2xl border border-border bg-white p-4">
            <View className="flex-row items-center">
              <SymbolView name="info.circle" size={18} tintColor={colors.primary} weight="semibold" />
              <Text className="ml-3 flex-1 font-text text-body-lg font-bold text-ink">
                Paid plans aren’t available yet
              </Text>
            </View>
            <Text className="mt-2 font-text text-body text-text-secondary">
              GoKid can’t take payments yet, so there is nothing to buy, upgrade or cancel. When
              subscriptions arrive you’ll see the plan, the price and the renewal date here before
              anything is charged.
            </Text>
          </View>
        ) : null}

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Manage</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          {/* Works today and after billing lands: Apple and Google require cancellation to go
              through their own settings, so this is where it belongs either way. */}
          <Row
            symbol="arrow.up.forward.app"
            label="Subscription settings"
            border
            onPress={() => void WebBrowser.openBrowserAsync(manageUrl)}
          />
          <Row symbol="questionmark.circle" label="Help &amp; Support" onPress={() => router.push("/help")} />
        </View>

        <Text className="mt-4 font-text text-caption text-text-secondary">
          Subscriptions are handled by {store}, not by GoKid. Anything you buy, pause or cancel
          happens in your {account} account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
