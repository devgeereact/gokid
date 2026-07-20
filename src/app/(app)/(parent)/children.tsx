import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { RoundedHeading } from "@/components/rounded-heading"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { setActiveChild, useActiveChildId } from "@/lib/active-child"
import { type Child, DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"

/**
 * Children manager (gokid-screens.md §2 "Multiple Children Manager"). No mockup exists for it, so
 * the surface is inferred from the two nearest references: the account-row card from
 * design/GoKid-parentcontent-screen.png (white card, hairline dividers, chevrons) carrying the
 * child identity — avatar, name, year group — from design/GoKid-whoisstudying-screen.png.
 *
 * Who's-studying is the child-facing picker; this is the parent-facing list, reached from the Parent
 * Zone behind its passcode gate. Tapping a row opens the prefilled add-child form in edit mode; the
 * per-row switch makes that child the active one without leaving the parent zone.
 */

function ChildRow({
  child,
  active,
  border,
  onSwitch,
}: {
  child: Child
  active: boolean
  border: boolean
  onSwitch: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${child.name}, ${yearLabel(child.yearGroup)}. Open profile.`}
      className={`h-18 flex-row items-center active:opacity-60 ${border ? "border-b border-border" : ""}`}
      // Opens the per-child profile (§2 "Child Achievement Profile") rather than jumping straight
      // into the edit form. The profile is the richer destination and links on to editing, so the
      // form is one tap further rather than unreachable.
      onPress={() => router.push({ pathname: "/child/[id]", params: { id: child.id } })}
    >
      {/* Children added before the avatar field existed have no `avatar` — same fallback as home. */}
      <ChildAvatar avatar={child.avatar ?? DEFAULT_AVATAR} className="h-11 w-11" />

      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{child.name}</Text>
        <Text className="mt-0.5 font-text text-body text-text-secondary">
          {yearLabel(child.yearGroup)}
        </Text>
      </View>

      {active ? (
        <View className="mr-3 rounded-md bg-badge-strong px-3 py-1">
          <Text className="font-text text-caption font-bold text-badge-strong-ink">Studying</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${child.name}`}
          className="mr-3 rounded-md border border-border px-3 py-1 active:opacity-60"
          hitSlop={6}
          onPress={onSwitch}
        >
          <Text className="font-text text-caption font-semibold text-primary">Switch</Text>
        </Pressable>
      )}

      <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
    </Pressable>
  )
}

export default function Children() {
  const { children } = useChildren()
  const activeId = useActiveChildId()

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace("/home")
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header: centred title, back pinned left — same geometry as add-child. */}
      <View className="mt-2 h-9 justify-center">
        <RoundedHeading
          color={colors.ink}
          fallbackClassName="text-center text-h2 font-bold text-ink"
          size={28}
          weight="bold"
        >
          Children
        </RoundedHeading>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="absolute left-0 h-9 w-9 justify-center active:opacity-60"
          hitSlop={8}
          onPress={goBack}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="medium" />
        </Pressable>
      </View>

      <ScrollView className="mt-6 flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {children.length === 0 ? (
          <EmptyState
            symbol="person.2"
            title="No children yet"
            body="Add a child and GoKid builds their sets from the national curriculum for their year group."
            actionLabel="Add a child"
            onAction={() => router.push("/add-child")}
          />
        ) : (
          <View className="rounded-2xl border border-border bg-white px-4">
            {children.map((child, index) => (
              <ChildRow
                key={child.id}
                child={child}
                active={child.id === activeId}
                border={index < children.length - 1}
                onSwitch={() => setActiveChild(child.id)}
              />
            ))}
          </View>
        )}

        {children.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a child"
            className="mt-4 h-14 flex-row items-center rounded-2xl border border-border bg-white px-4 active:opacity-60"
            onPress={() => router.push("/add-child")}
          >
            {/* Fixed 24pt column, and both action rows use a square-bounded symbol: the wide glyphs
                (person.badge.plus, wand.and.stars) overflow the column by different amounts, which
                staggers the labels. plus.circle also matches the add-a-child row in settings. */}
            <View className="w-6 items-center">
              <SymbolView name="plus.circle" size={24} tintColor={colors.primary} weight="regular" />
            </View>
            <Text className="ml-4 flex-1 font-text text-body-lg font-semibold text-primary">Add a child</Text>
          </Pressable>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  )
}
