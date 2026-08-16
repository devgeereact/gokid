# Fix task report — design-honesty + notifications + nextSetId

Scope: the 7 items listed in the task brief, confined to the 9 files I was allowed to touch. No other
files were edited. `npx tsc --noEmit` and `npm run lint` both pass clean after all changes (verified
last, after all 7 items were in place).

Note on `src/lib/study.ts`: another agent was editing the rest of this file concurrently (adding
`illustrationAlt`, `strand` fields, shuffling quiz option orders, etc. — visible in `git diff`). My
change there is isolated to the `nextSetId` function only; verified with
`git diff src/lib/study.ts | grep nextSetId` showing exactly one removed and one added signature line.

## 1. `session-summary/[id].tsx:53` — dead "View all" Text in `BarList`

**Fix: removed**, not wired. There is no "all strengths" / "all needs-practice" list screen anywhere
in the route tree to send it to (checked `src/app`), so wiring it would mean building a new screen —
out of scope for a fix task — and removal matches the precedent the brief pointed at
(`set-result/[id].tsx`'s "the review lives where the answers are" choice).

- File: `src/app/(app)/(tabs)/study/session-summary/[id].tsx`
- `BarList`'s header row lost the `Text className="... text-primary">View all</Text>` and the
  `justify-between` row wrapper (now just the title, no longer needs to justify two things across the
  row). Affects both call sites (Top strengths, Needs more practice) since they share the component.
- Added a comment explaining the removal and citing the `set-result` precedent, matching the file's
  existing comment voice.

## 2. `progress/subject/[subject].tsx:257-259` — "Recent sets → View all" empty handler

**Fix: wired**, not removed — a real destination already existed and just hadn't been connected.

- `/search` (`src/app/(app)/search.tsx`) accepts a `subject` route param and pre-filters to it; with
  an empty query string `searchSets("", subject)` returns *every* set for that subject
  (`src/lib/search.ts:53-61`, `terms.length === 0` short-circuits to `true`). That is exactly "view all
  sets for this subject."
- Confirmed the param contract: `SUBJECTS` in `lib/search.ts` is `STUDY_SETS.map(s => s.subject)`
  (e.g. `"Maths"`), and `Subject.name` in `lib/subjects.ts` is documented to match
  `StudySet.subject` exactly — so `subj.name` is the correct value to pass.
- Changed the `onPress` to `router.push({ pathname: "/search", params: { subject: subj.name } })`,
  updated `accessibilityLabel` to name the subject (`View all Maths sets`, etc. — a strengthening, not
  a weakening), and updated both the inline comment and the file's header doc comment (which had
  previously stated "'View all' has no target screen yet").

## 3. `settings.tsx:128` — `Billing` row hardcoded `value="Apple"`

**Fix: reads the entitlement seam**, matching the precedent already set for the "Plan" row directly
above it (the "was `value=\"GoKid Plus\"` as a literal" fix already in the file).

- Added `const free = entitlement.status === "free"` and a `store` value derived from
  `manageSubscriptionUrl()` (same derivation `subscription.tsx` already uses: `Apple` if the URL
  contains "apple", else `Google`).
- `Row`'s `value` is now `free ? "None" : store`. Since `useEntitlement()` is hardcoded to
  `{ status: "free" }` today (`lib/subscription.ts`), this currently always renders "None" — true,
  because nothing has ever been billed. When a real billing SDK lands and entitlement can be non-free,
  the row starts naming the real store without further changes here.
- Added a comment pointing at the "Plan" row fix above it as the same class of bug.

## 4. `help.tsx:23` — "Rate GoKid" opens a broken App Store page

**Fix: made the placeholder state explicit and short-circuited before attempting the open**, rather
than relying on `Linking.canOpenURL` to catch it.

- Root cause confirmed: `Linking.canOpenURL("itms-apps://...")` only checks whether the OS has a
  handler for the `itms-apps:` **scheme** (i.e., is the App Store app installed), not whether the
  numeric id resolves to a real listing. A placeholder id like `"0000000000"` passes that check, so
  `openExternal`'s catch-and-alert path never triggers, and the tap opens the App Store on a
  nonexistent-app page — silently wrong, on a pre-launch build, in a customer-facing support screen.
- Changed `APP_STORE_ID` from the string `"0000000000"` to `null` (typed `string | null`), with a
  comment explaining exactly why a placeholder numeric string was insufficient.
