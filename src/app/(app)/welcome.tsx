import { useUser } from "@clerk/expo"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { markWelcomeSeen } from "@/lib/welcome"

/**
 * Account Creation Success (design/gokid-screens.md §1 → "Account Creation Success").
 *
 * Shown once, to a genuinely new account, between sign-in and adding the first child — the entry
 * gate decides (app/index.tsx); this screen only renders and moves on. Two jobs: confirm the account
 * exists and say who it belongs to, then set expectations for the three things that happen next, so
 * "Add your first child" does not arrive cold.
 *
 * No design reference covers it. Built from design/GoKid-design-system.png: hero illustration in the
 * auth style, H1/body scale, primary button, subject-tint wash circles for the step icons.
 */

const NEXT: { symbol: SFSymbol; title: string; body: string }[] = [
  {
    symbol: "person.badge.plus",
    title: "Add your child",
    body: "Their first name and school year — that is all we need to pick the right curriculum.",
  },
  {
    symbol: "books.vertical",
    title: "Pick a set together",
    body: "Flashcards and quizzes built on the UK National Curriculum for their exact year.",
  },
  {
    symbol: "chart.line.uptrend.xyaxis",
    title: "See what is sticking",
    body: "The Parent area shows what they have learned and what is due for another look.",
  },
]

export default function Welcome() {
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress

  function start() {
    // Mark before navigating: if the parent backgrounds the app on add-child and comes back, the
    // account is created and this screen has done its job — replaying it would be noise.
    markWelcomeSeen()
    router.replace("/add-child")
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-2" showsVerticalScrollIndicator={false}>
        <Image
          accessibilityLabel="Two children sitting in the grass, reading a book together"
          className="aspect-hero w-full"
          contentFit="contain"
          source={require("../../../assets/images/gokid-auth-hero.png")}
        />

        <View className="mt-2 items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-badge-strong">
            <SymbolView name="checkmark" size={26} tintColor={colors.badge["strong-ink"]} weight="bold" />
          </View>
          <Text className="mt-4 text-center font-text text-h1 font-bold text-ink">You’re all set up</Text>
          {/* Naming the address confirms *which* account was created — the one detail a parent who
              has both an Apple and a Google login actually needs. */}
          <Text className="mt-2 text-center font-text text-body-lg text-text-secondary">
            {email ? `Your GoKid account is ready, signed in as ${email}.` : "Your GoKid account is ready."}
          </Text>
        </View>

        <Text className="mb-1 mt-8 font-text text-h3 font-bold text-ink">What happens next</Text>
        <View className="mt-2 rounded-2xl border border-border bg-white px-4">
          {NEXT.map((step, i) => (
            <View key={step.title} className={`flex-row py-4 ${i === 0 ? "" : "border-t border-border"}`}>
              <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-study-wash">
                <SymbolView name={step.symbol} size={18} tintColor={colors.primary} weight="semibold" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-text text-body-lg font-bold text-ink">{step.title}</Text>
                <Text className="mt-1 font-text text-body text-text-secondary">{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text className="mt-6 text-center font-text text-caption text-text-secondary">
          Your child never needs an account of their own.
        </Text>
      </ScrollView>

      {/* Outside the ScrollView: the one action on this screen should not need scrolling to reach. */}
      <View className="border-t border-border bg-background px-6 pb-2 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add your first child"
          className="h-14 items-center justify-center rounded-button bg-primary active:opacity-80"
          onPress={start}
        >
          <Text className="font-text text-body-lg font-bold text-white">Add your first child</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
