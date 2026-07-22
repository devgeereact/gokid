import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * FAQ (design/gokid-screens.md §18). A tap-to-expand list of the questions a parent actually asks
 * about GoKid. Answers are written to match what the app really does today — no promises about AI or
 * downloads that aren't built — so this doubles as honest documentation of the current product.
 */

type QA = { q: string; a: string }

const FAQS: QA[] = [
  {
    q: "What ages is GoKid for?",
    a: "GoKid follows the England National Curriculum from Reception to Year 6, so it suits children roughly 4 to 11. You set each child's year group when you add them.",
  },
  {
    q: "Does GoKid have ads?",
    a: "No. There are no adverts anywhere in GoKid, and we never show third-party ads to children.",
  },
  {
    q: "How does the studying work?",
    a: "Each set is a deck of flashcards followed by a short quiz. Cards a child finds tricky come back sooner; cards they know come back later. This spacing is what makes learning stick, and it's why we don't use streaks — a day off never sets a child back.",
  },
  {
    q: "Why don't you have streaks or leaderboards?",
    a: "On purpose. Streaks reward not missing a day rather than learning, and leaderboards compare children against each other. We show progress through what a child has actually mastered and the curriculum they've covered instead.",
  },
  {
    q: "Can I add more than one child?",
    a: "Yes — add as many children as you like from the Parent area. Each child keeps their own progress and their own set of cards to review.",
  },
  {
    q: "What is the Parent area for?",
    a: "It's where you manage children, see progress and analytics, and handle your subscription. A passcode keeps it for the grown-ups.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Subscriptions are managed through your App Store account. Open Settings on your device, tap your name, then Subscriptions, and choose GoKid.",
  },
  {
    q: "Is my child's data private?",
    a: "We collect as little as possible and never sell data. Study progress is kept for your child's own review; we don't attach identifying information to error reports.",
  },
]

function Item({ item, open, onToggle }: { item: QA; open: boolean; onToggle: () => void }) {
  return (
    <View className="border-b border-border last:border-b-0">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.q}
        accessibilityState={{ expanded: open }}
        className="flex-row items-center py-4 active:opacity-60"
        onPress={onToggle}
      >
        <Text className="flex-1 pr-3 font-text text-body-lg font-semibold text-ink">{item.q}</Text>
        <SymbolView
          name={open ? "chevron.up" : "chevron.down"}
          size={16}
          tintColor={colors["text-secondary"]}
          weight="semibold"
        />
      </Pressable>
      {open ? <Text className="pb-4 font-text text-body text-text-secondary">{item.a}</Text> : null}
    </View>
  )
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">FAQ</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border border-border bg-white px-4">
          {FAQS.map((item, i) => (
            <Item key={item.q} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
