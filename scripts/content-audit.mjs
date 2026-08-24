// Structural audit of the whole curriculum — every set, card and question, checked against the rules
// the app relies on but cannot enforce at runtime.
//
// The existing checks (`check-strands`, `check-answer-bias`) each guard one specific failure that had
// already shipped, and both scan `study.ts` as text because Node cannot `require()` a PNG. This one
// loads the real catalogue through `scripts/asset-hook.mjs`, so it sees the assembled data rather
// than the source that produces it — spreads, defaults and derived fields included.
//
// It is deliberately repeatable and content-agnostic: a curriculum update runs the same command, and
// the failures it reports are structural (a prompt with no question in it, an answer index pointing
// past the end of the options) rather than editorial. Nothing here judges whether a fact is true;
// that is a human review, and §21 of the release plan says so explicitly.
//
//   node --import tsx --import ./scripts/asset-hook.mjs scripts/content-audit.mjs
//   npm run check:content            # part of the standard gate
//   npm run check:content:db         # the above, plus the live DB compared field-by-field
//
// The `--db` pass is what catches content that drifted on the server: a diagnostic marker left in a
// prompt, a half-applied seed, a row edited by hand. It needs DATABASE_URL.

import { STUDY_SETS } from "../src/lib/study.ts"
import { SUBJECTS } from "../src/lib/subjects.ts"

const problems = []
/**
 * Warnings are grouped by kind, not listed per item. "No explanation authored" is true of all 140
 * questions today, and 140 identical lines is a wall of text that hides the one line that matters —
 * which is the exact failure mode of a check nobody reads.
 */
const warnings = new Map()

const fail = (where, message) => problems.push(`${where}: ${message}`)
const warn = (kind, where) => {
  const group = warnings.get(kind) ?? []
  group.push(where)
  warnings.set(kind, group)
}

const isFilled = (v) => typeof v === "string" && v.trim().length > 0

