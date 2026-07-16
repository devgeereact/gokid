import { useAuth } from "@clerk/expo"
import { Redirect, Stack } from "expo-router"

import { Splash } from "@/components/splash"

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  // isLoaded first: Clerk restores the session from the keychain asynchronously, and
  // checking isSignedIn before that flashes the sign-in screen on every cold start.
  if (!isLoaded) return <Splash />
  if (isSignedIn) return <Redirect href="/" />

  return <Stack screenOptions={{ headerShown: false }} />
}
