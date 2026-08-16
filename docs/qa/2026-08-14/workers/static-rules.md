# qa-static — worker report: AGENTS.md compliance, rejected mechanics, tab-bar clearance

**Worker:** qa-static (Tier 0, static-only)
**Date:** 2026-08-14
**Scope:** Concern 3 (AGENTS.md §2/§3 rule compliance), Concern 4 (rejected motivational mechanics),
Concern 5 (tab-bar clearance). No simulator, no dev server, no DB touched. `git`-read, `npx tsc --noEmit`
and `npm run lint` only.

**Baseline documents re-checked, not inherited:** `ceoaudit.md` (17 Jul 2026), `docs/Report.md` (20 Jul
2026). Every claim from those documents that falls in my scope is labelled below.

**Automated gates**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **Clean.** Zero output, exit 0. |
| `npm run lint` (`expo lint`) | **Clean.** Exits 0 after env load; zero lint errors/warnings printed. |

---

## Findings table

| id | severity | area | file:line | status | claim | evidence | recommended fix |
|---|---|---|---|---|---|---|---|
| F1 | P4 | rejected mechanics | `src/app/(app)/(tabs)/progress/achievements.tsx:20-33`, `.../study/session-summary/[id].tsx:39-40`, `.../study/answer-result/[id].tsx:20,286`, `.../study/set-result/[id].tsx:20,168`, `.../study/congratulations/[id].tsx:20`, `.../study/session/[id].tsx:21-22,140`, `.../progress/calendar.tsx:232,280` | **FIXED (evidence)** | ceoaudit.md §3.1 (P0): "5-day streak flame" on Learning Calendar, "7-Day Streak" badge + "Total points 520 · Level 5 · 520/700" + "View leaderboard" banner on Achievements, "Best streak 9" on Congratulations, "Best streak: 9" on Session Summary, "Current streak 9 / Best: 9" on Answer Result, "Longest streak: 8" on Set Result. | Read every one of those six screens end to end. None renders a streak count, a point total, a level/XP bar, or a leaderboard link. Each carries an explicit removal comment quoting exactly what ceoaudit described and why it's gone, e.g. `achievements.tsx:20-24`: "This screen was previously built from the mockup's gamification layer — points, levels, a 7-Day Streak badge and a leaderboard banner — all of which contradict that brief. They are gone." `set-result/[id].tsx:20`: "'Longest streak' tile is gone — design/gokid-screens.md §9 rejects streaks." Achievements is now driven by `src/lib/milestones.ts`, a pure threshold system on real SRS/curriculum counts (`retained`, `setsFinished`, `subjects`, `objectivesMet`) with an explicit anti-smuggling comment (`milestones.ts:14-16`): "No time-based or consecutive-day criteria: those would smuggle a streak back in under another name." | None — this is the single highest-value finding in the whole audit and it now reads as a **pass**. Only residual risk: nothing in CI enforces this; a future PR could reintroduce a streak/points widget with nobody noticing. Recommend a lint/grep CI check for `leaderboard`, `\bstreak\b` outside comments, `\bpoints earned\b`, `\blevel\s*\d`. |
| F2 | P3 | AGENTS.md §2 | `src/components/styled.ts:1-10` | **STILL TRUE (reduced)** | ceoaudit.md §3.14: "11 of the 12 `style={{}}` violations... are all `SymbolView` margins, because `styled.ts` wires `cssInterop` for `Image` and `SafeAreaView` but not `SymbolView`." | `styled.ts` today still only calls `cssInterop(Image, …)` and `cssInterop(SafeAreaView, …)`; no `SymbolView` entry. 8 `style={{ margin… }}` literals remain on `SymbolView`, down from 11: `curriculum.tsx:136,232`, `result/[id].tsx:30,117`, `study/session-summary/[id].tsx:253,262`, `study/answer-result/[id].tsx:345`, `subject/[subject].tsx:149,304`. Count went from 11→8 because some of those screens were rewritten in the interim (not because the SymbolView fix landed). | Add `cssInterop(SymbolView, { className: "style" })` to `styled.ts` and re-export `SymbolView` from there, then replace the 8 `style={{ margin* }}` calls with `className="ml-2"` etc. One-line fix, as ceoaudit already noted. |
| F3 | P4 | AGENTS.md §2 | `src/app/(app)/home.tsx:83-88` | **VERIFIED — compliant exception** | AGENTS.md §2: "No `StyleSheet.create`. No inline `style={{}}`." | `style={{ transform: [{ scale }] }}` on an `Animated.View`, driving a `React Native Animated.Value` for a press-scale micro-interaction. The line is preceded by a comment explaining exactly why: "The one place this file uses an inline style... a className cannot carry an Animated.Value — this is the documented API for an animated transform, not a styling shortcut." This is the only inline-style use in the file and the only one of its kind in the repo. | None required. This is the correct, documented exception to the rule (an `Animated.Value` genuinely cannot be expressed as a Tailwind class). If a policy wants zero exceptions, `useAnimatedStyle`/Reanimated would be the alternative, but that is a larger dependency change, not a quick fix. |
| F4 | P3 | AGENTS.md §2 (raw literals) | 21 lines across 15 files — see list in Concern 3 section below | **VERIFIED — new finding, not in either prior audit** | AGENTS.md §2: "No raw color, spacing, or font-size literals. Extend `tailwind.config.js` theme and use the token." | 21 Tailwind arbitrary-value (`[...]`) usages for spacing/size/font-size/line-height that have no corresponding `tailwind.config.js` token, e.g. `text-[52px]` (`study/congratulations/[id].tsx:174`, the trophy emoji — no token exists even though the design system already has a documented `avatar` 64px emoji-glyph precedent for exactly this situation), and a repeated `leading-[34px]` / `leading-[28px]` pattern (`result/[id].tsx:77`, `study/session/[id].tsx:178`, `quiz/[id].tsx:540`, `quiz/review/[id].tsx:119`) that duplicates the line-height **already bundled** in the `text-h2`/`text-h3` font-size tuples (`tailwind.config.js:73-75`: `h2: ["28px","34px"]`, `h3: ["22px","28px"]`) — i.e. these are not filling a token gap, they are literally restating a value the token already carries. | For the redundant `leading-[Npx]` group: delete them, the base `text-h2`/`text-h3` class already sets that line-height — check on-device that the redundancy isn't there to work around an RN line-height rendering quirk before deleting (`docs/Report.md`'s tab-bar padding rationale shows this codebase has hit real RN measurement surprises before, so verify rather than assume). For genuine gaps (`text-[52px]`, the `h-[72px] w-[72px]` icon circle on `parent.tsx:34`/`passcode.tsx`, `max-w-[360px]` card width repeated in `parent.tsx:33`, `paywall.tsx`, `passcode.tsx:83`, `parent-gate.tsx:184`): promote the repeated ones to named tokens the way `tailwind.config.js` already does for `avatar`, `card`, `cube`, etc. — each with the same "measured off design/X, here's why" comment convention already in use. |
| F5 | P4 | AGENTS.md §2 | `src/components/google-mark.tsx:5-8` | **STILL TRUE — compliant exception** | ceoaudit.md §2: "Only 4 raw hex values in the entire app, all four in `google-mark.tsx` and all four correctly commented as Google brand identity colours that must not be themed." | Unchanged: `BLUE/GREEN/YELLOW/RED = "#4285F4"/"#34A853"/"#FBBC05"/"#EA4335"`, with the comment "Google's four brand colours are fixed by their identity guidelines and are not theme tokens — they never change with our palette." Confirmed no other raw hex anywhere in `src/app` or `src/components`. | None. Correct exception. |
| F6 | — | AGENTS.md §2/§3 | repo-wide | **VERIFIED — compliant** | AGENTS.md §2/§3: no `StyleSheet.create`, no `@react-navigation` imports. | `grep -rn "StyleSheet.create" src/` → 0 hits. `grep -rn "@react-navigation" src/` and `package.json` → 0 hits (not even a transitive direct import). Native tabs confirmed at `src/app/(app)/(tabs)/_layout.tsx:1,12`: `import { NativeTabs } from "expo-router/unstable-native-tabs"`. | None. |
| F7 | — | AGENTS.md §3 (`catch {}`) | repo-wide | **VERIFIED — compliant, stronger than ceoaudit's snapshot** | AGENTS.md §3: "Swallowing errors (`catch {}`). Report to Sentry with context." ceoaudit.md §2 said 10/12 catches reported to Sentry, with `reviews.ts` and `certificate/[id].tsx:42` as the exceptions and `reviews.ts` specifically flagged in §3.3 as a P0 silent-data-loss bug. | Read all 60+ `catch` sites in `src/`. Zero are bare `catch {}` with no body. Every bare-param `catch {` (e.g. `db/auth.ts:50`, `bookmarks.ts:71`, `downloads.ts:98`, `help.tsx:30`, `parent-gate.tsx:86`, `passcode.tsx:50`, `study.ts:1441`, `storage.tsx:62`) carries either a `Sentry.captureException` call or a one-line comment stating why the failure is deliberately not reported (routine 401, informational-only screen, etc.). `reviews.ts:77-99` — the exact P0 ceoaudit cited — now `await`s before setting `hydrated`, calls `Sentry.captureException(error, { tags: { flow: "progress-hydrate" } })`, backs up the corrupt blob to a `.bak`-style side key, and unconditionally `emit()`s in the `finally` so subscribers re-render rather than keep showing a stale empty snapshot. | None required for this concern. (Full data-integrity re-verification of `reviews.ts` belongs to whichever worker owns the CRUD/data-honesty concern — flagging here only because it intersects the `catch{}` rule.) |
| F8 | — | tab-bar clearance | `src/app/(app)/(tabs)/study/answer-result/[id].tsx:212`, `.../study/session-summary/[id].tsx:165`, `.../study/set-result/[id].tsx:127`, `.../study/congratulations/[id].tsx:153`, `.../progress/achievements.tsx:96`, `.../progress/overview.tsx:268`, `.../progress/subject/[subject].tsx:163`, `.../progress/calendar.tsx:279`, `.../progress/journey.tsx:102`, `.../progress/mastery-timeline.tsx:98`, `.../progress/statistics.tsx:115`, `.../progress/history.tsx:94` | **FIXED (evidence)** | `docs/Report.md` (20 Jul), Defect 1: 12 offenders — 8 screens at `pb-28` (short by ~one line), 4 screens (`journey`, `mastery-timeline`, `statistics`, `history`) at `pb-10`/`pb-8`, using the tab-**root** padding on a **pushed** screen. | All 12 files now read `contentContainerClassName="pb-35 …"` (`history.tsx` is `pb-35` with no `pt-2`, the other 11 are `pb-35 pt-2`). Confirmed via `git log`: commit `4e1d9bf` "fix: tab-bar clearance across pushed (tabs) screens" (in the 5 most recent commits) is the fix. `tailwind.config.js:58` still documents `35: "140px"` as the tab-bar clearance token with the same rationale ceoaudit quoted. | None. This is closed. |
| F9 | — | tab-bar clearance | `src/app/(app)/(tabs)/study/index.tsx:292`, `.../progress/index.tsx:134` | **VERIFIED — compliant** | CLAUDE.md: "Root tab screens use `pb-6`." | Both tab-root screens use `pb-6` (`study/index.tsx:292`: `contentContainerClassName="pb-6"`; `progress/index.tsx:134`: `contentContainerClassName="pb-6 pt-2"`), correctly relying on UIKit's automatic scroll-inset for the root screens instead of the manual 140px token. | None. |
| F10 | P4 | tab-bar clearance / UI consistency | `src/app/(app)/(parent)/paywall.tsx:83` vs. every other `(parent)/*` screen | **VERIFIED — minor inconsistency, not a clipping bug** | N/A (new observation, not in either prior audit). | Every other screen in the `(parent)` route group uses `pb-10` for its `ScrollView` bottom padding (`about.tsx`, `accessibility.tsx`, `children.tsx`, `settings.tsx`, `profile.tsx`, `parent-analytics.tsx`, `parent-content.tsx`, `reminders.tsx`, `study-goal.tsx`, `subscription.tsx`, `sync.tsx`, `storage.tsx`, `faq.tsx`, `help.tsx`, `data-export.tsx`, `delete-account.tsx`, `child/[id].tsx` — all confirmed). `paywall.tsx:83` alone uses `pb-4`. **This is not a tab-bar clearance defect** — `(parent)` is a sibling route group of `(tabs)` under `(app)`'s root `Stack` (`(app)/_layout.tsx:12`), not nested inside `NativeTabs`, so no floating pill is ever present behind these screens and `pb-35` does not apply here at all. It is a plain visual inconsistency: the paywall's CTA row and legal text sit 24px closer to the bottom edge than every sibling screen. | Change `pb-4` → `pb-10` on `paywall.tsx:83` to match the group's own convention, or add a one-line comment if the tighter padding is deliberate (e.g. to keep the price + CTA above the fold on a small device). |
| F11 | — | tab-bar clearance | `src/app` — `pb-35` usage audit | **VERIFIED — no misuse, no regressions elsewhere** | N/A. | `grep -rln "pb-35" src/app` returns exactly the 12 files in F8 (plus nothing else) — the 140px token is used only where it's needed and nowhere it isn't (e.g. it does not leak into `(parent)/*` or root `(app)` screens like `quiz/[id].tsx`, `flashcard/[id].tsx`, `lesson/[id].tsx`, `subject/[subject].tsx`, which correctly use smaller values because they render outside `NativeTabs` entirely, matching ceoaudit's own routing diagram: "`flashcard` → `quiz` → `result` → `certificate` live at `(app)` root — no tab bar"). No `FlatList`/`SectionList` exists inside `(tabs)/**` that would need separate `contentContainerStyle` handling — every scroll surface there is a plain `ScrollView`. | None. |

---

## Concern 3 — AGENTS.md rule compliance

**Method:** `grep -rn` across `src/app` and `src/components` (and `src/` broadly for the `@react-navigation` /
`StyleSheet.create` checks) for each of the five rule categories, then read every hit in context.

- **`StyleSheet.create`:** zero occurrences anywhere in `src/`. Compliant.
- **`@react-navigation` imports:** zero occurrences in `src/` or `package.json` (not even as a transitive
  direct import). Native tabs confirmed wired through `expo-router/unstable-native-tabs`
  (`(tabs)/_layout.tsx:1,12`). Compliant.
- **Inline `style={{}}`:** 9 occurrences, down from ceoaudit's 12 (11 `SymbolView` + `paused.tsx:149`).
  `paused.tsx:149`'s dynamic-background-colour violation ceoaudit flagged is **gone** — the file now
  drives its tile tints via a `Record`-of-Tailwind-classes lookup (`wash: "bg-gamify-flame-wash"` etc.,
  see `paused.tsx:79`), exactly the fix ceoaudit recommended by pointing at `progress-ring.tsx`'s
  existing pattern. What remains: **8 `SymbolView` margin literals** (F2) because `styled.ts` still
  never wires `cssInterop` for `SymbolView`, and **1 legitimate, documented exception** on an
  `Animated.View` transform (F3) that cannot be expressed as a class. Net: the fixable violation count
  dropped from 12→8, and the one that got fixed (`paused.tsx:149`) was fixed exactly the way ceoaudit
  suggested.
- **Empty `catch {}`:** zero truly empty catch blocks anywhere in `src/`. Every bare `catch {` either
  reports to Sentry or carries an explicit one-line rationale for not doing so (see F7). This includes
  `reviews.ts`, which ceoaudit's §3.3 flagged as a P0 silent-data-loss bug from a swallowed
  `JSON.parse` failure — that code path is now `await`-ordered correctly, Sentry-reported, and
  non-destructive (backs up the corrupt blob rather than discarding it). I did not independently verify
  this data-integrity claim at runtime (no simulator access in this role); flagging it here only because
  it is the concrete instance of the `catch{}` rule ceoaudit cited, and the code now visibly satisfies
  both AGENTS.md's rule and ceoaudit's specific complaint. A device-tier worker should still exercise
  the corrupt-blob path to confirm behaviour at runtime.
- **Raw hex:** 4 occurrences, unchanged from ceoaudit, all in `google-mark.tsx`, all a documented,
  correct exception for Google's fixed brand colours (F5).
- **Arbitrary Tailwind values:** this is the one genuinely new finding in this concern (F4) — neither
  prior audit checked for `[...]` bracket syntax specifically. 21 lines across 15 files use an
  arbitrary value with no backing token:

  ```
  src/app/(app)/(parent)/delete-account.tsx:132   max-w-[45%]
  src/app/(app)/(parent)/passcode.tsx:83           max-w-[360px]
  src/app/(app)/(parent)/paywall.tsx:88            w-[62%]
  src/app/(app)/(parent)/paywall.tsx:101           leading-[46px]
  src/app/(app)/(tabs)/parent.tsx:33               max-w-[360px]
  src/app/(app)/(tabs)/parent.tsx:34               h-[72px] w-[72px]
  src/app/(app)/(tabs)/study/answer-result/[id].tsx:53   h-[132px] w-[132px]
  src/app/(app)/(tabs)/study/congratulations/[id].tsx:174  text-[52px]
  src/app/(app)/(tabs)/study/index.tsx:324         leading-[28px]
  src/app/(app)/(tabs)/study/session-summary/[id].tsx:250  flex-[2]
  src/app/(app)/(tabs)/study/session/[id].tsx:178  leading-[34px]
  src/app/(app)/flashcard/[id].tsx:248             flex-[3]
  src/app/(app)/flashcard/[id].tsx:255             flex-[2]
  src/app/(app)/home.tsx:100                       w-[46%]
  src/app/(app)/offline.tsx:59                     aspect-[820/636]
  src/app/(app)/quiz/[id].tsx:540                  leading-[34px]
  src/app/(app)/quiz/review/[id].tsx:119            leading-[34px]
  src/app/(app)/result/[id].tsx:69                 border-[6px]
  src/app/(app)/result/[id].tsx:77                 leading-[34px]
  src/components/parent-gate.tsx:184               max-w-[360px]
  src/components/passcode-pad.tsx:50               w-[30%]
  ```

  These split into three buckets, worth different treatment:
  1. **Redundant `leading-[Npx]`** (7 of the 21) — the value being "arbitrary" is a red herring; it
     restates a line-height the `text-h2`/`text-h3` token already carries per `tailwind.config.js:73-75`.
     Likely dead code from an earlier RN line-height workaround that outlived its cause.
  2. **Real gaps with a clear precedent** (`text-[52px]` for the trophy emoji, `h-[72px] w-[72px]` for an
     icon disc, `max-w-[360px]` repeated 4× for the same card width) — `tailwind.config.js` already has
     an established, documented convention for exactly this (`avatar: ["64px","72px"]` for an emoji
     glyph, `card: "20px"` for a measured radius). These should follow the same pattern rather than stay
     as unexplained arbitrary values.
  3. **Percentage/ratio layout values** (`w-[46%]`, `w-[62%]`, `max-w-[45%]`, `w-[30%]`,
     `aspect-[820/636]`, `flex-[2]`/`flex-[3]`) — these are proportional, not literal pixel/colour
     values, and Tailwind has no first-class token type for "46% of parent" the way it does for spacing.
     Lower priority; the letter of AGENTS.md §2 still technically flags them, but they are not the kind
     of drift the rule exists to prevent (a designer changing "8px" to "9px" in one place and not
     another).

## Concern 4 — Rejected mechanics (streak / leaderboard / lives / hearts / countdown / points / level)

**Method:** case-insensitive `grep -rn` for each of the seven terms across all of `src/`, then read every
hit's surrounding code to distinguish a rendered mechanic from a comment, a token name, or an unrelated
word (`level` as in `<View>` nesting depth, `points` as an SVG polyline, `lives` as in "lives in").

**Result: every mechanic ceoaudit found shipping on 17 July is gone as of today, and the removal is not
a reskin — it is documented, deliberate, and backed by a real replacement data model.**

- **Streak flame ("5 days"), `progress/calendar.tsx`:** gone. The screen now shows "Cards retained"
  (monotonic — `calendar.tsx:280`: "Not a streak: this only ever goes up, so a day off costs nothing.")
- **"7-Day Streak" badge, `achievements.tsx:88`:** gone. Replaced wholesale by `src/lib/milestones.ts`,
  a pure function over `{retained, setsFinished, subjects, objectivesMet}` — real SRS/curriculum counts,
  not authored numbers. `milestones.ts:14-16` explicitly bans "time-based or consecutive-day criteria"
  as a way to "smuggle a streak back in under another name."
- **"Total points 520 · Level 5 · 520/700", `achievements.tsx:45-79`:** gone. No points/XP/level
  concept exists anywhere in the current `achievements.tsx`, `session-summary`, `answer-result`,
  `set-result`, or `congratulations` screens. `session-summary/[id].tsx:173`: "The reference put '120
  points earned' here. Points are a proxy; cards learned is the thing itself."
- **"View leaderboard" banner, `achievements.tsx:270-275`:** gone. `grep -rn "leaderboard"` across all
  of `src/` returns zero rendered UI — every hit is a code comment citing §9's rejection.
- **"Best streak 9 — Keep it up!", `congratulations/[id].tsx:37`:** gone. The screen's own header
  comment (`:20`) names exactly this: "The reference draws four tiles: accuracy, cards, **best streak**
  and **points earned**. Both of [them are gone]."
- **"Best streak: 9", `session-summary/[id].tsx:40`:** gone, same file, comment at `:39-40` names it
  explicitly as removed and explains why ("a 'high score' invites the comparison a leaderboard would").
- **"Current streak 9 / Best: 9", `answer-result/[id].tsx:282-284`:** gone. `:20` and `:286` both name
  the removal.
- **"Longest streak: 8", `set-result/[id].tsx:171`:** gone. `:20` and `:168` name the removal.
- **Lives / hearts / countdown:** none of these mechanics were ever the ceoaudit's finding (it only
  found streaks/points/levels/leaderboard) but the brief also rejects them, so checked anyway — no
  rendered "lives" counter, no "hearts" health-bar mechanic, no countdown-timer pressure UI anywhere.
  The only `flame` symbols remaining in the app are (a) a "Tricky" card-count tile on the session-pause
  screen (`flashcard/paused.tsx:79`, a literal count of cards marked tricky, styled with the `flame.fill`
  SF Symbol and a `gamify.flame` colour token — not a streak), and (b) a "Longest day" personal-best
  metric on Learning Journey (`journey.tsx:152`) that is explicitly documented as permanent and
  non-resetting, the opposite of a streak (`journey.tsx:24-27`: "Personal best is the child against
  their own record, and it is permanent... structurally the [opposite of] a streak resetting.")

**This is a genuine, load-bearing fix, not cosmetic renaming.** The replacement system
(`lib/milestones.ts`, `lib/journey.ts`, `lib/calendar.ts`, `lib/mastery-timeline.ts`) is built entirely
on real spaced-repetition and curriculum-coverage data (`lib/reviews.ts`, `lib/curriculum.ts`), matches
`docs/Report.md`'s and ceoaudit's own recommended target design almost line for line (ceoaudit §6.3's
wireframe: "Deleted: 🔥 streak · points · levels · leaderboard... Kept: mastery · curriculum coverage ·
certificates · SRS return dates" — that is exactly what is on screen today), and every removal site
carries a comment naming the specific ceoaudit-cited copy it replaced, which strongly suggests this was
a direct, deliberate response to that audit rather than independent parallel work.

**One caveat, honestly stated:** this was verified by reading source and JSX, not by rendering the
screens on a simulator (out of scope for this role/tier). A component could theoretically compute a
milestone/count value that *looks* like a streak at runtime despite the source not naming one that way —
low probability given how explicit the counter-argument comments are, but a device-tier pass should
screenshot `progress/calendar`, `progress/achievements`, and the five post-session screens once to close
that gap definitively.

**Nothing enforces this staying true.** There is no lint rule, no CI grep, no test. A future PR reviving
"120 points earned" as a quick engagement win would not be caught by `tsc` or `expo lint`. Recommend
adding exactly the grep this worker ran as a CI step (see F1's recommended fix).

## Concern 5 — Tab-bar clearance

**Method:** enumerated every route file inside the two tab Stacks (`(tabs)/study/*`, `(tabs)/progress/*`)
plus the two tab-root screens and the `(tabs)/parent.tsx` entry screen, read each one's
`contentContainerClassName`, and cross-checked that `pb-35` is not used (and not needed) anywhere outside
`(tabs)/**`.

**Result: all 12 offenders from `docs/Report.md` (20 Jul) are fixed, and there are no new ones.**

- 8 screens previously at `pb-28` (112px, "measured ~one text line short"): `study/answer-result`,
  `study/session-summary`, `study/set-result`, `study/congratulations`, `progress/achievements`,
  `progress/overview`, `progress/subject/[subject]`, `progress/calendar` — **all now `pb-35`** (F8).
- 4 screens previously using the tab-root padding (`pb-10`/`pb-8`) despite being pushed screens:
  `progress/journey`, `progress/mastery-timeline`, `progress/statistics`, `progress/history` — **all now
  `pb-35`** (F8).
- The fix is traceable to a specific commit: `git log --oneline` shows `4e1d9bf fix: tab-bar clearance
  across pushed (tabs) screens; passcode-migration polish`, 5 commits back from `HEAD`.
- Both tab-root screens (`study/index.tsx`, `progress/index.tsx`) correctly use `pb-6`, relying on
  UIKit's automatic inset rather than the manual token (F9) — matching CLAUDE.md's stated rule exactly.
- I checked every route added to the tree since the 20 July report by walking the full `study/` and
  `progress/` directory listings (not just the 12 named offenders) — there are no additional pushed
  screens missing `pb-35`, and `pb-35` is not misapplied anywhere it isn't needed (F11): it never
  appears outside `(tabs)/**`, and root `(app)` screens like `quiz/[id]`, `flashcard/[id]`, `lesson/[id]`
  correctly use smaller padding because they render outside `NativeTabs` entirely (confirmed against
  `(app)/_layout.tsx`'s route tree — `(parent)` and the flashcard/quiz/result/certificate routes are
  siblings of `(tabs)`, not children of it, so no floating pill is ever present behind them).
- One unrelated-but-adjacent inconsistency found while doing this sweep: `(parent)/paywall.tsx` uses
  `pb-4` where every one of its 17 sibling `(parent)/*` screens uses `pb-10` (F10). Not a clearance bug
  (no tab bar exists in that route group at all), just a visual outlier worth a one-line fix.

---

## What I could not check (explicitly out of scope for this role)

- Whether the fixed mechanics/padding actually **render** correctly on a device — this is a source-level
  audit only. A `qa-device` pass should screenshot the 12 previously-clipped screens and the
  streak-bearing screens to close the loop at runtime.
- Whether `expo lint`'s clean exit reflects a fully-configured ESLint ruleset or a permissive one — I
  did not inspect `.eslintrc`/`eslint.config.*` contents in depth beyond confirming the command exits 0
  with no reported problems on the current tree; that is a separate, smaller finding for whoever owns
  tooling health if it turns out relevant.
