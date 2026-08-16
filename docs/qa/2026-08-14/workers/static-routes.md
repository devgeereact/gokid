# Static Route & Navigation Graph Audit — 2026-08-14

**Auditor:** Tier 0 static auditor (qa-static / concern #1 — route & navigation graph)
**Scope:** `src/app/**`, every `router.push`/`router.replace`/`router.navigate`/`router.setParams`/
`router.back`/`router.dismissTo`/`<Redirect href>` call, resolved against the actual file-based route
tree, including dynamic segments and their query params.

**Method.** Read-only. Enumerated every screen file under `src/app` (excluding `_layout.tsx`, `+api.ts`,
`+not-found.tsx`) to build the canonical set of resolvable paths, then grepped every navigation call
site (170 `router.*` call sites, 277 lines of context) and every `href=` / `<Redirect>` target, and
cross-checked each target string against the canonical set. For every dynamic (`[id]`/`[subject]`)
route, read the target screen's `useLocalSearchParams` usage to confirm the params sent are the params
consumed, and confirm the "not found" fallback behaviour. Corroborated with `npx tsc --noEmit` (clean —
`typedRoutes` statically rejects any `pathname` literal that doesn't match a real route, which is
independent evidence no dead/broken literal path string exists in the codebase). `npm run lint` was
attempted twice and did not return within 150s (no output after the env-export banner); not used as
evidence either way — flagged as NOT TESTABLE rather than assumed clean.

**Constraint compliance:** no `xcrun`, no `curl`, no `scripts/db-*`, no simulator/device interaction.
Everything below is static analysis; where the finding depends on runtime behaviour I have said so and
named the observation that would confirm it.

---

## Findings table

| id | severity | area | file:line | status | claim | evidence | recommended fix |
|----|----------|------|-----------|--------|-------|----------|------------------|
| RT-01 | P4 | Route graph — headline metric | (whole tree) | VERIFIED | Route count is unchanged from `docs/Report.md`'s 20 July figure: **58 screen routes + `+not-found` = 59**, same as reported. `git log` shows only one file added to `src/app/**` since (`api/admin/questions+api.ts`, an API route, not a screen) — no new screens shipped. | Full enumeration of `src/app/**/*.tsx` minus `_layout.tsx`/`+not-found.tsx` = 58 files (counted directly); `git log --diff-filter=A --since=2026-07-20 -- src/app` = 1 new file, non-screen. | None — informational. Report.md's premise ("the tree has grown since") does not hold for the screen graph; it grew in *behaviour* (quiz flow rewired, no-repeat serving) not in *shape*. |
| RT-02 | P4 | Route graph — broken links | (whole tree) | VERIFIED | **0 broken links.** Every `router.push`/`replace`/`navigate` target and every `<Redirect href>` resolves to a real screen file. Every dynamic-segment call site sends params the target screen actually reads (`id`, `subject`, `year`, `period`, `mode`, `start`, `answers`, `score`, `index`, `gotit`, `tricky`, `seconds` all traced end to end). | Manual trace of all 55 distinct string/`pathname` targets used across 170 call sites (script output in reasoning below) plus clean `npx tsc --noEmit` (typedRoutes rejects unresolvable path literals at compile time). | None. Report.md's "0 broken links" claim is **STILL TRUE**, now on a stronger evidence base (full static trace + type-checked path literals, vs the prior session's 22-route deep-link sweep). |
| RT-03 | P4 | Route graph — dead screens | (whole tree) | VERIFIED | **0 dead screens.** Every one of the 58 screens has at least one in-app inbound reference (`router.push`/`replace`/`navigate`, a `<Redirect href>`, or is a native-tab root reached by the tab bar itself). Only genuine tab root with zero explicit "go to" call is `/progress` (`(tabs)/progress/index.tsx`) — expected, since tab roots are reached by tapping the native tab, not a JS push, exactly like `/study` and `/parent` (which happen to *also* have explicit shortcut pushes elsewhere). | Reachability script: `grep -rl '"<route>"' src` per route, all ≥1 except the expected tab-root case. | None. Report.md's "0 dead screens" claim is **STILL TRUE**. |
| RT-04 | P3 | Param validation, dynamic routes | 20+ files, e.g. `src/app/(app)/lesson/[id].tsx:75`, `.../certificate/[id].tsx:43`, `.../result/[id].tsx:43`, all `study/*/[id].tsx` guards | VERIFIED | Every `[id]`-keyed screen validates its param and, on a miss, `Redirect`s to `/home` rather than rendering broken state — a deliberate, consistent pattern, though it is `Redirect href="/home"` rather than `+not-found`. Two screens (`subject/[subject].tsx:187`, `progress/subject/[subject].tsx:132`) go further and render an in-app `EmptyState` ("Subject not found" / "Child not found") instead of silently falling through to the wrong subject's data. | Read every dynamic-route file's guard clause; grep confirms the pattern is uniform. | None required — this directly answers the audit's ask ("a bad `[id]` that lands on a broken screen rather than `+not-found`") and the answer is negative: no dynamic route in this app can land on a broken/blank screen from a bad param. Worth noting the pattern is `/home`, not `+not-found` — a debatable but consistent, deliberate choice (see reasoning). |
| RT-05 | P3 | Notification tap has no route wiring | `src/lib/reminders.ts:65-88`, `src/lib/notifications.ts` (whole file), grep of whole repo for `addNotificationResponseReceivedListener` | VERIFIED (code); INFERRED (runtime effect) | `reminders.ts` genuinely schedules a real OS local notification via `expo-notifications` (`scheduleNotificationAsync`, daily trigger) — this is live, not a stand-in. But **no code anywhere registers a notification-response listener** (`addNotificationResponseReceivedListener` / `useLastNotificationResponse` — zero hits repo-wide). A parent who taps "Time to study?" on the lock screen is not routed to `/study` or anywhere specific; the app just cold/warm-opens through the normal `index.tsx` entry fork. | `grep -rn "addNotificationResponseReceivedListener\|NotificationResponse" src` → no results; `reminders.ts:68-82` shows a real `scheduleNotificationAsync` call. | Runtime confirmation would require actually delivering a local notification and tapping it on a device/simulator — explicitly out of scope for this audit (no `xcrun`). Recommended fix: register a response listener and route to `/study` (or the studying child's next-due set) on tap — the notification implies a destination it doesn't deliver. |
| RT-06 | P3 | Stale comment about `expo-notifications` (STILL TRUE vs Report.md) | `src/lib/notifications.ts:12`, `src/app/(app)/notifications.tsx:24` | STILL TRUE | Report.md (20 July) flagged `notifications.ts:12` as a stale comment claiming `expo-notifications` "is not installed," when it is (`package.json:25`, `~57.0.6`) and is actively used by `reminders.ts`. The comment is unchanged, and a second copy of the same false claim now exists at `notifications.tsx:24`. | `grep -n "expo-notifications" package.json` → present; `grep -rn "is not installed" src` → two hits, both false as written. | Fix both comments to describe the real split: `notifications.ts` is the *in-app feed* (still derived, not scheduled) while `reminders.ts` is the *actual* local-notification scheduler. The current wording makes a false claim about the whole notifications subsystem, not just the one module it was written for. |
| RT-07 | P4 | `/welcome` and `/intro` are Redirect-only, no menu path back to them | `src/app/index.tsx:31,37`; `src/app/(app)/welcome.tsx`; `src/app/intro.tsx` | VERIFIED (by design, not a defect) | These two screens have exactly one inbound reference each, both `<Redirect>` from the root entry fork, gated on one-time flags (`intro.seen`, `welcome.seen` + new-account check). No settings row or button re-opens either once dismissed. | Reachability script + `CLAUDE.md`'s documented entry-fork description matches the code exactly. | None — this is the intended, documented onboarding design (`CLAUDE.md` "Two distinct gates" / entry-fork section), not an orphaned screen. Included here only to distinguish it from a genuine dead screen, since a shallower reachability check could misclassify it. |
| RT-08 | P4 | `nextSetId` wraps around at the end of the curriculum | `src/lib/study.ts:1214-1217`; called from `result/[id].tsx:53` and `congratulations/[id].tsx:88` | VERIFIED | "Next set" on the last set in `STUDY_SETS` wraps (`% STUDY_SETS.length`) back to the first set rather than terminating the sequence or picking a genuinely-next unlearned set. Not a broken link (it always resolves to a valid `lesson/[id]`), but the *journey* has no real "end of curriculum" state — a child who finishes the last set is silently sent back to set #1 with no acknowledgement that they finished everything. | Read `nextSetId` implementation directly. | Low priority given curriculum size (this only bites a child who has completed every set), but if that is reachable in practice, consider a distinct "you've completed the curriculum" terminal state instead of a silent wrap. |
| RT-09 | P4 | Two-tier parent entry (`/parent` door → `/parent-content` dashboard) is intentional, not a duplicate screen | `src/app/(app)/(tabs)/parent.tsx`, `src/app/(app)/(parent)/parent-content.tsx` | VERIFIED (by design, not a defect) | `/parent` (native tab root) renders no sensitive data and only a single "Enter parent area" button to `/parent-content`, which lives inside the passcode-gated `(parent)` group. This looks like two competing "parent home" screens at first grep pass; it is a deliberate security fix (documented in the file's own comment) so a child glancing at the Parent tab cannot read plan/renewal data through a dimmed overlay. | Read both files; comment in `parent.tsx:10-19` states the rationale explicitly. | None — flagged only to pre-empt a false "duplicate/dead screen" finding. |
| RT-10 | P4 | `npm run lint` did not complete within 150s | n/a | NOT TESTABLE | Could not independently confirm lint-clean status for route-adjacent files. Two runs (100s, 150s) printed only the env-export banner and returned no pass/fail output before timeout. | Direct command output — see reasoning. | Another worker/session should re-run `npm run lint` with a longer timeout or diagnose why it doesn't return; not attributable to routing code from this evidence alone. |

---

## Reasoning by topic

### 1. Rebuilding the canonical route set

Enumerated every file under `src/app` that is a real screen (58, excluding `_layout.tsx` ×7,
`+not-found.tsx`, and the 8 `api/**/+api.ts` files, which are server routes, not navigable screens).
Mapped each to its URL pattern per expo-router's route-group stripping rules (`(app)`, `(auth)`,
`(tabs)`, `(parent)` are path-transparent). This reproduces Report.md's headline "59 routes" (58
screens + `+not-found`) exactly — the tree has not grown in screen count since 20 July, only in
per-screen logic (confirmed via `git log --diff-filter=A --since=2026-07-20 -- src/app`, which shows a
single new file, and it's an API route: `src/app/api/admin/questions+api.ts`).

### 2. Resolving every navigation call site

Collected all 170 `router.push`/`replace`/`navigate`/`back`/`canGoBack`/`setParams`/`dismissTo` call
sites and all `<Redirect href>` sites (24), then reduced to 55 distinct path targets (some routes are
targeted from many call sites, e.g. `/home` from 22 files, `/study` from 14). Every target string
matches a file in the canonical set built in step 1. This is corroborated by a structurally
independent check: `npx tsc --noEmit` is clean, and with `typedRoutes` on (`app.json`), expo-router
generates a union type of every valid `pathname` literal — a `router.push({ pathname: "/typo/[id]" })`
would fail to compile. A clean typecheck is therefore direct (not inferred) evidence against the
"broken literal route string" class of defect across the whole codebase, not just the sites this audit
happened to read.

What a clean `tsc` does **not** catch: whether the *params* sent match what the target screen expects
at runtime (typedRoutes types extra params loosely). That half was done by hand — reading
`useLocalSearchParams<...>()` in every dynamic-route target and matching it against every caller's
`params: {...}` object. All matched: `curriculum.tsx` (`year`, `subject`) ↔ every caller;
`calendar.tsx` (`period`) ↔ `overview.tsx`/`parent-analytics.tsx`; `quiz/[id].tsx`
(`mode`, `start`, `answers`) ↔ `instructions`, `final-review`, `review`; `result/[id].tsx`
(`score`, `answers`) ↔ `quiz/[id].tsx`/`final-review/[id].tsx`; `flashcard/paused.tsx`
(`id`, `index`, `gotit`, `tricky`, `seconds`) ↔ `flashcard/[id].tsx`; `search.tsx` (`q`, `subject`) ↔
`subject/[subject].tsx`; `add-child.tsx` (`id`, edit mode) ↔ `children.tsx`.

### 3. Dead screens / deep-link-only screens

A screen is only truly "dead" if nothing in the app — including native tab triggers — can reach it. I
ran a reachability count (`grep -rl '"<route>"'` per canonical route) and the only 0-hit result is
`/progress`, the Progress tab's own root — which is reached by tapping the native tab, not by a JS
`router.push`, exactly analogous to `/study` and `/parent` (both tab roots that happen to *also* get an
explicit shortcut push from elsewhere, which is why they don't show as 0). This is not a defect.

Two screens (`/welcome`, `/intro`) are reachable *only* via the root `<Redirect>` fork in
`src/app/index.tsx`, with no menu item pointing at them. This is correct, deliberate onboarding design
(documented in `CLAUDE.md`'s "entry fork" section and in `welcome.tsx`'s own header comment) — flagged
here (RT-07) only so it isn't mistaken for an orphan by a shallower grep-only pass; it is not counted as
a defect.

Every other screen has ≥1 concrete UI element (a `Pressable`/`Row`/`EmptyState` action) confirmed by
reading the call site, not just counting string occurrences — e.g. `/flashcard/paused` is reached from
`flashcard/[id].tsx`'s `pause()` handler wired to an actual "Pause" button in the exit-confirmation
alert, not a stray reference in a comment.

**Conclusion: Report.md's "0 dead screens" is STILL TRUE**, and now backed by an exhaustive rather than
sampled method (the prior session swept 22 of 59 routes by deep link; this audit traced all 58).

### 4. Param validation on dynamic routes

The audit brief specifically asks whether a bad `[id]` "lands on a broken screen rather than
`+not-found`." Read every one of the 14 dynamic-segment screens
(`lesson`, `flashcard`, `flashcard/paused`, `quiz`, `quiz/instructions`, `quiz/review`,
`quiz/final-review`, `result`, `certificate`, `download`, `subject`, `progress/subject`, `child`,
`study/session`, `study/answer-result`, `study/session-summary`, `study/set-result`,
`study/congratulations`). Every one guards its lookup and fails to a **known-good** state:

- Most (`lesson`, `flashcard`, `quiz`, `result`, `certificate`, `download`, `study/*`) fall back to
  `<Redirect href="/home" />` — never `+not-found`, but never a blank/crashing screen either.
- Two (`subject/[subject].tsx:187`, `progress/subject/[subject].tsx:132`) go further and render an
  honest in-app `EmptyState` ("Subject not found") rather than a full redirect, and explicitly guard
  against the worse failure mode of silently rendering a *different* subject's data under the wrong
  heading (the code comments call this out as a fixed prior bug — "the `!subj` guard catches `""`
  ... not silently render Maths under the generic heading").
- `flashcard/paused.tsx` additionally clamps every numeric param (`index`, `gotit`, `tricky`,
  `seconds`) with a `clamp()` helper and a comment noting "Deep-link params are unvalidated strings —
  `Number("")` is 0 but `Number("x")` is NaN" — this is the most defensive param handling in the app
  and a good pattern other dynamic routes could point to.
- `study/session/[id].tsx` and `quiz/[id].tsx` both clamp the `index`/`start` param into
  `[0, length-1]` rather than trusting it, so an out-of-range or garbage index cannot produce
  `undefined` card access.

No dynamic route in the app can be driven into a broken/blank/crashing state by a bad param. This is a
genuinely strong result and should be stated as such rather than buried — it directly answers one of
the audit's named checks.

### 5. Circular navigation / lost state on back

Traced the full quiz loop (`quiz/instructions` → `quiz/[id]` → `quiz/final-review/[id]` →
`quiz/[id]` (resume, editing one answer) → `result/[id]` → `quiz/review/[id]` → retake) and the full
study-session loop (`study/session/[id]` → `study/answer-result/[id]` → `study/session-summary/[id]` →
`study/set-result/[id]` → `study/congratulations/[id]`). Every transition in both loops uses
`router.replace`, not `router.push`, so the navigation stack never grows across a loop iteration — a
child answering 8 questions does not leave 8 dead screens on the back stack, and a hardware-back/swipe
gesture from deep in either loop lands on the screen that was live *before the loop started*
(`lesson/[id]`), not on an intermediate step. Resumption state (`answers`, `start` params) is carried
explicitly through the `replace` calls rather than relied upon from stack history, so no state is lost
on back navigation within these flows. This is a deliberate, well-executed pattern, not a workaround
that happens to work.

The one exit-confirmation flow with real state risk — `flashcard/[id].tsx`'s "pause" — uses
`router.dismissTo` (SDK 57 / expo-router 4 API, confirmed valid by a clean `tsc`) to drop back onto
`lesson/[id]` cleanly from the paused screen, banking already-rated cards via `recordSession` before
navigating, so an interrupted session doesn't lose progress. No defect found here.

### 6. "Journey ends with no sensible next action"

Checked every terminal screen in a flow (`result/[id]`, `study/session-summary/[id]`,
`study/set-result/[id]`, `study/congratulations/[id]`, `quiz/review/[id]`, `quiz/final-review/[id]`,
`+not-found`, the `ErrorBoundary` in `src/app/_layout.tsx`) for at least one forward-going, working
action. All of them have two: a "continue/retry" action and a "go home/take a break" action, both wired
to real, resolvable routes. `+not-found` and the app-wide `ErrorBoundary` both offer a working recovery
action (`router.replace("/")` and a Sentry-reported `retry()` respectively) rather than stranding the
user. No dead-end screen was found.

The one genuine soft spot is RT-05/RT-06 above: the daily study reminder is a real, working local
notification (this is new/changed behaviour since Report.md, which only checked that
`expo-notifications` was *installed* — it did not check whether a tap on the delivered notification
goes anywhere), but tapping it does not route anywhere specific. That is a missing link between a real
entry point (an OS notification) and the route graph, not a broken in-app link — flagged at P3 because
the notification's own copy ("Time to study?") implies a destination that doesn't materialise on tap,
which borders on the design-honesty concern but is squarely a routing gap by mechanism (no listener
exists to interpret the tap as navigation intent at all).

### 7. What could not be verified (NOT TESTABLE, named honestly)

- **Actual on-device back-gesture/hardware-back behaviour.** Traced statically via `router.replace`
  vs `router.push` call patterns; confirming the resulting native stack depth would need a simulator
  run, which is out of scope (`xcrun` forbidden). What the code guarantees (replace never pushes) is
  the strongest static evidence available short of that.
- **Whether tapping a delivered local notification actually opens the app at all / to which screen**
  (RT-05). Confirmed by code that no response listener exists to route it anywhere specific; confirming
  the exact resulting screen needs a delivered notification and a tap, which needs a device/simulator.
- **`npm run lint` result** (RT-10) — timed out twice without output; not used as evidence either way.
