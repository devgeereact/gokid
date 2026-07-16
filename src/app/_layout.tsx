import "../../global.css"

import { ClerkProvider } from "@clerk/expo"
import { tokenCache } from "@clerk/expo/token-cache"
import * as Sentry from "@sentry/react-native"
import { isRunningInExpoGo } from "expo"
import { Stack, useNavigationContainerRef } from "expo-router"
import { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"

// Time-to-display and native frame tracking need native modules Expo Go doesn't ship.
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
  dsn: "https://8896f7f4e49830ef03edcb5831e6bcde@o4511713747271680.ingest.de.sentry.io/4511733550547024",
  sendDefaultPii: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  integrations: [navigationIntegration],
  enableNativeFramesTracking: !isRunningInExpoGo(),
})

// Metro only inlines EXPO_PUBLIC_* vars, and only where they are read in app code —
// reading this inside node_modules would come back undefined in a release build.
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to .env (Clerk Dashboard → API keys).")
}

function RootLayout() {
  const navigationRef = useNavigationContainerRef()

  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef)
    }
  }, [navigationRef])

  return (
    // react-native-safe-area-context v5 renders SafeAreaView as null until it has a
    // SafeAreaProvider ancestor to source insets from — without this every SafeAreaView
    // screen (sign-in, home, add-child) mounts blank while the plain-View splash renders.
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey!} tokenCache={tokenCache}>
        <Stack screenOptions={{ headerShown: false }} />
      </ClerkProvider>
    </SafeAreaProvider>
  )
}

export default Sentry.wrap(RootLayout)
