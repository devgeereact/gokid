import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native"

import { BackButton, Section } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { setPreference, useReadingClasses, usePreferences } from "@/lib/preferences"

/**
 * Accessibility (design/gokid-screens.md §19). Deliberately small and honest: the one setting that
 * changes in-app behaviour — Reduce Motion — is a real toggle wired to the flashcard flip and OR'd
 * with the device's own setting. Text size and contrast are owned by iOS/Android system-wide and the
 * app already honours them (Dynamic Type), so instead of shipping a half-working in-app copy this
 * screen explains that and offers a shortcut to the device settings where they genuinely work.
 */

/** A settings row with a native switch. */
function ToggleRow({
  symbol,
  label,
  hint,
  value,
  onValueChange,
}: {
  symbol: Parameters<typeof SymbolView>[0]["name"]
  label: string
  hint: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  return (
    <View className="flex-row items-center px-4 py-4">
      <SymbolView name={symbol} size={24} tintColor={colors.ink} weight="regular" />
      <View className="ml-4 flex-1 pr-3">
        <Text className="font-text text-body-lg font-semibold text-ink">{label}</Text>
        <Text className="mt-0.5 font-text text-body text-text-secondary">{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel={label}
      />
    </View>
  )
}

function InfoRow({
  symbol,
  label,
  hint,
}: {
  symbol: Parameters<typeof SymbolView>[0]["name"]
  label: string
  hint: string
}) {
  return (
    <View className="flex-row items-center border-b border-border px-4 py-4 last:border-b-0">
      <SymbolView name={symbol} size={24} tintColor={colors.ink} weight="regular" />
      <View className="ml-4 flex-1">
        <Text className="font-text text-body-lg font-semibold text-ink">{label}</Text>
        <Text className="mt-0.5 font-text text-body text-text-secondary">{hint}</Text>
      </View>
    </View>
  )
}

export default function Accessibility() {
  const { reduceMotion, haptics, dyslexiaMode } = usePreferences()
  const reading = useReadingClasses()

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Accessibility</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Section title="Motion" className="mb-3 mt-4" />
        <View className="rounded-2xl border border-border bg-white">
          <ToggleRow
            symbol="wand.and.stars"
            label="Reduce motion"
            hint="Turn off the card-flip animation and other movement."
            value={reduceMotion}
            onValueChange={(v) => setPreference("reduceMotion", v)}
          />
        </View>
        <Text className="mt-2 px-1 font-text text-caption text-text-secondary">
          This also follows your device&apos;s own Reduce Motion setting.
        </Text>

        {/* §12 → "Haptics". On by default: for a child studying with the sound off, or who cannot
            hear it at all, a tap is the clearest confirmation their answer registered — the visual
            change happens under the thumb that just covered it. */}
        {/* §19 "Dyslexia Reading Mode" + "Larger Text Preview". The preview is live: it renders with
            the same classes the flashcards use and at the device's current Dynamic Type size, so a
            parent sees the real result before committing rather than a described one. */}
        <Section title="Reading" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white">
          <ToggleRow
            symbol="text.book.closed"
            label="Dyslexia-friendly reading"
            hint="Looser lines, wider spacing, and left-aligned text on cards."
            value={dyslexiaMode}
            onValueChange={(v) => setPreference("dyslexiaMode", v)}
          />
        </View>
        <View className="mt-3 rounded-2xl border border-border bg-white p-4">
          <Text className="font-text text-caption text-text-secondary">Preview</Text>
          <Text className={`mt-2 font-text text-body-lg text-ink ${reading.align} ${reading.text}`}>
            In 452, what is the value of the 4?
          </Text>
          <Text className="mt-3 font-text text-caption text-text-secondary">
            This preview uses your device&apos;s current text size. Change it in iOS Settings →
            Display &amp; Brightness → Text Size and every screen follows.
          </Text>
        </View>

        <Section title="Feedback" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white">
          <ToggleRow
            symbol="hand.tap"
            label="Vibration"
            hint="A gentle tap when an answer is recorded or a card is turned over."
            value={haptics}
            onValueChange={(v) => setPreference("haptics", v)}
          />
        </View>

        <Section title="Text &amp; contrast" className="mb-3 mt-8" />
        <View className="rounded-2xl border border-border bg-white">
          <InfoRow
            symbol="textformat.size"
            label="Text size"
            hint="GoKid uses your device text size. Change it in Settings › Accessibility › Display &amp; Text Size."
          />
          <InfoRow
            symbol="circle.lefthalf.filled"
            label="Contrast &amp; bold text"
            hint="GoKid follows your device&apos;s Increase Contrast and Bold Text settings."
          />
        </View>

        <Pressable
          className="mt-4 flex-row items-center rounded-2xl bg-study-wash p-4 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Open device accessibility settings"
          onPress={() => void Linking.openSettings()}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
            <SymbolView name="gearshape" size={22} tintColor={colors.primary} weight="regular" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-ink">Open device settings</Text>
            <Text className="mt-0.5 font-text text-body text-text-secondary">
              Adjust text size, contrast and bold text for every app.
            </Text>
          </View>
          <SymbolView name="arrow.up.right" size={16} tintColor={colors["text-secondary"]} weight="semibold" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
