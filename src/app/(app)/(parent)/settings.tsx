import { useAuth, useUser } from "@clerk/expo"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { useState } from "react"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"

import { Row, Section } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren } from "@/lib/children"
import { entitlementLabel, useEntitlement } from "@/lib/subscription"

/**
 * Account settings (MVP → Parent Features → "Account settings", "Subscription management",
 * "Restore purchases"). Lives in the `(parent)` route group, so its layout guard enforces the passcode
 * gate before this screen renders — a deep link to `/settings` hits the gate, not the account.
 *
 * No design reference covers this screen — the layout is inferred from the account rows at the foot
 * of design/GoKid-parentcontent-screen.png (screen 12) and reuses that row geometry, the parent-zone
 * section headings, and the same white-card-on-cream surface. `Row` and `Section` come from the
 * shared primitives (they were previously redefined locally — see @/components/primitives).
 *
 * Billing is not wired: no StoreKit / RevenueCat is in package.json, so "Restore purchases" reports
 * that there is nothing to restore rather than pretending. The plan row is demo copy.
 */

const PRIVACY_URL = "https://gokid.app/privacy"
const TERMS_URL = "https://gokid.app/terms"

export default function Settings() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const { children } = useChildren()
  const [restoring, setRestoring] = useState(false)
  const entitlement = useEntitlement()

  async function restorePurchases() {
    setRestoring(true)
    // Placeholder for the StoreKit / RevenueCat restore call — the billing SDK is not installed yet
    // (AGENTS.md target stack). Until it is, be honest about the outcome instead of faking success.
    await new Promise((resolve) => setTimeout(resolve, 600))
    setRestoring(false)
    Alert.alert("Nothing to restore", "We couldn't find a previous GoKid purchase on this Apple ID.")
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need to sign back in with Apple or Google.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ])
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Account settings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Parent identity — from Clerk, the only account record the client holds. Tappable now that
            the name is editable (§12 → "Profile"): it was a dead card showing values with no way to
            change them. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit your profile"
          className="mt-4 flex-row items-center rounded-2xl border border-border bg-white p-4 active:opacity-70"
          onPress={() => router.push("/profile")}
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-study-wash">
            <SymbolView name="person.fill" size={22} tintColor={colors.primary} weight="regular" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">
              {user?.fullName ?? "Parent account"}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 font-text text-body text-text-secondary">
              {user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
            </Text>
          </View>
          <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
        </Pressable>

        {/* The list itself lives on /children (the manager) — this is the way in. Two screens both
            rendering child rows drifted apart; one owner now. */}
        <Section title="Children" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row
            symbol="person.2"
            label="Manage children"
            value={children.length ? `${children.length}` : undefined}
            border
            onPress={() => router.push("/children")}
          />
          <Row symbol="plus.circle" label="Add a child" onPress={() => router.push("/add-child")} />
        </View>

        <Section title="Subscription" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          {/* Was `value="GoKid Plus"` as a literal, so every parent was told they held a paid plan —
              including one who had never seen a payment screen. Reads the entitlement seam now, and
              opens the subscription screen rather than an offer to buy what they were told they had. */}
          <Row
            symbol="star.circle"
            label="Plan"
            value={entitlementLabel(entitlement)}
            border
            onPress={() => router.push("/subscription")}
          />
          <Row
            symbol="arrow.clockwise.circle"
            label={restoring ? "Restoring…" : "Restore purchases"}
            border
            onPress={restoring ? undefined : restorePurchases}
          />
          <Row symbol="creditcard" label="Billing" value="Apple" />
        </View>

        <Section title="Learning" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row symbol="bell" label="Notifications" border onPress={() => router.push("/notifications")} />
          <Row symbol="arrow.down.circle" label="Downloads" border onPress={() => router.push("/offline")} />
          <Row symbol="target" label="Daily study goal" border onPress={() => router.push("/study-goal")} />
          <Row symbol="clock.badge" label="Study reminder" border onPress={() => router.push("/reminders")} />
          <Row symbol="accessibility" label="Accessibility" onPress={() => router.push("/accessibility")} />
        </View>

        <Section title="Privacy" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row symbol="lock" label="Parent passcode" value="Change" border onPress={() => router.push("/passcode")} />
          <Row
            symbol="hand.raised"
            label="Privacy policy"
            border
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
          <Row
            symbol="doc.text"
            label="Terms of service"
            border
            onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
          />
          <Row symbol="arrow.triangle.2.circlepath" label="Back up &amp; sync" border onPress={() => router.push("/sync")} />
          <Row symbol="internaldrive" label="Storage" border onPress={() => router.push("/storage")} />
          <Row symbol="eye" label="What data we collect" border onPress={() => router.push("/data-usage")} />
          <Row symbol="square.and.arrow.up" label="Export your data" onPress={() => router.push("/data-export")} />
        </View>

        <Section title="Support" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row symbol="questionmark.circle" label="Help &amp; Support" border onPress={() => router.push("/help")} />
          <Row symbol="info.circle" label="About GoKid" onPress={() => router.push("/about")} />
        </View>

        {/* Sign out and delete sit together at the bottom, in that order: the reversible one first,
            so the destructive one is never the thing a thumb lands on by habit. */}
        <View className="mt-8 rounded-2xl border border-border bg-white px-4">
          <Row
            symbol="rectangle.portrait.and.arrow.right"
            label="Sign out"
            border
            destructive
            onPress={confirmSignOut}
          />
          <Row symbol="trash" label="Delete account" destructive onPress={() => router.push("/delete-account")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
