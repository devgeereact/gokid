import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  blankResponse,
  correctLabel,
  decodeAnswers,
  encodeAnswers,
  isResponseCorrect,
  quizAttempt,
  quizItems,
  responseLabel,
} from "../quiz-scoring"
import type { MixedQuestion, QuizResponse, StudySet } from "../study-types"

/**
 * Quiz grading. The failure mode this guards is specific and has already happened once: `/api/quiz`
 * re-shuffles a question's options on every serving, so an answer recorded as "index 2" against one
 * draw and graded against another marks a correct answer wrong — and the wrong result goes into the
 * spaced-repetition engine, where it schedules real revision the child does not need.
 */

const mcq: Extract<MixedQuestion, { kind: "mcq" }> = {
  kind: "mcq",
  id: "q-mcq",
  prompt: "Which word is the fronted adverbial?",
  options: ["Quietly", "The", "Cat", "Slept"],
  answer: 0,
}

const multi: Extract<MixedQuestion, { kind: "multi" }> = {
  kind: "multi",
  id: "q-multi",
  prompt: "Which of these are prime?",
  options: ["2", "4", "7", "9"],
  answers: [0, 2],
}

const fill: Extract<MixedQuestion, { kind: "fill" }> = {
  kind: "fill",
  id: "q-fill",
  prompt: "7 × 8 = ?",
  accept: ["56", "fifty-six"],
}

const order: Extract<MixedQuestion, { kind: "order" }> = {
  kind: "order",
  id: "q-order",
  prompt: "Put the planets in order from the Sun",
  items: ["Mercury", "Venus", "Earth"],
}

const match: Extract<MixedQuestion, { kind: "match" }> = {
  kind: "match",
  id: "q-match",
  prompt: "Match the capital to its country",
  pairs: [
    { left: "France", right: "Paris" },
    { left: "Japan", right: "Tokyo" },
  ],
}

const set = (over: Partial<StudySet> = {}): StudySet => ({
  id: "y4-fronted-adverbials",
  title: "Fronted adverbials",
  subject: "English",
  topic: "Grammar and punctuation",
  yearGroup: "Year 4",
  yearCode: "Y4",
  description: "Openers that set the scene.",
  thumb: 1,
  hero: 2,
  status: "learning",
  statusLabel: "Ready to start",
  cardsTotal: 3,
  cardsDone: 0,
  minutes: 5,
  mastery: { learning: 100, getting: 0, mastered: 0 },
  cards: [{ id: "c1", question: "Q", answer: "A" }],
  quiz: [{ id: "q-mcq", prompt: mcq.prompt, options: mcq.options, answer: mcq.answer }],
  mastered: [],
  revisit: [],
  ...over,
})

describe("isResponseCorrect — mcq", () => {
  it("accepts the answer index and rejects every other", () => {
    assert.equal(isResponseCorrect(mcq, { kind: "mcq", choice: 0 }), true)
    for (const choice of [1, 2, 3]) {
      assert.equal(isResponseCorrect(mcq, { kind: "mcq", choice }), false, `choice ${choice}`)
    }
  })

  it("treats an unanswered question as wrong, not as a crash", () => {
    assert.equal(isResponseCorrect(mcq, { kind: "mcq", choice: null }), false)
    assert.equal(isResponseCorrect(mcq, undefined), false)
  })

  it("grades against the options the child was actually shown", () => {
    // The re-shuffle regression, as a test. Two servings of the same question with the options in a
    // different order have different answer indexes; the response is only meaningful next to the
    // draw it was given against, which is why the review screen replays the SERVED question list.
    const reshuffled: MixedQuestion = { ...mcq, options: ["The", "Cat", "Quietly", "Slept"], answer: 2 }
    const tappedQuietly: QuizResponse = { kind: "mcq", choice: 2 }
    assert.equal(isResponseCorrect(reshuffled, tappedQuietly), true)
    assert.equal(isResponseCorrect(mcq, tappedQuietly), false)
  })

  it("rejects a response of the wrong kind rather than reading a missing field", () => {
    assert.equal(isResponseCorrect(mcq, { kind: "fill", text: "Quietly" }), false)
  })
})

