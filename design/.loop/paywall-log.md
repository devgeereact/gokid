# paywall — build log

Ref: `design/GoKid-paywall-screen.png` (screen 13). Route: `src/app/(app)/paywall.tsx`.

## Iter 1
- Built: hero illustration (`gokid-paywall-hero.png`, cropped 430,300→918,760 to exclude the
  baked headline/×/feature text) placed top-right with "Keep the sets coming." overlaid left
  and a functional ✕; three teal-check benefits; Monthly / Annual price cards (Annual
  pre-selected, "Best value" badge, teal border); "Start free trial" CTA; cancel footer.
- Prices are demo copy — no billing wired (StoreKit/RevenueCat lands later).
- `paywall-1.png`: headline overlap, benefits, price cards, badge, CTA, footer all match.

## Diffs remaining / inferred
- Illustration crop bg is near-white, so its right/bottom edge shows a faint box on the cream
  page (ref blends fully). Cannot fully remove without a transparent asset.
- No new tokens (checks/CTA = `study.teal` / `primary`).
