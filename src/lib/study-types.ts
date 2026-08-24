/**
 * The shape of a study set and everything inside it.
 *
 * Split out of `study.ts` (which is the bundled demo *data*) so that modules supplying the same shape
 * from somewhere else — a download read off disk, a set fetched from the API — can speak the contract
 * without importing the bundle, and without a require cycle through it. `study.ts` re-exports every
 * name here, so `from "@/lib/study"` keeps working everywhere it already appears.
 */

export type Flashcard = {
  id: string
  question: string
  answer: string
}

/** Multiple-choice quiz question (design/GoKid-quiz-screen.png, screen 8). `answer` indexes `options`. */
export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** Index into `options` of the correct answer. */
  answer: number
  /** Optional illustration shown above the prompt (e.g. base-10 blocks). */
  illustration?: number
  /**
   * What the picture shows, for a child using VoiceOver. Required in practice whenever
   * `illustration` is set: an "Image Question" whose image is unlabelled is a question a blind
   * child cannot answer at all, and the quiz screen exposes the picture as an unnamed image.
   * Describe what is depicted, not "picture of a question".
   */
  illustrationAlt?: string
  /** Why the correct answer is correct — shown on the Incorrect Answers review. */
  explanation?: string
  /** Curriculum topic this question tests — the review's per-question chip. */
  topic?: string
}

/**
 * Richer quiz question types (design/gokid-screens.md §7 — the mockup only ever drew a 4-option MCQ).
 * These live on `StudySet.mixedQuiz`, a SEPARATE array from `quiz`, precisely so the study-session
 * runner (which iterates `quiz` as pure MCQ) is never handed a shape it can't render. Only the quiz
 * runner reads `mixedQuiz`.
 *
 * Every interaction is TAP-based, not literal drag: a 6-year-old drags poorly, VoiceOver drags worse,
 * and a tap target is testable. "Drag & drop" from the brief is realised as `match` (tap a token,
 * tap where it goes) and `order` (tap items into sequence).
 */
/**
 * §7 "Image Questions". `illustration` used to sit on the `mcq` variant alone, so a fill-in-the-blank
 * about a diagram, an ordering question about a life cycle, or a matching question about shapes could
 * never carry a picture — the one question type that could was the one that needed it least. It is a
 * property of *a question*, not of one answering mechanic, so it lives on the base and every kind
 * renders it (see the `Illustration` component in app/(app)/quiz/[id].tsx).
 */
type MixedBase = {
  id: string
  prompt: string
  explanation?: string
  topic?: string
  /** Picture shown above the prompt. Any question kind may have one. */
  illustration?: number
  /**
   * What the picture shows, for a child using VoiceOver. Required in practice whenever
   * `illustration` is set: an "Image Question" whose image is unlabelled is a question a blind
   * child cannot answer at all, and the quiz screen exposes the picture as an unnamed image.
   * Describe what is depicted, not "picture of a question".
   */
  illustrationAlt?: string
}
export type MixedQuestion =
  /** Single choice — the classic MCQ. `answer` indexes `options`. */
  | (MixedBase & { kind: "mcq"; options: string[]; answer: number })
  /** Multi-select — every index in `answers` must be chosen, and nothing else. */
  | (MixedBase & { kind: "multi"; options: string[]; answers: number[] })
  /** Fill in the blank — free text, matched case/space-insensitively against `accept`. `accept[0]`
   *  is the canonical answer shown on review. */
  | (MixedBase & { kind: "fill"; accept: string[] })
  /** Put in order — `items` are given in the CORRECT order and shuffled for display. */
  | (MixedBase & { kind: "order"; items: string[] })
  /** Match pairs — `left` and `right` of each pair belong together; `right` is shuffled for display. */
  | (MixedBase & { kind: "match"; pairs: { left: string; right: string }[] })

/** A child's answer to a MixedQuestion, tagged to match. */
export type QuizResponse =
  | { kind: "mcq"; choice: number | null }
  | { kind: "multi"; choices: number[] }
  | { kind: "fill"; text: string }
  /** The child's arrangement as indices into `items`. */
  | { kind: "order"; order: number[] }
  /** For each left index, the right index the child paired it with (-1 = unpaired). */
  | { kind: "match"; pairs: number[] }

/** Mastery split for the set-detail bar — three percentages that sum to 100. */
export type Mastery = {
  learning: number
  getting: number
  mastered: number
}

export type SetStatus = "getting" | "learning"

export type StudySet = {
  id: string
  title: string
  subject: string
  /** What this set is about, as shown to a parent — the specific unit, e.g. "States of matter". */
  topic: string
  /**
   * Which curriculum strand this set rolls up to, when the strand is broader than the topic.
   *
   * The subject hubs, search and the strong/weak-area nudges group sets by matching a strand name in
   * ./subjects with **exact string equality**. `topic` alone could not serve both jobs: it has to be
   * specific enough to tell a parent what their child is studying ("Fronted adverbials and
   * punctuation") and identical to a strand name to be counted ("Grammar and punctuation"). Ten of
   * 27 sets matched nothing, so their progress was invisible in the hub that exists to show it —
   * content taught correctly and reported nowhere.
   *
   * Omit when `topic` is already exactly the strand name. `scripts/check-strands.mjs` fails if the
   * effective value matches no strand, so this cannot silently drift again.
   */
  strand?: string
  /** Display label, e.g. "Year 3" / "Reception". */
  yearGroup: string
  /** Filter code — one of "Rec","Y1".."Y6". Matches `Child.yearGroup`. */
  yearCode: string
  /** Long blurb for the set-detail screen. */
  description: string
  /** Small rounded thumbnail (lesson list). */
  thumb: number
  /** Large illustration (set-detail hero + flashcard face). */
  hero: number
  status: SetStatus
  statusLabel: string
  cardsTotal: number
  /** Cards already reviewed — drives the "Continue" progress bar. */
  cardsDone: number
  minutes: number
  mastery: Mastery
  cards: Flashcard[]
  /** Demo MCQ quiz — powers the study SESSION (session/[id]) and the download preview. Always MCQ. */
  quiz: QuizQuestion[]
  /** Optional richer quiz for the standalone quiz runner (§7 — MCQ + multi/fill/order/match). When
   *  present the runner uses this instead of `quiz`; when absent it falls back to `quiz` as all-MCQ.
   *  Kept separate so the session runner never receives a non-MCQ question. */
  mixedQuiz?: MixedQuestion[]
  /** Topics the child has mastered / should revisit — shown on the results screen. */
  mastered: string[]
  revisit: string[]
}
