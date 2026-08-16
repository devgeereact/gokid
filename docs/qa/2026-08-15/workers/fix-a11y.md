# fix-a11y — accessibility fixes for F1-F9 (static-honesty.md, 2026-08-14)

Worker: fix-a11y · 2026-08-15 · Fix task, not an audit.

Scope: 6 files only (per orchestrator's file lock — three other agents were editing the rest of the
repo concurrently):

- `src/app/(app)/add-child.tsx`
- `src/app/(app)/search.tsx`
- `src/app/(app)/curriculum.tsx`
- `src/app/(app)/(tabs)/progress/calendar.tsx`
- `src/app/(app)/(parent)/parent-analytics.tsx`
- `src/components/child-avatar.tsx`

No visual/layout change in any file — every edit is an accessibility prop, an import, or a comment.
`npx tsc --noEmit` and `npm run lint` both clean after all edits (see "Verification" at the bottom).

---

## What was fixed

### F1 — preset-avatar picker has no accessible name (`add-child.tsx:167`)

Added a `PRESET_LABELS` map (`fox`/`elephant`/`lion` → `"Fox picture"` / `"Elephant picture"` /
`"Lion picture"`) and set `accessibilityLabel={PRESET_LABELS[key]}` on each preset `Pressable` in
`AvatarSheet`. Per the brief, the label lives on the `Pressable`, not the `<Image>` — the image inside
is now explicitly marked decorative (see the `child-avatar.tsx` section below), so there's no
double-announcement.

- Before: 0 of 3 preset-picker `Pressable`s had an `accessibilityLabel`.
- After: 3 of 3.

### F2 — emoji avatar options have no label (`add-child.tsx:184`)

Added an `EMOJI_LABELS` map (glyph → English name, e.g. `🐻` → `"Bear picture"`) and set
`accessibilityLabel={EMOJI_LABELS[glyph]}` on each emoji `Pressable`. The raw glyph `<Text>` inside is
now `accessible={false}` so VoiceOver reads the spoken name once, not the name followed by the glyph's
own (inconsistent, iOS-version-dependent) pronunciation.

- Before: 0 of 10 emoji `Pressable`s had an `accessibilityLabel`.
- After: 10 of 10.

### F3 — year-group selector announces "Y3" literally (`add-child.tsx:442`)

Imported the existing `yearLabel()` helper from `src/lib/children.ts` (already used the same way in
`progress/calendar.tsx` and `parent-analytics.tsx` — did not reimplement it) and added
`accessibilityLabel={yearLabel(year)}` to each year-group `Pressable`. Visible text is untouched
("Rec"/"Y1"…"Y6"); VoiceOver now says "Reception" / "Year 1" … "Year 6".

- Before: 0 of 7 year-group `Pressable`s had an `accessibilityLabel`.
- After: 7 of 7.

### F4 — modal backdrop / stop-propagation wrappers are unlabelled interactive elements (`add-child.tsx:78,80,154,155`)

