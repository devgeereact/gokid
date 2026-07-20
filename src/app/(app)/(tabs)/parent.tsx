import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Text, View } from "react-native"

import { Button } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Parent tab — the entrance to the parent zone. It used to render the maths gate inline over a
 * dimmed preview of the child list and the subscription card, which meant a child could read a
 * parent's plan and renewal date straight through the 40%-opacity overlay, and the gate it drew
 * guarded only this one tab (every parent route was reachable by deep link anyway).
 *
 * Now this screen shows nothing sensitive — no names, no billing — just a door. Tapping "Enter"
 * navigates into the `(parent)` group, whose layout puts up the real gate (see
 * `src/components/parent-gate.tsx`) before any parent screen renders. The gate is the guard; this is
 * only the handle on the door.
 */
export default function Parent() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/*
        One focal point, centred. The screen previously stacked an `h1` "Parent area" against the top
        edge above a card whose own heading read "For grown-ups" — two competing titles either side of
        a large void, because the title was pinned top while the card centred itself in the remaining
        space. The tab bar already labels this screen, so the card carries the title alone.
      */}
      <View className="flex-1 items-center justify-center">
        <View className="w-full max-w-[360px] items-center rounded-2xl bg-white px-6 pb-8 pt-9 shadow-floating">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-study-wash">
            <SymbolView name="lock.fill" size={32} tintColor={colors.primary} weight="semibold" />
          </View>

          <Text className="mt-5 text-center font-text text-h2 font-bold text-ink">Parent area</Text>
          <Text className="mt-2 text-center font-text text-body text-text-secondary">
            Your passcode keeps this side of the app for the grown-ups.
          </Text>

          <Button
            label="Enter parent area"
            icon="arrow.right"
            className="mt-7 w-full"
            onPress={() => router.push("/parent-content")}
          />

          {/* Names the sections without rendering any of their data — a child reading this learns
              nothing about children, plans or renewal dates. */}
          <Text className="mt-5 text-center font-text text-caption text-text-secondary">
            Progress · Downloads · Settings · Subscription
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
