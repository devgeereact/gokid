import type { MixedQuestion, QuizResponse, StudySet } from "./study-types"

/**
 * Quiz grading — how a child's answers become a score.
 *
 * Split out of `study.ts` for the same reason `api-contract.ts` was split out of `api.ts`: this is
 * pure logic over plain data, and it lived in a module whose first statement `require`s eleven PNGs.
 * Nothing could exercise the scoring without loading the demo catalogue and the Metro asset
 * registry, so the one part of the app where a silent off-by-one turns a correct answer into a wrong
 * one had no tests at all. `study.ts` re-exports every name here, so `from "@/lib/study"` is
 * unchanged at all 40-odd call sites.
 */

/** The questions the quiz RUNNER plays: the richer `mixedQuiz` when a set has one, otherwise the MCQ
 *  `quiz` lifted into the mixed shape. One entry point so the runner and the review always agree. */
export function quizItems(set: StudySet): MixedQuestion[] {
  if (set.mixedQuiz) return set.mixedQuiz
  return set.quiz.map((q) => ({
    kind: "mcq" as const,
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    illustration: q.illustration,
    // Carried with the image, always. Dropping it here would strip the alt text on exactly the path
    // the quiz runner uses, leaving the picture unlabelled again for the questions that have one.
    illustrationAlt: q.illustrationAlt,
    explanation: q.explanation,
    topic: q.topic,
  }))
}

/** An empty response of the right shape for a question — the runner's initial state per question. */
export function blankResponse(q: MixedQuestion): QuizResponse {
  switch (q.kind) {
    case "mcq":
      return { kind: "mcq", choice: null }
    case "multi":
      return { kind: "multi", choices: [] }
    case "fill":
      return { kind: "fill", text: "" }
    case "order":
      return { kind: "order", order: [] }
    case "match":
      return { kind: "match", pairs: q.pairs.map(() => -1) }
  }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ")
const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",")

/** Whether a response answers its question correctly. Pure — the single source of truth for scoring
 *  in the runner AND the review, so a score can never disagree with what the review shows. */
export function isResponseCorrect(q: MixedQuestion, r: QuizResponse | undefined): boolean {
  if (!r || r.kind !== q.kind) return false
  switch (q.kind) {
    case "mcq":
      return r.kind === "mcq" && r.choice === q.answer
    case "multi":
      return r.kind === "multi" && sameSet(r.choices, q.answers)
    case "fill":
      return r.kind === "fill" && q.accept.some((a) => norm(a) === norm(r.text))
    case "order":
      // Correct when the arranged indices are 0,1,2,… (items were authored in the right order).
      return r.kind === "order" && r.order.length === q.items.length && r.order.every((v, i) => v === i)
    case "match":
      // Right index j is correct for left i when it maps to the same pair after the display shuffle;
      // the runner records the ORIGINAL right index it paired, so correctness is pairs[i] === i.
      return r.kind === "match" && r.pairs.length === q.pairs.length && r.pairs.every((v, i) => v === i)
  }
}

/** The canonical correct answer, as one display string. */
export function correctLabel(q: MixedQuestion): string {
  switch (q.kind) {
    case "mcq":
      return q.options[q.answer]
    case "multi":
      return q.answers.map((i) => q.options[i]).join(", ")
    case "fill":
      return q.accept[0]
    case "order":
      return q.items.join(" → ")
    case "match":
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join(", ")
  }
}

/** The child's answer, as one display string ("Skipped" when they left it blank). */
export function responseLabel(q: MixedQuestion, r: QuizResponse | undefined): string {
  if (!r || r.kind !== q.kind) return "Skipped"
  switch (q.kind) {
    case "mcq":
      return r.kind === "mcq" && r.choice !== null ? q.options[r.choice] : "Skipped"
    case "multi":
      return r.kind === "multi" && r.choices.length ? r.choices.map((i) => q.options[i]).join(", ") : "Skipped"
    case "fill":
      return r.kind === "fill" && r.text.trim() ? r.text.trim() : "Skipped"
    case "order":
      return r.kind === "order" && r.order.length ? r.order.map((i) => q.items[i]).join(" → ") : "Skipped"
    case "match":
      return r.kind === "match" && r.pairs.some((v) => v >= 0)
        ? q.pairs.map((p, i) => `${p.left} → ${r.pairs[i] >= 0 ? q.pairs[r.pairs[i]].right : "?"}`).join(", ")
        : "Skipped"
  }
}

/** One question as replayed on the Incorrect Answers review. */
export type QuizReviewRow = {
  question: MixedQuestion
  /** 1-based position in the quiz — the review's "Question 3" label. */
  number: number
  correct: boolean
  /** What the child answered, ready to render ("Skipped" when they left it blank). */
  pickedLabel: string
  correctLabel: string
  explanation: string
  topic: string
}

export type QuizAttempt = {
  rows: QuizReviewRow[]
  /** Only the rows the child got wrong — what the review screen lists. */
  wrong: QuizReviewRow[]
  total: number
  correct: number
  /** Whole-percent accuracy. */
  accuracy: number
}

/**
 * Replays an attempt against a set's quiz. `responses` is the child's answer per question in order;
 * a missing entry reads as skipped, so a partial attempt still reviews. Uses `quizItems`, so a mixed
 * quiz reviews as faithfully as an MCQ one.
 *
 * Demo seam: `explanation` and `topic` are optional on the question and no demo set authors them yet,
 * so both fall back to values derived from data the set already carries.
 */
/**
 * `items` defaults to the set's local questions but can be overridden with the exact list the child
 * was served (see lib/served-quiz.ts) — the review must grade the questions actually shown, not a
 * freshly-derived local list, which for a no-repeat server quiz would be a different set entirely.
 */
export function quizAttempt(
  set: StudySet,
  responses: QuizResponse[],
  items: MixedQuestion[] = quizItems(set)
): QuizAttempt {
  const revisit = set.revisit.length > 0 ? set.revisit : [set.topic]

  const rows: QuizReviewRow[] = items.map((question, i) => {
    const response = responses[i]
    const label = correctLabel(question)
    return {
      question,
      number: i + 1,
      correct: isResponseCorrect(question, response),
      pickedLabel: responseLabel(question, response),
      correctLabel: label,
      explanation:
        question.explanation ??
        `“${label}” is the answer. Look back at the ${set.topic.toLowerCase()} cards in ${set.title} — the same idea comes up there.`,
      topic: question.topic ?? revisit[i % revisit.length],
    }
  })

  const correct = rows.filter((r) => r.correct).length
  return {
    rows,
    wrong: rows.filter((r) => !r.correct),
    total: rows.length,
    correct,
    accuracy: rows.length === 0 ? 0 : Math.round((correct / rows.length) * 100),
  }
}

/** Serialises the child's responses for the `answers` route param — JSON, URL-encoded so commas and
 *  free text survive. Replaces the old comma-joined option-index codec. */
export function encodeAnswers(responses: QuizResponse[]): string {
  return encodeURIComponent(JSON.stringify(responses))
}

/** Parses the `answers` route param back to responses. Malformed input reads as an empty attempt,
 *  never throws. */
export function decodeAnswers(param: string | undefined): QuizResponse[] {
  if (!param) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(param))
    return Array.isArray(parsed) ? (parsed as QuizResponse[]) : []
  } catch {
    return []
  }
}

