# Working-Agent — Hook proposal

Companion to [Working-Agent.md](Working-Agent.md).

**Status: INSTALLED and verified, 14 August 2026.** Scripts in [scripts/hooks/](../scripts/hooks/),
wired in [.claude/settings.json](../.claude/settings.json) (checked in, so they apply to anyone working
in this repo). 28 synthetic payloads exercised, 28 passed, plus a live blocking test of the Stop gate
against a deliberately broken type. What was built differs from this proposal in three places — see
"As built" at the end.

## Agent vs hook — which job is which

An agent *finds* problems. A hook *stops them coming back*. The QA brief is an agent job; the rules in
`AGENTS.md` are a hook job, because they are cheap, mechanical, and currently enforced only by a human
remembering. `docs/Report.md` §P2 already flagged this: *"nothing currently keeps `tsc`/lint green except
a human remembering."*

Hooks must finish in seconds and fire on every matching tool call, so nothing expensive belongs here.
The four below are all sub-second except the last, which runs once per turn.

Where they live: `.claude/settings.json` is checked into the repo and applies to anyone working in it —
correct for rules that come from `AGENTS.md`. `.claude/settings.local.json` is personal and gitignored —
correct for anything machine-specific. The current `settings.json` holds only `enabledPlugins`, so all of
this is additive.

The `update-config` skill applies these safely; I would not hand-edit `settings.json`.

---

## Hook 1 — Forbidden-pattern guard (PostToolUse, blocking)

Fires after any edit to `src/**`. Catches the four `AGENTS.md` §2/§3 rules that are pure text, plus the
product's own rejected-mechanics list from `design/gokid-screens.md` §9.

Checks, in order of how often they actually bite:

| Pattern | Rule |
| --- | --- |
| `StyleSheet.create` | `AGENTS.md` §2 — NativeWind `className` only |
| `style={{` | same |
| `from "@react-navigation` | §3 — route through `expo-router` |
| `catch {}` / `catch (e) {}` with an empty body | §3 — no swallowed errors; report to Sentry with context |
| `#[0-9a-fA-F]{3,8}` in `src/app` or `src/components` | §2 — no raw colour literals, use a token |
| `p-\[`, `text-\[`, `gap-\[` … arbitrary Tailwind values | §2 — extend `tailwind.config.js` instead |
| `streak`, `leaderboard`, `lives`, `hearts`, `countdown` (case-insensitive, new occurrences only) | the product brief rejects these mechanics; `ceoaudit.md` found them shipping anyway |

Exit code 2 blocks the tool result and feeds the message back to me, so the violation gets fixed in the
same turn rather than surviving to review.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/scripts/hooks/guard-patterns.mjs" }
        ]
      }
    ]
  }
}
```

The script reads the hook JSON from stdin, takes `tool_input.file_path`, returns 0 immediately for
anything outside `src/`, and only ever inspects the one file that changed. Sub-100ms.

**One caveat worth deciding on:** the raw-hex and arbitrary-value checks will fire on legitimate
exceptions (`tailwind.config.js` itself defines hex; `design/tokens` is the sanctioned home). The script
needs an allowlist, and the allowlist needs to stay short or the hook becomes noise and gets disabled.

---

## Hook 2 — Definition-of-done gate (Stop, blocking)

`AGENTS.md` §5: `npx tsc --noEmit` clean and `npm run lint` clean before any task is done. Today that is
honour-system. As a `Stop` hook it becomes structural — I cannot end a turn on a red typecheck.

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/scripts/hooks/done-gate.sh" } ] }
    ]
  }
}
```

