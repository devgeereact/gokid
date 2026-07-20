import { router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Pressable, ScrollView, Text, View } from "react-native"

import { ApiErrorState } from "@/components/api-error"
import { EmptyState } from "@/components/empty-state"
import { BackButton } from "@/components/primitives"
import { SetListSkeleton } from "@/components/skeleton"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { type ApiSet, useSets } from "@/lib/api"
import { useBookmarks } from "@/lib/bookmarks"
import { useChildren, useStudyingChildId } from "@/lib/children"
import { getSubject, subjectSlug } from "@/lib/subjects"

/**
 * Bookmarked Sets (design/gokid-screens.md §3 → "Favourites", "Bookmarked Sets").
 *
 * The full list behind the Home shelf. Child-facing, and scoped to the child who is studying — the
 * bookmark store is keyed by child (see lib/bookmarks.ts) so a sibling's favourites never appear
 * here. Not parent-gated: saving a set you liked is exactly the kind of low-stakes thing a child
 * should be able to do and undo on their own.
 *
 * The ribbon on each row removes the set. It is immediately reversible from the set itself, so it
 * gets no confirmation dialog — an Alert on every un-favourite would be noise, not safety.
 */

function BookmarkRow({ set, onRemove }: { set: ApiSet; onRemove: () => void }) {
  const art = getSubject(subjectSlug(set.subject) ?? "")?.art
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={set.title}
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
        <Text numberOfLines={2} className="font-text text-body font-bold text-ink">
          {set.title}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
          {set.subject} • {set.topic}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${set.title} from favourites`}
        className="ml-2 h-9 w-9 items-center justify-center active:opacity-60"
        hitSlop={6}
        onPress={onRemove}
      >
        <SymbolView name="bookmark.fill" size={18} tintColor={colors.primary} weight="semibold" />
      </Pressable>
    </Pressable>
  )
}

export default function Bookmarks() {
  const childId = useStudyingChildId()
  const { children } = useChildren()
  const child = children.find((c) => c.id === childId) ?? children[0]
  const { sets, loading, error, errorKind, reload } = useSets(child?.yearGroup)
  const { ids, toggle } = useBookmarks(childId ?? "")

  // Bookmark order is newest-first and is the order the child chose; the catalogue order is not.
  const saved = ids.map((setId) => sets.find((s) => s.id === setId)).filter((s): s is ApiSet => Boolean(s))
  // A bookmark whose set is no longer on this child's shelf (year changed, set retired) is counted
  // rather than silently dropped — otherwise the list quietly shrinks with no explanation.
  const missing = ids.length - saved.length

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="ml-1 font-text text-h3 font-bold text-ink">Favourites</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {loading ? (
          <SetListSkeleton count={3} />
        ) : error ? (
          <ApiErrorState kind={errorKind} onRetry={reload} />
        ) : saved.length === 0 ? (
          <EmptyState
            symbol="bookmark"
            title="Nothing saved yet"
            body="Tap the ribbon on any set to keep it here for later."
            actionLabel="Find a set"
            onAction={() => router.push("/search")}
          />
        ) : (
          <>
            <Text className="mb-4 font-text text-body text-text-secondary">
              {saved.length === 1 ? "1 saved set" : `${saved.length} saved sets`}
            </Text>
            {saved.map((set) => (
              <BookmarkRow key={set.id} set={set} onRemove={() => toggle(set.id)} />
            ))}
            {missing > 0 ? (
              <Text className="mt-2 font-text text-caption text-text-secondary">
                {missing === 1
                  ? "1 saved set isn’t in this year group any more."
                  : `${missing} saved sets aren’t in this year group any more.`}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