const YEAR_CODES = ["Rec", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6"]
const STATUSES = ["getting", "learning"]

/** "Y4" → "Year 4". Mirrors `yearLabel` in lib/children.ts. */
const yearGroupLabel = (code) => (code === "Rec" ? "Reception" : `Year ${code.replace(/^Y/, "")}`)

/**
 * Spellings that mark a set as written in American English. GoKid teaches the UK National
 * Curriculum, and a child who writes "color" in a SATs paper is marked wrong — so this is a content
 * defect, not a style preference.
 *
 * Whole words only, and the list is short on purpose: "practice"/"practise" and "program" are
 * genuinely ambiguous in British usage (a computer program, practice as a noun), so they are not
 * here. A false positive that has to be argued about every run is a check people learn to ignore.
 */
const US_SPELLINGS = [
  [/\bcolor(s|ed|ing|ful)?\b/i, "colour"],
  [/\bcenter(s|ed|ing)?\b/i, "centre"],
  [/\bmeter(s)?\b/i, "metre"],
  [/\bliter(s)?\b/i, "litre"],
  [/\bfiber(s)?\b/i, "fibre"],
  [/\bgray\b/i, "grey"],
  [/\bplow(s|ed|ing)?\b/i, "plough"],
  [/\bmath\b/i, "maths"],
  [/\bmemoriz(e|es|ed|ing|ation)\b/i, "memorise"],
  [/\borganiz(e|es|ed|ing|ation)\b/i, "organise"],
  [/\brecogniz(e|es|ed|ing)\b/i, "recognise"],
  [/\banaliz|analyz(e|es|ed|ing)\b/i, "analyse"],
  [/\bdefense\b/i, "defence"],
  [/\btraveled|traveling\b/i, "travelled / travelling"],
]

function checkBritishEnglish(where, text) {
  if (!isFilled(text)) return
  for (const [pattern, uk] of US_SPELLINGS) {
    const hit = text.match(pattern)
    if (hit) fail(where, `American spelling "${hit[0]}" — use "${uk}". In: ${JSON.stringify(text.slice(0, 90))}`)
  }
}

// ---------------------------------------------------------------------------
// Sets

const strandsBySubject = new Map(SUBJECTS.map((s) => [s.name, s.strands.map((st) => st.name)]))
const seenSetIds = new Set()
const seenCardIds = new Set()
const seenQuestionIds = new Set()

for (const set of STUDY_SETS) {
  const at = `set ${set.id}`

  if (seenSetIds.has(set.id)) fail(at, "duplicate set id — the later one is unreachable by every route")
  seenSetIds.add(set.id)

  for (const field of ["id", "title", "subject", "topic", "description", "statusLabel", "yearGroup"]) {
    if (!isFilled(set[field])) fail(at, `empty \`${field}\``)
  }
  for (const field of ["title", "description", "topic", "statusLabel"]) checkBritishEnglish(at, set[field])

  if (!YEAR_CODES.includes(set.yearCode)) fail(at, `yearCode "${set.yearCode}" is not one of ${YEAR_CODES.join(", ")}`)
  else if (set.yearGroup !== yearGroupLabel(set.yearCode)) {
    // The dashboard filters by `yearCode` and labels by `yearGroup`. Disagreement puts a set titled
    // "Year 3" into a Year 4 child's list.
    fail(at, `yearGroup "${set.yearGroup}" does not match yearCode "${set.yearCode}"`)
  }

  if (!STATUSES.includes(set.status)) fail(at, `status "${set.status}" is not one of ${STATUSES.join(", ")}`)
  if (typeof set.minutes !== "number" || set.minutes <= 0) fail(at, `minutes must be a positive number`)
  if (set.thumb === undefined || set.hero === undefined) fail(at, "missing artwork (thumb/hero)")

  // The subject hubs, search and the strong/weak-area nudges group sets by matching a strand name
  // with exact string equality — see lib/analytics.ts and check-strands.mjs.
  const strand = set.strand ?? set.topic
  const strands = strandsBySubject.get(set.subject)
  if (!strands) fail(at, `subject "${set.subject}" is not in lib/subjects.ts`)
  else if (!strands.includes(strand)) {
    fail(at, `strand "${strand}" matches no strand on ${set.subject} — this set's progress is invisible in its hub`)
  }

  const mastery = set.mastery ?? {}
  const masterySum = (mastery.learning ?? 0) + (mastery.getting ?? 0) + (mastery.mastered ?? 0)
  if (masterySum !== 100) fail(at, `mastery split sums to ${masterySum}, not 100`)

  // ------------------------------------------------------------------- cards
  if (!Array.isArray(set.cards) || set.cards.length === 0) fail(at, "no flashcards — the set opens on an empty runner")

  for (const [i, card] of (set.cards ?? []).entries()) {
    const cardAt = `${at} card[${i}] ${card.id ?? "?"}`
    if (!isFilled(card.id)) fail(cardAt, "missing id")
    else if (seenCardIds.has(card.id)) {
      // Card ids key the spaced-repetition record (`${setId}:${cardId}`), so a collision across sets
      // is survivable — but a collision inside one set silently merges two cards' schedules.
      fail(cardAt, "duplicate card id")
    } else seenCardIds.add(card.id)

    if (!isFilled(card.question)) fail(cardAt, "empty question — a blank card in front of a child")
    if (!isFilled(card.answer)) fail(cardAt, "empty answer")
    checkBritishEnglish(cardAt, card.question)
    checkBritishEnglish(cardAt, card.answer)
  }

  if (set.cardsTotal !== set.cards?.length) {
    fail(at, `cardsTotal ${set.cardsTotal} does not match ${set.cards?.length} authored cards`)
  }

  // ------------------------------------------------------------------- quiz
  if (!Array.isArray(set.quiz) || set.quiz.length === 0) fail(at, "no quiz questions")

  for (const [i, q] of (set.quiz ?? []).entries()) {
    checkQuestion(`${at} quiz[${i}]`, { ...q, kind: "mcq" }, set)
  }
  for (const [i, q] of (set.mixedQuiz ?? []).entries()) {
    checkQuestion(`${at} mixedQuiz[${i}]`, q, set)
  }

  // `mastered` / `revisit` name topics the review screens attribute questions to. A name that is not
  // a real topic reads to a parent as a subject their child is weak at, invented by the app.
  for (const topic of [...(set.mastered ?? []), ...(set.revisit ?? [])]) {
    if (!isFilled(topic)) fail(at, "empty entry in mastered/revisit")
  }
}

function checkQuestion(where, q, set) {
  const at = `${where} ${q.id ?? "?"}`

  if (!isFilled(q.id)) fail(at, "missing id")
  else if (seenQuestionIds.has(q.id)) fail(at, "duplicate question id — /api/quiz keys impressions on it")
  else seenQuestionIds.add(q.id)

  if (!isFilled(q.prompt)) fail(at, "empty prompt — a question with nothing to ask")
  checkBritishEnglish(at, q.prompt)
  checkBritishEnglish(at, q.explanation)

  if (!q.explanation) warn("no authored explanation (the review screen derives one)", at)

  // An illustrated question with no alt text is a question a child using VoiceOver cannot answer at
  // all. The quiz runner exposes the picture as an unnamed image.
  if (q.illustration !== undefined && !isFilled(q.illustrationAlt)) {
    fail(at, "illustration with no illustrationAlt — unanswerable with VoiceOver")
  }

  const options = q.options
  switch (q.kind) {
    case "mcq": {
      if (!Array.isArray(options) || options.length < 2) return fail(at, "an MCQ needs at least two options")
      options.forEach((opt, i) => {
        if (!isFilled(opt)) fail(at, `option[${i}] is empty`)
        checkBritishEnglish(at, opt)
      })
      if (new Set(options.map((o) => String(o).trim().toLowerCase())).size !== options.length) {
        fail(at, "duplicate options — two identical taps, one of them marked wrong")
      }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) {
        fail(at, `answer index ${q.answer} is outside options[0..${options.length - 1}]`)
      }
      break
    }
    case "multi": {
      if (!Array.isArray(options) || options.length < 2) return fail(at, "a multi-select needs at least two options")
      options.forEach((opt, i) => isFilled(opt) || fail(at, `option[${i}] is empty`))
      if (!Array.isArray(q.answers) || q.answers.length === 0) return fail(at, "no correct answers")
      for (const a of q.answers) {
        if (!Number.isInteger(a) || a < 0 || a >= options.length) fail(at, `answer index ${a} is out of range`)
      }
      if (new Set(q.answers).size !== q.answers.length) fail(at, "duplicate entries in `answers`")
      if (q.answers.length === options.length) fail(at, "every option is correct — nothing to choose")
      break
    }
    case "fill": {
      if (!Array.isArray(q.accept) || q.accept.length === 0) return fail(at, "no accepted answers")
      q.accept.forEach((a, i) => isFilled(a) || fail(at, `accept[${i}] is empty`))
      break
    }
    case "order": {
      if (!Array.isArray(q.items) || q.items.length < 2) return fail(at, "an ordering question needs at least two items")
      q.items.forEach((item, i) => isFilled(item) || fail(at, `items[${i}] is empty`))
      if (new Set(q.items).size !== q.items.length) fail(at, "duplicate items — two correct arrangements")
      break
    }
    case "match": {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) return fail(at, "a matching question needs at least two pairs")
      q.pairs.forEach((p, i) => {
        if (!isFilled(p?.left) || !isFilled(p?.right)) fail(at, `pairs[${i}] is incomplete`)
      })
      if (new Set(q.pairs.map((p) => p?.right)).size !== q.pairs.length) {
        fail(at, "two pairs share a right-hand value — more than one arrangement is correct")
      }
      break
    }
    default:
      fail(at, `unknown question kind "${q.kind}"`)
  }

  // The topic a wrong answer is attributed to on the review screen. Falls back to the set's own
  // revisit list, so an unauthored topic is fine — an empty string is not.
  if (q.topic !== undefined && !isFilled(q.topic)) fail(at, "empty `topic`")
  void set
}

