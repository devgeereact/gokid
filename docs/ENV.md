# Environment variables

I could not create a `.env` file directly — this workspace denies writes to `.env*` paths, which is
the correct setting and I have not tried to work around it. Paste from here instead.

**Your existing `.env` is untouched and already holds working values for sections 1–4.** Only
section 5 is missing, and it is what blocks the deploy (P0-4). The quickest path is to append those
three lines to your existing `.env` — no need to rebuild the file.

## What is already set (13 variables, verified by name on 15 Aug 2026)

| Variable | Reaches the device? | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Publishable by design |
| `CLERK_SECRET_KEY` | **no** | `src/db/auth.ts` refuses to serve the progress API without it — fails closed |
| `DATABASE_URL` | **no** | The client never talks to Postgres; it goes through API routes |
| `OPENROUTER_API_KEY` / `_BASE_URL` / `_MODEL` / `_FALLBACK_MODEL` | **no** | Spends real money; reached only via `/api/admin/generate` |
| `EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT` / `_PUBLIC_KEY` | yes | |
| `IMAGEKIT_PRIVATE_KEY` | **no** | |
| `SENTRY_AUTH_TOKEN` | **no** | |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | **no** | |

The `EXPO_PUBLIC_` prefix is the whole mechanism: Metro inlines those into the app bundle and leaves
everything else on the server. Never add the prefix to a secret.

## Append these three to `.env`

```dotenv
# (a) Expo access token, so a deploy can run without an interactive login.
#     https://expo.dev → Account settings → Access tokens → Create token.
#     Alternative: leave this out and run `npx eas login` interactively instead.
EXPO_TOKEN=

# (b) Admin route guard. SET THIS BEFORE DEPLOYING.
#     Without it, /api/admin/seed and /api/admin/generate stay closed only because
#     src/db/admin-auth.ts finds NODE_ENV !== "development" on the host. That guard is written
#     correctly, but /api/admin/generate spends OpenRouter credit on every call, so an open one is a
#     billable hole as well as a data risk. Setting the token removes the dependency on NODE_ENV.
#     Generate one with:  openssl rand -hex 32
ADMIN_TOKEN=

# (c) The deployed API origin. Circular on purpose: leave empty until the first deploy returns a
#     hostname, then set it here AND in eas.json's preview/production env blocks.
#     In development this is unset and the app derives the URL from Metro's hostUri — which is
#     precisely why its absence stayed invisible. A RELEASE build throws at src/lib/api.ts:19
#     without it and every data screen dies right after the splash. This is docs/Report.md's
#     standing P0.
EXPO_PUBLIC_API_URL=
```

## Then

1. `npm i -g eas-cli` (not currently installed — `npx eas` fails with "could not determine
   executable to run").
2. `npx eas deploy` — see [DEPLOY.md](DEPLOY.md) for the full sequence, including the
   EAS-Hosting-runs-on-workerd-not-Node constraint from `PLAN.md`.
3. Set the same server-side secrets on the host: `DATABASE_URL`, `CLERK_SECRET_KEY`,
   `OPENROUTER_API_KEY`, `ADMIN_TOKEN`.
4. Fill `EXPO_PUBLIC_API_URL` here and in `eas.json`, then verify with the four curls in
   [DEPLOY.md](DEPLOY.md) — two of which assert that something must **fail**: `/api/progress` must
   return 401, and `/api/admin/seed` must return 401 without the token.

## A note on `.env.example`

The repo has one, but this workspace denies me read access to `.env*`, so I have not checked whether
it lists these three variables. Worth confirming it does — it is the file a new contributor copies,
and an example file missing `EXPO_PUBLIC_API_URL` is how this blocker survived from 20 July to now.
