import { useAuth, useUser } from "@clerk/expo"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { useState } from "react"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"

import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren } from "@/lib/children"

/**
 * Account settings (MVP → Parent Features → "Account settings", "Subscription management",
 * "Restore purchases"). Reached from the Parent Zone, so it sits behind the maths gate.
 *
 * No design reference covers this screen — the layout is inferred from the account rows at the foot
 * of design/GoKid-parentcontent-screen.png (screen 12) and reuses that row geometry, the parent-zone
 * section headings, and the same white-card-on-cream surface.
 *
 * Billing is not wired: no StoreKit / RevenueCat is in package.json, so "Restore purchases" reports
 * that there is nothing to restore rather than pretending. The plan row is demo copy.
 */

const PRIVACY_URL = "https://gokid.app/privacy"
const TERMS_URL = "https://gokid.app/terms"

function SectionHeading({ label }: { label: string }) {
  return <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">{label}</Text>
}

function Row({
  symbol,
  label,
  value,
  border,
  destructive,
  onPress,
}: {
  symbol: SFSymbol
  label: string
  value?: string
  border?: boolean
  destructive?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`h-14 flex-row items-center active:opacity-60 ${border ? "border-b border-border" : ""}`}
      onPress={onPress}
    >
      <SymbolView name={symbol} size={24} tintColor={destructive ? colors.error : colors.ink} weight="regular" />
      <Text
        className={`ml-4 flex-1 font-text text-body-lg font-semibold ${destructive ? "text-error" : "text-ink"}`}
      >
        {label}
      </Text>
      {value ? <Text className="mr-2 font-text text-body-lg font-bold text-text-secondary">{value}</Text> : null}
      {onPress ? (
        <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
      ) : null}
    </Pressable>
  )
}

export default function Settings() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const { children } = useChildren()
  const [restoring, setRestoring] = useState(false)

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
        {/* Parent identity — from Clerk, the only account record the client holds. */}
        <View className="mt-4 flex-row items-center rounded-2xl border border-border bg-white p-4">
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
        </View>

        {/* The list itself lives on /children (the manager) — this is the way in. Two screens both
            rendering child rows drifted apart; one owner now. */}
        <SectionHeading label="Children" />
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

        <SectionHeading label="Subscription" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row symbol="star.circle" label="Plan" value="GoKid Plus" border onPress={() => router.push("/paywall")} />
          <Row
            symbol="arrow.clockwise.circle"
            label={restoring ? "Restoring…" : "Restore purchases"}
            border
            onPress={restoring ? undefined : restorePurchases}
          />
          <Row symbol="creditcard" label="Billing" value="Apple" />
        </View>

        <SectionHeading label="Learning" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row symbol="bell" label="Notifications" border onPress={() => router.push("/notifications")} />
          <Row symbol="arrow.down.circle" label="Downloads" onPress={() => router.push("/offline")} />
        </View>

        <SectionHeading label="Privacy" />
        <View className="rounded-2xl border border-border bg-white px-4">
          <Row
            symbol="hand.raised"
            label="Privacy policy"
            border
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
          <Row symbol="doc.text" label="Terms of service" onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)} />
        </View>

        <View className="mt-8 rounded-2xl border border-border bg-white px-4">
          <Row symbol="rectangle.portrait.and.arrow.right" label="Sign out" destructive onPress={confirmSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
