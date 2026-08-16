# Screen coverage matrix — 14 August 2026

**Important: no screen in this app was rendered, screenshotted or interacted with in this run.** Tier 2
and Tier 3 did not execute. This matrix records what static analysis proves about each route and leaves
the runtime columns explicitly empty rather than filling them with assumptions.

A 58-row table of `NOT TESTED` in six columns would be theatre. What follows is what is actually known.

## Inventory

**58 screen routes + `+not-found` = 59.** Unchanged from `docs/Report.md`'s 20 July count —
`git log --diff-filter=A --since=2026-07-20 -- src/app` shows exactly one added file, and it is an API
route (`api/admin/questions+api.ts`), not a screen.

| Group | Screens | Gate |
| --- | --- | --- |
| Root | `index`, `intro`, `data-usage`, `+not-found` | none |
| `(auth)` | `sign-in` | signed-out only |
| `(app)` | `home`, `welcome`, `add-child`, `curriculum`, `search`, `bookmarks`, `notifications`, `offline`, `subject/[subject]`, `lesson/[id]`, `flashcard/[id]`, `flashcard/paused`, `download/[id]`, `quiz/[id]`, `quiz/instructions/[id]`, `quiz/review/[id]`, `quiz/final-review/[id]`, `result/[id]`, `certificate/[id]` | Clerk auth |
| `(app)/(tabs)` | `study/*` (6), `progress/*` (9), `parent` | Clerk auth + native tab bar |
| `(app)/(parent)` | 20 screens — settings, children, child/[id], subscription, paywall, passcode, profile, reminders, storage, sync, study-goal, parent-analytics, parent-content, data-export, delete-account, accessibility, about, faq, help | **4-digit passcode gate** |

## What is proven statically (VERIFIED)

| Property | Result |
| --- | --- |
| Broken navigation targets | **0** — all 170 `router.push`/`replace`/`navigate` call sites and 24 `<Redirect href>` targets resolve to real screens |
| Dead / unreachable screens | **0** — every screen has an inbound reference. `/progress` has no explicit push because it is a native tab root, which is correct |
| Dynamic-route param safety | **14 of 14** dynamic routes validate their param. A bad `[id]` produces a `Redirect` to `/home` or an honest `EmptyState` — never a blank or broken screen |
| Param contract | Every dynamic call site sends exactly the params its target reads (`id`, `subject`, `year`, `period`, `mode`, `start`, `answers`, `score`, `index`, `gotit`, `tricky`, `seconds` — all traced end to end) |
| Tab-bar clearance | All 12 pushed-in-tab screens use `pb-35` (140px); both tab roots use `pb-6`. `pb-35` appears in exactly those 12 files and nowhere it isn't needed |
| Parent-zone gating | `(parent)/_layout.tsx` renders `<ParentGate />` for the whole group when locked — 20 screens gated by construction, including cold deep links. **Not re-verified at runtime this run** |
| Typed-route integrity | `npx tsc --noEmit` clean, and `typedRoutes` statically rejects unresolvable path literals — independent corroboration of the 0-broken-links result |

## Deliberate designs confirmed as not-defects

- `/welcome` and `/intro` are `Redirect`-only with no way back once dismissed — the documented
  one-time onboarding fork, gated on `intro.seen` / `welcome.seen`.
- `/parent` (tab root, no sensitive data, one button) vs `/parent-content` (the real dashboard, inside
  the passcode gate) look like duplicate screens on a grep pass. They are a deliberate two-tier
  security design, documented in the code.

## Known screen-level defects (from other workers)

| Screen | Defect | Severity |
| --- | --- | --- |
| `quiz/[id]` | Question illustrations have no accessible label and no accessible parent — silent to VoiceOver | P1 |
| `download/[id]` | Backed by `/api/sets/:id`, which returns 500 for every real set (migration gap) — offline download is non-functional | P0 |
| `(parent)/delete-account` | Promises permanent deletion it does not perform on the server | P0 |
| `(parent)/data-export` | Export omits the Postgres store, contradicting its own docstring | P0 |
| `study/session-summary/[id]` | "View all" is an unpressable `<Text>` styled as a working link | P2 |
| `progress/subject/[subject]` | "View all" wired to an empty handler | P3 |
| `add-child` | Avatar picker, emoji picker and year selector have no accessible names | P2–P3 |
| `(parent)/settings` | Billing row hardcodes "Apple" next to "Plan: Free" | P3 |
| `(parent)/help` | "Rate GoKid" points at App Store id `0000000000` | P3 |
| `(parent)/paywall` | `pb-4` where 17 sibling screens use `pb-10` | P4 |
| `result/[id]`, `study/congratulations/[id]` | `nextSetId()` wraps to set one at curriculum end — no completion state | P4 |

## Not covered by this run

Rendering, layout under real Dynamic Type, clipping, safe areas, empty states with a wiped database,
loading and error states, keyboard behaviour, modal and sheet behaviour, back-gesture behaviour, launch
timing, and **whether any control in the app responds to a press**. All of that is Tier 2/Tier 3 and
requires a device pass plus, for interaction, Maestro.
