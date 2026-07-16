import { useAuth } from "@clerk/expo"
import { Redirect, Stack } from "expo-router"

import { Splash } from "@/components/splash"

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <Splash />
  if (!isSignedIn) return <Redirect href="/sign-in" />

  return <Stack screenOptions={{ headerShown: false }} />
}
