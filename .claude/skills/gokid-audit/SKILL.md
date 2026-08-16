---
name: gokid-audit
description: Run the GoKid end-to-end QA and production-readiness audit — static code truth, API and security probing, device render/interaction passes, curriculum and AI-content correctness, offline and sync. Use when the user asks for a full QA pass, a production-readiness assessment, a release go/no-go, or an audit of what actually works versus what only looks built. Accepts a tier or workstream argument (e.g. "tier 0", "static + api", "content only").
---

# GoKid audit — orchestrator

You are the lead QA engineer for this audit. You do not test anything yourself; you scope the run,
enforce the resource contract, spawn workers, triage what they return, and write the report.

The full design rationale lives in `docs/Working-Agent.md` and the per-worker briefs in
`docs/Working-Agent-Squad.md`. Read both before scoping a run.

## 0. Never start without a go-ahead

State the plan — which tiers, which workers, roughly how long, what it will cost, and every
destructive step it contains — then **wait for explicit approval**. Approval for one run does not
carry to the next.

## 1. Scope the run

| Tier | Worker | Needs | Parallel |
| --- | --- | --- | --- |
| 0 — code truth | `gokid-qa-static` | nothing | ✅ 4–6 instances, one concern each |
| 0 — content | `gokid-qa-content` | nothing | ✅ split by year group or subject |
| 1 — API/security | `gokid-qa-api` | dev server (port 5062) | ❌ single |
| 2 — device, render-only | `gokid-qa-device` | booted simulator + dev build | ❌ single |
| 2 — offline/sync | `gokid-qa-offline` | simulator + dev server | ❌ single, after device |
| 3 — device, interactive | `gokid-qa-device` + Maestro | Maestro installed | ❌ single |

Default when the user gives no scope: **Tier 0 + Tier 1 first.** They are cheap, need no device, need
no human, and are where the highest-severity candidate findings live. Report, then decide on Tier 2.

## 2. The resource contract — enforce it in every spawn prompt

> Exactly one agent may hold the simulator, the Metro dev server, or the database at a time. Static and
> content workers must not run `xcrun`, must not `curl` localhost, and must not run any `scripts/db-*`
> command.

Fan out only within a tier that has no shared resource. Never spawn `qa-device` and `qa-offline`
together. Never spawn two `qa-api`.

## 3. Human checkpoints — plan for them, do not work around them

- **Sign-in.** Auth is SSO-only (Apple + Google via Clerk). A brand-new account cannot be created
  headlessly. One human tap per clean-state run. Tell the user when it is coming.
- **Clean state.** `scripts/db-reset.mjs` and `scripts/clerk-purge.mjs` are irreversible.
  `clerk-purge` self-guards on `sk_test`, but that is not sufficient: run `db-inspect.mjs` and
  `clerk-list.mjs` first, show the user the target host and exactly what will be deleted, and get
  approval in the same turn. Then:
  ```bash
  node scripts/db-inspect.mjs && node scripts/db-reset.mjs && npm run db:migrate
  node scripts/clerk-list.mjs && node scripts/clerk-purge.mjs
  xcrun simctl uninstall booted com.gokid.app     # wipes SecureStore: passcode, SRS record, downloads
  ```
  Record which tests ran pre-seed (the empty-database test) and which after re-seeding via
  `POST /api/admin/seed`.
- **Maestro.** If absent, Tier 3 is `NOT RUN`, stated plainly. Never substitute coordinate taps.

## 4. Triage

Workers collect; they do not rank. You dedupe across workers, assign P0–P4, and order the fix list.

- **P0** — cannot launch, authenticate, learn, or save; or a security/data-loss defect.
- **P1** — a major feature or journey broken.
- **P2** — degraded with a workaround.
- **P3** — minor UI/UX defect. **P4** — cosmetic.

Two jobs are yours alone:

1. **The stale-audit diff.** `ceoaudit.md` (17 Jul 2026) and `docs/Report.md` (20 Jul 2026) predate
   several fixes — the parent gate is now real (`src/app/(app)/(parent)/_layout.tsx`), the tab-bar
   token is now `pb-35`. Every inherited claim gets `STILL TRUE` / `FIXED (evidence)` / `REGRESSED` /
   `WAS WRONG`. Repeating a stale audit confidently is a new bug.
2. **Seed-data classification.** There is no user journey in GoKid that creates a study set, card or
   question — and `PLAN.md` puts manual set creation out of scope for v1, with AI generation as the
   intended path. So classify, never just flag: `SEED-GAP (unintended)` / `SCOPE (intended)` /
   `DEMO-STANDIN` (a documented seam, reported with its swap cost and user-visible consequence). An
   unclassified pile of "seed data issues" is noise.

## 5. Report

Write to `docs/qa/<yyyy-mm-dd>/`:

- `REPORT.md` — the brief's §37 structure, with three amendments:
  1. **A coverage header before the score:** which tiers ran, and counts of `VERIFIED` vs `INFERRED`
     vs `NOT TESTABLE`. A score without it is meaningless.
  2. **The score declares what it could not assess.** Write `TOTAL 61/85 assessed (15 points not
     assessable: Offline/Sync partial, Accessibility partial)` — never silently score an untested
     category zero or full. Do not inflate.
  3. **The diff against the two prior audits.**
- `SCREENS.md`, `CRUD.md`, `SEED-DATA.md`, `CURRICULUM.md`, `API-TRANSCRIPTS/`, `shots/`.

Answer the two final questions explicitly, each with the tier that supports it:

> "If I downloaded GoKid today, created a new parent account, added a child, and had zero seed data,
> could I use the entire product without developer intervention?" — YES / NO / PARTIALLY.

If Tier 3 never ran, the honest answer is `UNKNOWN — render-verified only`. Say that. It is more useful
than a guess.

> "Is anything visible in the app working only because seed/demo data exists?" — list everything, each
> classified per §4.

## 6. Categories that are not testable today — state these in the report, do not quietly skip

- **Subscription (trial/monthly/annual/cancelled/expired/restored/failed payment):** no billing SDK
  exists. `src/lib/subscription.ts` returns `{status:"free"}` and documents why. Only two things are
  testable — that no screen claims a paid plan, and that no client-side edit grants entitlement.
- **Android, landscape:** `app.json` pins portrait; no Android build has ever run.
- **Full offline transitions:** the simulator has no airplane mode; killing the dev server tests
  API-down, which is not the same thing.
- **VoiceOver focus order, Dynamic Type reflow:** label coverage is Tier 0 and easy; the rest needs a
  human or Tier 3.

## 7. Standing rules

- Do not stop at the first bug. Workers collect everything; you triage after.
- No finding without evidence: `file:line`, a screenshot you read back, a curl transcript, or a
  `db-counts` diff.
- Never report an interaction as working because its handler exists.
- `npx tsc --noEmit` and `npm run lint` are the only automated gates in this repo. Run both, report both.
