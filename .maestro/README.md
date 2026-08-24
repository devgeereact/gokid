# Maestro flows

Twenty-one interaction flows against the iOS simulator, run against the **already-signed-in** dev session
with the two real dev children (Jacob K, Isaac K). None of them clear state.

Read [`../docs/QA.md`](../docs/QA.md) first — in particular §0, the clean-start procedure. A flow run
against a stale Metro bundle is a statement about code that is no longer in the tree.

## Running them

Maestro needs a JRE, and there is no system Java on this machine. WebStorm ships one:

```bash
export JAVA_HOME="/Applications/WebStorm.app/Contents/jbr/Contents/Home"
export PATH="$PATH:$HOME/.maestro/bin"
maestro -v            # expect 2.8.0
```

Preconditions: a booted simulator with the dev client installed, and `npm start` running (port 5062).

```bash
maestro test .maestro/01-whos-studying-pick-child.yaml    # one flow
for f in .maestro/*.yaml; do maestro test "$f" || echo "FAILED: $f"; done
```

**Run them one at a time.** `maestro test .maestro/` executes the folder concurrently against a
single simulator, and the flows share one device and one signed-in child; a concurrent run reports
failures that are pure interference.

The offline flows (`17a`–`17e`) are **not** part of that loop. They need the network turned off
between steps, which Maestro cannot do — run them through their driver:

```bash
./scripts/qa/offline-e2e.sh
```

## The bar: wait → assert → interact → assert the result

A Maestro command succeeding means Maestro dispatched it. It does not mean the app did anything.
Four of these flows used to be `tap → tap → tap → screenshot`, and the worst of them —
the old flow 11 — tapped `Parent → Enter parent area → 1 → 2 → 3 → 4` and then took a picture. On a
device with no passcode yet, those four digits were the *first half* of a create-and-confirm pair, so
the flow ended sitting on "Confirm your passcode" having entered the parent area exactly never. It
passed every time.

So, for every interaction that matters:

1. `extendedWaitUntil` the screen or control that has to be there.
2. `assertVisible` something **only that screen renders**.
3. Tap.
4. Assert the *result* — and where a wrong outcome is plausible, `assertNotVisible` it too.

`takeScreenshot` is for a human reading the run afterwards. It is never the assertion.

### Assert on something unique to the destination

Three different screens in this app render the words "Parent area": the Parent tab, the passcode
gate, and the parent-content screen behind it. Asserting "Parent area" after unlocking would pass on
the screen the flow started from. The flows assert:

| Screen | Marker |
| --- | --- |
| Parent **tab** | "Your passcode keeps this side of the app for the grown-ups." |
| Gate, locked | "Enter your passcode." |
| Gate, first run | "Create a passcode" |
| Parent area | "Progress overview" |

The same trap sat inside the study session: its submit button and the answer-result screen's advance
button both carried the accessibility label "Next card", so a flow matching it could not tell a
working chain from one that had stalled and re-tapped the same control — and a screen reader
announced two different actions identically. The session control is now **"See result"**.

## Writing flows that survive a second run

Every failure found on 2026-08-19 was a flow encoding a one-shot world, not an app regression. The
four traps, all of them still live:

1. **Labels that depend on progress.** The Continue-card CTA is "Start studying" only until the
   child has opened the set, then "Carry on" (`study/index.tsx:346`). Match both.
2. **Set titles are not controls.** The Continue card is a plain `View`; only its button navigates.
   Tapping the title by regex "succeeds" and goes nowhere, and every later step then fails against a
   screen that never changed. Navigate by deep link — `gokid://lesson/y4-mult-div`,
   `gokid://quiz/instructions/<id>`, `gokid://download/<id>` — not by tapping through the dashboard.
3. **`assertVisible` is not a reliable proof of "on screen".** CTAs below the fold usually need a
   `scrollUntilVisible` first, often with `visibilityPercentage: 60` because a button flush with the
   bottom edge never reaches 100% — but the reverse also bites: a row inside a modal's scroll list
   that is *below* the fold still satisfies `assertVisible`, and the tap that follows lands on the
   sheet edge and is reported as a success. Flow 16 picks a birth year from the top of the list for
   exactly this reason.
4. **Match the accessibilityLabel, not the visible text.** A `Pressable` carrying
   `accessibilityRole="button"` + `accessibilityLabel` merges its child `Text` away, so the
   hierarchy exposes only the label: the lesson-screen button reads "Study session" but is tapped as
   "Start a study session" (`lesson/[id].tsx:176-183`), and the download CTA reads "Download set" but
   is tapped as "Download this set".

Flows that continue from another (05, 06, 13, 15, 16) start with `runFlow: <other>.yaml` rather than
assuming the previous flow's last screen is still on the device.

Idempotency is the bar. 12 removes an existing download before downloading again; 16 deletes a
leftover test child before creating one and deletes its own at the end. A flow that passes once and
then fails is worse than no flow.

## The quiz flows (03, 14, 17b) select by position, never by text

Quiz questions come from `/api/quiz` — shuffled per serving, and subject to the 12-hour no-repeat
rule, so a second run is served a different draw by design. Naming an option by its text works
exactly once, which is why an earlier 03 tapped "After lunch," and 14 asserted "Question 1 of 5".

All three use the `quiz-option-<i>` testID on the option rows (`quiz/[id].tsx`), which is the only
content-independent handle on a row. 14 reads the label back with `copyTextFrom` before tapping and
asserts the same row still carries it afterwards — the invariant a re-shuffle breaks.

The passcode keypad has the same problem for the opposite reason: a digit is a one-character label,
and matching "1" as text also matches the "1 tries left" line the gate renders above the pad. Tap
keys by `passcode-key-<n>`.

## The flows

| # | What it covers |
| --- | --- |
| 01 | Who's studying → pick a child → study home |
| 02 | Set detail → flashcards → flip → Tricky/Got it → deck complete |
| 03 | Practice quiz, instructions through results |
| 04 | Study session → answer result, six cards, every transition asserted |
| 05 | Session summary → set result (continues 04) |
| 06 | The set detail reflects a finished session (continues 13) |
| 07 | Progress tab reflects the child's record |
| 08 | Cold relaunch: signed in, progress kept, **parent area locked again** |
| 09 | Switching child switches the record with it |
| 10 | The gate stands in front of a second child too |
| 11 | Parent gate: create *or* enter the passcode, then prove the parent area opened |
| 12 | Download a set and verify it through the UI |
| 13 | Regression: study-session mode persists (P0-6) |
| 14 | Regression: the answer recorded equals the answer tapped (P0-5) |
| 15 | Passcode **rejection**: wrong code refused, attempts count down, right code still works |
| 16 | Child CRUD: create → read across a relaunch → update → delete, and where delete lands |
| 17a | Online: download a set, confirm the payload |
| 17b | **Offline**: study, flashcards and quiz on the downloaded payload |
| 17c | Reconnect: the banner clears and the work syncs |
| 17d | **Offline**: the things that cannot work say so, and none of them lie |
| 17e | **Offline**: a save that cannot happen is stated, and the form keeps what was typed |

## What the suite still cannot cover

- **Sign-in.** Every flow assumes an existing SSO session. Apple and Google sign-in open a system
  sheet that Maestro cannot drive, so first-run authentication is a manual step.
- **VoiceOver.** `maestro hierarchy` shows what the labels say; only VoiceOver shows whether the
  focus order and reachability work. See `docs/QA.md` §5.
- **The production build.** These run a Debug bundle served by Metro. A Release build is a separate
  target — see `docs/QA.md` §6.
