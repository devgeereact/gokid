import { useAuth } from "@clerk/expo"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { duration, useAnalytics } from "@/lib/analytics"
import { BackButton } from "@/components/primitives"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"
import { entitlementLabel, useEntitlement } from "@/lib/subscription"
import { getSubject, subjectSlug } from "@/lib/subjects"

/**
 * Parent Zone content (design/GoKid-parentcontent-screen.png, screen 12). Reached once the passcode gate
 * is passed. Child switcher, a time/sets overview, curriculum strengths + focus, and account rows.
 * Every figure is the child's own: the roster comes from `useChildren` (the mockup hardcoded "Amara"
 * and "Rufus", so a parent saw two children who were not theirs), and the time/sets tiles plus the
 * strength/focus cards come from `useAnalytics` — the same real record the full report draws.
 *
 * Deviation from the reference: it specifies two account rows (Subscription, Account settings); a
 * third, Sign out, was added on request. Deliberate, not drift.
 */

function CurriculumCard({
  subject,
  topic,
  badge,
  tone,
}: {
  subject: string
  topic: string
  badge: string
  tone: "strong" | "practice"
}) {
  const art = getSubject(subjectSlug(subject) ?? "")?.art
  return (
    <View className="flex-row items-center rounded-2xl border border-border bg-white p-3">
      {art ? (
        <Image accessibilityIgnoresInvertColors className="h-14 w-14 rounded-full" contentFit="cover" source={art} />
      ) : (
        <View className="h-14 w-14 rounded-full bg-study-wash" />
      )}
      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{subject}</Text>
        <Text className="mt-0.5 font-text text-body text-text-secondary">{topic}</Text>
      </View>
      <View className={`rounded-md px-3 py-2 ${tone === "strong" ? "bg-badge-strong" : "bg-badge-practice"}`}>
        <Text
          className={`font-text text-body font-bold ${tone === "strong" ? "text-badge-strong-ink" : "text-badge-practice-ink"}`}
        >
          {badge}
        </Text>
      </View>
    </View>
  )
}

function AccountRow({
  symbol,
  label,
  value,
  border,
  destructive,
  onPress,
}: {
  symbol: SFSymbol
  label: string
  value?: string
  border?: boolean
  destructive?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`h-14 flex-row items-center active:opacity-60 ${border ? "border-b border-border" : ""}`}
      onPress={onPress}
    >
      <SymbolView name={symbol} size={24} tintColor={destructive ? colors.error : colors.ink} weight="regular" />
      <Text
        className={`ml-4 flex-1 font-text text-body-lg font-semibold ${destructive ? "text-error" : "text-ink"}`}
      >
        {label}
      </Text>
      {value ? <Text className="mr-2 font-text text-body-lg font-bold text-ink">{value}</Text> : null}
      {/* No chevron on a destructive row: it opens a confirm dialog, it does not navigate. */}
      {destructive ? null : (
        <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
      )}
    </Pressable>
  )
}

