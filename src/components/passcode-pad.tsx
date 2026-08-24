import { SymbolView } from "@/components/symbol"
import { Pressable, Text, View } from "react-native"

import { colors } from "@/design/tokens"
import { PASSCODE_LENGTH } from "@/lib/parent-passcode"

/**
 * The passcode keypad and its filled-dot readout, shared by the gate
 * (`src/components/parent-gate.tsx`) and the change-passcode screen so the two cannot drift apart.
 *
 * Digits are shown as dots, never as the numerals entered: a parent typically opens this with the
 * child standing next to them, and a plain-text field hands the code to anyone watching. The layout
 * mirrors design/GoKid-parentzone-screen.png — three columns, an empty cell at the bottom left, a
 * delete key at the bottom right.
 */

/** Bottom row leads with a blank cell so "0" sits centred under "8", as in the reference. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const

export type PasscodeKey = (typeof KEYS)[number]

export function PasscodeDots({ count, error }: { count: number; error?: boolean }) {
  return (
    <View className="mt-6 flex-row items-center justify-center gap-4">
      {Array.from({ length: PASSCODE_LENGTH }, (_, i) => {
        const filled = i < count
        return (
          <View
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${
              error
                ? "border-error bg-error"
                : filled
                  ? "border-primary bg-primary"
                  : "border-border bg-transparent"
            }`}
          />
        )
      })}
    </View>
  )
}

export function PasscodeKeypad({ disabled, onKey }: { disabled?: boolean; onKey: (key: PasscodeKey) => void }) {
  return (
    <View className="mt-7 flex-row flex-wrap justify-between">
      {KEYS.map((key, i) =>
        key === "" ? (
          // Spacer, not a control — must not be focusable by VoiceOver.
          <View key={`spacer-${i}`} className="mb-3 h-16 w-[30%]" />
        ) : (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === "del" ? "Delete" : key}
            // The passcode gate is a security boundary and the Maestro flows that exercise it must
            // hit the keypad and nothing else. A digit is a one-character label — matching "1" by
            // text also matches the "1 tries left" line the gate renders directly above the pad, so
            // a wrong-passcode flow could tap the warning and report a pass. This is the only handle
            // on a key that cannot collide with the screen's own copy.
            testID={`passcode-key-${key}`}
            disabled={disabled}
            className={`mb-3 h-16 w-[30%] items-center justify-center rounded-lg border border-border bg-white active:bg-background ${
              disabled ? "opacity-40" : ""
            }`}
            onPress={() => onKey(key)}
          >
            {key === "del" ? (
              <SymbolView name="delete.left" size={24} tintColor={colors.ink} weight="regular" />
            ) : (
              <Text className="font-text text-h2 font-bold text-ink">{key}</Text>
            )}
          </Pressable>
        )
      )}
    </View>
  )
}
