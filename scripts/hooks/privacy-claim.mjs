#!/usr/bin/env node
// PostToolUse tripwire on package.json.
//
// src/app/data-usage.tsx tells parents, in user-facing copy, that GoKid has no ad SDK, no analytics
// SDK and no third-party tracker. That is true today. It becomes a false statement to parents the
// moment someone adds a dependency — and nobody will remember the copy exists.
//
// The July diagnostic report recommended this as a CI check. This is the same check, without CI.
//
// Fires only when a dependency was actually ADDED (not on version bumps, not on removals), which
// makes it rare enough to stay signal.

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"

let raw = ""
for await (const chunk of process.stdin) raw += chunk

let input
try {
  input = JSON.parse(raw)
} catch {
  process.exit(0)
}

const path = String(input.tool_input?.file_path ?? "")
if (!/(^|\/)package\.json$/.test(path)) process.exit(0)

const names = (pkg) => [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]

let before, after
try {
  after = names(JSON.parse(readFileSync(path, "utf8")))
  const head = execSync("git show HEAD:package.json", { cwd: process.cwd(), encoding: "utf8" })
  before = names(JSON.parse(head))
} catch {
  process.exit(0) // No git history, or unreadable — nothing useful to say.
}

const added = after.filter((n) => !before.includes(n))
if (!added.length) process.exit(0)

process.stderr.write(
  `New dependencies added: ${added.join(", ")}\n\n` +
    "src/app/data-usage.tsx states to parents that this app has no ad SDK, no analytics SDK and no\n" +
    "third-party tracker. Check whether that copy is still true. If any of these collects, transmits or\n" +
    "profiles user data, the screen must be updated in the same change — it is a factual claim made to\n" +
    "parents about a children's app, not marketing copy.\n" +
    "If the additions are inert (types, build tooling), say so and carry on.\n"
)
process.exit(2)
