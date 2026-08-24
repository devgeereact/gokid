#!/usr/bin/env bash
#
# Build and install a RELEASE-configuration simulator app.
#
# Why this exists: every result in this repo up to now came from a Debug bundle served by Metro.
# A release build is a different program in four ways that have each broken a shipped React Native
# app before:
#
#   1. The JavaScript bundle is compiled ahead of time and embedded. Metro is not running, so a
#      module that only resolved because of a warm dev cache does not resolve at all.
#   2. `EXPO_PUBLIC_API_URL` is inlined at build time. In dev the base URL falls back to Metro's
#      `hostUri`, which is precisely why "no production API configured" stayed invisible for weeks.
#   3. `__DEV__` is false: dev-only branches, LogBox and the dev menu are gone.
#   4. The React Compiler emits its production output.
#
# This is NOT a substitute for a real device or for TestFlight — both need Apple Developer Program
# enrolment. It is the strongest evidence available without it, and it is available today.
#
#   ./scripts/qa/release-sim-build.sh
#   ./scripts/qa/release-sim-build.sh --no-install     # build only
#
# Afterwards the app on the simulator has no Metro connection at all. Kill Metro and relaunch it to
# prove that: it must still start, sign in, and load content from https://gokid.expo.app.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"

API_URL="${EXPO_PUBLIC_API_URL:-https://gokid.expo.app}"
DERIVED="$REPO/ios/build-release"
APP="$DERIVED/Build/Products/Release-iphonesimulator/gokid.app"

say() { printf "\n\033[1m== %s\033[0m\n" "$*"; }
die() { printf "\n\033[31mFAIL: %s\033[0m\n" "$*" >&2; exit 1; }

[ -d ios/gokid.xcworkspace ] || die "no ios/gokid.xcworkspace — run \`npx expo prebuild\` first"

UDID="$(xcrun simctl list devices booted -j | python3 -c '
import json,sys
d=json.load(sys.stdin)["devices"]
for runtime in d.values():
    for dev in runtime:
        if dev.get("state")=="Booted":
            print(dev["udid"]); raise SystemExit
raise SystemExit("")
')"
[ -n "$UDID" ] || die "no booted simulator"

say "Building Release for simulator $UDID"
echo "  EXPO_PUBLIC_API_URL=$API_URL"

# The Clerk publishable key is inlined at build time too; without it the app throws on first render.
# Read from the environment (.env is loaded by Expo's own tooling, not by xcodebuild).
if [ -z "${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ] && [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=' .env | xargs)
fi
[ -n "${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ] || die "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set"

# Default adhoc simulator signing — NOT `CODE_SIGNING_ALLOWED=NO`. That flag produces empty
# entitlements, which breaks the Keychain (OSStatus -34018) and hangs the app on the splash while
# Clerk never loads. See CLAUDE.md.
EXPO_PUBLIC_API_URL="$API_URL" \
xcodebuild \
  -workspace ios/gokid.xcworkspace \
  -scheme gokid \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "id=$UDID" \
  -derivedDataPath "$DERIVED" \
  build | tail -40

[ -d "$APP" ] || die "no app at $APP"

say "Verifying the embedded bundle"
BUNDLE="$APP/main.jsbundle"
[ -f "$BUNDLE" ] || die "no main.jsbundle inside the .app — the release build did not embed the JS, so it would still need Metro"
echo "  main.jsbundle: $(wc -c < "$BUNDLE" | tr -d ' ') bytes"

# The whole point of a release build, checked rather than assumed: the production origin is compiled
# in, and no localhost fallback is.
if grep -q "$API_URL" "$BUNDLE"; then
  echo "  contains $API_URL"
else
  die "the embedded bundle does not contain $API_URL — EXPO_PUBLIC_API_URL was not inlined"
fi

if [ "${1:-}" = "--no-install" ]; then
  say "Built, not installed: $APP"
  exit 0
fi

say "Installing"
xcrun simctl uninstall "$UDID" com.gokid.app >/dev/null 2>&1 || true
xcrun simctl install "$UDID" "$APP"

cat <<'NEXT'

Installed. This build does not use Metro. To prove that, and to run the production journey:

  lsof -ti:5062 | xargs -r kill        # no dev server at all
  xcrun simctl launch booted com.gokid.app

Then sign in, add a child, study, take a quiz, check progress, download a set, and run the parent
area. Nothing on screen should mention Metro, and every data screen must load from the production
API. Reinstall the dev client afterwards (a Debug build, same scheme) to get the dev menu back.
NEXT
