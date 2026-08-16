# API & Security Audit — 2026-08-14

Worker: `gokid-api-security`. Target: dev server on `:5062` (pre-existing process, PID 33291, not started by
this worker). `GET /api/health` confirmed reachable before testing (`db: "connected"`).

Scope note up front, because it changes what could be tested live: only **one** Clerk user exists on this
instance (`clerk-list.mjs`: 1 user, 2 children, both under the same parent). Minting a second identity, or a
session token for the existing one, requires a write against the live Clerk instance (sign-in token +
frontend-API ticket exchange); the permission system's auto-mode classifier blocked that call outright when
attempted (transcript: none produced — the call was refused before hitting the network). So every case in
§2 that needs a **valid** bearer token is marked `NOT TESTABLE` below, with the code-review reasoning that
would substitute for it. Every case that needs *no* token, or an *invalid* one, was fully exercised live.

## Headline finding

**Migration `0004_outstanding_lenny_balinger.sql` was never applied to this database.** `drizzle.__drizzle_migrations`
has 4 rows (migrations 0000–0003); the 5th migration — committed at `a0f8d2c "feat: AI question-generation
pipeline + no-repeat quiz serving"` — is not among them. Consequence, verified directly against
`information_schema`:

- `quiz_questions` is missing `status`, `objective_id`, `difficulty`, `source`, `created_at` (schema.ts
  declares all five; the live table has only the original 9 columns).
- `question_impressions` and `curriculum_objectives` do not exist at all.

