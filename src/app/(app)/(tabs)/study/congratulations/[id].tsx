import { Redirect, router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useParentGate } from "@/lib/parent-gate"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { dueLabel, useProgress } from "@/lib/reviews"
import { shareAboutChild } from "@/lib/share"
import { getStudySet, nextSetId } from "@/lib/study"

/**
 * Congratulations / All Done (design/GoKid-congratulations-screen.png, screen 23). Completion
 * celebration: a hero with the child and a trophy, three final-result tiles, a "mastered"
 * breakdown, a "try next" prompt, the certificate earned and an encouragement banner, closing on a
 * pinned "Back to Home" button. The "23. All Done!" title is a mockup annotation — dropped.
 *
 * The reference draws four tiles: accuracy, cards, **best streak** and **points earned**. Both of
 * those last two are extrinsic mechanics that design/gokid-screens.md §9 explicitly rejects, so
 * they are gone. In their place: cards learned and when the engine brings them back — the intrinsic
 * pair §9 asks for, and both read from the real spaced-repetition record rather than a constant.
 * This is the emotional peak of the product; what it celebrates should be true.
 *
 * The mountain-flag tile (reusing the subject mountain art) and the banner's plant art are
 * stand-ins for bespoke illustrations the app doesn't ship; the trophy is a 🏆 emoji (gold, matches
 * the reference better than a tinted symbol).
 */

type Stat = {
  label: string
  value: string
  sub: string
  icon: SFSymbol
  wash: string
  tint: string
  tone: string
}

type Mastered = { title: string; sub: string; pct: number; icon: SFSymbol; wash: string; tint: string }

const MASTERED: Mastered[] = [
  { title: "Number and place value", sub: "Understand hundreds, tens and ones", pct: 100, icon: "cube.fill", wash: "bg-gamify-green-wash", tint: colors.gamify.green },
  { title: "Addition and subtraction", sub: "Add and subtract within 1,000", pct: 95, icon: "plus.forwardslash.minus", wash: "bg-gamify-amber-wash", tint: colors.accent },
  { title: "Multiplication", sub: "Multiply numbers within 1,000", pct: 88, icon: "multiply", wash: "bg-gamify-blue-wash", tint: colors.gamify.blue },
]

