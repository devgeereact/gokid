import * as Sentry from "@sentry/react-native"
import * as SecureStore from "expo-secure-store"
import { useEffect, useState, useSyncExternalStore } from "react"
import { AccessibilityInfo } from "react-native"

/**
 * Device-level accessibility & feedback preferences (design/gokid-screens.md §19). Small on-device
 * store, same module-singleton + `useSyncExternalStore` shape as the SRS and intro stores, persisted
 * to SecureStore so a choice survives a restart. These are the child's own comfort settings, not
 * account data, so they stay local rather than syncing with the future API.
 *
 * Only preferences that actually change behaviour live here — no toggle exists for a feature the app
 * does not have (that would be a control that does nothing, which the audit flagged). Right now that
 * is `reduceMotion`. Text size and contrast are handled by iOS/Android system-wide (the app honours
 * Dynamic Type by default); the Accessibility screen guides the parent to those rather than shipping
 * an in-app copy that only half-works.
 */

export type Preferences = {
  /** When true, the app skips non-essential animation (the flashcard flip plays instantly). */
  reduceMotion: boolean
  /**
   * Minutes of study a day the parent would like to aim for, or 0 for "no goal" (the default).
   *
   * Off by default, and deliberately so. This app rejected streaks and leaderboards (§9), and a
   * daily target is the same mechanic wearing a parent's face — it manufactures a way to fail on a
   * day a child was ill, busy, or simply done. It exists because some parents genuinely want a
   * gentle shape to the week, but nothing in the app nags about it, no screen counts down to it,
   * and missing it is never reported to the child as a loss.
   */
  dailyGoalMinutes: number
  /**
   * Haptic feedback on ratings and answers. On by default: for a child who cannot hear the app and
   * is not watching the exact pixel that changed, a tap is the clearest confirmation their answer
   * registered. Off is a real preference too — some children find it distracting.
   */
  haptics: boolean
  /**
   * Daily study reminder, as minutes past midnight local time, or null for off (the default).
   *
   * Stored rather than derived so the app can reschedule after a reinstall without asking again.
   * One reminder, never an escalation — see lib/reminders.ts for why that limit is deliberate.
   */
  reminderMinutes: number | null
  /**
   * Dyslexia-friendly reading (design/gokid-screens.md §19 → "Dyslexia Reading Mode").
   *
   * Applies the typographic changes with actual evidence behind them — looser line height, wider
   * letter and word spacing, and left-aligned rather than centred text, so every line starts in the
   * same place and the eye does not have to re-find it. Deliberately does **not** ship a "dyslexia
   * font": the research on those is weak, and iOS already offers a system-wide font choice that
   * works everywhere rather than only inside this app.
   */
  dyslexiaMode: boolean
}

const DEFAULTS: Preferences = {
  reduceMotion: false,
  dailyGoalMinutes: 0,
  haptics: true,
  reminderMinutes: null,
  dyslexiaMode: false,
}
const STORAGE_KEY = "gokid.prefs.v1"

let prefs: Preferences = DEFAULTS
let hydrated = false
let hydrating: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!hydrated && !hydrating) hydrating = hydrate()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return prefs
}

async function hydrate() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (raw) prefs = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) }
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "prefs-hydrate" } })
  } finally {
    hydrated = true
    hydrating = null
    emit()
  }
}

async function persist() {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(prefs))
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "prefs-persist" } })
  }
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  prefs = { ...prefs, [key]: value }
  emit()
  void persist()
}

export function usePreferences() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * The effective "reduce motion" signal: true when the parent turned it on in-app OR the device's own
 * Reduce Motion accessibility setting is enabled. Screens with animation read this, so honouring the
 * OS setting is automatic and the in-app toggle is an override, never a fight with it.
 */
/**
 * Class names for body/question text, honouring Dyslexia Reading Mode.
 *
 * Returned as classes rather than a style object so callers stay NativeWind-only (AGENTS.md), and so
 * a screen opts in explicitly — applying this globally would relayout screens where the change buys
 * nothing and risks clipping.
 */
export function useReadingClasses() {
  const { dyslexiaMode } = usePreferences()
  return {
    /** Long-form or question text. */
    text: dyslexiaMode ? "tracking-wide leading-relaxed" : "",
    /** Centred by default; left-aligned in dyslexia mode so every line starts in one place. */
    align: dyslexiaMode ? "text-left" : "text-center",
  }
}

export function useReduceMotion() {
  const { reduceMotion } = usePreferences()
  const [osReduceMotion, setOsReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setOsReduceMotion(enabled)
      })
      .catch((error) => Sentry.captureException(error, { tags: { flow: "reduce-motion-query" } }))
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOsReduceMotion)
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  return reduceMotion || osReduceMotion
}
