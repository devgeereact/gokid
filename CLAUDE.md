# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**`AGENTS.md` (imported above) is the authority on rules, the tech stack, UI non-negotiables, forbidden actions, and the definition of done. Read it first. This file adds the architecture that only becomes visible after reading several files, plus commands `AGENTS.md` does not cover. Do not duplicate the stack table or rules here.**

---

## Commands beyond AGENTS.md

`AGENTS.md` covers `npm start` / `ios` / `android` / `lint` and `npx tsc --noEmit`. Also:

```bash
npm run db:generate   # drizzle-kit generate — new migration from src/db/schema.ts
npm run db:migrate    # apply migrations to the DATABASE_URL Postgres
npm run db:studio     # drizzle-kit studio
npm run db:ping       # scripts/db-ping.mjs — verify the Neon connection is live
npm run keys:check    # scripts/keys-check.mjs — validate the API keys in .env
```

- **No test suite exists** (zero `*.test.*` / `*.spec.*` files). There is nothing to run for "a single test"; `npx tsc --noEmit` + `npm run lint` are the only automated gates, and both must pass (`AGENTS.md` §5).
- **`drizzle-kit generate` needs a TTY** for its rename-vs-drop prompt and hangs in a non-interactive shell. Either run it in a real terminal, or hand-author the migration SQL plus its `drizzle/meta/*_snapshot.json` and `_journal.json` entry, then confirm with `db:generate` reporting "No schema changes".
- **`npx expo run:ios` mis-targets the host Mac as a device** here and fails on code signing. To run on the simulator, build directly and install:
  ```bash
  xcodebuild -workspace ios/gokid.xcworkspace -scheme gokid -configuration Debug \
    -sdk iphonesimulator -destination 'id=<SIM_UDID>' -derivedDataPath ios/build
  xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/gokid.app
  ```
  A build made with `CODE_SIGNING_ALLOWED=NO` produces empty entitlements, which breaks the Keychain (`OSStatus -34018`) and hangs the app on the splash while Clerk never loads. Use the default adhoc simulator signing (no signing flags), not `CODE_SIGNING_ALLOWED=NO`.

## Routing and the three guards

File-based routing under `src/app/` (`expo-router`, `typedRoutes` on). The tree is organised by **route group**, and each group's `_layout.tsx` is a gate:

- `src/app/index.tsx` — entry fork on Clerk state: signed-out → `/intro` or `/sign-in`; signed-in with no child → `/add-child`; else → `/home`. Holds `<Splash />` while Clerk and stores rehydrate.
- `(auth)/` — sign-in. SSO only (Apple + Google via `useSSO`); there is no email/password.
- `(app)/_layout.tsx` — auth guard; redirects to `/sign-in` when signed out.
- `(app)/(tabs)/_layout.tsx` — the **native** tab bar (Study · Progress · Parent) via `expo-router/unstable-native-tabs`. Each tab (`study/`, `progress/`) nests its own `Stack` so the flow keeps the native tab bar.
- `(app)/(parent)/_layout.tsx` — the **passcode gate**. Renders `<ParentGate />` instead of the stack until unlocked, so every parent route (settings, subscription, children, analytics, …) is protected by construction, deep link or not.

Two distinct gates, do not conflate: the `(app)` guard is *authentication* (Clerk); the `(parent)` gate is a *4-digit passcode* (`lib/parent-passcode.ts` + `lib/parent-gate.ts`) that keeps a child out of the grown-up area. The passcode lives in SecureStore and re-locks on background/idle; forgot-passcode re-authenticates via Clerk SSO.

**Native-tab gotcha:** only a tab's *root* screen gets UIKit's automatic scroll inset. Screens *pushed* onto a tab's Stack must pad their own scroll content past the floating bar or the last row clips behind it — use `contentContainerClassName="pb-35 …"` (the `35` = 140px clearance token in `tailwind.config.js`). Root tab screens use `pb-6`.

## Data flow — the lib seam, and a partial migration

The central architectural fact: **`src/lib/*` is the data layer, and screens import from it, never fetch directly.** The backend (Neon Postgres + Drizzle + Expo Router API routes) is live, but **most `lib/*` modules still return demo/local data** — the migration to the API is deliberate and incomplete.

- **Demo/local seams** (e.g. `study.ts`, `subjects.ts`, `curriculum.ts`, `rewards.ts`): self-described stand-ins. `study.ts` states it is "the single seam to swap" when the content API lands. Screens call `useStudySets` / `getStudySet`, so swapping the source does not touch a screen.
- **Clerk-metadata seams** (`children.ts`, `active-child.ts`): children are stored on the parent's Clerk user under `unsafeMetadata`, not the demo layer and not (yet) the DB.
- **Live API seams** — only three modules cross the wire: `api.ts` (the client → API layer), `downloads.ts`, and `sync.ts`. Everything else is local.

When wiring a feature to the backend, the change belongs in the `lib/*` seam, not in screens.

## Client / server boundary

**The client never touches Postgres.** All server access goes through Expo Router API routes (`src/app/api/*+api.ts`), which own the Drizzle/Neon connection (`src/db/`). This is enforced by convention and by what is bundled:

- Server-only secrets (`CLERK_SECRET_KEY`, `DATABASE_URL`, `OPENROUTER_API_KEY`) are read as plain `process.env.*` inside `+api.ts` routes / `src/db` / `src/lib/openrouter.ts`. They carry **no** `EXPO_PUBLIC_` prefix, so Metro never inlines them into the app bundle. Client-safe values (Clerk publishable key, ImageKit) use `EXPO_PUBLIC_*`.
- Public content routes (`/api/sets`) need no auth. Progress routes (`/api/progress`) serve a *named child's record*, so they verify the Clerk token server-side (`src/db/auth.ts`) — a child id alone is never trusted. Admin routes (`/api/admin/*`) gate on `ADMIN_SEED_TOKEN` and fail closed.
- `src/lib/api.ts` derives its base URL from Metro's `hostUri` in dev, but a **release build reads `EXPO_PUBLIC_API_URL` and throws without it** — a production build with that unset dies on the first data screen.

## Subsystems worth knowing before editing

- **Spaced repetition** (`lib/reviews.ts`): a Leitner-box engine on interval ladder `[1,5,12,30,90]` days. It is the source of truth for mastery/progress everywhere; screens derive from a child's real review records, not authored percentages. `lib/sync.ts` pushes-then-pulls these to the server to survive device loss.
- **Entitlement** (`lib/subscription.ts`): the single seam for paid state, currently hardcoded to `free` because no billing SDK is installed. Every screen reads it rather than hardcoding a plan. Do not fake a purchased state.
- **AI question generation** (`lib/openrouter.ts` → `api/admin/generate`): server-only, OpenRouter via an admin route. No model call runs on the client.
- **Design honesty principle** (recurring across the codebase and its comments): a screen must not present a control that cannot do what it implies. Placeholders say so (the paywall states it cannot take payment; "Restore purchases" reports nothing to restore). Preserve this when touching billing, downloads, notifications, or AI — do not wire a button to a no-op to make a screen look complete.

## Design and build status

- Visual source of truth is the mockups in `design/`. `design/gokid-screens.md` is the full screen inventory with per-item ✅/🟡 build status.
- `docs/Report.md` is the current diagnostic + launch-readiness report (smoke test, expo-doctor, launch blockers). The critical pre-launch blockers live there: deploy the API server + set `EXPO_PUBLIC_API_URL`, Apple Developer enrolment, and `eas.json` (none exist yet).
