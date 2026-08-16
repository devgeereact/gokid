import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { useChildren, useStudyingChildId, yearLabel } from "@/lib/children"
import { curriculumForYear, yearObjectives } from "@/lib/curriculum"
import { type Note, useNotifications } from "@/lib/notifications"
import { useProgress } from "@/lib/reviews"

/**
 * Notification Centre — the dashboard bell's destination (design/gokid-screens.md §13).
 *
 * Every entry is derived from the child's own record when this screen opens (see lib/notifications.ts).
 * The previous feed mixed one real item with a hardcoded "New set ready — Capital Cities of Europe
 * has been added… Yesterday", which was never true for anyone: a fixed string on a surface whose
 * entire job is to be believed.
 *
 * This LIST is **not push**: `expo-notifications` IS installed (package.json, ~57.0.6) and does
 * schedule a real OS notification, but that is lib/reminders.ts's one daily study reminder, a
 * separate feature a parent opts into from Settings → Study reminder — not anything derived here.
 * Nothing on this screen is scheduled or delivered while the app is closed; the footer below says so
 * rather than letting a parent assume every entry above will also reach them as a push.
 */

const TONE: Record<Note["tone"], string> = {
  primary: colors.primary,
  success: colors.success,
  accent: colors.accent,
}

function relative(at: number, now: number) {
  const days = Math.floor((now - at) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
}

/** Clock read outside render — the React Compiler treats `Date.now()` during render as impure. */
function nowMs() {
  return Date.now()
}

function NoteRow({ note, now }: { note: Note; now: number }) {
  return (
    <View className="mb-3 flex-row items-start rounded-lg border border-border bg-white p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
        <SymbolView name={note.symbol} size={20} tintColor={TONE[note.tone]} weight="regular" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-text text-body-lg font-bold text-ink">{note.title}</Text>
        <Text className="mt-1 font-text text-body text-text-secondary">{note.body}</Text>
        <Text className="mt-1 font-text text-caption text-text-secondary">{relative(note.at, now)}</Text>
      </View>
    </View>
  )
}

export default function Notifications() {
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]
  const { cards, sessions } = useProgress(childId)
  const { sets } = useSets(child?.yearGroup)

  const yearGroup = child?.yearGroup ?? "Y3"
  const objectives = yearObjectives(curriculumForYear(yearGroup))
  const notes = useNotifications(
    child?.name ?? "Your child",
    cards,
    sessions,
    sets,
    yearLabel(yearGroup),
    objectives.met
  )
  const now = nowMs()

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {notes.length === 0 ? (
          <EmptyState
            symbol="bell"
            title="Nothing to report"
            body="When cards are ready to come back, or a milestone is reached, it shows up here."
            actionLabel="Go to study"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
            {notes.map((note) => (
              <NoteRow key={note.id} note={note} now={now} />
            ))}

            {/* Said plainly: this list is a record, not a promise to interrupt you. Without this a
                parent would reasonably assume they will be told about the next one. */}
            <View className="mt-2 flex-row items-start rounded-xl border border-border bg-white p-4">
              <View className="mt-0.5">
                <SymbolView name="info.circle" size={16} tintColor={colors["text-secondary"]} weight="regular" />
              </View>
              <Text className="ml-2 flex-1 font-text text-caption text-text-secondary">
                This list only updates when you open it — it isn’t sent to your phone. If you’ve
                turned on a study reminder (Settings → Study reminder), that’s the only notification
                GoKid delivers, once a day, and it’s separate from what’s shown here.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
