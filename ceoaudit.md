# GoKid — Executive Product & Engineering Audit

**Date:** 17 July 2026
**Branch:** `Phase-2`
**Build audited:** Expo SDK 57 · React Native 0.86 · React 19.2 · iOS 26.5 simulator (iPhone 17 Pro)
**Method:** full static sweep of all 44 route files + `src/lib` + `src/components` + design tokens, plus a live deep-link smoke test of 30+ screens on a running dev client.

**Verification status of this document:** every ✅ below means *the screen was deep-linked on a live simulator and its rendered pixels were inspected*. Not "the file exists". Where a screen could not be reached, it is marked and the reason is given.

---

## 0. The one-paragraph verdict

GoKid is a genuinely good-looking, unusually well-disciplined prototype that is roughly **20% of a shippable product** and **0% of a business**. The craft is real: 38 screens built, zero `any`, zero `TODO`s, zero `console.log`, zero `StyleSheet.create`, 76 documented design tokens, native tabs done properly, 161 accessibility labels across 167 pressables, and a clean `tsc`/lint. That is better hygiene than most Series-A codebases. But underneath the paint there is **no backend, no entitlement system, no route-level security, and no tests**, and the app currently **ships the exact motivational mechanics its own product brief says it rejected**. The gap between how finished this looks and how finished it is, is the single biggest risk in the project — because it invites shipping.

**Three things to fix before anything else:**

1. **The parent gate is not a gate.** It is one screen. `gokid://settings`, `gokid://paywall`, `gokid://parent-content`, `gokid://parent-analytics`, `gokid://children` all open with no challenge. I confirmed this live — typed the deep link, landed straight in Account Settings with the parent's real name and email on screen. Three of those files carry comments *asserting* they sit behind the gate.
2. **The product contradicts its own thesis.** `design/gokid-screens.md` §9 says: *"Since you deliberately rejected streaks and leaderboards, use intrinsic motivation."* The shipped app has a 5-day streak flame, a 7-Day Streak badge, "Best streak: 9", points, levels (520/700 to Level 5), and a **"View leaderboard"** banner. Someone built the mockups without reading the brief, and nobody caught it.
3. **A `JSON.parse` failure permanently wipes every child's progress**, silently (`src/lib/reviews.ts:86`). This is the only real user data the app owns.

---

## 1. What was actually built — the honest inventory

**38 screens across 44 route files.** Against `design/gokid-screens.md`'s own estimate of 180–200 screens/dialogs/states, that is **~20% coverage** — but the 20% chosen is the right 20%. The entire core learning loop exists end to end and works.

### Live smoke test results

Every route below was opened via `xcrun simctl openurl` on a running dev client and the resulting screenshot inspected. Artefacts are in `design/.audit/`.