// ---------------------------------------------------------------------------
// Optional: the live database, compared field-by-field against the catalogue.

if (process.argv.includes("--db")) {
  await import("dotenv/config")
  const { neon } = await import("@neondatabase/serverless")
  if (!process.env.DATABASE_URL) {
    fail("db", "DATABASE_URL is not set — cannot compare the served content")
  } else {
    const sql = neon(process.env.DATABASE_URL)
    const dbCards = await sql`select id, set_id, question, answer from cards`
    const dbQuestions = await sql`select id, set_id, kind, prompt, payload, mixed from quiz_questions`

    const byId = (rows) => new Map(rows.map((r) => [r.id, r]))
    const cardRows = byId(dbCards)
    const questionRows = byId(dbQuestions)

    for (const set of STUDY_SETS) {
      for (const card of set.cards) {
        const row = cardRows.get(card.id)
        if (!row) {
          warn("card not in the database (set not seeded)", `card ${card.id}`)
          continue
        }
        // Exactly the drift this pass exists to catch: a diagnostic marker, a hand edit, a partial
        // re-seed. The catalogue is the reviewed copy; the database is what a child is served.
        if (row.question !== card.question) {
          fail(`db card ${card.id}`, `question differs from the catalogue\n    db:  ${row.question}\n    src: ${card.question}`)
        }
        if (row.answer !== card.answer) {
          fail(`db card ${card.id}`, `answer differs from the catalogue\n    db:  ${row.answer}\n    src: ${card.answer}`)
        }
      }

      for (const q of [...set.quiz.map((x) => ({ ...x, kind: "mcq" })), ...(set.mixedQuiz ?? [])]) {
        const row = questionRows.get(q.id)
        if (!row) {
          warn("question not in the database (set not seeded)", `question ${q.id}`)
          continue
        }
        if (row.prompt !== q.prompt) {
          fail(`db question ${q.id}`, `prompt differs from the catalogue\n    db:  ${row.prompt}\n    src: ${q.prompt}`)
        }
        if (row.kind !== q.kind) fail(`db question ${q.id}`, `kind "${row.kind}" differs from "${q.kind}"`)
        if (q.kind === "mcq") {
          // Compared by the ANSWER TEXT, not the index. The two copies legitimately hold the options
          // in different orders — `/api/quiz` re-shuffles on every serving anyway, and the seeded
          // rows were re-ordered to break the positional bias `check-answer-bias` guards against. An
          // index mismatch is therefore expected; the same option set marking a *different word*
          // right is the real defect, and this is what sees it.
          const dbOptions = row.payload?.options ?? []
          const dbAnswer = dbOptions[row.payload?.answer]
          const srcAnswer = q.options[q.answer]
          if (dbAnswer !== srcAnswer) {
            fail(
              `db question ${q.id}`,
              `marks a different answer correct\n    db:  ${JSON.stringify(dbAnswer)}\n    src: ${JSON.stringify(srcAnswer)}`
            )
          }
          const same = (a, b) => [...a].sort().join("|") === [...b].sort().join("|")
          if (!same(dbOptions, q.options)) {
            fail(
              `db question ${q.id}`,
              `option set differs\n    db:  ${JSON.stringify(dbOptions)}\n    src: ${JSON.stringify(q.options)}`
            )
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------

const cardCount = STUDY_SETS.reduce((n, s) => n + s.cards.length, 0)
const questionCount = STUDY_SETS.reduce((n, s) => n + s.quiz.length + (s.mixedQuiz?.length ?? 0), 0)

let warnCount = 0
for (const [kind, where] of warnings) {
  warnCount += where.length
  const sample = where.slice(0, 3).join(", ")
  const more = where.length > 3 ? `, +${where.length - 3} more` : ""
  console.warn(`  warn  ${where.length}x ${kind}\n          ${sample}${more}`)
}
for (const line of problems) console.error(`  FAIL  ${line}`)

console.log(
  `\ncontent-audit: ${STUDY_SETS.length} sets, ${cardCount} cards, ${questionCount} questions — ` +
    `${problems.length} problem(s), ${warnCount} warning(s)`
)

process.exit(problems.length === 0 ? 0 : 1)
