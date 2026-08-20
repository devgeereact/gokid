# GoKid — QA & Production-Readiness Report

**Date:** 14 August 2026
**Branch:** `main` (working tree dirty: `CLAUDE.md`, `PLAN.md`, `package.json`)
**Run:** Tier 0 (code truth) + Tier 1 (API/security). **No device tier ran.**
**Workers:** 7 — 4 static, 2 content, 1 API/security. Individual reports in [`workers/`](workers/).

---

> **Note on document paths (added 20 Aug 2026).** This report is a dated, immutable record and its
> inline citations use the paths that were current when it was written. Since then: `ceoaudit.md` →
> [`../../archive/2026-07-17-ceo-audit.md`](../../archive/2026-07-17-ceo-audit.md), `docs/Report.md` →
> [`../../archive/2026-07-20-diagnostic-report.md`](../../archive/2026-07-20-diagnostic-report.md), and
> `docs/DEPLOY.md` / `docs/ENV.md` / `docs/HANDOFF.md` were merged into
> [`../../LAUNCH.md`](../../LAUNCH.md). The findings below are unedited.

---

## 1. Coverage header — read this before the score

| Tier | Ran | What it can prove |
| --- | --- | --- |
| 0 — code truth | ✅ 4 workers | What the code does. Route graph, CRUD, rules, honesty, a11y coverage |
| 0 — content | ✅ 2 workers | Whether every answer is right and every claim about the curriculum is true |
| 1 — API/security | ✅ 1 worker | Real requests against the live dev server and database |
| 2 — device render | ❌ not run | Nothing here is screenshot-verified |
| 3 — device interactive | ❌ not run | **No button in this app has been proven to work by pressing it** |

**Evidence counts across all 7 workers:** 96 findings recorded — **81 VERIFIED**, 8 INFERRED,
7 NOT TESTABLE. Every VERIFIED finding carries a `file:line`, a curl transcript, or a schema query.
31 request/response transcripts in [`API-TRANSCRIPTS/`](API-TRANSCRIPTS/).

**Automated gates:** `npx tsc --noEmit` clean. `npm run lint` clean (zero problems, real
`eslint-config-expo` flat config). One worker timed out running lint concurrently with another and
honestly logged `NOT TESTABLE`; that is process contention, not a conflicting result.

**No destructive action was taken.** No database reset, no Clerk purge, no migration applied, no
simulator touched. `db-counts` before and after the API run is identical (`children=1`, `reviews=0`,
`sessions=0`, `card_reports=0`). OpenRouter spend: **zero** — the generate route was probed with an
invalid body to read its auth outcome without a model call.

---

## 2. Executive summary

**Verdict: NOT READY. Four P0s, one of which is new and was invisible to every prior audit.**

The July audits are largely obsolete in the best possible way: nearly everything they flagged has been
genuinely fixed, with the fixes documented in code. The parent gate is a real gate. The rejected
streak/points/leaderboard mechanics are gone. The tab-bar clipping is fixed across all 12 screens. The
paywall no longer lies. Entitlement is honest. Dead controls are wired or removed.

What this audit found instead is a **new failure class the earlier audits could not see, because it
did not exist yet**: the seam between device-local storage and the Postgres database that arrived in
July. Three of the four P0s live in that seam. The fourth is a deployment gap — a committed migration
that was never applied — which silently disabled an entire shipped feature area.

The pattern is consistent and worth naming: **this codebase's problems are no longer in its screens.
They are in the gap between what the client believes and what the server actually holds.**

---

## 3. Score

Scored only against what this run could assess. Categories needing a device or a valid Clerk session
token are excluded rather than guessed at — an unassessed category scored full or zero is a lie in
either direction.