- `onPress` now checks `APP_STORE_ID` first: if set, behaves exactly as before (opens the real Store
  listing); if `null`, shows an honest `Alert.alert("Not on the App Store yet", ...)` without ever
  calling `Linking`. Once a real numeric id exists, setting `APP_STORE_ID` to it restores the original
  behavior with no other code change needed.

## 5. Stale "`expo-notifications` is not installed" comments

**Fix: corrected both copies**, `package.json:25` confirms `"expo-notifications": "~57.0.6"` is
installed and `lib/reminders.ts` already schedules real OS notifications with it.

- `src/lib/notifications.ts:12` (module header): rewrote to say the package IS installed and is used
  by `lib/reminders.ts` for the one daily reminder, while keeping the true and still-important claim —
  that *this specific module* (the derived in-app feed) schedules and delivers nothing itself.
- `src/app/(app)/notifications.tsx:24` (screen header) and the in-screen footer banner (the "GoKid
  doesn't send phone notifications yet" text a parent sees on the Notification Centre): both corrected
  to the same effect — the list itself isn't pushed, but a daily study reminder is a real, separate
  feature (Settings → Study reminder) that does deliver an OS notification once a day, and this screen
  is not it.
- Left `lib/reminders.ts`'s own doc comment untouched — it already correctly described itself as using
  `expo-notifications` for local-only scheduling; it was never the source of the stale claim.

## 6. Tapping the scheduled reminder routes nowhere

**Fix: registered `Notifications.useLastNotificationResponse()` in the root layout** and route to
`/study` when the response is the daily reminder.

- Read the *installed* (`~57.0.6`) `expo-notifications` API surface directly from
  `node_modules/expo-notifications/build` / `src` rather than from memory (AGENTS.md §0). The current
  SDK's own doc comment on `useLastNotificationResponse` recommends exactly this hook as "the" way to
  catch both a tap while running and a cold start caused by one, in a single place — so this is the
  currently-idiomatic pattern, not `addNotificationResponseReceivedListener` directly (which the hook
  wraps, with dedup logic against double-handling the same response).
- `src/lib/reminders.ts`: exported the previously-private `CATEGORY` constant as
  `REMINDER_NOTIFICATION_ID` (renamed for clarity at the call site) so the tap handler in `_layout.tsx`
  can identify "this is the daily reminder" rather than assuming every notification response should be
  routed the same way. Confirmed via the installed type defs that the `identifier` passed to
  `scheduleNotificationAsync` becomes `response.notification.request.identifier` on the delivered/
  tapped notification, so the equality check is sound.
- `src/app/_layout.tsx`: added the hook plus a `useEffect` that calls `router.push("/study")` when
  `notificationResponse?.notification.request.identifier === REMINDER_NOTIFICATION_ID`. Chose `/study`
  (the Study tab dashboard) over a specific lesson because the reminder is a general "time to study"
  prompt with no set attached — matches the existing `router.push("/study")` used elsewhere in the app
  for the same "go study something" intent (e.g. the Notification Centre's own empty-state action).
- **Not independently verified on device/simulator** (forbidden — `xcrun` is off-limits for this
  role, and I was told not to start the app). What I can state as `VERIFIED` from source: the
  identifier round-trips through the installed SDK's own type declarations, and both `tsc` and `lint`
  are clean. What would need a device check: that a background→tap→cold-start actually lands on
  `/study` rather than racing the `(app)` auth guard or the `index.tsx` entry fork on a genuinely cold
  launch. `INFERRED`, not `VERIFIED` — flagging for whoever next has simulator access.

## 7. `nextSetId` wraps into the wrong year / loops to set one

**Root cause, confirmed by reading `STUDY_SETS`'s authored order in full:** the array is Reception →
Y1 → Y2 → Y4 → Y5 → Y6 (Y3 is `CORE_SETS`, spliced in at the very front), followed by a "Subject Hub
shelf" of six sets that are **all** authored Year 3 — History, Computing, Art, Music, Languages and
Religious Education only ever got one example set each (see the shelf's own comment in `study.ts`,
right above `y3-roman-britain`). The old `nextSetId` was `STUDY_SETS[(idx + 1) % STUDY_SETS.length]`
— pure array-position walking with no awareness of year at all. Two distinct failure modes fall out of
that:

- A child of **any** year who reaches a subject hub with no dedicated content for their year (e.g. a
  Year 4 child opening the History hub) studies `y3-roman-britain` — the only History set that exists,
  and it's authored Year 3. `nextSetId` then keeps walking forward through the *rest* of that Year 3
  block (`y3-algorithms`, `y3-colour-mixing`, `y3-pulse-rhythm`, `y3-french-greetings`,
  `y3-festivals`) with nothing pulling the child back to Year 4. This is the mechanism behind the
  device observation "Year 4 child sent into Year 3 content."
- Reaching the literal last array entry (`y3-festivals`) wrapped `% STUDY_SETS.length` straight back to
  index 0 (`place-value`) regardless of relevance — the "silently looping to set one" the brief named.

**Fix implemented** (`src/lib/study.ts`, `nextSetId` only):

```ts
export function nextSetId(afterId: string, yearCode?: string): string {
  const anchor = getStudySet(afterId)
  const targetYear = yearCode ?? anchor?.yearCode
  const pool = targetYear ? STUDY_SETS.filter((s) => s.yearCode === targetYear) : STUDY_SETS
  const idx = pool.findIndex((s) => s.id === afterId)
  if (idx === -1) return pool[0]?.id ?? STUDY_SETS[0]?.id ?? afterId
  return pool[idx + 1]?.id ?? afterId
}
```

- Signature is backward-compatible: `yearCode` is optional and last, so the two existing call sites
  compile and behave unchanged in shape (still get back a plain `string`, never `null`/`undefined` —
  required, since both callers pass the result straight into
  `router.replace({ pathname: "/lesson/[id]", params: { id: nextId } })` with no null check).
- **Without `yearCode`** (today's actual callers — see below), the function now derives the target
  year from `afterId`'s *own* authored year (`anchor?.yearCode`) and walks only within that year. This
  fixes the "loops to set one" bug unconditionally, and fixes the cross-year-regression bug for every
  case *except* the subject-hub one specifically — because in that case the derived year (the SET's
  authored year, Y3) and the child's real year (Y4) differ, and the function has no way to know the
  latter without being told.
- **With `yearCode`** passed explicitly, the subject-hub case is also fixed: the pool is filtered to
  the child's real year from the start, so a Year 3-authored subject-hub set is never on the path.
- End-of-sequence behavior: reaching the last set in the pool returns `afterId` itself (the same set)
  rather than wrapping to anything else. This is the most honest thing achievable without editing the
  two caller screens — both unconditionally render a "Next set" / "Start next set" button and push
  its result straight to `/lesson/[id]`, so the return type has to stay a real, existing set id.
  Repeating the current set is a "there's nothing further yet" signal a parent can act on (they know
  they just did it); silently wrapping to unrelated content is not. A follow-up that actually shows
  "you've completed everything for now" would need to change `result/[id].tsx` /
  `congratulations/[id].tsx` to check `nextId === set.id` and swap the button's label/destination —
  out of scope here since I cannot edit those files.

### What `result/[id].tsx:53` and `congratulations/[id].tsx:88` should now pass

Both currently call `nextSetId(set.id)`. Both already have the studying child in scope (`children`,
`useStudyingChildId()`). They should change to:

```ts
const child = children.find((c) => c.id === childId) ?? children[0]
const nextId = nextSetId(set.id, child?.yearGroup)
```

(`congratulations/[id].tsx` already computes almost this exact `child` lookup one line below the
`nextSetId` call for the child's name — the two could share one lookup when this is applied.)

This closes the residual gap: without it, a Year 4 child who studies a Subject Hub's Year-3-authored
set will still get walked through the rest of that Year 3 block (no further regression than that,
since the within-year clamp is now unconditional — but not yet corrected back to Year 4 either). I did
not make this change myself because both files are explicitly out of my edit scope for this task.

## Verification

- `npx tsc --noEmit` — clean (exit 0), run after all 7 items were applied.
- `npm run lint` (`expo lint`) — clean (exit 0), run after all 7 items were applied.
- Screen rendering on simulator/device — **not verified**; `xcrun`/simulator access is outside this
  role's permitted commands and I was told not to start the dev server. Everything above marked
  `INFERRED` rather than `VERIFIED` should be treated as needing a device pass before sign-off,
  particularly item 6 (notification-tap routing) and the visual result of items 1–4 (removed/rewired
  controls, corrected copy).