describe("isResponseCorrect — multi", () => {
  it("ignores the order the child ticked them in", () => {
    assert.equal(isResponseCorrect(multi, { kind: "multi", choices: [0, 2] }), true)
    assert.equal(isResponseCorrect(multi, { kind: "multi", choices: [2, 0] }), true)
  })

  it("requires every right option and no wrong ones", () => {
    assert.equal(isResponseCorrect(multi, { kind: "multi", choices: [0] }), false)
    assert.equal(isResponseCorrect(multi, { kind: "multi", choices: [0, 1, 2] }), false)
    assert.equal(isResponseCorrect(multi, { kind: "multi", choices: [] }), false)
  })
})

describe("isResponseCorrect — fill", () => {
  it("matches case- and whitespace-insensitively against any accepted answer", () => {
    assert.equal(isResponseCorrect(fill, { kind: "fill", text: "56" }), true)
    assert.equal(isResponseCorrect(fill, { kind: "fill", text: "  56 " }), true)
    assert.equal(isResponseCorrect(fill, { kind: "fill", text: "Fifty-Six" }), true)
    assert.equal(isResponseCorrect(fill, { kind: "fill", text: "fifty  six" }), false)
  })

  it("counts an empty box as wrong", () => {
    assert.equal(isResponseCorrect(fill, { kind: "fill", text: "" }), false)
  })
})

describe("isResponseCorrect — order", () => {
  it("is correct only when the arrangement is the authored one", () => {
    assert.equal(isResponseCorrect(order, { kind: "order", order: [0, 1, 2] }), true)
    assert.equal(isResponseCorrect(order, { kind: "order", order: [0, 2, 1] }), false)
  })

  it("rejects a partial arrangement instead of reading it as correct-so-far", () => {
    assert.equal(isResponseCorrect(order, { kind: "order", order: [0, 1] }), false)
    assert.equal(isResponseCorrect(order, { kind: "order", order: [] }), false)
  })
})

describe("isResponseCorrect — match", () => {
  it("is correct when every left maps to its own pair", () => {
    assert.equal(isResponseCorrect(match, { kind: "match", pairs: [0, 1] }), true)
    assert.equal(isResponseCorrect(match, { kind: "match", pairs: [1, 0] }), false)
  })

  it("counts an unpaired row as wrong", () => {
    assert.equal(isResponseCorrect(match, { kind: "match", pairs: [0, -1] }), false)
  })
})

describe("correctLabel", () => {
  it("renders the canonical answer for every kind", () => {
    assert.equal(correctLabel(mcq), "Quietly")
    assert.equal(correctLabel(multi), "2, 7")
    assert.equal(correctLabel(fill), "56")
    assert.equal(correctLabel(order), "Mercury → Venus → Earth")
    assert.equal(correctLabel(match), "France → Paris, Japan → Tokyo")
  })
})

describe("responseLabel", () => {
  it("says Skipped rather than inventing an answer the child never gave", () => {
    assert.equal(responseLabel(mcq, undefined), "Skipped")
    assert.equal(responseLabel(mcq, { kind: "mcq", choice: null }), "Skipped")
    assert.equal(responseLabel(multi, { kind: "multi", choices: [] }), "Skipped")
    assert.equal(responseLabel(fill, { kind: "fill", text: "   " }), "Skipped")
    assert.equal(responseLabel(order, { kind: "order", order: [] }), "Skipped")
    assert.equal(responseLabel(match, { kind: "match", pairs: [-1, -1] }), "Skipped")
  })

  it("renders what they did give", () => {
    assert.equal(responseLabel(mcq, { kind: "mcq", choice: 1 }), "The")
    assert.equal(responseLabel(multi, { kind: "multi", choices: [1, 3] }), "4, 9")
    assert.equal(responseLabel(order, { kind: "order", order: [2, 0, 1] }), "Earth → Mercury → Venus")
    assert.equal(responseLabel(match, { kind: "match", pairs: [1, -1] }), "France → Tokyo, Japan → ?")
  })
})

describe("blankResponse", () => {
  it("produces an empty response of the question's own kind", () => {
    assert.deepEqual(blankResponse(mcq), { kind: "mcq", choice: null })
    assert.deepEqual(blankResponse(multi), { kind: "multi", choices: [] })
    assert.deepEqual(blankResponse(fill), { kind: "fill", text: "" })
    assert.deepEqual(blankResponse(order), { kind: "order", order: [] })
    assert.deepEqual(blankResponse(match), { kind: "match", pairs: [-1, -1] })
  })

  it("starts every question wrong, so an untouched quiz scores zero", () => {
    for (const q of [mcq, multi, fill, order, match]) {
      assert.equal(isResponseCorrect(q, blankResponse(q)), false, q.kind)
    }
  })
})

