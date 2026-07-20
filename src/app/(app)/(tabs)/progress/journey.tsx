import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { SubjectMark } from "@/components/subject-mark"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useSets } from "@/lib/api"
import { duration, plural } from "@/lib/analytics"
import { useChildren, useStudyingChildId, yearLabel } from "@/lib/children"
import { daysLeftInTerm, type SubjectCompletion, useJourney } from "@/lib/journey"
import { useProgress } from "@/lib/reviews"
import { getSubject, subjectSlug } from "@/lib/subjects"

/**
 * Learning Journey (design/gokid-screens.md §9 → "Learning Journey", "Personal Best",
 * "Finished Subject", "Finished Year Group", "End-of-Term Summary").
 *
 * §9 lists those as five screens. They are one screen here, deliberately: each alone is a handful of
 * figures about the same child over the same record, and splitting them would give a child five
 * places to look for one answer — the same reasoning that kept "Recently Mastered" as the head of the
 * Mastery Timeline rather than a sixth screen.
 *
 * The section's brief is anti-manipulative, and that shapes every line of copy here:
 *  - Personal best is the child against their own record, and it is permanent. The previous "best
 *    day" was scoped to the current week, so a good day quietly ceased to exist seven days later —
 *    structurally the same trick as a streak resetting.
 *  - Completion is *reported*, not rewarded. Nothing is withheld until a subject is finished, and
 *    finishing earns no prize; it simply says so.
 *  - No countdowns, no "x to go", no target the child did not set. Days left in term is stated once,
 *    as a fact about the calendar, and only while the term is running.
 */

function Stat({ symbol, value, label }: { symbol: SFSymbol; value: string; label: string }) {
  return (
    <View className="mb-3 flex-1 rounded-2xl border border-border bg-white p-4">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-study-wash">
        <SymbolView name={symbol} size={17} tintColor={colors.primary} weight="semibold" />
      </View>
      <Text className="mt-3 font-text text-h2 font-bold text-ink">{value}</Text>
      <Text numberOfLines={2} className="mt-1 font-text text-caption text-text-secondary">
        {label}
      </Text>
    </View>
  )
}

function SubjectRow({ row }: { row: SubjectCompletion }) {
  const subject = getSubject(subjectSlug(row.subject) ?? "")
  return (
    <View className="flex-row items-center border-b border-border py-3 last:border-b-0">
      {subject ? (
        <SubjectMark subject={subject} className="h-9 w-9" symbolSize={16} />
      ) : (
        <View className="h-9 w-9 rounded-full bg-study-wash" />
      )}
      <Text numberOfLines={1} className="ml-3 flex-1 font-text text-body-lg text-ink">
        {row.subject}
      </Text>
      {row.complete ? (
        <View className="flex-row items-center rounded-full bg-badge-strong px-3 py-1">
          <SymbolView name="checkmark" size={11} tintColor={colors.badge["strong-ink"]} weight="bold" />
          <Text className="ml-1.5 font-text text-caption font-bold text-badge-strong-ink">Finished</Text>
        </View>
      ) : (
        <Text className="font-text text-body text-text-secondary">
          {row.finished} of {row.total}
        </Text>
      )}
    </View>
  )
}

function formatDay(at: number) {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
}

export default function LearningJourney() {
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]
  const { cards, sessions } = useProgress(childId)
  const { sets } = useSets(child?.yearGroup)
  const journey = useJourney(cards, sessions, sets)

  const { term, best } = journey
  const name = child?.name ?? "Your child"
  const daysLeft = daysLeftInTerm(term)

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Learning journey</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {!journey.hasData ? (
          <EmptyState
            symbol="map"
            title="The journey starts with one set"
            body="Once there are a few sessions here, this page shows the term so far, personal bests, and which subjects have been finished."
            actionLabel="Go to study"
            onAction={() => router.push("/study")}
          />
        ) : (
          <>
            {/* End-of-Term Summary. Reads as a running record during the term and a closed one after. */}
            <View className="rounded-2xl border border-border bg-white p-5">
              <Text className="font-text text-h3 font-bold text-ink">
                {term.finished ? `${term.name} — finished` : term.name}
              </Text>
              <Text className="mt-1 font-text text-body text-text-secondary">
                {term.finished
                  ? `What ${name} did this term.`
                  : `${formatDay(term.start)} to ${formatDay(term.end)} · ${plural(daysLeft, "day")} left`}
              </Text>

              <View className="mt-4 flex-row gap-3">
                <Stat symbol="clock" value={duration(term.minutes)} label="Time studying" />
                <Stat symbol="checkmark.circle" value={String(term.setsFinished)} label="Sets finished" />
              </View>
              <View className="flex-row gap-3">
                <Stat symbol="rectangle.on.rectangle" value={String(term.sessions)} label="Sessions" />
                <Stat symbol="circle.grid.2x2" value={String(term.subjects.length)} label="Subjects touched" />
              </View>

              {term.subjects.length > 0 ? (
                <Text className="mt-1 font-text text-caption text-text-secondary">
                  This term: {term.subjects.join(", ")}.
                </Text>
              ) : (
                <Text className="mt-1 font-text text-caption text-text-secondary">
                  No sessions yet this term — the figures above start at zero each term, but nothing
                  earned before it has been lost.
                </Text>
              )}
            </View>

            {/* Personal Best — permanent, and against no one but themselves. */}
            <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">Personal best</Text>
            <View className="rounded-2xl border border-border bg-white p-5">
              <Text className="font-text text-body text-text-secondary">
                {name}’s own records. These never reset.
              </Text>
              <View className="mt-4 flex-row gap-3">
                <Stat symbol="flame" value={duration(best.bestDayMinutes)} label="Longest day" />
                <Stat symbol="square.stack.3d.up" value={String(best.bestSessionCards)} label="Most cards in a session" />
              </View>
              {best.bestDayAt ? (
                <Text className="font-text text-caption text-text-secondary">
                  Longest day was {formatDay(best.bestDayAt)}
                  {best.bestDaySets > 1 ? ` — ${plural(best.bestDaySets, "set")} in one day.` : "."}
                </Text>
              ) : null}
            </View>

            {/* Finished Subject / Finished Year Group. */}
            <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">
              {child ? `${yearLabel(child.yearGroup)} curriculum` : "Curriculum"}
            </Text>

            {journey.yearComplete ? (
              <View className="mb-3 flex-row items-center rounded-2xl bg-badge-strong p-4">
                <SymbolView
                  name="graduationcap.fill"
                  size={22}
                  tintColor={colors.badge["strong-ink"]}
                  weight="semibold"
                />
                <Text className="ml-3 flex-1 font-text text-body-lg font-bold text-badge-strong-ink">
                  Every set for this year is finished.
                </Text>
              </View>
            ) : null}

            <View className="rounded-2xl border border-border bg-white px-4">
              {journey.subjects.map((row) => (
                <SubjectRow key={row.subject} row={row} />
              ))}
            </View>

            <Text className="mt-3 font-text text-caption text-text-secondary">
              {journey.yearFinished} of {plural(journey.yearTotal, "set")} finished. Finishing a
              subject unlocks nothing — it just means there is nothing left in it for this year.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the mastery timeline"
              className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-white active:opacity-70"
              onPress={() => router.push("/progress/mastery-timeline")}
            >
              <SymbolView name="calendar.badge.clock" size={20} tintColor={colors.ink} weight="regular" />
              <Text className="font-text text-body-lg font-bold text-ink">See the mastery timeline</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
