# GoKid device QA — Tier 2 + Tier 3 — 2026-08-15

Simulator: iPhone 17 Pro, iOS 26.5, UDID `1311E9E2-A1CE-4306-BB05-9F767853EA65`, already booted.
`com.gokid.app` pre-installed (Debug/dev-client build). Dev server on :5062 (operator's process,
untouched — never restarted or killed). Maestro 2.8.0 present → full Tier 3. Run was **non-destructive**:
no uninstall, no erase, no DB/Clerk reset, no sign-out, neither existing child (Jacob K, Isaac K, both
Year 4) deleted. Everything I changed is itemised in **"State I changed"** at the end.

Screenshots: `docs/qa/2026-08-15/shots/*.png` (all read back with the Read tool — this report only
cites ones I actually looked at). Maestro flows: `.maestro/*.yaml` (12 files, committed as a permanent
regression asset). Every finding below is tagged **VERIFIED** (screenshot read back), **TAPPED**
(Tier 3, real touch via Maestro, confirmed via before/after screenshots), or **RENDER-ONLY** (reached
by `xcrun simctl openurl` deep link, not by tapping through the UI).

---

## 0. The stray gear icon — Report.md §3 Defect 2, now explained

**Root cause found: it is the Expo dev-client's own dev-menu launcher button**, not an app defect.

`package.json` has `expo-dev-client ~57.0.7`, and `ios/Podfile.lock` confirms `expo-dev-launcher` /
`expo-dev-menu` are linked. Both `xcrun simctl io booted screenshot` captures (`00-current-state.png`,
`00b-recheck.png`, `01b-study-home-clean.png`, `02a-lesson-detail.png`) taken **before I ever touched
Maestro** show the same translucent grey gear fixed at the top-right of every screen. Tapping it
(`02b-download-screen.png` — my Maestro `tapOn: "Download this set"` landed on it instead, see §1 below)
opens the native "gokid / Development Build" menu: Reload, Go home, Tools (Source code explorer, Toggle
performance monitor, Toggle element inspector, Open DevTools, Fast refresh) — unmistakably
`expo-dev-menu`'s own overlay, rendered in a separate native layer above the RN view hierarchy. That is
exactly why code search in `docs/Report.md` found no source for it (it isn't JS) and why it disappears
when the app fully terminates (it's the dev-client shell's window, torn down with the process).

**This will not exist in a release/App Store build** — `expo-dev-client` is a dev-only dependency and is
not present in a production binary. It is real, but it is a **dev-build artifact, not a product defect**.
It does, however, have one product-relevant side effect while it exists:

### Finding A — dev-menu overlay swallows taps meant for corner controls (dev-build only)
**TAPPED**, `docs/qa/2026-08-15/shots/02a-lesson-detail.png` → `02b-download-screen.png`.
The gear sits exactly on top of the Set Detail screen's "Download this set" button (`-mr-2 h-11 w-11`
top-right, per `src/app/(app)/lesson/[id].tsx:93-101`). Maestro's `tapOn: "Download this set"` found the
right accessibility label and tapped its coordinates — but the *topmost* thing at that point on screen
was the native dev-menu window, not the RN button, so the tap opened the dev menu instead of navigating
to `/download/[id]`. I had to route around it (deep link straight to `/download/[id]`, see §5). This
means any manual dev-build tester near that corner (download icon, notifications bell corner on Study
home, pause button on the flashcard runner, "X" close on the quiz) can silently hit the dev menu instead
of the app. Not fixable in app code; worth knowing before treating a "the download button doesn't work"
report from a dev-build tester at face value.

---

## 1. Tier 3 — Maestro flows (`.maestro/*.yaml`)

All flows run against the already-signed-in session; none clear state. Full `maestro test` output is
reproduced inline (trimmed of tooling warnings) below each. All passed except where noted.

### `01-whos-studying-pick-child.yaml` — PASS
Who's-studying → tap "Jacob K, Year 4" → lands on Study home. `01b-study-home-clean.png` VERIFIED:
greeting "Morning, Jacob K", "Year 4 • Summer term", full dashboard.

