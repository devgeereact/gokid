import { useUser } from "@clerk/expo"
import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ChildAvatar } from "@/components/child-avatar"
import { ApiErrorState } from "@/components/api-error"
import { EmptyState } from "@/components/empty-state"
import { OfflineBanner } from "@/components/offline-banner"
import { SetListSkeleton } from "@/components/skeleton"
import { SubjectMark } from "@/components/subject-mark"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { type ApiSet, useSets } from "@/lib/api"
import { useBookmarks } from "@/lib/bookmarks"
import { DEFAULT_AVATAR, useChildren, useStudyingChildId, yearLabel } from "@/lib/children"
import { currentTerm } from "@/lib/curriculum"
import { timeGreeting } from "@/lib/greeting"
import { useHomeShelves } from "@/lib/home-shelves"
import { dueCardCount, useProgress } from "@/lib/reviews"
import { getSubject, subjectSlug, type Subject, SUBJECTS } from "@/lib/subjects"

/**
 * Study dashboard — "Home / Study Sets" (design/GoKid-studydashboard-screen.png, screen 5).
 * Reached by tapping a child on "Who's studying?".
 *
 * Everything on this screen is now real. Sets come from the database over `/api/sets` (not the
 * bundled demo array), and both the status pill and the Continue card are derived from the child's
 * own spaced-repetition record — so a set reads "New" until they have actually studied it, and
 * "Continue" resumes the set they last worked on rather than a hard-coded one.
 *
 * Set artwork is still local: images are not in the database yet (they move to ImageKit — AGENTS.md),
 * so a set's thumbnail is looked up from its subject's art.
 */

/** A set's status for THIS child, derived from their SRS record — never an authored demo label. */
type SetStatus = { label: string; tone: "new" | "learning" | "getting" }

function statusFor(learned: number, seen: number): SetStatus {
  if (seen === 0) return { label: "New", tone: "new" }
  if (learned >= Math.max(1, Math.ceil(seen * 0.6))) return { label: "Getting it", tone: "getting" }
  return { label: "Learning", tone: "learning" }
}

function StatusPill({ status }: { status: SetStatus }) {
  const bg =
    status.tone === "getting" ? "bg-status-getting" : status.tone === "learning" ? "bg-status-learning" : "bg-gamify-track"
  const text = status.tone === "new" ? "text-text-secondary" : "text-white"
  return (
    <View className={`rounded-full px-3 py-1 ${bg}`}>
      <Text className={`font-text text-caption font-semibold ${text}`}>{status.label}</Text>
    </View>
  )
}

function LessonCard({
  set,
  status,
  bookmarked,
  onToggleBookmark,
}: {
  set: ApiSet
  status: SetStatus
  bookmarked: boolean
  onToggleBookmark: () => void
}) {
  // Subject art stands in until set images live in ImageKit.
  const art = getSubject(subjectSlug(set.subject) ?? "")?.art
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}. ${status.label}.`}
      className="mb-3 flex-row items-center rounded-lg border border-border bg-study-lesson p-3 active:opacity-90"
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      {art ? (
        <Image accessibilityIgnoresInvertColors className="h-13 w-13 rounded-full" contentFit="cover" source={art} />
      ) : (
        <View className="h-13 w-13 items-center justify-center rounded-full bg-study-wash">
          <SymbolView name="book.fill" size={20} tintColor={colors.primary} weight="semibold" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="font-text text-body font-bold text-ink">
          {set.title}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
          {set.subject} • {set.topic}
        </Text>
      </View>
      <StatusPill status={status} />
      {/* §3 "Favourites". This ribbon used to be decorative — it highlighted and stored nothing.
          Its own Pressable so tapping it saves the set instead of opening it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={bookmarked ? `Remove ${set.title} from favourites` : `Save ${set.title} to favourites`}
        accessibilityState={{ selected: bookmarked }}
        className="ml-2 h-9 w-9 items-center justify-center active:opacity-60"
        hitSlop={6}
        onPress={onToggleBookmark}
      >
        <SymbolView
          name={bookmarked ? "bookmark.fill" : "bookmark"}
          size={18}
          tintColor={bookmarked ? colors.primary : colors["text-secondary"]}
          weight="semibold"
        />
      </Pressable>
    </Pressable>
  )
}

/**
 * A set on a horizontal Home shelf (design/GoKid-design-system.png §07 → Set Card). Narrower than
 * the list card: art, title, and the one line that says why this set is on this shelf.
 */
function ShelfCard({ set, caption }: { set: ApiSet; caption: string }) {
  const art = getSubject(subjectSlug(set.subject) ?? "")?.art
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}. ${caption}.`}
      className="mr-3 w-44 rounded-lg border border-border bg-study-lesson p-3 active:opacity-90"
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      {/* A circular disc, centred — not a full-width banner. These assets are 68px subject
          illustrations on the cream page colour; stretched across the card they were both soft and
          visibly boxed. */}
      <View className="h-20 items-center justify-center">
        {art ? (
          <Image accessibilityIgnoresInvertColors className="h-16 w-16 rounded-full" contentFit="cover" source={art} />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-study-wash">
            <SymbolView name="book.fill" size={22} tintColor={colors.primary} weight="semibold" />
          </View>
        )}
      </View>
      <Text numberOfLines={2} className="mt-2 font-text text-body font-bold text-ink">
        {set.title}
      </Text>
      <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
        {caption}
      </Text>
    </Pressable>
  )
}

