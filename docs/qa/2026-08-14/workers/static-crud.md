# qa-static — CRUD matrix & data integrity (Tier 0 static audit, 2026-08-14)

Scope: concern #2 (CRUD matrix + seed-data classification), per the orchestrator's brief. Read-only
static analysis of `src/db/schema.ts`, every `src/app/api/*+api.ts` route, and the screens that call
them. No `xcrun`, no `curl`, no `scripts/db-*`, no simulator, no live DB query was run anywhere in
this audit — every claim below is either **VERIFIED** (read directly in code) or **INFERRED**
(reasoning beyond the code, with the runtime check that would confirm it stated explicitly) or
**NOT TESTABLE** (states the missing capability). The full entity-by-entity matrix is in
`docs/qa/2026-08-14/CRUD.md`; this file is the reasoning and the findings behind it.

## Findings

| id | severity | area | file:line | status | claim | evidence | recommended fix |
|---|---|---|---|---|---|---|---|
| CRUD-01 | P0 | data integrity / privacy | `src/lib/children.ts:140-152`, `src/db/auth.ts:64-94` | VERIFIED | Deleting a child ("Delete child" in `add-child.tsx:302-320`) only removes the entry from Clerk `unsafeMetadata`. The Postgres `children` row created lazily by `childFor`, plus every `reviews`/`sessions`/`certificates`/`question_impressions` row `ON DELETE CASCADE`-linked to it, is never touched — there is no `DELETE` anywhere in the codebase (`grep -rn "db.delete" src` returns nothing). The row becomes permanently orphaned: unreachable from any screen (nothing reads the DB `children` table directly), un-deletable (no delete API), and never reattaches to a new child, because `useChildren().addChild` mints a fresh id (`` `${Date.now()}` ``) every time — a client-id collision that would cause silent reattachment is a same-millisecond double-add and does not happen in practice. | `lib/children.ts:140-152` (`removeChild` body — one `user.update` call, no server request); no `db.delete` call exists in `src/app/api/**` or `src/db/**`; `db/auth.ts:64-94` (`childFor` — insert-only, no delete/update-existing branch) | Add `DELETE /api/children/:clientId` that cascades server-side, call it from `removeChild` before (or after, on success) the Clerk update, and clear that child's local SecureStore entries (`reviews.ts`, `bookmarks.ts` are keyed by `childId` — see CRUD-02) in the same action. |
| CRUD-02 | P0 | design honesty / GDPR | `src/app/(app)/(parent)/delete-account.tsx:44-69,121-136`, `src/app/(app)/(parent)/data-export.tsx:22-25,56-64` | VERIFIED | `delete-account.tsx` tells the parent "Deleting your account erases everything below, immediately and permanently," listing "Child profiles," "All learning history," and "Certificates and achievements." Its actual implementation deletes the Clerk user and three **on-device** stores (`clearAllProgress`, `clearAllBookmarks`, `clearAllDownloads`). It never calls any API to delete the `children`/`reviews`/`sessions`/`certificates`/`question_impressions` rows in Postgres — and per CRUD-01, no such API exists. Separately, `data-export.tsx`'s own docstring states the payload is assembled from "the two places data actually lives — Clerk `unsafeMetadata` … [and] the on-device spaced-repetition store," and warns "if a third store is ever added, it has to be added here too, or this screen quietly starts lying about being complete." A third store (Postgres, reached via manual `/sync`) now exists and is not in the export. Both screens predate `db/schema.ts` + `lib/sync.ts` and were not revisited when server sync landed. | `delete-account.tsx:56` comment "It removes the account, the children in unsafeMetadata, and the session with it" — no API call follows; `data-export.tsx:22-25` docstring, `:56-64` payload assembly (Clerk + `useAllProgress()` only, no `fetch`/`apiGet` call) | Either (a) call the same server-side delete this needs anyway (CRUD-01) from `delete-account.tsx` before wiping local stores, and add a `GET /api/export?child=` (or reuse `/api/progress`) call to `data-export.tsx`; or (b) if sync genuinely never ran for this parent, the claims happen to be true by accident — but the code cannot know that, so the current unconditional copy is a claim it cannot verify. Article 17/20 compliance should not depend on whether a parent happened to visit `/sync`. |
| CRUD-03 | P1 | data integrity | `src/db/auth.ts:64-94` | VERIFIED | `childFor` never updates an existing `children` row. If a parent edits a child's name or year group after the first sync (`updateChild` in `lib/children.ts:126-138`, which only touches Clerk), the Postgres row keeps the name/year it had at first-sync time forever. `birthMonth`, `birthYear`, `avatarKind`, `avatarValue` are hardcoded to `""`, `""`, `"preset"`, `"fox"` at creation (`db/auth.ts:86-90`) and never populated from what the parent actually picked, because `progress+api.ts`'s `IncomingSession`/child payload only ever sends `clientId`/`name`/`yearCode`. | `db/auth.ts:71-77` (`if (existing) return existing` — no diff/update against the passed `profile`); `db/auth.ts:86-90` (birth/avatar fields hardcoded) | Add an `UPDATE children SET name=…, yearCode=… WHERE id=…` branch in `childFor` when the row exists and the passed profile differs, or push name/year/avatar/birth fields on every `/sync`, not just first-sync. |
| CRUD-04 | P1 | seed data / architecture | `src/db/schema.ts:290-320` | VERIFIED | `certificates` and `subscriptions` are full tables with FKs, unique indexes, and doc comments describing exactly what should write them — and neither has a single write path anywhere in the codebase (`grep -rn "db.insert(certificates)\|db.insert(subscriptions)"` → no matches). No `/api/webhooks/revenuecat` route exists despite being planned (`PLAN.md` Phase 7). This is **DEMO-STANDIN, correctly labelled**: `lib/rewards.ts` and `lib/subscription.ts` both state outright they are stand-ins ("Demo certificates… the single seam to swap," "There is no billing SDK in this app… Hardcoded to `free` because that is what is true"), and the screens that consume them (`certificate/[id].tsx`, `subscription.tsx`, `settings.tsx`) read via the seam, not the data, so the swap cost when a real API/RevenueCat webhook lands is a `lib/*` change only, not a screen rewrite. The user-visible consequence today: every certificate ever shown is either the one hand-authored `place-value` certificate or a generically derived one, with "Accuracy 90%" hardcoded on both (`rewards.ts:76,103` — not derived from the child's real quiz score, which the `sessions.score`/`scoreTotal` columns exist to hold) — a fabricated-looking stat on an artefact the child prints. | `lib/rewards.ts:58-83` ("Demo certificates"), `:76` `{ label: "Accuracy", value: "90%" }` hardcoded for every set; `lib/subscription.ts:6-9,43-50` | Classified DEMO-STANDIN, not a defect to fix urgently — but the hardcoded "90%" accuracy stat is worth flagging separately: it should be derived from the child's actual `sessions` record for that set once certificates are wired to the DB, not shipped as a literal in the meantime, since it currently reads as a real, if suspiciously round, statistic. |
| CRUD-05 | P2 | seed data / architecture | `src/db/schema.ts:58-77`, `src/app/api/admin/generate+api.ts:55-66` | VERIFIED | `curriculum_objectives` has no write path anywhere — not even the seed route inserts into it (`admin/seed+api.ts` only inserts `studySets`/`cards`/`quizQuestions`). The only code that reads it is `admin/generate+api.ts`'s optional `objectiveId` branch, which does a lookup-by-id and 404s if not found. Since no row can ever exist via any code path, that branch is permanently dead in practice — generation always falls through to the `set.topic + set.description` fallback. | `admin/seed+api.ts:20-105` (no `curriculumObjectives` in the insert list); `admin/generate+api.ts:55-66` (the only reference to the table) | SEED-GAP (unintended) relative to the table's own doc comment, which describes it as "the free, public part of the curriculum and the prompt spine for AI generation" — implying it should be populated. Either write a seed for it (from the same UK NC data `lib/study.ts` topics are presumably drawn from) or remove the dead `objectiveId` branch and the FK until it is. |
| CRUD-06 | P2 | validation | `src/app/api/progress+api.ts:116-134` | VERIFIED | The `POST /api/progress` body is cast (`as { … }`) with zero runtime validation: `box` is inserted as whatever number arrives (never clamped to the `[0, MAX_BOX]` range the client's own `schedule()` enforces), `dueAt`/`lastReviewedAt` are passed straight to `new Date(r.dueAt)` with no `NaN`/range guard, and `lastRating` is trusted to be `"tricky"\|"gotit"` at the type level only — an actual bad value is caught by the Postgres enum constraint, which throws and is swallowed into the same generic "Couldn't sync progress" 500 as any other server error, not a distinguishable 400. | `progress+api.ts:29-36` (types, not runtime checks), `:132-161` (mapped straight into the insert) | Add a small runtime validator (mirroring `lib/quiz-validate.ts`'s pattern for the AI path) before the insert, and return 400 with the specific field on failure rather than a blanket 500. |
| CRUD-07 | P2 | authorisation | `src/app/api/report-card+api.ts:22-55` | VERIFIED | `report-card+api.ts` is the only content-write route in the API with no `authenticate()` call and no `isAdmin()` gate — contrast `progress+api.ts` and `quiz+api.ts`, which both require a valid Clerk bearer token even though the underlying content (a quiz question) is otherwise public. `cardId`/`setId` are presence-checked but not verified against real rows (both are plain `text()` columns with no FK to `cards`/`study_sets`), so the table can be filled with reports against fabricated ids by anyone who can reach the route, with no rate limit. | `report-card+api.ts` (whole file — no `authenticate` import, no admin check) vs. `progress+api.ts:65-66`/`quiz+api.ts:72-73` (both call `authenticate`) | This may be a deliberate choice (the docstring's stated reasoning is "no child identifier… knowing who reported adds nothing"), but authentication and identification are different things — requiring *a* valid Clerk session (any signed-in parent's token, still logging nothing about which child) would close the anonymous-spam surface without reintroducing the child-identification the design explicitly avoids. Confirm this was a deliberate trade-off, not an oversight, before shipping. |
| CRUD-08 | P3 | authorisation / content leakage | `src/app/api/sets/[id]+api.ts:18-45` | VERIFIED | `GET /api/sets/:id` returns **every** `quizQuestions` row for a set regardless of `status`, unlike `GET /api/quiz`, which explicitly filters `eq(quizQuestions.status, "published")`. `admin/generate+api.ts` writes AI-generated questions as `status: "draft"` specifically so "nothing generated is trusted until reviewed" and "invisible to children until a human publishes them" (its own docstring). Since `downloads.ts` calls this exact endpoint to build an offline download, an unreviewed draft question — one that failed nothing except not yet being looked at by a human — can reach a child's device via the download path even though the live no-repeat quiz path correctly excludes it. | `sets/[id]+api.ts:27` (`db.select().from(quizQuestions).where(eq(quizQuestions.setId, id))` — no status filter) vs. `quiz+api.ts:94` (`and(eq(setId, setId), eq(status, "published"))`) | Add the same `eq(quizQuestions.status, "published")` filter to `sets/[id]+api.ts`'s quiz query. This is currently only exploitable if the admin has actually generated drafts for a set that also has an offline download built from it — see CRUD-09 for whether that has happened at all in the current environment (not testable statically). |
| CRUD-09 | P3 (informational) | operational dependency | `src/app/api/admin/seed+api.ts`, `src/lib/api.ts:269-274` | NOT TESTABLE (requires `curl`/DB access, both forbidden to this worker) | `study_sets`/`cards`/`quiz_questions` are read live by `useSets()` (study index, 5+ progress screens, analytics, notifications) and by the mixed-quiz flow (`fetchServedQuiz` → `/api/quiz`) and by offline downloads (`/api/sets/:id`), but all three tables are empty until someone manually `POST`s `/api/admin/seed` with the admin token — there is no migration hook, deploy step, or app-boot call that does this automatically anywhere in the repo (`grep` for `admin/seed` outside the route file and `PLAN.md` turns up nothing). I could not confirm from static code alone whether the current dev database has been seeded. | `admin/seed+api.ts` docstring: "This is scaffolding for the migration, not a public route" — no caller found anywhere in the app | The DB-owning worker should confirm via `GET /api/health` (table count) and `GET /api/sets` (non-empty) whether seeding has run; if it hasn't, every screen behind `useSets()`/`fetchServedQuiz` is silently degraded to whatever `errorKind`/empty-state each screen shows, which is a live-app-behaviour question outside this worker's static remit. |
| CRUD-10 | P4 | seed data / architecture | `src/lib/study.ts:1147-1151` vs `admin/seed+api.ts:80-82` | INFERRED | The flashcard/study-session UI renders card and plain-quiz content from the **bundled** `lib/study.ts` constants (`getStudySet`), not from Postgres, while the catalogue (`useSets`) and the mixed-quiz flow read Postgres content seeded *from* `lib/study.ts` at some point in the past via `onConflictDoNothing`. Because the seed insert is conflict-skip rather than upsert, editing `lib/study.ts` after the initial seed changes what the bundled UI shows immediately but does **not** change the already-seeded DB rows — the catalogue metadata (`useSets`) and the mixed-quiz question pool would silently drift from the flashcard content shown for the same set id. To confirm: edit a seeded set's `description` or a card's `question` in `lib/study.ts`, re-run `/api/admin/seed`, and diff the returned `inserted` counts against expectations — an unrelated worker would need to run this, since it requires the admin token and a live DB. | `admin/seed+api.ts:80-82` (`onConflictDoNothing` on all three inserts); `lib/study.ts:1149-1151` (`getStudySet` reads the bundled array directly) | Either make the seed route idempotent-with-update (`onConflictDoUpdate`) so re-seeding after a content edit actually reconciles, or accept the drift as a known cost of re-running seed and document it next to the seed route's docstring, which currently only claims idempotency against duplication, not against staleness. |

## Reasoning by sub-question

### Children: Clerk metadata vs. lazy DB row vs. deletion

Confirmed end to end by reading `lib/children.ts`, `db/auth.ts`, `progress+api.ts`, and `quiz+api.ts`:

- **Create:** a child is born entirely in Clerk `unsafeMetadata` (`addChild`, id = `` `${Date.now()}` ``).
  The Postgres row does not exist until that child's device calls `/api/progress` or `/api/quiz` for
  the first time, at which point `childFor(parent, clientId, {name, yearCode})` inserts it, keyed on
  `(clerkUserId, clientId)` with a `uniqueIndex`.
- **Read:** every screen reads Clerk metadata (`useChildren`). Nothing in the UI ever reads the
  Postgres `children` row directly — it exists purely as the join target for `reviews`/`sessions`/etc.
- **Update:** Clerk metadata updates freely (`updateChild`). The Postgres row is frozen at
  first-sync values (CRUD-03) — `childFor`'s `if (existing) return existing` never diffs or writes.
- **Delete:** Clerk metadata removal only (CRUD-01). The Postgres row, and everything cascade-linked
  to it, survives forever with no code path to remove it.
- **Reattachment on same clientId:** does not happen in practice. `addChild` always mints a new
  `` `${Date.now()}` `` id, so a newly created child can only collide with an old, orphaned row if two
  children are created in the same millisecond — not a real scenario. So progress does **not**
  "survive and reattach"; it is simply abandoned, invisibly, in Postgres. If someone later switched
  `addChild`'s id scheme to something coarser (e.g. an incrementing counter, or reused a freed slot),
  reattachment *would* become possible and a deleted sibling's old sessions/certificates could
  resurface under a different child's name — worth keeping in mind if that id scheme ever changes,
  but not a live risk today.

### `subscriptions` and `certificates`: every write path, if any

None, for either table, anywhere in the codebase — confirmed by grepping every `db.insert`/`db.update`
call in `src/` (nine call sites total, none touching these two tables) and by reading both consuming
`lib/*` modules, which state outright that they are demo stand-ins. This is the one place where the
"noise" outcome the brief warns against is the *correct* classification: DEMO-STANDIN, not a bug. The
one thing worth flagging under it is CRUD-04's hardcoded "Accuracy 90%" — a specific, plausible-looking
number on a printable/shareable artefact, which reads differently from an obviously-placeholder value.

### `card_reports`: can any screen file one?

Yes — `flashcard/[id].tsx` renders `ReportCardSheet`, which posts to `/api/report-card` with one of
five fixed reasons. This is a genuinely complete, working Create path: UI → API → DB, all three
present and connected. What's missing is the other half of the loop: no screen or route reads
`card_reports` back out (no admin review list), so a filed report currently has no in-app consumer —
only a human with direct DB access (`db:studio`) can act on it. That's consistent with the table's own
doc comment ("reports land in the database rather than only in Sentry... where it can be triaged" —
"triaged" implies an out-of-band human process, which is plausible for a small team, so I am not
flagging the missing review UI itself as a defect, only noting it as the natural next gap.

### `question_impressions`: who writes it, is it bounded?

Written exclusively by `GET /api/quiz` as a side effect of serving questions (`quiz+api.ts:128-137`),
via an upsert keyed on `(childId, questionId)` (`uniqueIndex("impressions_child_question_idx")`).
Because it's an upsert, not an append, repeat serves of the same question to the same child update
`servedAt` in place rather than adding a row. Growth is bounded by `(number of children) × (number of
distinct questions ever served to each)` — it grows with the size of the question pool and the
catalogue a child has actually touched, not with usage frequency or session count. This is the correct
design for the "12h no-repeat" feature it backs and I found no unbounded-growth risk in it.

## Notes on prior audits (re-checked per instructions, not inherited)

`ceoaudit.md` (17 July 2026) and `docs/Report.md` (20 July 2026) both predate the current
`src/db/schema.ts` / API layer for some of their claims. Re-checked the ones intersecting this
concern:

- **"A child can delete their sibling"** (`ceoaudit.md` — pencil on `/home` → `/add-child?id=` →
  "Delete child" behind a single `Alert`, ungated): **FIXED (evidence)**. `home.tsx:110-113`'s comment
  confirms the fix and states why: the child-facing card now has no edit/delete affordance at all;
  `add-child.tsx:326-332` gates every entry to edit mode except first-run onboarding behind
  `useParentGate()`, redirecting to `/children` (also gated) otherwise. The underlying *data* problem
  this finding didn't catch — that "Delete child" doesn't actually delete anything server-side — is
  CRUD-01 above, newly found in this audit.
- **Certificate issue-date hardcoded to "16 July 2026"** (`ceoaudit.md:247`): **FIXED (evidence)**.
  `rewards.ts:25-27` (`issuedToday()`) and `:90,99` — every certificate now stamps the real render
  date, not a literal.
- **"No billing exists at all" / misleading paywall claims aimed at parents** (`ceoaudit.md:89,235`,
  hardcoded `value="GoKid Plus"` shown to every parent): **STILL TRUE that no billing exists** (by
  design — see CRUD-04), but **FIXED (evidence)** that it's misleadingly presented: `settings.tsx:112`
  and `subscription.tsx:15-27` both now read from `useEntitlement()`/`entitlementLabel()`, which is
  honestly hardcoded to `free`, and `paywall.tsx:111-151` explicitly states "GoKid can't take payments
  yet, so there is nothing to subscribe to and nothing has been charged" instead of showing live-looking
  prices next to a working-looking button.
- **`certificate/[id].tsx:42` catch block not reporting to Sentry** (`ceoaudit.md:118`):
  **FIXED (evidence)**. The file's current (only) catch block, in `onPrint` (line 84), does call
  `Sentry.captureException(error, { tags: { flow: "certificate-print" } })`.

None of the above are new findings of mine — they're re-verifications per the instruction not to
inherit claims from either document unlabelled. All four were independently confirmed by reading the
current file contents, not by trusting either report's original claim or its "fixed" status.

## What this worker could not verify (NOT TESTABLE)

- Whether the dev/staging Postgres database has actually been seeded (`/api/admin/seed` run) — would
  need `curl /api/health` or `curl /api/sets`, both forbidden to this worker (single-owner dev server
  resource). See CRUD-09.
- Whether a real sync (`/sync` screen, "Sync now") has ever been exercised against a live child, which
  would confirm rows actually land in `reviews`/`sessions` as designed rather than only in the code
  path. Static reading confirms the code is wired correctly (push-then-pull, `onConflictDoUpdate`
  with the stated `last_reviewed_at >` predicate); it does not confirm the round trip has ever
  succeeded end to end. Would need the simulator + a signed-in test account, both out of scope here.
- Whether `admin/generate`'s AI question output is actually of acceptable quality — `quiz-validate.ts`
  proves shape/answerability, not correctness of content; that needs a human reviewer via
  `admin/questions`, which has no in-app UI to exercise.
