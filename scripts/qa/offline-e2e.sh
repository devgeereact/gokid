#!/usr/bin/env bash
#
# The offline journey, end to end, with the network genuinely off.
#
#   online -> download -> verify the payload on disk -> NETWORK OFF -> cold launch ->
#   study, flashcards, quiz -> the things that cannot work say so -> NETWORK ON -> sync
#
# Why this is a shell script and not a Maestro flow: Maestro cannot change a Mac's network, and the
# iOS simulator has no airplane mode of its own — it uses the host's stack. Turning the Mac's Wi-Fi
# off is the only way to make the simulator genuinely offline. `simctl` has no equivalent.
#
# It also does the part no UI flow can do: reads the downloaded file out of the simulator's data
# container and diffs it against the bundled catalogue. Every set ships inside the app as demo
# material, so cards rendering with the network down does NOT by itself prove the download is being
# read — the bundle looks identical. The disk check is what closes that hole.
#
#   ./scripts/qa/offline-e2e.sh
#
# Requires: a booted simulator with the app installed, Maestro on PATH, and jq.
#
# AND, for a dev-client run, Metro started on LOOPBACK:
#
#   EXPO_PACKAGER_HOSTNAME=127.0.0.1 EXPO_PUBLIC_API_URL=https://gokid.expo.app \
#     npx expo start --port 5062
#
# By default Expo advertises this Mac's LAN address, the dev client loads its bundle over Wi-Fi, and
# turning the Wi-Fi off stops the app from starting at all — every offline flow then fails on the
# first screen for a reason that has nothing to do with offline support. Loopback survives the
# interface going down, so the bundle keeps loading while the API genuinely does not.
#
# Use EXPO_PACKAGER_HOSTNAME, NOT `--host localhost`: that flag binds Metro to `[::1]` only, while
# the dev client asks for `http://127.0.0.1:5062`, and the app then cannot start even with the Wi-Fi
# ON. The variable changes only the advertised host; Metro still listens on every interface.
# Leaves the Wi-Fi ON — including if a flow fails, via the EXIT trap.

set -uo pipefail

APP_ID="com.gokid.app"
FLOWS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.maestro" && pwd)"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

say() { printf "\n\033[1m== %s\033[0m\n" "$*"; }
die() { printf "\n\033[31mFAIL: %s\033[0m\n" "$*" >&2; exit 1; }

# --------------------------------------------------------------------------- preconditions
command -v maestro >/dev/null || die "maestro is not on PATH (export PATH=\"\$PATH:\$HOME/.maestro/bin\")"
command -v jq >/dev/null || die "jq is not installed (brew install jq)"
[ -n "${JAVA_HOME:-}" ] || echo "  note: JAVA_HOME unset — Maestro needs a JRE, e.g. /Applications/WebStorm.app/Contents/jbr/Contents/Home"

xcrun simctl list devices booted | grep -q "Booted" || die "no booted simulator"
CONTAINER="$(xcrun simctl get_app_container booted "$APP_ID" data 2>/dev/null)" \
  || die "$APP_ID is not installed on the booted simulator"

# The Wi-Fi interface, resolved rather than assumed — it is not always en0.
WIFI_IF="$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2; exit}')"
[ -n "$WIFI_IF" ] || die "could not find a Wi-Fi interface"

restore_network() {
  networksetup -setairportpower "$WIFI_IF" on >/dev/null 2>&1
  echo "  network restored on $WIFI_IF"
}
trap restore_network EXIT

DOWNLOADS="$CONTAINER/Documents/downloads"
SET_ID="y4-states-of-matter"
API_ORIGIN="${GOKID_API_ORIGIN:-https://gokid.expo.app}"

# THE PRECONDITION THAT MAKES THIS TEST MEAN ANYTHING.
#
# In development `src/lib/api.ts` falls back to Metro's `hostUri` — localhost — and loopback survives
# the Wi-Fi going off. An app pointed at localhost stays fully online with the network down, so every
# assertion below would pass without proving one thing. The dev server has to be started with the
# production origin inlined:
#
#   EXPO_PUBLIC_API_URL=https://gokid.expo.app npx expo start --port 5062
#
# (or run against a release build, where the value is compiled in). This checks the bundle Metro is
# actually serving rather than trusting the caller to have remembered.
if lsof -ti:5062 >/dev/null 2>&1; then
  say "0/6  Checking the app is pointed at $API_ORIGIN, not at Metro"
  BUNDLE_URL="http://localhost:5062/src/lib/api.bundle?platform=ios&dev=true"
  # Written to a file rather than piped into `grep -q`: `grep -q` exits on the first match, curl then
  # dies of SIGPIPE, and `pipefail` turns that into a failed pipeline — a false negative that looks
  # exactly like a misconfigured dev server.
  BUNDLE_TMP="$(mktemp)"
  curl -s --max-time 300 "$BUNDLE_URL" -o "$BUNDLE_TMP" || true
  if grep -q "$API_ORIGIN" "$BUNDLE_TMP"; then
    rm -f "$BUNDLE_TMP"
    echo "  the served bundle inlines $API_ORIGIN"
  else
    rm -f "$BUNDLE_TMP"
    die "the bundle Metro is serving does not contain $API_ORIGIN — it will fall back to localhost and stay online with the Wi-Fi off.
     Restart the dev server as:  EXPO_PUBLIC_API_URL=$API_ORIGIN npx expo start --port 5062 --clear
     then reload the app before re-running this script."
  fi
fi

