import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { EmptyState } from "@/components/empty-state"
import { MilestoneRow } from "@/components/milestone-row"
import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { duration } from "@/lib/analytics"
import { DEFAULT_AVATAR, useChildren, washFor, yearLabel } from "@/lib/children"
import { curriculumForYear, yearObjectives } from "@/lib/curriculum"
import { milestonesFor } from "@/lib/milestones"
import { masterySplit, useProgress } from "@/lib/reviews"

/**
 * Child Achievement Profile (design/gokid-screens.md §2 → "Child Achievement Profile").
 *
 * The gap this closes: Milestones under the Progress tab is keyed to whichever child is *currently
 * studying*, so a parent with two children could only ever see one of them, and only by switching
 * the active child first — which also changes what the app shows the child. This is a per-child view
 * that takes the id as a param and changes nothing about the session.
 *
 * Parent-side by design (it lives in `(parent)`, behind the maths gate, and is reached from the
 * children manager). One sibling being able to browse another's record from the child-facing tabs is
 * exactly the comparison dynamic §9 rejected along with leaderboards.
 *
 * Every figure is the child's own, computed from the same spaced-repetition record and the same
 * milestone definitions the child's own screens use — see lib/milestones.ts.
 */

export default function ChildProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { children } = useChildren()
  const child = children.find((c) => c.id === id)

  // Hooks cannot sit behind a conditional, so this runs before the not-found return below. An empty
  // id yields an empty record, which is exactly what an unknown child should produce.
  const { cards, sessions } = useProgress(child?.id ?? "")

  if (!child) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
        <StatusBar style="dark" />
        <View className="mt-1 h-11 flex-row items-center">
          <BackButton />
        </View>
        <EmptyState
          symbol="person.crop.circle.badge.questionmark"
          title="Child not found"
          body="That profile has been removed."
          actionLabel="Back to children"
          onAction={() => router.replace("/children")}
        />
      </SafeAreaView>
    )
  }

  // Same definitions the child's own Milestones tab uses: box 2+ is the engine's own retention bar.
  const retained = cards.filter((c) => c.box >= 2).length
  const setsFinished = new Set(sessions.map((s) => s.setId)).size
  const subjectsTouched = new Set(sessions.map((s) => s.subject)).size
  const objectives = yearObjectives(curriculumForYear(child.yearGroup))

  const milestones = milestonesFor({
    retained,
    setsFinished,
    subjects: subjectsTouched,
    objectivesMet: objectives.met,
  })
  const earned = milestones.filter((m) => m.have >= m.need)
  const inProgress = milestones.filter((m) => m.have < m.need)

  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const split = masterySplit(cards)
  const hasData = cards.length > 0 || sessions.length > 0

  const stats = [
    { label: "Cards learned", value: String(retained) },
    { label: "Sets finished", value: String(setsFinished) },
    { label: "Time studying", value: duration(minutes) },
  ]

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Profile</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Identity card, in the child's own wash — the same tint their card carries on
            who's-studying, so a parent recognises whose profile they opened at a glance. */}
        <View className={`mt-4 items-center rounded-card px-5 py-6 ${washFor(child)}`}>
          <ChildAvatar
            avatar={child.avatar ?? DEFAULT_AVATAR}
            className="h-28 w-28 bg-transparent"
            fit="contain"
          />
          <Text className="mt-3 font-text text-h2 font-bold text-ink">{child.name}</Text>
          <Text className="mt-1 font-text text-field text-text-secondary">{yearLabel(child.yearGroup)}</Text>
        </View>

        {hasData ? (
          <>
            <View className="mt-5 flex-row gap-3">
              {stats.map((s) => (
                <View key={s.label} className="flex-1 rounded-2xl border border-border bg-white p-3">
                  <Text className="font-text text-h3 font-bold text-ink">{s.value}</Text>
                  <Text
                    numberOfLines={2}
                    className="mt-1 font-text text-caption text-text-secondary"
                  >
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Mastery split — the same three buckets the child's progress donut uses. */}
            <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">How it’s sticking</Text>
            <View className="rounded-2xl border border-border bg-white px-4 py-2">
              {[
                // Same three dot tokens the child's own progress donut legend uses, so the two
                // screens describe the same buckets in the same colours.
                { label: "Learning", value: split.learning, pct: split.pctLearning, dot: "bg-status-learning" },
                { label: "Getting it", value: split.getting, pct: split.pctGetting, dot: "bg-study-teal" },
                { label: "Mastered", value: split.mastered, pct: split.pctMastered, dot: "bg-status-getting" },
              ].map((row) => (
                <View key={row.label} className="flex-row items-center py-3">
                  <View className={`h-3 w-3 rounded-full ${row.dot}`} />
                  <Text className="ml-3 flex-1 font-text text-body-lg text-ink">{row.label}</Text>
                  <Text className="font-text text-body text-text-secondary">{row.value} cards</Text>
                  <Text className="ml-3 w-14 text-right font-text text-body-lg font-bold text-ink">
                    {row.pct}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View className="mt-6 rounded-2xl border border-border bg-white p-5">
            <EmptyState
              symbol="book"
              title={`${child.name} hasn’t studied yet`}
              body="Milestones and progress appear here as soon as they finish their first cards."
            />
          </View>
        )}

        {earned.length > 0 ? (
          <>
            <Text className="mb-4 mt-8 font-text text-h3 font-bold text-ink">Earned ({earned.length})</Text>
            <View className="rounded-2xl border border-border bg-white p-5">
              {earned.map((m) => (
                <MilestoneRow key={m.key} m={m} earned />
              ))}
            </View>
          </>
        ) : null}

        {inProgress.length > 0 ? (
          <>
            <Text className="mb-4 mt-8 font-text text-h3 font-bold text-ink">Working towards</Text>
            <View className="rounded-2xl border border-border bg-white p-5">
              {inProgress.map((m) => (
                <MilestoneRow key={m.key} m={m} earned={false} />
              ))}
            </View>
          </>
        ) : null}

        {/* Editing lives in add-child's edit mode, which is itself gated. Linked rather than
            duplicated so there is one form for a child's details, not two that can disagree. */}
        <View className="mt-8 rounded-2xl border border-border bg-white">
          <Text
            accessibilityRole="button"
            className="px-4 py-4 font-text text-body-lg font-semibold text-primary"
            onPress={() => router.push({ pathname: "/add-child", params: { id: child.id } })}
          >
            Edit {child.name}’s details
          </Text>
        </View>

        <View className="mt-4 flex-row items-center justify-center">
          <SymbolView name="lock" size={14} tintColor={colors["text-secondary"]} weight="semibold" />
          <Text className="ml-2 font-text text-caption text-text-secondary">
            Only you can see this — it is not shown to {child.name}.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
