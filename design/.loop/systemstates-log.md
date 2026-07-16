# system states — design-match log

Covers the MVP's "Essential System States" block (`design/mvp1.md`): loading skeletons, empty states,
offline state, error handling, network recovery.

**No reference PNG covers any of these.** The design set jumps straight from populated screen to
populated screen. Closest refs: `design/GoKid-design-system.png` (tokens), plus
`design/GoKid-studydashboard-screen.png` for row geometry and `design/GoKid-offlinesync-screen.png`
for the offline vocabulary.

## What was built

| State | Where | File |
|---|---|---|
| Empty state | who's-studying (no children), study dashboard (no sets for year), history (no sessions) | `src/components/empty-state.tsx` |
| Loading skeleton | study dashboard while Clerk resolves | `src/components/skeleton.tsx` |
| Offline + recovery banner | study dashboard header | `src/components/offline-banner.tsx` |
| Route not found | any unresolved path | `src/app/+not-found.tsx` |
| Render error | anywhere below the root | `ErrorBoundary` in `src/app/_layout.tsx` |

## Iteration 1

**Screenshots read back:**
- `design/.loop/notfound-1.png` — deep link `gokid://this-route-does-not-exist`. Renders the shared
  EmptyState: symbol disc, h3 title, secondary body, teal pill CTA. Matches the token set.
- `design/.loop/history-1.png` — the "No study history yet" empty state in place, inside its card.
- `design/.loop/study-mvp-1.png` — dashboard online: the banner correctly renders nothing, and sets
  are now filtered to the child's year group (a Year 6 child gets Year 6 sets; previously every one
  of the 21 sets showed regardless of year).

**Deliberately inferred (nothing here was read from a reference):**
- **EmptyState shape:** 20pt disc in `bg-study-wash` with the symbol in `primary`, `text-h3` title,
  `text-body text-text-secondary` body, `h-12` pill in `study-teal`. Derived from the dashboard's
  "Carry on" button and the study card wash.
- **Skeleton:** `bg-gamify-track` blocks pulsing opacity 1 → 0.4 → 1 over 1.2s (Reanimated), matching
  the radius of the surface they stand in for. Duration and the 0.4 floor are both invented.
- **Banner:** full-bleed pill in the page gutter. Offline = `badge-practice` + `wifi.slash`;
  recovered = `badge-strong` + `arrow.triangle.2.circlepath`, auto-hiding after 2.5s. Tints borrowed
  from the parent-content curriculum badges; 2.5s is invented.
- **Error screen copy** — shows `error.message` in `__DEV__` only; production reads "That screen
  didn't load. We've logged it — try again." The throw goes to Sentry first (AGENTS.md forbids
  swallowing errors), then `retry` remounts the segment.

## Notes for the next iteration

- **Native module added:** `expo-network` (`npx expo install`). This needed a dev-client rebuild —
  `xcodebuild -workspace ios/gokid.xcworkspace -scheme gokid -configuration Debug -sdk
  iphonesimulator -destination "id=<UDID>" -derivedDataPath ios/build CODE_SIGN_IDENTITY="-"
  CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=YES build`, then `simctl install` + `launch`.
  JS-only edits still hot-reload.
- **React Compiler is on** (`app.json` → experiments) and its lint rules are strict. Three patterns
  it rejects, all hit while building this:
  1. `Date.now()` in a component body → move the clock read into a module-scope helper
     (`dueLabel`, `elapsedMinutes` in `src/lib/reviews.ts`) or a ref set in an effect.
  2. `sharedValue.value = x` → use Reanimated's `.get()` / `.set()` instead.
  3. `setState` synchronously in an effect body → drive it from a subscription callback. The offline
     banner uses `addNetworkStateListener` rather than `useNetworkState()` for exactly this reason.

## Not verified (stated plainly)

- **The offline and recovered banners have never been seen rendering.** The simulator was online
  throughout, and `simctl` cannot toggle a device's connectivity. Both branches were verified by
  reading the listener logic only. To see them: Simulator → Features → Network Link Conditioner, or
  drive the app on a device in airplane mode.
- **The skeleton has never been seen.** Clerk resolves faster than a screenshot on a warm client.
- **The error boundary has never been seen.** Nothing throws; it would need a deliberate throw.
- **The 3D card flip has never been seen mid-flip.** `simctl` cannot tap. The front face renders
  correctly with both faces absolutely positioned and counter-rotated
  (`design/.loop/flashcard-flip-1.png`) — that the flip animates was verified by reading the
  Reanimated `rotateY` interpolation, not by pixels.

`npx tsc --noEmit` and `npm run lint` are clean.