The script skips entirely when nothing under `src/` changed this session (a conversation-only turn
shouldn't pay for a typecheck), then runs `tsc` and `lint` and exits 2 with the first error if either
fails.

**Cost, measured rather than guessed:** 0.27s when nothing under `src/` changed (the common case — it
exits before running anything), and 2.8s to catch a type error on a turn that did touch `src/`. A clean
full run of both `tsc` and `lint` is the slower path; the timeout is set to 180s to leave headroom.
Cheap enough that the trade barely exists.

`AGENTS.md` §5 also requires the screen to actually render on a simulator. A hook cannot check that.
It stays a human step, and the hook's failure message should say so rather than implying green means done.

---

## Hook 3 — Destructive-command guard (PreToolUse, blocking)

Three separate hazards, one hook:

- **`scripts/db-reset.mjs` and `scripts/clerk-purge.mjs`** — irreversible, and `db-reset` points at
  whatever `DATABASE_URL` currently says. The hook blocks them unless the same command line also names
  the target host or passes an explicit `--yes-i-mean-it`, forcing the confirmation to be deliberate
  rather than a reflex approval.
- **`npm install <expo-package>`** — `AGENTS.md` §3 forbids it; `npx expo install` is the only correct
  form because it pins to the SDK. Trivially greppable, and the failure mode (a subtly mismatched native
  module) is expensive.
- **Writes to `ios/` or `android/`** — §3 forbids hand-editing; this project uses Continuous Native
  Generation and a hand edit is silently destroyed on the next prebuild. Matcher on `Edit|Write` with a
  path test.

Worth adding to the same script: `drizzle-kit generate` in a non-interactive shell, which per
`CLAUDE.md` hangs forever waiting on a TTY prompt. Better to refuse with the explanation than to hang.

---

## Hook 4 — Privacy-claim tripwire (PostToolUse on `package.json`)

`src/app/data-usage.tsx` tells parents, in user-facing copy, that GoKid has no ad SDK, no analytics SDK
and no third-party tracker. That is true today. It becomes a **false statement to parents** the moment
someone adds a dependency — and nobody will remember the copy exists.

So: on any edit to `package.json`, diff the dependency list, and if anything was added, emit a
non-blocking reminder naming `src/app/data-usage.tsx` and the new package. Non-blocking on purpose —
most additions are innocent, and a blocking hook here would train people to ignore it.

This is exactly the CI check `docs/Report.md` recommended, available now without CI.

---

## What I deliberately did not propose as a hook

- **Running the QA audit on a hook.** Hours long, needs a simulator, needs approvals. It is a skill you
  invoke, not an event handler.
- **Auto-formatting on save.** Prettier config exists via `prettier-plugin-tailwindcss`; a hook that
  rewrites files under me makes the edit-verify loop lie about what is on disk.
- **Blocking on lint warnings.** Errors block, warnings do not. A hook that blocks on warnings gets
  disabled within a week, and then the errors stop blocking too.
- **A hook that enforces test coverage.** There are no tests. A hook cannot create the thing it guards.

---

## Suggested order

1. **Hook 3** (destructive guard) — pure safety, zero downside, do this first regardless of everything else.
2. **Hook 4** (privacy tripwire) — cheap, and it protects a legal-ish claim.
3. **Hook 1** (pattern guard) — highest day-to-day value, needs the allowlist tuned.
4. **Hook 2** (done gate) — decide the 10–25s cost is worth it. My view: it is, given there are no tests
   and no CI, and `tsc`+lint are literally the only automated gates that exist.

All four are independent of the QA agent and could land today. They also make the agent's job smaller:
every class of defect a hook prevents is a class the audit no longer has to find twice.

---

## As built — three deliberate departures from the proposal above

**1. The pattern guard inspects only the text an edit inserted, not the whole file.**
A whole-file check was the obvious design and it is wrong here. This codebase has pre-existing debt —
`ceoaudit.md` found streak, leaderboard and points UI shipping — so a whole-file check would fire on
every edit to those files until the debt is paid, and a hook that cries on every save gets switched off,
taking the useful checks with it. Checking inserted text enforces "do not introduce new violations",
which is true today and stays true. It also removed the need for the allowlist this doc worried about,
except for two narrow cases kept in code: raw hex is only flagged under `src/app` and `src/components`
(`src/db` and `src/lib` legitimately hold constants), and Markdown under `src/` is skipped.

**2. Destructive scripts are blocked behind an explicit `--yes-i-mean-it` flag, not a confirmation.**
A hook cannot hold a conversation. Requiring the flag forces the approval to be a separate, deliberate
act — inspect first, show the operator the target host and the row counts, then re-run with the flag.
`node scripts/db-inspect.mjs`, `db-counts.mjs` and `clerk-list.mjs` stay unblocked, so the safe
read-only path is always available. Two extra traps went into the same script because they belong to
the same family: `CODE_SIGNING_ALLOWED=NO` builds (empty entitlements, `OSStatus -34018`, permanent
splash hang) and `drizzle-kit generate` in a non-interactive shell (hangs forever on its TTY prompt).

**3. The privacy tripwire exits 2, not 0.**
The proposal called it non-blocking to avoid alert fatigue. But a PostToolUse hook that exits 0 writes
to the transcript, where nothing reads it — an invisible reminder is not a reminder. Exit 2 on a
PostToolUse hook does not undo the edit (the tool has already run); it returns the message so it gets
handled in the same turn. The fatigue problem is solved differently: it fires only when a dependency is
genuinely **added**, diffed against `git show HEAD:package.json`. Version bumps, removals and lockfile
churn are silent. In this repo that is a handful of times a year.

**Verified behaviour** (`pass=28 fail=0`): `db-reset`/`clerk-purge` blocked bare and allowed with the
flag; `clerk-list` never blocked; `npm install expo-av` blocked while `npx expo install expo-av` and
`npm install lodash` pass; `npm i react-native-purchases` blocked; unsigned-build and `drizzle-kit
generate` blocked; `ios/Podfile` edits blocked while `src/` edits pass; malformed hook payloads exit 0
rather than breaking the session; every pattern rule fires on inserted text and stays quiet on clean
code, files outside `src/`, and raw hex in `src/db`; the Stop gate skips in 0.27s with no `src` changes
and blocks in 2.8s with a type error, quoting the exact `TS2322`.

**Not covered, and a hook cannot cover it:** `AGENTS.md` §5 also requires the changed screen to actually
render on a simulator. A green typecheck is not a rendering screen, and the gate's success message says
so rather than implying done.
