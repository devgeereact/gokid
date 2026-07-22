import { useUser } from "@clerk/expo"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { resolveItems } from "@/lib/served-quiz"
import { getStudySet, nextSetId, quizItems } from "@/lib/study"

/**
 * Quiz results (design/GoKid-result-screen.png, screen 9). Celebrating child, a score ring, then two
 * cards — mastered topics (green, up-arrow chips) and topics worth another look (amber chips). "Next
 * set" advances to the next study set; "Back home" returns to Who's studying. Topics are demo data
 * (src/lib/study.ts); the score is passed from the quiz. The "9. Quiz Results" title is a mockup
 * annotation — dropped.
 */

function Chip({ label, tone }: { label: string; tone: "mastered" | "revisit" }) {
  return (
    <View
      className={`mb-3 mr-3 flex-row items-center rounded-lg px-4 py-3 ${
        tone === "mastered" ? "bg-status-getting" : "bg-accent"
      }`}
    >
      <Text className="font-text text-body-lg font-bold text-white">{label}</Text>
      {tone === "mastered" ? (
        <SymbolView name="arrow.up" size={18} tintColor={colors.white} weight="bold" style={{ marginLeft: 10 }} />
      ) : null}
    </View>
  )
}

export default function Result() {
  const { id, score, answers } = useLocalSearchParams<{ id: string; score?: string; answers?: string }>()
  const { user } = useUser()
  const { children } = useChildren()
  const childId = useStudyingChildId() ?? ""
  const set = getStudySet(id)

  if (!set) return <Redirect href="/home" />

  // The served list when the child took a no-repeat quiz, else the local set — must match the length
  // the runner scored against, or the ring shows "5 / 8" against the wrong denominator.
  const total = resolveItems(id, quizItems(set)).length
  const correct = Math.min(Number(score ?? 0) || 0, total)
  // The child who actually studied this set, not whoever is first in the roster.
  const childName = children.find((c) => c.id === childId)?.name ?? user?.firstName ?? "you"

  // Advance to the next set in curriculum order (shared with congratulations), instead of an
  // unrelated hardcoded 3-set list that misrouted 18 of the 21 sets to "place-value".
  const nextId = nextSetId(set.id)

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" contentContainerClassName="pb-2 pt-2" showsVerticalScrollIndicator={false}>
        {/* Hero — celebrating child, score ring overlapping the base */}
        <View className="items-center">
          <Image
            accessibilityIgnoresInvertColors
            className="h-64 w-full"
            contentFit="contain"
            source={require("../../../../assets/images/gokid-result-child.png")}
          />
          <View className="-mt-16 h-28 w-28 items-center justify-center rounded-full border-[6px] border-accent bg-white">
            <View className="flex-row items-baseline">
              <Text className="font-text text-h1 font-bold text-ink">{correct}</Text>
              <Text className="font-text text-h3 font-bold text-text-secondary">/{total}</Text>
            </View>
          </View>
        </View>

        <Text className="mt-6 text-center font-text text-h2 font-bold leading-[34px] text-ink">
          Nice one, {childName} — that&apos;s your best yet.
        </Text>

        {/* Mastered */}
        <View className="mt-8 rounded-2xl border border-border bg-white p-4">
          <Text className="mb-3 font-text text-body-lg font-bold text-ink">What you&apos;ve mastered</Text>
          <View className="flex-row flex-wrap">
            {set.mastered.map((t) => (
              <Chip key={t} label={t} tone="mastered" />
            ))}
          </View>
        </View>

        {/* Worth another look */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-4">
          <Text className="mb-3 font-text text-body-lg font-bold text-ink">Worth another look</Text>
          <View className="flex-row flex-wrap">
            {set.revisit.map((t) => (
              <Chip key={t} label={t} tone="revisit" />
            ))}
          </View>
          <Text className="font-text text-body text-text-secondary">We&apos;ll bring these back soon.</Text>
        </View>

        {correct < total ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See what you missed"
            className="mt-4 h-14 flex-row items-center justify-center rounded-full border border-border bg-white active:opacity-70"
            onPress={() =>
              router.push({ pathname: "/quiz/review/[id]", params: { id: set.id, answers: answers ?? "" } })
            }
          >
            <Text className="font-text text-body-lg font-bold text-primary">See what you missed</Text>
            <SymbolView
              name="arrow.right"
              size={16}
              tintColor={colors.primary}
              weight="bold"
              style={{ marginLeft: 8 }}
            />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next set"
          className="mt-6 h-14 items-center justify-center rounded-full bg-primary active:opacity-90"
          onPress={() => router.replace({ pathname: "/lesson/[id]", params: { id: nextId } })}
        >
          <Text className="font-text text-body-lg font-bold text-white">Next set</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back home"
          className="mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.replace("/home")}
        >
          <Text className="font-text text-body-lg font-bold text-ink">Back home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
