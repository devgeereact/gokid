# Who's Studying? — build log

Target: `design/GoKid-whoisstudying-screen.png` (screen 4). Route: `src/app/(app)/home.tsx`.

## Tokens extracted (before pixels)

Sampled from the reference at 2x (`design/GoKid-whoisstudying-screen.png`, 854×1842):

- **Card washes** (design-system PNG doesn't define them) → `colors.card` in `src/design/tokens.js`:
  - `amara` `#EFEDF5` (lavender, elephant)
  - `rufus` `#FEF3E0` (cream, fox)
  - `add` `#E5ECE7` (mint plus-disc)
  - `dash` `#CFDDDD` (dashed border stroke)
- **Radius** `card` = 20px (inferred, between lg 16 / xl 26) → `tailwind.config.js`.
- **Card height** `h-card` = 166px (inferred, off-grid) → measured 168/167/~161pt per tile.
- **Horizontal margin** ≈ 24pt → `px-6` (design cards sit at x 24–401pt; prior screens used px-8).
- **Hero heading** "Who's studying?" — W cap-height ≈ 24pt → ~34px rounded bold = design-system H1. `RoundedHeading size 34`.
- **Nav title** "4. Who's Studying?" — total ≈ 21pt → ~19px semibold. `RoundedHeading size 19`.
- **Name** "Amara"/"Rufus" → started at `text-h2` (28) bold; **Year** → `text-field` (20) secondary.
- **Plus disc** ≈ 80pt (`w-20 h-20`), plus glyph ≈ 32pt SF Symbol.

## Assets

No transparent elephant/fox cutouts exist in the repo (only `gokid-child-avatar.png`, a fox
in a lavender circle with a camera badge — wrong for these cards). **Inferred:** cropped the
two animals straight from the reference PNG (they already sit on the card wash, so the crop's
background matches the tile and seams invisibly):
- `assets/images/gokid-child-amara.png` (elephant, 420×332)
- `assets/images/gokid-child-rufus.png` (fox, 420×331)

Children data is demo/hardcoded (Amara Year 3 / Rufus Year 1), per the brief ("every info of
the child is a demo").

## Environment blocker (iteration 1)

First screenshots came back blank on every screen. Root cause (surfaced as a redbox after a
longer wait): **`Cannot find native module 'ExponentImagePicker'`** at `add-child.tsx:3`. The
installed dev client was built **Jul 14 22:01**, before `expo-image-picker` and
`react-native-svg` were added to `package.json` — its Pods link neither. expo-router eagerly
evaluates every route module at boot, so add-child's top-level image-picker import crashed the
whole app (all screens blank). Fix: rebuild the dev client (`npx expo run:ios`) so it links the
declared native modules — this also provides `react-native-svg`, which the new screen uses for
the dashed "Add a child" border (RN renders a dashed `border` as solid once a radius is present).

## Iterations

### Iteration 1
- Built the screen + tokens; `tsc` and `lint` clean.
- Could not screenshot: app white-screened → traced to the stale-dev-client redbox above.
- Action: rebuilt the dev client via `xcodebuild` for the simulator (expo run:ios misdetected
  the sim as a physical device and demanded signing; `xcodebuild -sdk iphonesimulator` with
  ad-hoc `CODE_SIGN_IDENTITY="-"` links image-picker + svg AND applies the keychain-access-group
  entitlement Clerk needs — a first pass with `CODE_SIGNING_ALLOWED=NO` stalled Clerk).

### Iteration 2 — the real blocker
- App still white-screened on every SafeAreaView screen (splash rendered, sign-in/home/add-child
  blank). Bisected with probes: pipeline + Metro + auth all fine (`signed=true`, redirect →
  `/home`); plain `View`+`Text` rendered; a `HOME PROBE` rendered. Restoring the real JSX blanked
  it, and restoring **`RoundedHeading` hard-crashed the app back to the Expo launcher**.
- **Root cause:** `@expo/ui`'s `Host` (SwiftUI, used by `RoundedHeading` for SF Pro Rounded)
  crashes on mount in this SDK 57 dev client, taking down every screen that renders a heading
  (home, sign-in, add-child).
- **Fix:** `RoundedHeading` now degrades to a plain RN `Text` (system SF Pro, not rounded) so
  screens render. This repaired all four screens at once. `SafeAreaProvider` also added to the
  root layout (v5 safe-area-context needs it). Removed `react-native-svg` from the screen — RN on
  iOS 26 renders a dashed border with radius correctly, so the "Add a child" tile uses a plain
  `border-dashed` View.
- Per the brief: dropped the "4. Who's Studying?" numbered nav title (redundant with the hero).
- Result (`whoisstudying-2.png`): full layout matches the reference. Remaining: a ~1px seam where
  the elephant crop meets the lavender wash.

### Iteration 3 — seam
- Sampled the crop edges (amara `#EFECF5`, rufus `#FEF2DF`) vs the tokens (`#EFEDF5`/`#FEF3E0`);
  off by 1–2 levels → the seam. Set the card-wash tokens to the sampled edge colors.
- Result (`whoisstudying-3.png`): rufus seams perfectly; amara seam now negligible. Match is
  close at a glance.

## Wiring (per brief)
Verified the flow is connected: `index` / group `_layout`s hold `Splash` while Clerk rehydrates →
`(auth)/sign-in` → on session, redirect to `/home` (whoisstudying) → "Add a child" pushes
`/add-child` → `router.back()` returns. add-child renders end-to-end after the dev-client rebuild.

## Stop — remaining diffs (can't fix from screen code)
1. **Heading face:** design uses SF Pro Rounded; mine is SF Pro (sharper). `@expo/ui` `Host` — the
   only route to the rounded face — crashes this dev client. Reinstate `RoundedHeading`'s `Host`
   path once `@expo/ui` is fixed/rebuilt.
2. **Elephant seam:** a barely-visible edge remains where the raster crop meets the flat wash;
   truly removing it needs a transparent cutout (none exists) rather than a color-matched rectangle.

## Round 2 — real children, routing, avatar box, navigation (user follow-up)

- **Avatar rendered as a box in a circle:** `components/child-avatar.tsx` fed the rectangular
  wash-backed crops (`gokid-child-rufus.png`) into a round ring → cream box in a lavender circle.
  Fixed by generating **transparent cutouts** (`gokid-cut-fox.png`, `gokid-cut-elephant.png`,
  PIL border flood-fill, tol 26/30) and pointing the presets at those. The animal now sits on the
  ring tint (add-child) or the card wash (whoisstudying) with no box and no seam.
- **whoisstudying now renders real children** from `useChildren()` (Clerk metadata = the demo
  store), not hardcoded Amara/Rufus. fox/elephant presets → full-bleed cutout + matching wash;
  emoji / uploaded photo → the round `ChildAvatar`. Guards a missing `avatar` (legacy children)
  with `DEFAULT_AVATAR`. Verified live: "Gideon" (fox, seamless) + "GIDEON" (🐻 emoji ring).
- **Child-based routing** (`index.tsx`): signed out → sign-in; signed in + 0 children → add-child
  (onboarding, first child required); signed in + ≥1 child → who's-studying. Splash held until
  Clerk *and* the user object load, so an existing user never flashes onboarding.
- **Navigation wired** (`add-child.tsx`): "Add child" returns to who's-studying
  (`canGoBack ? back : replace('/home')`, so it works both when pushed from the list and as the
  onboarding entry). Back chevron is hidden when there's no history (onboarding). "Add a child" on
  who's-studying pushes add-child (back returns). Flow: splash → auth → add-child (new) /
  who's-studying (returning) ↔ add-child.
- New cutout assets: `gokid-cut-fox.png`, `gokid-cut-elephant.png`. The old wash crops
  (`gokid-child-amara/rufus.png`) are now unreferenced.

## Round 3 — pixel-match rebuild pass (real children)

Children are real (`useChildren` / Clerk metadata): live account shows Gideon (fox, Y6),
GIDEON (🐻 emoji, Y1), ADE (fox, Y2) — so names/animals/count differ from the reference's
Amara/Rufus by design; style is what's matched.

- **Iter 5** (`whoisstudying-5.png`): animals sat too small — floating with wash margin above
  and below — because the cutouts kept transparent padding. Design animals are large and bleed to
  the card edges.
- **Iter 6** (`whoisstudying-6.png`): trimmed both cutouts to their tight alpha bbox
  (`gokid-cut-fox` 420→361w, `gokid-cut-elephant` 332→316h) and rendered the card image
  `contentFit="cover" contentPosition="bottom"`. Animal now fills the card. Ears clipped at top.
- **Iter 7** (`whoisstudying-7.png`): switched to `contentPosition="top"` — ears stay whole, chest
  bleeds off the bottom edge, matching the reference's Rufus card. Match is close at a glance.
  Re-verified the add-child avatar ring still reads well with the tightened cutout.

## Inferred (not read from a design system)
- Card washes `card.amara`/`card.rufus`/`card.add`/`card.dash`, radius `card` (20px), height
  `h-card` (166px), `px-6` gutter, hero size 34 (= H1), name = H2 bold, year = field (20).
- Animal art cropped from the reference PNG (`gokid-child-amara.png`, `gokid-child-rufus.png`).
- Demo children (Amara/Rufus) hardcoded.

## Iter 8 — requested deviation from the reference

Reverses iters 5-7 above. Those tightened the cutouts and bled the animal to the card edges
(`contentFit="cover" contentPosition="top"`) *specifically to match* the reference's Rufus card.
On request ("avatar should be in the middle and not too zoomed in"), the art is now a centred,
uncropped 120pt disc (`fit="contain"`, `bg-transparent`) — the whole animal, no bleed.

Screenshot: `design/.loop/home-cards-4.png`. The cover-crop of a head-and-chest bust into a
card-height column is what read as a zoom; `contain` removes it. Kept transparent so the art sits
straight on the wash, as the reference does — a filled disc (`home-cards-3.png`) read as a hole
punched in the tint.

**Note the trade-off:** the reference's animals are large and bleed off the card edge. A contained
disc cannot do that. This is a deliberate, requested departure — the card no longer matches
`design/GoKid-whoisstudying-screen.png` on art treatment.

### Per-child washes

The wash was keyed off the *picture* (`fox` → cream, `elephant` → lavender, everything else → one
`bg-card-amara` fallback). Two emoji children got identical cards. Now keyed off the child's id via
a hash, drawing from seven `card.wash.*` tints — one per year group, so a full Rec→Y6 household has
no collisions. Hashed on the id, not the list index, so a card keeps its colour when a sibling above
it is deleted.

**Inferred:** `card.wash.lavender`/`cream` are the two sampled reference tints under neutral names;
`mint`/`sky`/`blush`/`peach`/`sage` are hand-mixed to the same recipe (very pale, ~L*94 on the cream
page) and were **not** sampled from any reference. New spacing token `30: "120px"` (disc).

### Emoji glyph sizing (component-wide fix)

`ChildAvatar` hard-coded its emoji glyph at 64px — sized for the 160pt add-child ring. Every smaller
disc clipped the face: the study-dashboard greeting (56pt), parent chip (44pt), progress overview
(56pt), session summary (64pt), children manager (44pt). The component now measures its own disc
(`onLayout`) and picks a glyph step from `GLYPH_STEPS`. Callers set the disc and nothing else, so no
caller can get it wrong. Verified on the study dashboard: `design/.loop/avatar-fit-1.png`.
Add-child ring is unchanged (still the 64px top step).
