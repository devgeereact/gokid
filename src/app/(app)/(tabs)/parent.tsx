import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { DEFAULT_AVATAR, useChildren, yearLabel } from "@/lib/children"

/**
 * Parent Zone gate (design/GoKid-parentzone-screen.png, screen 11). The parent list sits dimmed
 * behind a maths-gate modal — answer "7 × 8" to pass through to the parent content screen. Keeps kids
 * out without a stored PIN. The "11. Parent Zone" title is a mockup annotation — dropped.
 */

const ANSWER = "56"
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const

function ChildRow({ name, year, avatar }: { name: string; year: string; avatar: typeof DEFAULT_AVATAR }) {
  return (
    <View className="h-16 flex-row items-center border-b border-border">
      <ChildAvatar avatar={avatar} className="h-11 w-11" />
      <View className="ml-4 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{name}</Text>
        <Text className="font-text text-body text-text-secondary">{year}</Text>
      </View>
      <SymbolView name="chevron.right" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
    </View>
  )
}

export default function Parent() {
  const { children } = useChildren()
  const [entry, setEntry] = useState("")

  function press(k: (typeof KEYS)[number]) {
    if (k === "") return
    if (k === "del") {
      setEntry((e) => e.slice(0, -1))
      return
    }
    const next = (entry + k).slice(0, 2)
    if (next === ANSWER) {
      setEntry("")
      router.push("/parent-content")
      return
    }
    setEntry(next)
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* Parent zone preview — dimmed behind the gate */}
      <View className="flex-1 px-5 pt-2 opacity-40">
        <Text className="font-text text-h1 font-bold text-ink">Parent Zone</Text>
        <View className="mt-4 border-t border-border pt-4">
          <Text className="mb-1 font-text text-body-lg text-text-secondary">Your children</Text>
          {(children.length ? children : []).map((c) => (
            <ChildRow key={c.id} name={c.name} year={yearLabel(c.yearGroup)} avatar={c.avatar} />
          ))}
        </View>
        <View className="mt-6 rounded-2xl border border-border bg-white p-4">
          <Text className="font-text text-body-lg text-text-secondary">Subscription</Text>
          <Text className="mt-1 font-text text-h3 font-bold text-ink">GoKid Plus</Text>
          <Text className="mt-1 font-text text-body text-text-secondary">Renews 12 May 2025</Text>
        </View>
      </View>

      {/* Maths gate */}
      <View className="absolute inset-0 items-center justify-center px-8">
        <View className="w-full max-w-[360px] rounded-2xl bg-white px-6 pb-8 pt-7 shadow-floating">
          <Text className="text-center font-text text-h2 font-bold text-ink">Parent area</Text>
          <Text className="mt-3 text-center font-text text-h3 text-ink">What is 7 × 8?</Text>

          <View className="mt-6 h-16 items-center justify-center rounded-lg border border-border">
            <Text className="font-text text-h2 font-bold text-ink">{entry}</Text>
          </View>

          <View className="mt-5 flex-row flex-wrap justify-between">
            {KEYS.map((k, i) =>
              k === "" ? (
                <View key={i} className="mb-3 h-16 w-[30%]" />
              ) : (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={k === "del" ? "Delete" : k}
                  className="mb-3 h-16 w-[30%] items-center justify-center rounded-lg border border-border bg-white active:bg-background"
                  onPress={() => press(k)}
                >
                  {k === "del" ? (
                    <SymbolView name="delete.left" size={26} tintColor={colors.ink} weight="regular" />
                  ) : (
                    <Text className="font-text text-h2 font-bold text-ink">{k}</Text>
                  )}
                </Pressable>
              )
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
