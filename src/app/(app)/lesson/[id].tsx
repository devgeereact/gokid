import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useStudyingChildId } from "@/lib/children"
import { BAR, barPct } from "@/lib/milestones"
import { masterySplit, useProgress } from "@/lib/reviews"
import { getStudySet, relatedSets, type StudySet } from "@/lib/study"

/**
 * Set detail (design/GoKid-lessondetails-screen.png, screen 6). Hero illustration, blurb, card /
 * time meta, a three-part mastery bar, and the entry into the flashcard runner. The "6. Set Detail"
 * title is a mockup annotation — dropped, like the other screens.
 */

// Mastery segment widths come from demo data (per set), so the percentages are a known, small set.
// Listing them as literal classes lets NativeWind's compiler emit them (it scans source text) —
// keeps the bar data-driven with no inline `style`.
function Meta({ symbol, label }: { symbol: SFSymbol; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <SymbolView name={symbol} size={20} tintColor={colors["text-secondary"]} weight="regular" />
      <Text className="font-text text-body text-text-secondary">{label}</Text>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={`h-3 w-3 rounded-sm ${color}`} />
      <Text className="font-text text-body text-text-secondary">{label}</Text>
    </View>
  )
}

/** One related set — art, title, and the reason the curriculum puts it next to this one. */
function RelatedCard({ set, reason }: { set: StudySet; reason: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}. ${reason}.`}
      className="mr-3 w-44 rounded-lg border border-border bg-white p-3 active:opacity-90"
      // `replace`, not `push`: tapping through four related sets in a row should not build a
      // four-deep stack whose back button walks the child backwards through their own browsing.
      onPress={() => router.replace({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      <View className="h-20 items-center justify-center">
        <Image
          accessibilityIgnoresInvertColors
          className="h-16 w-16 rounded-full"
          contentFit="cover"
          source={set.thumb}
        />
      </View>
      <Text numberOfLines={2} className="mt-2 font-text text-body font-bold text-ink">
        {set.title}
      </Text>
      <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
        {reason}
      </Text>
    </Pressable>
  )
}

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const childId = useStudyingChildId() ?? ""
  const { cards } = useProgress(childId)
  const set = getStudySet(id)
  if (!set) return <Redirect href="/home" />

  const setCards = cards.filter((c) => c.setId === set.id)

  // Mastery for THIS child, from their spaced-repetition record. It used to be `set.mastery` — three
  // authored percentages baked into the catalogue, so every child saw an identical 25/45/30 bar on
  // this set whether they had studied it or not, and the number never moved when they did.
  const split = masterySplit(setCards)
  // §5 "Related Sets" — the curriculum's own structure, not a similarity score. See lib/study.ts.
  const related = relatedSets(set)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Back · download this set for offline (design/GoKid-downloadset-screen.png, screen 15). */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <BackButton />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download this set"
          className="-mr-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.push({ pathname: "/download/[id]", params: { id: set.id } })}
        >
          <SymbolView name="arrow.down.circle" size={24} tintColor={colors.ink} weight="regular" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
        <View className="h-64 items-center justify-center">
          <Image
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            contentFit="contain"
            source={set.hero}
          />
        </View>

        <Text className="mt-2 font-text text-h1 font-bold text-ink">{set.title}</Text>
        <Text className="mt-3 font-text text-body-lg text-text-secondary">{set.description}</Text>

        <View className="mt-6 flex-row items-center gap-8">
          <Meta symbol="square.stack" label={`${set.cardsTotal} cards`} />
          <Meta symbol="clock" label={`~${set.minutes} min`} />
        </View>

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Mastery</Text>
        {setCards.length === 0 ? (
          // "Not started" and "started and going badly" must not look alike — the same rule the
          // subject strand rows follow.
          <View className="h-11 items-center justify-center rounded-md border border-border bg-white">
            <Text className="font-text text-body text-text-secondary">Not started yet</Text>
          </View>
        ) : (
          <View className="h-11 flex-row overflow-hidden rounded-md">
            <View
              className={`h-full items-center justify-center bg-status-learning ${BAR[barPct(split.pctLearning)]}`}
            >
              {split.pctLearning >= 15 ? (
                <Text className="font-text text-body font-bold text-white">{split.pctLearning}%</Text>
              ) : null}
            </View>
            <View className={`h-full items-center justify-center bg-study-teal ${BAR[barPct(split.pctGetting)]}`}>
              {split.pctGetting >= 15 ? (
                <Text className="font-text text-body font-bold text-white">{split.pctGetting}%</Text>
              ) : null}
            </View>
            {/* flex-1 rather than a width class: the three rounded percentages need not total 100. */}
            <View className="h-full flex-1 items-center justify-center bg-status-getting">
              {split.pctMastered >= 15 ? (
                <Text className="font-text text-body font-bold text-white">{split.pctMastered}%</Text>
              ) : null}
            </View>
          </View>
        )}
        <View className="mt-3 flex-row justify-between">
          <Legend color="bg-status-learning" label="Learning" />
          <Legend color="bg-study-teal" label="Getting it" />
          <Legend color="bg-status-getting" label="Mastered" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Study cards"
          className="mt-8 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
          onPress={() => router.push({ pathname: "/flashcard/[id]", params: { id: set.id } })}
        >
          <Text className="font-text text-body-lg font-bold text-white">Study cards</Text>
        </Pressable>
        {/*
          The guided session (screens 18–23: session → answer-result → session-summary → set-result →
          congratulations → certificate). This is the door that flow never had — every screen in it was
          built and wired to its neighbours, but nothing in the app pushed into it, so the whole chain
          including the earned Certificate was unreachable by playing the app.

          It sits between the two existing modes because that is the order of commitment: flip through
          cards, work a guided session, then test yourself.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a study session"
          className="mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push({ pathname: "/study/session/[id]", params: { id: set.id } })}
        >
          <Text className="font-text text-body-lg font-bold text-ink">Study session</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take the quiz"
          className="mt-3 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
          onPress={() => router.push({ pathname: "/quiz/instructions/[id]", params: { id: set.id } })}
        >
          <Text className="font-text text-body-lg font-bold text-ink">Take the quiz</Text>
        </Pressable>

        {/* §5 "Related Sets". Below the two CTAs on purpose: the point of this screen is to start
            *this* set, and a shelf of alternatives above the button would compete with it. */}
        {related.length > 0 ? (
          <>
            <Text className="mb-4 mt-10 font-text text-h3 font-bold text-ink">Related sets</Text>
            <ScrollView
              horizontal
              className="-mx-1"
              contentContainerClassName="px-1"
              showsHorizontalScrollIndicator={false}
            >
              {related.map((r) => (
                <RelatedCard key={r.set.id} set={r.set} reason={r.reason} />
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
