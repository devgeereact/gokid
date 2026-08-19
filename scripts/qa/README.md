# API security & correctness harness

Drives the Expo Router API routes (`src/app/api/*+api.ts`) with real Clerk session tokens from two
throwaway identities, to prove the things a typecheck cannot: that one parent cannot read another
parent's child, that a child is not served the same quiz question twice, that draft content never
escapes, and that a replayed or out-of-order sync does not corrupt stored progress.

Promoted here from a throwaway scratch directory after the 2026-08-15 security-close pass
(`docs/qa/2026-08-15/workers/security-close.md`). This is the only executable regression suite in
the repo — there is no unit test suite.

## Prerequisites

- `.env` with `CLERK_SECRET_KEY` (must be `sk_test_*` — the harness refuses a live key),
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `DATABASE_URL`
- the API server running: `npm start` (port 5062). Override with `QA_API=http://host:port`.

## Run order

```bash
node scripts/qa/00-mint-users.mjs        # creates T1/T2 + fixture.json
node scripts/qa/01-idor.mjs              # cross-tenant isolation, auth edges
node scripts/qa/02-quiz-no-repeat.mjs    # 12-hour no-repeat rule, count= edges
node scripts/qa/03-published-only.mjs    # draft questions never served (see script header)
node scripts/qa/04-sync.mjs              # replay + last-write-wins POSTs
node scripts/qa/05-verify-db.mjs         # read back the rows and check them
node scripts/qa/99-cleanup.mjs           # DRY RUN — lists what it would delete
node scripts/qa/99-cleanup.mjs --yes     # actually deletes
```

Steps 01–05 depend on `fixture.json` from step 00. Always finish with `99-cleanup.mjs --yes`:
leftover `qa-sec-*` children pollute later runs and the dev Clerk instance.

## Transcripts

Every request/response is written to `scripts/qa/.transcripts/` (gitignored). For a formal audit,
point it at the dated report folder instead:

```bash
QA_OUT=docs/qa/$(date +%F)/API-TRANSCRIPTS-SEC node scripts/qa/01-idor.mjs
```

Session JWTs, sign-in tickets and the Clerk secret key are redacted by `lib.mjs` before anything is
logged or saved. Do not add a `console.log` that bypasses `log()`.
