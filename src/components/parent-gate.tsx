import { useSSO, useUser } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import * as AuthSession from "expo-auth-session"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"

import { type PasscodeKey, PasscodeDots, PasscodeKeypad } from "@/components/passcode-pad"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { MAX_ATTEMPTS, recordFailedAttempt, unlockGate, useParentGate } from "@/lib/parent-gate"
import {
  PASSCODE_LENGTH,
  clearPasscode,
  setPasscode,
  useParentPasscode,
  verifyPasscode,
} from "@/lib/parent-passcode"

// Same reason as sign-in.tsx: the OAuth redirect has to be able to hand control back to the app,
// and the forgot-passcode flow below opens that browser from here. Calling this twice is harmless.
WebBrowser.maybeCompleteAuthSession()

/**
 * The parent-gate challenge, rendered by the `(parent)` layout whenever the gate is locked.
 *
 * The gate used to pose an arithmetic question. That was the wrong lock for this app: GoKid drills
 * times tables, so the challenge got easier for the child exactly as the app did its job, and any
 * child who learned the answer had the door open permanently. It is now a four-digit passcode the
 * parent chooses on first entry (`src/lib/parent-passcode.ts`), which does not decay as the child
 * learns.
 *
 * The rest of the hardening the maths gate introduced is kept:
 *   - wrong entries are counted and surfaced ("2 tries left"), and after MAX_ATTEMPTS the pad locks
 *     out until the parent dismisses and re-enters;
 *   - a cancel control exists — the original inline gate trapped you on the tab;
 *   - digits render as dots, never as numerals, since a child is usually watching.
 *
 * A parent who forgets re-authenticates with the Clerk account that already owns this app's data
 * and then sets a new code — no reset that a child could reach, and no lockout from your own
 * billing.
 */
export function ParentGate() {
  const { attempts } = useParentGate()
  const { isLoaded, hasPasscode } = useParentPasscode()
  const { user } = useUser()
  const { startSSOFlow } = useSSO()

  const [entry, setEntry] = useState("")
  /** First of the two entries while creating a passcode; null means we are not confirming yet. */
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const lockedOut = attempts >= MAX_ATTEMPTS
  const creating = isLoaded && !hasPasscode
  const confirming = creating && draft !== null

  function dismiss() {
    if (router.canGoBack()) router.back()
    else router.replace("/home")
  }

  async function submit(code: string) {
    setBusy(true)
    try {
      if (creating) {
        // First pass: hold it and ask for the same digits again.
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
          unlockGate()
        } catch {
          // setPasscode already reported to Sentry. Say the code was not saved rather than opening
          // the gate on a passcode that does not exist.
          setDraft(null)
          setEntry("")
          setError("Couldn't save your passcode — try again")
        }
        return
      }

      if (await verifyPasscode(code)) {
        setEntry("")
        unlockGate()
        return
      }

      // recordFailedAttempt returns the count *after* incrementing — the previous gate added one to
      // it as well, so it over-counted and locked out a try early.
      const failed = recordFailedAttempt()
      setEntry("")
      setError(failed >= MAX_ATTEMPTS ? "Too many tries" : `Wrong passcode — ${MAX_ATTEMPTS - failed} tries left`)
    } finally {
      setBusy(false)
    }
  }

  function press(key: PasscodeKey) {
    if (lockedOut || busy || key === "") return
    setError(null)
    if (key === "del") {
      setEntry((e) => e.slice(0, -1))
      return
    }
    const next = entry + key
    setEntry(next)
    // Submit on the last digit — a passcode has a known length, so an Enter key is pure friction.
    if (next.length >= PASSCODE_LENGTH) void submit(next)
  }

  /**
   * Forgot passcode: prove ownership of the Clerk account this app's data belongs to, then clear
   * the code so the create flow runs again. Uses the same provider the parent signed in with.
   */
  async function recover() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const provider = user?.externalAccounts?.[0]?.provider
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider === "apple" ? "oauth_apple" : "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        await clearPasscode()
        setDraft(null)
        setEntry("")
        return
      }
      // No session and no throw means the parent dismissed the sheet, or Clerk declined to create
      // one. Either way we have not proved anything — keep the old passcode in place.
      setError("We couldn't confirm your account")
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "parent-passcode", op: "recover" } })
      setError("We couldn't confirm your account")
    } finally {
      setBusy(false)
    }
  }

  const title = creating ? (confirming ? "Confirm your passcode" : "Create a passcode") : "Parent area"
  const body = lockedOut
    ? "Too many tries. Close this and ask a grown-up to try again."
    : confirming
      ? "Enter the same four digits again."
      : creating
        ? "Choose four digits. You'll need them each time you open the parent area."
        : "Enter your passcode."

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* Cancel — the original inline gate had no way out but another tab. */}
      <View className="h-11 flex-row items-center px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close parent area"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={dismiss}
        >
          <SymbolView name="xmark" size={22} tintColor={colors.ink} weight="semibold" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-[360px] rounded-2xl bg-white px-6 pb-8 pt-7 shadow-floating">
          {!isLoaded ? (
            // Holding here avoids flashing "Create a passcode" at a parent who already has one.
            <View className="h-72 items-center justify-center">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              <View className="h-12 w-12 items-center justify-center self-center rounded-full bg-study-wash">
                <SymbolView
                  name={creating ? "lock.rotation" : "lock.fill"}
                  size={22}
                  tintColor={colors.primary}
                  weight="semibold"
                />
              </View>

              <Text className="mt-4 text-center font-text text-h2 font-bold text-ink">{title}</Text>
              <Text className="mt-2 text-center font-text text-body text-text-secondary">{body}</Text>

              <PasscodeDots count={entry.length} error={error !== null} />

              {error ? (
                <Text className="mt-3 text-center font-text text-body font-semibold text-error">{error}</Text>
              ) : !lockedOut && !creating && attempts > 0 ? (
                <Text className="mt-3 text-center font-text text-body text-text-secondary">
                  {MAX_ATTEMPTS - attempts} tries left
                </Text>
              ) : (
                <View className="mt-3 h-5" />
              )}

              <PasscodeKeypad disabled={lockedOut || busy} onKey={press} />

              {/* The escape hatch stays reachable while locked out — that is the state a parent who
                  forgot their code actually ends up in. */}
              {!creating ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Forgot passcode"
                  disabled={busy}
                  className={`mt-1 h-11 items-center justify-center active:opacity-60 ${busy ? "opacity-40" : ""}`}
                  onPress={() => void recover()}
                >
                  <Text className="font-text text-body-lg font-bold text-primary">
                    {busy ? "Checking…" : "Forgot passcode?"}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}
