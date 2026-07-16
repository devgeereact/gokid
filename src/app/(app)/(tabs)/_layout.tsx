import { NativeTabs } from "expo-router/unstable-native-tabs"

import { colors } from "@/design/tokens"

/**
 * Study dashboard tab bar (design/GoKid-studydashboard-screen.png, screen 5): Study · Progress ·
 * Parent. Native tabs only — AGENTS.md §2 forbids a JS tab bar. `tintColor` is the design's teal
 * active state; inactive glyphs fall back to the system grey.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.primary}>
      <NativeTabs.Trigger name="study">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label>Study</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Icon sf="chart.bar" />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="parent">
        <NativeTabs.Trigger.Icon sf="lock" />
        <NativeTabs.Trigger.Label>Parent</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
