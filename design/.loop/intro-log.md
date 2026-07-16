# intro — First Launch Introduction (3-slide carousel)

Route: `/intro` (`src/app/intro.tsx`). From `gokid-screens.md` → **1. Authentication & Account → Missing →
First Launch Introduction (3–4 carousel screens)**.

**No design reference exists for this screen.** Closest ref, per `LOOP-PROMPT.md`'s "Screens with NO design
reference" convention: `design/GoKid-auth-screen.png` (the sign-in screen it hands off to). Matched for
surface / type scale / radius / hero treatment only — not layout-identical, since sign-in has no pager,
no dots and two SSO buttons where this has one CTA.

## Iteration 1

Built the pager, deep-linked `gokid://intro`, screenshotted `intro-1.png`.

- **Unreachable at first.** Screen was at `(auth)/intro.tsx`, and `(auth)/_layout.tsx` redirects any
  signed-in session to `/`. Moved to the root stack (`src/app/intro.tsx`): the carousel reads no Clerk
  state, so the auth guard buys nothing and costs reachability.
- **Diff — dead gap under the hero.** Copied sign-in's `hero → flex-1 spacer → copy` stack, but sign-in's
  block runs to the bottom (2 buttons + 2 legal paragraphs) and this one is ~a third of that, so the single
  spacer dumped all slack into one gap. Fixed: spacer above *and* below the copy.
- **Diff — dots crowded the subtitle.** `pb-6` → `pb-5`, with the new lower spacer carrying the gap.
- Hero was missing sign-in's `mt-8`. Added.

## Iteration 2 — `intro-2.png`

`simctl` cannot swipe, so slides 2 and 3 were photographed by temporarily rotating `SLIDES` with
`.slice(n)` and reverting. Those rotated shots were working images and were not kept — only slide 1 shots
(`intro-1.png` … `intro-4.png`) are in the loop directory. (Artifact of the trick: Fast Refresh preserves
`index` against the shortened array, so the dots read all-grey in the rotated shots. Not a real defect —
`intro-4.png`, taken on a fresh mount of the real 3-slide array, shows dot 0 active.)

- **Diff — slide 2's art rendered as a hard box.** `gokid-cube-stack.png` is a *card* crop: it carries a
  baked-in `study.wash` mint rectangle and its cubes are clipped at the frame edge. Against the cream page
  that reads as a floating grey box, where every hero in the reference set is full-bleed art on the page's
  own background. Same problem for `gokid-prog-astro.png` (a disc icon, not hero art).

## Iteration 3 — `intro-3.png`, `intro-4.png`

Hero art rule adopted: **every slide's illustration must sit on the page's own cream, with no box and no
hard crop edge.** Only `gokid-auth-hero.png` and `gokid-lion.png` already satisfy that.

- Slide 2 → `gokid-lion.png` (the splash lion; full-bleed on cream already).
- Slide 3 → new `assets/images/gokid-intro-progress.png`: the trophy cropped off
  `design/GoKid-congratulations-screen.png` with its mint wash flood-filled to transparent from the four
  corners (Pillow, `thresh=22`). Corner-flood rather than a global colour key, which would punch holes in
  the art's own near-white highlights.
  - First attempt cropped `gokid-result-child.png` (the cheering girl) instead. Rejected: the source art is
    itself clipped at the torso, so it landed a hard straight edge across her shirt plus a sliver of the
    score ring. A complete object was the only way to avoid a cut line.
  - Crop bounds were pulled in twice: left off `Congratulations,` (a stray `s,` glyph rode along), right off
    the card's rounded border (the floodfill can't cross that stroke, so it left an arc in the corner).

`npx tsc --noEmit` and `npm run lint` clean before every screenshot.

## Still off / not fixable from code

- **Headings render in SF Pro, not SF Pro Rounded** — the project-wide `RoundedHeading` degradation
  (`@expo/ui` `Host` crashes the SDK 57 dev client). Affects every screen, not this one.
- **Trophy has faint pale fill inside the handle loops** and keeps a soft mint ground-shadow ellipse: those
  regions are enclosed by the art's own strokes, so the corner flood cannot reach them. Invisible at render
  size; removing them would mean hand-painting the asset.
- No design reference exists, so "matches the ref" is not a claim that can be made here — only "consistent
  with the system."

## Inferred (not read from the design system)

- **The whole screen.** No mockup. Copy, slide count (3), slide order and art assignment are all authored.
- **Page dots** — 8pt dots, `rounded-sm`, `border` when idle / `primary` when active, active pill 20pt wide
  (`w-5`). The design system defines no pagination control. All existing spacing/colour/radius tokens; no
  new token was needed.
- **`Skip`** — Body Large / semibold / `text-secondary`, in a 44pt row (`h-11`, the iOS minimum touch
  target). No reference for a skip affordance.
- **CTA is `bg-primary`** (`#0E7C7B`), reusing sign-in's `h-14` / `rounded-button` geometry. Sign-in's own
  buttons are black (Apple) and white (Google) — brand-mandated for SSO and wrong for a neutral Next, so
  the system's primary colour was used instead.
- **`gokid-intro-progress.png`** is a derived asset, not one the design set ships.
- **Persistence:** `src/lib/intro.ts` stores the seen-flag in `expo-secure-store` — the only key-value store
  already in `package.json`. The flag is not a secret; it just rides along.

## Flow wiring

`src/app/index.tsx` (entry gate) now forks: signed out **and** intro unseen → `/intro`; signed out and seen
→ `/sign-in`. The gate holds the splash until the SecureStore read lands, so a returning parent never
flashes the carousel. `Skip` and `Get started` both `markIntroSeen()` then `router.replace("/sign-in")` —
`replace`, so the carousel is not left under sign-in in the back stack. A keychain read failure fails open
(shows the carousel) rather than stranding the parent on the splash; the throw goes to Sentry.
