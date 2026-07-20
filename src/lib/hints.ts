/**
 * Card hints (design/gokid-screens.md §6 → "Card Hint").
 *
 * A hint is *derived from the answer*, never authored. That is a deliberate design decision, not a
 * shortcut:
 *
 *  - No card in the catalogue has a hint field, so an authored hint would mean writing one for every
 *    card that exists and every card ever added. Content debt that large does not get paid, and the
 *    feature would ship mostly empty.
 *  - The alternative already in the app was worse: the study-session runner showed "Read each option
 *    carefully before choosing." on every single card. Identical text regardless of the question is
 *    not a hint, it is decoration that teaches a child the hint button is worthless.
 *  - A retrieval cue — first letter, length, rough magnitude — is what a teacher actually gives when
 *    a child is stuck. It narrows the search without handing over the answer, which is precisely what
 *    keeps the recall effort (and therefore the learning) intact.
 *
 * The rule: never reveal enough to answer without recalling. A one-word answer gives its initial and
 * length; a number gives its size and digit count; a sentence gives its shape and opening word.
 */

/** Words too small to be a useful "starts with" cue, and too common to narrow anything. */
const FILLER = new Set(["a", "an", "the", "of", "to", "is", "it", "in", "on", "and"])

function letters(word: string) {
  return word.replace(/[^\p{L}\p{N}]/gu, "")
}

/**
 * A retrieval cue for `answer`, or null when the answer is too short for any cue to withhold
 * anything — a one-character answer cannot be hinted at without simply being given.
 */
export function hintFor(answer: string): string | null {
  const trimmed = answer.trim()
  if (!trimmed) return null

  // Strip a trailing explanation: catalogue answers are written "450 — the tens digit is bigger."
  // and the part before the dash is the answer proper. Hinting at the explanation gives the game away.
  const head = trimmed.split(/\s+[—–-]\s+/)[0].replace(/[.!?]+$/, "").trim()
  if (!head) return null

  const words = head.split(/\s+/).filter(Boolean)

  // --- Numeric answers: digit count only. NOT the leading digit — for a round number like 400 or
  // 70, "3 digits starting with 4" is the answer, not a hint.
  const numeric = letters(head)
  if (words.length === 1 && /^\d+$/.test(numeric)) {
    const digits = numeric.length
    if (digits === 1) return "It's a single digit."
    return `It's a ${digits}-digit number.`
  }

  // --- Single word: the classic first-letter-and-length cue.
  if (words.length === 1) {
    const clean = letters(head)
    if (clean.length <= 1) return null
    return `Starts with "${clean[0].toUpperCase()}" — ${clean.length} letters.`
  }

  // --- Short phrase: how many words, and the first one if it carries meaning.
  // The *initial* of the first meaningful word, never the word itself: on a two-word answer like
  // "Water vapour", giving the opening word hands over half the answer.
  const first = letters(words[0])
  const initial = FILLER.has(first.toLowerCase()) || !first ? null : first[0].toUpperCase()
  if (words.length <= 4) {
    return initial
      ? `${words.length} words, starting with "${initial}".`
      : `${words.length} words.`
  }

  // --- Longer answers are sentences; their shape is cue enough.
  return initial
    ? `It's a sentence of ${words.length} words, starting with "${initial}".`
    : `It's a sentence of ${words.length} words.`
}
