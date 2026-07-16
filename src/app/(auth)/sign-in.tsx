import { useSSO } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import * as AuthSession from "expo-auth-session"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import * as WebBrowser from "expo-web-browser"
import { useCallback, useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"

import { GoogleMark } from "@/components/google-mark"
import { RoundedHeading } from "@/components/rounded-heading"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

// Dismisses the auth browser and resolves the pending session when the OAuth redirect
// lands back in the app. Without this the browser never hands control back, startSSOFlow
// never returns a session, and Clerk is left holding an orphaned native session — which is
// what produced "[ClerkProvider] Failed to sync native client state: No session was found".
WebBrowser.maybeCompleteAuthSession()

type Provider = "oauth_apple" | "oauth_google"

export default function SignIn() {
  const { startSSOFlow } = useSSO()
  const [pending, setPending] = useState<Provider | null>(null)

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
      } finally {
        setPending(null)
      }
    },
    [pending, startSSOFlow]
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

        <Pressable
          accessibilityRole="button"
          className="mt-3 h-14 flex-row items-center justify-center gap-3 rounded-button bg-black active:opacity-80"
          disabled={pending !== null}
          onPress={() => signInWith("oauth_apple")}
        >
          <SymbolView name="apple.logo" size={22} tintColor={colors.white} />
          <Text className="font-text text-body-lg font-semibold text-white">Continue with Apple</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="mt-3 h-14 flex-row items-center justify-center gap-3 rounded-button border border-border bg-white shadow-subtle active:opacity-80"
          disabled={pending !== null}
          onPress={() => signInWith("oauth_google")}
        >
          <GoogleMark size={22} />
          <Text className="font-text text-body-lg font-semibold text-ink">Continue with Google</Text>
        </Pressable>

        <Text className="mt-4 text-center font-text text-body-lg font-medium text-text-secondary">
          {"For parents. Your child\nwon’t need an account."}
        </Text>

        <Text className="mt-5 text-center font-text text-legal text-text-secondary">
          {"By continuing, you agree to our\n"}
          <Text className="font-semibold text-primary">Terms of Use</Text> and{" "}
          <Text className="font-semibold text-primary">Privacy Policy</Text>.
        </Text>

        {/* Clerk's bot protection is on (smart captcha) and an SSO transfer can create a
            sign-up, so this mount point has to exist even though there is no form here. */}
        <View nativeID="clerk-captcha" />
      </View>
    </SafeAreaView>
  )
}
