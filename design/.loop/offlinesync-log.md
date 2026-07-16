# offlinesync — build log

Ref: `design/GoKid-offlinesync-screen.png` (screen 14). Route: `src/app/(app)/offline.tsx`.

## Iter 1
- Built: full-bleed sky hero (`gokid-offline-hero.png`, cropped 52,182→872,818 — headline
  "You're offline — everything's saved." is baked into the crop since it is static copy),
  then "Downloaded sets" list — 3 rows with cropped thumbs
  (`gokid-offline-{placevalue,skeleton,capitals}.png`) + card count + a teal download-arrow
  circle. Demo downloaded state.
- `offline-1.png`: hero, list, thumbs, download circles all match the ref.

## Diffs remaining / inferred
- In the mock this is a state of the Study tab (the native tab bar shows below). As a
  standalone route it has no tab bar — a known limitation; would need to live inside `(tabs)`
  and swap on a connectivity flag to show the bar.
- Set thumbs carry a faint white pad from the square crop (ref thumbs are flush).
- New token `offline.sky` (sampled) — used only as an accessibility/label context; the hero
  itself is the image.
