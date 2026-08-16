# qa-static — Accessibility, Design Honesty, Entitlement Honesty

Worker: static-honesty · Tier 0 · 2026-08-14 · No device, no network, no DB touched.
Scope: concern #6 (accessibility, static half), concern #7 (design honesty), entitlement honesty,
and the `data-usage.tsx` vs `package.json` cross-check. Route graph, CRUD matrix, AGENTS.md style
rules, rejected-mechanics grep and tab-bar clearance belong to other workers — where I passed
through evidence on those (I did, incidentally, while reading the same files) it is flagged as an
aside, not scored here.

**Methodology note (accessibility counts):** I parsed every `<Pressable` opening tag (from `<Pressable`
to its matching unnested `>`) across `src/app/**/*.tsx` and `src/components/**/*.tsx` and checked
whether `accessibilityLabel` appears literally inside that tag. This undercounts real coverage,
because React Native/iOS VoiceOver will announce a Pressable's nested `<Text>` content even with no
explicit `accessibilityLabel` — so some "gaps" below are cosmetic (inconsistent with the codebase's
own near-universal explicit-label convention) rather than functional (VoiceOver actually says
nothing). I separated these two categories below; only the second is a real user-facing defect.
**Not testable from here:** actual VoiceOver focus order/traversal, whether the nested-text fallback
reads sensibly in practice, and Dynamic Type layout at the largest accessibility text sizes — all
require a device with VoiceOver on, which is out of scope for a static audit.

---

## Findings table

