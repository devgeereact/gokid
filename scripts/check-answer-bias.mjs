// Positional-answer-bias check for the authored quizzes in src/lib/study.ts.
//
// A content audit on 14 Aug 2026 found two entire Y4 quizzes whose correct answer was option A for
// all five questions, and several more at 4-of-5 on one index. A child who always taps the same
// position scores full marks without reading, and that false result is written into the
// spaced-repetition schedule — so the quiz stops measuring anything and starts corrupting the thing
// that decides what the child sees next.
//
// Individually every one of those questions is correct, which is why per-question review never
// caught it. The defect only exists in the set of answers, so this checks the set.
//
// Rule: within one quiz, no single option index may hold more than half the correct answers
// (rounded up), and a quiz of 4+ questions must use at least two distinct indices.
//
// Source scan rather than import: study.ts `require()`s PNGs and plain node cannot load them.
import { readFileSync } from "node:fs"

const src = readFileSync(new URL("../src/lib/study.ts", import.meta.url), "utf8")

// One block per study set, split on the `id:` that opens each object literal.
const blocks = src.split(/\n\s*\{\s*\n\s*id:\s*"/).slice(1)

let failures = 0
let quizzes = 0

for (const block of blocks) {
  const setId = block.match(/^([a-z0-9-]+)"/)?.[1]
  if (!setId) continue

  // `quiz: [...]` only — `mixedQuiz` carries non-MCQ kinds and is checked by shape, not position.
  const quizBlock = block.match(/\n\s*quiz:\s*\[([\s\S]*?)\n\s*\],/)?.[1]
  if (!quizBlock) continue

  const answers = [...quizBlock.matchAll(/\banswer:\s*(\d+)/g)].map((m) => Number(m[1]))
  if (answers.length < 4) continue
  quizzes++

  const counts = new Map()
  for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1)
  const [topIndex, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const limit = Math.ceil(answers.length / 2)

  const distribution = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, n]) => `${"ABCD"[i] ?? i}×${n}`)
    .join(" ")

  if (topCount > limit || counts.size < 2) {
    console.log(
      `BIASED  ${setId.padEnd(24)} ${answers.length} questions, ${distribution}` +
        `  — option ${"ABCD"[topIndex] ?? topIndex} holds ${topCount}/${answers.length} (max ${limit})`
    )
    failures++
  }
}

console.log(`\n${quizzes} quizzes checked, ${failures} biased.`)
process.exit(failures === 0 ? 0 : 1)