| # | Route | Renders | Verdict |
|---|---|---|---|
| 1 | `/` → splash → fork | ✅ | Correct: `isLoaded` checked before `isSignedIn`, no sign-in flash |
| 2 | `/intro` | ✅ | 3-slide carousel |
| 3 | `/sign-in` | ✅ | Real Clerk SSO, Apple + Google |
| 4 | `/home` (Who's studying) | ✅ | Real children from Clerk metadata |
| 5 | `/add-child` | ✅ | Add **and** edit in one form |
| 6 | `/children` | ✅ | Manager list |
| 7 | `/study` | ✅ | Real child, real year group |
| 8 | `/curriculum` | ✅ | Rec–Y6 tabs, accordion, live coverage ring (42%) |
| 9 | `/subject/[subject]` | ✅ | 10 subject hubs |
| 10 | `/search` | ✅ | Real index, subject chips, empty state |
| 11 | `/lesson/[id]` | ✅ | Set detail |
| 12 | `/download/[id]` | ✅ | Renders — but the button is a no-op |
| 13 | `/flashcard/[id]` | ✅ | **Real SRS writes** — the one honest data path |
| 14 | `/flashcard/paused` | ✅ | Params clamped correctly |
| 15 | `/quiz/instructions/[id]` | ✅ | |
| 16 | `/quiz/[id]` | ✅ | 6 MCQs, illustrated |
| 17 | `/quiz/review/[id]` | ✅ | Clean-sweep empty state |
| 18 | `/result/[id]` | ✅ | |
| 19 | `/certificate/[id]` | ✅ | |
| 20 | `/progress` | ✅ | |
| 21 | `/progress/overview` | ✅ | |
| 22 | `/progress/calendar` | ✅ | Week/month/year heatmap, real sessions overlaid |
| 23 | `/progress/history` | ✅ | **Fully real** `useProgress` |
| 24 | `/progress/achievements` | ✅ | Renders — every control is a `noop` |
| 25 | `/progress/subject/[subject]` | ✅ | Renders — always shows Maths regardless of slug |
| 26 | `/parent` (gate) | ✅ | Renders — gate is bypassable |
| 27 | `/parent-content` | ✅ | Renders — shows demo children, not real ones |
| 28 | `/parent-analytics` | ✅ | |
| 29 | `/settings` | ✅ | Renders — **reached with no gate** |
| 30 | `/paywall` | ✅ | Renders — CTA is `router.back()` |
| 31 | `/notifications` | ✅ | Renders — nothing tappable |
| 32 | `/offline` | ✅ | |
| 33 | `/study/session/[id]` | ✅ | |
| 34 | `/study/answer-result/[id]` | ✅ | |
| 35 | `/study/session-summary/[id]` | ✅ | |
| 36 | `/study/set-result/[id]` | ✅ | |
| 37 | `/study/congratulations/[id]` | ✅ | Renders — text-wrap bug, no back affordance |
| 38 | `/+not-found` | ✅ | |

**Build gates:** `npx tsc --noEmit` ✅ clean · `npm run lint` ✅ clean · app launches ✅ · no redbox on any of the 38 routes ✅ · zero orphan routes ✅ (every route has at least one inbound link).

### Coverage against `design/gokid-screens.md`, section by section

| § | Section | Built | Coverage | Note |
|---|---|---|---|---|
| 1 | Authentication & Account | 4 / 16 | 🟡 25% | Splash ✅ Sign-in ✅ Add Child ✅ Intro ✅. Missing: all loading/error states, ToS, Privacy, permissions priming, data-usage. **Terms & Privacy on the sign-in screen are plain `<Text>`, not links** (`sign-in.tsx:130-131`) — an App Review rejection on its own. |
| 2 | Child Profiles | 5 / 10 | 🟡 50% | Who's Studying ✅ Edit ✅ Delete+confirm ✅ Avatar picker ✅ Manager ✅. Missing: achievement profile, change-year flow, switch animation. |
| 3 | Home Experience | 5 / 12 | 🟡 42% | Home ✅ Search ✅ Filter-by-subject ✅ Continue ✅ Downloads ✅. Missing: Recently Studied, Recommended, New This Week, Seasonal, Favourites, Bookmarks. |
| 4 | Subject Hub | 10 / 10 | ✅ **100%** | All 10 subjects live at `/subject/[slug]`. **Best-executed section in the app.** |
| 5 | Study Sets | 4 / 11 | 🟡 36% | Set Detail ✅ Curriculum Browser ✅ Search ✅ Download screen ✅ (no-op). Missing: Related, AI Recommended, Delete Download, Share Progress, Report Card. |
| 6 | Flashcard Experience | 6 / 13 | 🟡 46% | Card front/back ✅ Pause ✅ Session Paused ✅ Resume ✅ Exit ✅. Missing: hint, zoom, illustration viewer, **audio pronunciation**, favourite, report, skip. |
| 7 | Quiz Experience | 6 / 12 | 🟡 50% | Instructions ✅ Image Questions ✅ Instant Feedback ✅ Final Review ✅ Incorrect Answers ✅ Retake ✅. **Missing all 5 alternative question types** — drag & drop, matching, fill-in-blank, multi-select, ordering. Every quiz in the app is 4-option MCQ. |
| 8 | Progress | 9 / 13 | 🟢 69% | Subject ✅ Weekly ✅ Monthly ✅ Yearly ✅ Calendar ✅ Coverage ✅ Recently Mastered ✅ Coming Back Soon ✅ History ✅. Missing: mastery timeline, statistics, export. |
| 9 | Rewards | 5 / 9 | 🔴 **Wrong** | Screens exist, but they implement **streaks, points, levels and a leaderboard** — the exact mechanics §9 says were rejected. See §3.1. |
| 10 | Parent Dashboard | 11 / 15 | 🟢 73% | Gate ✅ Dashboard ✅ Analytics ✅ Child CRUD ✅ Settings ✅. Missing: real study-time data, storage usage, billing history. Everything here is demo data. |
| 11 | Subscription | 1 / 9 | 🔴 11% | Paywall ✅ (visual only). **No billing exists at all.** No StoreKit, no RevenueCat, no entitlement check. |
| 12 | Settings | 6 / 14 | 🟡 43% | Profile ✅ Notifications ✅ Downloads ✅ Privacy ✅ Terms ✅ Restore ✅ (fake). Missing: **the entire Accessibility group** — text size, high contrast, sound, haptics, language. |
| 13 | Notifications | 1 / 6 | 🔴 17% | Centre ✅ (static list, nothing tappable, no dismiss). **`expo-notifications` is not installed.** No push, no local reminders. |
| 14 | Offline | 2 / 7 | 🔴 29% | Offline ✅ Download screen ✅. **Nothing actually downloads.** No manager, no progress, no storage-full, no sync conflict, no queue. |
| 15 | Search | 3 / 5 | 🟢 60% | Global ✅ Subject ✅ Recents ✅ No-results ✅. Missing: curriculum-scoped search. |
| 16 | Errors | 2 / 8 | 🔴 25% | 404 ✅ ErrorBoundary ✅. Missing: network, server, timeout, maintenance, auth-failed, session-expired. |
| 17 | Empty States | 6 / 8 | 🟢 75% | Genuinely good — `EmptyState` is reused across 9 screens. |
| 18 | Help & Support | 0 / 8 | 🔴 **0%** | Nothing. No FAQ, no contact, no bug report, no version string, no rate-app. |
| 19 | Accessibility | 1 / 6 | 🔴 17% | VoiceOver labels ✅ (161/167 — strong). No dyslexia mode, no high contrast, no reduced motion, no text-size preview, no colour-blind palette. |
| 20 | AI Features | 0 / 6 | 🔴 **0%** | **The app is marketed as AI-powered and contains no AI.** The paywall sells "Unlimited AI-generated sets" against a hardcoded array of 21 sets. |
| 21 | Curriculum Explorer | 9 / 10 | ✅ **90%** | Rec–Y6 ✅ Objectives ✅ Coverage ✅. Excellent. **The single strongest differentiator in the product.** |
| 22 | Developer / System | 2 / 7 | 🔴 29% | Launch loading ✅ Crash recovery ✅. Missing: update-required, maintenance, feature flags, sync logs. |

**Overall: ~87 / 200 screens ≈ 44% of the *named* inventory, ~20% of the *functional* product.** The difference between those two numbers is the audit's core finding: many screens are drawn but not wired.

---

## 2. What is genuinely good — do not regress this

This section matters as much as the problems. There is real quality here and it should be defended during the rebuild.

**Design-token discipline is exceptional.** 76 colour tokens in `src/design/tokens.js`, and every single one of the ~30 *inferred* tokens carries a comment naming the mockup it was sampled from and why. Zero `StyleSheet.create`. Zero `rgba()` in `src/`. Only 4 raw hex values in the entire app, all four in `google-mark.tsx` and all four correctly commented as Google brand identity colours that must not be themed. I have audited codebases at ten times this budget with a hundred times this leakage.

**The spacing scale is a smart, documented decision.** `tailwind.config.js:21-25` pins spacing in px rather than rem, with a written rationale: NativeWind's rem is 14pt, not 16pt, so `h-14` would silently render at 49pt. Someone hit that, understood it, fixed it, and wrote down why. That is senior work.

**Native tabs done right.** `(tabs)/_layout.tsx` uses `NativeTabs` from `expo-router/unstable-native-tabs` exactly as `AGENTS.md` demands. No JS tab bar anywhere. The nested `study/` and `progress/` stacks are configured so the native tab bar survives pushes. This is the thing most teams get wrong and quietly swap out; it wasn't swapped out.

**Accessibility labelling is better than most shipped apps.** 161 `accessibilityLabel` and 166 `accessibilityRole` across 167 `Pressable`s, plus 51 `hitSlop` declarations. That is ~96% label coverage, unprompted.

**Error hygiene.** 10 of 12 `catch` blocks report to Sentry with a `flow` tag. The two that don't are: one deliberately (`offline-banner.tsx:58`, commented "a failed probe is not evidence of being offline" — correct reasoning), and one that should be fixed (`certificate/[id].tsx:42`).

**The state pattern is consistent and correct.** No Redux, no Zustand, no context-provider pyramid. Four module-scope stores exposed via `useSyncExternalStore`, all returning stable snapshot references and mutating by replacement. This is the *right* amount of machinery for an app this size, and it is applied uniformly.

**The SRS engine is real.** `reviews.ts` implements Leitner boxes with `INTERVALS_DAYS = [1,5,12,30,90]`, persists to SecureStore, and caps history at 100 per child. `/flashcard/[id]` and `/progress/history` are the only two screens in the app reading real user data, and they work.

**Curriculum Explorer is a genuine moat.** Rec–Y6, real National Curriculum objectives, coverage derived from actual set data rather than faked, term-aware. Every UK primary competitor either ignores the NC or gestures at it. This is the feature to build the company on.

**Secret hygiene is correct.** `.env` is gitignored (verified via `git check-ignore`). `CLERK_SECRET_KEY` exists but is **not referenced anywhere in `src/`** — it is CLI-only, exactly as it should be. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is read at the point of use in `_layout.tsx:30` with a comment explaining Metro's inlining behaviour, and throws at boot if missing. Textbook.

---

## 3. What is broken — ranked by what it costs you

### 3.1 🔴 P0 — The product contradicts its own thesis

`design/gokid-screens.md` §9, in the repo, in writing:

> *"Since you deliberately rejected streaks and leaderboards, use intrinsic motivation."*

What is actually on screen, verified live:

| Where | What | File |
|---|---|---|
| Learning Calendar | 🔥 **"5 days"** streak flame, top right | `progress/calendar.tsx` |
| Achievements | **"7-Day Streak"** badge, "Study 7 days in a row" | `achievements.tsx:88` |
| Achievements | **Total points 520 · Level 5 · 520/700** | `achievements.tsx:45-79` |
| Achievements | **"View leaderboard"** banner | `achievements.tsx:270-275` |
| Congratulations | **"Best streak 9 — Keep it up!"** | `congratulations/[id].tsx:37` |
| Session Summary | **"Best streak: 9"** flame tile | `session-summary/[id].tsx:40` |
| Answer Result | **"Current streak 9 / Best: 9"** | `answer-result/[id].tsx:282-284` |
| Set Result | **"Longest streak: 8"** | `set-result/[id].tsx:171` |

This is not a bug list — it is a **strategic contradiction shipped across six screens**. Streaks are a loss-aversion mechanic: they work by making a child anxious about breaking a chain. Leaderboards are social comparison. Both were rejected on purpose, and both are now the loudest visual elements in the reward flow. There is even a comment at `calendar.tsx:404` — *"the one honest superlative that isn't a streak or a leaderboard"* — sitting on the same screen as a streak flame. The developer knew.

Ironically, the **honest** version of this is already built. `reviews.ts` has a real spaced-repetition engine. "Cards coming back soon" is intrinsic, truthful, and derived from real data. That is the reward system. The gamification layer is a demo skin over it.

**Decision required from the CEO/CPO, and it is binary:** either the anti-streak position is the brand — in which case rip out streaks, points, levels, and the leaderboard, and rebuild the reward flow on mastery, curriculum coverage, and certificates — or the position has changed, in which case rewrite the brief and own it. What cannot stand is a product that markets calm learning and ships a flame emoji with a number next to it.

**Recommendation: keep the anti-streak position.** It is the only defensible differentiator against Duolingo-style incumbents, it is what UK parents of primary-age children actually say they want, and it is increasingly what regulators are looking at. Ripping it out costs about a week. It is the cheapest strategic win available.

### 3.2 🔴 P0 — The parent gate is decorative

**Live proof.** From a terminal, with a child holding the phone:

```
xcrun simctl openurl booted "gokid://settings"
```

Result: Account Settings, wide open. Parent's full name. Parent's email address. Manage children. Subscription. Sign out. No challenge. I screenshotted it — `design/.audit/05-settings.png`.

The gate at `(tabs)/parent.tsx:74` is a **View rendered over one tab**. It is not a route guard. `(app)/_layout.tsx:10` checks `isSignedIn` and nothing else. Every "parent" screen is a plain `(app)` route:

| Route | Reachable with no gate | What leaks |
|---|---|---|
| `gokid://settings` | ✅ confirmed live | Name, email, sign-out, subscription |
| `gokid://parent-content` | ✅ | Full parent dashboard |
| `gokid://parent-analytics` | ✅ | Per-child analytics |
| `gokid://children` | ✅ | Roster + destructive demo-seed |
| `gokid://paywall` | ✅ | Purchase flow |

And `app.json:6` sets `"scheme": "gokid"`, so **any of these is one tap from Safari**.

Worse, three of those files carry comments claiming protection that does not exist:

- `settings.tsx:15` — "sits behind the maths gate"
- `parent-analytics.tsx:274` — "sits behind the maths gate"
- `children.tsx:22` — "Behind the parent gate"

False comments are worse than no comments. The next engineer will trust them.

**The gate itself is also weak on its own terms:**

- The answer is `const ANSWER = "56"` — **hardcoded, plaintext, never rotates** (`parent.tsx:18`). Solve it once, you are in forever.
- `7 × 8` is **Year 4 National Curriculum content**. The app's own target user is taught this. GoKid teaches times tables and then uses a times table as the lock.
- It auto-submits on the second digit (`:44-49`) with no attempt counter, no lockout, no delay. Brute-forcing 00–99 is ~100 taps.
- No wrong-answer feedback, no cancel button — the only escape is another tab.

**The fix is small.** A `(parent)` route group with a layout guard that mirrors the existing `(app)` guard, backed by a gate store with a timestamp and a re-lock on background. Randomise the operands. Move `settings`, `children`, `paywall`, `parent-content`, `parent-analytics` inside it. Roughly 20 lines plus file moves. The existing `(app)` guard is a working template for exactly this — the pattern is already in the codebase.

### 3.3 🔴 P0 — One corrupt byte wipes every child's progress

`src/lib/reviews.ts:77-88`:

```
hydrated = true          // ← set BEFORE the await
...
catch { store = {} }     // ← no emit(), no Sentry, no recovery
```

Two distinct failures in nine lines:

1. **Hydration race.** `hydrated = true` fires before the `await getItemAsync` resolves. A `rateCard` in that window writes into `store = {}`, then `hydrate` overwrites `store` wholesale with disk contents. The rating vanishes. Narrow window, real.
2. **Silent total data loss.** If `JSON.parse` throws — corrupt blob, interrupted write, OS-level truncation — the catch sets `store = {}` and **does not `emit()`**. Subscribed screens keep rendering the stale pre-hydration snapshot, so the UI looks fine. The next `persist()` then writes `{}` to disk. Every child's entire SRS history is gone, permanently, with no error, no Sentry event, and no user-visible signal.

This is the **only real user data the app owns**. Everything else is a hardcoded array that can be regenerated. Fix: `await` before setting `hydrated`, `emit()` in the catch, report to Sentry, and back up the corrupt blob to a `.bak` key before overwriting rather than discarding it.

### 3.4 🟠 P1 — Deep-linked children write into a stranger's progress

`useActiveChildId() ?? "demo-amara"` is copy-pasted at **six** sites: `progress/index.tsx:95`, `progress/calendar.tsx:214`, `progress/history.tsx:72`, `flashcard/[id].tsx:27`, `flashcard/paused.tsx:56`.

`active-child.ts` is in-memory by design — it does not survive a cold start. So: child taps a notification or a link into a flashcard, active-child is null, fallback fires, and **their spaced-repetition ratings are written into the demo profile `demo-amara`'s bucket**. Their real progress silently does not accumulate.

Fix: one constant, and a redirect to `/home` when there is no active child rather than a silent fallback. A missing active child is a routing condition, not a default value.

### 3.5 🟠 P1 — The paywall sells things that are free, absent, or both

Verified live on `design/.audit/16-paywall.png`. Three benefits advertised at £6.49/mo or £49.99/yr:

| Advertised | Reality |
|---|---|
| "Unlimited AI-generated sets" | **There is no AI in this app.** 21 sets, hardcoded in `study.ts`. Nothing generates anything. |
| "More than one child" | **Already unlimited and free.** `useChildren` has no cap. I have two children on the free tier right now. |
| "Full progress history" | Already free. `reviews.ts` caps at 100 sessions for everyone, paid or not. |

And there is nothing behind the wall: **no `isPro`, no entitlement check, no StoreKit, no RevenueCat anywhere in `src/`**. "Start free trial" is `router.back()` (`paywall.tsx:123`). "Restore purchases" is a fake `Alert` (`settings.tsx:74-81`).

Two of those three claims are **misleading advertising for a paid subscription aimed at parents**. In the UK that is a CMA/ASA exposure, not just a product bug. This screen must not ship in this state — either build the entitlement layer and make the claims true, or rewrite the claims to match what exists.

Adjacent: `parent.tsx:69` hardcodes **"Renews 12 May 2025"** — a date now 14 months in the past, shown to parents as if live.

### 3.6 🟠 P1 — Content data is internally inconsistent

Verified live. `/download/place-value` says **"20 cards"**. `/flashcard/place-value` says **"1 / 6"**. The Congratulations screen says **"Cards studied: 20"** for a set with 6 cards.

Cause: `study.ts:112` sets `cardsTotal: 20` while `cards[]` has 6 entries (`:117-122`). The number is decorative. This pattern repeats across 27 sets — there are 28 `cardsTotal` declarations and none are derived.

Fix: `cardsTotal` must be `cards.length`, computed, not authored. Delete the field. Any number a human can type is a number that will drift.

Related: `rewards.ts:47,80` hardcodes `issued: "16 July 2026"` on **every** certificate — a child finishing a set tomorrow gets yesterday's date printed on their achievement.

### 3.7 🟠 P1 — The parent dashboard shows the wrong family

`/parent-content` renders **Amara (Year 3)** and **Rufus (Year 1)** — hardcoded at `parent-content.tsx:20`. My actual signed-in account has two children, both named Gideon, Year 6 and Year 1. The parent dashboard's child switcher **ignores `useChildren` entirely** and shows strangers.

`/notifications` has the same disease: "Amara has 8 cards left in Place Value to 1,000" — a demo name shown to a real parent.

This is the single most damaging first impression in the app. A parent opens the parent area and sees children who are not theirs.

### 3.8 🟡 P2 — Ten controls that look tappable and do nothing

Confirmed by code. Each of these renders as an interactive affordance and has no handler:

| Screen | Control | File |
|---|---|---|
| Achievements | All 9 controls — every badge, both "View all", "View leaderboard" | `achievements.tsx:130` (`noop`) |
| Notifications | Every row (rendered as `View`, not `Pressable`) | `notifications.tsx:40` |
| Progress | Refresh button — no `onPress` | `progress/index.tsx:188` |
| Progress Overview | "By subject → View all" — inert `Text` styled `text-primary` | `overview.tsx:255` |
| Session Summary | "View all" — inert `Text` | `session-summary/[id].tsx:102` |
| Set Result | "Review all" — `Pressable`, no `onPress` | `set-result/[id].tsx:191` |
| Congratulations | "Share" and "Review all" — `() => {}` | `congratulations/[id].tsx:98,144` |
| Download | "Download set" — `router.back()` | `download/[id].tsx:203` |
| Subject Progress | "View all" — empty handler | `progress/subject/[subject].tsx:251` |
| Settings | "Billing" row — no `onPress` | `settings.tsx:146` |

For a **child** user this is worse than for an adult. An adult assumes it is broken and moves on. A child taps a badge, nothing happens, taps harder, concludes they did something wrong. Dead affordances teach learned helplessness. Either wire them or remove them — a control that does nothing is worse than no control.

### 3.9 🟡 P2 — Kid-safety issues beyond the gate

| Severity | Issue | File |
|---|---|---|
| **High** | **A child can delete their sibling.** `/home` is the child's own picker. Every card has a pencil (`home.tsx:96`) → `/add-child?id=` → "Delete child" (`add-child.tsx:462`), which wipes that child's profile and all their progress. An `Alert` is the only barrier, and Alerts are the thing children tap through fastest. | `home.tsx:96` |
| **High** | **A full web browser, one tap from a child-reachable route.** `WebBrowser.openBrowserAsync(PRIVACY_URL / TERMS_URL)` with no allowlist. `/settings` is deep-linkable. Once in the browser, the child is on the open internet. | `settings.tsx:161,163` |
| **Medium** | **Child-invoked native share sheet, leaking the child's name.** `/certificate/[id]` is reached from `/study/congratulations` — the end of the *child's own* flow. `Share.share` posts `"${name} earned a GoKid certificate…"` to any app on the device, including social. No gate. Under UK GDPR / the Children's Code this is a child publishing their own identifying data with no adult in the loop. | `certificate/[id].tsx:39-45` |
| **Medium** | Camera and photo-library pickers on a screen a child opens from `/home`. | `add-child.tsx:124-145` |
| **Medium** | The parent gate dims the subscription card to `opacity-40` — **without blur**. "GoKid Plus / Renews 12 May 2025" is legible behind the lock. | `parent.tsx:58,66-70` |
| **Medium** | Sign-out reachable from `/add-child`, which doubles as the edit form a child can open. | `add-child.tsx:337` |
| **Low** | `children.tsx:98` demo-seed destroys all real profiles behind a single `Alert`. |  |

Separately: **`sendDefaultPii: true`** at `_layout.tsx:22`, on a children's education app. Sentry will attach IP addresses and user identifiers **for child users**. This needs a deliberate, documented decision before launch, not a default. My recommendation is to turn it off and attach a hashed parent id only.

### 3.10 🟡 P2 — Two parallel subject screens, easy to confuse

`/subject/[subject]` (hub, real `lib/subjects` data) and `/progress/subject/[subject]` (progress). The second **ignores its `subject` param except to re-case the title** (`:128`) — `TOPICS` and `RECENT` are hardcoded Maths (`:55-72`). Deep-link `/progress/subject/english` and you get Maths data under an "English" heading. Silently wrong data is worse than an error.

### 3.11 🟡 P2 — The flow splits across two chrome behaviours

Same conceptual journey, two different navigation trees:

- `flashcard` → `quiz` → `result` → `certificate` live at `(app)` root — **no tab bar**
- `session` → `answer-result` → `session-summary` → `set-result` → `congratulations` live inside the `study` tab — **tab bar visible**

So `flashcard/[id]:94` replaces into a root-level route while `study/session/[id]:236` pushes inside a tab. A child moving through what feels like one activity watches the tab bar appear and disappear. And `/parent` is a tab whose only job is to immediately push a non-tab route.

Also: `study/congratulations` has **no back affordance** (`:92` is a spacer `View`).

### 3.12 🟡 P2 — Visual bug on the celebration screen

`design/.audit/31-congrats.png`. The heading renders as:

```
Congratulations
,
Gideon!
```

The comma is orphaned onto its own line. This is the emotional peak of the entire product — the moment a child finishes a set — and it is visibly broken.

### 3.13 🟢 P3 — Component layer is the largest maintenance liability

The token layer is disciplined. The **component** layer is not. There is no `Button`, `Card`, `Row`, `SectionHeading`, or `StatTile` primitive. Consequences:

- `Row` is redefined in `settings.tsx:31`, `parent-content.tsx`, and `parent.tsx:21`
- `SectionHeading` redefined in `settings.tsx:28` and `achievements.tsx`
- The pill CTA — `h-12 items-center justify-center rounded-full bg-study-teal px-6 active:opacity-90` — is **copy-pasted across most screens in the app**

Change the button radius and you are editing 30 files. This is what makes a design system fail in month six.

Also dead: `SetRowSkeleton` (`skeleton.tsx:33`) and `StatRowSkeleton` (`skeleton.tsx:46`, zero references).

### 3.14 🟢 P3 — Cheap wins sitting on the table

- **11 of the 12 `style={{}}` violations of `AGENTS.md` §2 are one line of code.** They are all `SymbolView` margins, because `styled.ts` wires `cssInterop` for `Image` and `SafeAreaView` but not `SymbolView`. Add `cssInterop(SymbolView, { className: "style" })` to `src/components/styled.ts:7` and all 11 disappear.
- **The 12th** (`paused.tsx:149`, dynamic `backgroundColor` from a token) already has its solution written in this codebase — the `Record`-of-static-classes pattern at `progress-ring.tsx:17-20`.
- `paused.tsx:150` — `name={t.symbol as never}`. `Tile.symbol` is typed `string` instead of `SFSymbol`. Type the field properly and delete the cast. It is the only type escape hatch in the app.
- `package.json:35` declares `"reset-project"` but commit `d91bcf2` deleted the script. `npm run reset-project` throws ENOENT.
- `study.ts:3` documents a seam called `useStudySets` **which does not exist**. Three screens import `STUDY_SETS` directly, violating the documented seam.
- Palette debt: ~12 near-duplicate colours from sampling mockups instead of reconciling to the system. `study.teal #017880` vs `primary #0E7C7B`. `gamify.green` **is** `success`. `calendar.heat4` **is** `study.teal`. `subject-ink.computing` **is** `primary`. Reconcile before the palette doubles again.
- **`calendar.ts:31` — `TODAY` is computed once at module load.** An app left open past midnight has a stale "today", a stale future boundary, and a streak that silently stops counting until a cold start.
- **The heading font never renders.** `RoundedHeading` accepts `size`, `weight`, `color` and **uses none of them** (`rounded-heading.tsx:27`) — a documented deferral because `@expo/ui`'s `Host` hard-crashes the SDK 57 dev client. Net effect: **SF Pro Rounded, the design system's heading face, is not on screen anywhere.** Every heading is SF Pro Text. The app does not currently match its own design system's typography.

---

## 4. What does not exist at all

This is not a bug list. These are the things standing between a prototype and a product.

| Missing | Consequence |
|---|---|
| **A backend** | Zero network calls to any GoKid API. Content is a 1,168-line TS array shipped in the bundle. Every content fix is an App Store release. |
| **Neon + Drizzle** | Correctly not installed per `AGENTS.md`, but nothing exists server-side. Seams are documented and clean — the swap is well-prepared. |
| **Entitlements / billing** | No StoreKit, no RevenueCat, no `isPro`. **There is no revenue mechanism in this app.** |
| **AI** | Zero. The core marketing claim and a paid benefit. `design/gokid-screens.md` §20 is 0/6. |
| **Downloads** | The offline screen lists sets that were never downloaded. No filesystem writes anywhere. |
| **Notifications** | `expo-notifications` not installed. No push, no reminders. §13 is 1/6, and the 1 is a static list. |
| **Tests** | **0 test files.** No Jest, no RNTL, no Maestro, no Detox. The SRS engine, quiz scoring, and the answer codec are pure functions with zero coverage — the cheapest tests in the repo, untested. |
| **CI** | No `.github/workflows`. `tsc` and lint are clean *because a human ran them*, not because anything enforces it. |
| **i18n** | No framework, English hardcoded throughout. §12 lists "Language". |
| **Accessibility beyond labels** | No `AccessibilityInfo`, no reduced-motion, no `maxFontSizeMultiplier`, no dyslexia mode, no high contrast. Labels are excellent; the rest of §19 is absent. **This app targets children, a population with elevated dyslexia and visual-processing rates.** |
| **Analytics (product)** | `lib/analytics.ts` is a *display* module built on an FNV-1a hash of the child id — deterministic fake data. No event tracking. **You cannot tell whether a single child learned anything.** |
| **Help & Support** | §18 is 0/8. No FAQ, no contact, no bug report, no version string. App Review expects several of these. |

---

## 5. Navigation — what needs work

Structure verified live. Native tabs correct, zero orphans, back affordances present nearly everywhere.

```
Root Stack  (ClerkProvider · Sentry.wrap · ErrorBoundary)
├─ index ........................ redirect fork ✅
├─ intro ........................ first launch ✅
├─ +not-found ................... ✅
├─ (auth)/ ...................... guard: signedIn → / ✅
│   └─ sign-in .................. ✅  ⚠️ ToS/Privacy are plain text, not links
└─ (app)/ ....................... guard: !signedIn → /sign-in ✅
    │                            🔴 THIS IS THE ONLY GUARD IN THE APP
    ├─ home ..................... ⚠️ child-facing, exposes edit→delete
    ├─ add-child ................ ⚠️ delete + camera + sign-out, ungated
    ├─ children ................. 🔴 claims "behind the gate" — is not
    ├─ settings ................. 🔴 claims "behind the gate" — is not
    ├─ paywall .................. 🔴 purchase flow, ungated
    ├─ parent-content ........... 🔴 ungated · shows demo children
    ├─ parent-analytics ......... 🔴 claims "behind the gate" — is not
    ├─ curriculum ............... ✅
    ├─ search ................... ✅
    ├─ notifications ............ ⚠️ dead end, nothing tappable
    ├─ offline .................. ⚠️ no delete
    ├─ lesson/[id] .............. ✅
    ├─ download/[id] ............ ⚠️ CTA is a no-op
    ├─ flashcard/[id] ........... ✅ real SRS
    ├─ flashcard/paused ......... ✅
    ├─ quiz/[id] · instructions · review .. ✅
    ├─ result/[id] .............. ⚠️ nextIndex() hardcodes 3 set ids
    ├─ certificate/[id] ......... ⚠️ child-invoked share sheet
    ├─ subject/[subject] ........ ✅ 10 hubs
    └─ (tabs)/ .................. ✅ NativeTabs
        ├─ study/ ............... index · session · answer-result · session-summary · set-result · congratulations
        ├─ progress/ ............ index · overview · achievements · calendar · history · subject/[subject]
        └─ parent ............... 🔴 gate = overlay on one tab, not a guard
```

**Required changes:**

1. **Add a `(parent)` route group with a gate guard.** Move `settings`, `children`, `paywall`, `parent-content`, `parent-analytics` inside it. Mirror the existing `(app)` guard. This is the highest-leverage 20 lines in the whole plan.
2. **Move the child-edit pencil off `/home`.** `/home` is the child's screen. Editing and deleting a profile belongs in `/children`, behind the gate.
3. **Unify the two study trees.** Pick one: everything in the tab, or everything at root. The tab bar appearing mid-flow is a bug the child feels but cannot name.
4. **Give `/parent`'s gate a cancel button.** Right now the only escape is another tab.
5. **Give `/study/congratulations` a back chevron.**
6. **Make `/notifications` rows tappable** and route them to the thing they describe.
7. **Fix `/progress/subject/[subject]`** to honour its param instead of always rendering Maths.
8. **Delete or wire the 10 dead controls in §3.8.** No middle ground.
9. **Reduce the single-inbound-edge risk.** 12 routes have exactly one inbound link. Not a bug today; a silent orphan the first time someone refactors a screen.

---

## 6. Wireframes — the target architecture

### 6.1 Route groups (security-first)

```
src/app/
├─ (auth)/                    guard: signedIn → /
│   └─ sign-in                + ToS / Privacy as real links
├─ (child)/                   guard: signedIn                   ← child-safe zone
│   ├─ home                   who's studying  (NO edit pencil)
│   └─ (tabs)/
│       ├─ study/             index · lesson · flashcard · quiz · result · congratulations
│       └─ progress/          index · calendar · history · mastery
└─ (parent)/                  guard: signedIn && gateUnlocked   ← NEW GUARD
    ├─ _layout.tsx            ── if (!unlocked) return <ParentGate />
    ├─ dashboard              real children from useChildren
    ├─ children/              list · add · edit · delete
    ├─ analytics/             overview · subject · insights
    ├─ settings/              account · learning · accessibility · privacy
    ├─ subscription/          paywall · manage · billing · restore
    └─ downloads/             manager · queue · storage
```

The rule: **anything that spends money, edits an account, exposes PII, or opens the internet lives in `(parent)/`. Everything else is child-safe by construction.** Today that boundary is a comment; it needs to be a directory.

### 6.2 Parent gate — target

```
┌─────────────────────────────────┐
│                          [ ✕ ]  │  ← cancel exists (missing today)
│                                 │
│         🔒  Parent area         │
│                                 │
│      What is 47 × 8?            │  ← randomised per open, ≥2-digit operand
│      ┌───────────────────┐      │     (7×8 is Year 4 content — the users know it)
│      │ · · ·             │      │
│      └───────────────────┘      │
│                                 │
│      [1] [2] [3]                │
│      [4] [5] [6]                │  ← submit on ✓, never auto-submit
│      [7] [8] [9]                │
│          [0] [⌫]                │
│                                 │
│   Wrong — 2 attempts left       │  ← feedback + lockout (neither exists today)
│                                 │
│   Ask a grown-up to help ›      │
└─────────────────────────────────┘

State: { unlocked: boolean, unlockedAt: number, attempts: number }
Re-lock: on background, or unlockedAt + 5min, whichever first.
Store:  useSyncExternalStore — same pattern as active-child.ts.
```

### 6.3 Reward flow — anti-streak, per the brief

Replace the streak/points/level/leaderboard layer with what `reviews.ts` already knows:

```
┌─────────────────────────────────┐
│  All done, Gideon! 🎉           │  ← fix the comma wrap bug
│                                 │
│  ┌───────────────────────────┐  │
│  │  You learned 6 cards      │  │  ← cards.length, computed. Never a typed constant.
│  │  4 you'd found tricky     │  │  ← real SRS transitions
│  └───────────────────────────┘  │
│                                 │
│  What you've mastered           │
│  ● Place value        ▓▓▓▓▓░ 5/6│  ← real, from reviews.ts
│  ● Hundreds           ▓▓▓░░░ 3/6│
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🔄 Coming back            │  │  ← intrinsic, honest, already built
│  │    3 cards on Friday      │  │     THIS is the retention mechanic
│  └───────────────────────────┘  │
│                                 │
│  Year 3 Maths · 42% covered ›   │  ← the moat, surfaced at the peak moment
│                                 │
│  [ Keep going ]  [ Done ]       │
└─────────────────────────────────┘

Deleted: 🔥 streak · points · levels · leaderboard · "Best streak: 9"
Kept:    mastery · curriculum coverage · certificates · SRS return dates
```

Nothing in that wireframe needs new data. It is all in `reviews.ts` and `curriculum.ts` today.

### 6.4 Data architecture — the target

```
  Client (Expo)                    Server                      Data
┌──────────────┐            ┌──────────────────┐         ┌──────────────┐
│ screens      │            │  API routes      │         │  Neon PG     │
│   ↓          │            │   ↓              │         │   ├ users    │
│ lib/*.ts ────┼── HTTPS ──▶│  Drizzle ────────┼────────▶│   ├ children │
│  (the seams  │            │   ↓              │         │   ├ sets     │
│   already    │            │  Clerk verify    │         │   ├ cards    │
│   exist ✅)  │            │   ↓              │         │   ├ reviews  │
│              │            │  Inngest ────────┼────────▶│   └ sessions │
│ SecureStore  │            │   ├ AI set gen   │         └──────────────┘
│  (offline    │            │   ├ nightly SRS  │
│   cache)     │            │   └ weekly email │         ┌──────────────┐
└──────────────┘            └──────────────────┘         │  ImageKit    │
                                                          └──────────────┘
  ❌ NEVER: client → Postgres.  Client talks to the API. Always.
```

**The good news, and it is genuinely good:** the seams are already there and they are clean. `study.ts:1-3`, `children.ts:5-8`, `reviews.ts:11-13`, `analytics.ts:9-12`, `subjects.ts:11-13`, `curriculum.ts:10-12`, `rewards.ts:1-3`, `search.ts:10-12` — every one names itself as the swap point. Whoever wrote this planned for the backend. That is a month saved. Two caveats: `study.ts:3` documents a seam (`useStudySets`) that was never written, and three screens import `STUDY_SETS` directly, bypassing the seam. Close those before the migration, not during.

### 6.5 Component layer — the missing floor

```
src/components/
├─ primitives/        ← DOES NOT EXIST. Build first.
│   ├─ button.tsx       variant: primary|secondary|ghost|danger · size · loading · disabled
│   ├─ card.tsx         variant: flat|elevated|wash
│   ├─ row.tsx          icon · label · value · chevron · onPress   (kills 3 copies)
│   ├─ section.tsx      title · action                             (kills 2 copies)
│   ├─ stat-tile.tsx    symbol · value · label · tint              (kills ~6 copies)
│   └─ pill.tsx         the copy-pasted CTA, once
├─ child-avatar.tsx   ✅ keep — the GLYPH_STEPS measure logic is genuinely good
├─ empty-state.tsx    ✅ keep — reused 9×, doubles as the error surface
├─ progress-ring.tsx  ✅ keep — and its Record-of-classes pattern is the fix for paused.tsx:149
├─ skeleton.tsx       ⚠️ delete StatRowSkeleton (0 refs)
└─ styled.ts          ⚠️ add cssInterop(SymbolView) — erases 11 AGENTS.md violations in 1 line
```

---

## 7. The plan

### Phase 0 — Stop the bleeding (1 week)

Nothing else ships until these are done.

1. `(parent)` route group + gate guard + gate store. Move 5 routes in. **Delete the three false "behind the gate" comments** — or make them true.
2. Fix `reviews.ts:77-88` — `await` before `hydrated`, `emit()` in the catch, Sentry the parse failure, `.bak` the corrupt blob.
3. Randomise gate operands, add attempt lockout, add cancel, add wrong-answer feedback. Kill auto-submit.
4. **Decide the streak question.** Then execute it. My recommendation: rip them out.
5. Rewrite or remove the two false paywall claims. Fix "Renews 12 May 2025".
6. Move the edit pencil off `/home` into gated `/children`.
7. `cardsTotal` → `cards.length`, computed. `issued` → `new Date()`.
8. Turn off `sendDefaultPii`, or document why not.
9. Wire `/parent-content` and `/notifications` to `useChildren`. Stop showing parents someone else's family.

### Phase 1 — Make it real (3–4 weeks)

10. Neon + Drizzle + schema + migrations. Move content server-side. The seams are ready.
11. RevenueCat + entitlements + a real `isPro`. Gate the things the paywall claims.
12. Tests: Jest + RNTL. Start with the pure functions — `quizAttempt`, `encodeAnswers`/`decodeAnswers`, the Leitner intervals, `curriculumForYear`. Cheapest coverage in the repo.
13. CI: `tsc --noEmit` + `lint` + tests on every PR. The gates are already clean; make them stay clean without a human remembering.
14. Wire or delete all 10 dead controls.
15. `primitives/` — button, card, row, section, stat-tile, pill. Then delete the copy-paste.
16. `cssInterop(SymbolView)`. Fix `paused.tsx:149`. Fix the `as never`. Delete `reset-project`. Delete dead skeletons. Reconcile the ~12 duplicate colours.

### Phase 2 — Make it good (4–6 weeks)

17. Real downloads: `expo-file-system`, manager, queue, storage-full, delete.
18. `expo-notifications`: reminders and weekly summaries. Parent-configurable, off by default.
19. Accessibility §19 in full — dyslexia mode, high contrast, reduced motion, text-size. **This is a children's app.** Ship the whole section, not the labels alone.
20. The other 5 question types (drag-drop, matching, fill-blank, multi-select, ordering). Every quiz is currently a 4-option MCQ and children notice sameness faster than adults.
21. Audio pronunciation. Non-negotiable for Reception/Y1 and for Languages, and it is listed in §6 already.
22. Help & Support §18 — all 8. App Review will ask.
23. Resolve `RoundedHeading`. Either fix the `@expo/ui` `Host` crash or ship a real rounded font file. **The design system's heading face is currently not rendering anywhere.**
24. Product analytics. Today you cannot answer "did a child learn anything" — the parent dashboard is a hash function.

### Phase 3 — Make it defensible (ongoing)

25. AI set generation via Inngest — server-side, reviewed before publish. **Never let generated content reach a child unreviewed.**
26. Curriculum Explorer as the moat: full NC coverage, objective-level tracking, term alignment.
27. i18n — Welsh first (statutory in Wales), then Scottish CfE.
28. ImageKit for all remote images. `expo-image` is already in place.

---

## 8. Good practice — keep, start, stop

**Keep:** token discipline with documented inference · px-pinned spacing with its written rationale · native tabs · `useSyncExternalStore` module stores · Sentry-tagged catches · `EmptyState` reuse · documented API seams · zero `any` · zero TODOs · `.env` hygiene · accessibility labels · `expo install` over `npm install`.

**Start:** route-group guards for anything that spends money or touches PII · derive numbers, never author them (`cardsTotal`, `issued`) · primitives before screens · tests on pure functions · CI enforcing what is already clean · deleting dead affordances instead of leaving them inert · **making comments true or deleting them**.

**Stop:** comments that assert security that does not exist · hardcoded demo names in parent-facing UI (`Amara`, `Rufus`) · `?? "demo-amara"` fallbacks that silently misroute real data · shipping mechanics the brief rejects · advertising features that do not exist · module-load `TODAY` constants · dates typed by hand.

---

## 9. The three questions for the exec team

1. **Streaks: in or out?** The brief says out. Six screens say in. Both cannot be true, and the answer determines the reward architecture, the marketing, and arguably the brand. *Recommendation: out. It is the only defensible differentiator you have against Duolingo-style incumbents, and it is what UK parents of primary-age children actually ask for.*
2. **AI: real or removed from the pitch?** The paywall sells it. The app has none. Either build it (Inngest + reviewed generation, ~6 weeks) or stop selling it. The current state is a claim you cannot support to a regulator. *Recommendation: build it — but reviewed, never live-to-child.*
3. **What is the actual moat?** Not the flashcards; anyone can build those. **It is the Curriculum Explorer** — 90% built, genuinely differentiated, and the thing a UK parent cannot get from Duolingo or Quizlet. Resource it like the moat it is, and put it at the emotional peak of the child's flow (see §6.3), not three taps deep in a browser.

---

*Prepared from a full static sweep of 44 route files, `src/lib` (2,564 LOC), `src/components`, `src/design/tokens.js`, `tailwind.config.js`, `app.json`, and `.env`; plus a live deep-link smoke test of 30+ screens on iPhone 17 Pro / iOS 26.5. Screenshots in `design/.audit/`. Build gates verified: `tsc --noEmit` clean, `expo lint` clean, 0 test files, 0 CI workflows.*
