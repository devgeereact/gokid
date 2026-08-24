import { useSyncExternalStore } from "react"

import { type ApiSet, servedToMixed } from "./api-contract"
import type { Flashcard, MixedQuestion, QuizQuestion, StudySet } from "./study-types"

/**
 * Where a set's cards and questions actually come from at the moment they are shown.
 *
 * ## The problem this solves
 *
 * `lib/downloads.ts` wrote a downloaded set to disk and `offline.tsx` / `storage.tsx` listed it — and
 * nothing else ever opened the file. No study, flashcard or quiz screen imported the module, so a
 * download was a receipt for content that was never read back. Offline study appeared to work only
 * because every set is *also* bundled with the app as demo material, which meant the Download Set
 * screen's promise ("The cards and quiz are on this device. They work with no connection.") was true
 * by accident and would have become false the moment content came from the server.
 *
 * Rewriting all 21 `getStudySet` call sites into async, loading-state-aware screens would have been a
 * much larger change than the bug warranted, and would have put a spinner on screens that today
 * render instantly. So the seam is here instead: a downloaded set installs a content *override*, and
 * `getStudySet` merges it over the bundled record. Every screen that already reads a set therefore
 * reads the downloaded cards and questions, with no screen changes and no new loading states.
 *
 * ## Resolution order (highest wins)
 *
 * 1. **A download on disk.** Authoritative, works with no connection, survives a restart — the index
 *    is rebuilt by listing the downloads folder on first use, and each file is parsed there anyway.
 * 2. **A set fetched from the API this session** (`ensureSetContent`), for a set the app does not
 *    ship — the online fallback when there is no local copy.
 * 3. **The bundled catalogue** in `lib/study.ts`.
 *
 * A set that exists in none of the three is genuinely unavailable and the screens redirect, which is
 * the honest outcome: no screen ever renders one set's shell around another set's questions.
 *
 * Deliberately not persisted beyond the download files themselves. An override read from disk is a
 * fact about what the child chose to keep; an override fetched over the network this session is a
 * cache, and a cache that outlives the process would be a second source of truth to keep in step.
 */

/** One set's playable content, in the shape the screens already consume. */
export type SetContent = {
  cards: Flashcard[]
  /** Plain MCQ questions — what the study SESSION iterates. Never contains a non-MCQ question. */
  quiz: QuizQuestion[]
  /** The richer quiz for the standalone runner, when the set has one. */
  mixedQuiz?: MixedQuestion[]
}

/** A quiz row as `GET /api/sets/:id` returns it (and as a download stores it). */
export type SetContentQuizRow = {
  id: string
  kind: MixedQuestion["kind"]
  prompt: string
  explanation?: string | null
  topic?: string | null
  mixed?: boolean
  payload: Record<string, unknown>
}

export type SetContentSource = {
  content: SetContent
  /** The set record, for a set the bundle does not carry. */
  set?: ApiSet
  /** Where it came from — surfaced so screens and tests can tell disk from network. */
  origin: "download" | "api"
}

let overrides: Record<string, SetContentSource> = {}
const listeners = new Set<() => void>()

function emit() {
  overrides = { ...overrides }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return overrides
}

/**
 * Rebuild a set's playable content from the API/download payload.
 *
 * The split matters: `quiz` must be MCQ-only because the study session renders four answer pills and
 * indexes `answer` directly, while `mixedQuiz` carries every kind for the standalone runner. The
 * server marks the distinction with `mixed`, and `servedToMixed` is reused verbatim so an offline
 * question is assembled by exactly the same code as an online one.
 *
 * If a set's rows are all marked `mixed`, its MCQs are lifted back out for the session rather than
 * leaving it with an empty `quiz` — `session/[id].tsx` indexes `quiz[i % quiz.length]`, and an empty
 * array there is a crash, not a blank screen.
 */