| Category | Assessed | Score | Note |
| --- | --- | --- | --- |
| Functionality | 12 / 20 | **7** | Route graph flawless; download + admin + quiz-serving endpoints 500 |
| UX / UI | 8 / 15 | **6** | Rules compliance strong; 2 no-op controls, 21 untokenised values |
| Data Integrity | 12 / 15 | **4** | Two P0s. Deletion never reaches Postgres |
| Curriculum | 10 / 10 | **5** | Facts excellent, breadth poor, objectives half-disconnected |
| AI Quality | 4 / 10 | **2** | Pipeline non-functional; prompt lacks UK + answer-distribution constraints |
| Security | 7 / 10 | **5** | Auth negative tests all pass; IDOR unproven live |
| Offline / Sync | 3 / 10 | **1** | Download endpoint is 500 right now |
| Performance | 0 / 5 | **—** | Needs a device |
| Accessibility | 3 / 5 | **1.5** | 90.3% labels; quiz illustrations silent to VoiceOver |
| Error Recovery | 3 / 5 | **2** | Good error taxonomy; 500s leak SQL text |
| **TOTAL** | **62 assessed** | **33.5 / 62** | **38 points not assessable without Tier 2/3** |

Do not read 33.5/62 as "54%". Read it as: of the half of the product this run could examine, roughly a
third of the available quality points are currently earned, and the losses cluster in data integrity
and deployment rather than in craft.

---

## 4. P0 — release blockers

