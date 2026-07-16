import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"
import { timeGreeting } from "@/lib/greeting"
import { CONTINUE_SET, STUDY_SETS, type StudySet } from "@/lib/study"

/**
 * Study dashboard — "Home / Study Sets" (design/GoKid-studydashboard-screen.png, screen 5).
 * Reached by tapping a child on "Who's studying?". Lesson content is demo study material
 * (src/lib/study.ts); the greeting follows the real tapped child.
 */

function StatusPill({ set }: { set: StudySet }) {
  return (
    <View className={`rounded-full px-3 py-1 ${set.status === "getting" ? "bg-status-getting" : "bg-status-learning"}`}>
      <Text className="font-text text-caption font-semibold text-white">{set.statusLabel}</Text>
    </View>
  )
}

function LessonCard({ set }: { set: StudySet }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}. ${set.statusLabel}.`}
      className="mb-3 flex-row items-center rounded-lg border border-border bg-study-lesson p-3 active:opacity-90"
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      <Image
        accessibilityIgnoresInvertColors
        className="h-13 w-13 rounded-md"
        contentFit="cover"
        source={set.thumb}
      />
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="font-text text-body font-bold text-ink">
          {set.title}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
          {set.subject} • {set.topic}
        </Text>
      </View>
      <StatusPill set={set} />
    </Pressable>
  )
}

export default function Study() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { children } = useChildren()
  // The child tapped on "Who's studying?" (fall back to the first child if reached directly).
  const child = children.find((c) => c.id === id) ?? children[0]
  const childName = child?.name ?? "there"
  const avatar = child?.avatar ?? DEFAULT_AVATAR

  const cont = CONTINUE_SET

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back to "Who's studying?" (switch child) · notifications */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a different child"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Downloaded sets"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/offline")}
          >
            <SymbolView name="arrow.down.circle" size={24} tintColor={colors.ink} weight="regular" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/notifications")}
          >
            <SymbolView name="bell" size={24} tintColor={colors.ink} weight="regular" />
            <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="mt-2 flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting — real child (name, year, avatar); time-of-day follows the local clock. */}
        <View className="flex-row items-center">
          <ChildAvatar avatar={avatar} className="h-14 w-14" />
          <View className="ml-4 flex-1">
            <Text numberOfLines={1} className="font-text text-h2 font-bold text-ink">
              {timeGreeting()}, {childName}
            </Text>
            <Text className="mt-1 font-text text-body-lg text-text-secondary">
              {child ? `${yearLabel(child.yearGroup)} • Autumn term` : "Autumn term"}
            </Text>
          </View>
        </View>

        {/* Continue card */}
        <View className="mt-6 overflow-hidden rounded-2xl bg-study-wash p-5">
          <View className="flex-row items-center">
            <View className="flex-1 pr-2">
              <Text className="font-text text-body font-semibold text-primary">Continue</Text>
              <Text className="mt-1 font-text text-h1 font-bold leading-[40px] text-ink">
                Place Value{"\n"}to 1,000
              </Text>
            </View>
            <Image
              accessibilityIgnoresInvertColors
              className="-mr-2 h-cube w-cube"
              contentFit="contain"
              source={require("../../../../../assets/images/gokid-cube-stack.png")}
            />
          </View>

          {/* 12 of 20 cards = 60% (demo constant; a live value would drive a themed width token). */}
          <View className="mt-4 h-2 overflow-hidden rounded-full bg-study-track">
            <View className="h-full w-[60%] rounded-full bg-study-teal" />
          </View>
          <Text className="mt-3 font-text text-body text-text-secondary">
            {cont.cardsDone} of {cont.cardsTotal} cards
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Carry on"
            className="mt-4 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
            onPress={() => router.push({ pathname: "/study/session/[id]", params: { id: cont.id } })}
          >
            <Text className="font-text text-body-lg font-bold text-white">Carry on</Text>
          </Pressable>
        </View>

        {/* Ready for you */}
        <Text className="mb-4 mt-8 font-text text-h3 font-bold text-ink">Ready for you</Text>
        {STUDY_SETS.map((set) => (
          <LessonCard key={set.id} set={set} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
