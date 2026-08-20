# GoKid — Diagnostic Report

**Date:** 20 July 2026
**Branch:** `Phase-2`
**Environment:** iPhone 17 simulator (iOS 26.5), Metro dev server, adhoc-signed dev build

---

## Scope, and what could not be run

Five things were requested. Three ran as asked; two need correcting rather than faking.

| Requested | Status | Note |
| --- | --- | --- |
| Smoke test | **Ran** | 22-route deep-link sweep on a live simulator, with screenshots and log capture |
| `/systematic-debugging` | **Ran** | Applied to two defects the smoke test surfaced |
| `/mobile-app-launch-checklist` | **Ran** | Full launch-readiness audit against the codebase |
| `/debug` | **Does not exist** | Not a skill in this project. `systematic-debugging` is the real one and was used instead |
| `/doctor` | **Substituted** | Not a project skill — it is a Claude Code CLI built-in that checks the *editor installation*, not this app. `npx expo-doctor` was run instead, which is the tool that actually diagnoses an Expo project |
| `/app-review-analyzer` | **Not applicable** | That skill analyses *App Store user reviews of a published app*. GoKid is not on the App Store, so there is no review data. No output was invented |

**Evidence policy:** every claim below is marked as either directly verified in this session, or reported by a sub-audit. Nothing is asserted from memory.

---

## 1. Smoke test — PASS

The app was launched on the simulator and driven through 22 routes by deep link, screenshotting each.

### Headline result

**The app runs end-to-end.** It boots past the splash, Clerk authenticates, real child profiles load, and every screen swept rendered real content. **Zero JavaScript errors, zero exceptions, zero blank renders across all 22 routes.**

This is a change from earlier in the day, when the app hung permanently on the splash screen. Root cause of that hang, now confirmed: the build had been produced with `CODE_SIGNING_ALLOWED=NO`, leaving the binary unsigned, so every Keychain call failed with `OSStatus -34018` and Clerk's `isLoaded` never flipped — leaving `src/app/index.tsx:21` rendering `<Splash />` forever. Re-signing adhoc (`codesign --force --sign -`) fixed it. **A `-34018` count of 0 across the whole sweep confirms the resolution.**

### Routes swept

`home` · `study` · `search` · `curriculum` · `bookmarks` · `offline` · `notifications` · `progress` · `progress/overview` · `progress/achievements` · `progress/calendar` · `progress/history` · `progress/statistics` · `progress/journey` · `progress/mastery-timeline` · `subject/maths` · `lesson/place-value` · `flashcard/place-value` · `quiz/instructions/place-value` · `study/session/place-value` · `parent` · `settings`

### Specifically verified by screenshot

- **Study Session renders and works.** Real card ("What is the value of the 4 in 452?"), a genuinely derived hint ("It's a 3-digit number"), four answer options, live progress `0 / 6`. This flow was unreachable dead code until a third CTA was added to Set Detail this session.
- **Set Detail shows all three CTAs** — Study cards / Study session / Take the quiz.
- **The parent passcode gate intercepts a deep link straight to `/settings`.** This is the security-critical guarantee, verified at runtime rather than only in code: an attempt to jump directly to the account screen hit "Create a passcode", not the account. SecureStore also hydrated correctly (it showed the create state, not a stuck spinner).

### Log analysis

All logged errors were simulator platform noise, unrelated to the app: missing `hapticpatternlibrary.plist` (CoreHaptics is not implemented on the simulator), `AVSystemController` allocation failures, `SecTrustReportNetworkingAnalytics`, and a refused connection to port 8097 (React DevTools not running). **No application-level error appeared in any of them.**

### Static route integrity — PASS

A reachability graph was built over all routes, resolving every navigation target against real route patterns including dynamic segments:

- **59 routes**
- **0 broken links** — every `href` resolves
- **0 dead screens** — the only unreachable route is `+not-found`, which is correct (expo-router serves it on unmatched URLs)

---

## 2. `npx expo-doctor` — PASS

```
20/20 checks passed. No issues detected!
```

Also verified directly this session: `npx tsc --noEmit` clean, `npm run lint` clean.

---

## 3. Systematic debugging — 2 defects

### Defect 1 — Content clipped behind the native tab bar (CONFIRMED)

**Symptom:** On Study Session, the footer card is cut off behind the floating tab bar — "Finish 6 cards", "…uracy", "rated yet" are all partially hidden. Confirmed visually in the smoke-test screenshot.