// Data-driven bar widths as literal classes so NativeWind's compiler emits them (see lesson/[id]).
const BAR: Record<number, string> = {
  88: "w-[88%]",
  95: "w-[95%]",
  100: "w-[100%]",
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

function StatTile({ stat }: { stat: Stat }) {
  return (
    <View className="flex-1 items-center">
      <View className={`h-14 w-14 items-center justify-center rounded-full ${stat.wash}`}>
        <SymbolView name={stat.icon} size={26} tintColor={stat.tint} weight="semibold" />
      </View>
      <Text numberOfLines={1} className="mt-3 font-text text-caption text-text-secondary">
        {stat.label}
      </Text>
      <Text className="mt-1 font-text text-h3 font-bold text-ink">{stat.value}</Text>
      <Text className={`mt-1 font-text text-caption font-semibold ${stat.tone}`}>{stat.sub}</Text>
    </View>
  )
}

export default function Congratulations() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const childId = useStudyingChildId() ?? ""
  const set = getStudySet(id)
  const { children } = useChildren()
  const { cards } = useProgress(childId)
  const { unlocked } = useParentGate()

  if (!set) return <Redirect href="/home" />

  // The child who actually studied this set, not whoever happens to be first in the roster — the
  // whole screen is about them and a household with two children was naming the wrong one.
  const name = (children.find((c) => c.id === childId) ?? children[0])?.name ?? "Your child"
  const nextId = nextSetId(set.id)

  // Real outcomes for this set, from the spaced-repetition record.
  const setCards = cards.filter((c) => c.setId === set.id)
  const learned = setCards.filter((c) => c.box >= 2).length
  const tricky = setCards.filter((c) => c.lastRating === "tricky").length
  const nextDue = setCards.slice().sort((a, b) => a.dueAt - b.dueAt)[0]

  const stats: Stat[] = [
    {
      label: "Cards learned",
      value: String(learned),
      sub: learned > 0 ? "Remembered twice!" : "Keep going!",
      icon: "brain.head.profile",
      wash: "bg-gamify-green-wash",
      tint: colors.gamify.green,
      tone: "text-gamify-green",
    },
    {
      label: "Found tricky",
      value: String(tricky),
      sub: tricky > 0 ? "We'll bring them back" : "None — nice!",
      icon: "arrow.clockwise",
      wash: "bg-gamify-amber-wash",
      tint: colors.accent,
      tone: "text-accent",
    },
    {
      label: "Coming back",
      value: nextDue ? dueLabel(nextDue.dueAt) : "—",
      sub: "So it sticks",
      icon: "calendar",
      wash: "bg-gamify-blue-wash",
      tint: colors.gamify.blue,
      tone: "text-gamify-blue",
    },
  ]

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — no back chevron; centred title with a static Share action top-right */}
      <View className="mt-1 h-11 flex-row items-center">
        <View className="w-20" />
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">All Done!</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          className="w-20 flex-row items-center justify-end gap-1 active:opacity-60"
          onPress={() =>
            // Gated exactly like the certificate's share — see lib/share.ts for why.
            shareAboutChild({
              unlocked,
              message: `${name} finished ${set.title} on GoKid — ${learned} ${
                learned === 1 ? "card" : "cards"
              } learned.`,
            })
          }
        >
          <SymbolView name="square.and.arrow.up" size={20} tintColor={colors.study.teal} weight="semibold" />
          <Text className="font-text text-body font-semibold text-study-teal">Share</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
        {/* Hero — celebrating child, congratulations copy and a trophy */}
        <View className="rounded-2xl bg-gamify-green-wash p-4">
          <View className="flex-row items-center">
            <Image
              accessibilityIgnoresInvertColors
              className="h-32 w-24"
              contentFit="contain"
              source={require("../../../../../../assets/images/gokid-result-child.png")}
            />
            <View className="ml-2 flex-1">
              {/* One Text per line. The comma previously sat at the end of its own <Text>, so a long
                  name wrapped it onto a line by itself — "Congratulations" / "," / "Gideon!". */}
              <Text className="font-text text-h3 font-bold text-ink">Congratulations</Text>
              <Text numberOfLines={2} className="font-text text-h2 font-bold text-gamify-green">
                {name}!
              </Text>
              <Text className="mt-2 font-text text-body text-text-secondary">
                You&apos;ve completed {set.title}.
              </Text>
            </View>
            <Text className="ml-1 font-text text-[52px]">🏆</Text>
          </View>
        </View>

        {/* Your final results */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">Your final results</Text>
          <View className="flex-row">
            {stats.map((s) => (
              <StatTile key={s.label} stat={s} />
            ))}
          </View>
        </Card>

        {/* What you've mastered */}
        <Card>
          <View className="mb-4 flex-row items-center">
            <Text className="flex-1 font-text text-h3 font-bold text-ink">What you&apos;ve mastered</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review all mastered topics"
              className="active:opacity-60"
              onPress={() => {}}
            >
              <Text className="font-text text-body font-semibold text-study-teal">Review all</Text>
            </Pressable>
          </View>
          {MASTERED.map((m) => (
            <View key={m.title} className="mb-5 flex-row items-center last:mb-0">
              <View className={`h-11 w-11 items-center justify-center rounded-xl ${m.wash}`}>
                <SymbolView name={m.icon} size={22} tintColor={m.tint} weight="semibold" />
              </View>
              <View className="ml-3 w-32">
                <Text numberOfLines={1} className="font-text text-body font-semibold text-ink">
                  {m.title}
                </Text>
                <Text className="font-text text-caption text-text-secondary">{m.sub}</Text>
              </View>
              <View className="ml-2 h-2 flex-1 overflow-hidden rounded-full bg-gamify-track">
                <View className={`h-full rounded-full bg-gamify-green ${BAR[m.pct]}`} />
              </View>
              <Text className="ml-2 w-11 text-right font-text text-body font-bold text-ink">{m.pct}%</Text>
              <View className="ml-2">
                <SymbolView name="checkmark.circle.fill" size={24} tintColor={colors.gamify.green} weight="regular" />
              </View>
            </View>
          ))}
        </Card>

        {/* What to try next */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">What to try next</Text>
          <View className="flex-row items-center">
            <Image
              accessibilityIgnoresInvertColors
              className="h-16 w-16 rounded-lg bg-gamify-green-wash"
              contentFit="contain"
              source={require("../../../../../../assets/images/gokid-subject-mountain.png")}
            />
            <View className="ml-3 flex-1">
              <Text className="font-text text-body-lg font-bold text-ink">You&apos;re ready for more!</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                Keep building your skills with the next set.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start next set"
            className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
            onPress={() => router.replace({ pathname: "/lesson/[id]", params: { id: nextId } })}
          >
            <Text className="font-text text-body-lg font-bold text-white">Start next set</Text>
            <SymbolView name="arrow.right" size={18} tintColor={colors.white} weight="bold" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a different set"
            className="mt-3 items-center active:opacity-60"
            onPress={() => router.replace("/study")}
          >
            <Text className="font-text text-body font-semibold text-study-teal underline">Choose a different set</Text>
          </Pressable>
        </Card>

        {/* Certificate earned — the award this completion unlocked */}
        <Card>
          <Text className="mb-4 font-text text-h3 font-bold text-ink">You&apos;ve earned a certificate</Text>
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-lg bg-cert-paper">
              <SymbolView name="rosette" size={40} tintColor={colors.cert.seal} weight="semibold" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-text text-body-lg font-bold text-ink">Gold certificate</Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                For completing {set.title}. Save it, print it, or share it.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View certificate"
            className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full border border-primary bg-white active:opacity-70"
            onPress={() => router.push({ pathname: "/certificate/[id]", params: { id: set.id } })}
          >
            <Text className="font-text text-body-lg font-bold text-primary">View certificate</Text>
            <SymbolView name="arrow.right" size={18} tintColor={colors.primary} weight="bold" />
          </Pressable>
        </Card>

        {/* Never stop learning banner */}
        <View className="mt-4 flex-row items-center rounded-2xl bg-gamify-green-wash p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-gamify-green">
            <SymbolView name="star.fill" size={22} tintColor={colors.white} weight="semibold" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-gamify-green">Never stop learning!</Text>
            <Text className="mt-1 font-text text-body text-text-secondary">
              A little practice every day leads to big results. We&apos;re proud of you!
            </Text>
          </View>
          <Text className="ml-2 font-text text-h2">🌱</Text>
        </View>
      </ScrollView>

      {/* Back to Home — pinned full-width action */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Home"
        className="mb-24 mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
        onPress={() => router.replace("/home")}
      >
        <SymbolView name="house.fill" size={20} tintColor={colors.white} weight="semibold" />
        <Text className="font-text text-body-lg font-bold text-white">Back to Home</Text>
      </Pressable>
    </SafeAreaView>
  )
}
