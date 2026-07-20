import { validateMixedQuestion, type QuestionValidationError } from "@/lib/quiz-validate"
import type { MixedQuestion } from "@/lib/study"

/**
 * Server-side question generator (AGENTS.md target stack — "AI generation of quiz content"). Calls
 * OpenRouter's OpenAI-compatible chat API to write curriculum questions, then hands every result
 * through the runtime validator before returning. Nothing here is trusted: the model can hallucinate
 * a wrong answer or an unanswerable shape, so a generation that fails validation is dropped, not
 * stored.
 *
 * SERVER-SIDE ONLY. Reads `OPENROUTER_API_KEY`, a secret that must never carry `EXPO_PUBLIC_` or
 * reach the bundle. Imported by API routes / Inngest jobs, never by a screen.
 */

const API_KEY = process.env.OPENROUTER_API_KEY
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"
// A text model for question authoring — NOT the image model in OPENROUTER_MODEL, which is for covers.
const TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL ?? "anthropic/claude-sonnet-5"

export type GenerateParams = {
  subject: string
  yearCode: string
  topic: string
  /** The curriculum objective text — the spine the questions must test. */
  objective: string
  /** How many distinct questions to ask for. The model may return fewer after validation. */
  count: number
  /** Which question kinds are allowed. Defaults to the full union. */
  kinds?: MixedQuestion["kind"][]
}

export type GeneratedQuestion = { question: MixedQuestion; difficulty: number }

const ALL_KINDS: MixedQuestion["kind"][] = ["mcq", "multi", "fill", "order", "match"]

/** The rules the model must follow — kept in one place so the prompt and the validator agree. */
function systemPrompt(): string {
  return [
    "You are a UK primary-school teacher writing quiz questions for the England National Curriculum.",
    "Return ONLY a JSON array, no prose, no markdown fences. Each element is one question object.",
    "",
    "Every object has: kind, prompt, explanation, topic, difficulty (1 easy, 2 medium, 3 hard),",
    "plus the kind-specific fields:",
    '  - "mcq":   options (string[]>=3), answer (index into options)',
    '  - "multi": options (string[]>=3), answers (index[]; more than one, not all)',
    '  - "fill":  accept (string[]; every acceptable spelling/case of the one answer)',
    '  - "order": items (string[]>=3, given in the CORRECT order)',
    '  - "match": pairs ([{left,right}]>=3; each left matches exactly one right)',
    "",
    "Rules: age-appropriate wording for the given year group; exactly one defensible correct answer;",
    "distractors must be plausible but clearly wrong; never reference an image or diagram; keep prompts",
    "under 200 characters; the explanation says WHY the answer is correct in one child-friendly sentence.",
  ].join("\n")
}

function userPrompt(p: GenerateParams): string {
  const kinds = (p.kinds?.length ? p.kinds : ALL_KINDS).join(", ")
  return [
    `Year group: ${p.yearCode}`,
    `Subject: ${p.subject}`,
    `Topic: ${p.topic}`,
    `Curriculum objective: ${p.objective}`,
    `Write ${p.count} DISTINCT questions testing this objective from different angles.`,
    `Allowed kinds: ${kinds}. Vary the kind and the difficulty across the set.`,
  ].join("\n")
}

/** Pull the first JSON array out of the model's text, tolerating stray fences or leading prose. */
function extractJsonArray(text: string): unknown {
  const start = text.indexOf("[")
  const end = text.lastIndexOf("]")
  if (start === -1 || end === -1 || end < start) {
    throw new Error("model response contained no JSON array")
  }
  return JSON.parse(text.slice(start, end + 1))
}

function clampDifficulty(v: unknown): number {
  const n = typeof v === "number" ? Math.round(v) : 1
  return n < 1 ? 1 : n > 3 ? 3 : n
}

/**
 * Generate and validate questions for one objective. Returns only the questions that passed
 * validation, each with a fresh id (`idPrefix`-N) so the caller can insert them directly. A model or
 * network failure throws; a single bad question inside an otherwise-good batch is dropped and
 * reported via `onDropped`, never fatal.
 */
export async function generateQuestions(
  p: GenerateParams,
  idPrefix: string,
  onDropped?: (index: number, reason: string) => void
): Promise<GeneratedQuestion[]> {
  if (!API_KEY) throw new Error("OPENROUTER_API_KEY is not set — cannot generate questions.")

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userPrompt(p) },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`)
  }

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenRouter returned no content")

  const rawArray = extractJsonArray(content)
  if (!Array.isArray(rawArray)) throw new Error("model response was not a JSON array")

  const out: GeneratedQuestion[] = []
  rawArray.forEach((raw, i) => {
    try {
      const question = validateMixedQuestion(raw, `${idPrefix}-${i}`)
      const difficulty = clampDifficulty((raw as Record<string, unknown>).difficulty)
      out.push({ question, difficulty })
    } catch (error) {
      onDropped?.(i, error instanceof Error ? error.message : "invalid")
    }
  })
  return out
}

export type { QuestionValidationError }
