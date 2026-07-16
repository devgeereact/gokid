import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Paywall (design/GoKid-paywall-screen.png, screen 13, parent-facing). Hero, three benefits, a
 * Monthly / Annual price toggle (Annual pre-selected — "Best value"), and a free-trial CTA. Prices
 * are demo copy; no real billing is wired (StoreKit/RevenueCat lands later). The "13. Paywall" title
 * is a mockup annotation — dropped.
 */

const BENEFITS = ["Unlimited AI-generated sets", "More than one child", "Full progress history"]

function Benefit({ label }: { label: string }) {
  return (
    <View className="mb-4 flex-row items-center">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-study-teal">
        <SymbolView name="checkmark" size={17} tintColor={colors.white} weight="bold" />
      </View>
      <Text className="ml-4 font-text text-body-lg font-semibold text-ink">{label}</Text>
    </View>
  )
}

function PriceCard({
  plan,
  price,
  per,
  selected,
  best,
  onPress,
}: {
  plan: string
  price: string
  per: string
  selected: boolean
  best?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plan} ${price} ${per}`}
      className={`flex-1 items-center rounded-2xl border-2 pb-5 pt-6 active:opacity-90 ${
        selected ? "border-primary bg-white" : "border-border bg-white"
      }`}
      onPress={onPress}
    >
      {best ? (
        <View className="absolute -top-4 rounded-full bg-primary px-4 py-1">
          <Text className="font-text text-body font-bold text-white">Best value</Text>
        </View>
      ) : null}
      <Text className="font-text text-body-lg font-bold text-ink">{plan}</Text>
      <Text className="mt-2 font-text text-h1 font-bold text-ink">{price}</Text>
      <Text className="mt-2 font-text text-body text-text-secondary">{per}</Text>
    </Pressable>
  )
}

export default function Paywall() {
  const [plan, setPlan] = useState<"monthly" | "annual">("annual")

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="pb-4" showsVerticalScrollIndicator={false}>
        {/* Hero — headline over the illustration */}
        <View className="h-72">
          <Image
            accessibilityIgnoresInvertColors
            className="absolute right-0 top-0 h-72 w-[62%]"
            contentFit="contain"
            source={require("../../../assets/images/gokid-paywall-hero.png")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="absolute left-4 top-2 h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <SymbolView name="xmark" size={24} tintColor={colors.ink} weight="semibold" />
          </Pressable>
          <Text className="absolute left-5 top-14 font-text text-h1 font-bold leading-[46px] text-ink">
            Keep{"\n"}the sets{"\n"}coming.
          </Text>
        </View>

        <View className="px-5">
          {BENEFITS.map((b) => (
            <Benefit key={b} label={b} />
          ))}

          <View className="mt-4 flex-row gap-4">
            <PriceCard
              plan="Monthly"
              price="£6.49"
              per="per month"
              selected={plan === "monthly"}
              onPress={() => setPlan("monthly")}
            />
            <PriceCard
              plan="Annual"
              price="£49.99"
              per="per year"
              best
              selected={plan === "annual"}
              onPress={() => setPlan("annual")}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start free trial"
            className="mt-6 h-14 items-center justify-center rounded-full bg-primary active:opacity-90"
            onPress={() => router.back()}
          >
            <Text className="font-text text-body-lg font-bold text-white">Start free trial</Text>
          </Pressable>

          <Text className="mt-5 px-4 text-center font-text text-body-lg text-text-secondary">
            Cancel any time. We&apos;ll remind you before it renews.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