### `02-set-detail-flashcards.yaml` — PASS (after routing around Finding A)
Lesson detail → "Study cards" → flip all 6 cards → rate Got it/Tricky/Got it/Got it/Tricky/Got it →
auto-advances to quiz instructions on the 6th rating. `02c`–`02j` VERIFIED: 3D flip renders correctly
both faces, segmented progress bar fills correctly, rating buttons work, deck-complete correctly
`router.replace`s into `/quiz/instructions/[id]` with the right set/question count.

### `03-quiz-practice-to-result.yaml` — PASS mechanically, but see **Finding 1** (critical, below)
Quiz instructions → Start quiz → answered all 5 questions **by their correct option text**, not by
position → Check answer → Next ×5 → See results. All steps completed without a Maestro failure, but the
quiz's own behaviour is broken — see Finding 1.

### `04-study-session-summary.yaml` + `05-session-summary-set-result-congrats.yaml` — PASS mechanically, exposes **Finding 2** (critical, below)
Lesson → "Study session" → 6 MCQ cards, each answered with the objectively correct option, "Next card" →
answer-result → session-summary → set-result. Mechanically flawless UI chain. Data integrity broken —
see Finding 2.

### `06-verify-session-not-persisted.yaml` — PASS (this *is* the check — see Finding 2)

### `07-progress-reflects.yaml` — PASS. Positive control: `07a-progress-tab-jacob.png` VERIFIED,
flashcard-flow progress ("6 cards learned" milestone counter is honest — box≥2 not yet reached so it
correctly reads 0 "learned" while 6 "seen").

### `08-relaunch-persistence.yaml` — PASS. Ran after a genuine `simctl terminate` + `simctl launch`
(process fully killed, not just Maestro's `launchApp`). `08a-progress-after-relaunch.png` VERIFIED
identical to pre-relaunch state — SecureStore/local persistence survives a cold process restart.

### `09-switch-child-isolation.yaml` — PASS. `09b-isaac-progress.png` VERIFIED: Isaac's Progress tab
reads "No progress yet" — Jacob's flashcard/session activity does **not** leak to Isaac. `reviews.ts`'s
per-child key is honoured on this read path.

### `10-parent-content-check.yaml` / `11-parent-content-and-viewall.yaml` — PASS, and **re-checks a
previously-reported bug that is now fixed** (Finding 5, positive).

### `12-download-verify.yaml` — PASS (Maestro's `openLink:` step was unreliable for the custom scheme —
see note in §5 — worked immediately via `xcrun simctl openurl`, RENDER-ONLY for that hop, then TAPPED
from there).

Ad hoc Maestro scripts used for targeted checks (§4, §5) are in the scratchpad, not committed, since
they were one-off repros rather than reusable flows; the 12 committed `.maestro/*.yaml` files above are
the reusable asset.

---

## 2. Finding 1 (CRITICAL) — Quiz answer options reshuffle mid-question; child's tap can be scored against a different option than the one they picked

**TAPPED, root-caused with code.** Screenshots: `03b-quiz-q1.png`, `03c-quiz-q1-checked.png`,
`03h-quiz-q5-checked.png`, `03i-quiz-results.png`.

Reproduction: `03-quiz-practice-to-result.yaml` — every one of 5 questions was answered by tapping the
option whose **text** was the objectively correct answer (from `src/lib/study.ts`'s `y4-fa-q1..q5`,
all `answer: 0`), not by screen position. Final score: **1/5**, despite answering every question
correctly.

Direct visual proof on Q1: `03b-quiz-q1.png` (before selecting) shows the options in one order
(A=played, B=outside, C="After lunch,", D=we). I tapped "After lunch,". `03c-quiz-q1-checked.png`,
taken moments later after only a "Check answer" tap (no navigation), shows the options in a **different
order** (A=played, B=we, C=outside, D="After lunch,") — the options visibly moved between the same
question's own render. `03h-quiz-q5-checked.png` is unambiguous: I tapped "Yesterday" — the screen marks
"Yesterday" green (correct) but marks **"Happily" red as "your answer"**, i.e. the app recorded a
different option as my selection than the one I tapped.

**Root cause, read from source, not guessed:**
- `src/app/api/quiz+api.ts` (`GET /api/quiz`, the new no-repeat endpoint migration 0004 just turned on)
  deliberately **re-shuffles a question's options and remaps `answer` fresh on every single call** — by
  design, so a memorised position isn't the tell.
