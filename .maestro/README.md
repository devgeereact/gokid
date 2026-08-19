# Maestro flows

Fourteen interaction flows against the iOS simulator. They are the only end-to-end coverage in the
repo — there is no unit test suite — and they run against the **already-signed-in** dev session with
the two real dev children (Jacob K, Isaac K). None of them clear state.

## Running them

Maestro needs a JRE, and there is no system Java on this machine. WebStorm ships one:

```bash
export JAVA_HOME="/Applications/WebStorm.app/Contents/jbr/Contents/Home"
export PATH="$PATH:$HOME/.maestro/bin"
maestro -v            # expect 2.8.0
```

Preconditions: a booted simulator with the dev client installed, and `npm start` running (port 5062).

```bash
maestro test .maestro/01-whos-studying-pick-child.yaml   # one flow
for f in .maestro/*.yaml; do maestro test "$f"; done      # the suite, in order
```

**Run them one at a time.** `maestro test .maestro/` executes the folder concurrently against a
single simulator, and the flows share one device and one signed-in child; a concurrent run reports
failures that are pure interference.

## Writing flows that survive a second run

Every failure found on 2026-08-19 was a flow encoding a one-shot world, not an app regression. The
four traps, all of them still live:

1. **Labels that depend on progress.** The Continue-card CTA is "Start studying" only until the
   child has opened the set, then "Carry on" (`study/index.tsx:346`). Match both.
2. **Set titles are not controls.** The Continue card is a plain `View`; only its button navigates.
   Tapping the title by regex "succeeds" and goes nowhere, and every later step then fails against a
   screen that never changed. Navigate by deep link — `gokid://lesson/y4-mult-div`,
   `gokid://quiz/instructions/<id>`, `gokid://download/<id>` — not by tapping through the dashboard.
3. **`assertVisible` means on-screen, not in-tree.** CTAs below the fold need a `scrollUntilVisible`
   first, often with `visibilityPercentage: 60` because a button flush with the bottom edge never
   reaches 100%.
4. **Match the accessibilityLabel, not the visible text.** A `Pressable` carrying
   `accessibilityRole="button"` + `accessibilityLabel` merges its child `Text` away, so the
   hierarchy exposes only the label: the lesson-screen button reads "Study session" but is tapped as
   "Start a study session" (`lesson/[id].tsx:176-183`).

Flows that continue from another (05, 13) start with `runFlow: 04-…yaml` rather than assuming the
previous flow's last screen is still on the device.

Idempotency is the bar: 12 flows create their own state or reset it (12 removes an existing download
before downloading again). A flow that passes once and then fails is worse than no flow.

## Known gap — 03 and 14

Both drive the quiz, whose questions come from `/api/quiz` — shuffled per serving, and subject to the
12-hour no-repeat rule, so a second run is served a different draw by design. Naming an option by its
text works exactly once. Fixing this needs a content-independent handle on an option row; the work is
outstanding and these two flows fail until it lands. Do not "fix" them by re-hardcoding today's
answers.

## Trap: a stale Metro cache looks like an app that ignores your edits

If a source change does not appear no matter how often you reload, check that Metro can still build:

```bash
curl -s "http://localhost:5062/node_modules/expo-router/entry.bundle?platform=ios&dev=true" | head -c 200
```

A JSON `UnableToResolveError` means Metro's module map is stale (a dependency change will do it) and
the dev client is serving its last good cached bundle. Restart the dev server with `npx expo start
--clear --port 5062`. Until you do, every measurement you take on the device is of old code.
