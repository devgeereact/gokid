# SPLASH — design-match loop log

Reference: `design/GoKid-splash-screen.png` (852 × 1846 px). The mock frame is a
871 pt tall device at 2.1194 px/pt, i.e. the same 402 pt width as the iPhone 17 Pro
simulator used for the screenshots (874 pt tall). All measurements below are in **pt**,
taken by bounding-box analysis of both PNGs (Pillow), not by eye.

Reference geometry (pt, measured from the top-left of the device screen):

| element | x0 | x1 | width | y0 | y1 | height |
|---|---|---|---|---|---|---|
| wordmark | 60.9 | 353.4 | 293.0 | 221.8 | 320.8 | 99.6 |
| lion | 52.4 | 351.0 | 299.1 | 357.6 | 670.5 | 313.3 |

Derived: gap wordmark→lion **36.8 pt**, bottom margin **200.5 pt**.

---

## Iteration 1

**Setup work before the first render**

- Extracted tokens from `design/GoKid-design-system.png` into `tailwind.config.js`
  (`theme.extend`): colours, type scale, radii, elevations.
- The design system has no GoKid wordmark or lion asset in the repo, and the
  wordmark is a custom rounded logotype with a star over the `i` — not a font the
  project ships. Rather than approximate it with a system font, I cut both artworks
  straight out of the reference PNG:
  `assets/images/gokid-wordmark.png` (630×220) and `assets/images/gokid-lion.png`
  (642×674), with the paper background flood-filled to transparent and the
  anti-aliased edge feathered back into alpha.
- `_layout.tsx`: `headerShown: false` (the default Stack header was drawing an
  "index" nav bar over the screen).

**Diffs found (screenshot vs reference)**

| thing | reference | iteration 1 | delta |
|---|---|---|---|
| wordmark w × h | 293.0 × 99.6 | 293.0 × 99.7 | 0.0 / +0.1 ✅ |
| lion w × h | 299.1 × 313.3 | 299.0 × 313.7 | −0.1 / +0.4 ✅ |
| gap wordmark→lion | 36.8 | 32.3 | **−4.5** |
| wordmark top | 221.8 | 214.3 | **−7.5** |
| lion top | 357.6 | 346.0 | **−11.6** |
| lion centre x | 201.7 (screen centre 201) | 201.0 | 0.7 ✅ |
| wordmark centre x | 207.1 | 200.7 | **−6.4** — see inferred, below |

**Changes for iteration 2**

- gap `mt-8` (32 px) → `mt-9` (36 px), matching the measured 36.8 pt.
- container `pt-4` (16 px) so the vertically-centred block lands 8 pt lower,
  putting the wordmark top at ~220.5 vs the reference 221.8.

## Iteration 2 — final (stopped here on request)

Screenshot: `design/.loop/SPLASH-2.png`. `npx tsc --noEmit` clean, `npm run lint` clean.

| thing | reference | iteration 2 | delta |
|---|---|---|---|
| wordmark w × h | 293.0 × 99.6 | 293.0 × 99.7 | 0.0 / +0.1 ✅ |
| lion w × h | 299.1 × 313.3 | 299.0 × 313.7 | −0.1 / +0.4 ✅ |
| gap wordmark→lion | 36.8 | 35.7 | −1.1 ✅ |
| wordmark top | 221.8 | 219.7 | −2.1 |
| lion top | 357.6 | 354.7 | −2.9 |
| lion centre x | 201.7 | 201.0 | −0.7 ✅ |

Colour spot-checks (reference → render): star `#FD9F0D` → `#FDA00E`, lion body
`#F7A42B` → `#F8A62A`, grass `#50703E` → `#51743F`. All within 1–3/255.

Still off: the whole block sits **~2–3 pt high** (6–9 px at 3×). The fix is
`pt-4` → `pt-5` on the container (+2 pt). I made that edit, but the rebuild was
stopped before I could screenshot it, so I reverted to `pt-4` — the code in the repo
is exactly what `SPLASH-2.png` shows. Nothing else is verified-by-pixel beyond that.

**Deliberately inferred / not matched**

- **Wordmark horizontal centring.** In the reference the wordmark's centre sits
  6.4 pt right of the screen centre while the lion is centred. That is an artefact of
  the illustrated mock, not a design intent — a logotype offset 6 pt from a centred
  illustration below it reads as a bug. Kept centred; logged rather than replicated.
- **Background `#FBF9F6`** (the design system's Background token). The reference
  splash's paper actually samples `#FEFCF8` — a ~1.2 ΔE difference, invisible. Using
  the token, per the "no raw hex" rule.
- **Spacing scale.** The design system's 8 pt grid (4·8·12·16·24·32·48·64·80) is
  already exactly Tailwind's default spacing scale (`1`…`20`), so it is not
  re-declared in `theme.extend`. The 36 pt gap (`mt-9`) is off that grid but is what
  the reference measures; it is still a multiple of 4.
- **Colour tokens.** Hexes are read from the design system's printed labels. The
  Geography subject tint label is not legible in the PNG; `#E6E4F8` is sampled from
  the swatch itself.
- **Artwork resolution.** The reference is 2.12× density, so the extracted PNGs are
  ~2.1× assets rendered on a 3× screen. They are very slightly softer than a native
  3× export would be. Cannot be fixed from code — needs the original artwork.
- **Native launch screen.** `app.json` still has the Expo template's
  `backgroundColor: "#208AEF"` splash. Out of scope for this screen (and a change
  there needs a native rebuild), so left alone — but it means a blue flash precedes
  this screen.
