# Working-Agent — GoKid QA & Production-Readiness Agent (design spec)

**Status:** proposal for review. Nothing has been installed or created yet.
**Written:** 14 August 2026
**Companion files:** [Working-Agent-Squad.md](Working-Agent-Squad.md) (the workstream briefs), [Working-Agent-Hooks.md](Working-Agent-Hooks.md) (the hook proposal)

This document takes the QA brief you wrote and turns it into something that can actually run against
*this* repository. It is deliberately blunt about the parts of the brief this project cannot satisfy
today, because an agent that reports "tested" for something it could not test is worse than no agent.

---

## 1. The honest headline

The brief asks for a hands-on end-to-end test of a running application by a fleet of parallel agents.
Three facts about this repo constrain that:

| Constraint | Consequence |
| --- | --- |
| **There is no UI test harness.** No Detox, no Maestro, no XCUITest, no `*.test.*` files anywhere. `xcrun simctl` can launch, deep-link, screenshot and read logs — it has **no tap, type or swipe command.** | Today an agent can prove a screen *renders*. It cannot prove a button *works*. The brief's core demand ("behave like a real user", §5, §12, §13) is **not currently automatable**. |
| **Auth is SSO-only** (Apple + Google via Clerk `useSSO`). There is no email/password path. | A "completely new user with zero data" (§1, §11) cannot be created headlessly. Sign-in requires a human tap in a system web sheet, once per clean run. |
| **The simulator, the Metro dev server and the Neon database are single, shared resources.** | The brief's ten parallel agents (§3) cannot all "use the app". Parallelism has to happen on the *static and content* workstreams, with exactly one agent holding the device. |

Two of these are fixable, and the fix is small:

- **Add Maestro** (`curl -Ls "https://get.maestro.mobile.dev" | bash`). It drives Expo dev-client builds
  from YAML flows, taps by accessibility label — and this codebase already has *161 accessibility
  labels across 167 pressables* (`ceoaudit.md` §1), which is exactly what Maestro selects on. This
  single addition converts roughly half the brief from "not testable" to "testable".
- **A human sign-in checkpoint.** The agent pauses, you tap "Continue with Apple" once, the agent
  resumes. One interruption per clean-state run, not per test.

Neither is a reason to delay building the agent. The agent should be built to run at three depths and
report honestly which depth it achieved.

---

## 2. What already exists that the agent must not duplicate

Two prior audits already cover material the brief asks for. The agent's job is to **verify, date and
supersede** them, not to re-derive them from scratch.

| File | Date | What it covers | Trust level |
| --- | --- | --- | --- |
| `ceoaudit.md` | 17 Jul 2026 | 38 screens, live deep-link sweep, seed/demo-data honesty, dark-pattern findings, entitlement gaps | **Partly stale.** At least one headline finding is now fixed: it says "the parent gate is not a gate", but `src/app/(app)/(parent)/_layout.tsx` now gates the whole group. |
| `docs/Report.md` | 20 Jul 2026 | 22-route smoke test, `expo-doctor`, launch blockers, tab-bar clipping blast radius | **Partly stale.** The `pb-28` (112px) clipping fix has since landed as `pb-35` (140px) in `tailwind.config.js:58`. |

**Rule for the agent:** every claim inherited from those files is re-verified or marked
`UNVERIFIED (inherited from ceoaudit.md, 17 Jul)`. A stale audit repeated confidently is a new bug.

---

## 3. The seed-data question, answered up front

The brief's §1 and §11 are the strongest part of it, and this codebase has an unusually clean answer —
which the agent needs to know before it starts, or it will file forty duplicate "seed data" bugs.

**`src/lib/*` is the data layer. Most of it returns demo constants. This is deliberate and documented.**

- **Demo/local content:** `src/lib/study.ts` (the entire curriculum — 27 sets, ~160 cards), `subjects.ts`,
  `curriculum.ts`, `rewards.ts`. `study.ts` says in its own header that it is "the single seam to swap"
  when the content API lands.
- **Clerk-metadata storage:** `children.ts`, `active-child.ts` — children live on the parent's Clerk user
  under `unsafeMetadata`, not in Postgres.
