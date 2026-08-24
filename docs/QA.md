# QA — how to test GoKid so the result means something

This is the procedure. [`LAUNCH.md`](LAUNCH.md) is the readiness ledger; the dated runs in
[`qa/`](qa/) are evidence. This file is how to produce evidence that is worth keeping.

The rule everything here follows: **nothing is "verified" unless the behaviour was observed in the
environment that behaviour has to work in.** A passing typecheck is not a rendering screen; a green
Maestro run is not a working feature unless the flow asserted the result; and an app that studies a
set with the Wi-Fi off has not proved offline download works if the same set is bundled with the app.

---

## 0. Clean start — do this before any QA that will be reported

Metro caches transformed modules, and the simulator caches the last bundle it fetched. Between them
they will happily serve JavaScript that no longer exists in the working tree, and everything
downstream — screenshots, Maestro runs, "I checked and it works" — is then a statement about code
nobody has. **This has already happened on this project once.** A new module especially: Metro's
resolver caches negative lookups, so a file added since the server started can fail to resolve while
the old bundle keeps running.

```bash
# 1. Nothing is holding the port. (5062 is this project's allocation — Metro's default 8081 is not
#    used, so a stray process on 8081 is somebody else's.)
lsof -ti:5062 | xargs -r kill

# 2. Start Metro with its cache cleared, and leave it running. NOT under `CI=1` — see below.
npx expo start --port 5062 --clear

# 3. Record what is being tested. Paste this into the run's report.
git rev-parse --short HEAD
git status --short          # a dirty tree is fine; an unrecorded dirty tree is not
xcrun simctl list devices booted
```

> **Never start the dev server with `CI=1`.** It disables the file watcher: Metro builds the graph
> on the first request and then serves that graph for the rest of the session, so every edit after
> startup is invisible to the app while `curl`ing the module bundle by hand still shows the new code.
> This exact configuration cost an hour of this project's QA on 24 Aug 2026 — a testID added to a
> component simply never appeared on the device, through app relaunches and a dev-menu Reload.
>
> **A dev-menu Reload does not fix a stale bundle** either, for the same reason: the server is what
> is stale, not the client.

Then reload the app on the simulator (`r` in the Metro terminal, or shake → Reload) and **confirm
the new code is live before testing it** — do not infer it from the fact that Metro restarted:

```bash
# Ask Metro to build a bundle rooted at the module you changed, and grep it for something only the
# new code contains. Do NOT use the app's entry bundle for this: expo-router loads routes lazily in
# development, so `expo-router/entry.bundle` contains the runtime and almost none of the app — every
# grep against it returns 0 whether the code is fresh or not.
curl -s 'http://localhost:5062/src/components/passcode-pad.bundle?platform=ios&dev=true' \
  | grep -c 'passcode-key-'
```

A count of `0` means Metro cannot see the change, so the simulator will not either. Stop and fix that
first. (The first such request after `--clear` transforms the whole graph and takes ~30s; that cost
is the point of running it.)

For a build that changes native code or `app.json`, Metro is not enough — rebuild:

```bash
xcodebuild -workspace ios/gokid.xcworkspace -scheme gokid -configuration Debug \
  -sdk iphonesimulator -destination 'id=<SIM_UDID>' -derivedDataPath ios/build
xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/gokid.app
```

Never pass `CODE_SIGNING_ALLOWED=NO`. It produces empty entitlements, which breaks the Keychain
(`OSStatus -34018`) and hangs the app on the splash while Clerk never loads.

### Record the environment with every result

A result without its environment cannot be reproduced or trusted later. Every report states:

| Field | How to get it |
| --- | --- |
| Commit | `git rev-parse --short HEAD` + whether the tree was dirty |
| Bundle | Debug via Metro, or a Release build with the bundle embedded |
| API | `EXPO_PUBLIC_API_URL`, or "Metro `hostUri` fallback" in dev |
| Device | `xcrun simctl list devices booted` |
| Network | online / Wi-Fi off |

---

## 1. The gates that run without a device

All four must be clean before anything is put in front of a simulator.

