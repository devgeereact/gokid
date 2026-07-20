import { router, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useEffect, useMemo, useState } from "react"
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native"

import { EmptyState } from "@/components/empty-state"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import {
  clearSearches,
  forgetSearch,
  rememberSearch,
  searchCurriculum,
  searchSets,
  subjectTint,
  SUBJECTS,
  useRecentSearches,
} from "@/lib/search"
import { type StudySet } from "@/lib/study"

/**
 * Search Sets (design/gokid-screens.md §3 "Home Experience"). No mockup exists for this screen, so
 * every surface is inferred from design/GoKid-design-system.png — the Text Input (09), the Subject
 * Chip (06), the Set Card (List) (07) — with the result rows matching the "Ready for you" geometry
 * on design/GoKid-studydashboard-screen.png so a set reads the same wherever it is listed.
 *
 * Sections, each demoable from the running app: search field · subject filter chips · results ·
 * recent searches (empty query) · no results.
 */

function SearchField({
  query,
  autoFocus,
  onChange,
  onSubmit,
}: {
  query: string
  autoFocus: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <View className="h-12 flex-1 flex-row items-center rounded-md border border-border bg-white px-3">
      <SymbolView name="magnifyingglass" size={18} tintColor={colors["text-secondary"]} weight="semibold" />
      <TextInput
        autoFocus={autoFocus}
        accessibilityLabel="Search study sets"
        className="ml-2 h-full flex-1 font-text text-body-lg text-ink"
        placeholder="Search sets, subjects, topics"
        placeholderTextColor={colors["text-secondary"]}
        returnKeyType="search"
        value={query}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
      />
      {query.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          className="-mr-1 h-8 w-8 items-center justify-center active:opacity-60"
          hitSlop={6}
          onPress={() => onChange("")}
        >
          <SymbolView name="xmark.circle.fill" size={18} tintColor={colors["text-secondary"]} weight="regular" />
        </Pressable>
      ) : null}
    </View>
  )
}

