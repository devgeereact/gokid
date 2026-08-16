#!/usr/bin/env node
// PostToolUse guard for the AGENTS.md §2/§3 rules that are pure text, plus the motivational mechanics
// the product brief explicitly rejects.
//
// It inspects ONLY the text this edit inserted — not the whole file. That matters: the codebase has
// pre-existing debt (ceoaudit.md found streak/leaderboard UI shipping), and a whole-file check would
// fire on every edit to those files until the debt is paid, which is how a hook gets switched off.
// "Do not introduce new violations" is enforceable today; "the file is clean" is not.
//
// Exit 2 returns the message to Claude so it gets fixed in the same turn.

let raw = ""
for await (const chunk of process.stdin) raw += chunk

let input
try {
  input = JSON.parse(raw)
} catch {
  process.exit(0)
}

const args = input.tool_input ?? {}
const path = String(args.file_path ?? "")

// Only source under src/. tailwind.config.js and design/tokens are where literals legitimately live.
if (!/(^|\/)src\//.test(path)) process.exit(0)
if (/\.(md|json|png|jpg|svg)$/.test(path)) process.exit(0)

// Collect inserted text across Write / Edit / MultiEdit shapes.
const inserted = [
  args.content,
  args.new_string,
  ...(Array.isArray(args.edits) ? args.edits.map((e) => e?.new_string) : []),
]
  .filter((s) => typeof s === "string")
  .join("\n")

if (!inserted.trim()) process.exit(0)

/**
 * Strip comments before matching.
 *
 * Without this the guard fires on its own subject matter: a comment explaining *why* inline
 * `style={{}}` is banned contains the string it bans, so documenting the rule violates it. That is a
 * false positive that punishes the most useful kind of comment, and the fastest way to get a hook
 * switched off is to have it block correct work.
 *
 * Crude on purpose — a `//` inside a string literal (a URL, say) loses the rest of that line from the
 * check. The cost of that is a missed violation on one line; the cost of parsing JS properly in a
 * pre-commit-speed hook is not worth paying.
 */
const code = inserted
  .replace(/\/\*[\s\S]*?\*\//g, " ") // block comments, including JSX {/* … */} bodies
  .replace(/(^|[^:])\/\/.*$/gm, "$1") // line comments, but not the // in https://

const isScreen = /(^|\/)src\/(app|components)\//.test(path)

const RULES = [
  {
    test: /StyleSheet\.create/,
    msg: "StyleSheet.create — AGENTS.md §2 forbids it. NativeWind `className` only.",
  },
  {
    test: /style=\{\{/,
    msg: "inline style={{ … }} — AGENTS.md §2 forbids it. Use `className`.",
  },
  {
    test: /from\s+["']@react-navigation/,
    msg: "direct @react-navigation import — AGENTS.md §3. Route through expo-router.",
  },
  {
    test: /catch\s*(\([^)]*\))?\s*\{\s*\}/,
    msg: "empty catch — AGENTS.md §3 forbids swallowing errors. Report to Sentry with context.",
  },
  {
    test: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|gap|w|h|text|rounded|bg|border|shadow)-\[/,
    msg: "arbitrary Tailwind value (e.g. p-[13px]) — AGENTS.md §2. Add a named token to tailwind.config.js.",
  },
  {
    test: /#[0-9a-fA-F]{6}\b/,
    only: () => isScreen,
    msg: "raw colour literal — AGENTS.md §2. Use a token from tailwind.config.js / design tokens.",
  },
  {
    test: /\b(streak|leaderboard|countdown)\b/i,
    msg:
      "rejected motivational mechanic (streak / leaderboard / countdown). design/gokid-screens.md §9 " +
      "rejects these deliberately; ceoaudit.md found them shipping anyway. If this is intentional " +
      "removal or a comment about them, say so and re-apply.",
  },
]

const hits = RULES.filter((r) => (r.only ? r.only() : true) && r.test.test(code)).map((r) => "  • " + r.msg)

if (hits.length) {
  process.stderr.write(`Rule violations in the text just written to ${path}:\n${hits.join("\n")}\n`)
  process.exit(2)
}

process.exit(0)
