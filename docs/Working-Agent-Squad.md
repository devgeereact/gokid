# Working-Agent — Squad briefs

Companion to [Working-Agent.md](Working-Agent.md). This maps your Agents A–J onto workers that can
actually run here, with the concrete files, commands and endpoints each one owns.

Your ten agents collapse to **six workers**, because three of them (A, B, D — onboarding, child
learning, parent zone) all need the same single simulator and must run in sequence, not parallel. They
become one device worker with three scripted passes.

| Your brief | Worker | Tier | Parallel? | Needs |
| --- | --- | --- | --- | --- |
| E (CRUD), G (UI/UX), part of H, §19, §24, §25 | `qa-static` | 0 | ✅ fan out 4–6 ways | nothing |
| H (security), part of E, part of F | `qa-api` | 1 | ❌ single | dev server + `.env` |
| A, B, D, I (mobile/responsive), part of G | `qa-device` | 2/3 | ❌ single, holds the simulator | booted sim + dev build |
| C (curriculum), §9 (AI quality) | `qa-content` | 0 | ✅ fan out by subject/year | nothing |
| F (offline/sync) | `qa-offline` | 1+2 | ❌ shares device with `qa-device` | sim + dev server |
| J (performance) | folded into `qa-device` | 2 | — | logs + timings |

---

## qa-static — code truth

**No device, no network, no database. Fully parallel — split by concern, not by folder.**

### Route & navigation graph (§12)
Build the reachability graph over `src/app/**`. `docs/Report.md` did this once: 59 routes, 0 broken
links, 0 dead screens. **Re-run it and diff** — the tree has grown since (72 route/lib files now).
Every `href`, `router.push`, `router.replace` target must resolve against a real route pattern including
dynamic segments. Flag: unreachable screens, targets that don't exist, and — new — screens reachable only
by deep link with no in-app entry point.

### CRUD matrix (§10, §30)
Three sources must be reconciled per entity, and the interesting findings are the disagreements:

- **DB:** `src/db/schema.ts` — `curriculumObjectives`, `studySets`, `cards`, `quizQuestions`, `children`,
  `reviews`, `questionImpressions`, `sessions`, `certificates`, `subscriptions`, `cardReports`.
- **API:** `src/app/api/*+api.ts` — which verbs actually exist per table.
- **UI:** which screen performs which operation.

Known shape to confirm: `subscriptions` and `certificates` have full schemas with **no write path from
the product**; `cardReports` exists — find out whether any screen can file one. `children` is the only
entity with a real create/update/delete UI, and it writes to **Clerk metadata, not the `children`
table** — the DB row is created lazily by `src/db/auth.ts:childFor` on first sync. That split is a
genuine data-integrity question: what happens to the DB row when a child is deleted on the device?

### Design-system & UX-principle sweep (§18, §19)
- Token compliance: any raw hex, any `p-[13px]`-style arbitrary value, any `StyleSheet.create`, any
  inline `style={{}}`. `AGENTS.md` §2 forbids all four.
- Palette check against §18's list — but read `tailwind.config.js` first, which is the real source
  (76 documented tokens) and may legitimately differ from the values in your brief.
- **Dark patterns (§19):** grep for `streak`, `leaderboard`, `lives`, `hearts`, `countdown`, `points`,
  `level`. `ceoaudit.md` found a 5-day streak flame, a "7-Day Streak" badge, "Best streak: 9", points,
  levels and a "View leaderboard" banner shipping — against the product's own written rejection of
  exactly those mechanics. **Verify whether that is still true.** If it is, it is the single most
  important product finding in the audit, and it is free to check.
- Tab-bar clearance: every screen pushed onto a tab Stack needs `pb-35` (140px,
  `tailwind.config.js:58`). Root tab screens use `pb-6`. `docs/Report.md` listed 12 offenders at
  `pb-28`/`pb-10`/`pb-8`; re-check all of them plus any screen added since.

### Accessibility coverage (§17, static half)
Pressable count vs `accessibilityLabel` count, per file. `ceoaudit.md` measured 161/167. Find the
missing ones and check whether the child-facing screens are the gap. Also: touch-target sizes from the
class names, and any text under the readable minimum.

### Honesty audit (the codebase's own principle)
`CLAUDE.md` states the design-honesty rule: a screen must not present a control that cannot do what it
implies. Find every control wired to a no-op, an empty handler, or `router.back()` dressed as an action.
`ceoaudit.md` found `/progress/achievements` where "every control is a noop" and
`/progress/subject/[subject]` "always shows Maths regardless of slug". Re-verify both.