export function toSetContent(cards: Flashcard[], rows: SetContentQuizRow[]): SetContent {
  // A question with no prompt is not a question. Downloads written before `GET /api/sets/:id`
  // returned `prompt` are still sitting on real devices holding option lists with nothing to ask, and
  // rendering those would put an empty card in front of a child. They are dropped here, which leaves
  // `quiz` empty and lets `getStudySet` keep the bundled questions for that set — the cards from the
  // same file are complete and are still used. Re-downloading the set replaces it with a whole one.
  const usable = rows.filter((r) => typeof r.prompt === "string" && r.prompt.trim().length > 0)
  const mixedRows = usable.filter((r) => r.mixed)
  const plainRows = usable.filter((r) => !r.mixed)

  const toMcq = (row: SetContentQuizRow): QuizQuestion | null => {
    if (row.kind !== "mcq") return null
    const options = row.payload.options
    const answer = row.payload.answer
    if (!Array.isArray(options) || typeof answer !== "number") return null
    return {
      id: row.id,
      prompt: row.prompt,
      options: options.map(String),
      answer,
      ...(row.explanation ? { explanation: row.explanation } : {}),
      ...(row.topic ? { topic: row.topic } : {}),
    }
  }

  const quiz = (plainRows.length > 0 ? plainRows : mixedRows).map(toMcq).filter((q): q is QuizQuestion => q !== null)

  const mixedQuiz =
    mixedRows.length > 0
      ? mixedRows.map((row) =>
          servedToMixed({
            id: row.id,
            kind: row.kind,
            prompt: row.prompt,
            explanation: row.explanation ?? null,
            topic: row.topic ?? null,
            difficulty: 0,
            payload: row.payload,
          })
        )
      : undefined

  return { cards, quiz, ...(mixedQuiz ? { mixedQuiz } : {}) }
}

/** Install a set's content. Called for every download read off disk and every API fetch. */
export function installSetContent(
  setId: string,
  source: { set?: ApiSet; cards: Flashcard[]; quiz: SetContentQuizRow[]; origin: SetContentSource["origin"] }
) {
  const content = toSetContent(source.cards, source.quiz)
  // A payload with no cards would blank out a set that renders perfectly well from the bundle. Refuse
  // it rather than installing an override that makes the app worse than having none.
  if (content.cards.length === 0) return
  overrides[setId] = { content, ...(source.set ? { set: source.set } : {}), origin: source.origin }
  emit()
}

/** Drop one set's content — a removed download must stop being served. */
export function removeSetContent(setId: string) {
  if (!(setId in overrides)) return
  delete overrides[setId]
  emit()
}

/** Drop everything — account deletion, or a full downloads wipe. */
export function clearSetContent() {
  overrides = {}
  emit()
}

/** The installed content for a set, if any. Synchronous by design: `getStudySet` is synchronous. */
export function setContentFor(setId: string | undefined): SetContentSource | undefined {
  return setId ? overrides[setId] : undefined
}

/**
 * Subscribe a component to content changes so a screen re-renders when a download finishes, is
 * removed, or is hydrated from disk after the screen has already mounted.
 */
export function useSetContentVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Fetch a set from the API and install it — the online path for a set that is neither downloaded nor
 * bundled. Returns true when content is available afterwards (including when it already was).
 *
 * Kept out of `downloads.ts` on purpose: this does not write to disk. It is the difference between
 * "I can show you this now, while you have signal" and "you have kept this".
 */
export async function ensureSetContent(setId: string): Promise<boolean> {
  if (overrides[setId]) return true
  // Imported lazily: `lib/api.ts` reads Metro's `hostUri` at call time, and pulling it in eagerly
  // would drag the API client into every screen that merely reads a bundled set.
  const { apiGet } = await import("./api")
  const payload = await apiGet<{
    ok: boolean
    set: ApiSet
    cards: Flashcard[]
    quiz: SetContentQuizRow[]
  }>(`/api/sets/${encodeURIComponent(setId)}`)
  installSetContent(setId, { set: payload.set, cards: payload.cards, quiz: payload.quiz, origin: "api" })
  return overrides[setId] !== undefined
}

/**
 * Build a full `StudySet` for a set the bundle does not carry, from its API record plus installed
 * content. The presentation fields the bundle would have supplied (artwork, mastery split, status
 * copy) have no server-side source yet, so they take neutral defaults rather than inventing progress
 * the child has not made: empty mastery, "learning", and no mastered/revisit topics.
 */
export function synthesiseSet(setId: string, art: { thumb: number; hero: number }): StudySet | undefined {
  const source = overrides[setId]
  if (!source?.set) return undefined
  const { set, content } = source
  return {
    id: set.id,
    title: set.title,
    subject: set.subject,
    topic: set.topic,
    yearGroup: yearGroupLabel(set.yearCode),
    yearCode: set.yearCode,
    description: set.description,
    thumb: art.thumb,
    hero: art.hero,
    status: "learning",
    statusLabel: "Ready to start",
    cardsTotal: content.cards.length,
    cardsDone: 0,
    minutes: set.minutes,
    mastery: { learning: 100, getting: 0, mastered: 0 },
    cards: content.cards,
    quiz: content.quiz,
    ...(content.mixedQuiz ? { mixedQuiz: content.mixedQuiz } : {}),
    mastered: [],
    revisit: [],
  }
}

/** "Y4" → "Year 4", "Rec" → "Reception". Mirrors `yearLabel` in lib/children.ts. */
function yearGroupLabel(yearCode: string) {
  return yearCode === "Rec" ? "Reception" : `Year ${yearCode.replace(/^Y/, "")}`
}