- **On-device storage:** `reviews.ts` (the spaced-repetition record) in SecureStore.
- **Genuinely over the wire:** `api.ts`, `downloads.ts`, `sync.ts`, `home-shelves.ts`, `journey.ts`,
  `mastery-timeline.ts`, `analytics.ts`, `notifications.ts`.

Screens split the same way. **API-backed** (will go empty against an empty database):
`(tabs)/study/index.tsx`, `(tabs)/progress/index.tsx`, `progress/overview`, `progress/journey`,
`progress/mastery-timeline`, `progress/statistics`, `bookmarks`, `notifications`, `quiz/[id]`,
`(parent)/study-goal`. **Demo-constant-backed** (will look identical against an empty database, which
is itself the finding): `lesson/[id]`, `flashcard/[id]`, `download/[id]`, `curriculum`, `search`,
`subject/[subject]`, `result/[id]`, `certificate/[id]`, every `study/*` result screen, `quiz/review`,
`quiz/final-review`, `progress/achievements`, `progress/history`.

And the Postgres content itself was seeded *from* `study.ts` via `POST /api/admin/seed`. So:

> **There is no user journey anywhere in GoKid that creates a study set, a flashcard or a quiz
> question.** A new user cannot build content from scratch, and never could.

That is the brief's §11 finding, available on day one. But it is **not automatically a bug** —
`PLAN.md` explicitly puts "manual set creation" *out of scope for v1*, and the intended creation path
is the admin AI generator (`POST /api/admin/generate` → `lib/openrouter.ts`), not a parent-facing UI.

So the agent must classify, not just flag:

- `SEED-GAP (unintended)` — data appears that nothing can produce, and the product needs it produced.
- `SCOPE (intended)` — no creation path, correctly, per `PLAN.md`. Report as coverage, not defect.
- `DEMO-STANDIN` — a documented seam awaiting the API. Report with the swap cost and the *user-visible
  consequence* of it not being swapped.

Classification is the whole value here. An unclassified list of 40 "seed data issues" is noise.

---

## 4. Four testing tiers

The agent runs whichever tiers the environment supports and states which it ran.

### Tier 0 — Code truth (always available, fully parallel, no device)

