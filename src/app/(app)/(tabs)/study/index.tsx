import { useUser } from "@clerk/expo"
import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { OfflineBanner } from "@/components/offline-banner"
import { SetListSkeleton } from "@/components/skeleton"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"
import { currentTerm } from "@/lib/curriculum"
import { timeGreeting } from "@/lib/greeting"
import { CONTINUE_SET, getStudySetsForYear, STUDY_SETS, type StudySet } from "@/lib/study"
import { type Subject, SUBJECTS } from "@/lib/subjects"

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

/**
 * Subject tile — the wireframe's "Subject Categories" shelf (design/flow-wireframe.md: HOME →
 * Subject Categories → Set Detail). Opens that subject's hub.
 */
function SubjectTile({ subject }: { subject: Subject }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subject.name}
      className="mr-3 w-28 items-center rounded-lg border border-border bg-study-lesson p-3 active:opacity-80"
      onPress={() => router.push({ pathname: "/subject/[subject]", params: { subject: subject.slug } })}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-full ${subject.wash}`}>
        {subject.art ? (
          <Image accessibilityIgnoresInvertColors className="h-9 w-9" contentFit="contain" source={subject.art} />
        ) : (
          <SymbolView name={subject.symbol} size={20} tintColor={subject.ink} weight="semibold" />
        )}
      </View>
      <Text numberOfLines={1} className="mt-2 font-text text-caption font-semibold text-ink">
        {subject.short}
      </Text>
    </Pressable>
  )
}

export default function Study() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { isLoaded } = useUser()
  const { children } = useChildren()
  // The child tapped on "Who's studying?" (fall back to the first child if reached directly).
  const child = children.find((c) => c.id === id) ?? children[0]
  const childName = child?.name ?? "there"
  const avatar = child?.avatar ?? DEFAULT_AVATAR

  // Sets are curriculum-mapped by year group, so the dashboard only offers what matches the child.
  // Reached without a child (deep link, no profiles yet) → show the full shelf rather than nothing.
  const sets = child ? getStudySetsForYear(child.yearGroup) : STUDY_SETS

  const cont = CONTINUE_SET

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back to "Who's studying?" (switch child) · notifications.
          Navigates rather than `router.back()`: this is a tab root, so there is nothing to pop
          whenever the study stack is already at its root (a deep link, or the set-result →
          congratulations `replace` chain) and the chevron would be a dead button. */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a different child"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.navigate("/home")}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search sets"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/search")}
          >
            <SymbolView name="magnifyingglass" size={24} tintColor={colors.ink} weight="regular" />
          </Pressable>
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

      {/* Connectivity — shows only when the connection drops, and again briefly on recovery. */}
      <OfflineBanner />

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
            {/* The term is computed, not the literal "Autumn term" the mockup happens to show — that
                is example copy in a static PNG (the design system's capsule reads "Year 3 · Autumn
                term" too). The Curriculum Browser derives its own capsule from the date, and two
                screens one tap apart must not disagree about what term it is. */}
            <Text className="mt-1 font-text text-body-lg text-text-secondary">
              {child ? `${yearLabel(child.yearGroup)} • ${currentTerm()}` : currentTerm()}
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

        {/* Subjects — one hub per subject (design/gokid-screens.md §4). The "Curriculum" link is the
            dashboard's way into the Curriculum Browser (§5 / §21): the tiles answer "take me to
            Maths", the browser answers "what does this year actually cover". It opens on the active
            child's year, so it lands where this dashboard already is. */}
        <View className="mb-4 mt-8 flex-row items-center justify-between">
          <Text className="font-text text-h3 font-bold text-ink">Subjects</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse the curriculum"
            className="active:opacity-60"
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: "/curriculum", params: child ? { year: child.yearGroup } : {} })
            }
          >
            <Text className="font-text text-body font-bold text-primary">Curriculum</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          className="-mx-1"
          contentContainerClassName="px-1"
          showsHorizontalScrollIndicator={false}
        >
          {SUBJECTS.map((subject) => (
            <SubjectTile key={subject.slug} subject={subject} />
          ))}
        </ScrollView>

        {/* Ready for you */}
        <Text className="mb-4 mt-8 font-text text-h3 font-bold text-ink">Ready for you</Text>
        {!isLoaded ? (
          <SetListSkeleton count={3} />
        ) : sets.length === 0 ? (
          <EmptyState
            symbol="tray"
            title="No sets for this year yet"
            body="We're still writing sets for this year group. New ones land every week."
            actionLabel="Browse everything"
            onAction={() => router.push("/search")}
          />
        ) : (
          sets.map((set) => <LessonCard key={set.id} set={set} />)
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
