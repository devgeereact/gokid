# Auth screen — design-match loop

Reference: `design/GoKid-auth-screen.png` (853 × 1844 px).

## Calibration (done once, before iteration 1)

The reference renders a 393 × 852 pt screen, so **1 pt = 2.170 px**. Confirmed three ways:
the image aspect (2.162) matches 852/393; the button block's left inset is 100 px = 46.1 pt,
which lands on the design system's 48 pt spacing step; and the home indicator sits at
846–849 pt, i.e. the bottom of an 852 pt screen.

Everything below was measured off the reference, not eyeballed.

| Element | Measured (pt) |
|---|---|
| Background | `#FEFBF6` |
| Hero illustration | top 92.2, height 271.9, full-bleed |
| Headline | 3 lines, ascender tops 377.8 / 410.0 / 444.1 → line-height 34, font-size ≈ 32, bold, **rounded** |
| Subtitle | 3 lines, line-height ≈ 25, font-size ≈ 21, semibold, rounded |
| Apple button | y 572.2, h 55.3 (→ 56), x 46.1–346.0 (→ 48 pt page padding), fill `#000000` |
| Button gap | 12 |
| Google button | y 639.0, h 53.0 (→ 56), fill `#FFFFFF`, border `#E5E1DB` |
| Button corner | circular-fit radius ≈ 20.7 px across 15 sample rows |
| Caption | y 712.3, 2 lines, line-height 23, font-size ≈ 17 |
| Legal | y 778.2, 2 lines, line-height 17, font-size ≈ 15; links teal, semibold |

Text colours, taken as the modal colour of the darkest pixels in each band (the mock carries a
faint paper grain, so no band is a single flat value):
headline `#1B1F22`, subtitle `#5D6063`, button labels `~#000`, caption `#6D6E71`,
legal `#66686C`, legal links `#0F625C`.

## Decisions taken before writing any code

- **"2. Parent Welcome" is not part of the screen.** `design/GoKid-app-ui.png` shows the same
  string as the caption *above* frame 2 in the sheet ("1. Splash", "3. Add a Child", …). It got
  baked inside the frame when the auth screen was exported standalone. Omitted deliberately.
- **No email button.** One was briefly added below Google at the user's request, then dropped —
  so the screen now carries exactly the two buttons the reference shows. (The instance's Clerk
  config also made passwordless email impossible without a dashboard change: password was
  `required: true` at sign-up but `used_for_first_factor: false`, so it could not be used to sign
  in either.)
- **Headline family is SF Pro Rounded.** Confirmed by zooming the headline crop: rounded stroke
  terminals, rounded stem joins. Matches the design system's "SF Pro Rounded (Headings)". Button
  labels are *not* rounded — they are SF Pro Text.

## Tokens added to `tailwind.config.js`

| Token | Value | Source |
|---|---|---|
| `font-rounded` / `font-text` | SF Pro Rounded / SF Pro Text | design system, §02 |
| `text-display` | 32 / 34 | **inferred** — measured; tighter than the system's H1 (34/40) |
| `text-subtitle` | 21 / 26 | **inferred** — measured; no system entry between H3 (22/28) and Body Large (17/24) |
| `text-legal` | 15 / 18 | **inferred** — measured; system Body is 15/22, too loose |
| `rounded-button` | 20 px | **inferred** — corner fit ≈ 20.7 px; system radii are 8/12/16/26/28 |
| `aspect-hero` | 853 / 590 | the hero crop's own aspect |

Colours, spacing, and the 56 pt button height are all existing design-system tokens.

## Assets

`assets/images/gokid-auth-hero.png` — cropped full-bleed from the reference (y 200–790 px). Its flat
background was shifted from the mock's `#FEFBF6` to the design system's `#FBF9F6` so it seams
invisibly against `bg-background`. Anti-aliased edge pixels carry at most a 3/255 error.

---

## Iterations 1–6 — summary

Final: `auth-6.png`. Stopped because the last two iterations produced no new *fixable* diffs —
everything still separating the screenshot from the reference comes from the reference not having
been rendered in the fonts iOS actually ships (see "What still differs").

| # | What was wrong | What changed |
|---|---|---|
| 1 | App would not boot. `.env` had the publishable key and `CLERK_SECRET_KEY` on one line, so Metro inlined them concatenated and Clerk rejected the key. Separately, the app was built `CODE_SIGNING_ALLOWED=NO`, leaving it unsigned — Clerk's native SDK then failed to read its device token from the keychain (`-34018`, `errSecMissingEntitlement`) and never finished loading. | User fixed `.env`. Rebuilt ad-hoc signed. |
| 2 | Every rem-based utility was 12.5% small: buttons rendered 49pt instead of 56, page padding 42 instead of 48, gaps 10.5 instead of 12. **NativeWind's `rem` is 14 on native, not 16**, so Tailwind's default rem scale silently misses the design system's 8pt grid. Headline was not rounded. Copy ran the full button width. | Pinned `spacing` in px. Added `RoundedHeading` (below). Introduced a narrow copy column. |
| 3 | Copy column reproduced some of the reference's line breaks but not others. Headline's last line had its descenders sheared off. | Went to per-element analysis. |
| 4 | Descender clipping survived 24pt of padding — it is SwiftUI's `lineHeight` shearing the glyphs, not the host clipping them. No single column width could reproduce all four break patterns. | Pinned the line breaks by hand; dropped the `measure` token. |
| 5–6 | Headline sat 8pt too close to the subtitle. | Restored the 8pt gap. Every band now lands within ~2pt of the reference. |

### The font