Static analysis against the running-code reality: route graph, CRUD matrix derived from `src/db/schema.ts`
vs the API routes vs the screens, forbidden-pattern sweep (`StyleSheet.create`, inline `style={{}}`,
raw hex, `catch {}`, `@react-navigation` imports), dark-pattern sweep (streaks, leaderboards, lives,
countdowns — `ceoaudit.md` §0 found all of these shipping against the product's own brief), design-token
compliance, accessibility-label coverage, and the seed-data classification above.

**This tier alone answers a large fraction of the brief** (§10, §12 partly, §18, §19, §24, §25, §30) and
costs nothing but tokens. It is where the parallel fan-out belongs.

### Tier 1 — API probing (needs the dev server; one owner)

`npm start` serves the Expo Router API routes at `http://localhost:5062/api/*`. `curl` is a real user
agent here, so this tier does genuine testing, not inspection:

- `GET /api/health`, `GET /api/sets`, `GET /api/sets?year=Y3`, `GET /api/sets/:id`
- **IDOR:** `GET /api/progress?clientId=<someone else's child>` with a valid token. `src/db/auth.ts`
  resolves `(verified parent, clientId)` *together*, so this should return nothing. Prove it.
- **Unauthenticated access:** every `/api/progress` and `/api/quiz` call with no `Authorization` header
  must be 401, and `authenticate()` must fail closed when `CLERK_SECRET_KEY` is absent.
- **Admin routes:** `src/db/admin-auth.ts` falls open when `ADMIN_TOKEN` is unset *and*
  `NODE_ENV === "development"`. `.env` has **no `ADMIN_TOKEN`**. So `POST /api/admin/seed` and
  `POST /api/admin/generate` (which spends OpenRouter money) are plausibly callable with no credential
  on the dev server. **Verify this first** — it is the highest-severity candidate in the repo and it is
  testable in one curl.
- **The no-repeat rule:** `GET /api/quiz` must not serve a child the same question twice in 12 hours
  (`src/app/api/quiz+api.ts`). Two calls, compare id sets.
- **Sync idempotency:** POST the same session batch twice; `src/app/api/progress+api.ts` claims
  dedupe-by-client-id. Replay it and count rows with `npm run db:counts`.

Note also: `.env` contains **no `EXPO_PUBLIC_API_URL`**, confirming `docs/Report.md`'s top blocker still
stands — a release build throws at `src/lib/api.ts:19` on the first data screen.

### Tier 2 — Device, render-only (needs the simulator; strictly one agent)

What `docs/Report.md` did: `xcrun simctl openurl` per route, `xcrun simctl io booted screenshot`, read
the screenshots back, capture logs. Proves rendering, layout, clipping, safe areas, empty states (when
paired with a wiped state), and offline banners. **Does not prove any interaction.** Every finding from
this tier is labelled `RENDER-ONLY`.

### Tier 3 — Device, interactive (needs Maestro; not installed)

The tier that satisfies the brief as written: complete the §6 journey, tap Tricky/Got it, finish a quiz,
enter a passcode, fail it repeatedly, edit and delete a child, kill the app mid-quiz, verify persistence
across relaunch. Flows live in `.maestro/*.yaml` and become a permanent regression asset rather than a
one-off transcript.

**Recommendation: build the agent for tiers 0–2 now, write the Tier 3 flows as part of the same work,
and gate them on Maestro being installed.** The agent reports `NOT RUN (Maestro absent)` rather than
silently skipping.

---

## 5. Clean state — the exact procedure

The brief's §2 and §11 need a real zero state. This repo already ships the tooling, which is unusual and
worth using:

```bash
node scripts/db-inspect.mjs      # read-only inventory first — never drop blind
node scripts/db-reset.mjs        # drops only GoKid tables/enums + the drizzle journal
npm run db:migrate               # recreate empty schema
node scripts/clerk-list.mjs      # who exists, and their children, before deleting
node scripts/clerk-purge.mjs     # refuses unless CLERK_SECRET_KEY starts sk_test
xcrun simctl uninstall booted com.gokid.app   # wipes SecureStore: passcode, SRS record, downloads
```

Then the app is a genuine zero state: 0 study sets, 0 children, 0 reviews, 0 sessions, 0 downloads.

**Guard rails the agent must enforce:**

- `clerk-purge.mjs` self-guards on `sk_test`, but the agent must **still** run `clerk-list.mjs` first and
  show the user what it is about to delete. Destructive, outward-facing, irreversible → confirm.
- `db-reset.mjs` points at whatever `DATABASE_URL` says. It prints the host; the agent must read that
  host aloud and confirm before proceeding.
- Never run either without explicit approval in the same turn. Not "durable" approval — per run.

**After the reset the agent must re-seed** (`POST /api/admin/seed`) before content tests, and record
which tests ran pre-seed (the empty-database test) and which post-seed.

---

## 6. Shape of the thing: one skill, several subagents

**Not one giant agent.** The recommended shape:

```
.claude/skills/gokid-audit/SKILL.md      ← the orchestrator you invoke (/gokid-audit)
.claude/agents/gokid-qa-static.md        ← Tier 0 worker, spawned N-way in parallel
.claude/agents/gokid-qa-api.md           ← Tier 1 worker, single instance
.claude/agents/gokid-qa-device.md        ← Tier 2/3 worker, single instance, holds the simulator
.claude/agents/gokid-qa-content.md       ← curriculum + AI-content correctness, parallel, no device
.maestro/*.yaml                          ← Tier 3 flows (added when Maestro is installed)
docs/qa/<yyyy-mm-dd>/                    ← output: report, screenshots, curl transcripts, matrices
```

Why not a hook: hooks fire on tool events and must finish in seconds. A three-hour audit is not a hook.
Hooks *are* the right tool for the regression guard that keeps the audit's findings from coming back —
see [Working-Agent-Hooks.md](Working-Agent-Hooks.md). Build both; they do different jobs.

Why a skill and not a bare agent: the audit needs a documented procedure you can read, edit and re-run,
and it needs to spawn workers. A skill holds the procedure; agents hold the roles.

**Naming:** `/gokid-audit`, not `/qa` — gstack already installs `/qa` and `/qa-only` globally, and a
collision would silently shadow one of them.

**Concurrency contract (must be in the orchestrator, verbatim):**

> Exactly one agent may hold the simulator, the Metro dev server, or the database at a time. Static and
> content workers must not run `xcrun`, `curl` against localhost, or any `scripts/db-*` command.

---

## 7. Evidence rules (the part that makes it trustworthy)

Every finding carries one of:

- `VERIFIED` — with the artefact: `file.tsx:42`, a screenshot path, a curl request/response pair, or a
  `db-counts` diff.
- `INFERRED` — reasoning from code with no runtime observation. Must say what would confirm it.
- `NOT TESTABLE` — with the specific missing capability (`no Maestro`, `no billing SDK`,
  `no physical device`, `SSO needs a human`).

Forbidden: reporting a journey as passed when only its screens were deep-linked; scoring a category that
was never exercised; inventing App Store data; asserting an interaction worked because the handler exists.

The brief's §36 ("do not stop at the first bug") is right and cheap to enforce: workers collect, the
orchestrator triages. No worker is allowed to end early on a P0.

---

## 8. Categories the agent will report as NOT TESTABLE, and why

Stating these now so the final report isn't a surprise:

| Brief section | Verdict | Reason |
| --- | --- | --- |
| §14 Subscription (trial, monthly, annual, cancelled, expired, restored, failed payment) | **NOT TESTABLE** | No billing SDK exists. `src/lib/subscription.ts` returns `{status:"free"}` and documents why. Only two things are testable: that no screen claims a paid plan, and that no client-side edit can grant entitlement. |
| §15 Offline (full matrix) | **PARTIAL** | Downloads and sync are real code paths. But the iOS Simulator has no airplane-mode toggle — network loss has to be simulated by killing the dev server or using Network Link Conditioner, and "app killed during sync" needs Tier 3. |
| §20 Responsiveness — Android, landscape | **NOT TESTABLE** | `app.json` pins `"orientation": "portrait"`. No Android run has ever happened (`docs/Report.md`). |
| §21 Performance (cold launch, transitions) | **PARTIAL** | Measurable coarsely from logs and screenshot timing. No profiler is wired; Sentry performance is not configured for this. |
| §17 Accessibility (VoiceOver, Dynamic Type, contrast) | **PARTIAL** | Label *coverage* is Tier 0 and easy. Actual VoiceOver focus order and Dynamic Type reflow need a human or Tier 3 + manual passes. |
| §9 AI content quality | **FULLY TESTABLE** — and high value | The content is static text in `src/lib/study.ts` plus generated rows in Postgres. Checking every maths answer, every UK-vs-US spelling, every year-group claim is pure reading. No device needed. Best return in the whole brief. |

---

## 9. Output contract

`docs/qa/<date>/REPORT.md` follows the brief's §37 structure, with three amendments:

1. **A coverage header before the score.** Which tiers ran, how many checks were `VERIFIED` vs
   `INFERRED` vs `NOT TESTABLE`. A 100-point score is meaningless without it.
2. **The score reports N/A explicitly.** Under the brief's §33 weights, Offline/Sync (10) and much of
   Security (10) and Accessibility (5) cannot be fully earned today. The agent reports
   `Functionality 14/20 · … · TOTAL 61/85 assessed (15 points not assessable)` rather than silently
   scoring an untested category zero or full.
3. **A diff against the two prior audits** — what is now fixed, what regressed, what was stale.

Supporting artefacts alongside it: `SCREENS.md` (coverage matrix), `CRUD.md`, `SEED-DATA.md`,
`CURRICULUM.md`, `API-TRANSCRIPTS/`, `shots/`.

---

## 10. What I need from you before building

1. **Maestro — install it or not?** Without it the agent is a very good static + API auditor with a
   render-only device pass. With it, it is what your brief actually describes. (~2 minutes to install.)
2. **Is the Clerk instance safe to purge?** `clerk-purge.mjs` guards on `sk_test`, but I want you to say
   so explicitly before an agent ever runs it.
3. **Human sign-in checkpoint — acceptable?** One "Continue with Apple" tap per clean run.
4. **Scope of the first run:** full brief (long, expensive), or Tier 0 + Tier 1 first (fast, cheap, and
   likely to surface the admin-route and seed-gap findings within the hour)? My recommendation is the
   latter, then decide.
5. **Hooks now or later?** See [Working-Agent-Hooks.md](Working-Agent-Hooks.md) — the four proposed hooks
   are independent of all of the above and could be added today.
