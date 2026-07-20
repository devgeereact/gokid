import * as Sentry from "@sentry/react-native"
import * as Notifications from "expo-notifications"

/**
 * Study reminders (design/gokid-screens.md §12 → Learning → "Reminder Time"; §13 → "Reminder
 * Settings").
 *
 * **Local notifications only.** Nothing here is a push from a server: the app schedules a daily
 * reminder on the device and the OS fires it. That is a deliberate limit, not a stepping stone — a
 * server that knows when a child studies, in order to nudge them, is a lot of surveillance for a
 * feature a calendar can do.
 *
 * ## The rules this feature obeys
 *
 * §9 rejected streaks because they manufacture pressure. A reminder is the same mechanic if it is
 * allowed to be, so:
 *
 *  - **Off by default**, and set by a parent in the parent area.
 *  - **Exactly one a day.** No "you haven't studied yet!" escalation, no second nudge, nothing sent
 *    because a child *missed* something.
 *  - **Addressed to the parent, not the child.** The copy is a calm prompt to a grown-up, not a
 *    guilt message to a seven-year-old on a lock screen they may read alone.
 *  - Cancelled wholesale before rescheduling, so changing the time can never leave a stale reminder
 *    firing at the old one.
 */

const CATEGORY = "gokid.reminder.daily"

/**
 * Ask for permission. Returns whether we may post notifications.
 *
 * Called only when a parent turns reminders on — asking on launch, before the feature has been
 * explained, is how apps get permanently denied.
 */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync()
    if (existing.granted) return true
    // `canAskAgain` false means the parent denied it at the OS level; asking again does nothing and
    // the caller should send them to Settings instead.
    if (!existing.canAskAgain) return false
    const requested = await Notifications.requestPermissionsAsync()
    return requested.granted
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "reminder-permission" } })
    return false
  }
}

/** Remove every scheduled reminder. Safe to call when none exist. */
export async function cancelReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "reminder-cancel" } })
  }
}

/**
 * Schedule the one daily reminder, replacing any existing one.
 *
 * `hour`/`minute` are local device time — the OS handles the repeat, so this survives restarts
 * without the app running.
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  try {
    await cancelReminders()
    await Notifications.scheduleNotificationAsync({
      identifier: CATEGORY,
      content: {
        title: "Time to study?",
        // Written for the adult who set it. No child's name, because a lock screen is visible to
        // anyone holding the phone.
        body: "A short GoKid session is ready whenever suits.",
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    })
    return true
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "reminder-schedule" } })
    return false
  }
}

/** Human label for a stored `HH:MM`, e.g. "4:30 pm". */
export function reminderLabel(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "pm" : "am"
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`
}