/** A titled horizontal shelf. Renders nothing at all when it has nothing real to show. */
function Shelf({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text className="mb-4 mt-8 font-text text-h3 font-bold text-ink">{title}</Text>
      <ScrollView horizontal className="-mx-1" contentContainerClassName="px-1" showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </>
  )
}

/**
 * Subject tile — the wireframe's "Subject Categories" shelf (design/flow-wireframe.md: HOME →
 * Subject Categories → Set Detail). Opens that subject's hub.
 */
function SubjectTile({ subject }: { subject: Subject }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subject.name}
      className="mr-3 w-28 items-center rounded-lg border border-border bg-study-lesson p-3 active:opacity-80"
      onPress={() => router.push({ pathname: "/subject/[subject]", params: { subject: subject.slug } })}
    >
      <SubjectMark subject={subject} className="h-12 w-12" symbolSize={20} />
      <Text numberOfLines={1} className="mt-2 font-text text-caption font-semibold text-ink">
        {subject.short}
      </Text>
    </Pressable>
  )
}

// Progress-bar widths as literal classes so NativeWind's compiler emits them (it scans source text).
const BAR: Record<number, string> = {
  0: "w-[0%]", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]", 20: "w-[20%]", 25: "w-[25%]",
  30: "w-[30%]", 35: "w-[35%]", 40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
  60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]", 80: "w-[80%]", 85: "w-[85%]",
  90: "w-[90%]", 95: "w-[95%]", 100: "w-[100%]",
}
const barWidth = (pct: number) => BAR[Math.max(0, Math.min(100, Math.round(pct / 5) * 5))]