function SubjectChips({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (subject: string | null) => void
}) {
  return (
    <ScrollView
      horizontal
      className="mt-4 -mx-5 flex-grow-0"
      contentContainerClassName="px-5"
      showsHorizontalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="All subjects"
        accessibilityState={{ selected: selected === null }}
        className={`mr-2 h-9 items-center justify-center rounded-full px-4 active:opacity-80 ${
          selected === null ? "bg-primary" : "border border-border bg-white"
        }`}
        onPress={() => onSelect(null)}
      >
        <Text className={`font-text text-body font-semibold ${selected === null ? "text-white" : "text-ink"}`}>
          All
        </Text>
      </Pressable>

      {SUBJECTS.map((subject) => {
        const active = selected === subject
        return (
          <Pressable
            key={subject}
            accessibilityRole="button"
            accessibilityLabel={subject}
            accessibilityState={{ selected: active }}
            className={`mr-2 h-9 items-center justify-center rounded-full px-4 active:opacity-80 ${
              active ? "bg-primary" : subjectTint(subject)
            }`}
            onPress={() => onSelect(active ? null : subject)}
          >
            <Text className={`font-text text-body font-semibold ${active ? "text-white" : "text-ink"}`}>
              {subject}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** Result row — the "Ready for you" card from the dashboard, carrying year instead of a status pill. */
function ResultRow({ set }: { set: StudySet }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${set.title}. ${set.subject}. ${set.yearGroup}.`}
      className="mb-3 flex-row items-center rounded-lg border border-border bg-study-lesson p-3 active:opacity-90"
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: set.id } })}
    >
      <Image accessibilityIgnoresInvertColors className="h-13 w-13 rounded-md" contentFit="cover" source={set.thumb} />
      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="font-text text-body font-bold text-ink">
          {set.title}
        </Text>
        <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
          {set.subject} • {set.topic}
        </Text>
      </View>
      <View className="ml-2 rounded-full bg-gamify-tile px-3 py-1">
        <Text className="font-text text-caption font-semibold text-text-secondary">{set.yearGroup}</Text>
      </View>
    </Pressable>
  )
}

function RecentSearches({ onPick }: { onPick: (query: string) => void }) {
  const recent = useRecentSearches()

  if (recent.length === 0) {
    return (
      <EmptyState
        symbol="magnifyingglass"
        title="Search every set"
        body="Try a subject like Maths, a topic like fractions, or a year group like Year 3."
      />
    )
  }

  return (
    <>
      <View className="mb-4 mt-6 flex-row items-center justify-between">
        <Text className="font-text text-h3 font-bold text-ink">Recent searches</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear recent searches"
          className="active:opacity-60"
          hitSlop={8}
          onPress={clearSearches}
        >
          <Text className="font-text text-body font-semibold text-primary">Clear</Text>
        </Pressable>
      </View>

      {recent.map((query) => (
        <Pressable
          key={query}
          accessibilityRole="button"
          accessibilityLabel={`Search again for ${query}`}
          className="h-12 flex-row items-center active:opacity-60"
          onPress={() => onPick(query)}
        >
          <SymbolView name="clock.arrow.circlepath" size={20} tintColor={colors["text-secondary"]} weight="regular" />
          <Text numberOfLines={1} className="ml-3 flex-1 font-text text-body-lg text-ink">
            {query}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${query} from recent searches`}
            className="h-8 w-8 items-center justify-center active:opacity-60"
            hitSlop={6}
            onPress={() => forgetSearch(query)}
          >
            <SymbolView name="xmark" size={14} tintColor={colors["text-secondary"]} weight="semibold" />
          </Pressable>
        </Pressable>
      ))}
    </>
  )
}

export default function Search() {
  // `q` / `subject` let any surface link straight into a prepared search — "Filter by Subject" and
  // the recommendation shelves land here rather than reimplementing a result list of their own.
  const params = useLocalSearchParams<{ q?: string; subject?: string }>()
  const [query, setQuery] = useState(params.q ?? "")
  const [subject, setSubject] = useState<string | null>(params.subject ?? null)

  // Arriving with a query is a search, so it joins the history like a typed one.
  useEffect(() => {
    if (params.q) rememberSearch(params.q)
  }, [params.q])

  const trimmed = query.trim()
  // A bare subject chip with no text is a browse, not a search — both go through the same index.
  const browsing = trimmed.length === 0 && subject === null
  const results = useMemo(() => (browsing ? [] : searchSets(trimmed, subject)), [browsing, trimmed, subject])
  // §15 "Curriculum Search" — objectives and strands, which set titles do not contain. A parent
  // checking "is my child covering fronted adverbials?" types the curriculum's words, not a title.
  const curriculum = useMemo(
    () => (browsing ? [] : searchCurriculum(trimmed, subject)),
    [browsing, trimmed, subject]
  )

  function submit() {
    rememberSearch(trimmed)
    Keyboard.dismiss()
  }

  function runRecent(value: string) {
    setQuery(value)
    rememberSearch(value)
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back chevron sits beside the field, so the field owns the full row. */}
      <View className="mt-1 h-11 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="-ml-2 mr-1 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        {/* Landing with a prepared search shows results, so the keyboard stays down. */}
        <SearchField autoFocus={!params.q && !params.subject} query={query} onChange={setQuery} onSubmit={submit} />
      </View>

      <SubjectChips selected={subject} onSelect={setSubject} />

      <ScrollView
        className="mt-2 flex-1"
        contentContainerClassName="pb-6"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {browsing ? (
          <RecentSearches onPick={runRecent} />
        ) : results.length === 0 && curriculum.length === 0 ? (
          <EmptyState
            symbol="doc.text.magnifyingglass"
            title="Nothing found"
            body={`Nothing matches "${trimmed || subject}" in the sets or the curriculum. Try a different word, or clear the subject filter.`}
            actionLabel="Clear filters"
            onAction={() => {
              setQuery("")
              setSubject(null)
            }}
          />
        ) : (
          <>
            {results.length > 0 ? (
              <Text className="mb-4 mt-6 font-text text-h3 font-bold text-ink">
                {results.length} {results.length === 1 ? "set" : "sets"}
              </Text>
            ) : null}
            {results.map((set) => (
              <ResultRow key={set.id} set={set} />
            ))}

            {/* §15 "Curriculum Search". Below the sets, because a set is something a child can open
                now and an objective is context — but present, because the curriculum's own wording is
                what a parent searches with. Each row opens that year's Curriculum Browser. */}
            {curriculum.length > 0 ? (
              <>
                <Text className="mb-3 mt-8 font-text text-h3 font-bold text-ink">In the curriculum</Text>
                {curriculum.map((hit) => (
                  <Pressable
                    key={`${hit.yearCode}-${hit.subjectSlug}-${hit.text}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${hit.text}. ${hit.subject}, ${hit.yearGroup}.`}
                    className="mb-3 rounded-lg border border-border bg-white p-4 active:opacity-80"
                    onPress={() =>
                      router.push({ pathname: "/curriculum", params: { year: hit.yearCode } })
                    }
                  >
                    <Text className="font-text text-body font-semibold text-ink">{hit.text}</Text>
                    <Text numberOfLines={1} className="mt-1 font-text text-caption text-text-secondary">
                      {hit.subject} · {hit.strand} · {hit.yearGroup}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