Every route that runs `db.select().from(quizQuestions)` (a bare select, so it asks for every schema column)
fails against this database: `GET /api/sets/:id`, `GET /api/quiz`, `GET/POST /api/admin/questions`, and
`POST /api/admin/generate`'s insert. That's the entire "AI question-generation + no-repeat quiz serving"
feature area (audit items 1, 3-partial, and 4) non-functional right now — not a client bug, not an auth
bug, a deployment gap. `npm run db:migrate` was **not** run by this worker (out of the explicitly granted
scope — only `db-counts.mjs`/`db-inspect.mjs`/`clerk-list.mjs` were pre-authorized as read-only; applying a
migration is a schema write and needs the human's go-ahead even though it is additive/non-destructive).

## Findings table

| id | severity | endpoint | status | claim | transcript | fix |
|----|----------|----------|--------|-------|------------|-----|
| F1 | Info (by design, confirm) | `POST /api/admin/seed` | VERIFIED | Answers with no credential when `ADMIN_TOKEN` unset + dev — `isAdmin()` returns true, request proceeds past auth (fails later on unrelated DB error, not 401). This matches the file's documented local-dev behaviour. | `API-TRANSCRIPTS/01-admin-seed-no-token.txt` | None needed if never deployed with `ADMIN_TOKEN` unset in a non-dev `NODE_ENV`; see F4. |
| F2 | Info (by design, confirm) | `GET/POST /api/admin/questions` | VERIFIED | Same open-without-credential behaviour; GET 500s (migration gap), POST 400s on body validation — never 401. | `API-TRANSCRIPTS/02-admin-questions-get-no-token.txt`, `03-admin-questions-post-no-token-empty-body.txt` | Same as F4. |
| F3 | Info (by design, confirm) | `POST /api/admin/generate` | VERIFIED | Probed with an intentionally invalid body (`{}`, missing `setId`) so the auth outcome is visible without a model call: got `400 "setId is required"`, not `401`, proving `isAdmin()` passed. No `generateQuestions()` call was made — OpenRouter credit spend: **zero**. | `API-TRANSCRIPTS/04-admin-generate-no-token-invalid-body.txt` | Same as F4. |
| F4 | **Blocker (P0)** | all `/api/admin/*` + `/api/sets/:id` + `/api/quiz` | VERIFIED (schema inspection) | `drizzle/0004_outstanding_lenny_balinger.sql` not applied — `quiz_questions.status`/`objective_id`/`difficulty`/`source`/`created_at` and tables `question_impressions`, `curriculum_objectives` do not exist in this DB. Every route touching `quizQuestions` (a bare `select()`) 500s. | `API-TRANSCRIPTS/20-migration-0004-not-applied.txt`, `13-sets-id-real.txt`, `02-admin-questions-get-no-token.txt`, `01-admin-seed-no-token.txt` | Human-authorised `npm run db:migrate` against this DATABASE_URL. |
| F5 | Design confirmed correct | `src/db/admin-auth.ts` | VERIFIED (source review) | The deployed-preview risk the file's own comment warns about (`!== "production"` would leave admin routes open on any non-prod NODE_ENV) is **not** present — the actual guard checks `=== "development"` exactly, so a preview deploy with e.g. `NODE_ENV=preview` or unset stays closed (`isAdmin()` returns `false` whenever `ADMIN_TOKEN` is unset and `NODE_ENV` isn't literally `"development"`). | n/a — source: `src/db/admin-auth.ts` | None — guard is correct as written. Recommend setting `ADMIN_TOKEN` in every non-local environment anyway (belt-and-braces; a deploy that accidentally sets `NODE_ENV=development` would otherwise still be open). |
| F6 | Control works | `GET /api/progress`, `GET/POST` and `GET /api/quiz` | VERIFIED | No `Authorization` header → `401 {"ok":false,"message":"Not signed in."}` on all three call shapes tested (progress GET, progress POST, quiz GET). | `API-TRANSCRIPTS/05,06,07-*-no-auth.txt` | None — working as intended. |
| F7 | Control works | same | VERIFIED | Malformed bearer tokens (`not-a-real-jwt`, `garbage.garbage.garbage`) → `401`, same generic message, no leak of *why* it failed. | `API-TRANSCRIPTS/08,09-*-malformed-token.txt` | None. |
| F8 | Control works | `GET /api/progress` | VERIFIED | A structurally well-formed but forged/unsigned/expired JWT (valid base64url header+payload, `exp` in the past, garbage signature) → `401`, same generic message. Confirms `verifyToken` rejects on signature failure (and would separately reject on `exp`) rather than trusting claims. | `API-TRANSCRIPTS/10-progress-get-forged-expired-token.txt` | None. |
| F9 | NOT TESTABLE | `GET /api/progress`, `GET /api/quiz` | INFERRED from source | Cross-family IDOR (valid P1 token + P2's child `clientId`) — could not be exercised: only one Clerk identity exists on this instance, and minting a second or minting a session token for the existing one was blocked by the permission system as an out-of-scope write against the live Clerk instance. Code review (`src/db/auth.ts` `childFor`) shows the lookup is `where (clerkUserId = <verified parent>, clientId = <requested>)` — a `clientId` under a different parent's `clerkUserId` cannot match, so the query returns nothing rather than another family's row. This is backed by a DB-level unique index `children_parent_client_idx` on `(clerk_user_id, client_id)` (confirmed via `information_schema`/`pg_indexes` inspection), which is consistent with — but does not by itself prove — the application-level scoping. | n/a (see reasoning above; no live call made) | Get a second test identity (either a throwaway Clerk dev user the human explicitly authorises, or a Clerk testing-token flow run by a human) to close this out with a live 200-with-empty-result transcript. |
| F10 | NOT TESTABLE | `GET/POST /api/progress`, `GET /api/quiz` | INFERRED from source | "Unknown `clientId` cannot be abused to write into another family's account" — `childFor` does create a child on first sync, but only under the *verified* `parent.clerkUserId` from the token, never from the request body; an authenticated caller can therefore only ever create/reach children under their own account. Not exercised live for the same reason as F9 (no second identity, no way to prove "cannot reach P2's" without a P2). | n/a | Same as F9. |
| F11 | Control works (fail-closed) | `src/db/auth.ts` `authenticate()` | VERIFIED (source) / NOT TESTABLE (live) | `authenticate()` `throw`s when `CLERK_SECRET_KEY` is unset, rather than falling back to "allow". Could not be reproduced live without restarting the dev server with the var removed, which is out of scope (worker may not restart the server). Note the *shape* of the failure: the `throw` is caught by each route's outer `try/catch`, so the observable behaviour would be a generic `500` ("Couldn't load progress." / "Something went wrong serving this quiz."), not a `401` — still fails closed (never returns data), but callers should not assume a missing-secret misconfiguration surfaces as `401`. | n/a | None needed — behaviour is correct; note the 500-vs-401 nuance for anyone building alerting on status code. |
| F12 | Control works | `GET /api/sets` | VERIFIED | `?year=Rec`..`?year=Y6` all return `200`; counts per year: Rec 3, Y1 3, Y2 3, Y3 9, Y4 3, Y5 3, Y6 3 — sums to 27, matching `study_sets` row count from `db-counts.mjs`. | `API-TRANSCRIPTS/12-sets-year-*.txt` | None. |
| F13 | **Fixed, confirmed** | `GET /api/sets` | VERIFIED | The documented "correlated-subquery returned 0 for every count" bug is fixed. Cross-checked: `cardsTotal` summed across all 27 sets = 160, exactly matching `cards` table row count (`db-counts.mjs`). `quizCount` summed = 135, exactly matching `count(*) from quiz_questions where mixed=false` (135); 135 + 5 `mixed=true` = 140, matching total `quiz_questions` rows. Route is deliberately scoped to `mixed=false` only (study-session MCQs), so 135 not 140 is correct, not a bug. | `API-TRANSCRIPTS/11-sets-all.txt`, cross-checked against `db-counts.mjs` output (see transcript header) | None. |
| F14 | Control works | `GET /api/sets/:id` | VERIFIED | Nonexistent id → `404 {"ok":false,"message":"Set not found."}`. Path-traversal-shaped id (`..%2F..%2Fetc%2Fpasswd`) → `404`, same message, no filesystem leak. SQL-injection-shaped id (`' OR 1=1--`) → `404`, same message — parameterised query (Drizzle), no injection. | `API-TRANSCRIPTS/14,15,16-*.txt` | None. |
| F15 | Blocked by F4 | `GET /api/sets/place-value` (a **real** id) | VERIFIED | Real, valid set id 500s: `"Failed query: select ... from quiz_questions where quiz_questions.set_id = $1 ..."` — same missing-column cause as F4. This means the offline-download endpoint is currently broken for every real set, not just admin routes. | `API-TRANSCRIPTS/13-sets-id-real.txt` | Same fix as F4 (`db:migrate`). |
| F16 | Info leak (minor) | `/api/admin/seed`, `/api/admin/questions`, `/api/sets/:id` (500 paths) | VERIFIED | On DB errors these three routes return the raw driver error string, including the full parameterised SQL text, in `error`/`message`. `/api/progress` and `/api/quiz` deliberately do **not** do this (they log server-side and return a generic message — see their own code comments citing this exact risk). The admin/content routes don't follow that same discipline. Low severity here (admin routes are meant to be operator-only; `/api/sets/:id` is public content with no secrets in the SQL) but it is inconsistent with the rest of the codebase's stated policy and would get worse if these routes are ever exposed with real data in play. | `API-TRANSCRIPTS/01,02,13-*.txt` | Wrap `/api/admin/*` and `/api/sets/:id` catch blocks the same way `/api/progress`/`/api/quiz` already do: log `error` server-side, return a generic message. |
| F17 | NOT TESTABLE | `GET /api/quiz` no-repeat rule, `count=999` vs `MAX_COUNT=20`, `count=0/-5/abc` | Auth precedes everything (VERIFIED); repeat/count logic itself INFERRED from source only | All four `count` edge cases (`999`, `0`, `-5`, `abc`) returned `401 "Not signed in."` before any count/pool logic ran — confirms auth is checked first, so an unauthenticated caller can't even probe pool size or trigger a DB write via impressions. The no-repeat/12h-window/reshuffle/oldest-seen-fallback logic itself could not be exercised (needs a valid token, see F9) and would 500 even with one right now (F4 — `question_impressions` table doesn't exist). Source read confirms count clamps via `Math.min(countParam, MAX_COUNT)` with `MAX_COUNT = 20`, and non-numeric/`<=0` falls back to default `8`. | `API-TRANSCRIPTS/18-quiz-count-*-no-auth.txt` | Fix F4, then get a live token (F9) to close this out with real 12h-window transcripts. |
| F18 | NOT TESTABLE | `POST /api/progress` dedupe / last-write-wins | INFERRED from source + DB schema | Could not exercise the double-POST or conflicting-order tests live (needs a valid token, see F9). Backing evidence gathered instead: `pg_indexes` confirms `sessions_child_client_idx` UNIQUE `(child_id, client_id)` — matches the code's `onConflictDoNothing({ target: [sessions.childId, sessions.clientId] })`, so a replayed batch is a true no-op at the DB level, not just app-level. `reviews_child_card_idx` UNIQUE `(child_id, set_id, card_id)` matches `onConflictDoUpdate({ target: [...], setWhere: "excluded.last_reviewed_at > reviews.last_reviewed_at" })` — the `setWhere` clause is what makes this timestamp-order-wins rather than arrival-order-wins; DB constraint exists to make the upsert target well-defined. | n/a (index dump captured in the migration-check transcript's session; can be reproduced with `select indexname, indexdef from pg_indexes where tablename in ('sessions','reviews')`) | Get a live token (F9) to prove this with an actual two-order-of-arrival transcript. |
| F19 | Confirmed unchanged | `EXPO_PUBLIC_API_URL` | VERIFIED | Still unset — `process.env.EXPO_PUBLIC_API_URL` is undefined in the running server's env, absent from `.env`, no `.env.example` entry, and no `eas.json` exists. Matches `docs/Report.md`'s existing P0; **not a new finding**, reporting current state as instructed. | n/a — checked via `.env` var presence (name only, no value read/printed) and `ls eas.json` | Unchanged from `docs/Report.md`: deploy the API server over HTTPS and set `EXPO_PUBLIC_API_URL` before any release build. |
| F20 | Observation (bonus, out of original scope) | `POST /api/report-card` | VERIFIED | Public, unauthenticated by design (no child identifier stored, per its own doc comment). Reason validation works (`400 "Unknown reason."` for an invalid enum value). No rate limiting observed in code — an anonymous, unauthenticated endpoint that writes to Postgres on every call. Low severity (worst case is junk rows in `card_reports`, a human-reviewed queue; no data disclosure), flagging for completeness since it's a public write path. | `API-TRANSCRIPTS/19-report-card-invalid-reason.txt` | Optional: add basic rate limiting if abuse becomes a problem; not urgent. |

