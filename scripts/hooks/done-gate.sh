#!/usr/bin/env bash
# Stop hook — AGENTS.md §5: `npx tsc --noEmit` clean and `npm run lint` clean before any task is done.
#
# Today that is honour-system, and there are no tests and no CI, so these two commands are the only
# automated gates that exist in this repository (docs/Report.md §P2).
#
# Skips entirely when nothing under src/ has changed, so conversation-only turns pay nothing.
#
# Exit 2 blocks the turn from ending and returns the first error. Exit 0 allows.

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

payload=$(cat)

# The Stop hook re-fires after it blocks once. Without this the turn cannot ever end.
case "$payload" in
  *'"stop_hook_active":true'*) exit 0 ;;
esac

# Nothing touched in src/ → nothing to gate.
if [ -z "$(git status --porcelain -- src 2>/dev/null)" ]; then
  exit 0
fi

fail() {
  printf '%s\n' "$1" >&2
  exit 2
}

if ! tsc_out=$(npx tsc --noEmit 2>&1); then
  fail "AGENTS.md §5 gate: \`npx tsc --noEmit\` is failing. First error:

$(printf '%s\n' "$tsc_out" | grep -m3 -E 'error TS' || printf '%s\n' "$tsc_out" | head -5)

Fix it before ending the turn."
fi

# Content-integrity checks. Cheap (they scan two files), and they guard defects that no typecheck can
# see: a study set whose topic matches no curriculum strand disappears from the subject hub that
# exists to show it, and a quiz whose correct answers cluster on one option can be passed without
# reading. Both shipped undetected until 15 Aug 2026 — 10 sets and 9 quizzes respectively.
if ! strands_out=$(node "$PWD/scripts/check-strands.mjs" 2>&1); then
  fail "Content gate: a study set's topic/strand matches no curriculum strand.

$strands_out

Fix the topic, add the strand to src/lib/subjects.ts, or set an explicit \`strand\` on the set."
fi

if ! bias_out=$(node "$PWD/scripts/check-answer-bias.mjs" 2>&1); then
  fail "Content gate: a quiz's correct answers cluster on one option position.

$bias_out

Reorder the options (keeping the correct answer text) and update each \`answer\` index."
fi

if ! lint_out=$(npm run lint 2>&1); then
  fail "AGENTS.md §5 gate: \`npm run lint\` is failing. First errors:

$(printf '%s\n' "$lint_out" | grep -m5 -E '^\s+[0-9]+:[0-9]+\s+error' || printf '%s\n' "$lint_out" | tail -15)

Fix it before ending the turn."
fi

# Both gates are green. The third requirement in AGENTS.md §5 — that the changed screen actually
# renders on a simulator — cannot be checked by a hook. A green typecheck is not a rendering screen.
exit 0
