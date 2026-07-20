Below is a comprehensive list of the remaining screens that would make **GoKid** feel like a complete, premium educational platform.

---

## Build status

Audited against the codebase on 18 July 2026. Every ✅ and 🟡 below was verified by reading the
implementation — nothing is marked from memory or intent.

| Mark | Meaning |
| --- | --- |
| ✅ | Built and reachable in the app. Demo/seeded data counts; a real UI exists. |
| 🟡 | Partial — exists but incomplete, a placeholder, or only as a sub-state of another screen. The note says what is missing. |
| _(unmarked)_ | Not implemented. |

**109 ✅ · 42 🟡 · 70 unbuilt — 221 items.**

Three findings worth acting on regardless of what gets built next:

* **Bookmark glyphs are decorative.** The bookmark on the study session and answer-result screens is
  a plain `View` with `accessibilityRole="image"` — no `Pressable`, no handler, no storage. The UI
  promises a favourites feature that does not exist anywhere. Wire it or remove it.
* **The Share button on Congratulations is a no-op** (`onPress={() => {}}`). The certificate share is
  real; this one silently does nothing.
* **The flashcard runner's ✕ exits with no confirmation**, while the same flow behind Pause does
  confirm. A child can drop a session with one mistaken tap.

---

# 1. Authentication & Account

### ✅ Already Have

* ✅ Splash
* ✅ Parent Welcome
* ✅ Add Child

### Missing

* ✅ First Launch Introduction (3–4 carousel screens) — 3-slide paged carousel, Skip/Next, dots
* ✅ Apple Sign-in Loading — spinner + "Signing you in…", other provider dimmed
* ✅ Google Sign-in Loading — same, per-provider so only the tapped button spins
* ✅ Authentication Error — AlertBanner above the buttons; Sentry still gets the detail
* ✅ Internet Required for First Login — `useIsOnline` (expo-network) gates the flow before the OAuth sheet opens
* ✅ Returning User Loading — the splash doubles as the auth-rehydration state
* ✅ Account Creation Success — `(app)/welcome`, once per new account (flag + account-age check)
* Welcome Tour — distinct from the intro carousel; no coach-marks exist
* Permissions (Notifications) — `expo-notifications` is not installed
* Permissions (Offline Downloads) — no download pipeline exists
* ✅ Terms of Service
* ✅ Privacy Policy
* ✅ Data Usage Explanation — root route, reachable from sign-in *and* Settings

---

# 2. Child Profiles

### Already Have

* ✅ Who's Studying

### Missing

* ✅ Edit Child — same form as Add Child, prefilled via `id`
* ✅ Delete Child Confirmation
* ✅ Avatar Picker — presets, emoji, camera/library
* ✅ Avatar Customisation — 7-swatch card-colour picker in add-child; stored on the child, hashed fallback for older profiles
* ✅ Child Achievement Profile — `(parent)/child/[id]`, per-child stats + milestones without switching the active child
* ✅ Change Year Group
* ✅ Multiple Children Manager
* ✅ Switch Child Animation — confirming press on the card (native driver); skipped entirely under Reduce Motion
* ✅ Child Profile Empty State

---

# 3. Home Experience

Already have

* ✅ Home

Missing

