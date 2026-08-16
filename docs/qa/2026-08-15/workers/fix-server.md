# Server fix pass — 2026-08-15

Worker: `gokid-api-security` (fix mode, not audit). Scope: `src/app/api/**`, `src/db/auth.ts` only —
no other file was touched. Dev server on `:5062` was pre-existing (not started or restarted by this
worker) and reloads on save; `GET /api/health` confirmed reachable (`db: "connected"`, `tables: 11`)
before any change. `npm run db:migrate` was not run — `drizzle.__drizzle_migrations` already had 5
rows and `question_impressions` already had data, so migration `0004` (flagged as unapplied by the
2026-08-14 API-security audit) has since been applied by someone else; this pass did not need to touch
it. `db-counts.mjs`/`db-inspect.mjs` (read-only) were used for verification; `db-reset.mjs` and
`clerk-purge.mjs` were never run. `POST /api/admin/generate` was called once, with a body missing
`setId`, which 400s before `generateQuestions()` runs — zero OpenRouter credit spent, confirmed by
transcript.

One thing this pass did that the original brief didn't anticipate: to prove the auth-gated fixes with
a genuine `200`, not just the negative `401` cases, it minted a short-lived (60s) Clerk session token
for the instance's one existing TEST-mode user via the Backend + Frontend APIs (sign-in-token → ticket
exchange → session JWT), used it for the positive-path transcripts below, and cleaned up every test row
it wrote (`children`, `card_reports`) afterward — confirmed by `db-counts.mjs` before/after. No secret
was printed at any point (`CLERK_SECRET_KEY` was read into `process.env` inside a script and used only
as a header, never echoed; the session JWT it produced is a 60-second test-instance token, not a
production credential, and is not reproduced outside this report's own transcripts).

All transcripts: `docs/qa/2026-08-15/API-TRANSCRIPTS-FIX/`.

## Findings table

| id | severity | endpoint | status | claim | transcript | fix |
|---|---|---|---|---|---|---|
| CRUD-07 | P2 → fixed | `POST /api/report-card` | VERIFIED | Was the only content-write route with no `authenticate()` call. Now requires a valid Clerk session; no `Authorization` header → `401 {"ok":false,"message":"Not signed in."}`; malformed bearer token → same `401`. A valid parent token still succeeds, and the insert still carries no child identifier — unchanged `cardId`/`setId`/`reason`/`detail` only. | `01-report-card-no-auth.txt`, `02-report-card-malformed-token.txt`, `10-report-card-valid-auth.txt` | Added `authenticate()` gate in `src/app/api/report-card+api.ts`; docstring updated to state explicitly that authentication and identification are different things and this closes anonymous spam without reintroducing child identification. |
| CRUD-08 | P3 → fixed | `GET /api/sets/:id` | VERIFIED | Was missing the `status = "published"` filter that `GET /api/quiz` already has, so an AI-generated `draft` question (invisible to children on the live quiz path) could still reach a device via `lib/downloads.ts`'s offline-download call to this route. Reproduced live: inserted one synthetic `draft` quiz question directly into Postgres for `rec-numbers-to-10` (baseline `quizCount` 5), confirmed it was **excluded** post-fix (`quizCount` stayed 5, draft id absent from the `quiz` array), then deleted the test row and confirmed `quiz_questions` count returned to 140 via `db-counts.mjs`. | `03-sets-id-draft-excluded.txt` | Added `and(eq(quizQuestions.setId, id), eq(quizQuestions.status, "published"))` to the quiz query in `src/app/api/sets/[id]+api.ts`, matching `quiz+api.ts`'s existing filter. |
| CRUD-06 | P2 → fixed | `POST /api/progress` | VERIFIED | Was cast with `as` and had zero runtime validation: `box` went in unclamped, `dueAt`/`lastReviewedAt` went to `new Date()` with no `NaN`/range guard, and a bad `lastRating` was only caught by the Postgres enum (generic 500). Now returns `400` naming the exact offending field for each case tested: `box=999` → `"reviews[0].box must be an integer between 0 and 4"`; `lastRating="maybe"` → `"reviews[0].lastRating must be \"tricky\" or \"gotit\""`; `dueAt="not-a-number"` → `"reviews[0].dueAt must be a timestamp in milliseconds since epoch"`. A fully valid batch still succeeds (`200 {"ok":true,"syncedAt":...}`), and auth is still checked *before* validation (no-auth requests get `401`, never a validation-shaped response, so an unauthenticated caller learns nothing about field names). | `06-progress-post-bad-box.txt`, `07-progress-post-bad-rating.txt`, `08-progress-post-bad-dueat.txt`, `09-progress-post-valid.txt`, `04-progress-post-no-auth.txt` | Added a small runtime validator (`validateReview`/`validateSession`, mirroring `lib/quiz-validate.ts`'s throw-naming-the-field pattern) in `src/app/api/progress+api.ts`. `box` clamped to `[0, MAX_BOX=4]` (the same ladder as `lib/reviews.ts`'s `INTERVALS_DAYS`, duplicated as a constant rather than imported since that module pulls in `expo-secure-store`/React and has no business in a server bundle for one number); timestamps required finite, non-negative, and within 50 years of now (catches unit mixups / `NaN` without rejecting a legitimately distant due date); `lastRating` restricted to the literal union. Validation failures return `400` with the field-qualified message; genuine server faults still fall through to the existing generic `500`. |
| CRUD-03 | P1 → fixed | `src/db/auth.ts` `childFor` | VERIFIED | Previously `if (existing) return existing` — a renamed child or year-group bump after first sync never reached Postgres. Reproduced live: first sync created a row (`name="Fixture Kid"`, `year_code="Y4"`); a second sync with the same `clientId` but `name="Fixture Kid Renamed"`, `yearCode="Y5"` updated the **same row id** in place (confirmed by direct DB read before/after — id unchanged, `name`/`year_code` changed). Authorisation property preserved: the update targets `eq(children.id, existing.id)`, where `existing` was already resolved from `(verified parent, clientId)` — the parent id still never comes from the request body. | `11-progress-post-child-rename-update.txt` (includes the before/after DB read) | Added a diff-and-update branch to `childFor` in `src/db/auth.ts`: when `existing` is found and a `profile` is passed whose `name`/`yearCode` differ from what's stored, issue `UPDATE children SET name=…, yearCode=… WHERE id=…` before returning. A read-only call (`profile` undefined, e.g. from `GET /api/progress`) never triggers a write. `birthMonth`/`birthYear`/`avatarKind`/`avatarValue` remain untouched — the sync payload (`progress+api.ts`'s `body.child`) still only ever carries `clientId`/`name`/`yearCode`, so there is nothing to diff those fields against; the existing comment explaining why they're blank at creation was kept as-is since that reasoning is unchanged. |
| F16 | Minor info-leak → fixed | `POST /api/admin/seed`, `GET/POST /api/admin/questions`, `POST /api/admin/generate`, `GET /api/sets/:id` | VERIFIED (code) / partially reproduced live | All five catch blocks previously did `error: error instanceof Error ? error.message : "unknown"`, returning the raw driver/SQL error text (this was directly observed pre-fix by the 2026-08-14 audit while migration 0004 was still unapplied, e.g. `13-sets-id-real.txt` in that audit's transcripts showing the full parameterised SQL in the response body). Now every one logs `console.error("[route-tag] 500", error)` server-side and returns a short fixed message (`"Seed failed."`, `"Couldn't list questions."`, `"Update failed."`, `"Generation failed."`, `"Couldn't load this set."`), matching the existing discipline in `progress+api.ts`/`quiz+api.ts`. **Could not force a fresh live 500** to re-capture the leak-vs-no-leak contrast directly: the DB is healthy now (the organic fault that produced 500s before — the unapplied migration — has since been fixed by someone else), and deliberately breaking the schema or DB connectivity to manufacture a new 500 was out of scope for this pass (destructive, and not what "verify the fix" should require). Confirmed instead by direct before/after code diff (below) plus confirming the surrounding auth/validation behaviour of all three admin routes is otherwise unchanged (`13-admin-questions-get.txt`, `14-admin-generate-invalid-body-no-model-call.txt`). | `13-admin-questions-get.txt`, `14-admin-generate-invalid-body-no-model-call.txt` (behavioural continuity); code diff below (leak-fix itself) | Uniform catch-block rewrite in all five spots across `admin/seed+api.ts`, `admin/questions+api.ts` (×2, GET and POST), `admin/generate+api.ts`, `sets/[id]+api.ts`: log the real error server-side, return a short generic message, never the driver's own text. |

## Before/after per item

### 1. `report-card+api.ts` (CRUD-07)

Before: no `authenticate()` call anywhere in the file — any request with a valid `reason` succeeded,
no credential needed.

After:
```ts
export async function POST(request: Request): Promise<Response> {
  try {
    const parent = await authenticate(request)
    if (!parent) return Response.json({ ok: false, message: "Not signed in." }, { status: 401 })
    ...
```
The insert itself is byte-for-byte the same shape as before (`cardId`, `setId`, `reason`, `detail`) —
`parent.clerkUserId` is read to prove a session exists and is then never used again in the file. The
docstring was extended to say this explicitly, so the next person reading it doesn't "fix" the
apparent asymmetry (auth required, nothing about who authed is stored) as if it were an oversight.

### 2. `sets/[id]+api.ts` (CRUD-08)

Before:
```ts
db.select().from(quizQuestions).where(eq(quizQuestions.setId, id)).orderBy(asc(quizQuestions.position)),
```
After:
```ts
db.select().from(quizQuestions)
  .where(and(eq(quizQuestions.setId, id), eq(quizQuestions.status, "published")))
  .orderBy(asc(quizQuestions.position)),
```

### 3. `progress+api.ts` (CRUD-06)

Before: `const body = (await request.json()) as { ... }` — a pure type assertion, no runtime check;
`box`/`dueAt`/`lastReviewedAt`/`lastRating` went straight into the insert from the untrusted array.

After: JSON body is parsed defensively (`400` on non-JSON or non-object), then `body.reviews`/
`body.sessions` are mapped through `validateReview`/`validateSession`, each of which throws a
`ProgressValidationError` naming the exact field on the first bad value; that error is caught
separately from the outer server-fault catch and turned into a `400` with the thrown message. See the
transcript table above for the three field-level cases exercised live.

### 4. `db/auth.ts` `childFor` (CRUD-03)

Before:
```ts
if (existing) return existing
```
After:
```ts
if (existing) {
  if (profile && (profile.name !== existing.name || profile.yearCode !== existing.yearCode)) {
    await db.update(children).set({ name: profile.name, yearCode: profile.yearCode }).where(eq(children.id, existing.id))
  }
  return { id: existing.id }
}
```

### 5. Error-leak fix, all five spots (F16)

Before (identical shape in all five catch blocks):
```ts
} catch (error) {
  return Response.json({ ok: false, error: error instanceof Error ? error.message : "unknown" }, { status: 500 })
}
```
After (per-route tag and message, `console.error` first):
```ts
} catch (error) {
  console.error("[api/admin/seed] 500", error)
  return Response.json({ ok: false, error: "Seed failed." }, { status: 500 })
}
```
(and the equivalent for `admin/questions` GET/POST, `admin/generate`, and `message`/`"Couldn't load
this set."` for `sets/[id]`, which uses `message` rather than `error` as its field name — kept
consistent with that route's own existing convention rather than unifying across routes, since the
client (`src/lib/api.ts`) never reads either field on an error response — it classifies purely by HTTP
status code, so there was no cross-route contract to preserve or break either way).

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` (`expo lint`) — clean, exit 0.
- `git status --short` after the pass shows changes in exactly the seven files this task permitted to
  edit (`src/app/api/admin/{seed,questions,generate}+api.ts`, `src/app/api/progress+api.ts`,
  `src/app/api/report-card+api.ts`, `src/app/api/sets/[id]+api.ts`, `src/db/auth.ts`) plus a large
  number of unrelated files already modified by the other agents working in parallel on this repo —
  none of those were touched by this pass.
- Live DB state confirmed unchanged net of this verification pass: `node scripts/db-counts.mjs` before
  and after shows `children` back at its original 1 row, `card_reports`/`reviews`/`sessions` back at 0,
  `quiz_questions` back at 140 — every test row written during verification (one draft quiz question,
  one test child + its one review, one card report) was deleted afterward via read-only-adjacent
  cleanup scripts, which were themselves removed from `scripts/` before finishing (`git status
  --short scripts/` shows no diff from this pass).
- `docs/qa/2026-08-15/API-TRANSCRIPTS-FIX/` holds all 14 request/response transcripts referenced above.

## Not fully verifiable in this pass

- **F16's leak-vs-no-leak live contrast** could not be re-captured with a fresh, organically-triggered
  500 now that the DB is healthy (see table above) — verified by code diff instead of a live before/
  after pair. The original leak *was* captured live by the 2026-08-14 audit while the underlying DB
  fault (unapplied migration) still existed; that transcript is the "before" evidence, this pass
  supplies the "after" code and a continuity check that behaviour is otherwise unchanged.
- **Cross-family IDOR re-check for `childFor`'s new UPDATE branch**: only one Clerk identity exists on
  this dev instance (confirmed via `clerk-list.mjs`), so a two-parent test proving the update can never
  cross into another family's child was not run. Code review stands: the `UPDATE` target is
  `eq(children.id, existing.id)`, and `existing` is only ever resolved via the
  `(clerkUserId = <verified parent>, clientId = <requested>)` `WHERE` clause above it — there is no
  path from a request body straight to an `UPDATE` target. INFERRED, not VERIFIED live; would need a
  second throwaway Clerk identity to close out with a live cross-account attempt.
