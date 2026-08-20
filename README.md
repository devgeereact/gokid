# GoKid

An AI-powered flashcard and quiz app for UK primary school children (Reception–Year 6).

A parent signs in, creates a profile for each child with their year group, and the app serves study
sets pinned to actual UK National Curriculum learning objectives — not generic "age-appropriate"
content. Cards are illustrated, quizzes are scored, and per-card mastery drives spaced repetition so
the app resurfaces what each child is weak on.

Children never authenticate. They are profiles under a parent, selected on a "who's studying?"
screen. The parent is the account holder; a child profile holds only a first name and a year group.
Keeping children out of the identity system entirely is what allows that minimisation, and it avoids
depending on under-13s having Google or Apple accounts, which most do not.

---

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Expo SDK 57, React Native 0.86, React 19.2 |
| Routing | `expo-router` — file-based, routes in `src/app/` |
| Styling | NativeWind 4 + Tailwind 3 (`className` only; tokens in `tailwind.config.js`) |
| Auth | Clerk (`@clerk/expo` v3) — Apple + Google SSO only, no email/password |
| Database | Neon Postgres via `@neondatabase/serverless` (HTTP driver), server-side only |
| ORM | Drizzle — schema in `src/db/schema.ts`, migrations in `drizzle/` |
| Errors | `@sentry/react-native` |

**The client never touches Postgres.** All server access goes through Expo Router API routes
(`src/app/api/*+api.ts`), which own the Drizzle connection. Server secrets carry no `EXPO_PUBLIC_`
prefix, so Metro never inlines them into the app bundle.

Full rules, forbidden actions and the definition of done: **[`AGENTS.md`](AGENTS.md)**.
Architecture that only becomes visible after reading several files: **[`CLAUDE.md`](CLAUDE.md)**.

---

## Getting started

```bash
npm install
cp .env.example .env     # then fill it in — see docs/LAUNCH.md §2
npm start                # dev server on port 5062
```

This project uses native modules, so **Expo Go will not work**. You need a dev client build:

```bash
npm run ios              # or: npm run android
```

> `npx expo run:ios` mis-targets the host Mac as a device here and fails on code signing. To run on
> the simulator, build and install directly — see [`CLAUDE.md`](CLAUDE.md) for the exact command.
> Do **not** build with `CODE_SIGNING_ALLOWED=NO`: it produces empty entitlements, which breaks the
> Keychain (`OSStatus -34018`) and hangs the app on the splash while Clerk never loads.

---

## Commands

```bash
npm start            # dev server (port 5062)
npm run ios          # dev client build — NOT Expo Go
npm run android
npm run lint
npx tsc --noEmit     # must pass before any task is "done"

npm run db:generate  # new migration from src/db/schema.ts (needs a TTY)
npm run db:migrate   # apply migrations to DATABASE_URL
npm run db:studio
npm run db:ping      # verify the Neon connection is live
npm run keys:check   # validate the API keys in .env

npm run check:content # curriculum strand coverage + quiz answer-position bias
npm run qa:sec        # security regression suite (IDOR, no-repeat, sync replay)
npm run qa:cleanup    # ALWAYS run after qa:sec — deletes the throwaway Clerk users
```

### Testing

There is no unit test suite yet. What exists:

- **`.maestro/`** — 14 interaction flows (14/14 passing). Requires Maestro installed.
- **`scripts/qa/`** — 7 API and security probes against a live dev server and database.
- **`scripts/hooks/`** — 4 rule-enforcement hooks wired in `.claude/settings.json`.

`npx tsc --noEmit` and `npm run lint` are the only gates that run everywhere, and both must pass.

---

## Documentation

| File | What it is |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Binding rules, tech stack, UI non-negotiables, forbidden actions |
| [`CLAUDE.md`](CLAUDE.md) | Architecture — routing guards, the `lib/*` data seam, client/server boundary |
| [`PLAN.md`](PLAN.md) | The original backend-first design plan, plus where the build diverged from it |
| [`docs/LAUNCH.md`](docs/LAUNCH.md) | **Production readiness — current blockers and the deploy sequence** |
| [`docs/README.md`](docs/README.md) | Index of everything under `docs/` |
| [`design/`](design/) | Visual source of truth. `design/gokid-screens.md` is the screen inventory with build status |

---

## Status

**Not yet shipped.** The client is built and audited; the API has never run outside the Metro dev
server. Three P0s block submission — see [`docs/LAUNCH.md`](docs/LAUNCH.md) §1.