export default function Study() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { isLoaded } = useUser()
  const { children } = useChildren()
  // The child tapped on "Who's studying?" (fall back to the first child if reached directly).
  const child = children.find((c) => c.id === id) ?? children[0]
  const childName = child?.name ?? "there"
  const avatar = child?.avatar ?? DEFAULT_AVATAR

  // Sets are curriculum-mapped by year group, so the dashboard only offers what matches the child.
  const { sets, loading: setsLoading, error: setsError, errorKind: setsErrorKind, reload } = useSets(child?.yearGroup)

  // This child's real spaced-repetition record — what makes the status pills and Continue card true.
  const childId = useStudyingChildId()
  const { cards, sessions } = useProgress(childId ?? "")
  const { ids: bookmarkIds, toggle: toggleBookmark, isBookmarked } = useBookmarks(childId ?? "")
  // Drives the bell badge — the same "due now" the notification centre reports, so the dot and the
  // list it leads to can never disagree.
  const dueNow = dueCardCount(cards)

  // §3 shelves — every one derived from this child's own record. See lib/home-shelves.ts for the
  // rules, and for why "New This Week" and "Seasonal Learning" are not here.
  const { recent, mastered, recommended } = useHomeShelves(cards, sessions, sets)
  const favourites = bookmarkIds
    .map((setId) => sets.find((s) => s.id === setId))
    .filter((s): s is ApiSet => Boolean(s))

  // Per-set progress: how many of its cards this child has seen, and how many are retained (box 2+).
  const progressFor = (setId: string) => {
    const mine = cards.filter((c) => c.setId === setId)
    return { seen: mine.length, learned: mine.filter((c) => c.box >= 2).length }
  }

  // Continue = the set they last studied (sessions are newest-first) and that is still on their
  // shelf; otherwise the first set they have any progress in; otherwise the first set. Nothing is
  // hard-coded, so a fresh child gets a genuine starting point rather than someone else's set.
  const lastStudied = sessions.find((s) => sets.some((set) => set.id === s.setId))?.setId
  const withProgress = sets.find((s) => progressFor(s.id).seen > 0)?.id
  const cont = sets.find((s) => s.id === (lastStudied ?? withProgress)) ?? sets[0]
  const contProgress = cont ? progressFor(cont.id) : { seen: 0, learned: 0 }
  const contPct = cont && cont.cardsTotal > 0 ? (contProgress.learned / cont.cardsTotal) * 100 : 0

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back to "Who's studying?" (switch child) · notifications.
          Navigates rather than `router.back()`: this is a tab root, so there is nothing to pop
          whenever the study stack is already at its root (a deep link, or the set-result →
          congratulations `replace` chain) and the chevron would be a dead button. */}
      <View className="mt-1 h-11 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a different child"
          className="-ml-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.navigate("/home")}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search sets"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/search")}
          >
            <SymbolView name="magnifyingglass" size={24} tintColor={colors.ink} weight="regular" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Downloaded sets"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/offline")}
          >
            <SymbolView name="arrow.down.circle" size={24} tintColor={colors.ink} weight="regular" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            className="h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={() => router.push("/notifications")}
          >
            <SymbolView name="bell" size={24} tintColor={colors.ink} weight="regular" />
            {/* Was always lit, regardless of whether anything was waiting — an unread badge that is
                permanently on trains a child to ignore it, and is simply untrue on a fresh account.
                Shows only when there are cards genuinely due. */}
            {dueNow > 0 ? (
              <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* Connectivity — shows only when the connection drops, and again briefly on recovery. */}
      <OfflineBanner />

      <ScrollView
        className="mt-2 flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting — real child (name, year, avatar); time-of-day follows the local clock. */}
        <View className="flex-row items-center">
          <ChildAvatar avatar={avatar} className="h-14 w-14" />
          <View className="ml-4 flex-1">
            <Text numberOfLines={1} className="font-text text-h2 font-bold text-ink">
              {timeGreeting()}, {childName}
            </Text>
            {/* The term is computed, not the literal "Autumn term" the mockup happens to show — that
                is example copy in a static PNG (the design system's capsule reads "Year 3 · Autumn
                term" too). The Curriculum Browser derives its own capsule from the date, and two
                screens one tap apart must not disagree about what term it is. */}
            <Text className="mt-1 font-text text-body-lg text-text-secondary">
              {child ? `${yearLabel(child.yearGroup)} • ${currentTerm()}` : currentTerm()}
            </Text>
          </View>
        </View>

        {/* Continue card — the child's real current set and real progress through it. Hidden while
            the shelf is still loading, and when they have no sets at all. */}
        {cont ? (
          <View className="mt-6 overflow-hidden rounded-2xl bg-study-wash p-5">
            <View className="flex-row items-center">
              <View className="flex-1 pr-2">
                <Text className="font-text text-body font-semibold text-primary">
                  {contProgress.seen > 0 ? "Continue" : "Start here"}
                </Text>
                {/* Three lines at h3, not two at h2: the mockup's title ("Place Value to 1,000") is
                    short, but real set titles run to ~35 characters ("Fronted Adverbials and
                    Punctuation") and were truncating mid-word next to the artwork. */}
                <Text numberOfLines={3} className="mt-1 font-text text-h3 font-bold leading-[28px] text-ink">
                  {cont.title}
                </Text>
              </View>
              <Image
                accessibilityIgnoresInvertColors
                className="-mr-2 h-24 w-24"
                contentFit="contain"
                source={require("../../../../../assets/images/gokid-cube-stack.png")}
              />
            </View>

            <View className="mt-4 h-2 overflow-hidden rounded-full bg-study-track">
              <View className={`h-full rounded-full bg-study-teal ${barWidth(contPct)}`} />
            </View>
            <Text className="mt-3 font-text text-body text-text-secondary">
              {contProgress.learned} of {cont.cardsTotal} cards learned
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={contProgress.seen > 0 ? "Carry on" : "Start studying"}
              className="mt-4 h-14 items-center justify-center rounded-full bg-study-teal active:opacity-90"
              onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: cont.id } })}
            >
              <Text className="font-text text-body-lg font-bold text-white">
                {contProgress.seen > 0 ? "Carry on" : "Start studying"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Subjects — one hub per subject (design/gokid-screens.md §4). The "Curriculum" link is the
            dashboard's way into the Curriculum Browser (§5 / §21): the tiles answer "take me to
            Maths", the browser answers "what does this year actually cover". It opens on the active
            child's year, so it lands where this dashboard already is. */}
        <View className="mb-4 mt-8 flex-row items-center justify-between">
          <Text className="font-text text-h3 font-bold text-ink">Subjects</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse the curriculum"
            className="active:opacity-60"
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: "/curriculum", params: child ? { year: child.yearGroup } : {} })
            }
          >
            <Text className="font-text text-body font-bold text-primary">Curriculum</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          className="-mx-1"
          contentContainerClassName="px-1"
          showsHorizontalScrollIndicator={false}
        >
          {SUBJECTS.map((subject) => (
            <SubjectTile key={subject.slug} subject={subject} />
          ))}
        </ScrollView>

        {/* §3 "Recommended For You". Personalised by a stated rule — due for review, then unfinished,
            then a subject they have covered least — and each card carries the reason it is there.
            Hidden entirely rather than shown empty: a child with no record has nothing to recommend
            yet, and "Ready for you" below is the right shelf for them. */}
        {recommended.length > 0 ? (
          <Shelf title="Recommended for you">
            {recommended.map((r) => (
              <ShelfCard key={r.set.id} set={r.set} caption={r.reason} />
            ))}
          </Shelf>
        ) : null}

        {/* §3 "Recently Studied" — previously only reachable through Progress ▸ History. */}
        {recent.length > 0 ? (
          <Shelf title="Pick up where you left off">
            {recent.map((set) => (
              <ShelfCard key={set.id} set={set} caption={`${set.subject} • ${set.topic}`} />
            ))}
          </Shelf>
        ) : null}

        {/* §3 "Recently Mastered". Box 4 is the engine's own top interval, so this says the same
            thing the progress donut says — not a second, looser definition of "mastered". */}
        {mastered.length > 0 ? (
          <Shelf title="Recently mastered">
            {mastered.map((m) => (
              <ShelfCard
                key={m.set.id}
                set={m.set}
                caption={m.count === 1 ? "1 card mastered" : `${m.count} cards mastered`}
              />
            ))}
          </Shelf>
        ) : null}

        {/* §3 "Favourites" — the sets this child saved with the ribbon on the cards below. */}
        {favourites.length > 0 ? (
          <>
            <View className="mb-4 mt-8 flex-row items-center justify-between">
              <Text className="font-text text-h3 font-bold text-ink">Favourites</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See all bookmarked sets"
                className="active:opacity-60"
                hitSlop={8}
                onPress={() => router.push("/bookmarks")}
              >
                <Text className="font-text text-body font-bold text-primary">See all</Text>
              </Pressable>
            </View>
            <ScrollView horizontal className="-mx-1" contentContainerClassName="px-1" showsHorizontalScrollIndicator={false}>
              {favourites.map((set) => (
                <ShelfCard key={set.id} set={set} caption={`${set.subject} • ${set.topic}`} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Ready for you — the real shelf for this child's year group, from the database. */}
        <Text className="mb-4 mt-8 font-text text-h3 font-bold text-ink">Ready for you</Text>
        {!isLoaded || setsLoading ? (
          <SetListSkeleton count={3} />
        ) : setsError ? (
          // Copy and action chosen by what actually failed — a 500 must not tell a parent to check
          // their router, and an expired session must not offer a retry that cannot work.
          <ApiErrorState kind={setsErrorKind} onRetry={reload} />
        ) : sets.length === 0 ? (
          <EmptyState
            symbol="tray"
            title="No sets for this year yet"
            body="We're still writing sets for this year group. New ones land every week."
            actionLabel="Browse everything"
            onAction={() => router.push("/search")}
          />
        ) : (
          sets.map((set) => {
            const { seen, learned } = progressFor(set.id)
            return (
              <LessonCard
                key={set.id}
                set={set}
                status={statusFor(learned, seen)}
                bookmarked={isBookmarked(set.id)}
                onToggleBookmark={() => toggleBookmark(set.id)}
              />
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
