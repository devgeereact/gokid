import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Parent Zone content (design/GoKid-parentcontent-screen.png, screen 12). Reached once the maths gate
 * is passed. Child switcher, a time/sets overview, curriculum strengths + focus, and account rows.
 * All figures are demo data (the reporting API lands later — AGENTS.md). Subject thumbs and child
 * faces are cropped off the reference. The "12. Parent Zone" title is a mockup annotation — dropped.
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
  onPress,
}: {
  symbol: SFSymbol
  label: string
  value?: string
  border?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`h-14 flex-row items-center active:opacity-60 ${border ? "border-b border-border" : ""}`}
      onPress={onPress}
    >
      <SymbolView name={symbol} size={24} tintColor={colors.ink} weight="regular" />
      <Text className="ml-4 flex-1 font-text text-body-lg font-semibold text-ink">{label}</Text>
      {value ? <Text className="mr-2 font-text text-body-lg font-bold text-ink">{value}</Text> : null}
      <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
    </Pressable>
  )
}

export default function ParentContent() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" contentContainerClassName="pb-8 pt-2" showsVerticalScrollIndicator={false}>
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

        {/* Progress overview */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Progress overview</Text>
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

        {/* Curriculum strengths */}
        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Curriculum strengths</Text>
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
          <AccountRow symbol="person.circle" label="Account settings" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