describe("quizItems", () => {
  it("prefers a set's richer mixed quiz when it has one", () => {
    const items = quizItems(set({ mixedQuiz: [multi, fill] }))
    assert.deepEqual(
      items.map((q) => q.kind),
      ["multi", "fill"]
    )
  })

  it("lifts plain MCQs into the mixed shape, keeping the image's alt text", () => {
    const items = quizItems(
      set({
        quiz: [
          {
            id: "q1",
            prompt: "How many tens?",
            options: ["2", "7"],
            answer: 0,
            illustration: 9,
            illustrationAlt: "Two rods of ten and eight single cubes",
          },
        ],
      })
    )
    assert.equal(items.length, 1)
    assert.equal(items[0].kind, "mcq")
    // Dropping this would leave the picture unlabelled on exactly the path the runner uses — a
    // question a child using VoiceOver cannot answer at all.
    assert.equal(items[0].illustrationAlt, "Two rods of ten and eight single cubes")
  })
})

describe("quizAttempt", () => {
  const items = [mcq, multi, fill, order]

  it("scores from the responses as they finally stand", () => {
    const attempt = quizAttempt(
      set(),
      [
        { kind: "mcq", choice: 0 }, // right
        { kind: "multi", choices: [0, 1] }, // wrong
        { kind: "fill", text: "56" }, // right
        { kind: "order", order: [2, 1, 0] }, // wrong
      ],
      items
    )
    assert.equal(attempt.total, 4)
    assert.equal(attempt.correct, 2)
    assert.equal(attempt.accuracy, 50)
    assert.deepEqual(
      attempt.wrong.map((r) => r.number),
      [2, 4]
    )
  })

  it("numbers rows from 1, as the review screen labels them", () => {
    const attempt = quizAttempt(set(), [], items)
    assert.deepEqual(
      attempt.rows.map((r) => r.number),
      [1, 2, 3, 4]
    )
  })

  it("reviews a partial attempt rather than throwing on the missing answers", () => {
    const attempt = quizAttempt(set(), [{ kind: "mcq", choice: 0 }], items)
    assert.equal(attempt.correct, 1)
    assert.equal(attempt.wrong.length, 3)
    assert.equal(attempt.rows[3].pickedLabel, "Skipped")
  })

  it("reports 0% rather than NaN for an empty quiz", () => {
    const attempt = quizAttempt(set(), [], [])
    assert.equal(attempt.total, 0)
    assert.equal(attempt.accuracy, 0)
  })

  it("grades the questions the child was served, not a freshly-derived local list", () => {
    // A no-repeat server quiz draws different questions each time. Grading against the set's own
    // bundled list would compare the child's answers to questions they were never asked.
    const served: MixedQuestion[] = [{ ...mcq, id: "served-1", options: ["Cat", "Quietly"], answer: 1 }]
    const attempt = quizAttempt(set(), [{ kind: "mcq", choice: 1 }], served)
    assert.equal(attempt.correct, 1)
    assert.equal(attempt.rows[0].question.id, "served-1")
  })

  it("falls back to derived copy only where the question authors none", () => {
    const attempt = quizAttempt(set(), [], [{ ...mcq, explanation: "Because it opens the sentence." }])
    assert.equal(attempt.rows[0].explanation, "Because it opens the sentence.")

    const derived = quizAttempt(set(), [], [mcq])
    assert.match(derived.rows[0].explanation, /“Quietly” is the answer/)
    assert.equal(derived.rows[0].topic, "Grammar and punctuation")
  })
})

describe("encodeAnswers / decodeAnswers", () => {
  it("round-trips every response kind, including free text with commas", () => {
    const responses: QuizResponse[] = [
      { kind: "mcq", choice: 2 },
      { kind: "multi", choices: [0, 3] },
      { kind: "fill", text: "fifty-six, roughly" },
      { kind: "order", order: [2, 0, 1] },
      { kind: "match", pairs: [1, -1] },
    ]
    assert.deepEqual(decodeAnswers(encodeAnswers(responses)), responses)
  })

  it("reads malformed or missing input as an empty attempt instead of throwing", () => {
    // This param arrives from a route, which means it can arrive from a deep link someone typed.
    assert.deepEqual(decodeAnswers(undefined), [])
    assert.deepEqual(decodeAnswers(""), [])
    assert.deepEqual(decodeAnswers("not-json"), [])
    assert.deepEqual(decodeAnswers(encodeURIComponent('{"not":"an array"}')), [])
  })
})