### P0-1 — Migration `0004` was never applied. An entire feature area is dead.
`drizzle/0004_outstanding_lenny_balinger.sql`, committed at `a0f8d2c` ("AI question-generation pipeline
+ no-repeat quiz serving"), is absent from `drizzle.__drizzle_migrations` — that table has 4 rows, not 5.
Verified against `information_schema`: `quiz_questions` lacks `status`, `objective_id`, `difficulty`,
`source`, `created_at`; `question_impressions` and `curriculum_objectives` **do not exist**.

Every route doing a bare `db.select().from(quizQuestions)` therefore 500s:
`GET /api/sets/:id` (even for a real id — `place-value`), `GET /api/quiz`, `GET/POST /api/admin/questions`,
and the insert in `POST /api/admin/generate`.

Consequence beyond the API: `src/lib/downloads.ts` builds every offline download from `/api/sets/:id`,
so **offline download is broken for every set in the app right now**. The most recent feature commit
("wire the quiz flow onto the no-repeat served endpoint") is shipping against an endpoint that cannot
respond. The quiz itself survives only because `src/lib/served-quiz.ts` falls back to the bundled local
list — the fallback is masking a total backend failure.

*Fix:* human-authorised `npm run db:migrate` against this `DATABASE_URL`. Additive and non-destructive.
The worker deliberately did not run it — applying a migration is a schema write and was outside the
read-only scope granted. **This needs your go-ahead.**
Evidence: `API-TRANSCRIPTS/20-migration-0004-not-applied.txt`, `13-sets-id-real.txt`.

### P0-2 — Deleting a child deletes nothing on the server.
[`children.ts:140-152`](../../../src/lib/children.ts#L140-L152) removes the entry from Clerk
`unsafeMetadata` only. The Postgres `children` row created lazily by
[`auth.ts:64-94`](../../../src/db/auth.ts#L64-L94), plus every cascade-linked `reviews`, `sessions`,
`certificates` and `question_impressions` row, survives forever. `grep -rn "db.delete" src` returns
**nothing** — there is no delete path anywhere in the codebase. The data is permanently orphaned:
unreachable from any screen, un-deletable, and it does not reattach (`addChild` mints a fresh
`Date.now()` id every time).

### P0-3 — The account-deletion screen makes a promise it cannot keep.
[`delete-account.tsx`](../../../src/app/\(app\)/\(parent\)/delete-account.tsx) tells parents deletion
"erases everything below, immediately and permanently", listing child profiles, all learning history,
and certificates. It deletes the Clerk user and three on-device stores. It never calls any API to remove
the synced Postgres rows — and per P0-2, no such API exists.

This is a factual claim to parents about a children's app, in the same category as the `data-usage.tsx`
promise, and worse: it is a deletion guarantee that GDPR Article 17 attaches to.

The sharpest detail in the whole audit: [`data-export.tsx`](../../../src/app/\(app\)/\(parent\)/data-export.tsx)'s
own docstring predicted this — *"if a third store is ever added, it has to be added here too, or this
screen quietly starts lying about being complete."* A third store (Postgres, via `/sync`) now exists and
is in neither the export nor the deletion. The codebase warned itself, and the warning came true.

### P0-4 — `EXPO_PUBLIC_API_URL` is still unset. (Carried, not new.)
Unchanged from `docs/Report.md` (20 July). Absent from `.env`, absent from `.env.example`, no `eas.json`
exists. [`api.ts:19`](../../../src/lib/api.ts#L19) throws in any release build, so every data screen dies
after the splash. Reported as current state, not as a fresh discovery.

---

## 5. P1

| id | Finding | Evidence |
| --- | --- | --- |
| P1-1 | **Answer-position bias across both content scopes.** Rec–Y2: 62% of correct answers at `options[1]` (80% in `y1-common-words`, `y2-word-classes`, `y2-habitats`). Y3–Y6: `y4-fronted-adverbials` and `y4-states-of-matter` are 100% index 0; three more at 80% index 1. Quizzes are passable without reading. Two independent workers found this in disjoint scopes — it is systematic. | `workers/content-rec-y2.md`, `workers/content-y3-y6.md` (per-question swap fixes given) |
| P1-2 | **`analytics.ts` matches sets to curriculum strands by exact string equality** (`set.topic === strand.name`). 4 of 9 Rec–Y2 sets match no strand, and `subjects.ts` is missing NC-mandated units ("Seasonal changes", "Living things and their habitats"). Content taught correctly is **invisible to the app's own coverage screens**. | `src/lib/analytics.ts`, `src/lib/subjects.ts` |
| P1-3 | **Quiz illustrations are silent to VoiceOver.** [`quiz/[id].tsx:113`](../../../src/app/\(app\)/quiz/\[id\].tsx#L113) — no `accessibilityLabel`, not wrapped by an accessible parent. A blind child gets zero information about a question specifically *about* a picture. | `workers/static-honesty.md` F6 |
| P1-4 | **Postgres `children` rows never update after first sync.** Name and year group freeze at first-sync values; `birthMonth`, `birthYear`, `avatarKind`, `avatarValue` are hardcoded `""`/`"preset"`/`"fox"` and never populated. | `src/db/auth.ts:71-90` |
| P1-5 | **Generation prompt has no UK-language or answer-distribution constraint.** `systemPrompt()` claims UK alignment but never forbids American spelling/vocabulary, and never constrains answer-index spread. The same defects found by hand in authored content will reproduce in every generated batch. | `src/lib/openrouter.ts` |
| P1-6 | **Curriculum objectives are disconnected from content.** ~half the `OBJECTIVES` rows for Y3–Y6 describe content no set teaches. Y3 Geography's objectives (UK counties, rivers/mountains) match neither its own set (European capitals) nor the right year — rivers/mountains is Y5. Y3 Science never mentions skeletons, though the only Y3 Science set is the skeleton. | `src/lib/curriculum.ts` |

---

## 6. P2–P4 (selected — full lists in the worker reports)

**P2** — `/api/report-card` is the only content-write route with no auth and no rate limit
(`report-card+api.ts`); `POST /api/progress` has zero runtime validation, so `box` is never clamped and
bad values surface as a generic 500 rather than a 400; `session-summary/[id].tsx:53` renders "View all"
as an unpressable `<Text>` styled exactly like the app's working links (worse than a no-op — it cannot
even fail visibly); `curriculum_objectives` has no write path at all, making `admin/generate`'s
`objectiveId` branch permanently dead; coverage is thin — 7 of 10 subject hubs have zero Rec–Y2 content
including statutory Geography and History, and Y4/Y5/Y6 have 3 of 10.

**P3** — `/api/sets/:id` returns quiz questions without filtering `status="published"`, unlike
`/api/quiz`, so unreviewed AI drafts can reach a child through the download path (currently masked by
P0-1); admin and content routes leak raw SQL/driver text on 500s while `/api/progress` and `/api/quiz`
deliberately do not; tapping a scheduled reminder routes nowhere (no
`addNotificationResponseReceivedListener` anywhere); the stale "expo-notifications is not installed"
comment `Report.md` flagged is still there **and has been copied to a second file**; 8 touch targets
under 44pt with no `hitSlop`; 11px text on 5 child-facing screens; 21 untokenised Tailwind bracket
values across 15 files; `settings.tsx:128` hardcodes Billing "Apple" next to "Plan: Free"; "Rate GoKid"
points at App Store id `0000000000`.

**P4** — `nextSetId()` wraps at the end of the curriculum, so a child who finishes everything is
silently sent back to set one with no completion state; `paywall.tsx` uses `pb-4` where 17 sibling
screens use `pb-10`; 8 `SymbolView` inline margin styles remain because `styled.ts` wires `cssInterop`
for `Image` and `SafeAreaView` but not `SymbolView`.

---

## 7. Controls proven to work

Worth recording, because a security control verified working is a result:

- **Auth fails closed everywhere it was testable.** No header, malformed token, and a structurally
  valid but forged/expired JWT all return `401 {"ok":false,"message":"Not signed in."}` on
  `/api/progress` (GET and POST) and `/api/quiz`, with no distinguishing information leaked.
- **Auth is checked before input validation** — `count=999`, `0`, `-5`, `abc` on `/api/quiz` all 401
  before any pool logic runs, so an unauthenticated caller cannot probe pool size or trigger a write.
- **No injection surface found.** Path-traversal (`..%2F..%2Fetc%2Fpasswd`) and SQL-shaped
  (`' OR 1=1--`) ids both return a clean 404 with the same message as any missing id.
- **The admin guard is correct for production.** `admin-auth.ts` checks `NODE_ENV === "development"`
  exactly, not `!== "production"` — so the preview-deploy exposure its own comment warns about does not
  exist. Admin routes answer without a credential *only* on this local dev server, which is the
  documented behaviour. Still: set `ADMIN_TOKEN` in every non-local environment.
- **The `/api/sets` count bug is fixed and cross-checked.** `cardsTotal` sums to 160 and `quizCount` to
  135, matching the database exactly (135 + 5 `mixed=true` = 140 total rows).
- **DB constraints back the sync claims.** `sessions_child_client_idx` UNIQUE and
  `reviews_child_card_idx` UNIQUE both exist, matching the code's `onConflictDoNothing` /
  `onConflictDoUpdate … setWhere: excluded.last_reviewed_at > reviews.last_reviewed_at`.
- **Route integrity is genuinely clean.** 58 screens + `+not-found`; all 170 navigation call sites and
  24 redirects resolve; every one of the 14 dynamic routes validates its param and fails to a
  `Redirect` or an honest `EmptyState`. No bad `[id]` can produce a blank screen.
- **Every `catch` in `src/` has a body.** 60+ sites read; zero bare `catch {}`. The `reviews.ts` P0
  silent-data-loss bug from July is `await`-ordered, Sentry-reported and non-destructive.

---

## 8. Diff against the two prior audits

| Claim | Source | Verdict |
| --- | --- | --- |
| Parent gate is not a gate; `/settings`, `/paywall`, `/children` open with no challenge | ceoaudit §0.1 | **FIXED** — `(parent)/_layout.tsx` gates the whole group |
| Streak flame, 7-Day Streak badge, points, Level 5, "View leaderboard" shipping against the brief | ceoaudit §0.2 | **FIXED** — every site removed, each with a comment naming §9 and pointing at the real replacement |
| `JSON.parse` failure wipes every child's progress silently | ceoaudit §0.3 | **FIXED** — await-ordered, Sentry-reported, non-destructive |
| A child can delete their sibling | ceoaudit | **FIXED** — child-facing card has no edit/delete affordance; all edit entry points gated |
| Certificate issue-date hardcoded "16 July 2026" | ceoaudit | **FIXED** — `issuedToday()` |
| `/progress/achievements` — every control a no-op | ceoaudit | **FIXED** — fully rewired to real SRS/curriculum data |
| `/progress/subject/[subject]` always shows Maths | ceoaudit | **FIXED** — resolves the real slug, unknown slug renders "Subject not found" |
| Misleading "GoKid Plus" / paywall overselling | ceoaudit | **FIXED** — reads `useEntitlement()`; paywall states outright it cannot take payment |
| Tab-bar clipping, 12 screens | Report.md §3 | **FIXED** — all 12 now `pb-35`, commit `4e1d9bf` |
| "59 routes / 0 broken / 0 dead" | Report.md §1 | **STILL TRUE** — re-verified exhaustively, not sampled |
| Terms & Privacy on sign-in are plain `<Text>`, not links | Report.md §4 | **FIXED** — both are real links; **`Report.md` still asserts this and is now wrong** |
| Stale "expo-notifications is not installed" comment | Report.md §4 | **STILL TRUE** — unfixed, and now duplicated into a second file |
| `EXPO_PUBLIC_API_URL` unset | Report.md §4 | **STILL TRUE** — P0-4 above |
| No tests, no CI | Report.md §4 | **STILL TRUE** — zero test files, no `.github/` |
| 0/6 accessibility screens, no reduced motion, no dyslexia mode | both | **FIXED** — real settings screen, both toggles persisted and actually consumed |

Fourteen of sixteen inherited claims re-verified; eleven fixed. `ceoaudit.md` and `docs/Report.md`
should now be treated as historical, not current.

---

## 9. The two final questions

> **"If I downloaded GoKid today, created a new parent account, added a child, and had zero seed data,
> could I use the entire product without developer intervention?"**

**NO** — and this is answerable without a device, which is unusual.

Not because of anything a user does, but because of P0-1 and P0-4. A release build has no API URL and
dies after the splash. Even against this dev server, `/api/sets/:id` returns 500 for every real set, so
offline download cannot work for anyone. The database also needs `POST /api/admin/seed` run by hand —
there is no migration hook, deploy step, or app-boot call that seeds it, so a genuinely fresh
environment starts with an empty catalogue and no way for a user to fill it.

The interactive half of the question — whether the buttons work — is `UNKNOWN, render-verified only`.
Tier 2 and Tier 3 did not run. No screen in this app has been screenshot-verified today and no control
has been pressed.

> **"Is anything visible in the app working only because seed/demo data exists?"**

Yes, extensively — and mostly *by design*. Full classification in [`SEED-DATA.md`](SEED-DATA.md). The
short version: the entire curriculum is bundled constants in `src/lib/study.ts`; the database was seeded
*from* that file; and **no user journey anywhere in GoKid creates a study set, card or question**. Per
`PLAN.md` that is intended for v1 (manual set creation is out of scope, AI generation is the path) — but
the AI path is exactly what P0-1 has disabled, so today there is *no* working way to create content at
all, intended or otherwise.

---

## 10. Recommended fix order

1. **P0-1** — apply migration `0004`. One command, unblocks four endpoints, offline download, and the
   entire AI-generation feature. Needs your authorisation (schema write).
2. **P0-2 + P0-3 together** — add `DELETE /api/children/:clientId` cascading server-side, call it from
   `removeChild` and from `delete-account.tsx`, and add the Postgres rows to `data-export.tsx`. These are
   one piece of work and one of them is a legal exposure.
3. **P1-1** — reshuffle the biased quizzes (mechanical, per-question fixes already written out) and
   **P1-5** — fix the generation prompt so it stops reproducing the defect.
4. **P0-4** — deploy the API and set `EXPO_PUBLIC_API_URL`. Unchanged from July; nothing ships without it.
5. **P1-2** — fix the strand string-matching bug and add the missing NC strands, so coverage screens stop
   under-reporting real content.
6. **P1-3** — label the quiz illustrations.
7. Everything in §6, in severity order.

---

## 11. What to run next

- **Tier 2 (device, render-only)** — the empty-state pass immediately after a clean state is the single
  most valuable thing not yet done, and it needs a destructive reset you have not authorised.
- **Tier 3 (interactive)** — blocked on Maestro (not installed). Until then, no claim about any button
  in this app is evidence-backed.
- **IDOR, sync dedupe, last-write-wins, and the 12-hour no-repeat rule** remain `NOT TESTABLE`: this
  Clerk dev instance has exactly one user, and minting a second identity or a session token is a write
  against a live auth service that no one authorised. Provision a throwaway second identity and these
  four close out properly. Until then they are open questions — **not** confirmed safe.
