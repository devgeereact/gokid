import "../../global.css"

import { ClerkProvider } from "@clerk/expo"
import { tokenCache } from "@clerk/expo/token-cache"
import * as Sentry from "@sentry/react-native"
import { isRunningInExpoGo } from "expo"
import { type ErrorBoundaryProps, router, Stack, useNavigationContainerRef } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as Notifications from "expo-notifications"
import { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { EmptyState } from "@/components/empty-state"
import { SafeAreaView } from "@/components/styled"
import { REMINDER_NOTIFICATION_ID } from "@/lib/reminders"
import { hydrateDownloads } from "@/lib/downloads"
import { hydrateSessionCache } from "@/lib/session-cache"

// Time-to-display and native frame tracking need native modules Expo Go doesn't ship.
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
})

Sentry.init({
  dsn: "https://8896f7f4e49830ef03edcb5831e6bcde@o4511713747271680.ingest.de.sentry.io/4511733550547024",
  // Off by design. GoKid is used by children, and `sendDefaultPii` attaches IP addresses and user
  // identifiers to every event — data that should not leave a child's device without a deliberate
  // decision (UK GDPR / the Children's Code). Errors are still tagged with a `flow` for triage; if a
  // parent-scoped identifier is ever needed for support, attach a hashed parent id explicitly rather
  // than turning this blanket flag back on.
  sendDefaultPii: false,
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

/**
 * App-wide error screen (MVP → Essential System States → "Error handling"). expo-router renders this
 * instead of the red box when a render throws anywhere below the root. The throw is reported to
 * Sentry first — AGENTS.md forbids swallowing errors — then `retry` remounts the failed segment.
 * No design reference covers it; it reuses the shared EmptyState.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { flow: "render" } })
  }, [error])

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <StatusBar style="dark" />
        <EmptyState
          symbol="exclamationmark.triangle"
          title="Something went wrong"
          body={__DEV__ ? error.message : "That screen didn't load. We've logged it — try again."}
          actionLabel="Try again"
          onAction={() => void retry()}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

function RootLayout() {
  const navigationRef = useNavigationContainerRef()
  // Fires for a tap on any local/remote notification — while the app is running AND on a cold start
  // caused by one (SDK 57's documented way to catch both in one place; see the expo-notifications
  // docs for `useLastNotificationResponse`). Today the only notification GoKid ever schedules is
  // lib/reminders.ts's one daily study reminder, and until now tapping it opened the app to whatever
  // the entry fork (src/app/index.tsx) or the last screen happened to be — a real entry point into
  // the app that led nowhere in particular.
  const notificationResponse = Notifications.useLastNotificationResponse()

  // Downloaded sets are content the app already has; installing it is a startup concern, not
  // something that should wait for the parent to open the Storage screen. See lib/downloads.
  useEffect(() => {
    void hydrateDownloads()
    // Read before the entry gate needs it: with no network Clerk never answers, and this is what
    // decides whether the app opens or shows the sign-in screen. See lib/session-cache.ts.
    hydrateSessionCache()
  }, [])

  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef)
    }
  }, [navigationRef])

  useEffect(() => {
    if (notificationResponse?.notification.request.identifier !== REMINDER_NOTIFICATION_ID) return
    // The study dashboard for whichever child is currently active — the reminder is a prompt to
    // study, not to any particular set, so the tab that lists what's ready is the honest landing
    // spot rather than guessing a specific lesson.
    router.push("/study")
  }, [notificationResponse])

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
