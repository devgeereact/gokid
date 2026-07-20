import { useSSO } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import * as AuthSession from "expo-auth-session"
import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { GoogleMark } from "@/components/google-mark"
import { RoundedHeading } from "@/components/rounded-heading"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useIsOnline } from "@/lib/network"

const PRIVACY_URL = "https://gokid.app/privacy"
const TERMS_URL = "https://gokid.app/terms"

// Dismisses the auth browser and resolves the pending session when the OAuth redirect
// lands back in the app. Without this the browser never hands control back, startSSOFlow
// never returns a session, and Clerk is left holding an orphaned native session — which is
// what produced "[ClerkProvider] Failed to sync native client state: No session was found".
WebBrowser.maybeCompleteAuthSession()

type Provider = "oauth_apple" | "oauth_google"

export default function SignIn() {
  const { startSSOFlow } = useSSO()
  const [pending, setPending] = useState<Provider | null>(null)
  // §1 "Authentication Error" — the failure used to go to Sentry and nowhere else, so a parent whose
  // sign-in failed saw a button that just stopped working. Cleared on the next attempt.
  const [failed, setFailed] = useState<Provider | null>(null)
  // §1 "Internet Required for First Login". `null` = undecided; only a hard `false` blocks the flow,
  // because a failed probe must not lock a parent out of their own account.
  const online = useIsOnline()
  const offline = online === false

  // Preloads the in-app browser so the OAuth sheet opens without a cold-start stall.
  useEffect(() => {
    void WebBrowser.warmUpAsync()
    return () => {
      void WebBrowser.coolDownAsync()
    }
  }, [])

  const signInWith = useCallback(
    async (strategy: Provider) => {
      if (pending) return
      // Fail fast with an explanation rather than opening an OAuth sheet that cannot load.
      if (offline) {
        setFailed(strategy)
        return
      }
      setFailed(null)
      setPending(strategy)
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          // Must match the app scheme (gokid://, from app.json) so the provider can redirect
          // back into the app and close the browser. Omitting it strands the flow.
          redirectUrl: AuthSession.makeRedirectUri(),
        })
        // startSSOFlow handles the sign-in / sign-up transfer internally. No session and no
        // throw means the parent dismissed the sheet — that is a cancellation, not a failure.
        // On success setActive flips Clerk to signed-in; the (auth) layout guard then
        // redirects to the app. Navigating here as well would race that redirect.
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId })
        }
      } catch (error) {
        Sentry.captureException(error, { tags: { flow: "sso", strategy } })
        // Sentry still gets the detail; the parent gets a plain sentence and a way to retry.
        setFailed(strategy)
      } finally {
        setPending(null)
      }
    },
    [pending, offline, startSSOFlow]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* The hero renders at its natural size against the top; the spacer below takes up
          whatever slack a given screen height leaves. */}
      <Image
        accessibilityLabel="Two children sitting in the grass, reading a book together"
        className="mt-8 aspect-hero w-full"
        contentFit="contain"
        source={require("../../../assets/images/gokid-auth-hero.png")}
      />

      <View className="flex-1" />

      <View className="px-12 pb-2">
        {/*
          Line breaks are set by hand, as they are in the reference. They are not a wrapping
          accident: iOS's real SF Pro Rounded runs about 17% wider than the face the mock was
          rendered with, so no column width reproduces all four of the reference's break
          patterns at once. Fixed copy on a fixed layout — pin the breaks and they hold.
        */}
        <RoundedHeading
          color={colors.ink}
          fallbackClassName="text-center text-display font-bold text-ink"
          size={34}
          weight="bold"
        >
          {"Learning that\nfollows their\nschool year."}
        </RoundedHeading>

        <View className="mt-2">
          <RoundedHeading
            color={colors["text-secondary"]}
            fallbackClassName="text-center text-subtitle font-semibold text-text-secondary"
            size={21}
            weight="semibold"
          >
            {"Flashcards and quizzes\nbuilt on the UK\nNational Curriculum."}
          </RoundedHeading>
        </View>

        {/* §1 "Authentication Error" / "Internet Required for First Login". Sits above the buttons
            so the retry the parent is being asked to make is the next thing under their thumb. */}
        {offline || failed ? (
          <View className="mt-3">
            <AlertBanner
              tone={offline ? "warning" : "error"}
              title={offline ? "You need internet to sign in" : "Sign-in didn’t complete"}
              body={
                offline
                  ? "Signing in is a one-off — once you’re in, downloaded sets work offline."
                  : "Nothing was charged and no account was created. Have another go."
              }
              onDismiss={offline ? undefined : () => setFailed(null)}
            />
          </View>
        ) : null}

        {/* §1 "Apple Sign-in Loading" / "Google Sign-in Loading". Was disable-only: the button dimmed
            and the parent had no signal anything was happening while the OAuth sheet warmed up. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: pending !== null, busy: pending === "oauth_apple" }}
          className={`mt-3 h-14 flex-row items-center justify-center gap-3 rounded-button bg-black active:opacity-80 ${
            pending !== null && pending !== "oauth_apple" ? "opacity-40" : ""
          }`}
          disabled={pending !== null}
          onPress={() => signInWith("oauth_apple")}
        >
          {pending === "oauth_apple" ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <SymbolView name="apple.logo" size={22} tintColor={colors.white} />
          )}
          <Text className="font-text text-body-lg font-semibold text-white">
            {pending === "oauth_apple" ? "Signing you in…" : "Continue with Apple"}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: pending !== null, busy: pending === "oauth_google" }}
          className={`mt-3 h-14 flex-row items-center justify-center gap-3 rounded-button border border-border bg-white shadow-subtle active:opacity-80 ${
            pending !== null && pending !== "oauth_google" ? "opacity-40" : ""
          }`}
          disabled={pending !== null}
          onPress={() => signInWith("oauth_google")}
        >
          {pending === "oauth_google" ? <ActivityIndicator color={colors.ink} /> : <GoogleMark size={22} />}
          <Text className="font-text text-body-lg font-semibold text-ink">
            {pending === "oauth_google" ? "Signing you in…" : "Continue with Google"}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center font-text text-body-lg font-medium text-text-secondary">
          {"For parents. Your child\nwon’t need an account."}
        </Text>

        {/* These read as links and were not tappable — the one place a parent is asked to agree to
            terms is the one place the terms have to be reachable. App Review checks this. */}
        <Text className="mt-5 text-center font-text text-legal text-text-secondary">
          {"By continuing, you agree to our\n"}
          <Text
            accessibilityRole="link"
            className="font-semibold text-primary"
            onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
          >
            Terms of Use
          </Text>
          {" and "}
          <Text
            accessibilityRole="link"
            className="font-semibold text-primary"
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
          >
            Privacy Policy
          </Text>
          .
        </Text>

        {/* §1 "Data Usage Explanation" — what we collect, in one tap, before they commit. */}
        <Pressable
          accessibilityRole="button"
          className="mt-3 self-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.push("/data-usage")}
        >
          <Text className="text-center font-text text-legal font-semibold text-text-secondary underline">
            What data does GoKid collect?
          </Text>
        </Pressable>

        {/* Clerk's bot protection is on (smart captcha) and an SSO transfer can create a
            sign-up, so this mount point has to exist even though there is no form here. */}
        <View nativeID="clerk-captcha" />
      </View>
    </SafeAreaView>
  )
}
