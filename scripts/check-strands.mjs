// Every StudySet.topic must equal a strand name on its subject, because lib/analytics.ts matches the
// two by exact string equality. A topic that matches nothing is not a cosmetic problem: the set's
// progress vanishes from the subject hub, from search (which filters by strand), and from the
// strong/weak-area nudges — the content is taught correctly and the app cannot see it.
//
// Four sets were in that state until 15 Aug 2026, two of them because the Science strand list had no
// slot for statutory KS1 units that had authored sets. This script exists so the next one is caught
// by a command rather than by an audit.
//
// Deliberately a source scan, not an import: study.ts `require()`s PNGs, which plain node cannot load.
import { readFileSync } from "node:fs"

const study = readFileSync(new URL("../src/lib/study.ts", import.meta.url), "utf8")
const subjects = readFileSync(new URL("../src/lib/subjects.ts", import.meta.url), "utf8")

// Strand names per subject slug, read out of each SUBJECTS entry's `strands: [...]` block.
const strandsBySubject = new Map()
for (const block of subjects.split(/\n\s*\{\s*\n\s*slug:/).slice(1)) {
  const slug = block.match(/^\s*"([a-z-]+)"/)?.[1]
  const name = block.match(/\n\s*name:\s*"([^"]+)"/)?.[1]
  const strandBlock = block.match(/strands:\s*\[([\s\S]*?)\n\s*\]/)?.[1] ?? ""
  const names = [...strandBlock.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1])
  if (slug && name) strandsBySubject.set(name, { slug, strands: names })
}

// (id, subject, topic) per study set.
const sets = []
for (const block of study.split(/\n\s*\{\s*\n\s*id:\s*"/).slice(1)) {
  const id = block.match(/^([a-z0-9-]+)"/)?.[1]
  const subject = block.match(/\n\s*subject:\s*"([^"]+)"/)?.[1]
  const topic = block.match(/\n\s*topic:\s*"([^"]+)"/)?.[1]
  // `strand` overrides `topic` for grouping — see study.ts:strandOf.
  const strand = block.match(/\n\s*strand:\s*"([^"]+)"/)?.[1]
  if (id && subject && topic) sets.push({ id, subject, topic: strand ?? topic })
}

let bad = 0
for (const set of sets) {
  const entry = strandsBySubject.get(set.subject)
  if (!entry) {
    console.log(`UNKNOWN SUBJECT  ${set.id.padEnd(24)} subject="${set.subject}"`)
    bad++
    continue
  }
  if (!entry.strands.includes(set.topic)) {
    console.log(`NO STRAND MATCH  ${set.id.padEnd(24)} ${set.subject} topic="${set.topic}"`)
    console.log(`                 available: ${entry.strands.join(" | ")}`)
    bad++
  }
}

console.log(`\n${sets.length} sets checked, ${strandsBySubject.size} subjects, ${bad} unmatched.`)
process.exit(bad === 0 ? 0 : 1)