| id | sev | area | file:line | status | claim | evidence | recommended fix |
|---|---|---|---|---|---|---|---|
| F1 | P2 | a11y | `src/app/(app)/add-child.tsx:167` (art via `src/components/child-avatar.tsx:88-90`) | VERIFIED | Preset-avatar picker (fox/elephant/lion) is icon-only with **no** accessible name at all | `Pressable` has `accessibilityState` but no `accessibilityLabel`; its only child is an `<Image accessibilityIgnoresInvertColors ... source={PRESET_ART[...]} />` with no `accessibilityLabel` and not marked decorative | Add `accessibilityLabel` to each preset Pressable (e.g. `"Fox picture"`) rather than relying on the image |
| F2 | P3 | a11y | `src/app/(app)/add-child.tsx:184` | VERIFIED | Emoji avatar picker options have no explicit `accessibilityLabel`; VoiceOver falls back to reading the raw emoji glyph | `Pressable` with `accessibilityState={{selected}}` and a bare `<Text>{glyph}</Text>` child, no label | Add a spoken name (`"Bear picture"`) rather than trusting VoiceOver's emoji pronunciation |
| F3 | P3 | a11y | `src/app/(app)/add-child.tsx:442` | VERIFIED | Year-group selector Pressables have no `accessibilityLabel`; nested Text is the raw abbreviation ("Y3", "Rec") | `Pressable` renders `<Text>{year}</Text>` only — VoiceOver announces "Y3" literally, not "Year 3" | Add `accessibilityLabel={yearLabel(year)}` (the app already has a `yearLabel()` helper used elsewhere) |
| F4 | P4 | a11y | `src/app/(app)/add-child.tsx:78,80,154,155` | VERIFIED | Modal backdrop / stop-propagation wrapper Pressables carry no `accessibilityLabel` or `accessibilityRole` | Two nested `Pressable`s per sheet: outer dismiss-on-tap-outside, inner swallow-tap. Neither is a discrete "control" a VoiceOver user would look for | Low priority — consider `accessibilityElementsHidden` on the backdrop layer instead of leaving it as an unlabeled interactive element |
| F5 | P4 | a11y | `src/app/(app)/add-child.tsx:92` and 13 other sites (`sign-in.tsx:144,163,205`; `intro.tsx:79,148`; `(parent)/delete-account.tsx:141`; `components/report-card-sheet.tsx:105`) | VERIFIED (cosmetic) | Pressables with a descriptive nested `<Text>` ("Continue with Apple", "Skip", "Export your data first"…) but no explicit `accessibilityLabel` prop | Confirmed via the tag-parse script — 19 raw hits, but these ones all have unambiguous nested text | Functionally likely fine (VoiceOver reads the nested text) but inconsistent with the rest of the codebase's explicit-label discipline; add labels for consistency, not urgency |
| F6 | P2 | a11y | `src/app/(app)/quiz/[id].tsx:113` (`Illustration` component) | VERIFIED | Quiz question illustration images ("§7 Image Questions") carry no `accessibilityLabel` and are **not** wrapped by an accessible parent (`View`, not `Pressable`) | `<Image accessibilityIgnoresInvertColors className="h-40 w-full" contentFit="contain" source={source} />` inside a plain `<View>` — VoiceOver exposes it directly as an unlabeled image | A blind child gets zero information about a question that is *specifically about the picture*. Needs a per-question alt-text field in `lib/study.ts`'s question shape, or at minimum a generic `"Question illustration"` label |
| F7 | P3 | a11y | 24 of 31 `<Image>` usages app-wide (list: `search.tsx:132`, `curriculum.tsx:158`, `bookmarks.tsx:39`, `result/[id].tsx:63`, `study/index.tsx:78,132,328`, `study/set-result/[id].tsx:131`, `study/congratulations/[id].tsx:157,227`, `study/session/[id].tsx:118`, `progress/index.tsx:257`, `subject/[subject].tsx:163`, `quiz/instructions/[id].tsx:101`, `download/[id].tsx:112`, `lesson/[id].tsx:53,106`, `(parent)/paywall.tsx:86`, `(parent)/parent-content.tsx:42`, `components/child-avatar.tsx:77,90`, `components/card-zoom.tsx:51`, `components/subject-mark.tsx:48`) | VERIFIED | Neither `accessibilityLabel` nor explicit decorative marking (`accessibilityElementsHidden`/`importantForAccessibility`) on most `<Image>` elements | Grep + tag-parse across the codebase. Some are covered by an accessible parent's label (e.g. `lesson/[id].tsx:53` sits inside a Pressable already labeled with the set title) — those are low risk. Others sit under a plain `View` with no sibling label (e.g. `lesson/[id].tsx:106` set-detail hero, `subject-mark.tsx:48` used standalone) | Either add `accessibilityLabel` to genuinely informative images, or explicitly mark pure-decoration images (`accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`) so VoiceOver skips them cleanly instead of announcing "Image" |
| F8 | P3 | a11y | 11 sites using `text-tile` (11px) — `certificate/[id].tsx`, `progress/calendar.tsx`, `quiz/instructions/[id].tsx`, `quiz/review/[id].tsx`, `flashcard/paused.tsx` | VERIFIED | Smallest font-size token in the design system is 11px (`tile`), below the system's own documented smallest step (`caption`, 13px per `tailwind.config.js:78,97`), used on stat-tile labels across 5 screens, several child-facing (flashcard, quiz) | `tailwind.config.js:93-97` comment: "below the design system's Caption (13/18), which is the smallest step it defines" | For a children's app with elevated dyslexia/visual-processing rates (own prior audit's language), reconsider whether an 11px label is ever acceptable; at minimum confirm it scales correctly under large Dynamic Type |
| F9 | P3 | a11y | Touch targets < 44pt with **no** `hitSlop`: `search.tsx:86,103` (subject filter chips, h-9=36px); `curriculum.tsx:108` (year-picker segments, h-9); `progress/calendar.tsx:298,334,343` (period switch + prev/next chevrons, h-9/w-9=36px); `(parent)/parent-analytics.tsx:315` (period switch, h-10=40px) | VERIFIED | 8 Pressables below Apple HIG's 44pt minimum with no `hitSlop` to compensate (10 more below 44pt do have `hitSlop` and are not flagged) | `tailwind.config.js:26-46` spacing scale (`h-9`=36px, `h-11`=44px); tag-parse confirmed no `hitSlop` prop on these tags | `progress/calendar.tsx:334,343` are icon-only prev/next-week navigation, tapped often on a child-facing screen — add `hitSlop` at minimum, ideally bump to `h-11` |
| F10 | — | a11y (positive) | `src/app/(app)/(parent)/accessibility.tsx`, `src/lib/preferences.ts` | FIXED (evidence) | Report.md/ceoaudit's "0/6 Accessibility screens… no dyslexia mode, no reduced motion" is no longer true | Real screen with working `reduceMotion` and `dyslexiaMode` toggles, both persisted to SecureStore and actually consumed (`useReduceMotion`/`useReadingClasses` are called from `flashcard/[id].tsx` and `home.tsx`, confirmed by grep, not just defined). Text-size/contrast are honestly deferred to iOS system settings with a "Open device settings" deep link, rather than shipping a half-working in-app copy | None — note as a genuine improvement |
| F11 | P3 | design honesty | `src/app/(app)/(tabs)/progress/subject/[subject].tsx:257-259` | STILL TRUE (narrow) | "Recent sets → View all" is wired to an empty handler | `onPress={() => { // Demo — the full "all sets" list screen is not built yet. }}` — a `Pressable` labeled "View all recent sets" that does nothing on tap | Either disable the control visibly (opacity/disabled state, matching the pattern used for `download/[id].tsx`'s disabled download-target rows) or remove it until the destination exists |
| F12 | P2 | design honesty | `src/app/(app)/(tabs)/study/session-summary/[id].tsx:53` (`BarList` component, used by both "Top strengths" and "Needs more practice" cards) | STILL TRUE | "View all" renders as a plain, unpressable `<Text>` styled identically to the app's tappable-link convention (`text-primary font-bold`), with no `onPress`, no `accessibilityRole` | `<Text className="font-text text-body font-bold text-primary">View all</Text>` — visually indistinguishable from the working "View all" links elsewhere on the same tab (`overview.tsx:394-401` is a real `Pressable`) | This is worse than a no-op: it doesn't even register a touch, so a user might tap repeatedly assuming a bug on their end. Make it a real link (there's no destination yet — see F11's pattern) or drop the link styling |
| F13 | — | design honesty | `src/app/(app)/(tabs)/progress/achievements.tsx` | FIXED (evidence) | ceoaudit's "`/progress/achievements` — every control is a `noop`" | Screen (now titled "Milestones" in-app) is fully rewired: "Browse the curriculum" → `/curriculum`, milestone rows are derived from real SRS/curriculum data, EmptyState CTA → `/study`. No dead controls found. Streak/points/level/leaderboard mechanics explicitly documented as removed in the file's own header comment | None |
| F14 | — | design honesty | `src/app/(app)/(tabs)/progress/subject/[subject].tsx` | FIXED (evidence) | ceoaudit's "`/progress/subject/[subject]` — always shows Maths regardless of slug" | `getSubject(subject ?? "")` now resolves the real slug; unknown slug renders an explicit "Subject not found" `EmptyState` rather than falling through to Maths; strand data comes from `useSubjectProgress(subj, child.id)`, the child's real record | None |
| F15 | — | design honesty | `src/app/(app)/(parent)/paywall.tsx` | FIXED (evidence) | Report.md's "Start free trial is `router.back()`" / paywall sells features that are free, absent, or both | CTA replaced with an honest "Not available yet" card ("GoKid can't take payments yet… nothing has been charged") and a "Keep using GoKid free" button that goes back, correctly labeled as such. Benefits list rewritten to 3 claims the app can actually deliver (full curriculum, spaced repetition, no ads); the old false claims (unlimited AI-generated sets, "more than one child", "full progress history") are gone. Price cards (`PriceCard`) only toggle local `useState`, no purchase flow implied | None |
| F16 | — | design honesty | `src/app/(app)/(parent)/settings.tsx:39-46` | FIXED (evidence) | Report.md's "Restore purchases is a fake Alert" | Still an `Alert`, but now explicitly documented as the honest placeholder pending a real billing SDK, and the copy is accurate ("We couldn't find a previous GoKid purchase" — true, since nothing can ever be purchased yet). This is a legitimate design-honesty pattern, not a regression |
| F17 | — | design honesty | `src/app/(app)/notifications.tsx` | FIXED (evidence) | ceoaudit's "Every row (rendered as `View`, not `Pressable`)" implying broken tappability | Rows are still non-interactive `View`s, but the screen no longer implies they should be tappable (no `accessibilityRole="button"`, no `active:opacity` styling) and explicitly discloses "GoKid doesn't send phone notifications yet, so this list only updates when you open it." The old hardcoded fake item ("New set ready — Capital Cities of Europe…") is gone; every note is derived from the child's real record | None |
| F18 | — | design honesty | `src/app/(app)/(tabs)/progress/index.tsx` | FIXED (evidence) | ceoaudit's "Refresh button — no `onPress`" (`progress/index.tsx:188`) | No bare refresh control exists at that description any more; the `arrow.clockwise` icon now lives inside a real `Pressable` card that routes to `/lesson/[id]` | None |
| F19 | — | design honesty | `src/app/(app)/(tabs)/progress/overview.tsx:394-401,257-265` | FIXED (evidence) | ceoaudit's "By subject → View all — inert Text" (`overview.tsx:255`) | Both "By subject" rows and "Recent achievements → View all" are real `Pressable`s with `accessibilityRole="button"` routing to `/progress/subject/[subject]` and `/progress/achievements` respectively | None |
| F20 | — | design honesty | `src/app/(app)/(tabs)/study/set-result/[id].tsx` | FIXED (evidence) | ceoaudit's "Set Result — 'Review all' — `Pressable`, no `onPress`" | No "Review all" control exists any more; comment at line 174 states "Question review lives on the screen that actually has the answers" — removed rather than left dead | None |
| F21 | — | design honesty | `src/app/(auth)/sign-in.tsx:184-201` | FIXED (evidence) — **contradicts a claim still standing in `docs/Report.md:79`** | Report.md (20 Jul) still lists as an open App-Review blocker: "Terms & Privacy on the sign-in screen are plain `<Text>`, not links (`sign-in.tsx:130-131`)" | Current code: both "Terms of Use" and "Privacy Policy" are `<Text accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(...)}>` — genuinely tappable, open the real URLs. The comment at line 182-183 documents the fix explicitly | `docs/Report.md` needs a stale-claim correction; this P0 App-Review blocker is resolved |
| F22 | — | design honesty (positive) | `src/app/(app)/(parent)/_layout.tsx` | FIXED (evidence) | ceoaudit's P0 "the parent gate is not a gate" — `settings`/`paywall`/`children`/`parent-content`/`parent-analytics` reachable with no challenge | `(app)/(parent)/_layout.tsx` now renders `<ParentGate />` for the whole route group when `!unlocked`, including on a cold deep link (path-transparent group, so `/settings` etc. keep their URLs but all mount through the guard). Not independently re-tested live (would require a device/deep-link, out of scope here) — this is a code-level confirmation, not a runtime one | Flag for `qa-device` to confirm live with an actual deep link |
| F23 | P3 | design honesty | `src/app/(app)/(parent)/settings.tsx:128` | VERIFIED | "Billing" row hardcodes `value="Apple"` under the "Subscription" section, next to "Plan: Free" | `<Row symbol="creditcard" label="Billing" value="Apple" />` — no `onPress`, static, always shows "Apple" regardless of platform or entitlement | Implies an active billing relationship that does not exist (nothing is ever billed at `status: "free"`). Either remove the row while entitlement is free, or make the value conditional (`"—"` / `"Not billed"` when free) — same category of bug the surrounding screen was rewritten to fix everywhere else |
| F24 | P3 | design honesty | `src/app/(app)/(parent)/help.tsx:23,92-102` | VERIFIED | "Rate GoKid" links to a placeholder App Store id | `const APP_STORE_ID = "0000000000"` with a comment acknowledging it's a placeholder "until the listing exists." The `itms-apps://` scheme itself will resolve as openable (so the row's own honest failure path, `Linking.canOpenURL`, likely won't trigger), meaning a tap pre-launch probably opens the App Store to a broken/unrelated page rather than the app's own "Couldn't open that" message | Disable or hide the row until `APP_STORE_ID` is real, or gate it behind a build-time flag |
| F25 | — | entitlement | `src/lib/subscription.ts` | FIXED (evidence) | Report.md's "no `isPro`, no entitlement check… advertising features that do not exist" | `useEntitlement()` hardcodes `{status:"free"}` with an extensive, honest doc comment explaining exactly why and how to wire real billing later. `entitlementLabel()` never invents a plan name (`"Free"` / `"Free trial"` / real `plan` string / `"Expired"` / `"Payment issue"`). Grep for the literal string `"GoKid Plus"` across `src/` returns **zero** live code hits — the only 3 matches are comments documenting the historical bug and its fix | None |
| F26 | — | entitlement | `src/app/(app)/(parent)/subscription.tsx` | FIXED (evidence) | No screen claims a paid plan anywhere | `subscription.tsx`, `settings.tsx`, `parent-content.tsx` all read `entitlementLabel(useEntitlement())` rather than a literal. `subscription.tsx` additionally states outright, when free: "You are not paying for GoKid, and nothing is being charged... Paid plans aren't available yet." | None |
| F27 | — | entitlement | `src/lib/subscription.ts:53-55` | INFERRED (informational, not a defect) | "Whether any premium gate is enforced client-side only in a way a user could flip" | `useHasPlus()` exists but grep finds **zero call sites** anywhere in `src/app` or `src/components` — nothing in the shipped app currently checks it. There is no premium content being withheld today, so there is also nothing to "flip." This is not a vulnerability yet, but it is exactly the shape a future client-side-only gate would take, and `db/schema.ts`'s `subscriptions` table (server-side, RevenueCat-webhook-driven) is the correct place to check entitlement once a gate exists — confirm that when the first `useHasPlus()` call site lands, it is not the sole authority for anything the API also serves | Note for the next engineer wiring billing: gate server-side (API checks `subscriptions` table), never trust `useHasPlus()` alone for anything that crosses the wire |
| F28 | — | data-usage vs package.json | `src/app/data-usage.tsx:24,49-55` vs `package.json:5-45` | VERIFIED — STILL TRUE | "There is no ad SDK, no analytics SDK, and no third-party tracker in package.json" | Full dependency list read: Clerk (auth), Neon (DB), Sentry (crash reporting), Drizzle (ORM), Expo/RN core + a dozen `expo-*` native modules, NativeWind. No ad network, no analytics SDK (Segment/Amplitude/Firebase Analytics/AppsFlyer/Mixpanel/etc. all absent), no tracking library | None — the claim holds as of this audit |
| F29 | P4 | data-usage vs package.json | `src/app/_layout.tsx:20-31`, grep of `Sentry\.` across `src/` (39 call sites) | INFERRED | Tension, not a violation: `tracesSampleRate` performance tracing (via `reactNavigationIntegration`) sends screen-navigation/timing telemetry to Sentry, which is a form of usage telemetry a strict reading of "No third-party analytics or tracking" could contest | Every one of the 39 `Sentry.*` call sites found is `Sentry.captureException(...)` (error-scoped); no `addBreadcrumb`/custom-event/analytics-style calls exist. `sendDefaultPii: false` is set and commented with the Children's Code rationale. The document's "Where it lives" section separately discloses Sentry by name, so the claim isn't hidden — but "no third-party analytics or tracking" and "Crash reports go to Sentry" sit in slight tension when Sentry is also configured for performance/navigation tracing | Recommend: either set `tracesSampleRate: 0` in production, or add one clause to `data-usage.tsx` distinguishing "crash reporting" from "analytics/tracking" so the claim is airtight rather than technically-defensible. **Not testable further from static reading** — confirming what actually reaches Sentry's dashboard needs account/network access outside this audit's resource contract |
| F30 | aside | (out of scope — for concern #3 owner) | `src/app/(app)/(tabs)/study/session-summary/[id].tsx:253,262` + 8 more sites | VERIFIED | 10 instances of inline `style={{}}` remain, against `AGENTS.md`'s "No inline `style={{}}`" rule | `style={{ marginRight: 8 }}` on `SymbolView`, found incidentally while reading this file for F12/F19 | Belongs to the AGENTS.md-compliance worker; noted here only because I already had the evidence in hand |
| F31 | aside | (out of scope — for concern #4 owner) | `achievements.tsx`, `calendar.tsx`, `session-summary/[id].tsx`, `set-result/[id].tsx`, `answer-result/[id].tsx`, `congratulations/[id].tsx` | STILL TRUE→FIXED per own grep | ceoaudit's rejected-mechanics list (streak flame, 7-Day Streak badge, points/level, leaderboard) | Every one of the 6 screens ceoaudit cited now contains only *comments* documenting the removal and citing §9 by name; no live streak/points/level/leaderboard UI found in any of them. Corroborates (does not replace) the dedicated rejected-mechanics worker's grep | None from me — full sweep is that worker's job |

---

## 1. Accessibility coverage (concern #6)

**Headline count.** 196 `<Pressable>` elements across `src/app` + `src/components`; 177 carry an
explicit `accessibilityLabel` in the opening tag (90.3%). `ceoaudit.md` (17 Jul) measured 161/167
(96.4%). Read together with the finding below, the ratio has drifted down in percentage terms even
as the app grew — driven almost entirely by one screen (`add-child.tsx`, 11 of the 19 raw gaps) plus
a handful of `router.back()`/nested-text buttons that were always this way and were simply not
individually enumerated by the earlier audit. I do not read this as regression on any single control;
I read it as `add-child.tsx`'s avatar/date pickers having shipped without labels from the start.

**Real gaps vs cosmetic gaps.** Of the 19 raw hits, I judge 6 to be functionally real defects for a
VoiceOver user (F1, F2, F3, F6, and the touch-target/text-size findings F8-F9 which are a different
axis entirely) and 13 to be cosmetic (F5's nested-Text-only buttons, F4's non-control backdrop
wrappers) — VoiceOver on iOS reads a Pressable's plain-text descendants even with no explicit label,
so `"Skip"`, `"Continue with Apple"`, `"Done"` etc. all still announce correctly in practice. The
codebase's own convention is to set explicit labels almost everywhere else, so these are worth fixing
for consistency, but they are not the same severity as F1/F2/F3/F6, where the accessible name is
either literally empty (F1, image-only) or actively misleading in its terse form (F3, "Y3" read
letter-by-letter rather than "Year 3").

**Child-facing vs parent-facing.** The most severe gap, F6 (quiz illustration images with no alt
text), sits squarely in a child-facing core learning flow — §7 "Image Questions" is a whole listed
feature category, and it is currently silent to VoiceOver. F1-F3 (add-child avatar/year pickers) are
technically opened by a parent during onboarding, but `ceoaudit.md` already flagged that add-child's
camera/photo pickers are reachable from `/home`, i.e. from a screen a child can be on — so the same
screen's accessibility gaps carry the same child-reachability caveat.

**Touch targets and text size.** F8 (11px `text-tile`) and F9 (8 controls below 44pt with no
`hitSlop`) are both real, both low-effort to fix, and both concentrated on child-facing or
frequently-tapped surfaces (flashcard pause screen, quiz instructions/review, the progress calendar's
week-navigation chevrons).

**Genuine improvement.** F10 — the Accessibility settings screen (`/accessibility`) did not exist at
the time of either prior audit and is now real: `reduceMotion` and `dyslexiaMode` are wired end to
end (SecureStore-persisted, consumed by `flashcard/[id].tsx` and `home.tsx`, not just declared), and
text-size/contrast are honestly deferred to the OS rather than faked. This directly answers
`docs/Report.md`'s "§19 Accessibility... 1/6... No dyslexia mode... no reduced motion" entry, which is
now stale.

**Not testable from here:** VoiceOver focus order across any screen, whether the nested-text fallback
in F5 actually reads in a sensible order relative to sibling elements, Dynamic Type layout at
accessibility text sizes (XXL etc.), and colour-contrast ratios in practice (I read token hex values,
not rendered contrast). All of these require a device with VoiceOver/Dynamic Type enabled.

---

## 2. Design honesty (concern #7)

`ceoaudit.md`'s two headline claims for this concern were re-verified directly against current code:

- **`/progress/achievements` "every control is a `noop`"** → **FIXED**. The screen (now internally
  titled "Milestones") is fully wired to real data (F13). I found **zero** dead controls on it.
- **`/progress/subject/[subject]` "always shows Maths regardless of slug"** → **FIXED**. `getSubject`
  now resolves the real route param, with an honest empty state for unknown slugs (F14).

Both were genuine, serious bugs as described in the 17 July audit, and both are demonstrably resolved
in the code as it stands today — not just relabeled or half-fixed. The fix pattern is consistent
throughout the codebase: comments at the top of nearly every touched file document *what was wrong*
and *why the new version is honest*, which made this verification fast and high-confidence.

However, the same sweep of "every control that implies an action" surfaced **two new-to-this-audit
no-ops** that neither prior report caught, both on the Progress tab:

- F11: `progress/subject/[subject].tsx`'s "Recent sets → View all" — an empty `onPress` with a comment
  acknowledging the destination isn't built.
- F12: `session-summary/[id].tsx`'s "View all" (used by both "Top strengths" and "Needs more practice")
  — not even wired to an empty handler; it's a plain `<Text>` styled exactly like the app's working
  links elsewhere, with **no** `onPress` at all. This is a slightly different failure mode than a
  no-op: a no-op at least registers the tap and (if instrumented) could later be told apart from
  "nothing happened because the user missed the button." An unpressable styled-as-a-link `Text` gives
  no such signal.

I also re-verified two `docs/Report.md`-only claims (dated 20 Jul, 3 days after ceoaudit):

- **The plain-`<Text>` Terms/Privacy links on sign-in** (`Report.md:79`, cited as an App-Review
  blocker) → **FIXED**, contradicting the still-current text of `Report.md` (F21). Worth a correction
  pass on that document.
- **The parent gate as a route-group guard** → confirmed present in code (F22), consistent with
  `CLAUDE.md`'s own description of the architecture. I did not re-run the live deep-link test
  ceoaudit performed (`gokid://settings` etc.) — that requires the simulator, which is
  `qa-device`'s resource, not mine. Recommend `qa-device` re-confirm this live since it was the
  single highest-severity finding in the whole prior audit.

Two small, previously-unflagged honesty nits: F23 (a hardcoded "Billing: Apple" row that implies a
billing relationship which cannot exist while entitlement is `free`) and F24 (a "Rate GoKid" link
pointed at a placeholder App Store id that will not fail gracefully). Both are low severity and
plausibly acceptable as known pre-launch state, but both are in the same category the rest of the
subscription/settings screen was deliberately rewritten to eliminate, so I'm flagging them for
consistency.

---

## 3. Entitlement honesty

This is the strongest "fixed" story in the audit. `docs/Report.md`'s §3.5 finding ("the paywall sells
things that are free, absent, or both... 'Start free trial' is `router.back()`... no `isPro`, no
entitlement check... a false statement about a commercial relationship") is **comprehensively
resolved**:

- `useEntitlement()` hardcodes `{status: "free"}` (F25), with a doc comment that is unusually explicit
  about *why* — including the exact bug it replaced (`value="GoKid Plus"` as a literal, told to every
  parent regardless of whether they'd ever seen a payment screen).
- No screen anywhere reads a hardcoded plan name; every "Plan"/"Subscription" row goes through
  `entitlementLabel()` (F26).
- The paywall (F15) no longer advertises anything the app can't deliver, and its price cards are
  explicitly labeled "Planned pricing" rather than live offers.
- "Restore purchases" (F16) is an honest negative result, not a fake success.

The one open question the brief asked me to check — **whether any premium gate is enforced
client-side only in a way a user could flip** — has an unusual answer: there is currently **no gate at
all** (F27). `useHasPlus()` is defined but never called. This means the specific risk described
(a client-side check a user could bypass) doesn't exist yet, because nothing is paywalled yet. I've
left a note in the findings table for whoever wires the first real gate: check server-side
(`subscriptions` table via the API), not only via `useHasPlus()`, especially for anything that already
crosses the wire (e.g. sync limits, if those are ever introduced as a paid differentiator).

---

## 4. `data-usage.tsx` vs `package.json`

The claim — "no ad SDK, no analytics SDK, and no third-party tracker in package.json" — **holds true**
against the current dependency list (F28). I read all 24 runtime dependencies; the only cross-cutting
service present is Sentry, which the same document discloses separately and by name under "Where it
lives," rather than folding it into the "we don't do this" bullet list.

One nuance worth flagging rather than scoring as a violation (F29): Sentry is configured with
`tracesSampleRate` and a `reactNavigationIntegration`, which is *performance/navigation* tracing, not
crash reporting. Every actual `Sentry.*` call site I found (39, via grep) is `captureException` —
error-scoped, consistent with the document's framing — but the trace-sampling configuration itself
does emit screen-navigation-timing telemetry to a third party, which sits in mild tension with "no
third-party analytics or tracking" under a strict reading. `sendDefaultPii: false` limits what's
attached to any of it. I could not verify what actually lands in the Sentry project dashboard (that
needs account access, outside this audit's resource contract) — this is the one item in this report
I'd escalate to a human decision (turn off `tracesSampleRate` in production, or add one clarifying
clause to the copy) rather than call either "true" or "false" outright.
