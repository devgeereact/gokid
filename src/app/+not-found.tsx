import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"

import { EmptyState } from "@/components/empty-state"
import { SafeAreaView } from "@/components/styled"

/**
 * Route not found (MVP → Essential System States → "Error handling"). expo-router renders this for
 * any path that does not resolve — a stale deep link, a bad share URL, a set that no longer exists.
 * No design reference covers it; it reuses the shared EmptyState so errors look like the rest of
 * the app rather than like a debug screen.
 */
export default function NotFound() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
      <StatusBar style="dark" />
      <EmptyState
        symbol="questionmark.circle"
        title="We can't find that page"
        body="The link may be out of date, or the set might have moved. Let's get you back to studying."
        actionLabel="Back to GoKid"
        onAction={() => router.replace("/")}
      />
    </SafeAreaView>
  )
}