The design system says headings are SF Pro Rounded. **iOS ships that face but exposes no
font-family name React Native can resolve** — "SF Pro Rounded", "SFProRounded-Bold",
".AppleSystemUIFontRounded", ".SFUIRounded", "SFRounded" and "system-ui-rounded" all silently fall
back to plain SF Pro (probed on the simulator; all seven samples rendered identically).

The way in is SwiftUI's `Font.system(design: .rounded)`, which `@expo/ui` surfaces as the
`font({ design: 'rounded' })` modifier. `src/components/rounded-heading.tsx` wraps a SwiftUI `Text`
in a `Host` for exactly this, and falls back to a plain RN `Text` off-Apple. No font binary is
shipped and nothing is licensed.

## What still differs, and why

1. **The headline block is ~21pt taller than the reference** (three lines at SF Pro Rounded's
   natural 41pt leading vs the reference's 34). This is not a free choice: SwiftUI's `lineHeight`
   modifier shears the descenders off the last line whenever it is set below the font's natural
   line box — "school year." rendered as "school vear." — and padding does not recover them. 41pt
   is the tightest leading that keeps the glyphs whole, and it is within a point of the design
   system's own H1 spec (34/40).

2. **Every line of copy is wider than the reference's.** The reference's rounded face is ~25%
   narrower per em than the SF Pro Rounded iOS ships, and even its body text is ~9% narrower than
   SF Pro Text. The mock was not rendered in the system fonts. Matching its glyph *widths* would
   mean shrinking the headline to ~28pt — 16% under the design system's H1 — so I kept the design
   system's sizes and pinned the line breaks by hand instead. Every break now matches the
   reference; the lines are just physically longer.

3. **Screen size.** The reference is a 393 × 852pt screen; the only simulators available here are
   402 × 874 and up. Content is bottom-anchored, so compare from the bottom: on that basis every
   element lands within ~2pt.

4. **Background `#FBF9F6` vs the mock's `#FEFBF6`.** I used the design system's token. The hero
   crop's flat background was shifted to match so it seams invisibly.

## Values inferred rather than read from the design system

| Token | Value | Basis |
|---|---|---|
| `text-display` | 34 / 41 | Size is the system's H1. Leading is SF Pro Rounded's natural line box — the system's 40 is a point tighter and would clip. |
| `text-subtitle` | 21 / 25 | Measured. No system entry sits between H3 (22/28) and Body Large (17/24). |
| `text-legal` | 15 / 18 | Measured. System Body is 15/22, too loose. |
| `rounded-button` | 20px | Circular fit across 15 sample rows of the button's corner. System radii are 8/12/16/26/28 — none match. |
| `aspect-hero` | 853 / 590 | The hero crop's own aspect. |
| `spacing` | px, not rem | Not inferred from the design — a correction. See iteration 2. |

Everything else — colours, the 48pt page padding, the 56pt button height, the 12pt button gap — is
an existing design-system token, and each landed on the reference's measurements exactly.

## Not verified

The Apple and Google buttons are wired to Clerk's `useSSO()` but **no sign-in was actually
completed** — that needs a real Google or Apple account in the simulator. The screen renders and
the buttons dispatch; the round-trip is untested.

---

## Iteration 1 detail — BLOCKED, no screenshot taken

`npx tsc --noEmit` clean. `npm run lint` clean. `xcodebuild` for the simulator: **BUILD SUCCEEDED**.
The app installs and launches on the booted iPhone 17 Pro (0C06B27F).

It does **not render**. `ClerkProvider` throws at mount:

> `@clerk/clerk-js: The publishableKey passed to Clerk is invalid.`

Root cause is `.env`, not the code: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` sit
on the same line with no separator, so Metro inlines the publishable key with
`CLERK_SECRET_KEY=sk_test_…` glued onto its tail. Clerk base64-decodes it, gets
`certain-parakeet-10.clerk.accounts.dev$CLERK_SECRET_KEY=sk_test_…` instead of a bare host, and
rejects it. `.env` is outside my permission scope — I can neither read nor write it — so this needs
a human edit before the loop can run.

**Nothing in the screen has been visually verified.** Every value below the calibration table came
from measuring the reference, not from comparing rendered pixels. The following are the first
things to check once the app boots, in the order they are most likely to be wrong:

1. **`font-rounded` may not resolve.** iOS does not expose SF Pro Rounded as a nameable font
   family to React Native the way it exposes SF Pro Text. If the headline renders with square
   stroke terminals, the family fell back to the system font, and the fix is to bundle the actual
   SF Pro Rounded face via `expo-font` — the design cannot be matched without it.
2. **`fontWeight` on a named family.** `font-bold` / `font-semibold` may not select a weight when
   `fontFamily` is set explicitly; the rendered weight needs eyeballing against the reference
   (500 vs 600 is visible at this size).
3. **Vertical rhythm.** The margins (`mt-8` hero, `mt-2`, `mt-2`, `mt-3`, `mt-3`, `mt-4`, `mt-5`)
   were derived by subtracting measured band positions and estimating where each `Text` box top
   sits relative to its first ascender. They are first guesses, not measurements of the render.
4. **`shadow-subtle` on the Google button.** NativeWind maps `boxShadow` to RN's `boxShadow`,
   which RN 0.86 supports — but whether the spread and opacity match the mock's very faint
   shadow is unverified.
5. **Hero sizing.** The illustration sits in a `flex-1` box with `contentFit="contain"`, so it
   absorbs the difference between the reference's 852 pt screen and the simulator's 874 pt one.
   Its rendered height will not be exactly the measured 271.9 pt.

`/private/tmp/.../scratchpad/compare.py <shot.png> 402` prints the reference's content bands beside
the screenshot's, both normalised to pt — that is the tool to drive iteration 2 with.