Per the brief, did not invent labels for these — they aren't real discrete controls, they're a
tap-outside-to-dismiss layer and a tap-swallower. Set `accessible={false}` on all four (the two
backdrop `Pressable`s in `PickerSheet` and `AvatarSheet`, and the two body-wrapper `Pressable`s that
call `event.stopPropagation()`). This removes them as individual VoiceOver focus stops while leaving
every real control inside the sheet (options, buttons) individually reachable — `accessible={false}`
on a container does not hide its descendants, only the container's own accessibility node. Verified
this is the correct semantics (as opposed to `accessibilityElementsHidden`, which would have hidden
the whole sheet's real content too).

- Before: 0 of 4 marked either way (silently announced as an unlabeled "button" stop).
- After: 4 of 4 marked `accessible={false}`.

### F9 — 8 touch targets under 44pt with no `hitSlop`

Followed the existing repo convention exactly rather than resizing anything: `h-9`/`w-9` (36px)
controls elsewhere in the app (`offline.tsx:114`, `study/index.tsx:100`, `bookmarks.tsx:57`) all use
`hitSlop={6}`, so every fix here uses the same value.

| File | Control | Before | After |
|---|---|---|---|
| `search.tsx:86` ("All" subject chip, h-9) | no `hitSlop` | `hitSlop={6}` |
| `search.tsx:103` (per-subject chips, h-9) | no `hitSlop` | `hitSlop={6}` |
| `curriculum.tsx:108` (year-picker segments, h-9) | no `hitSlop` | `hitSlop={6}` |
| `progress/calendar.tsx:298` (period switch, h-9) | no `hitSlop` | `hitSlop={6}` |
| `progress/calendar.tsx:334` (Previous chevron, h-9×w-9) | no `hitSlop` | `hitSlop={6}` |
| `progress/calendar.tsx:343` (Next chevron, h-9×w-9) | no `hitSlop` | `hitSlop={6}` |
| `parent-analytics.tsx:315` (period switch, h-10=40px) | no `hitSlop` | `hitSlop={6}` |

`h-9`+`hitSlop={6}` → 48px effective target; `h-10`+`hitSlop={6}` → 52px. Both clear Apple HIG's 44pt
minimum with margin. Did not touch layout (`className` heights/widths are unchanged everywhere) —
`hitSlop` only expands the invisible touch-response area, not anything rendered.

### F7 (images in the files I own) / task 6

Marked every image in scope that is genuinely decorative — i.e. duplicative of a label the containing
control (or an adjacent `<Text>`) already carries — as `accessible={false}`. Did not add a label to
any image; none of the images in these 6 files carry unique information a sibling label doesn't
already state (unlike F6's quiz illustrations, which are a different file, out of scope here).

| File:line | Image | Why decorative |
|---|---|---|
| `search.tsx:132` (`ResultRow` thumbnail) | Set thumbnail | Row `Pressable` already carries `` `${set.title}. ${set.subject}. ${set.yearGroup}.` `` |
| `curriculum.tsx:158` (`SetRow` thumbnail) | Set thumbnail | Row `Pressable` already carries `` `${set.title}, ${set.subject}, ${set.cardsTotal} cards, ${set.statusLabel}` `` |
| `child-avatar.tsx:77` (image-kind avatar) | Uploaded photo | Every call site (`home.tsx`, `study/index.tsx`, `progress/overview.tsx`, `children.tsx`, `parent-content.tsx`, `child/[id].tsx`, `parent-analytics.tsx`, `add-child.tsx`, `progress/calendar.tsx`, `study/session-summary/[id].tsx`) pairs `ChildAvatar` with an adjacent name `<Text>`, or (in `add-child.tsx`'s `AvatarSheet`, after the F1/F2 fixes) a `Pressable` that now has its own `accessibilityLabel` — checked all 10 call sites before marking this decorative, not assumed |
| `child-avatar.tsx:87` (emoji-kind avatar, when rendering the *chosen* avatar, not the picker) | Emoji glyph | Same reasoning — always adjacent to a name |
| `child-avatar.tsx:90` (preset-kind avatar) | Preset illustration | Same reasoning |

`progress/calendar.tsx` and `parent-analytics.tsx` have no raw `<Image>` of their own — both use only
`ChildAvatar` (fixed at the source, in `child-avatar.tsx`) and `SymbolView` icons (SF Symbols, not user
content, out of the "images" finding's scope).

---

## Deferred — explicitly out of scope, do not fix here

**F8 — `text-tile` (11px), below the design system's own 13px Caption floor.** Confirmed present on
`progress/calendar.tsx` (5 sites: `StatTile` label, `DayStat` label ×2 contexts, week-grid minute
labels, month-label column in `YearGrid`, `Legend` "Less"/"More"). The fix would be a token change in
`tailwind.config.js`, which is shared by every screen using `text-tile` and explicitly out of my file
lock: `certificate/[id].tsx`, `quiz/instructions/[id].tsx`, `quiz/review/[id].tsx`,
`flashcard/paused.tsx` are not files I own. **Did not touch.** Flagging for whoever owns
`tailwind.config.js` / the design-system token set.

**F5 — 14 cosmetically-unlabelled Pressables with descriptive nested `<Text>`.** One of the 14 sites
is in a file I own: `add-child.tsx:92` (originally; the `PickerSheet` option row — each month/year
choice, e.g. "March" or "2019") has no explicit `accessibilityLabel`, only a nested `<Text>{option}</Text>`.
Per the static audit's own classification this is cosmetic, not functional (VoiceOver reads the nested
text fine), and it was **not** in the fix task's instructed item list (items 1-4 for this file cover
only lines 167, 184, 442 and 78/80/154/155) — left untouched deliberately, not fixed. The other 13
sites cited by F5 (`sign-in.tsx`, `intro.tsx`, `(parent)/delete-account.tsx`,
`components/report-card-sheet.tsx`) are outside my file lock.

**F6 — quiz illustration images with no alt text (`quiz/[id].tsx:113`).** Different file, out of scope,
and a genuinely different fix (needs a per-question alt-text field added to `lib/study.ts`'s question
shape, not a one-line prop).

**F7's other 22 sites app-wide** (`bookmarks.tsx`, `result/[id].tsx`, `study/index.tsx`,
`study/set-result/[id].tsx`, `study/congratulations/[id].tsx`, `study/session/[id].tsx`,
`progress/index.tsx`, `subject/[subject].tsx`, `quiz/instructions/[id].tsx`, `download/[id].tsx`,
`lesson/[id].tsx`, `(parent)/paywall.tsx`, `(parent)/parent-content.tsx`, `components/card-zoom.tsx`,
`components/subject-mark.tsx`) — outside my file lock. `child-avatar.tsx` was fixed at the source
(shared component), so its usages across all those files inherit the fix automatically; the raw
`<Image>` elements native to those files themselves were not touched.

---

## Before/after label & marking count, by file

| File | `accessibilityLabel` added | `accessible={false}` (decorative) added | `hitSlop` added |
|---|---|---|---|
| `add-child.tsx` | +20 (3 preset + 10 emoji + 7 year-group) | +5 (4 modal wrappers + 1 emoji glyph) | 0 (all sub-44pt controls here already had `hitSlop`, e.g. card-colour swatches at `hitSlop={6}`) |
| `search.tsx` | 0 (already fully labelled) | +1 (result-row thumbnail) | +2 sites ("All" chip, per-subject chip) |
| `curriculum.tsx` | 0 (already fully labelled) | +1 (set-row thumbnail) | +1 site (year-picker segment) |
| `progress/calendar.tsx` | 0 (already fully labelled) | 0 (no raw `<Image>`; avatar fixed via `child-avatar.tsx`) | +3 sites (period switch, prev chevron, next chevron) |
| `parent-analytics.tsx` | 0 (already fully labelled) | 0 (no raw `<Image>`; avatar fixed via `child-avatar.tsx`) | +1 site (period switch) |
| `child-avatar.tsx` | 0 | +3 (image-avatar, emoji-avatar, preset-avatar render branches — propagates to all 10 screens that use `ChildAvatar`) | 0 (not a touch-target file — no `Pressable`s here) |

**Totals across the 6 files:** +20 `accessibilityLabel` additions, +10 explicit `accessible={false}`
(decorative/non-control) markings, +7 `hitSlop` additions on previously-unpadded sub-44pt controls.

---

## Verification

```
npx tsc --noEmit    → clean, no output, exit 0
npm run lint        → "expo lint" clean, exit 0
```

Not run/not testable from here (no simulator, no device — static fix task): actual VoiceOver focus
order, whether the spoken labels read naturally in sequence, and whether the `hitSlop` values produce
the expected 44pt+ effective target on-device. All four flow from `Pressable`'s documented `hitSlop`
behavior and match sizes already shipping elsewhere in the app, but that is an inference, not a
device-verified claim — flag for `qa-device` to confirm with VoiceOver on a real simulator/device.

## Files changed

- `/Users/mrgee/WebstormProjects/gokid/src/app/(app)/add-child.tsx`
- `/Users/mrgee/WebstormProjects/gokid/src/app/(app)/search.tsx`
- `/Users/mrgee/WebstormProjects/gokid/src/app/(app)/curriculum.tsx`
- `/Users/mrgee/WebstormProjects/gokid/src/app/(app)/(tabs)/progress/calendar.tsx`
- `/Users/mrgee/WebstormProjects/gokid/src/app/(app)/(parent)/parent-analytics.tsx`
- `/Users/mrgee/WebstormProjects/gokid/src/components/child-avatar.tsx`