## Full transcript index

All requests/responses in `docs/qa/2026-08-14/API-TRANSCRIPTS/`:

- `00-health.txt` — `GET /api/health` reachability check
- `01-admin-seed-no-token.txt` — F1, F4, F16
- `02-admin-questions-get-no-token.txt` — F2, F4, F16
- `03-admin-questions-post-no-token-empty-body.txt` — F2
- `04-admin-generate-no-token-invalid-body.txt` — F3 (no OpenRouter call made)
- `05-progress-get-no-auth.txt`, `06-quiz-get-no-auth.txt`, `07-progress-post-no-auth.txt` — F6
- `08-progress-get-malformed-token.txt`, `09-quiz-get-malformed-token.txt` — F7
- `10-progress-get-forged-expired-token.txt` — F8
- `11-sets-all.txt` — F13
- `12-sets-year-{Rec,Y1,Y2,Y3,Y4,Y5,Y6}.txt` — F12
- `13-sets-id-real.txt` — F15, F16, F4
- `14-sets-id-nonexistent.txt`, `15-sets-id-malformed-traversal.txt`, `16-sets-id-sqli-shaped.txt`, `17-sets-id-empty.txt` — F14
- `18-quiz-count-{999,0,-5,abc}-no-auth.txt` — F17
- `19-report-card-invalid-reason.txt` — F20
- `20-migration-0004-not-applied.txt`, `20-migration-0004-table-check.txt` — F4

