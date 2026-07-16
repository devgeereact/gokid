import { Stack } from "expo-router"

/**
 * Study tab stack. The dashboard (index) and its study-session flow (session → answer-result →
 * session-summary → set-result → congratulations) all live inside this stack so the native tab bar
 * (Study · Progress · Parent) stays visible while pushing — design screens 18–21 & 23 show it.
 * AGENTS.md forbids a JS tab bar; nesting the flow in the tab's own Stack is the native-tabs way.
 */
export default function StudyStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
