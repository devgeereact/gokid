import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { ScrollView, Text, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { BackButton, Button } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { plural } from "@/lib/analytics"
import { useChildren, yearLabel } from "@/lib/children"
import { useIsOnline } from "@/lib/network"
import { useProgress } from "@/lib/reviews"
import { useSync } from "@/lib/sync"

/**
 * Back up & sync (design/gokid-screens.md §14 → "Sync Conflict", "Retry Sync").
 *
 * The honest framing is **backup**, not "sync" — that is what a parent actually cares about here. A
 * child's entire spaced-repetition history lived only in SecureStore on one device, so a lost or
 * replaced phone erased months of learning with no recovery. Multi-device is a side effect of fixing
 * that, not the headline.
 *
 * Manual, and clearly labelled as such. Automatic background sync needs a conflict story that has
 * been exercised in the wild; until then a button a parent presses is more truthful than a promise
 * the app quietly keeps or quietly fails to keep. The screen states when it last ran, and says
 * plainly that nothing is backed up until it does — because a parent who assumes otherwise only
 * finds out when the phone is already gone.
 *
 * Conflict handling is stated rather than hidden behind a dialog: the later review of a card wins,
 * on both sides. See lib/sync.ts and app/api/progress+api.ts, which apply the same rule.
 */

function SyncRow({ childId, name, yearGroup }: { childId: string; name: string; yearGroup: string }) {
  const { cards, sessions } = useProgress(childId)
  return (
    <View className="flex-row items-center border-b border-border py-3 last:border-b-0">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-study-wash">
        <SymbolView name="person.fill" size={16} tintColor={colors.primary} weight="semibold" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-semibold text-ink">{name}</Text>
        <Text className="mt-0.5 font-text text-caption text-text-secondary">{yearLabel(yearGroup)}</Text>
      </View>
      <Text className="font-text text-caption text-text-secondary">
        {plural(cards.length, "card")} · {plural(sessions.length, "session")}
      </Text>
    </View>
  )
}

export default function Sync() {
  const { children } = useChildren()
  const { state, error, lastSyncedAt, sync } = useSync()
  const online = useIsOnline()
  const offline = online === false

  async function syncAll() {
    for (const child of children) {
      const ok = await sync(child)
      // Stop on the first failure rather than pressing on: the remaining attempts would fail the
      // same way, and a partial run reported as success is worse than a clear error.
      if (!ok) return
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Back up &amp; sync</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="font-text text-body-lg text-text-secondary">
          Save your children’s progress to your GoKid account, so it survives a lost or replaced
          phone and follows them to another device.
        </Text>

        {offline ? (
          <View className="mt-4">
            <AlertBanner
              tone="warning"
              title="You’re offline"
              body="Backing up needs a connection. Everything studied while offline is kept on this device and will go up next time."
            />
          </View>
        ) : null}

        {state === "error" && error ? (
          <View className="mt-4">
            <AlertBanner title="Backup didn’t finish" body={error} />
          </View>
        ) : null}

        {state === "done" ? (
          <View className="mt-4">
            <AlertBanner tone="info" title="Backed up" symbol="checkmark.circle.fill" />
          </View>
        ) : null}

        <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">What gets backed up</Text>
        <View className="rounded-2xl border border-border bg-white px-4">
          {children.length === 0 ? (
            <Text className="py-4 font-text text-body text-text-secondary">
              No children yet — add one and their progress will back up here.
            </Text>
          ) : (
            children.map((child) => (
              <SyncRow key={child.id} childId={child.id} name={child.name} yearGroup={child.yearGroup} />
            ))
          )}
        </View>

        <View className="mt-6">
          <Button
            label={state === "syncing" ? "Backing up…" : "Back up now"}
            disabled={state === "syncing" || children.length === 0 || offline}
            onPress={() => void syncAll()}
          />
        </View>

        <Text className="mt-3 text-center font-text text-caption text-text-secondary">
          {lastSyncedAt
            ? `Last backed up ${new Date(lastSyncedAt).toLocaleString("en-GB")}.`
            : "Not backed up yet on this device."}
        </Text>

        <View className="mt-8 rounded-2xl border border-border bg-white p-4">
          <View className="flex-row items-center">
            <SymbolView name="arrow.triangle.2.circlepath" size={18} tintColor={colors.primary} weight="semibold" />
            <Text className="ml-3 flex-1 font-text text-body-lg font-bold text-ink">
              If two devices disagree
            </Text>
          </View>
          <Text className="mt-2 font-text text-body text-text-secondary">
            The most recent answer for a card wins, whichever device it came from. Study sessions are
            never merged or double-counted — each one is kept exactly once. You will not be asked to
            resolve anything.
          </Text>
        </View>

        <Text className="mt-6 font-text text-caption text-text-secondary">
          Backing up runs when you press the button, not in the background. Nothing is uploaded until
          you do.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
