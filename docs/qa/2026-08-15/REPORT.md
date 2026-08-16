# GoKid — QA Report, Day 2 (Tier 2 + Tier 3)

**Date:** 15 August 2026
**Supersedes:** [`../2026-08-14/REPORT.md`](../2026-08-14/REPORT.md) — read this first, then that for the static/API detail.
**Run:** device render sweep + Maestro interaction flows, non-destructive, against live state.
**Evidence:** 87 screenshots in [`shots/`](shots/), 12 reusable flows in [`.maestro/`](../../../.maestro/), worker report in [`workers/device-tier23.md`](workers/device-tier23.md).

---

## 1. What changed since yesterday

| Item | Status |
| --- | --- |
| **P0-1** migration `0004` never applied | **FIXED** — applied this session. 5 migrations, 11 tables, `/api/sets/place-value` 500 → 200. Offline download, `/api/quiz` and the admin routes are live for the first time |
| **Maestro** absent, Tier 3 impossible | **RESOLVED** — Maestro 2.8.0 + OpenJDK 26 installed. Interaction testing is now evidence-backed |
| **Tier 2/3** never run | **RAN** — 87 screenshots read back, 12 flows executed |

And the consequence of finally pressing buttons: **two new P0s that no amount of static analysis
would have found.** Both were re-verified in code by the orchestrator before being reported.

### Both are now FIXED and verified on device

| P0 | Fix | Proof |
| --- | --- | --- |
| **P0-5** quiz scoring | `getToken` moved to a ref, synced in its own effect, removed from the serving effect's deps (`quiz/[id].tsx`) | A quiz answered correctly now scores **5/5**. The same behaviour scored **1/5** before. `shots-verify/quiz-final-score.png` |
| **P0-6** session persistence | `rateCard` on each answer in `study/session/[id].tsx`; `recordSession` on the last card in `answer-result/[id].tsx`; new `lib/study-session.ts` holds the clock across the flow's screen-per-card navigation | Summary now reports **"Cards studied 6"**, Time spent 2m, Recall 100%. It reported **0** before. `shots-verify/summary-cards-studied.png` |

`npx tsc --noEmit` and `npm run lint` both clean after the changes. Two regression flows added:
`.maestro/13-verify-session-persisted.yaml` and `.maestro/14-verify-quiz-answer-mapping.yaml`.

### P0-2 and P0-3 — server-side erasure — also FIXED

The deletion gap is closed. Two new routes, both authorising off the verified Clerk token only:

- **`DELETE /api/children/:clientId`** — resolves the child by `(verified parent, clientId)` together,
  exactly as reads do, so it cannot reach another family's child. Idempotent: an unknown id returns
  `200 { deleted: false }` rather than 404, so a retry after a dropped connection cannot fail and a
  caller cannot probe which ids exist.
- **`DELETE /api/account`** — every child for the parent, plus the `subscriptions` row, which is keyed
  by `clerk_user_id` and so is *not* reached by the child cascade. It has no writer today; erasure
  must not depend on which features happen to be wired yet.

Client changes: `lib/children.ts:removeChild` calls the child route **before** touching Clerk metadata
(the metadata entry holds the only copy of the `clientId`, so removing it first would orphan the server
row beyond naming), and clears that child's local SecureStore record via a new
`lib/reviews.ts:clearChildProgress`. `delete-account.tsx` calls the account route **before**
`user.delete()`, because `user.delete()` destroys the session token that is the only thing able to
authorise the erasure — and aborts the whole deletion if it fails rather than continuing to a partial
wipe it would then describe as complete. `data-export.tsx` now fetches the server half per child and
bumps the payload to `gokid.export.v2`.

**Verification:**

| Check | Result |
| --- | --- |
| Routes registered | `DELETE /api/account` → 401 unauthenticated; `GET` → 405; `DELETE /api/children/xyz` → 401 |
| Fail closed on a bad token | `Bearer garbage.garbage.garbage` → 401, generic message |
| **Cascade genuinely erases** | Scratch child + 1 review + 1 session + 1 certificate inserted directly, then the child row deleted: dependent counts went **1/1/1 → 0/0/0**, child row gone. Jacob's and Isaac's rows untouched throughout, confirmed by `db-counts` before and after |
| Typecheck / lint | Both clean |

