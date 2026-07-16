import { Stack } from "expo-router"

/**
 * Progress tab stack. The progress dashboard (index) plus its detail screens — overview (16),
 * subject (17) and achievements (22) — live in this stack so the native tab bar stays visible while
 * pushing, matching those mockups. Native-tabs only (AGENTS.md); no hand-rolled tab bar.
 */
export default function ProgressStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