export default function ParentContent() {
  const { signOut } = useAuth()
  const { children } = useChildren()
  const entitlement = useEntitlement()

  // Real totals for the child shown, not the mockup's "2h 45m / 8h 30m / 24".
  const week = useAnalytics(children[0], "week")
  const month = useAnalytics(children[0], "month")
  const stats = [
    { value: duration(week.summary.minutes), top: "This week", sub: "Total time" },
    { value: duration(month.summary.minutes), top: "This month", sub: "Total time" },
    { value: String(month.summary.sets), top: "Sets completed", sub: "This month" },
  ]

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need to sign back in with Apple or Google.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ])
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />
      {/* pb-10, matching settings: the account card is now the last thing on the page and this
          SafeAreaView only insets the top, so pb-8 left the new Sign out row tight against the
          home indicator at scroll-end. */}
      {/* Back to the Parent tab. This is a pushed route reached through the passcode gate, so it gets no
          tab bar and had no way out but the app switcher — the chevron every other pushed screen
          carries. Outside the ScrollView so it stays put while the page scrolls. */}
      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-h1 font-bold text-ink">Parent area</Text>

        {/* Child switcher — the parent's real roster. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-5 -mr-5"
          contentContainerClassName="items-center pr-5"
        >
          {children.map((c) => (
            <View
              key={c.id}
              className="mr-3 flex-row items-center rounded-2xl border border-border bg-white py-2 pl-2 pr-4"
            >
              <ChildAvatar avatar={c.avatar ?? DEFAULT_AVATAR} className="h-11 w-11" />
              <View className="ml-2">
                <Text className="font-text text-body-lg font-bold text-ink">{c.name}</Text>
                <Text className="font-text text-body text-text-secondary">{yearLabel(c.yearGroup)}</Text>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a child"
            className="h-14 w-14 items-center justify-center rounded-full border border-border bg-white active:opacity-60"
            onPress={() => router.push("/add-child")}
          >
            <SymbolView name="plus" size={24} tintColor={colors.ink} weight="medium" />
          </Pressable>
        </ScrollView>

        {/* Progress overview. The reference draws three static tiles; "Analytics" opens the full
            report they summarise (design/gokid-screens.md §10 → Analytics), which is where the
            per-child, per-period figures behind these headline numbers live. */}
        <View className="mb-3 mt-8 flex-row items-center justify-between">
          <Text className="font-text text-h3 font-bold text-ink">Progress overview</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open analytics"
            className="active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/parent-analytics")}
          >
            <Text className="font-text text-body font-bold text-primary">Analytics</Text>
          </Pressable>
        </View>
        <View className="flex-row gap-3">
          {stats.map((s) => (
            <View key={s.top} className="flex-1 rounded-2xl border border-border bg-white p-3">
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                className="font-text text-caption text-text-secondary"
              >
                {s.top}
              </Text>
              <Text className="mt-2 font-text text-h3 font-bold text-ink">{s.value}</Text>
              <Text className="mt-2 font-text text-caption text-text-secondary">{s.sub}</Text>
            </View>
          ))}
        </View>

        {/* Curriculum strengths. The "Browse" link opens the Curriculum Browser (design/gokid-screens.md
            §5 / §21) — this section tells a parent *how* their child is doing against the curriculum,
            and that is exactly the point they want to see what the curriculum actually is. */}
        <View className="mb-3 mt-8 flex-row items-center justify-between">
          <Text className="font-text text-h3 font-bold text-ink">Curriculum strengths</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse the curriculum"
            className="active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/curriculum")}
          >
            <Text className="font-text text-body font-bold text-primary">Browse</Text>
          </Pressable>
        </View>
        {week.strong[0] ? (
          <CurriculumCard
            subject={week.strong[0].subject}
            topic={week.strong[0].strand}
            badge="Strong"
            tone="strong"
          />
        ) : (
          <Text className="font-text text-body text-text-secondary">
            Not enough studying yet to call a strength.
          </Text>
        )}

        {/* Curriculum to focus on */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Curriculum to focus on</Text>
        {week.weak[0] ? (
          <CurriculumCard
            subject={week.weak[0].subject}
            topic={week.weak[0].strand}
            badge="Needs practice"
            tone="practice"
          />
        ) : (
          <Text className="font-text text-body text-text-secondary">
            Nothing flagged — everything studied so far is sticking.
          </Text>
        )}

        {/* Account */}
        <View className="mt-8 rounded-2xl border border-border bg-white px-4">
          <AccountRow
            symbol="gearshape"
            label="Subscription"
            value={entitlementLabel(entitlement)}
            border
            onPress={() => router.push("/subscription")}
          />
          <AccountRow symbol="person.2" label="Children" border onPress={() => router.push("/children")} />
          <AccountRow symbol="person.circle" label="Account settings" border onPress={() => router.push("/settings")} />
          {/* Not in design/GoKid-parentcontent-screen.png, which specifies only Subscription and
              Account settings here — added on request. Safe on this screen (and not on the
              child-facing ones) because it sits behind the parent zone's passcode gate. */}
          <AccountRow
            symbol="rectangle.portrait.and.arrow.right"
            label="Sign out"
            destructive
            onPress={confirmSignOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