**Not verified end-to-end through the UI.** Driving "Add a child" with Maestro to create a throwaway
child and delete it did not complete: text never reached the name field, so the form stayed disabled
and nothing was submitted. `add-child.tsx:422-427` wires the input correctly (`value` + `onChangeText`),
which points at a Maestro/simulator keyboard-focus limitation rather than an app defect — but that is
an inference, not a result, and the in-app delete path therefore remains unproven at the UI layer.
Worth ten minutes with a human tapping it, since the alternative reading (text entry is broken on this
build) would itself be a P1: a parent who cannot type a name cannot onboard.

**One lesson from writing those flows, worth keeping.** Flow 03 hardcoded option text and now fails —
not a regression, but the 12-hour no-repeat rule working: a second run is served *different* questions
by design. Any flow that hardcodes an answer has a shelf life of 12 hours. Flow 14 tests the invariant
that actually broke instead — *the option recorded must be the option tapped* — which holds whatever
questions are served.

Note also that the quiz screen grades **in place** (the chosen row turns green, the CTA becomes "Next")
rather than showing the "Correct!" banner that belongs to study-session mode. An assertion written
against the wrong screen's wording will fail on working code.

---

## 2. P0-5 — Quiz scoring is broken. The question re-shuffles under the child's finger.

**Live proof:** a quiz was completed by selecting the objectively correct answer text for all 5
questions. It scored **1/5**. One screenshot shows "Yesterday" tapped while "Happily" is recorded as
the answer.