# --------------------------------------------------------------------------- 1. download, online
say "1/6  Download the set while online"
maestro test "$FLOWS/17a-offline-download.yaml" || die "17a — the set did not download"

# --------------------------------------------------------------------------- 2. the payload on disk
say "2/6  Verify the stored payload"
PAYLOAD="$DOWNLOADS/$SET_ID.json"
[ -f "$PAYLOAD" ] || die "no file at $PAYLOAD — the UI said 'Saved for offline use' and nothing was written"

echo "  $(wc -c < "$PAYLOAD" | tr -d ' ') bytes at $PAYLOAD"

# Every field the offline quiz needs. `prompt` is the one that was missing: downloads used to store
# {id, kind, payload} — option lists and an answer index with no question to ask.
jq -e '.set.id and (.cards | length > 0) and (.quiz | length > 0)' "$PAYLOAD" >/dev/null \
  || die "payload has no set / cards / quiz"

MISSING_PROMPTS="$(jq '[.quiz[] | select((.prompt // "") == "")] | length' "$PAYLOAD")"
[ "$MISSING_PROMPTS" = "0" ] || die "$MISSING_PROMPTS downloaded question(s) have no prompt — an unplayable offline quiz"

jq -e '[.quiz[] | has("id") and has("kind") and has("prompt") and has("payload")] | all' "$PAYLOAD" >/dev/null \
  || die "a downloaded question is missing one of id / kind / prompt / payload"

echo "  cards:     $(jq '.cards | length' "$PAYLOAD")"
echo "  questions: $(jq '.quiz | length' "$PAYLOAD")  (prompts present on all)"

# Is this the SERVER's copy, or did the app write the bundle back to disk? The two differ in option
# ORDER — the seeded rows were re-ordered to break positional answer bias — so a payload whose option
# arrays match the catalogue's exactly did not come from the API.
node --import tsx --import "$REPO/scripts/asset-hook.mjs" -e "
  const fs = await import('node:fs')
  const { STUDY_SETS } = await import('$REPO/src/lib/study.ts')
  const stored = JSON.parse(fs.readFileSync('$PAYLOAD', 'utf8'))
  const bundled = STUDY_SETS.find((s) => s.id === '$SET_ID')
  const storedOptions = stored.quiz.filter((q) => q.kind === 'mcq').map((q) => (q.payload.options || []).join('|'))
  const bundledOptions = bundled.quiz.map((q) => q.options.join('|'))
  const identical = storedOptions.length === bundledOptions.length && storedOptions.every((o, i) => o === bundledOptions[i])
  console.log(identical
    ? '  WARNING: the stored payload is byte-identical to the bundle in option order — cannot distinguish disk from bundle by content'
    : '  stored payload differs from the bundle (server option order) — offline rendering is attributable to the download')
" || die "could not compare the stored payload with the catalogue"

# --------------------------------------------------------------------------- 3. network off
say "3/6  Turning Wi-Fi OFF on $WIFI_IF"
networksetup -setairportpower "$WIFI_IF" off || die "could not turn the Wi-Fi off"
sleep 3
# Prove it, rather than trusting the command. A test that believes it is offline and is not proves
# nothing at all.
if curl -s --max-time 6 -o /dev/null $API_ORIGIN/api/sets; then
  die "$API_ORIGIN is still reachable with the Wi-Fi off — is this Mac on Ethernet? Disconnect it and re-run."
fi
echo "  confirmed: $API_ORIGIN is unreachable"

# --------------------------------------------------------------------------- 4. offline flows
say "4/6  Offline: study, flashcards, quiz"
maestro test "$FLOWS/17b-offline-study.yaml"; OFFLINE_STUDY=$?

say "5/6  Offline: the honest failures"
maestro test "$FLOWS/17d-offline-honest-failures.yaml"; OFFLINE_HONEST=$?
maestro test "$FLOWS/17e-offline-failed-save.yaml"; OFFLINE_SAVE=$?

# --------------------------------------------------------------------------- 5. network on
say "6/6  Turning Wi-Fi back ON and syncing"
networksetup -setairportpower "$WIFI_IF" on || die "could not turn the Wi-Fi back on"
# Wi-Fi reassociation, DHCP and DNS take longer than the interface coming up. 60s was not enough on
# this machine; give it three minutes before calling it a failure.
for _ in $(seq 1 60); do
  curl -s --max-time 4 -o /dev/null $API_ORIGIN/api/sets && break
  sleep 3
done
curl -s --max-time 6 -o /dev/null $API_ORIGIN/api/sets || die "network did not come back"
echo "  connectivity restored"

maestro test "$FLOWS/17c-reconnect-sync.yaml"; RECONNECT=$?

# --------------------------------------------------------------------------- result
say "Result"
printf "  offline study/flashcards/quiz : %s\n" "$([ $OFFLINE_STUDY -eq 0 ] && echo PASS || echo FAIL)"
printf "  offline honest failures       : %s\n" "$([ $OFFLINE_HONEST -eq 0 ] && echo PASS || echo FAIL)"
printf "  offline failed-save feedback  : %s\n" "$([ $OFFLINE_SAVE -eq 0 ] && echo PASS || echo FAIL)"
printf "  reconnect and sync            : %s\n" "$([ $RECONNECT -eq 0 ] && echo PASS || echo FAIL)"

[ $OFFLINE_STUDY -eq 0 ] && [ $OFFLINE_HONEST -eq 0 ] && [ $OFFLINE_SAVE -eq 0 ] && [ $RECONNECT -eq 0 ]