- `src/app/(app)/quiz/[id].tsx`'s serving `useEffect` (~line 374) lists `getToken` (from
  `@clerk/expo`'s `useAuth()`) in its dependency array, and — verified by reading the shipped code at
  `node_modules/@clerk/expo/dist/hooks/useAuth.js` — `getToken` is a **new closure every call**, not
  wrapped in `useCallback`. Because the effect isn't otherwise gated, it re-fires on essentially every
  re-render of the quiz screen (i.e. on every tap: select, Check answer, Next), and each re-fire calls
  `clearServedQuiz` + `fetchServedQuiz` again, pulling a **freshly re-shuffled** set of options for the
  question currently on screen.
- The options are rendered `q.options.map((opt, i) => ... key={i} ...)` — a **positional** key, so React
  reuses the same row instances across a reshuffle rather than remounting, and the row's *text* changes
  under whatever index the child already tapped.
- The child's answer is stored as a raw numeric index (`response.choice`). If a reshuffle lands between
  the tap and "Check answer" (very likely, given the effect can refire on every render), the stored
  index no longer points at the option the child actually chose, and grading is against the wrong text.

**Impact:** this makes the entire "Take the quiz" flow's scoring unreliable — a child who answers
correctly can be marked wrong (and vice versa) essentially at random, on any set, in both practice and
test mode (the reshuffle is upstream of the mode branch). Because `/api/quiz` only started working this
session (migration 0004), this is very plausibly a **new, previously-unobservable regression** — before
the migration the endpoint 500'd and the quiz silently fell back to the local, unshuffled `study.ts`
data, which never exhibited this.

**Fix direction** (not implemented — QA only): stabilise the effect's dependency (drop `getToken` from
the deps or memoise it locally with `useRef`/`useCallback` wrapping a stable read), and/or key options by
a stable id rather than index so a genuine reshuffle can't silently reassign a prior selection.

---

## 3. Finding 2 (CRITICAL) — "Study Session" mode never writes to the spaced-repetition record

**TAPPED, then independently corroborated four separate ways.**

Reproduction (`04-study-session-summary.yaml` + `05-…yaml` + `06-…yaml`): Jacob completed all 6 MCQ
cards of "Multiplication and Division" via **Study session** (`src/app/(app)/(tabs)/study/session/[id].tsx`
→ `answer-result` → `session-summary`), answering every question correctly.

- `05a-session-summary.png` VERIFIED: "Session overview" shows **Time spent —, Cards studied 0, Recall
  —**, immediately after finishing 6/6 cards.
- `06a-lesson-after-session-mode.png` VERIFIED: back on the set's own lesson-detail page, "Mastery: Not
  started yet" — as if nothing happened.
- `15-subject-maths.png` VERIFIED: the Maths subject hub reads "0 of 7 sets", "Overall 0%".
- `14a-progress-subject-before.png` VERIFIED: same — "0% Overall / 0 Sets Completed" for Maths.

**Root cause, read from source:** `recordSession` (`src/lib/reviews.ts`) — the function that writes a
finished session into the child's record — is called from exactly two places in the whole app:
`src/app/(app)/flashcard/[id].tsx:135` and `flashcard/paused.tsx:85`. It is **never called** anywhere in
`study/session/[id].tsx`, `answer-result/[id].tsx`, or `session-summary/[id].tsx`. Likewise `rateCard` is
never destructured/called in that chain — `answer-result/[id].tsx` only calls the *pure, non-persisting*
`nextDueLabel()` to compute a display string ("Back in 5 days"), never anything that writes.

**Impact:** this is a fully-built, 5-screen, polished flow (session → answer-result ×N → session-summary
→ set-result → congratulations) whose own celebratory "Session Summary" cannot report on the session it
is summarising, and none of it feeds Progress, Curriculum, or the parent dashboard. A parent checking
`/parent-content` after their child spends real time in this mode sees nothing changed. The
`RecallRing`'s "Back in 5 days" promise on `answer-result` is materially false — the card's box never
actually moves. §3 of `lesson/[id].tsx`'s own comment says this flow "sits between the two existing
modes" and was built specifically to close a previously-unreachable door — it is reachable now, but
disconnected from the data model that makes the rest of the app honest.

---

## 4. Finding 3 — Two Year-4 demo sets have a 100%-position answer bias; the pool overall skews to option B

**Static analysis (`src/lib/study.ts`) + one live confirmation.** Every `answer:` index across all 25
sets with an authored `quiz` array:

```
y4-fronted-adverbials ['0','0','0','0','0']   ← always "A"
y4-states-of-matter   ['0','0','0','0','0']   ← always "A"
```

All other 23 sets vary, but the pool as a whole is skewed: of 131 authored questions, **index 1 ("B") is
correct 69 times (53%)**, index 0 ("A") 33 times (25%, roughly proportional), index 2 ("C") 28 times
(21%), and **index 3 ("D") only once (0.8%)** — a child who always answers "B", or never answers "D",
scores far above chance without reading a question. Confirmed live for `y4-fronted-adverbials`: Q1's
correct answer was genuinely "After lunch," at option A (`03b-quiz-q1.png`), and the downloaded JSON for
this set (§6) independently shows the same five `"answer": 0` values, so this isn't a runtime artifact —
it's authored into the content.

This compounds Finding 1: because `/api/quiz` reshuffles per request, a *live* quiz for these sets isn't
predictable position-to-position — but the **downloaded/offline** copy (`downloads/y4-fronted-adverbials.json`,
§6) is exactly this fixed, always-A order, so a child doing this set **offline** (no server reshuffle
available) gets a genuinely guessable quiz.

---

## 5. Finding 4 — "View all" dead links, tap-confirmed in two places, one of them not even a button

Both were reported findings this audit was asked to re-verify by tapping, not just reading code.

- **`session-summary/[id].tsx:53`** — **TAPPED**. `ss-viewall-before.png` / `ss-viewall-after.png`
  VERIFIED identical. Confirmed in code: it is a bare `<Text>`, not wrapped in `Pressable`, no
  `onPress`, no `accessibilityRole` — VoiceOver would not even announce it as interactive. Worse than an
  inert button: it's not a control at all, just styled like a link (`text-primary font-bold`).