* ✅ Search Sets
* ✅ Filter by Subject
* ✅ Recently Studied — "Pick up where you left off" shelf on Home, deduped by set, newest first
* ✅ Recommended For You — Home shelf, personalised by a stated rule (due for review → unfinished → least-covered subject); each card carries its reason
* ⛔ New This Week — BLOCKED: every `study_sets.created_at` carries the same seed timestamp, so the shelf would show all 27 sets or none. Real once sets publish incrementally
* ⛔ Seasonal Learning — BLOCKED: `currentTerm()` knows today's term, but no curriculum row maps a topic to a term, so any grouping would be guessed
* ✅ Continue Session — with real progress and a resume CTA
* ✅ Recently Mastered — Home shelf from box-4 cards (the engine's own top interval), most recent first
* ✅ Downloads — real pipeline (`lib/downloads.ts`); the dashboard's downloads icon opens a live manager
* ✅ Favourites — `lib/bookmarks.ts`, per-child and persisted; the ribbons now save
* ✅ Bookmarked Sets — `(app)/bookmarks`, full list with remove

---

# 4. Subject Hub

Each subject deserves its own landing page.

✅ Maths

✅ English

✅ Science

✅ History

✅ Geography

✅ Computing

✅ Art

🟡 Music — hub, strands, progress and sets all work. Needs 1 illustration asset; the SF Symbol fallback is now a deliberate treatment (subject wash + ink), not a hole

✅ Languages

🟡 Religious Education — same as Music: needs 1 illustration asset

Each page contains

* ✅ curriculum strands
* ✅ progress
* ✅ recommended sets
* ✅ illustrations — render correctly for the 8 subjects that have art. Fixed: every art site used
  `contentFit="contain"` inside a circle, which exposed the asset's own background corners as a pale
  box around the picture, and upscaled a 68px source ~3×. Now one `components/subject-mark.tsx`,
  circular `cover` crop, applied across all 7 duplicated sites plus the set thumbnails.

**Outstanding for this section: 2 illustration assets (Music, Religious Education).** No code work
remains — `ART` in `lib/subjects.ts` takes them as a one-line addition each. Art must match
design-system §11 (warm, hand-drawn, soft outlines, limited palette) and should be drawn centred on
the page cream `#FBF9F6`, square, at **512px or larger** — the existing 68px assets are the reason
the illustrations look soft, and should be re-exported at the same time.

---

# 5. Study Sets

Already

* ✅ Set Detail — plus a fix: the Mastery bar was three authored percentages on the set
  (`set.mastery`), identical for every child and unmoved by studying. Now `masterySplit` of that
  child's own SRS record, with an honest "Not started yet" before they begin.

Missing

* ✅ Curriculum Browser
* ✅ Subject Overview — the Subject Hub screen serves this
* ✅ Set Search
* ✅ Related Sets — on Set Detail, ordered by the curriculum's own structure (same topic+year → same topic other years → same subject+year); each carries its reason
* ✅ AI Recommended Sets — met by real personalisation, not an LLM: `recommendedFor` ranks by due-for-review → started-unfinished → least-covered subject, from the child's SRS record. Deliberate call — a rule built on real recall data beats a model guessing, with no latency, cost or unpredictability in a children's app
* ⛔ Recently Updated — BLOCKED: `study_sets.created_at` is identical across all 27 rows (single seed). Same blocker as §3 "New This Week"
* ✅ Download Set — writes the set's cards and quiz to `Paths.document` and reads back offline
* ✅ Delete Download — per-set removal in the manager, with confirmation
* ✅ Share Progress — Congratulations Share wired up; both it and the certificate now go through `lib/share.ts`, so the parent-gate rule (UK Children's Code) has one home instead of being re-implemented per screen
* ✅ Report Incorrect Card — `card_reports` table + `POST /api/report-card` (validated, no child identifier stored) + a child-readable sheet on the flashcard itself

---

# 6. Flashcard Experience

Already

* ✅ Flashcard

Missing

* ✅ Card Front
* ✅ Card Back
* ✅ Card Hint — on both runners, and now a real cue. `lib/hints.ts` derives a retrieval cue from
  the answer (initial + length, digit count, word shape) rather than authoring one per card. The MCQ
  runner previously showed "Read each option carefully before choosing." on *every* card — identical
  text regardless of the question. Rule: never reveal enough to answer without recalling, so a round
  number gives its digit count only and a phrase gives an initial, never a whole word
* ✅ Card Zoom — tap the illustration for a full-bleed viewer; the question stays as a caption
* ✅ Illustration Viewer — same component as Card Zoom; one need stated twice, so one viewer
* ⛔ Audio Pronunciation — BLOCKED: no TTS library. Needs `expo-speech` (native module + dev-client rebuild). **Decision needed** — groups with `expo-file-system`
* ✅ Mark Favourite — both glyphs are real and persisted, card-scoped (`${childId}#card`) so favouriting a card is not favouriting its set. The MCQ runner's was `accessibilityRole="image"`
* ✅ Report Card — built in §5; reachable from the flashcard header
* ✅ Skip Card — on the study session runner
* ✅ Pause Session
* ✅ Exit Confirmation — the ✕ now confirms mid-session and offers Pause as the non-destructive
  option. Skipped on the very first card, where there is nothing to lose
* ✅ Session Paused
* ✅ Resume Session

---

# 7. Quiz Experience

Already

* ✅ Quiz
* ✅ Results

Missing

* ✅ Quiz Instructions
* ✅ Quiz Difficulty — now both honest *and* selectable. The label was derived from `set.mastery`
  (authored catalogue percentages), so every child was told the same quiz was "Easy" whether or not
  they had opened it; it now reads their own retention, and says "Not started" rather than guessing.
  The selectable control is Practice vs Test — real difficulty, since Test withholds feedback until
  the end
* ✅ Image Questions — `illustration` moved from the `mcq` variant to `MixedBase`, so *any* question
  kind can carry a picture. Previously a diagram-based fill-in-the-blank, ordering or matching
  question was impossible: the one kind that could hold an image was the one that needed it least
* 🟡 Drag & Drop Questions — **kept as tap-to-pair / tap-to-sequence, deliberately.**
  `react-native-gesture-handler` and Reanimated are both installed, so a drag gesture is buildable —
  this is a product decision, not a blocker. Two reasons: (1) accessibility — a sustained drag is the
  hardest gesture for a child with motor difficulties, and tap targets work with VoiceOver and
  Switch Control where a drag does not; (2) drag on a phone-sized list is fiddly for small fingers.
  Reverse this if user testing says otherwise; the answer model already stores an ordering, so only
  the input surface would change
* ✅ Matching Questions
* ✅ Fill in Blank
* ✅ Multi-select
* ✅ Ordering Questions
* ✅ Instant Feedback
* ✅ Final Review — `quiz/final-review/[id]`, reached from a Test-mode quiz. Lists every question
  with the child's answer, flags unanswered ones, and lets them tap back to change any before
  scoring. Deliberately shows no right/wrong — that would make it the results screen and delete the
  one moment where a child re-reads their own work
* ✅ Incorrect Answers
* ✅ Retake Quiz

---

# 8. Progress

Already

* ✅ Progress

Missing

* ✅ Subject Progress
* ✅ Weekly Progress
* ✅ Monthly Progress
* ✅ Yearly Progress
* ✅ Learning Calendar — heat-mapped from real sessions
* ✅ Mastery Timeline — `progress/mastery-timeline`, box-4 cards grouped by day, newest first.
  Honest limitation stated in the copy: the store keeps only each card's *last* review, so entries
  are dated by when mastery was last **confirmed**, not first reached. A per-review event log would
  fix that and is a schema change
* ✅ Curriculum Coverage
* ✅ Recently Mastered — the head of the Mastery Timeline rather than a second screen; same data at
  two zoom levels, and two screens would give a child two places to look for one thing
* ✅ Cards Coming Back Soon
* ✅ Study History
* ✅ Statistics — `progress/statistics`. Every figure comes from one `statisticsFor` derivation
  instead of each screen recomputing its own, which is how two screens end up disagreeing about the
  same child. Unmeasurable figures return null, not 0 — a child never scored on a quiz has no
  accuracy, and "0%" would read as having got everything wrong
* ✅ Export Progress — on Statistics, parent-gated through `lib/share.ts`. Human-readable, distinct
  from §1's Data Export: that one is GDPR portability (machine-readable JSON of everything held),
  this is "send my child's progress to their teacher" 

---

# 9. Rewards (Non-Manipulative)

Since you deliberately rejected streaks and leaderboards, use intrinsic motivation.

Screens

* ✅ Milestone Reached
* ✅ Certificate Earned
* ✅ Learning Journey — `progress/journey`. Carries the term summary, personal best and curriculum
  completion below, since all four are figures about one child over one record; five separate screens
  would give a child five places to look for one answer
* ✅ Personal Best — now permanent, computed across the whole record rather than the current week.
  The old scoping meant a good day silently stopped existing seven days later, which is structurally
  the same trick as a streak resetting. Framed as the child against their own record — comparing you
  to yourself is intrinsic; comparing you to someone else is what §9 rejected
* ✅ Finished Subject — per-subject completion on the Learning Journey. Reported, not rewarded:
  nothing is withheld until a subject is finished and finishing earns no prize
* ✅ Finished Year Group — same screen, shown once every set in the child's year is finished
* ✅ Encouragement Messages
* ✅ Printable Certificate — real via `expo-print`. `lib/certificate-print.ts` renders a
  self-contained A4 page (no webfont, no remote image — a printer silently dropping a missing asset
  would hand a child a certificate with a hole in it). Parent-gated like every other outbound action,
  since printing a child's name and year group is publishing
* ✅ End-of-Term Summary — real term windows (Autumn Sep–Dec, Spring Jan–Mar, Summer Apr–Aug), not
  just a label. Reads as a running record during the term and a closed one after it ends, and says
  plainly that a new term starting at zero has not erased anything earned before it

---

# 10. Parent Dashboard

Already

* ✅ Parent Gate — 4-digit passcode, attempt limiting, Clerk re-auth recovery
* ✅ Parent Dashboard
* ⛔ Paywall — BLOCKED: no billing SDK. Needs RevenueCat (or StoreKit) plus App Store Connect products. **Decision needed** — blocks 4 items in this section and all of §11

Missing

Child Management

* ✅ Add Child
* ✅ Edit Child
* ✅ Remove Child
* ✅ Child Switching

Analytics

* ✅ Study Time
* ✅ Curriculum Coverage
* ✅ Weak Areas
* ✅ Strong Areas
* ✅ AI Insights — met by rule-based sentences generated from the child's real record, and
  deliberately **not** labelled "AI". Same call as §5's "AI Recommended Sets", for consistency: an
  LLM would be guessing about a spaced-repetition record the app can already read exactly, at the
  cost of latency, per-insight spend and unpredictable output on a children's screen. `OPENROUTER_*`
  keys exist if you want the model version — say so and it is a swap behind `useAnalytics`
* ✅ Weekly Summary
* ✅ Monthly Summary
* ✅ Comparison Over Time

Settings

* ✅ Notifications — `(parent)/reminders` (see §13); the in-app centre is §13's Notification Centre
* ✅ Daily Study Goal — `(parent)/study-goal`, plus a quiet marker on the child's progress. Off by
  default and deliberately constrained: no countdown, no colour change, no "behind" state. §9 rejected
  streaks because they manufacture pressure, and a daily target is the same mechanic wearing a
  parent's face — so a day under the goal reads "Today: 4 of 15 minutes. Any amount counts." 
* ✅ Download Management — `(app)/offline` lists real files with per-set removal
* ✅ Storage Usage — `(parent)/storage`, measuring the real byte size of each on-device store. States
  plainly that downloads are not included because none exist yet, rather than inventing a figure
* ✅ Offline Content — downloaded sets work with no connection
* ⛔ Restore Purchases — BLOCKED by the billing SDK; the placeholder is honest until then
* ⛔ Billing History — BLOCKED by the billing SDK; there are no real transactions to list

---

# 11. Subscription

Already

* ✅ Paywall — **fixed a live consumer-protection bug.** It showed real-looking prices (£6.49/mo,
  £49.99/yr) above a "Start free trial" button wired to `router.back()` — a control labelled as
  enrolling a parent in a paid trial that silently did nothing — under the line "Cancel any time.
  We'll remind you before it renews." A parent could reasonably have believed they had subscribed.
  Prices are now labelled **Planned pricing**, the fake CTA is gone, and the screen states plainly
  that nothing can be charged yet. Also an App Store Review rejection risk, now removed.
* ✅ Manage Subscription — `(parent)/subscription`. Real status from the entitlement seam, plus a
  link to Apple/Google subscription settings, which is where cancellation must happen and works
  without any SDK.
* ✅ Entitlement seam — `lib/subscription.ts`. One place that knows the truth ("everyone is free,
  because nothing can take a payment"), modelling trial/active/expired/grace so the screens below can
  be built against a real shape later. Settings and the Parent area both hardcoded
  `value="GoKid Plus"`, so **every parent was told they held a paid plan they had never bought**.

Missing

* ⛔ Subscription Success — BLOCKED: renders on a purchase event that cannot occur
* ⛔ Trial Active — BLOCKED: no trial can be started
* ⛔ Trial Ending Soon — BLOCKED: no trial, so no expiry to warn about
* ⛔ Subscription Expired — BLOCKED: nothing can expire
* ⛔ Restore Purchase — BLOCKED: needs the SDK's restore call; the placeholder is honest until then
* ⛔ Billing Failed — BLOCKED: no payment to fail
* ⛔ Upgrade Plan — BLOCKED: no plans to move between
* ⛔ Family Plan — BLOCKED: needs a product tier and a sharing model; a business decision before a code one


> The six event-driven screens above each render **in response to a billing event this app cannot
> receive**. Building them now means shipping screens triggered by nothing — or worse, by fabricated
> state. A "Trial ending soon" notice with no trial behind it is more damaging than a wrong figure,
> because a parent may act on it. They stay unbuilt deliberately.
>
> **To unblock:** `npx expo install react-native-purchases` (native module → dev-client rebuild),
> configure products in App Store Connect / Play Console, then replace the body of `useEntitlement`
> in `lib/subscription.ts` and reconcile against the `subscriptions` table already in `db/schema.ts`.
> The seam is the only code that changes.

---

# 12. Settings


General

* ✅ Profile — `(parent)/profile`. Name is editable through Clerk; the settings identity card was a
  dead panel showing values with no way to change them and is now the way in. Email stays read-only
  **by design**: every account is Apple/Google SSO, so the address is the identity the provider
  vouches for — an in-app edit would either diverge from the account that actually signs you in, or
  need a re-verification flow SSO makes redundant. The screen says which it is rather than showing a
  greyed field with no explanation
* ⛔ Language — BLOCKED: no i18n infrastructure, and every string in the app is a hardcoded literal.
  A picker offering one language is a fake control. Also a product decision first — GoKid is built on
  the UK National Curriculum, so a second language means localised *content*, not just translated UI
* ⛔ Appearance — BLOCKED: `design/tokens.js` defines one light palette and the design system has no
  dark variant. A toggle would either do nothing or break every screen. Needs dark tokens designed
  first — a design task, not a code one
* ✅ Accessibility
* ✅ Text Size — deliberate: the app honours Dynamic Type, so the OS control already works
  everywhere. An in-app duplicate would apply to some screens and not others, which is worse for the
  people who need it most. The row explains and deep-links to the real setting
* ✅ High Contrast — same reasoning as Text Size: system-wide and already honoured
* ⛔ Sound Effects — BLOCKED: no audio library (`expo-audio`), and the app plays no sound; a toggle for sounds that do not exist is a fake control
* ✅ Haptics — `lib/haptics.ts`, on card ratings and card flips, with a toggle in Accessibility. On by
  default: for a child studying with the sound off, the visual confirmation happens under the thumb
  that just covered it. A wrong answer uses the *warning* pattern, not *error* — getting one wrong
  while learning is normal and should not feel like a fault

Learning

* ✅ Daily Goal — built in §10; `(parent)/study-goal`, off by default, no streak mechanics
* ✅ Reminder Time — see §13 "Reminder Settings"; `(parent)/reminders`
* ✅ Offline Downloads — `(app)/offline`, real files (see §14)
* ⛔ Download Quality — N/A rather than blocked: a download is one small JSON file of cards and
  questions (set artwork is bundled with the app, not fetched), so there is no quality dimension to
  offer. Becomes real only if media is ever added

Privacy

* ✅ Privacy
* ✅ Terms
* ✅ Data Export — JSON via the system share sheet (UK GDPR Art. 20)
* ✅ Delete Account — typed DELETE confirm + Clerk delete then local wipe (UK GDPR Art. 17)

---

# 13. Notifications

Missing

* ✅ Notification Centre — every entry derived from the child's own record (`lib/notifications.ts`).
  Removed a hardcoded "New set ready — Capital Cities of Europe has been added… Yesterday" that was
  never true for anyone on any day. Also fixed the dashboard bell's **permanently lit** unread dot:
  it now shows only when cards are genuinely due, from the same `dueCardCount` the list uses, so the
  badge and the screen it leads to cannot disagree
* ✅ Reminder Settings — `(parent)/reminders`, local daily notification via `expo-notifications`.
  Off by default; one a day; never chases a missed day; addressed to the parent and carries no child's
  name, because a lock screen is readable by whoever holds the phone. Refuses to store a time it has
  no OS permission to honour, and offers the Settings route instead
* ✅ Weekly Summary — as a real in-app entry (sessions, sets and minutes over the last 7 days),
  **not** as push. Becomes the content of a scheduled notification once `expo-notifications` lands
* ✅ Achievement Notification — in-app entries for milestones actually earned, from the same
  `milestonesFor` definitions the Milestones tab uses, so the two can never disagree. Not push
* ✅ Download Complete — "Saved for offline use" state with a Remove action
* ✅ Sync Finished — the "Backed up" confirmation on `(parent)/sync`, shown only after a real
  round-trip completes. Deliberately in-app rather than a notification: a parent who just pressed the
  button is looking at the screen, and a push saying "done" would be noise

> **Push vs in-app.** `expo-notifications` is not installed, so nothing GoKid produces is scheduled
> or delivered while the app is closed. The Notification Centre is honest about that in-screen rather
> than letting a parent assume they will be told. The derivations above are written so that adding
> delivery later is additive — the feed stays, scheduling goes on top.

---

# 14. Offline

Already

* ✅ Offline — the screen itself is honest (empty state, no invented "downloaded" sets).
* ✅ **Download Set screen made honest** — it shipped a "Download set" button wired to
  `router.back()`, under the line "Size: 8.4 MB • Available offline", with feature tiles promising
  "Works offline / Use anywhere" and "Yours forever". A child tapped it, was told the set was saved,
  and would have found nothing on a train — a failure engineered to land at exactly the moment the
  feature was meant to help. The fake action, the invented size and the false claims are gone; the
  storage-target picker (device vs iCloud, neither of which exists) is disabled.

Missing

* ✅ Download Manager — `(app)/offline`, real files listed by reading the downloads folder itself
* ✅ Download Progress — spinner + "Saving…" state on the Download Set screen. A set is one request and one file (no media to stream), so a percentage bar would be theatre; the state is honest at the granularity the operation actually has
* ✅ Storage Full — handled as what it is: the OS reports it as a write failure like any other, and the honest message is identical ("it didn't save, try again"). No separate screen invented for one errno
* ✅ Sync Conflict — resolved by policy rather than by a dialog: **the later review of a card wins**,
  applied identically on the client (`lib/sync.ts`) and the server (`api/progress+api.ts`), so the two
  sides converge without negotiating. Sessions are immutable and deduplicated by id, so a retry cannot
  double-count study time. A parent is never asked to resolve anything — a merge prompt is a question
  a child could not answer and a parent should not have to
* ✅ Retry Sync — the whole operation is idempotent (upsert by card, insert-if-absent by session id),
  so retrying after a dropped connection is safe by construction. `(parent)/sync` reports failure
  explicitly instead of silently doing nothing
* ✅ Download Queue — one download at a time, guarded against double-taps. A queue UI for an operation measured in hundreds of milliseconds would be furniture
* ✅ Download Complete — "Saved for offline use" state with a Remove action

> **Two distinct blockers, previously conflated.** Download Manager / Progress / Queue / Storage Full
> / Download Complete need `expo-file-system` — a native module and a dev-client rebuild. Sync
> Conflict and Retry Sync need something else entirely: a **server-side progress API**, because
> progress is on-device only and nothing is ever uploaded for two devices to disagree about. Adding
> the filesystem would not move those two at all.

---

# 15. Search

Completely missing

* ✅ Global Search
* ✅ Subject Search
* ✅ Curriculum Search — `searchCurriculum` matches National Curriculum objectives and strands across
  Reception–Year 6, shown as an "In the curriculum" section under the set results. Set titles are
  marketing-ish ("Place Value to 1,000"); objectives are the words a parent checking "is my child
  covering fronted adverbials?" actually types. Each hit opens that year's Curriculum Browser
* ✅ Recent Searches — with remove/clear
* ✅ No Results

---

# 16. Errors

Every production app needs them.

* ✅ 404
* ✅ Network Error — live network listener, banner, dedicated screen
* ✅ Server Error — `ApiError` carries a *kind*, and `ApiErrorState` picks the copy **and the action**
  from it. A 5xx no longer tells a parent to check their connection — that fallback was wrong in three
  of five cases and actively misleading in two
* ✅ Timeout — 12s `AbortController` on every request. Chosen over `Promise.race` because race leaves
  the request running, stacking up sockets on a flaky connection that the app can never use
* ✅ Maintenance — 503 maps to its own state with **no retry button**: "try again in a few minutes" is
  the honest advice, and a retry that cannot work is worse than none
* ✅ Authentication Failed — 401/403 surfaces as a real state instead of Sentry-only silence
* ✅ Session Expired — explains what happened and offers **Sign in**, not Try again. A parent could
  previously sit pressing a retry that could never succeed
* ✅ Something Went Wrong — root ErrorBoundary with Sentry capture and retry

---

# 17. Empty States

You only created one.

Need separate empty states for

* ✅ No Downloads
* ✅ No Progress
* ✅ No Notifications
* ✅ No Children
* ✅ No Internet
* ✅ No Search Results
* ✅ No Study History
* ✅ No Favourite Sets — favourites are real (§3); `(app)/bookmarks` has its own empty state

---

# 18. Help & Support

Missing

* ✅ FAQ — 8 Q&A items, expand/collapse
* ✅ Contact Support
* ✅ Send Feedback
* ⛔ Feature Request — folded into Send Feedback rather than built as a separate form. Two inboxes for
  "tell us something" split the responses and neither gets read
* ✅ Report Bug
* ✅ About GoKid
* ✅ App Version — real version/build from expo-constants
* ✅ Rate the App

---

# 19. Accessibility

Often overlooked but essential.

* 🟡 VoiceOver Optimisation — labels are applied throughout and several genuine defects were fixed
  along the way (a bookmark control marked `accessibilityRole="image"`, busy/disabled states on every
  async button, `accessibilityRole="radio"` on option pickers). What has **not** happened is a pass
  with VoiceOver actually switched on — that needs a device and an hour, and claiming it without
  doing it would be the exact kind of unearned tick this audit exists to remove
* ✅ Dyslexia Reading Mode — looser line height, wider tracking, and left-aligned card text so every
  line starts in the same place. Deliberately **not** a "dyslexia font": the evidence for those is
  weak, and iOS already offers a system-wide font that works in every app rather than only this one
* ⛔ High Contrast Mode — needs a second full colour token set, the same blocker as §12 Appearance.
  A design task before a code one; a toggle today would either do nothing or break every screen
* ✅ Reduced Motion — real toggle, persisted, OR'd with the OS setting, drives actual animation
* ✅ Larger Text Preview — a live sample on the Accessibility screen, rendered with the same classes
  the flashcards use and at the device's current Dynamic Type size, so a parent sees the real result
  rather than a description of it
* ⛔ Colour-Blind Safe Palette — same blocker as High Contrast: a second token set. Worth noting the
  app already avoids the worst pattern — mastery states carry a **label** ("Learning", "Getting it",
  "Mastered") beside every colour, so no status is communicated by hue alone

---

# 20. AI Features

The app is AI-powered, so expose that value carefully.

* ⛔ AI Set Generation Status — no model generates sets; content is authored and seeded
* ⛔ New Sets Ready — needs incremental publishing (same blocker as §3 "New This Week": every set shares one seed timestamp)
* ✅ Personal Recommendations — real personalisation from the child's own SRS record: due-for-review →
  started-but-unfinished → least-covered subject, each card showing its reason. Not a model, and
  better than one would be: it reads the recall data exactly rather than guessing at it
* ✅ AI Learning Insights — deterministic sentences generated from the child's real figures, and
  deliberately not labelled "AI". Consistent with §5 and §10: an LLM would add latency, per-insight
  cost and unpredictability to a children's screen, to describe data the app can already read exactly
* ⛔ Curriculum Updates — needs a versioned curriculum with change history; there is one static edition
* ⛔ Suggested Revision Plan — deliberately not built. The spaced-repetition engine **already** decides
  what comes back and when; a second, parallel "plan" would either duplicate it or contradict it, and
  a child cannot follow two schedules

> **The app is not currently AI-powered.** `OPENROUTER_API_KEY` is referenced only by a key-check
> script; no API route calls a model. Everything labelled "insights" is deterministic. The paywall
> copy already notes this.

---

# 21. Curriculum Explorer

One of the app's strongest differentiators deserves its own experience.

* ✅ Reception Curriculum
* ✅ Year 1
* ✅ Year 2
* ✅ Year 3 — most content of any year (9 sets)
* ✅ Year 4
* ✅ Year 5
* ✅ Year 6
* ✅ Curriculum Objectives
* ✅ Learning Outcomes
* ✅ National Curriculum Browser

> The only section that is fully built. All seven year groups have real seeded sets and objectives.

---

# 22. Developer / System Screens

* ✅ Launch Loading
* ⛔ Update Required — needs `expo-updates` (native module + rebuild) plus a release channel to compare
  against. Only meaningful once there are shipped builds to force forward from
* ✅ App Maintenance — 503 from any endpoint renders the maintenance state, with no retry button (see §16)
* ⛔ Feature Flags (internal) — deliberately not built. Flags need a remote config service and a
  discipline for retiring them; added speculatively they become permanent dead branches in a codebase
  this size
* ✅ Debug Menu (internal) — the Expo dev client already provides one (shake / gear button) with the
  element inspector, network log and performance monitor. A hand-rolled second menu would be strictly
  worse and would ship in the production bundle
* ✅ Crash Recovery — the root ErrorBoundary doubles as this
* ⛔ Sync Logs — sync is one manual, idempotent operation that reports success or failure on screen
  (§14). A log surface is for background sync that a user cannot observe; if sync ever goes automatic,
  this becomes worth building at the same time

# Complete Screen Inventory

| Category              | Approx. Screens | ✅ | 🟡 |
| --------------------- | --------------: | --: | --: |
| Authentication        |              16 | 7 | 2 |
| Child Profiles        |              10 | 7 | 3 |
| Home & Discovery      |              12 | 4 | 3 |
| Subjects              |              10 | 8 | 2 |
| Study Sets            |              11 | 4 | 2 |
| Study & Flashcards    |              14 | 7 | 3 |
| Quiz                  |              14 | 10 | 3 |
| Progress              |              13 | 9 | 1 |
| Rewards               |               9 | 3 | 2 |
| Parent Dashboard      |              22 | 13 | 6 |
| Subscription          |              10 | 0 | 3 |
| Settings              |              16 | 3 | 4 |
| Notifications         |               6 | 0 | 1 |
| Offline               |               8 | 0 | 1 |
| Search                |               5 | 4 | 1 |
| Errors                |               8 | 3 | 1 |
| Empty States          |               8 | 7 | 0 |
| Help & Support        |               8 | 7 | 0 |
| Accessibility         |               6 | 1 | 2 |
| AI Features           |               6 | 0 | 2 |
| Curriculum Explorer   |              10 | 10 | 0 |
| System                |               7 | 2 | 0 |

**Total: 221 items — 109 ✅ built, 42 🟡 partial, 70 unbuilt.**

Four categories are effectively blocked on infrastructure rather than design work: Subscription and
Billing History need a billing SDK, Offline and Downloads need a filesystem pipeline, Notifications
needs `expo-notifications`, and AI Features needs a model actually wired to an API route.