**Root cause:** `expo-router`'s iOS native-tabs implementation applies automatic scroll-inset adjustment **only to the screen registered as a tab's root** (`study/index.tsx`, `progress/index.tsx`). Screens *pushed* onto a tab's own `Stack` never receive it and must self-compensate.

The codebase already knows this — `tailwind.config.js:33-38` defines `pb-28` (112px) explicitly as "clearance for the iOS 26 native floating tab bar" for pushed screens. The mechanism is right; **the number is a hand-measured guess and is short by roughly one line of text** on this device/OS. There is no JS API to query the real height here, because `NativeTabs` renders through `react-native-screens`' SwiftUI host rather than the JS bottom-tabs navigator whose `useBottomTabBarHeight` hook would otherwise provide it.

**Fix:** a magic-number correction, not a structural change. Re-measure and raise the token, keeping the existing `tailwind.config.js` pattern. No architecture change needed.

**Blast radius — this is wider than the one screen:**

*Applying `pb-28`, so same too-short value:*
`study/answer-result/[id].tsx:212` · `study/session-summary/[id].tsx:163` · `study/set-result/[id].tsx:127` · `study/congratulations/[id].tsx:153` · `progress/achievements.tsx:96` · `progress/overview.tsx:268` · `progress/subject/[subject].tsx:158` · `progress/calendar.tsx:279`

*Missing the compensation entirely — worse, and using padding meant for tab-root screens:*
`progress/journey.tsx:102` (`pb-10`) · `progress/mastery-timeline.tsx:98` (`pb-10`) · `progress/statistics.tsx:115` (`pb-10`) · `progress/history.tsx:94` (`pb-8`)

Those last four are pushed inside `progress/_layout.tsx`'s Stack — the identical no-auto-inset condition — with *less* padding than a screen already proven insufficient.

### Defect 2 — Stray gear icon overlaying unrelated screens (OPEN — unresolved)

**Symptom:** A translucent circular gear appears at a fixed top-right position on multiple unrelated screens — Study Session, Set Detail (where it **obscures the download button**), and even on top of the full-screen parent passcode gate.

Two hypotheses were tested and **both were disproven**:

1. *A real app element leaking across screens* — **ruled out by code search.** The only screen-level gear glyph in `src/` is in `study/session/[id].tsx:112`, inside that screen's own header. The root layout (`src/app/_layout.tsx`) is only `SafeAreaProvider > ClerkProvider > Stack` — no portals, no overlay layer, nothing outside the navigator. No shared settings-button component exists. The passcode gate imports no gear at all. There is no code path by which one screen's gear can paint over another route group.
2. *An OS/simulator overlay such as AssistiveTouch* — **ruled out by experiment.** The app was terminated and the springboard screenshotted: **no gear.** An OS-level overlay would persist with the app closed. It does not.

**Status: genuinely unexplained.** It is in-app (vanishes when the app closes) but has no in-app source (no shared component, no global overlay). Remaining candidates worth a narrow repro: a separate `UIWindow` from a dev-tooling layer, a stale Metro/dev-client artifact, or a screenshot-timing artifact captured mid-transition.

**Recommendation: do not change any code on the current evidence.** Next step is a targeted repro — navigate manually (not by deep link) and screenshot, then repeat on a fresh build with the dev client detached. If it only appears under deep-link navigation or only in dev builds, it is not a product defect.

---

## 4. Launch readiness

> Sub-audit result. The highest-impact claims were independently re-verified in this session and are marked ✅ **verified**.

### The single biggest blocker

**A release build cannot load any data at all.** `src/lib/api.ts:19` throws `"No API base URL. Set EXPO_PUBLIC_API_URL for release builds."` when that variable is unset. In development it silently falls back to Metro's `hostUri`, which is why nothing is wrong today — but in TestFlight or the App Store, every content, sync and progress screen dies immediately after the splash.

✅ **verified:** `EXPO_PUBLIC_API_URL` is absent from the environment. Every Expo command this session prints its exported variables, and the list contains 12 names — that is not one of them.

This is an outright **Guideline 2.1 rejection** ("app not fully functional"), and a reviewer would hit it within two minutes.

Compounding it: there is **no deployment target for the server**. `app.json` sets `web.output: "server"`, so the API routes need a hosted Node server, and the repo has no `vercel.json`, `Dockerfile`, `render.yaml`, or deploy script.

### Other blockers ✅ verified directly