Also verify the standing claim in `src/app/data-usage.tsx` — that there is no ad SDK, no analytics SDK,
no third-party tracker — against the current `package.json`. It is user-facing copy and it becomes a
false statement to parents the moment a dependency lands.

---

## qa-api — the highest-signal worker

**Owns the dev server. Runs alone. Every request and response saved to `API-TRANSCRIPTS/`.**

Start with `npm start` (port 5062) and confirm `GET /api/health`.

### 1. Admin routes — do this first
`src/db/admin-auth.ts` opens the route when `ADMIN_TOKEN` is unset **and** `NODE_ENV === "development"`.
`.env` has no `ADMIN_TOKEN`. Test:

```bash
curl -i -X POST http://localhost:5062/api/admin/seed
curl -i -X POST http://localhost:5062/api/admin/generate -d '{...}'   # spends OpenRouter credit
```

If these succeed with no credential, that is the severity ceiling of the audit — and note that the
same file is what will guard the **deployed** server, where `NODE_ENV` may not be exactly `"production"`
on a preview deploy. The comment in that file anticipates precisely this; confirm the anticipation holds.
Do **not** loop `/api/admin/generate` — one call, it costs real money.

### 2. Authorisation on child data (§16, IDOR)
`src/db/auth.ts` resolves `(verified parent, clientId)` together. Prove it, don't assume it:

- no header → 401 on `/api/progress` and `/api/quiz`
- malformed/expired token → 401
- valid token from parent P1 + `clientId` belonging to P2's child → must find nothing, must not 200 with
  data, must not create a row for P1 named after P2's child
- valid token, child id that exists nowhere → check whether `childFor` silently *creates* a child
  (it creates on first sync by design — confirm that cannot be abused to write into another family)

### 3. Content API
`GET /api/sets`, `?year=Rec` … `?year=Y6`, `/api/sets/:id` for a real id, a nonexistent id, and a
malformed id. Check card/quiz counts against `npm run db:counts`. The counts in this route were
previously wrong (correlated subquery returning 0 — see the comment in `sets+api.ts`); confirm the fix.

### 4. The no-repeat quiz rule
`GET /api/quiz?setId=&clientId=&count=` must not repeat a question inside 12 hours, must reshuffle
options, must serve only `published` questions, and must fall back to oldest-seen when the pool is
exhausted. Call it repeatedly for one child and compare id sets; then check `questionImpressions` rows.
Also confirm `MAX_COUNT` (20) is enforced against `count=999`.

### 5. Sync integrity
POST the same `/api/progress` batch twice and count `sessions` rows — dedupe by client id is claimed.
Then POST two conflicting reviews of one card with different `lastReviewedAt` and confirm last-write-wins
by timestamp, not by arrival order.

### 6. Release-build blocker
Confirm `EXPO_PUBLIC_API_URL` is still absent (it is, as of today) and that `src/lib/api.ts:19` throws
without it. This is `docs/Report.md`'s P0 and it stays P0 until a server is deployed.

---

## qa-device — one worker, three passes

**Holds the simulator (`iPhone 17 Pro`, iOS 26.5, currently booted). Never runs in parallel with itself.**

Build/install per `CLAUDE.md` (never `CODE_SIGNING_ALLOWED=NO` — that empties entitlements, breaks the
Keychain with `OSStatus -34018`, and hangs the app on the splash forever while Clerk never loads).

### Pass 1 — empty state, immediately after the clean-state reset
This is the brief's §11, and the most valuable pass. With 0 children, 0 DB rows and the app freshly
installed: every API-backed screen should show a real empty state, and every demo-constant screen will
show content anyway. **Both outcomes are findings.** Screenshot every route in both categories (the
lists are in [Working-Agent.md](Working-Agent.md) §3).

Specifically watch for: a spinner that never resolves, a "0 of 0" that reads as broken rather than new,
a progress ring at 0% with no explanation, and any screen that offers a next action which cannot succeed.

### Pass 2 — first-run journey (§6)
Sign-in checkpoint (human tap), then add a child, then the full flow. **Tier 2 can only deep-link and
screenshot; Tier 3 (Maestro) can actually tap.** Report each step with its tier.

Boundary cases worth scripting into the Maestro flows because they are cheap and revealing: Reception
and Year 6 at the ends of the year-group list, a one-character name, a 200-character name, emoji in a
name, whitespace-only name, duplicate child names, and birth year at both ends of whatever the picker
permits (§13).