- **`progress/subject/[subject].tsx:253-262`** — **TAPPED**. `viewall-scrolled.png` (before) /
  `viewall-after-real-tap2.png` (after) VERIFIED identical. This one *is* a real `Pressable` with
  `accessibilityRole="button"` and `accessibilityLabel="View all recent sets"` (so VoiceOver announces it
  as a working button) — but its `onPress` body is empty (`// Demo — the full "all sets" list screen is
  not built yet.`, per the file's own comment at line 28). A more honest failure mode than
  session-summary's (at least VoiceOver users get an accurate "button" announcement), but still a control
  that visibly does nothing when activated.
- A third instance is visible but not tapped: `progress/overview.tsx` also shows a `View all` partially
  under the tab bar in `15-progress-overview.png` (RENDER-ONLY observation) — did not test this one
  interactively for time; flagging it as the same pattern worth auditing.
- By contrast, `congratulations/[id].tsx`'s "Review all" (mastered topics) **is** correctly wired — real
  `Pressable`, navigates to `/progress/mastery-timeline`. Not every "View/Review all" in the app is
  broken, just these specific ones.

---

## 6. Finding 5 — `nextSetId()` wraps across year groups with no warning

**TAPPED.** `13a-congrats-last-set-wrap.png` → `wrap-nextset-visible.png` → `wrap-nextset-landed.png`.

`nextSetId()` (`src/lib/study.ts:1214`) is `STUDY_SETS[(idx + 1) % STUDY_SETS.length].id` — a flat modulo
over the whole demo catalogue's authored order, with no year-group filter. I deep-linked to the
congratulations screen for `y3-festivals` (the last entry in `STUDY_SETS`) as Jacob (Year 4) and tapped
"Start next set": it landed on **"Place Value to 1,000", labelled "Year 3 · Maths"** — a set below
Jacob's own year group, with nothing on screen indicating the mismatch. Not a crash, but a Year-4 child
following the app's own "what to try next" primary CTA can be handed Year-3 content silently. Only
reachable by actually finishing the catalogue's last set (or, as here, by deep link), so low-frequency,
but worth a one-line year-group filter in `nextSetId()`.

---

## 7. Finding 6 (positive — re-check of a previously-reported bug, now fixed) — `/parent-content` shows the real children

`ceoaudit.md` reported `/parent-content` showing demo children instead of the real ones. Re-checked this
run: **`11g-parent-content.png` VERIFIED** — "Parent area" correctly lists **Jacob K · Year 4** and
**Isaac K · Year 4** (the two real children on this account), with accurate real numbers ("This week 1m
/ This month 1m / Sets completed 1" — matches Jacob's one real flashcard session exactly) and "Curriculum
to focus on: English · Fronted adverbials and punctuation · Needs practice" — genuinely derived from his
low mastery on that topic. This bug is fixed; do not re-report it.

---

## 8. Finding 7 — Quiz illustrations carry no accessibility label (confirmed via code, not device VoiceOver)

No accessibility inspector was reachable from this CLI-only environment, so I could not capture the
actual VoiceOver announcement live. Confirmed instead by reading `src/app/(app)/quiz/[id].tsx`'s
`Illustration` component (line 109-116): it renders `<Image accessibilityIgnoresInvertColors ... />`
with **no `accessibilityLabel`, no `alt`, and no `accessible` prop at all**. Without an explicit label,
`expo-image`/RN's default is to leave the image outside the accessible element tree (or, if it is
focusable, to announce only "Image" with no description) — either way a VoiceOver user gets zero
information about what the illustration depicts (e.g. the place-value block diagram, the quiz's own
picture-based questions). This matches the reported "silent to VoiceOver" finding at the code level; I'm
reporting the confirmed cause (missing label) rather than the device-observed symptom, since I could not
run the Accessibility Inspector.

---

## 9. Finding 8 (minor) — text truncation on the download screen

**TAPPED**, `dl-after-tap.png` VERIFIED. On `/download/[id]`, the "Download to" radio card reads
**"This de..."** (should be "This device") and the "What's included" tile reads **"Practice questi..."**
— both genuinely truncated mid-word inside their fixed-width containers at the iPhone 17 Pro's width.
Low severity (information is still available on the paired "iCloud" option / the numeral above it), but
worth a `numberOfLines` + slightly wider container or shorter copy pass.

---

## 10. Render sweep (Tier 2 + a few Tier 3 taps mixed in)

Every screenshot below was read back and described; all are labelled by how they were reached.

| Route | Evidence | Result |
|---|---|---|
| `/home` (who's-studying) | `00-current-state.png`, `99-final-state-both-children.png` VERIFIED | Clean; both real children shown, correct wash colours, no clipping |
| `/study` (tab root) | `01b-study-home-clean.png` VERIFIED (tapped) | Clean, greeting/continue-card/subjects/shelves all render |
| `/lesson/[id]` | `02a-lesson-detail.png`, `wrap-nextset-landed.png` VERIFIED (tapped) | Clean. Gear overlaps download icon (Finding A, dev-build only) |
| `/flashcard/[id]` | `02c`–`02j`*.png VERIFIED (tapped) | 3D flip, hint, favourite, report, pause all render; no clipping |
| `/quiz/instructions/[id]` | `02j-after-deck-complete.png`, `03a-quiz-instructions.png` VERIFIED (tapped) | Clean |
| `/quiz/[id]` | `03b`–`03i`*.png VERIFIED (tapped) | Renders correctly; **functionally broken**, see Finding 1 |
| `/result/[id]` | `03i-quiz-results.png` VERIFIED (tapped) | Clean layout; score shown is wrong per Finding 1, not a render defect |
| `/study/session/[id]` | `04b`,`04d`-`04h`*.png VERIFIED (tapped) | Clean, no tab-bar clipping (`pb-35` confirmed working — footer stats card fully visible above the floating bar) |
| `/study/answer-result/[id]` | `04c-answer-result-1.png` VERIFIED (tapped) | Clean, recall ring renders, no clipping |
| `/study/session-summary/[id]` | `05a-session-summary.png`, `ss-viewall-before.png` VERIFIED (tapped) | Clean render; data is wrong per Finding 2 |
| `/study/set-result/[id]` | `05b-set-result.png` VERIFIED (tapped) | Clean |
| `/study/congratulations/[id]` | `13a-congrats-last-set-wrap.png`, `wrap-nextset-visible.png` VERIFIED (RENDER-ONLY then tapped) | Clean; full "Back to Home" bar visible above tab bar, `pb-35` confirmed |
| `/download/[id]` | `12c-direct-openurl-download.png`, `dl-after-tap.png` VERIFIED (RENDER-ONLY then tapped) | Clean except Finding 8 truncation |
| `/bookmarks` | `15-bookmarks.png` VERIFIED (RENDER-ONLY) | Clean empty state |
| `/notifications` | `15-notifications.png` VERIFIED (RENDER-ONLY) | Clean, honest real data, correct disclaimer copy |
| `/curriculum` | `15-curriculum.png` VERIFIED (RENDER-ONLY) | Clean. Per-subject % here is demo-constant-backed as documented (Science shows 50% though Jacob never touched it — expected per the screen's own design, not a new bug) |
| `/search` | `15-search.png` VERIFIED (RENDER-ONLY) | Clean |
| `/progress` tab, `/progress/overview` | `15-progress-overview.png` VERIFIED (RENDER-ONLY) | Clean chart, real data; unverified second "View all" noted in Finding 4 |
| `/progress/journey` | `15-progress-journey.png` VERIFIED (RENDER-ONLY) | Clean, real data |
| `/progress/mastery-timeline` | `15-progress-mastery-timeline.png` VERIFIED (RENDER-ONLY) | Clean, honest empty state ("Nothing mastered yet") |
| `/progress/statistics` | `15-progress-statistics.png` VERIFIED (RENDER-ONLY) | Clean, real data throughout |
| `/progress/achievements` | `15-progress-achievements.png` VERIFIED (RENDER-ONLY) | Clean, real "Coming back" list matches the 6 rated cards |
| `/progress/history` | `15-progress-history.png` VERIFIED (RENDER-ONLY) | Clean, all 6 individual card ratings listed correctly |
| `/progress/calendar` | `15-progress-calendar.png` VERIFIED (RENDER-ONLY) | Clean, heat-map correctly highlights only 15 Aug, current date correctly shown |
| `/progress/subject/maths` | `14a-progress-subject-before.png`, `viewall-scrolled.png` VERIFIED (RENDER-ONLY, then tapped) | Clean; empty-handler per Finding 4 |
| `/subject/maths` | `15-subject-maths.png` VERIFIED (RENDER-ONLY) | Clean, real data, corroborates Finding 2 |
| `/certificate/[id]` | `15-certificate.png` VERIFIED (RENDER-ONLY) | Clean, correctly personalised (name/set/date) |
| `/quiz/review/[id]` | `15-quiz-review.png` VERIFIED (RENDER-ONLY, no `answers` param so defaults to all-skipped — expected for a bare deep link, not a bug) | Clean |
| `/parent` tab | `10b-parent-gate-or-content.png` VERIFIED (tapped) | Clean "door" screen, no sensitive data leaked (per its own design intent) |
| `/parent-content` (parent gate unlocked) | `11g-parent-content.png` VERIFIED (tapped) | Clean, see Finding 6 |
| Parent gate itself | `11c-after-tap2.png`, `11f-after-background-relock.png` VERIFIED (tapped) | Clean, see §11 |
| `/settings` (Account settings) | `11e-unlocked.png` VERIFIED (tapped) | Clean, real account (Gideon Akinlotan, gakinz101@gmail.com), "Manage children 2" |

**No clipping-behind-the-tab-bar was found on any pushed `(tabs)` screen I visited** — the 12-screen
`pb-35` fix mentioned in the brief is visually confirmed working on `study/session`, `answer-result`,
`session-summary`, `congratulations`, `set-result`, and every `progress/*` screen I checked: the last
card/button on each always sits fully above the floating native tab bar with visible clearance, never
merging into or hiding behind it.

**No unreadable 11px text, no missing images, no spinner-that-never-resolves** was observed on any
screen visited. The one text-truncation issue found is Finding 8 (minor, not a clipping/layout break).

---

## 11. Parent gate — cold deep-link security check

**This is the one item this audit could prove more rigorously than a plain `xcrun simctl openurl` on a
terminated process allows, and it's worth explaining exactly what happened.**

`xcrun simctl terminate` + `xcrun simctl openurl booted "gokid://settings"` on this **dev-client** build
does not reach expo-router directly — it opens the **Expo dev-launcher's own native shell**
(`11a-coldlink-settings-1.png` VERIFIED: a "Development Servers" list, not the app), because the
dev-launcher intercepts the custom scheme before any JS is running and has no bundle loaded yet to hand
the URL to. This is a dev-build tooling quirk, not something a release build (which has no dev-launcher)
would do — flagging it so this isn't mistaken for a routing bug.

Tapping the listed dev server **did** carry the original `gokid://settings` deep link through once the
JS booted: `11c-after-tap2.png` VERIFIED — the app opened directly to the `(parent)` gate's **"Create a
passcode"** screen, not to Account Settings. No passcode existed on this device before this run (first
authorisation the gate had ever seen), so this alone is airtight proof: `/settings` never rendered; only
the challenge did, on a completely locked, passcode-less gate, for a deep link that targeted it directly.

**I created a passcode to complete the check, as pre-authorised: passcode set to `1234`.** This is a
device-state change, listed in §13. `11e-unlocked.png` VERIFIED: unlocking correctly resumed the
original deep link and landed on `/settings` ("Account settings", real account, "Manage children 2") —
so the gate not only blocks, it correctly re-delivers the originally-requested route after auth.

**Re-lock on background, verified live:** `xcrun simctl launch` Safari (backgrounding gokid without
killing it), then `xcrun simctl launch` gokid again (foreground resume, not a cold relaunch) →
`11f-after-background-relock.png` VERIFIED — the gate is locked again, "Enter your passcode." This
matches `src/lib/parent-gate.ts`'s `AppState.addEventListener("change", status => { if (status !==
"active") lockGate() })`, confirmed working end-to-end, not just read in source.

**Verdict: PASS.** The `(parent)` route-group gate intercepts a cold deep link to a protected route,
whether or not a passcode already exists, and correctly re-locks on backgrounding. I did not attempt to
brute-force anything (no passcode existed to brute-force; the one I created was immediately used
correctly, not guessed).

---

## 12. Multi-child isolation (Pass 3-style spot check)

- **Progress tab**: PASS. `09b-isaac-progress.png` — Isaac reads "No progress yet" after Jacob's real
  session activity. `reviews.ts`'s per-child key is honoured on this read path.
- **`/parent-content`**: PASS (and previously broken per `ceoaudit.md`) — see Finding 6.
- **`/subject/maths`, `/progress/subject/maths`, `/progress/statistics`, `/progress/history`,
  `/progress/calendar`, `/progress/achievements`, `/progress/journey`**: all read as Jacob-scoped when
  Jacob is active (all cite "Jacob K" by name or show only his 6-card history) — no cross-child bleed
  observed in any progress surface visited.
- **Did not** get to deleting a child (last-child deletion / active-child-selection-on-delete) — this
  audit was explicitly forbidden from deleting either of the two real children, and there was no time
  budget left to create and safely delete a **third**, throwaway child to test that path without
  touching Jacob or Isaac. Flagging as **NOT RUN** rather than silently skipping it.

---

## 13. Downloads — filesystem-verified

**TAPPED, then verified via `xcrun simctl get_app_container` + reading the file directly (not through
the UI).**

`dl-after-tap.png` VERIFIED: after tapping "Download this set" for "Fronted Adverbials and Punctuation",
the screen correctly flips to "Saved for offline use" / "Remove download".

```
$ xcrun simctl get_app_container booted com.gokid.app data
.../Documents/downloads/y4-fronted-adverbials.json
```

The JSON is genuinely on disk (not just a UI claim). Contents confirmed:
- `cards`: all 6, in position order `y4-fa-c1` → `y4-fa-c6`, matching the authored order exactly.
- `quiz`: all 5 questions present, `y4-fa-q1` → `y4-fa-q5`, each `kind: "mcq"` with `payload.options`
  and `payload.answer`.
- All 5 `payload.answer` values are `0` — the downloaded copy independently corroborates Finding 3 (the
  offline copy has no server-side reshuffle available to it, so it's the fixed always-"A" order).

**Verdict: PASS** for "is the download real" and "are cards/quiz present in the right order"; the answer-
bias content issue (Finding 3) is a pre-existing content-authoring defect, not a download-mechanism bug.

---

## 14. Performance

**Caveat up front: this is a Debug/dev-client build loading its JS bundle from Metro over the network
(port 5062), not a release build with an embedded bundle. These numbers are not representative of
production launch performance — they measure this dev workflow, which is the only thing available to
measure here.**

- **Cold launch** (full `simctl terminate` + `simctl launch`, timed by screenshot polling every 0.5–0.7s,
  `perf-cold-1.png`…`perf-cold-8.png` all VERIFIED):
  - 0.0s–~3s: native launch-storyboard splash (iOS's static splash, blue background)
  - ~4.0s: app's own JS splash screen appears (GoKid logo)
  - ~4.8s: "Who's studying?" is rendered and interactive (mid-transition, pull-to-refresh visible)
  - **Total cold start to first interactive screen: ~4.8–5.5s.**
- **Warm relaunch** (Maestro `launchApp: {clearState: false}` on an already-running process, which
  terminates and relaunches — confirmed by PID change 29823→80365 across the two `00-current-state.png`
  /`00b-recheck.png` captures): visually complete within ~1s of the command returning.
- **Screen-to-screen timing**, from the Maestro step logs (each step's wall-clock is available in the
  run output, not reproduced in full here): every navigation in every flow above (§1) completed and
  rendered well within Maestro's default per-step timeouts (never triggered a "no visible element"
  timeout due to slowness — the two failures that did occur, in §1's `02` and `04` flows, were selector
  mistakes on my part, not app slowness) — no screen took a perceptibly long time to transition in any
  of the ~120 steps run across the 12 flows.

## 15. Log analysis

`xcrun simctl spawn booted log show --predicate 'process == "gokid"' --last 30m`, filtered for
`error|exception|fatal` then again specifically for `RCTFatal|RedBox|Unhandled|console.error|TypeError|
ReferenceError|Sentry`:

- The first, broad filter surfaces only: XCTest/XCUIAutomation driver noise (`XCTAS Error: Error getting
  main window`, `XCTElementQueryResults`) — this is Maestro's own iOS driver talking to the accessibility
  tree, not the app; `nw_endpoint_flow_failed` / `CFNetwork TCP Conn ... Failed` on **port 8081** — React
  Native's Metro inspector/dev-tools port, refused because nothing is listening on it in this setup
  (same category as the port-8097 noise the brief pre-clears); and the expected simulator platform noise
  (`hapticpatternlibrary.plist`, `AVSystemController`, `SecTrustReportNetworkingAnalytics`) — **none of
  which are application defects.**
- The second, JS-specific filter returned **zero results**: no red-box crash, no unhandled promise
  rejection, no `console.error`, no `Sentry.captureException` line surfaced to the unified log during
  this entire session (all 12 flows, the cold/warm relaunches, and the ad hoc repros).
- **Plain statement: I found no application-level errors in the logs this run.**

---

## State I changed

Everything below is a real, disclosed change to this device/account. Nothing else was modified; both
real children (Jacob K, Isaac K) are intact, per `99-final-state-both-children.png`.

1. **Parent passcode created: `1234`.** No passcode existed before this run (first-ever authorisation on
   this device, per §11). Pre-authorised explicitly by the task brief ("if you set one, use 1234 and say
   so"). To change/remove it: Parent area → Account settings, or use "Forgot passcode?" on the gate
   (re-authenticates via Clerk SSO, then lets you set a new one).
2. **Jacob K (real child) has real study progress recorded**, all from actually working through the app:
   - Flashcard session on "Fronted Adverbials and Punctuation" (`y4-fronted-adverbials`): 6 cards rated
     (4 Got it, 2 Tricky), 1 session logged (~1 minute).
   - A quiz attempt on the same set (score recorded as 1/5 — itself evidence of Finding 1, not a real
     reflection of his answers).
   - A Study Session pass on "Multiplication and Division" (`y4-mult-div`) — per Finding 2, this did
     **not** persist to his SRS record or session history, so there is nothing to undo here even though
     UI was exercised.
   - A downloaded set on-device: `Documents/downloads/y4-fronted-adverbials.json` (removable via the
     Download screen's "Remove download", or left in place — it's inert storage).
3. **Isaac K (real child) was made the active child** partway through (§ switch-child test) and then
   Jacob was reselected for later flows. Isaac has no recorded progress (confirmed, not caused, by this
   run).
4. **No child was deleted, no account was signed out, no database/Clerk reset was run**, and the dev
   server on :5062 was never touched.

## Files

- Report: `docs/qa/2026-08-15/workers/device-tier23.md` (this file)
- Screenshots: `docs/qa/2026-08-15/shots/*.png` (~85 files, all referenced above by name)
- Maestro flows (committed regression asset): `.maestro/01-whos-studying-pick-child.yaml` through
  `.maestro/12-download-verify.yaml`