```bash
npx tsc --noEmit        # types
npm run lint            # eslint
npm test                # unit tests — pure logic, ~250ms
npm run check:content   # curriculum structure, strands, answer bias, symbol imports
```

`npm run check:content:db` additionally compares the live database against the bundled catalogue,
field by field. That is the check that catches content which drifted on the server — a diagnostic
marker left in a prompt, a half-applied seed, a row edited by hand. Run it before every release, and
after anything that touched the database.

The unit tests cover the two pieces of pure logic whose failures are invisible on screen: the
spaced-repetition schedule (`src/lib/review-schedule.ts`) and quiz grading
(`src/lib/quiz-scoring.ts`). Both were extracted out of modules that import native code specifically
so they could be tested; keep new logic of that kind in a leaf module for the same reason.

---

## 2. The Maestro suite

See [`../.maestro/README.md`](../.maestro/README.md) for the flows, the preconditions and the
conventions they follow. In short: **wait → assert → interact → assert the result**, and a
screenshot is never an assertion.

```bash
export JAVA_HOME="/Applications/WebStorm.app/Contents/jbr/Contents/Home"
export PATH="$PATH:$HOME/.maestro/bin"
for f in .maestro/*.yaml; do maestro test "$f" || echo "FAILED: $f"; done
```

Run them one at a time. `maestro test .maestro/` runs the folder concurrently against one simulator
and one signed-in child, and reports failures that are pure interference.

---

## 3. The offline journey

```bash
./scripts/qa/offline-e2e.sh
```

It downloads a set online, reads the stored payload out of the simulator's data container and diffs
it against the bundled catalogue, turns the **Mac's Wi-Fi off** (the iOS simulator has no airplane
mode of its own and uses the host's network stack), runs the offline flows, then turns it back on and
syncs. The Wi-Fi is restored by an `EXIT` trap even if a flow fails.

**Why the disk check matters more than the screens do:** all 27 sets are bundled inside the app as
demo material, so a set renders offline whether or not the download is read. Cards on screen with the
network down is therefore not evidence. The evidence is the payload on disk, the fact that its option
ordering differs from the bundle (the server's rows were re-ordered to break positional answer bias),
and every downloaded question carrying a `prompt`.

Do not report offline as working from a run where the network was not actually down. The script
verifies the disconnection with a live request before it starts, and aborts if the Mac turns out to
be on Ethernet.

---

## 4. API and authorisation

```bash
npm run qa:mint     # mint throwaway Clerk users
npm run qa:sec      # IDOR, the 12-hour no-repeat rule, sync idempotency, DB verification
npm run qa:cleanup  # ALWAYS
```

These probe the dev server by default. Before a release, point them at production and run them
again — an authorisation rule that holds locally and not in production has not been tested.

---

## 5. Accessibility

`npm run check:symbols` is a build-time guard, not a test: it proves every SF Symbol goes through
`@/components/symbol`, which keeps symbol names out of button labels. It cannot tell you whether a
label is *meaningful*.

Dump the hierarchy to see what VoiceOver would read:

```bash
maestro hierarchy > /tmp/gokid-hierarchy.txt
```

Then actually turn VoiceOver on (Settings → Accessibility → VoiceOver, or ⌘F5 on a connected device)
and swipe through sign-in, welcome, add-child, the study session, the quiz, the parent gate and
delete-account. Reading the tree tells you what the labels say; only using it tells you whether the
focus order makes sense and whether a control can be reached at all.

---

## 6. What a device pass cannot cover

State it, every time, rather than letting silence imply coverage:

- **The production build.** Everything above runs a Debug bundle from Metro. A Release build embeds
  the bundle, reads `EXPO_PUBLIC_API_URL` instead of Metro's `hostUri`, strips dev-only code and
  enables the React Compiler's production output. It is a separate test target.
- **A real device.** The simulator has no cellular radio, no real Keychain hardware, no App Store
  receipt and no thermal or memory pressure worth the name.
- **TestFlight and distribution.** Blocked on Apple Developer Program enrolment.
