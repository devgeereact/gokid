import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { ScrollView, Text, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { MilestoneRow } from "@/components/milestone-row"
import { BackButton, Button } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { curriculumForYear, yearCoverage, yearObjectives } from "@/lib/curriculum"
import { BAR, barPct, milestonesFor } from "@/lib/milestones"
import { dueLabel, useProgress } from "@/lib/reviews"
import { getStudySet } from "@/lib/study"

/**
 * Milestones (design/gokid-screens.md §9 — "Rewards (Non-Manipulative)").
 *
 * §9 is explicit: streaks and leaderboards were rejected, so motivation here is intrinsic. This
 * screen was previously built from the mockup's gamification layer — points, levels, a 7-Day Streak
 * badge and a leaderboard banner — all of which contradict that brief. They are gone. What replaces
 * them is not a reskin: every number below is something the child actually did, drawn from the
 * spaced-repetition record (`lib/reviews`) and the curriculum map (`lib/curriculum`).
 *
 * The distinction that matters: a streak measures attendance and resets to zero on a miss, so it
 * punishes a day off. Everything on this screen only ever goes up. A child who studies once a
 * fortnight still sees their cards learned climb; nothing here can be lost by not showing up.
 *
 * Milestones are derived, not awarded — each is a real threshold on real data, so none of them can
 * fire early or be gamed by opening the app. Locked ones state their own criterion honestly rather
 * than teasing a mystery.
 */

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-border bg-white p-5">{children}</View>
}

export default function Milestones() {
  const childId = useStudyingChildId() ?? ""
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]

  const { cards, sessions } = useProgress(childId)

  // A card in box 2+ has been recalled correctly at least twice across widening intervals — the
  // engine's own definition of retention, not a display constant.
  const retained = cards.filter((c) => c.box >= 2).length
  const setsFinished = new Set(sessions.map((s) => s.setId)).size
  const subjectsTouched = new Set(sessions.map((s) => s.subject)).size

  const rows = curriculumForYear(child?.yearGroup ?? "Y3")
  const objectives = yearObjectives(rows)
  const coverage = yearCoverage(rows)

  const milestones = milestonesFor({
    retained,
    setsFinished,
    subjects: subjectsTouched,
    objectivesMet: objectives.met,
  })
  const earned = milestones.filter((m) => m.have >= m.need)
  const inProgress = milestones.filter((m) => m.have < m.need)

  // Cards the engine will bring back — the honest "what next", and the retention mechanic §9 asks
  // for. Not a nudge to return today; a statement of when the work is actually due.
  const upcoming = cards
    .slice()
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, 3)
    .map((c) => ({ card: c, set: getStudySet(c.setId) }))
    .filter((r) => r.set)

  const nothingYet = cards.length === 0 && sessions.length === 0

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center">
        <BackButton />
        <Text className="flex-1 text-center font-text text-h2 font-bold text-ink">Milestones</Text>
        <View className="-mr-2 h-11 w-11" />
      </View>

      {nothingYet ? (
        <EmptyState
          symbol="sparkles"
          title="Milestones start with one card"
          body="Study a set and your first milestone lands here. Nothing here counts days — only what you learn."
          actionLabel="Start studying"
          onAction={() => router.push("/study")}
        />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-28 pt-2" showsVerticalScrollIndicator={false}>
          {/* Hero — cards learned. Cumulative, so a day off never reduces it. */}
          <View className="mt-2 rounded-2xl bg-gamify-green-wash p-5">
            <Text className="font-text text-h1 font-bold text-primary">{retained}</Text>
            <Text className="mt-1 font-text text-h3 font-bold text-ink">
              {retained === 1 ? "card learned" : "cards learned"}
            </Text>
            <Text className="mt-2 font-text text-body text-text-secondary">
              Cards you&apos;ve remembered more than once, days apart. This only goes up — taking a break never
              takes it away.
            </Text>
          </View>

          {/* Curriculum coverage — the moat, at the top of the reward surface. */}
          <Card>
            <Text className="font-text text-h3 font-bold text-ink">Your curriculum</Text>
            <Text className="mt-1 font-text text-body text-text-secondary">
              {objectives.met} of {objectives.total} National Curriculum objectives covered.
            </Text>
            <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-gamify-track">
              <View className={`h-full rounded-full bg-study-teal ${BAR[barPct(coverage)]}`} />
            </View>
            <Button
              label="Browse the curriculum"
              variant="secondary"
              size="md"
              icon="arrow.right"
              className="mt-4"
              onPress={() => router.push("/curriculum")}
            />
          </Card>

          {/* Coming back — the intrinsic retention mechanic, straight off the SRS schedule. */}
          {upcoming.length > 0 ? (
            <Card>
              <Text className="mb-4 font-text text-h3 font-bold text-ink">Coming back</Text>
              {upcoming.map(({ card, set }) => (
                <View key={`${card.setId}:${card.cardId}`} className="mb-3 flex-row items-center last:mb-0">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gamify-blue-wash">
                    <SymbolView name="arrow.clockwise" size={18} tintColor={colors.gamify.blue} weight="semibold" />
                  </View>
                  <Text numberOfLines={1} className="ml-3 flex-1 font-text text-body font-semibold text-ink">
                    {set?.title}
                  </Text>
                  <Text className="ml-2 font-text text-body text-text-secondary">{dueLabel(card.dueAt)}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* Earned */}
          {earned.length > 0 ? (
            <Card>
              <Text className="mb-4 font-text text-h3 font-bold text-ink">Earned ({earned.length})</Text>
              {earned.map((m) => (
                <MilestoneRow key={m.key} m={m} earned />
              ))}
            </Card>
          ) : null}

          {/* On the way — criteria stated plainly, no mystery, no countdown. */}
          {inProgress.length > 0 ? (
            <Card>
              <Text className="mb-4 font-text text-h3 font-bold text-ink">On the way</Text>
              {inProgress.map((m) => (
                <MilestoneRow key={m.key} m={m} earned={false} />
              ))}
            </Card>
          ) : null}

          {/* Certificates — the one keepsake §9 asks for. Parent-facing, printable, permanent. */}
          <View className="mt-4 flex-row items-center rounded-2xl bg-cert-paper p-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <SymbolView name="rosette" size={24} tintColor={colors.cert.seal} weight="semibold" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-text text-body-lg font-bold text-cert-ink">Certificates</Text>
              <Text className="mt-0.5 font-text text-body text-text-secondary">
                Finish a set to earn one. Save it, print it, put it on the fridge.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
