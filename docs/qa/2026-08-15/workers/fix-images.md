# fix-images — F7 accessibility marking for `<Image>` (2026-08-15)

Task: finish marking every remaining unlabeled `<Image>` in `src/app` / `src/components` as
either decorative (`accessible={false}`) or informative (`accessibilityLabel`), per
`docs/qa/2026-08-14/workers/static-honesty.md` F7. Scope excluded `src/app/api/**`,
`src/db/**`, the `Illustration` component in `src/app/(app)/quiz/[id].tsx`, and six files
already fixed in a previous pass (`child-avatar.tsx`, `add-child.tsx`, `search.tsx`,
`curriculum.tsx`, `progress/calendar.tsx`, `parent-analytics.tsx`).

## Counts

- **Before:** 24 of 31 app-wide `<Image>` usages carried neither `accessibilityLabel` nor a
  decorative marking (per F7's own count).
- **After:** 0 of 31. Verified by parsing every `<Image` opening tag (balanced-brace scan to
  its closing `>`) across `src/app/**/*.tsx` and `src/components/**/*.tsx` and checking for
  `accessibilityLabel`, `accessible={false}`, or `accessibilityElementsHidden` inside the tag.
- 20 images touched in this pass (all marked decorative — see reasoning below). The
  remaining 11 of the 31 already carried a real `accessibilityLabel` from the earlier pass and
  needed no change (listed under "Left alone" below).

All 20 edits are a single added prop, `accessible={false}`, on the existing `<Image>` tag.
Nothing else in any touched file was changed — confirmed by `git diff` on each file (see
below), and no `className`/layout prop was touched.

## Table — images touched this pass

| file:line | classification | label | reason |
|---|---|---|---|
| `src/app/(app)/bookmarks.tsx:39` | decorative | — | Subject-art thumbnail inside a `Pressable` already carrying `accessibilityLabel={set.title}`; the row's text (title, subject, topic) names the same set. |
| `src/app/(app)/(tabs)/study/index.tsx:78` | decorative | — | `LessonCard` thumbnail; parent `Pressable` already has `accessibilityLabel={set.title + status}`. |
| `src/app/(app)/(tabs)/study/index.tsx:132` | decorative | — | `ShelfCard` thumbnail; parent `Pressable` already has `accessibilityLabel={set.title + caption}`. |
| `src/app/(app)/(tabs)/study/index.tsx:328` | decorative | — | "Continue" card cube-stack illustration; the card's title/progress text is the informative content, the art is a generic subject motif reused across sets. |
| `src/app/(app)/(tabs)/study/set-result/[id].tsx:131` | decorative | — | Summary-card hero (`set.hero`); adjacent text (`set.title`, cards/subject/year line) already names the set. Same `set.hero` asset also used on lesson-detail and download screens as decoration. |
| `src/app/(app)/(tabs)/study/congratulations/[id].tsx:162` | decorative | — | Celebration hero (`gokid-result-child.png`), a generic congratulatory illustration reused across the score-result and congratulations screens — not specific to this child or set; adjacent text carries the actual message ("Congratulations, {name}!… completed {set.title}"). |
| `src/app/(app)/(tabs)/study/congratulations/[id].tsx:233` | decorative | — | "What to try next" mountain illustration; adjacent text ("You're ready for more!" + body) states the same idea in words. |
| `src/app/(app)/(tabs)/study/session/[id].tsx:128` | decorative | — | Set-summary thumbnail (`set.hero`) beside `set.title` and card-count text. |
| `src/app/(app)/(tabs)/progress/index.tsx:257` | decorative | — | "Coming back soon" row art; row is a `Pressable` already labelled `` `${c.title} — ${c.sub}` ``. |
| `src/app/(app)/subject/[subject].tsx:163` | decorative | — | `SetCard` thumbnail (`set.thumb`); parent `Pressable` already has `accessibilityLabel={set.title, yearGroup, cardsTotal}`. |
| `src/app/(app)/lesson/[id].tsx:53` | decorative | — | `RelatedCard` thumbnail; parent `Pressable` already has `accessibilityLabel={set.title + reason}`. |
| `src/app/(app)/lesson/[id].tsx:107` | decorative | — | Set-detail hero (`set.hero`). `set.hero` is subject-level stock art (see `lib/study.ts:130`, "Large illustration (set-detail hero + flashcard face)"), not a diagram specific to this set's content; `set.title` and `set.description` immediately below convey the actual information. Flagged as an ambiguous case in F7 — resolved decorative per the "adjacent text already conveys it" rule, since this is the same generic per-subject asset shown decoratively everywhere else in the app. |
| `src/app/(app)/flashcard/[id].tsx:253` | decorative | — | Flashcard face art is `set.hero` — the *same single asset repeated for every card in the set*, not a per-card diagram (`lib/study.ts` has no per-flashcard `illustration` field; that only exists on quiz questions, handled by the already-fixed `Illustration` component). It sits opposite `card.question`, which is the actual prompt text. |
| `src/app/(app)/download/[id].tsx:112` | decorative | — | Set summary card hero (`set.hero`); `set.title`, cards count and description sit beside it. |
| `src/app/(app)/quiz/instructions/[id].tsx:101` | decorative | — | Pre-quiz hero (`brief.illustration`) is either `set.hero` or the shared quiz-blocks art with no `illustrationAlt` plumbed through to this screen; it is a decorative preview before the quiz starts, not a question being asked about the picture (that happens later, per-question, in the already-fixed `Illustration` component). |
| `src/app/(app)/(parent)/paywall.tsx:86` | decorative | — | Full-bleed hero art behind the headline ("Keep the sets coming."); atmospheric background image, not informational content. |
| `src/components/card-zoom.tsx:51` | decorative | — | Reusable zoom modal; its only caller (`flashcard/[id].tsx`) always passes the same `set.hero` shown decoratively on the card face it zoomed from, with `caption` (the actual question text) rendered as a separate on-screen `Text` right below. Labelling the zoomed copy would just re-announce the on-screen caption via a different route. |
| `src/app/(app)/(parent)/parent-content.tsx:42` | decorative | — | `CurriculumCard` subject art; `subject` name `Text` sits right beside it. |
| `src/components/subject-mark.tsx:48` | decorative | — | Shared `SubjectMark` component. Checked every call site (`offline.tsx`, `study/index.tsx`, `progress/journey.tsx`, `progress/index.tsx`, `subject/[subject].tsx`, `progress/subject/[subject].tsx`, `progress/overview.tsx`) — every one places it beside a `Text` naming the same subject, or inside a `Pressable`/row that already carries an `accessibilityLabel` including the subject name. Fixing it once in the shared component covers all 7 call sites. |
| `src/app/(app)/result/[id].tsx:70` | decorative | — | Same celebratory child illustration as congratulations; the score ring and "Nice one, {childName}" text carry the actual information, the art is generic. |

## Left alone — already correctly marked, no change made

These 11 already had a real `accessibilityLabel` (or, for `child-avatar.tsx`/`search.tsx`/
`curriculum.tsx`, `accessible={false}` with a documented rationale) from the earlier pass, and
were confirmed correct rather than touched:

| file:line | why it was left alone |
|---|---|
| `src/app/intro.tsx:97` | `accessibilityLabel={slide.alt}` — per-slide alt text already authored. |
| `src/app/(app)/offline.tsx:56` | `accessibilityLabel="You're offline — everything's saved."` on the empty-state hero. |
| `src/app/(app)/welcome.tsx:57` | `accessibilityLabel="Two children sitting in the grass, reading a book together"`. |
| `src/app/(auth)/sign-in.tsx:89` | Same hero/label as `welcome.tsx`. |
| `src/components/splash.tsx:11,17` | Wordmark (`"GoKid"`) and lion (`"A friendly lion sitting in the grass"`) both labelled — this doubles as the auth-loading screen, so VoiceOver needs *something* announced while nothing else is on screen. |
| `src/app/(app)/quiz/[id].tsx:122` (`Illustration` component) | Out of scope by the task's explicit exclusion; already fixed — real `accessibilityLabel={alt ?? "Picture for this question. No description has been written for it yet."}`. |
| `src/app/(app)/search.tsx:138`, `src/app/(app)/curriculum.tsx:162` | Already `accessible={false}` from the previous pass; row text carries the set title. Re-checked, correct, unchanged. |
| `src/components/child-avatar.tsx:82,98` | Already `accessible={false}` with a documented rationale (every caller pairs it with the child's name text or a labelled `Pressable`). Re-checked, correct, unchanged (file is in the do-not-modify list regardless). |
| `src/app/(app)/add-child.tsx` (F1 preset picker) | F1's specific complaint — preset `Pressable`s with no `accessibilityLabel` — is **FIXED**: `PRESET_LABELS` now supplies `accessibilityLabel={PRESET_LABELS[key]}` per preset at line 201, wrapping the (correctly decorative) `ChildAvatar`. Re-checked per instructions, not modified (in the do-not-modify list). |
| `src/app/(app)/(tabs)/progress/calendar.tsx`, `src/app/(app)/(parent)/parent-analytics.tsx` | Re-checked per instructions: neither file contains an `<Image>` at all. No F7 exposure here to begin with. |

## Notes on judgment calls

- **The most defensible "should this be informative?" case was `lesson/[id].tsx:107`** (the
  set-detail hero) and, by extension, the same `set.hero` asset reused on `flashcard/[id].tsx`,
  `download/[id].tsx`, `set-result/[id].tsx` and `session/[id].tsx`. F7 itself flagged the
  lesson-detail hero as a "risk" case with no sibling label. I resolved it decorative after
  checking `lib/study.ts`: `hero` is one asset per *set*, shared verbatim across every
  card/screen for that set (comment at `lib/study.ts:130`: "Large illustration (set-detail hero
  + flashcard face)"), not a diagram specific to a question or card. It never varies with
  `card.question`, so it cannot be carrying question-specific information a screen reader user
  needs — the title/description text next to it is the actual content. Per-question diagrams
  that *do* carry unique meaning (the base-10 blocks illustration on specific MCQs) are handled
  separately by the already-fixed `Illustration` component with real `illustrationAlt` text.
- **`card-zoom.tsx`** deserves a second mention: `design/gokid-screens.md` §6's own framing
  ("a diagram of the skeleton, a place-value block arrangement") suggests the zoomed picture
  could be content-bearing. In the code as it actually ships today, `CardZoom` has exactly one
  caller and it always passes the set's generic `hero`, with the real per-card text supplied
  separately as `caption`. If a future change wires `CardZoom` to show a genuine per-question
  diagram (matching the design doc's aspiration), that call site should pass `illustrationAlt`
  through as an `accessibilityLabel` at that point — decorative is the right call for what is
  actually shipping today, not a permanent verdict on the component.
- I did **not** invent labels for any of the 20 — every one sits beside text (a title,
  subject name, or descriptive line) that already says what the picture would, or is a
  generic/repeated asset carrying no set-specific meaning. No image needed a description
  written from scratch.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` (`expo lint`) — clean, no errors.
- `npm run check:content` (`check:strands` + `check:bias`) — exits 0 (27 sets/10 subjects,
  0 unmatched; 27 quizzes, 0 biased).
- Every touched file's diff (`git diff -- <file>`) inspected individually: each is exactly one
  added line/prop, `accessible={false}`, with no other change — confirming no visual regression
  is possible from this pass.
- Programmatic re-scan of all `<Image` tags under `src/app/**/*.tsx` and
  `src/components/**/*.tsx` (balanced-brace tag parse, not a naive grep) confirms 31 total,
  0 now missing a decorative marking or an `accessibilityLabel`.

## Files touched (20)

```
src/app/(app)/bookmarks.tsx
src/app/(app)/(tabs)/study/index.tsx
src/app/(app)/(tabs)/study/set-result/[id].tsx
src/app/(app)/(tabs)/study/congratulations/[id].tsx
src/app/(app)/(tabs)/study/session/[id].tsx
src/app/(app)/(tabs)/progress/index.tsx
src/app/(app)/subject/[subject].tsx
src/app/(app)/lesson/[id].tsx
src/app/(app)/flashcard/[id].tsx
src/app/(app)/download/[id].tsx
src/app/(app)/quiz/instructions/[id].tsx
src/app/(app)/(parent)/paywall.tsx
src/components/card-zoom.tsx
src/app/(app)/(parent)/parent-content.tsx
src/components/subject-mark.tsx
src/app/(app)/result/[id].tsx
```

(16 files, 20 `<Image>` tags — `study/index.tsx`, `congratulations/[id].tsx` and
`lesson/[id].tsx` each had two.)
