import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Text, View } from "react-native"

import { type PasscodeKey, PasscodeDots, PasscodeKeypad } from "@/components/passcode-pad"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { PASSCODE_LENGTH, setPasscode } from "@/lib/parent-passcode"

/**
 * Change the parent passcode.
 *
 * It does not ask for the current code first. This screen only renders inside the `(parent)` group,
 * whose layout will not mount it until the gate is open — so the current passcode has already been
 * entered to get here. Asking again would be theatre, not a second factor.
 *
 * Two entries, same as first-run creation: a mistyped new code that is never confirmed would lock a
 * parent out of their own settings until they re-authenticated.
 */
export default function ChangePasscode() {
  const [entry, setEntry] = useState("")
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const confirming = draft !== null

  async function submit(code: string) {
    setBusy(true)
    try {
      if (draft === null) {
        setDraft(code)
        setEntry("")
        return
      }
      if (code !== draft) {
        setDraft(null)
        setEntry("")
        setError("Those didn't match — start again")
        return
      }
      try {
        await setPasscode(code)
        // Straight back to settings — the gate stays open, this only swapped the credential.
        if (router.canGoBack()) router.back()
        else router.replace("/settings")
      } catch {
        // setPasscode reported to Sentry already. The old code is still the live one.
        setDraft(null)
        setEntry("")
        setError("Couldn't save your passcode — your old one still works")
      }
    } finally {
      setBusy(false)
    }
  }

  function press(key: PasscodeKey) {
    if (busy || key === "") return
    setError(null)
    if (key === "del") {
      setEntry((e) => e.slice(0, -1))
      return
    }
    const next = entry + key
    setEntry(next)
    if (next.length >= PASSCODE_LENGTH) void submit(next)
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton size={22} fallback="/home" />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Change passcode</Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="w-full max-w-[360px] rounded-2xl bg-white px-6 pb-8 pt-7 shadow-floating">
          <View className="h-12 w-12 items-center justify-center self-center rounded-full bg-study-wash">
            <SymbolView name="lock.rotation" size={22} tintColor={colors.primary} weight="semibold" />
          </View>

          <Text className="mt-4 text-center font-text text-h2 font-bold text-ink">
            {confirming ? "Confirm new passcode" : "New passcode"}
          </Text>
          <Text className="mt-2 text-center font-text text-body text-text-secondary">
            {confirming ? "Enter the same four digits again." : "Choose four digits."}
          </Text>

          <PasscodeDots count={entry.length} error={error !== null} />

          {error ? (
            <Text className="mt-3 text-center font-text text-body font-semibold text-error">{error}</Text>
          ) : (
            <View className="mt-3 h-5" />
          )}

          <PasscodeKeypad disabled={busy} onKey={press} />
        </View>
      </View>
    </SafeAreaView>
  )
}
