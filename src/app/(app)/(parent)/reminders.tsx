import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useState } from "react"
import { Linking, Pressable, ScrollView, Text, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { setPreference, usePreferences } from "@/lib/preferences"
import { cancelReminders, reminderLabel, requestReminderPermission, scheduleDailyReminder } from "@/lib/reminders"

/**
 * Reminder Settings (design/gokid-screens.md §12 → Learning → "Reminder Time"; §13 → "Reminder
 * Settings").
 *
 * A local daily notification, off by default, set by a parent. The constraints are the point:
 *
 *  - **One a day, at a time the parent picks.** No escalation, nothing sent because a child missed
 *    yesterday, no second nudge. §9 rejected streaks for manufacturing pressure and a reminder is
 *    the same mechanic if it is allowed to become one.
 *  - **Addressed to the adult.** The notification carries no child's name and no guilt — a lock
 *    screen is readable by anyone holding the phone, including the child.
 *  - **Honest about permission.** If the OS has been told no, the screen says so and offers the
 *    Settings route rather than a toggle that appears to work and silently does nothing.
 *
 * Times are offered as a short list rather than a free picker: after-school and bedtime are when
 * this is actually useful, and a wheel inviting 3:47am is precision no one needs.
 */

const TIMES: { minutes: number; label: string; hint: string }[] = [
  { minutes: 8 * 60, label: "8:00 am", hint: "Before school" },
  { minutes: 16 * 60, label: "4:00 pm", hint: "After school" },
  { minutes: 17 * 60 + 30, label: "5:30 pm", hint: "Before dinner" },
  { minutes: 18 * 60 + 30, label: "6:30 pm", hint: "Evening" },
  { minutes: 19 * 60, label: "7:00 pm", hint: "Wind-down" },
]

export default function Reminders() {
  const { reminderMinutes } = usePreferences()
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  async function choose(minutes: number) {
    if (busy) return
    setBusy(true)
    setDenied(false)
    try {
      const allowed = await requestReminderPermission()
      if (!allowed) {
        // Do not store a preference we cannot honour: a saved time with no permission is a setting
        // that silently does nothing, which is the exact failure this project keeps removing.
        setDenied(true)
        return
      }
      const ok = await scheduleDailyReminder(Math.floor(minutes / 60), minutes % 60)
      if (ok) setPreference("reminderMinutes", minutes)
      else setDenied(true)
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    await cancelReminders()
    setPreference("reminderMinutes", null)
    setDenied(false)
    setBusy(false)
  }

  const current = reminderMinutes

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Study reminder</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-body-lg text-text-secondary">
          One quiet reminder a day, at a time you choose. Off unless you turn it on.
        </Text>

        {denied ? (
          <View className="mt-4">
            <AlertBanner
              title="Notifications are turned off"
              body="GoKid needs permission from iOS to send a reminder. You can turn it on in Settings."
              onDismiss={() => setDenied(false)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open iOS Settings"
              className="mt-3 h-12 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
              onPress={() => void Linking.openSettings()}
            >
              <Text className="font-text text-body font-bold text-ink">Open Settings</Text>
            </Pressable>
          </View>
        ) : null}

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Remind me at</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          {TIMES.map((time, i) => {
            const active = current === time.minutes
            return (
              <Pressable
                key={time.minutes}
                accessibilityRole="radio"
                accessibilityLabel={`${time.label}, ${time.hint}`}
                accessibilityState={{ selected: active, disabled: busy }}
                className={`h-14 flex-row items-center active:opacity-60 ${
                  i === TIMES.length - 1 ? "" : "border-b border-border"
                }`}
                disabled={busy}
                onPress={() => void choose(time.minutes)}
              >
                <View className="flex-1">
                  <Text className="font-text text-body-lg text-ink">{time.label}</Text>
                  <Text className="mt-0.5 font-text text-caption text-text-secondary">{time.hint}</Text>
                </View>
                <SymbolView
                  name={active ? "largecircle.fill.circle" : "circle"}
                  size={20}
                  tintColor={active ? colors.primary : colors["text-secondary"]}
                  weight="semibold"
                />
              </Pressable>
            )
          })}
        </View>

        {current !== null ? (
          <>
            <View className="mt-4 flex-row items-center rounded-2xl bg-badge-strong p-4">
              <SymbolView name="bell.fill" size={18} tintColor={colors.badge["strong-ink"]} weight="semibold" />
              <Text className="ml-3 flex-1 font-text text-body font-bold text-badge-strong-ink">
                Reminding you daily at {reminderLabel(Math.floor(current / 60), current % 60)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Turn the reminder off"
              className="mt-4 h-14 items-center justify-center rounded-full border border-border bg-white active:opacity-70"
              disabled={busy}
              onPress={() => void turnOff()}
            >
              <Text className="font-text text-body-lg font-bold text-ink">Turn the reminder off</Text>
            </Pressable>
          </>
        ) : null}

        <View className="mt-8 rounded-2xl border border-border bg-white p-4">
          <View className="flex-row items-center">
            <SymbolView name="hand.raised" size={18} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body-lg font-bold text-ink">What this will not do</Text>
          </View>
          <Text className="mt-2 font-text text-body text-text-secondary">
            It will never chase a missed day, never send more than one a day, and never name your
            child on the lock screen. GoKid has no streaks, and this does not add one.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
