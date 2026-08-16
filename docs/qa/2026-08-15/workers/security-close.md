# Security Close-out — IDOR / Quiz No-Repeat / Sync Integrity — 2026-08-15

Worker: `gokid-api-security` (this pass). Target: dev server `:5062`, pre-existing process (PID 33291,
not started by this worker), confirmed reachable via `GET /api/health` → `200
{"ok":true,"db":"connected","tables":11}`.

Closes F9, F10, F17, F18 from `docs/qa/2026-08-14/workers/api-security.md`, which were `NOT TESTABLE`
because only one Clerk identity existed on the instance and migration `0004` had not been applied. Both
blockers are now resolved: `drizzle.__drizzle_migrations` has 5 rows (0004 applied), `question_impressions`
exists (10 real rows from Jacob K's actual quiz usage, untouched by this pass), and this pass mints
throwaway Clerk identities to obtain real bearer tokens.

## Pre-flight: leftover fixture found and removed

Before starting, `children` had 2 rows instead of the expected 1: alongside Jacob K's real row was
`name="QA P1 Kid", client_id="qa-sec-p1-child"` under the **real** parent's `clerk_user_id` — a leftover
from the previous stalled attempt's script (`.qa-sec-scratch/phase1-idor.mjs`), which had incorrectly used
the real `gakinz101@gmail.com` Clerk user id as its "P1" test identity. It carried 1 `reviews` row and 1
`sessions` row, both scoped to that fake child only. Confirmed Jacob K's own row was untouched (his only
DB activity is the 10 `question_impressions` from real quiz usage; no reviews/sessions existed under his
row). Deleted the leftover row by exact id (`delete from children where client_id = 'qa-sec-p1-child'`),
which cascaded to its review and session (FK `onDelete: cascade`). Confirmed after: `children` back to 1
row (Jacob K only). Transcript: n/a (ad-hoc read/delete, logged inline above; DB state before/after
captured in `93-children-grouped-AFTER.txt` for the final state).

**Design decision — two throwaways, not one + the real account.** The brief's item 1 says "create ONE
throwaway Clerk user … then try to read that child's progress with the OTHER parent's token" — read
literally, "the OTHER parent" could mean the real `gakinz101` account. This pass deliberately did **not**
do that: minting a Clerk session token for the real account (even for a read-only call) creates a real
Clerk-side session under that account, and the previous attempt's mistake (writing a stray row under the
real parent's id) is exactly the failure mode the hard rules warn about. Instead this pass mints **two**
throwaway users (T1, T2 — email pattern `gokid-qa-sec+t{1,2}-<ts>@gakinz.com`) and never touches the real
account for anything, read or write, beyond the read-only cleanup-verification queries the brief requires.
This fully exercises cross-family IDOR (the property under test doesn't depend on which two parents are
used) with zero risk to `gakinz101`/Jacob K/Isaac K.

## Method

- Clerk users created/deleted via the Backend API (`POST/DELETE /v1/users`), same as `clerk-list.mjs` uses
  (`CLERK_SECRET_KEY`, never printed).
- Session tokens minted via `POST /v1/sign_in_tokens` (60s expiry) + Frontend API ticket exchange
  (`POST {frontend-api}/v1/client/sign_ins?_is_native=1`), reused across all calls for that identity within
  a phase (well inside the 60s window) to keep Frontend API sign-in calls to 2 total for the whole run.
- All local API calls hit `http://localhost:5062` directly with `Authorization: Bearer <jwt>`.
- Every request/response pair saved to `docs/qa/2026-08-15/API-TRANSCRIPTS-SEC/<NN>-<name>.txt` (JWTs,
  sign-in tickets, and the Clerk secret key are redacted before writing — see `.qa-sec-scratch/lib.mjs`
  `redact()`).
- DB assertions cross-checked with ad-hoc read queries via `@neondatabase/serverless` against
  `DATABASE_URL` (same driver `db-inspect.mjs` uses), output also saved to numbered transcript files.
- Fixtures created immediately before use, deleted immediately after each phase's assertions were captured
  — nothing was left for an end-of-run cleanup phase.

## Findings