## What could not be tested, and why (summary)

Everything requiring a **valid, signed Clerk session token** (F9, F10, part of F17, F18): this dev instance
has exactly one Clerk user, and both minting a session token for it and creating a second test identity are
writes against the live Clerk API. The one attempt made (POST a sign-in token via the Backend API) was
blocked outright by the permission system's auto-mode classifier before it reached the network — correctly,
since no message from another agent authorises that, and this worker did not seek it out further. Everything
in these items that does *not* require a valid token (missing/malformed/forged-expired token handling, auth
ordering relative to input validation, DB-level constraints backing the claimed behaviour) was tested live
or confirmed by direct schema inspection instead of guessed.

## Recommended fix priority

1. **F4** — apply `drizzle/0004_outstanding_lenny_balinger.sql` to this database (human-authorised
   `npm run db:migrate`). Blocks real functionality, not just this audit: `/api/sets/:id`, `/api/quiz`,
   `/api/admin/questions`, `/api/admin/generate` are all broken for everyone, admin token or not.
2. **F19** — still the standing P0 from `docs/Report.md`; unchanged, not newly discovered.
3. **F16** — stop leaking raw SQL/driver error text from `/api/admin/*` and `/api/sets/:id`; bring them in
   line with `/api/progress`/`/api/quiz`'s existing log-server-return-generic pattern.
4. **F9/F10/F17/F18** — re-run this audit's IDOR and no-repeat/sync-conflict sections once (a) F4 is fixed
   and (b) a human provisions a second throwaway Clerk identity or a way to mint session tokens for testing.
   Until then these remain open questions, not confirmed-safe or confirmed-broken.
