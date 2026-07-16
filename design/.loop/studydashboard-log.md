# Study Dashboard — build log

Target: `design/GoKid-studydashboard-screen.png` (screen 5, "Home / Study Sets").
Route: `src/app/(app)/(tabs)/study.tsx` (new **native-tabs** group).

## Structure decision
Screen 5 carries a bottom tab bar (Study · Progress · Parent), so it lives in a new
`(app)/(tabs)/` group whose `_layout.tsx` renders `NativeTabs` from
`expo-router/unstable-native-tabs` (AGENTS.md §2: native tabs only). Who's-studying + add-child
stay in the parent Stack; tapping a child pushes `/study` (the tab navigator), back returns.
`progress.tsx` / `parent.tsx` are placeholder tab destinations (later screens).

## Tokens extracted (before pixels) — `src/design/tokens.js`
Sampled from the reference (853×1844); design-system PNG doesn't define these:
- `study.wash` `#DBEDE9` — "Continue" card mint (a soft top→bottom gradient in the ref, flattened;
  no gradient lib installed).
- `study.teal` `#017880` — "Carry on" button + progress fill (deeper than design `primary` #0E7C7B).
- `study.track` `#A9D2CD` — progress-bar track on the mint card.
- `study.lesson` `#FFFFFF` — lesson card fill.
- `status.getting` `#55A158` (green "Getting it"), `status.learning` `#F79D0E` (amber "Learning").
  Near design `success`/`accent` but sampled distinct.
- Cube illustration size `w-cube`/`h-cube` = 132×106 (crop aspect 346×277) — inferred.

## Assets (cropped from the reference, per the whoisstudying precedent)
None existed in-repo. Cropped straight off `GoKid-studydashboard-screen.png`:
- `gokid-cube-stack.png` (base-ten blocks, tight-cropped to the cubes so the card wash seams in)
- `gokid-subject-globe.png` / `-mountain.png` / `-skeleton.png` (64→52pt lesson thumbnails)
- `gokid-child-amara-face.png` (the reference greeting avatar) — **now unused**: greeting shows the
  real child's `ChildAvatar` instead (see "Real child" below).

## Iterations
### 1 (`studydashboard-1.png`)
Full layout up on first render; native tabs showed correctly. Diffs: (a) "Place Value to 1,000"
wrapped to **3** lines (ref = 2) — left column too narrow; (b) lesson thumbnails 64pt too big →
titles + subtitles wrapped (ref = 1 line each); (c) status pills bulky.

### 2 (`studydashboard-2.png`)
Thumbnails 64→52 (`w-13`), pills `px-4 py-2`→`px-3 py-1`, gap `ml-4`→`ml-3`, lesson title→`body`
w/ `numberOfLines={1}`, cube 162→150. Lesson row now matches. Continue title still 3 lines.

### 3 (`studydashboard-3.png`)
Measured the reference title (2 lines, cube left edge ~51%). Cube 150→132 gave the left column
enough room — title now wraps **"Place Value" / "to 1,000"**, matching. Also wired **real child**
(this iteration): tap on who's-studying passes `id`; study looks the child up via `useChildren`
and renders real name / `yearLabel` / `ChildAvatar` ("Morning, Gideon · Year 6", fox). Lessons +
term stay demo (brief: "every info of the child is a demo").

### 4 (`studydashboard-4.png`) — stop
Re-cropped the cube tight (kills the wash rectangle), fixed its aspect (`h-cube` 120→106), and
vertically centered it against the title (`items-start`→`items-center`). Indistinguishable from the
reference at a glance; all three lesson cards render.

## Still differs (can't fix from screen code / intentional)
1. **Heading face** — design is SF Pro Rounded; app renders SF Pro. `@expo/ui` `Host` (only route to
   the rounded face) crashes this SDK 57 dev client; `RoundedHeading` degrades project-wide. Same
   limitation logged on every prior screen.
2. **Title bar** — shows "Study Sets"; the reference's "5. Home /" prefix is a mockup screen-number
   annotation (cf. "4. Who's Studying?"), dropped like on who's-studying.
3. **Tab bar** — iOS 26 renders `NativeTabs` as the floating "liquid glass" bar; the reference draws
   a flat bar with a top divider. Native rendering, not stylable from JS here.
4. **Greeting** — real child (Gideon / Year 6 / fox) per the user's "use the real child info"
   instruction, so it differs from the reference's demo Amara / Year 3.
5. **Globe card subtitle** truncates ("…place v…") at one line where the reference fits it fully; the
   "Getting it" pill is wider than the subtitle's slack. Minor.

## Inferred (not read from a design system)
Colors `study.*` / `status.*`; cube size 132×106; thumbnail 52pt; pill padding; lesson title `body`;
the four cropped illustrations; demo lessons (Place Value / Capital Cities / Human Skeleton) and the
"Autumn term" label.

## Wiring ("connect the screens in order")
who's-studying (`home.tsx`) child card `onPress` → `router.push({pathname:"/study", params:{id}})`
→ study dashboard (tabs). Verified rendering via deep-link `gokid://study` + `tsc`/`lint` clean.
"Carry on" and the lesson cards are no-ops until the lesson-detail + flashcard screens land next.

## Round 2 — goal follow-up (title, greeting, bell, demo material, parent back-nav)
- **"Study Sets" title removed.** Header is now a chevron-left (top-left) + bell (top-right) row.
- **Time-of-day greeting** (`src/lib/greeting.ts`): `new Date().getHours()` → Morning/Afternoon/Evening
  off the device LOCAL clock, so it reads correctly in any country/timezone. Verified "Evening" at 20:26.
- **Bell works** → pushes `/notifications` (`(app)/notifications.tsx`, demo feed: badge/reminder/new-set).
  A red badge dot sits on the bell.
- **Complete demo study material** (`src/lib/study.ts`): 3 sets (Place Value / Capital Cities / Human
  Skeleton) each with real flashcards, mastery split, card counts, minutes. Drives the whole flow.
- **New screens:** set detail `(app)/lesson/[id].tsx` (screen 6 — hero, blurb, meta, 3-part mastery bar,
  Study cards / Take the quiz) and flashcard runner `(app)/flashcard/[id].tsx` (screen 7 — segmented
  progress, tap-to-flip Q↔A, Tricky/Got it advance, ✕ dismiss; back on last card). Both matched to their
  reference PNGs. New crops: `gokid-set-placevalue-hero.png`, `gokid-flashcard-skeleton.png`.
- **Parent back-navigation:** dashboard chevron-left → `router.back()` = "Who's studying?" to switch child.
  Every pushed screen (lesson, flashcard, notifications) has its own back/✕.
- **No inline styles** despite dynamic bars: dashboard progress = static `w-[60%]`; mastery = a literal
  `w-[N%]` map NativeWind can scan; flashcard progress = `flex-1` segmented cells.
- Wiring: lesson card / Carry on → `/lesson/[id]` → Study cards → `/flashcard/[id]`. tsc + lint clean;
  all four screens verified rendering on the sim via deep-link.