| id | severity | endpoint | status | claim | transcript | fix |
|----|----------|----------|--------|-------|------------|-----|
| SEC-1 | Control works (closes F9) | `GET /api/progress`, `GET /api/quiz` | VERIFIED | Cross-family IDOR: T1's token + T2's `clientId` → `200 {"ok":true,"reviews":[],"sessions":[]}` (empty, not T2's data). T2's token + T1's `clientId` → same, empty. T1's token + T2's `clientId` on `/api/quiz` → `404 {"ok":false,"message":"Unknown child."}` (quiz route requires an *existing* child resolved to the caller's own parent id; a cross-family `clientId` resolves to nothing, so it 404s rather than ever reaching the question pool). No row was created by any of these GETs (DB dump after the phase shows exactly the 4 rows this pass explicitly `POST`ed, no extras). | `33-CROSS-t1-token-reads-t2-child.txt`, `34-CROSS-t2-token-reads-t1-child.txt`, `35-CROSS-t1-token-quiz-t2-child.txt` | None — `childFor`'s `(clerkUserId, clientId)` scoping works as designed. |
| SEC-2 | Control works (closes F10) | `POST /api/progress` | VERIFIED | Unknown/foreign `clientId` cannot be abused to write into another family's row. T1 POSTed `child.clientId` = T2's **known** `clientId`, with `name="HACKED"`, `yearCode="Y6"`, plus a review — got `200 {"ok":true,...}` (no error), but DB inspection shows this created a **new, separate row** (`id=f41f9669…`, `clerk_user_id`=T1) with `name="HACKED"`; T2's real row (`id=67c52a7b…`) was **untouched**, still `name="QA T2 Kid"`, `year_code="Y5"`. Separately, T2 POSTed a brand-new `clientId` that exists nowhere (`qa-sec-unknown-…`) → created a row under T2's own `clerk_user_id` only. Confirms: an authenticated caller can only ever create/reach children under their own verified parent id, and sending a foreign or unknown `clientId` never attaches to, renames, or overwrites another family's row — it silently creates a same-`clientId`-string-but-different-owner row scoped to the caller, which is the correct (if slightly surprising) behaviour given `childFor`'s uniqueness is on the `(clerkUserId, clientId)` pair, not `clientId` alone. | `36-ABUSE-t1-posts-t2-clientId.txt`, `37-UNKNOWN-clientId-creates-under-caller-only.txt`, `41-db-state-after-abuse-and-unknown.txt` | None functionally, but flag as a **product/UX note**, not a security bug: because a `clientId` is not globally unique, a caller who (by bug, not malice) resends another child's locally-generated `clientId` will silently get a *new* server-side child row with that id, rather than an error. No data crosses the auth boundary, but it is worth knowing `clientId` collisions across families are silently tolerated rather than rejected. |
| SEC-3 | Control works | `GET /api/progress`, `GET /api/quiz` | VERIFIED | No `Authorization` header → `401 {"ok":false,"message":"Not signed in."}` on both. Malformed bearer (`not-a-real-jwt`) → same `401`. Matches F6/F7 from the prior pass, re-confirmed live in this run. | `38-no-auth-progress.txt`, `39-malformed-token-progress.txt`, `40-no-auth-quiz.txt` | None. |
| SEC-4 | Control works (closes F17, part 1: no-repeat + reshuffle + oldest-seen fallback) | `GET /api/quiz` | VERIFIED | Used `setId=place-value` (published pool = 11, the largest in this DB) with a fresh throwaway child. Call 1 (`count=4`): 4 fresh ids, `repeated:0`, `poolSize:11`. Call 2 (`count=4`, immediately after): 4 **different** fresh ids, `repeated:0`, zero overlap with call 1. Call 3 (`count=4`, pool now down to 3 fresh): served 3 fresh + **1 forced repeat**, `repeated:1` — and the repeated id (`pvq1`) was one of **call 1's** ids, never one of call 2's, confirming the "oldest-seen" fallback ordering (call 1's impressions were written with an earlier `servedAt` than call 2's, since each call's impressions share one `servedAt` timestamp and call 1 ran first). Options reshuffle confirmed on the repeat: `pvq1`'s options were `["40","400","4,000","4"]` on first serve and `["400","4,000","4","40"]` on the re-serve — same 4 strings, different order, and (per source review) the `answer` index is remapped to match. | `52-quiz-call1-count4.txt`, `53-quiz-call2-count4.txt`, `54-quiz-call3-count4-fallback.txt` | None — matches the documented product rule exactly. |
| SEC-5 | Control works (closes F17, part 2: published-only) | `GET /api/quiz` | VERIFIED | Inserted a temporary `status='draft'` question (`id='qa-sec-draft-probe'`) into `quiz_questions` for `place-value` directly via SQL (not through `/api/admin/generate` — zero OpenRouter calls), then called `GET /api/quiz?setId=place-value&clientId=<fresh-child>&count=20`. Response: `poolSize:11` (not 12 — the draft is excluded from the eligible-pool count) and the 11 served ids never include `qa-sec-draft-probe`. Deleted the probe row immediately after the assertion. | `62-draftprobe-quiz-count20.txt`, `59-draft-probe-inserted.txt` (setup), `63-draft-probe-deleted.txt` (cleanup) | None — `eq(quizQuestions.status, "published")` filter works as documented. |
| SEC-6 | Control works (closes F17, part 3: count clamping) | `GET /api/quiz` | VERIFIED (clamp logic) / partially INFERRED (the `MAX_COUNT=20` ceiling specifically) | `count=999` → served `count:11` (= full pool, since pool 11 < `MAX_COUNT` 20 — the pool, not `MAX_COUNT`, was the binding constraint here), `repeated:11` (pool fully exhausted inside the 12h window at this point in the run, so every serve was a forced repeat — itself further confirmation of the oldest-seen fallback under total exhaustion). `count=0`, `count=-5`, `count=abc` all → served `count:8` (the documented default), never an error and never 0/negative echoed through. **Not directly observed**: a request where `MAX_COUNT=20` itself is the limiting factor rather than pool size — no `study_set` in this DB has a published pool >20 (largest is `place-value` at 11), so `Math.min(countParam, MAX_COUNT)` clamping to exactly 20 (as opposed to a smaller pool) could not be isolated live. Source review (`quiz+api.ts:79`, `const count = Number.isFinite(countParam) && countParam > 0 ? Math.min(countParam, MAX_COUNT) : 8`) shows the clamp is applied unconditionally before the pool/impressions logic runs, so it would apply as coded; confirming the exact number 20 as an observed ceiling would need a set with a published pool larger than 20 (none exists in current content) or a temporary bulk-insert probe, which this pass judged unnecessary given the source is unambiguous and the live behaviour is consistent with it at every point it *could* be exercised. | `55-quiz-count-999.txt`, `56-quiz-count-0.txt`, `57-quiz-count-neg5.txt`, `58-quiz-count-abc.txt` | None. |
| SEC-7 | Control works (closes F18, dedupe) | `POST /api/progress` | VERIFIED | Posted a session batch with `sessions:[{id:"qa-sec-dedupe-session-…", ...}]` twice, byte-identical body, back to back. Both calls returned `200 {"ok":true,"syncedAt":...}` (the replay is not rejected, it's silently absorbed). DB check: `select count(*) from sessions where client_id = 'qa-sec-dedupe-session-…'` → **1**, not 2. Matches the code's `onConflictDoNothing({ target: [sessions.childId, sessions.clientId] })`. | `72-sync-post-session-first.txt`, `73-sync-post-session-replay.txt`, `78-db-state-sync-verify.txt` | None. |
| SEC-8 | Control works (closes F18, last-write-wins by timestamp) | `POST /api/progress` | VERIFIED | **Order A (normal arrival):** card `qa-sec-card-a` posted with `lastReviewedAt=T1` (earlier, box 1, `tricky`) then `lastReviewedAt=T2` (later, box 3, `gotit`). Final DB row: `box:3, last_rating:"gotit"` — later post won, as expected in the ordinary case. **Order B (reversed arrival):** card `qa-sec-card-b` posted with `lastReviewedAt=T4` (**later**, box 3, `gotit`) arriving **first**, then `lastReviewedAt=T3` (**earlier**, box 1, `tricky`) arriving **second**. Final DB row: `box:3, last_rating:"gotit"` — i.e. the **first-arriving** post won because it carried the **later** timestamp; the second POST (arrived after, but chronologically older) did **not** overwrite it. This is the specific claim under test — last-write-wins is by `lastReviewedAt`, not by arrival/network order — and it held in the adversarial (reversed) direction, not just the trivial one. Matches the code's `onConflictDoUpdate(...).setWhere("excluded.last_reviewed_at > reviews.last_reviewed_at")`. | `74-sync-lww-orderA-first.txt`, `75-sync-lww-orderA-second.txt`, `76-sync-lww-orderB-first-is-later-ts.txt`, `77-sync-lww-orderB-second-is-earlier-ts.txt`, `78-db-state-sync-verify.txt` | None. |

## Full transcript index (this pass)

All in `docs/qa/2026-08-15/API-TRANSCRIPTS-SEC/`:

- `00-clerk-list-BEFORE.txt`, `00-db-counts-BEFORE.txt` — pre-existing from the earlier stalled attempt; left as-is, superseded by `92`/`93` below.
- `00-throwaway-users-created.txt` — T1/T2 Clerk user ids (no secrets).
- `31`–`40` — IDOR + abuse + unknown-clientId + auth-edge-case phase (SEC-1, SEC-2, SEC-3).
- `41-db-state-after-abuse-and-unknown.txt` — DB proof for SEC-2.
- `51`–`58` — quiz no-repeat / reshuffle / oldest-seen / count-clamp phase (SEC-4, SEC-6).
- `59`, `62`, `63` — published-only probe, setup/assert/cleanup (SEC-5).
- `71`–`77` — sync dedupe + last-write-wins phase (SEC-7, SEC-8).
- `78-db-state-sync-verify.txt` — DB proof for SEC-7/SEC-8.
- `90-db-cleanup.txt` — deletion of all 7 `qa-sec-*` children rows (cascade to their reviews/sessions/impressions).
- `91-clerk-delete-t1.txt`, `91-clerk-delete-t2.txt` — deletion of both throwaway Clerk users.
- `92-clerk-list-AFTER.txt` — final Clerk state.
- `93-children-grouped-AFTER.txt` — final DB state + explicit Jacob K untouched-check.

Superseded/pre-existing files from the earlier stalled attempt also remain in this directory
(`21`–`25`, from a run against the real `gakinz101` account — see the pre-flight note above for why this
pass didn't reuse that pattern): left in place as a record, not deleted, since they are just transcripts
(no live credentials, redacted) and not fixtures needing cleanup.

## Cleanup proof

```
$ node scripts/clerk-list.mjs
instance: TEST (development)
users: 1
  user_3GfluIuX8y4459zRbDlZg5PR51i  gakinz101@gmail.com   created=2026-07-18  children=2
      └ Jacob K (Y4)
      └ Isaac K (Y4)
```

(`children=2` here is Clerk `unsafeMetadata`, the client-side source of truth for the child list — both
Jacob and Isaac are still there, untouched. The Postgres `children` table only gets a row once a device
actually syncs; Isaac has never synced in this environment, which predates this pass.)

```
$ (grouped children-row count by clerk_user_id)
[
  { "clerk_user_id": "user_3GfluIuX8y4459zRbDlZg5PR51i", "n": 1, "names": ["Jacob K"] }
]
```

Exactly one Postgres `children` row, belonging to the real parent, name/year/avatar unchanged
(`Jacob K`, `Y4`, `client_id="1784371811718"`, `avatar_value="fox"` — identical to pre-flight state).
No throwaway rows, no Clerk users besides the real one.

## What was and wasn't touched

- **Never** minted a token for, wrote to, or read via a token belonging to the real `gakinz101` account.
  All reads/writes used T1/T2 throwaway identities.
- **One direct SQL write** outside the API: the temporary `status='draft'` probe row in `quiz_questions`
  (SEC-5), inserted and deleted within the same short phase, never touched by any other test.
- **One direct SQL delete** of a pre-existing leftover (the `qa-sec-p1-child` row from the previous
  stalled attempt), done before any new fixtures were created.
- `db-reset.mjs` and `clerk-purge.mjs` were not run.
- `POST /api/admin/generate` was not called (this pass didn't touch admin routes at all — those were
  already closed out in the 2026-08-14 pass).

## Summary

All four previously-`NOT TESTABLE` items are now closed as **VERIFIED-SAFE**:

1. **IDOR (F9)** — VERIFIED-SAFE. `childFor`'s `(clerkUserId, clientId)` scoping holds under live
   cross-family GETs on both `/api/progress` and `/api/quiz`.
2. **Unknown/foreign clientId abuse (F10)** — VERIFIED-SAFE. A caller can only ever create/reach rows
   under their own verified parent id; sending a foreign or unknown `clientId` never crosses the boundary.
3. **12h no-repeat quiz rule (F17)** — VERIFIED-SAFE. No-repeat window, reshuffle, oldest-seen fallback,
   published-only filter, and count-default/clamp-floor behaviour all confirmed live. Only the specific
   numeric ceiling `MAX_COUNT=20` (as opposed to pool-size limiting) remains **INFERRED** from source,
   since no content set has a published pool >20 to isolate it against.
4. **Sync integrity (F18)** — VERIFIED-SAFE. Session dedupe by `(childId, clientId)` and last-write-wins
   by `lastReviewedAt` (not arrival order) both confirmed live, including the adversarial reversed-arrival
   case for the latter.
