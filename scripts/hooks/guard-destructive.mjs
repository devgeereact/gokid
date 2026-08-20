#!/usr/bin/env node
// PreToolUse guard. Blocks four things that are cheap to do by reflex and expensive to undo:
//
//   1. scripts/db-reset.mjs and scripts/clerk-purge.mjs run without a deliberate confirmation flag.
//      Both are irreversible and db-reset points at whatever DATABASE_URL currently says.
//   2. `npm install` of an Expo/React Native package. AGENTS.md §3: only `npx expo install` pins to
//      the SDK; a mismatched native module fails at runtime, not at install time.
//   3. Hand-edits to ios/ or android/. This project uses Continuous Native Generation, so the edit is
//      silently destroyed on the next prebuild. Express native config as a config plugin in app.json.
//   4. CODE_SIGNING_ALLOWED=NO builds. They produce empty entitlements, every Keychain call fails with
//      OSStatus -34018, Clerk's isLoaded never flips, and the app hangs on the splash forever.
//
// Also refuses `drizzle-kit generate` in a non-interactive shell, where it hangs on a TTY prompt.
//
// Exit 2 blocks the call and returns stderr to Claude. Exit 0 allows.

let raw = ""
for await (const chunk of process.stdin) raw += chunk

let input
try {
  input = JSON.parse(raw)
} catch {
  process.exit(0) // Never break the session over a malformed hook payload.
}

const tool = input.tool_name ?? ""
const args = input.tool_input ?? {}
const deny = (msg) => {
  process.stderr.write(msg + "\n")
  process.exit(2)
}

if (tool === "Bash") {
  const raw_cmd = String(args.command ?? "")

  /**
   * Match against the command with heredoc bodies and quoted strings removed.
   *
   * These rules exist to stop dangerous INVOCATIONS. Without this, they also fired on any command
   * that merely CONTAINED the dangerous text as data — most obviously a commit message documenting
   * why the thing is banned, which is precisely the text most worth writing. Three separate rules
   * tripped on their own documentation before this was added.
   *
   * Heredocs go first (a commit message body is the common case), then quoted strings. What remains
   * is the executable shape of the command, which is what these rules are about. A real invocation
   * is unquoted by definition — `node scripts/db-reset.mjs` cannot run from inside quotes.
   */
  const cmd = raw_cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\s*\2\s*$/gm, " ") // heredoc body
    .replace(/'[^']*'/g, " ") // single-quoted
    .replace(/"[^"]*"/g, " ") // double-quoted

  if (/scripts\/db-reset\.mjs/.test(cmd) && !/--yes-i-mean-it/.test(cmd)) {
    deny(
      "BLOCKED: db-reset.mjs drops every GoKid table against whatever DATABASE_URL points at, irreversibly.\n" +
        "Run `node scripts/db-inspect.mjs` first, show the operator the host and row counts, get approval\n" +
        "in this turn, then re-run with `--yes-i-mean-it` appended."
    )
  }

  if (/scripts\/clerk-purge\.mjs/.test(cmd) && !/--yes-i-mean-it/.test(cmd)) {
    deny(
      "BLOCKED: clerk-purge.mjs deletes every user on the Clerk instance. Its sk_test guard is not a\n" +
        "substitute for consent. Run `node scripts/clerk-list.mjs` first, show the operator exactly which\n" +
        "accounts and children will be deleted, get approval, then re-run with `--yes-i-mean-it`."
    )
  }

  // `npm install expo-foo` / `npm i @expo/ui` / `npm add react-native-x` — but never `npx expo install`.
  if (/\bnpm\s+(install|i|add)\b/.test(cmd) && /(^|\s)(--save\S*\s+)?(@expo\/\S+|expo(-\S+)?|react-native(-\S+)?)(@\S+)?(\s|$)/.test(cmd)) {
    deny(
      "BLOCKED (AGENTS.md §3): use `npx expo install <package>` for Expo/React Native packages so the\n" +
        "version stays aligned with SDK 57. `npm install` pins whatever npm's registry calls latest, which\n" +
        "is how a native module ends up subtly mismatched with the runtime."
    )
  }

  // Scoped to an actual build invocation. Without the xcodebuild/xcrun requirement this fired on any
  // command that merely MENTIONED the flag — including the commit message documenting why it is
  // banned, which is exactly the text most worth writing. Same lesson as the comment-stripping in
  // guard-patterns: a guard that punishes documenting the rule gets switched off.
  if (/\b(xcodebuild|xcrun)\b/.test(cmd) && /CODE_SIGNING_ALLOWED\s*=\s*NO/.test(cmd)) {
    deny(
      "BLOCKED: a CODE_SIGNING_ALLOWED=NO build has empty entitlements. Every Keychain call then fails\n" +
        "with OSStatus -34018, Clerk's isLoaded never flips, and the app hangs on the splash forever\n" +
        "(docs/archive/2026-07-20-diagnostic-report.md §1). Use the default adhoc simulator signing — pass no signing flags at all."
    )
  }

  if (/drizzle-kit\s+generate\b/.test(cmd)) {
    deny(
      "BLOCKED: `drizzle-kit generate` needs a TTY for its rename-vs-drop prompt and hangs here (CLAUDE.md).\n" +
        "Either ask the operator to run it in a real terminal, or hand-author the migration SQL plus its\n" +
        "drizzle/meta/*_snapshot.json and _journal.json entry, then confirm with db:generate reporting\n" +
        '"No schema changes".'
    )
  }
}

if (tool === "Edit" || tool === "Write" || tool === "MultiEdit" || tool === "NotebookEdit") {
  const path = String(args.file_path ?? "")
  if (/(^|\/)(ios|android)\//.test(path)) {
    deny(
      `BLOCKED (AGENTS.md §3): ${path} is generated. This project uses Continuous Native Generation, so a\n` +
        "hand edit here is destroyed on the next prebuild. Express the change as a config plugin in app.json."
    )
  }
}

process.exit(0)
