import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/** Notifications — the dashboard bell's destination. Demo feed so the bell is a working entry point. */

type Note = { id: string; symbol: SFSymbol; tint: string; title: string; body: string; time: string }

const NOTES: Note[] = [
  {
    id: "n1",
    symbol: "star.fill",
    tint: colors.accent,
    title: "New badge earned",
    body: "You mastered 30% of Place Value to 1,000 — keep it up!",
    time: "2h ago",
  },
  {
    id: "n2",
    symbol: "bell.badge.fill",
    tint: colors.primary,
    title: "Daily study reminder",
    body: "Amara has 8 cards left in Place Value to 1,000.",
    time: "Today, 8:00",
  },
  {
    id: "n3",
    symbol: "sparkles",
    tint: colors.success,
    title: "New set ready",
    body: "“Capital Cities of Europe” has been added to Ready for you.",
    time: "Yesterday",
  },
]

function NoteRow({ note }: { note: Note }) {
  return (
    <View className="mb-3 flex-row items-start rounded-lg border border-border bg-white p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
        <SymbolView name={note.symbol} size={20} tintColor={note.tint} weight="regular" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{note.title}</Text>
        <Text className="mt-1 font-text text-body text-text-secondary">{note.body}</Text>
        <Text className="mt-1 font-text text-caption text-text-secondary">{note.time}</Text>
      </View>
    </View>
  )
}

export default function Notifications() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

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
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Notifications</Text>
      </View>

      <ScrollView className="mt-4 flex-1" contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
        {NOTES.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
