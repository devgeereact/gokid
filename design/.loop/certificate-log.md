# Certificate Earned — design-match log

Screen: **Certificate Earned** (`design/gokid-screens.md` §9 Rewards).
Route: `src/app/(app)/certificate/[id].tsx`.

## Reference situation (read this first)

**There is no `GoKid-certificate-screen.png`.** The Rewards section of `gokid-screens.md` lists nine
screens and the design set ships art for none of them. The only certificate imagery anywhere in
`design/` is the small "WELL DONE!" card the child holds in the hero of
`design/GoKid-congratulations-screen.png` — an ivory sheet with a gold rosette. That card is the
reference for the artefact; the surrounding page reuses `GoKid-congratulations-screen.png`'s layout
language verbatim (cream `background` page, `rounded-2xl` white cards on `border`, `gamify-green-wash`
banner, pinned teal action, 20pt page gutter) so the certificate reads as the same product.

Because the ref is a ~175×135px detail inside a hero illustration, "indistinguishable at a glance"
is not a reachable bar here. The stop condition that applied was: **remaining diffs are things I
cannot fix from code** (no rosette asset, no print pipeline).

---

## Iteration 1

Built the screen + `src/lib/rewards.ts` demo seam + `cert.*` tokens. Screenshot:
`certificate-1.png`.

**Differed:**
- The rosette seal read as a hollow gold ring with a **white blob** inside. `star.fill` at 20pt
  tinted `white` sat invisibly on the ring's white interior.
- Two arbitrary values — `tracking-[2px]` / `tracking-[1px]` — which AGENTS.md forbids
  ("no raw color, spacing, or font-size literals… extend `tailwind.config.js` and use the token").

**Changed:** added `letterSpacing: { eyebrow: 2px, ribbon: 1px }` to the config and swapped both
classes to `tracking-eyebrow` / `tracking-ribbon`. Tinted the star `cert.seal` (gold) and offset it
`-mt-4` — the `rosette` symbol's ring centres *above* its bounding box because the ribbon tails hang
below, so a plain overlay put the star low.

## Iteration 2

Screenshot: `certificate-2.png`. Rosette now reads as a gold rosette with a star, matching the ref's
card. Eyebrow letterspacing correct.

Verified the below-fold sections (`certificate-3-lower.png`) by temporarily setting the ScrollView's
`contentOffset` to y=1180 — `simctl` cannot scroll or tap (see the design-loop memory), and
`contentOffset` is honoured on mount so Fast Refresh applies it. Removed afterwards.

**Differed (below the fold):**
- "How you earned it" stat tiles rendered **value above label**. Every stat tile in the design set
  (`GoKid-congratulations-screen.png`, `GoKid-sectionsummary-screen.png`) puts the **label above the
  value**. Swapped to match.
- Encouragement banner icon was 20pt; the equivalent banner on the congratulations ref is 22pt.
  Bumped.

## Iteration 3 (final)

Screenshot: `certificate-4.png`. `npx tsc --noEmit` and `npm run lint` clean. All five sections
render with real demo content from `src/lib/rewards.ts`.

---

## What still differs, and why

- **The rosette is an SF Symbol, not the reference's illustration.** The ref's rosette is a painted
  gold ribbon with a red-and-gold pleated fan. The repo ships no rosette asset, and the ref's copy is
  ~175px wide inside a hero — cropping it (the established asset pattern here) would yield a blurry
  sheet-with-child, not a clean rosette. `rosette` + `star.fill` is the closest SF Symbol pair.
  Not fixable from code.
- **"Save or print" does not print.** A real PDF export needs the server-side render that arrives
  with Neon/Drizzle (AGENTS.md lists both as not-yet-installed). It opens the same `Share` sheet as
  the header action. Labelled "Save or print" rather than "Print" so it does not promise a pipeline
  that isn't there. Deliberate; logged rather than faked.
- **Headings are SF Pro, not SF Pro Rounded.** Project-wide — `@expo/ui`'s `Host` crashes the dev
  client, see `components/rounded-heading.tsx`. Not specific to this screen.
- **The child's name is whoever is signed in** (screenshots show "Gideon", the live Clerk child).
  `useChildren()[0]`, falling back to "Amara" — same pattern as the congratulations screen.

## Values I inferred rather than read from the design system

All logged in-code at their definition sites.

| Value | Where | Basis |
|---|---|---|
| `cert.paper` `#FFFDF6` | `tokens.js` | Sampled off the ref's certificate sheet (warm ivory) |
| `cert.frame` `#E7C77A` | `tokens.js` | Sampled off the ref's gold border |
| `cert.rule` `#F0E2C2` | `tokens.js` | The frame at rule weight — the ref's rules are too small to sample cleanly |
| `cert.seal` `#F5A524` | `tokens.js` | The ref's rosette gold; identical to the design system's `accent`, kept named for intent |
| `cert.ink` `#8A6212` | `tokens.js` | `accent` pushed to ~L*40 so the eyebrow holds AA on `cert.paper`. Reuses the same value as `subject-ink.history` |
| `tracking.eyebrow` `2px` | `tailwind.config.js` | The design system sets no letter-spacing; the ref's "WELL DONE!" caps are letterspaced |
| `tracking.ribbon` `1px` | `tailwind.config.js` | Same, tighter inside the pill |
| Tier = "Gold", 4 objectives, `90% / 20 / 24m / 120` | `src/lib/rewards.ts` | Stats match the numbers on `GoKid-congratulations-screen.png` so the two screens agree. Objectives are real Y3 National Curriculum place-value statements |
| `GK-2026-0716-PV1000` reference | `src/lib/rewards.ts` | Invented format. Stands in for a signed certificate id from the API |

## Demo data

`src/lib/rewards.ts` — `getCertificate(setId)`. Every section of the screen is driven by it:
award line, tier, issue date, reference, objectives, stats, encouragement. `place-value` has
hand-authored copy; **every other set in `src/lib/study.ts` derives a certificate** from its own
`mastered` / `cardsTotal` / `minutes`, so no completed set dead-ends on a missing certificate.
Same swap seam as `study.ts` / `children.ts`: screens import the function, not the data.

## Navigation

- **In:** Congratulations (`(tabs)/study/congratulations/[id].tsx`) gained a "You've earned a
  certificate" card → `router.push('/certificate/[id]')`. That is the flow's natural entry — the
  certificate is what completing a set awards.
- **Out:** back chevron (`router.back()`), pinned "Done" (`router.back()`), "See all achievements"
  → `/progress/achievements`, share sheet.
