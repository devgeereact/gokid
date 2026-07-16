import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { RoundedHeading } from "@/components/rounded-heading"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { type Child, DEFAULT_AVATAR, useChildren } from "@/lib/children"

/**
 * "Who's studying?" — the signed-in landing (design/GoKid-whoisstudying-screen.png, screen 4).
 * Lists the parent's children (from useChildren — the demo store is Clerk metadata) and the
 * entry point to add another, then reaches "Parent settings".
 *
 * A child on the fox/elephant preset gets the full-bleed illustration + matching wash from the
 * design. Any other picture (emoji or an uploaded photo) shows in the round ChildAvatar instead.
 */
const BLEED = {
  fox: { wash: "bg-card-rufus", art: require("../../../assets/images/gokid-cut-fox.png") },
  elephant: { wash: "bg-card-amara", art: require("../../../assets/images/gokid-cut-elephant.png") },
} as const

function yearLabel(yearGroup: string) {
  return yearGroup === "Rec" ? "Reception" : `Year ${yearGroup.slice(1)}`
}

function ChildCard({ child }: { child: Child }) {
  // Children added before the avatar field existed have no `avatar` — fall back to the default.
  const avatar = child.avatar ?? DEFAULT_AVATAR
  const bleed =
    avatar.kind === "preset" && (avatar.value === "fox" || avatar.value === "elephant")
      ? BLEED[avatar.value]
      : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${child.name}, ${yearLabel(child.yearGroup)}`}
      className={`mb-5 h-card flex-row items-center overflow-hidden rounded-card active:opacity-90 ${
        bleed ? bleed.wash : "bg-card-amara"
      }`}
      onPress={() => router.push({ pathname: "/study", params: { id: child.id } })}
    >
      {bleed ? (
        <Image
          accessibilityIgnoresInvertColors
          className="h-card w-[54%]"
          contentFit="cover"
          contentPosition="top"
          source={bleed.art}
        />
      ) : (
        <View className="w-[46%] items-center">
          <ChildAvatar avatar={avatar} className="h-24 w-24" />
        </View>
      )}
      <View className="flex-1 items-center">
        <Text className="font-text text-h2 font-bold text-ink">{child.name}</Text>
        <Text className="mt-1 font-text text-field text-text-secondary">
          {yearLabel(child.yearGroup)}
        </Text>
      </View>

      {/* Edit / delete this child — opens the prefilled form. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${child.name}`}
        className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white/80 active:opacity-70"
        hitSlop={6}
        onPress={() => router.push({ pathname: "/add-child", params: { id: child.id } })}
      >
        <SymbolView name="pencil" size={16} tintColor={colors.ink} />
      </Pressable>
    </Pressable>
  )
}

export default function Home() {
  const { children } = useChildren()

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <StatusBar style="dark" />

      <View className="mt-14 items-center">
        <RoundedHeading
          color={colors.ink}
          fallbackClassName="text-center text-h1 font-bold text-ink"
          size={34}
          weight="bold"
        >
          Who’s studying?
        </RoundedHeading>
      </View>

      <ScrollView
        className="mt-10 flex-1"
        contentContainerClassName="pb-4"
        showsVerticalScrollIndicator={false}
      >
        {children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}

        {/* Add a child — dashed tile with a mint plus-disc. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a child"
          className="h-card items-center justify-center rounded-card border-2 border-dashed border-card-dash active:opacity-70"
          onPress={() => router.push("/add-child")}
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-card-add">
            <SymbolView name="plus" size={32} tintColor={colors.primary} weight="medium" />
          </View>
          <Text className="mt-3 font-text text-field text-text-secondary">Add a child</Text>
        </Pressable>
      </ScrollView>

      {/* Parent settings — into the maths-gated Parent Zone (app-ui screen 11). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Parent settings"
        className="mb-8 mt-4 flex-row items-center justify-center gap-2 active:opacity-60"
        onPress={() => router.push("/parent")}
      >
        <SymbolView name="lock" size={20} tintColor={colors["text-secondary"]} />
        <Text className="font-text text-field text-text-secondary">Parent settings</Text>
      </Pressable>
    </SafeAreaView>
  )
}