### Pass 3 — multi-child isolation (§7)
Two children, different year groups (Y3 and Y1). Then attempt leakage: complete a session as child A,
switch to B, and check every progress surface, the recommendation shelves, downloads, and the parent
dashboard. `src/lib/reviews.ts` keys storage per child — verify the key is actually applied on every
read path, not just the write path. `ceoaudit.md` found `/parent-content` showing *demo* children rather
than the real ones; re-check.

Also: delete a child with progress, and delete the *last* child. What happens to `active-child`? What
does the DB row do? Where does the app land?

### Folded in: performance (§21) and responsive (§20)
Cold-launch and warm-launch timings from `xcrun simctl launch` output and log timestamps; screen-to-screen
timing from screenshot sequences. Responsive testing is limited to iPhone sizes in portrait — `app.json`
locks orientation and there is no Android build. State that rather than pretending.

---

## qa-content — curriculum and AI quality (§8, §9)

**No device. Pure reading. Fan out by year group or subject. Best value-per-token in the audit.**

Sources: `src/lib/study.ts` (27 sets, ~160 cards, Rec–Y6, `yearCode` matching the add-child screen),
`src/lib/subjects.ts` (10 subject hubs and their curriculum strands), `src/lib/curriculum.ts`, plus the
generated rows in Postgres (`quiz_questions`, including `draft` and `rejected` ones, which a child must
never see but which reveal what the generator produces).

Check every item for:

- **Answer correctness.** Recompute every maths answer independently. Verify every science, geography and
  history fact. Check English grammar/spelling/punctuation questions are themselves correct.
- **Answer-index integrity.** `answer` indexes `options`; `answers` (multi) must be a valid, complete set.
  An off-by-one here marks a right answer wrong and is invisible in review.
- **Ambiguity.** More than one defensible answer, or none.
- **UK-ness.** American spelling (`color`, `math`, `center`), American terminology (`grade`, `elementary`,
  `fall`), US-centric geography/currency/measures. This is the product's differentiator.
- **Year-group fit.** Content labelled Y1 that requires Y4 knowledge, and vice versa. Cross-check the
  strand names in `subjects.ts` against the real UK National Curriculum programmes of study.
- **Duplication.** Same question in two sets; same card twice in one set; the same distractor pattern
  repeated so often the answer becomes guessable.
- **Tone.** Patronising, shaming, or age-inappropriate phrasing. The product brief rejects shame-based
  messaging (§19) and that applies to explanation copy too.
- **Coverage gaps.** Which year groups and subjects have no sets at all. `ceoaudit.md` saw a 42% coverage
  ring on `/curriculum`; find out what the missing 58% is and whether the ring is computed or authored.

Output a per-item table with `set id · card/question id · issue · severity · corrected value`, so fixes
are mechanical.

---

## qa-offline — downloads and sync (§15)

Shares the device with `qa-device`; runs after it, never beside it.

`src/lib/downloads.ts` writes a set as JSON under `Paths.document/downloads` from `GET /api/sets/:id`.
There is no media to fetch, so "downloaded" is binary — which makes verification easy: after a download,
the file must exist, parse, and contain cards in `position` order plus the quiz.

Test matrix that is actually reachable:

- download a set, kill the dev server, relaunch the app, open the set — content must come from disk
- download with the server already down — must fail visibly, not silently mark the set available
- storage: fill or simulate a write failure, confirm the failure surfaces
- delete a download, confirm the file goes and the UI agrees
- study offline, reconnect, `useSync()` (push-then-pull, `src/lib/sync.ts`) — then confirm server-side
  with `npm run db:counts` that the sessions arrived exactly once
- interrupt sync mid-flight (kill the server between push and pull) and confirm the app reports failure
  rather than reporting success — `sync.ts` is explicit that a silently-failed sync is the exact way a
  parent comes to believe their child's progress is backed up when it is not

Not reachable without Tier 3: app killed mid-sync, and true airplane-mode transitions.

---

## Triage and reporting

Workers **collect**; they do not rank. The orchestrator dedupes, assigns P0–P4 per the brief's §28
severity ladder, and writes the report. Two orchestrator-only jobs:

1. **The stale-audit diff.** Every claim in `ceoaudit.md` and `docs/Report.md` gets one of: `STILL TRUE`,
   `FIXED (evidence)`, `REGRESSED`, `WAS WRONG`.
2. **The two final questions (§35).** Answered explicitly, with the tier that supports the answer. If
   Tier 3 never ran, the honest answer to "could I use the entire product without developer
   intervention?" is `UNKNOWN — render-verified only`, and the report must say so rather than guessing.