| Item | Status | Evidence |
| --- | --- | --- |
| `eas.json` | **MISSING** | No build profiles, no submit config. There is no reproducible way to produce a release IPA |
| `ios.buildNumber` | **MISSING** | Not in `app.json`, and no auto-increment policy exists without `eas.json` |
| `ITSAppUsesNonExemptEncryption` | **MISSING** | Not declared; every submission will prompt manually. Set `false` (standard HTTPS only) |
| `android.permission.RECORD_AUDIO` | **DECLARED BUT UNUSED** | `app.json:24`. No audio API is used anywhere in `src/`. On a children's app, declaring an unused sensitive permission is exactly what reviewers and regulators flag |
| Apple Developer Program | **NOT ENROLLED** | 0 codesigning identities. Blocks everything downstream |
| Tests | **NONE** | 0 test files |
| CI | **NONE** | No `.github/` |

### Corrections to earlier assumptions

The audit found the project is **further along than previously recorded**, and two things believed missing are in fact done:

- **`expo-notifications` IS installed** (`~57.0.6`) ✅ verified. Local daily reminders are implemented, off by default, parent-set, addressed to the parent. A stale comment at `src/lib/notifications.ts:12` still claims it isn't installed and should be corrected.
- **Neon Postgres is live and migrated** — 9 tables, 27 study sets, 160 cards, hosted `eu-west-2` (London). The client correctly goes through API routes and never touches Postgres directly.

### Kids Category — a decision that needs making deliberately

**Recommendation: do not enrol in Apple's Kids Category.** The app requires an adult Apple/Google SSO sign-in before a child profile is reachable, which is fundamentally incompatible with the Kids Category's restrictions on sign-in flows and third-party SDKs. Submit as a standard **Education** app with a parental gate — which is what is actually built — and a conventional age rating.

The UK Children's Code posture is genuinely strong for this stage: `sendDefaultPii: false` is deliberate and commented with the ICO framework named, data lives in London, child data is limited to first name and year group, and the certificate-share and child-delete paths were both gated citing the Children's Code specifically.

One durable risk: `src/app/data-usage.tsx` asserts in user-facing copy that there is no ad SDK, no analytics SDK and no third-party tracker. That is true today ✅ verified, but it silently becomes a false statement to parents the moment anyone adds a dependency. Worth a CI check that fails if `package.json` gains an SDK without that copy being updated.

### Ordered path to submission

1. **Deploy the API server** over HTTPS and set `EXPO_PUBLIC_API_URL`. Nothing else matters until this is done.
2. **Enrol in the Apple Developer Program.** Also unblocks device builds and billing.
3. **Create `eas.json`** with build/submit profiles; add `ios.buildNumber` / `android.versionCode`.
4. Set `ITSAppUsesNonExemptEncryption: false`.
5. Remove the unused `RECORD_AUDIO` permission.
6. First EAS build → TestFlight, pointed at the deployed API. This is also the first real end-to-end test of the backend from a compiled client — it has never run outside the Metro dev server.
7. Decide category and age rating; complete App Privacy / Data Safety to match `data-usage.tsx`.
8. Submit with reviewer notes explaining how to authenticate — the app is SSO-only, with no email/password, so reviewers need explicit instructions.

---

## 5. App review analysis — not applicable

Requires a published app with user reviews. GoKid is not on the App Store. Re-run after launch; it becomes genuinely useful once there is review volume to mine for defect patterns and feature requests.

---

## Consolidated priorities

**P0 — blocks submission**
1. Deploy API + set `EXPO_PUBLIC_API_URL`. A release build is non-functional without it.
2. Apple Developer Program enrolment.
3. `eas.json` + build number.

**P1 — would draw a reviewer query or a rejection**
4. Remove unused `RECORD_AUDIO`.
5. Declare `ITSAppUsesNonExemptEncryption`.
6. Fix tab-bar clipping — 12 screens affected, 4 of them badly.

**P2 — correctness and hygiene**
7. Resolve the stray gear (repro first; change no code yet).
8. Fix the stale `notifications.ts:12` comment.
9. Add tests for the pure logic (SRS intervals, quiz scoring) and a CI workflow — nothing currently keeps `tsc`/lint green except a human remembering.

---

## What was not verified

- **No physical device testing.** Everything here is the iOS simulator. No Android run at all.
- **No release/production build was ever produced**, which is precisely why the `EXPO_PUBLIC_API_URL` failure has stayed invisible.
- **The sweep used deep links, not human navigation.** It proves each screen renders; it does not prove every button works.
- **No interaction testing** — no passcode was actually entered, no quiz completed, no purchase attempted.
- **`.env` was not read directly** (blocked by permission). The `EXPO_PUBLIC_API_URL` finding rests on Expo's own printed export list, which is independent evidence.
