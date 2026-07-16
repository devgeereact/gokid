import { useAuth } from "@clerk/expo"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Parent Zone content (design/GoKid-parentcontent-screen.png, screen 12). Reached once the maths gate
 * is passed. Child switcher, a time/sets overview, curriculum strengths + focus, and account rows.
 * All figures are demo data (the reporting API lands later — AGENTS.md). Subject thumbs and child
 * faces are cropped off the reference. The "12. Parent Zone" title is a mockup annotation — dropped.
 *
 * Deviation from the reference: it specifies two account rows (Subscription, Account settings); a
 * third, Sign out, was added on request. Deliberate, not drift.
 */

const CHILDREN = [
  { name: "Amara", year: "Year 3", face: require("../../../assets/images/gokid-pc-amara.png") },
  { name: "Rufus", year: "Year 1", face: require("../../../assets/images/gokid-pc-rufus.png") },
]

const STATS = [
  { value: "2h 45m", top: "This week", sub: "Total time" },
  { value: "8h 30m", top: "This month", sub: "Total time" },
  { value: "24", top: "Sets completed", sub: "" },
]

function CurriculumCard({
  thumb,
  subject,
  topic,
  badge,
  tone,
}: {
  thumb: number
  subject: string
  topic: string
  badge: string
  tone: "strong" | "practice"
}) {
  return (
    <View className="flex-row items-center rounded-2xl border border-border bg-white p-3">
      <Image accessibilityIgnoresInvertColors className="h-14 w-14 rounded-lg" contentFit="cover" source={thumb} />
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
      {/* Back to the Parent tab. This is a pushed route reached through the maths gate, so it gets no
          tab bar and had no way out but the app switcher — the chevron every other pushed screen
          carries. Outside the ScrollView so it stays put while the page scrolls. */}
      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-h1 font-bold text-ink">Parent area</Text>

        {/* Child switcher */}
        <View className="mt-5 flex-row items-center">
          {CHILDREN.map((c) => (
            <View
              key={c.name}
              className="mr-3 flex-row items-center rounded-2xl border border-border bg-white py-2 pl-2 pr-4"
            >
              <Image accessibilityIgnoresInvertColors className="h-11 w-11 rounded-full" contentFit="cover" source={c.face} />
              <View className="ml-2">
                <Text className="font-text text-body-lg font-bold text-ink">{c.name}</Text>
                <Text className="font-text text-body text-text-secondary">{c.year}</Text>
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
        </View>

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
          {STATS.map((s) => (
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
        <CurriculumCard
          thumb={require("../../../assets/images/gokid-pc-maths.png")}
          subject="Maths"
          topic="Number and place value"
          badge="Strong"
          tone="strong"
        />

        {/* Curriculum to focus on */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Curriculum to focus on</Text>
        <CurriculumCard
          thumb={require("../../../assets/images/gokid-pc-english.png")}
          subject="English"
          topic="Grammar and punctuation"
          badge="Needs practice"
          tone="practice"
        />

        {/* Account */}
        <View className="mt-8 rounded-2xl border border-border bg-white px-4">
          <AccountRow
            symbol="gearshape"
            label="Subscription"
            value="GoKid Plus"
            border
            onPress={() => router.push("/paywall")}
          />
          <AccountRow symbol="person.2" label="Children" border onPress={() => router.push("/children")} />
          <AccountRow symbol="person.circle" label="Account settings" border onPress={() => router.push("/settings")} />
          {/* Not in design/GoKid-parentcontent-screen.png, which specifies only Subscription and
              Account settings here — added on request. Safe on this screen (and not on the
              child-facing ones) because it sits behind the parent zone's maths gate. */}
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