**Root cause, confirmed in code:** [`quiz/[id].tsx:410`](../../../src/app/\(app\)/quiz/\[id\].tsx#L410)
lists `getToken` in the serving effect's dependency array:

```ts
}, [id, set, childId, resuming, getToken, localItems.length])
```

Clerk's `useAuth()` returns a **new `getToken` closure on nearly every render**, so the effect refires
constantly. Each refire calls `fetchServedQuiz`, and `/api/quiz` deliberately re-shuffles both question
order and option order per request — by design, so a child cannot memorise an answer's position. The
two behaviours are individually correct and catastrophic together: the options are re-ordered *after*
the child has read them, so the index they tap no longer maps to what they chose.

**This was dormant until today.** `/api/quiz` was returning 500 (P0-1), so `served-quiz.ts` silently
fell back to the stable bundled list and the bug could not manifest. Fixing the migration activated it.
That is worth sitting with: the backend fix turned a hidden failure into a live one, and only an
interaction test could see it.

**Fix:** remove `getToken` from the dependency array (or wrap it in a ref), so the quiz is served once
per attempt. Then re-run `.maestro/03-quiz-practice-to-result.yaml`, which now reproduces this in ~40s.

**Severity:** P0. A child answering correctly is told they were wrong, and the wrong result is written
into the spaced-repetition engine, so it corrupts mastery data and schedules review of cards they
already knew.

---

## 3. P0-6 — "Study Session" mode records nothing at all.

Six of six questions answered correctly. The session's own summary screen reported **"Cards studied 0"**.
Every downstream progress surface showed the set as untouched.

**Root cause, confirmed by grep:** `recordSession` and `rateCard` are called from exactly two files —
[`flashcard/[id].tsx`](../../../src/app/\(app\)/flashcard/\[id\].tsx) and
[`flashcard/paused.tsx`](../../../src/app/\(app\)/flashcard/paused.tsx). The study-session flow
(`(tabs)/study/session/[id].tsx` → `answer-result` → `session-summary` → `set-result` →
`congratulations`) imports `useProgress` but only ever **reads** `cards`. It never writes.

So one of the app's two study modes is a five-screen journey that congratulates a child for work the
app immediately forgets. `ceoaudit.md` called the flashcard flow "the one honest data path" in July —
that is still literally true, and this is why.

**Fix:** call `rateCard` per answer and `recordSession` on completion from the session flow, matching
the flashcard flow's contract.

---

## 3b. P1 fixes and launch config — also done, 15 Aug

| id | Fix | Proof |
| --- | --- | --- |
| **P1-1** answer-position bias | 21 questions across 9 quizzes reordered — option positions moved, correct answer text untouched | `scripts/check-answer-bias.mjs` → **0 biased of 27**. Independent re-check of all **135 questions against a pre-edit snapshot: 0 correct answers changed** |
| **P1-2** strand mismatch | New optional `StudySet.strand` + `strandOf()`; analytics, search and curriculum all route through it; 5 missing statutory strands added; `"Animals and humans"` → `"Animals, including humans"` | `scripts/check-strands.mjs` → **0 unmatched of 27** (was 10) |
| **P1-3** quiz illustrations silent to VoiceOver | `illustrationAlt` on both question types, carried through `quizItems`, rendered with `accessibilityRole="image"` at all 5 call sites | Alts authored for all 6 illustrated questions; missing-alt case states that a description is missing rather than staying silent |
| **P1-5** generation prompt | British-English mandate (spelling, terminology, currency, measures, dates) + correct-answer-position spread constraint in `systemPrompt()` | Source; no generated batch produced yet to measure against |
| Launch config | `eas.json` created; `ios.buildNumber`; `android.versionCode`; `ITSAppUsesNonExemptEncryption: false`; **`RECORD_AUDIO` removed** (verified: no audio API anywhere in `src/`) | Both JSON files parse; `tsc` + lint clean |

**The strand bug was three times larger than the audit reported.** The Rec–Y2 content worker found 4
mismatches inside its own scope; a checker written against all 27 sets found **10**, including
`place-value`, `human-skeleton` and `capital-cities`. That is the argument for turning an audit finding
into an executable check rather than a fix list: the fix list covers what was looked at, the check
covers everything.

Two new permanent guards, both exit non-zero on regression:
`scripts/check-strands.mjs` and `scripts/check-answer-bias.mjs`.

`docs/DEPLOY.md` records what remains of P0-4 — the parts that need your credentials — including the
EAS-Hosting-is-workerd-not-Node constraint from `PLAN.md`, and four verification curls of which two
assert that something must **fail** (progress must 401; admin seed must 401 without the token).

## 3c. Incident: a test worker modified real child data

**What happened.** Between 09:22 UTC screenshots, a child's avatar changed from 🐻 to 🐨 in the live
Clerk record. Jacob K is a real profile belonging to the operator, not test data. Name, year group,
tint, birth month/year and the sibling record were all unaffected; nothing was deleted.

**Cause — a briefing error, not an agent going rogue.** Workers were told not to *delete* Jacob or
Isaac. They were never told not to *modify* them, and one worker was legitimately minting real Clerk
session tokens to exercise authenticated write paths. A read-modify-write of `unsafe_metadata` is the
likely mechanism.

**Resolved.** The avatar was restored to 🐻 via a targeted `PATCH` of the children array, with
before/after JSON captured to prove every other field is byte-identical.

**The lesson worth keeping.** "Don't delete X" is not a sufficient instruction for an agent holding
write credentials to production-shaped data. The rule for future runs is *"treat every real record as
read-only; create your own fixtures and delete them"* — which is what the fixture-based workers
(scratch DB rows, throwaway Clerk users) already did correctly, and the reason their cleanup was
provable.

## 3d. Avatar presentation

While restoring the avatar, a genuine inconsistency surfaced. `ChildAvatar` hardcoded its disc to
`bg-subject-geography` — the Geography subject's teal. Nothing about a child is geographical; it was
an arbitrary colour, and it meant seven screens (study index, session summary, calendar, overview,
children, parent content, parent analytics) drew a teal disc behind children whose own colour was
sage or blush, while `home.tsx` and `add-child.tsx` passed `bg-transparent` and looked right.

A per-child colour system already existed (`CARD_TINTS` / `washFor`) and this component simply was not
using it. `ChildAvatar` now takes a `wash` prop and every call site with a child passes
`washFor(child)`, so a child's colour is the same wherever they appear. Verified on device: Jacob's
bear on sage, Isaac's rabbit on blush, matching their who's-studying cards.

## 4. Resolved: the stray gear icon

`docs/Report.md` §3 Defect 2 (17 July) described a translucent gear overlaying unrelated screens,
including the passcode gate, with two hypotheses tested and both disproven. It was left open with an
explicit "change no code on this evidence".

**It is `expo-dev-menu`'s own overlay** — this is a Debug dev-client build. Not a product defect, and
the July decision not to touch code was correct.

One real consequence: it sits above the UI and **can swallow taps meant for real controls** — confirmed
live when it hijacked a tap intended for the Download button. Anyone doing manual QA on a dev-client
build should know that a "dead" top-right control may be the dev menu eating the tap. It will not exist
in a release build.

---

## 5. Confirmed by tapping (previously static-only claims)

| Claim (source) | Result |
| --- | --- |
| `session-summary/[id].tsx:53` "View all" is an unpressable `<Text>` | **CONFIRMED** — tapped, nothing happens, and it isn't even a `Pressable` |
| `progress/subject/[subject].tsx` "View all" empty handler | **CONFIRMED** — tapped, dead |
| Answer-position bias | **CONFIRMED live** — two demo sets are 100% position A; the pool skews 53% to B |
| `nextSetId()` wraps at curriculum end | **CONFIRMED, and worse than described** — it wraps a **Year 4 child into Year 3 content**, so the "next set" suggestion actively regresses the child's year group |
| Parent gate intercepts a cold deep link | **VERIFIED end-to-end**, plus background re-lock |
| Downloads land on disk correctly | **VERIFIED** — JSON present, cards in `position` order, quiz included |
| `/parent-content` shows demo children (ceoaudit) | **FIXED** — shows the real children |
| Tab-bar clearance (`pb-35`) | **VERIFIED visually** — previously only a grep result |
| Application-level errors in logs | **None.** All log noise is simulator platform noise |

Cold launch 4.8–5.5s — a dev-client Debug build, not representative of release. Minor text truncation
on the download screen.

---

## 6. Revised score

Tier 2/3 unlocked 38 previously unassessable points. The new P0s cost more than the migration fix gained.

| Category | Assessed | Score | Change |
| --- | --- | --- | --- |
| Functionality | 20 / 20 | **9** | Endpoints fixed, but two core journeys proven broken by hand |
| UX / UI | 15 / 15 | **11** | Renders well; visual clipping fix confirmed |
| Data Integrity | 15 / 15 | **4** | Two deletion P0s stand; session mode writes nothing |
| Curriculum | 10 / 10 | **5** | Unchanged |
| AI Quality | 8 / 10 | **3** | Pipeline now functional but unexercised |
| Security | 8 / 10 | **6** | Parent gate verified live; IDOR still unproven |
| Offline / Sync | 6 / 10 | **4** | Download verified on disk; server-down tests not run |
| Performance | 4 / 5 | **2** | Dev-build only |
| Accessibility | 4 / 5 | **1.5** | Quiz illustrations confirmed unlabelled in code |
| Error Recovery | 4 / 5 | **2** | Unchanged |
| **TOTAL** | **94 assessed** | **47.5 / 94** | 6 points still not assessable |

---

## 7. The final question, re-answered

> **"Could a new parent use the entire product without developer intervention?"**

**NO — and now the answer is evidence-backed rather than inferred.** Yesterday's answer rested on
deployment gaps. Today's rests on two demonstrated failures of the core learning loop: a child who
answers correctly is scored wrong, and one of the two study modes forgets everything the child did.

`EXPO_PUBLIC_API_URL` and the deletion P0s remain unchanged from yesterday.

---

## 8. Fix order (revised)

1. ~~**P0-5** quiz scoring~~ — **DONE**, verified 5/5 on device.
2. ~~**P0-6** session persistence~~ — **DONE**, verified "Cards studied 6" on device.
3. ~~**P0-2 + P0-3** server-side erasure~~ — **DONE**, cascade proven 1/1/1 → 0/0/0. UI path still
   unproven (see above) — confirm with a human tap before calling the GDPR exposure closed.
4. ~~**P1-1 / P1-5**~~ — **DONE**, 0 biased of 27, prompt constrained.
5. **P0-4** — deploy the API, set `EXPO_PUBLIC_API_URL`. **The last remaining P0, and the only one
   that cannot be done from this repo.** See `docs/DEPLOY.md`.
6. Remainder per yesterday's §6 — notably `report-card+api.ts` (unauthenticated write),
   `POST /api/progress` runtime validation, the two dead "View all" controls, and the objectives that
   describe content no set teaches.

---

## 9. State changed by this run

- **Parent passcode set to `1234`** — none existed before. Change or clear it.
- **Jacob K has real recorded flashcard and quiz progress** from testing. Isaac K untouched.
- No child deleted, no sign-out, database and Clerk otherwise untouched, dev server untouched.

## 10. Still not run

- **Offline behaviour with the API unreachable** — needs the operator's dev server stopped.
- **Child deletion / last-child deletion** — the worker was barred from touching Jacob or Isaac.
- **Empty-database first-run journey** — needs the destructive clean state, deliberately deferred.
- **IDOR, sync dedupe, last-write-wins, 12-hour no-repeat** — need a second Clerk identity.
- **Live VoiceOver** — no accessibility inspector reachable from the CLI; the missing
  `accessibilityLabel` on quiz illustrations was confirmed in code instead.
