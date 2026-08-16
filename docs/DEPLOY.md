# Deploying GoKid — the last P0

`docs/qa/2026-08-14/REPORT.md` P0-4 and `docs/Report.md` both name the same blocker, unchanged since
20 July: **a release build cannot load any data, because `EXPO_PUBLIC_API_URL` is unset.**
`src/lib/api.ts:19` throws without it. In development nothing is wrong, because the base URL falls
back to Metro's `hostUri` — which is exactly why this has stayed invisible. In TestFlight or the App
Store, every content, sync and progress screen dies immediately after the splash. That is a Guideline
2.1 rejection a reviewer hits within two minutes.

This file records what has been prepared and what only you can do.

## Prepared in this repo (15 Aug 2026)

| Item | State |
| --- | --- |
| `eas.json` | **Created.** `development` (simulator dev-client), `preview` and `production` profiles, `appVersionSource: "remote"`, `autoIncrement` on production |
| `ios.buildNumber` | **Added** (`"1"`) |
| `android.versionCode` | **Added** (`1`) |
| `ITSAppUsesNonExemptEncryption` | **Declared `false`** in `ios.infoPlist`. Correct for standard HTTPS only; it stops every submission prompting manually |
| `android.permission.RECORD_AUDIO` | **Removed.** Verified unused — no audio API anywhere in `src/`. On a children's app, an undeclared-purpose sensitive permission is exactly what reviewers and regulators flag |

## What still has to happen, in order

1. **Deploy the API server.** `app.json` sets `web.output: "server"`, so the Expo Router API routes
   need a hosted Node runtime. `PLAN.md` names EAS Hosting, and warns of the constraint that shapes
   everything: **EAS Hosting runs on Cloudflare Workers (workerd) with `nodejs_compat`, not Node.**
   The Neon HTTP driver is already the right choice for that; anything added later that assumes real
   Node APIs will not be.
   ```bash
   npx eas deploy            # from the repo root, after `npx eas login`
   ```
2. **Set `EXPO_PUBLIC_API_URL`** to the deployed origin — in `eas.json`'s `preview` and `production`
   `env` blocks (both currently `https://REPLACE-ME.example.com`, deliberately obvious), and in `.env`
   for any local release-mode testing.
3. **Set the server-side secrets on the host**: `DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENROUTER_API_KEY`,
   and — this one is not optional in production — **`ADMIN_TOKEN`**. `src/db/admin-auth.ts` opens the
   admin routes when `ADMIN_TOKEN` is unset *and* `NODE_ENV === "development"`. The guard is written
   correctly (it tests `=== "development"`, not `!== "production"`, so a preview deploy stays closed),
   but setting the token removes the dependency on `NODE_ENV` being what you expect.
4. **Seed the deployed database.** `POST /api/admin/seed` with the `x-admin-token` header. There is no
   migration hook, deploy step or app-boot call that does this — a fresh environment starts with an
   empty catalogue and no in-product way to fill it.
5. **Apply migrations to that database** (`npm run db:migrate`). Migration `0004` had been committed
   but never applied to the dev database, which silently disabled `/api/sets/:id`, `/api/quiz` and the
   admin routes — and with them offline download — until 15 Aug. Check `drizzle.__drizzle_migrations`
   row count against the file count in `drizzle/` after every deploy.
6. **Enrol in the Apple Developer Program.** Blocks device builds, TestFlight and billing. Nothing in
   steps 7–8 can start without it.
7. **First EAS build → TestFlight, pointed at the deployed API.** This is also the first time the
   backend is exercised from a compiled client rather than the Metro dev server.
8. **Submit** with reviewer notes explaining authentication: the app is SSO-only (Apple + Google), with
   no email/password, so a reviewer needs explicit instructions to get past sign-in.

## Verify before you call it deployed

```bash
curl -s https://<your-host>/api/health          # {"ok":true,"db":"connected","tables":11,...}
curl -s https://<your-host>/api/sets | head -c 200
curl -si https://<your-host>/api/progress       # MUST be 401, not 200
curl -si -X POST https://<your-host>/api/admin/seed   # MUST be 401 without the token
```

The third and fourth are the ones worth being fussy about: a deployment that serves child progress or
an open admin write is a worse outcome than a deployment that does not work at all.

## Not covered here

Category and age rating, and the App Privacy / Data Safety questionnaires — which must match what
`src/app/data-usage.tsx` tells parents (no ad SDK, no analytics SDK, no third-party tracker; true as
of today, verified against `package.json`). `docs/Report.md` §4 also recommends **not** enrolling in
Apple's Kids Category, because the required adult SSO sign-in is incompatible with its restrictions —
submit as Education with a parental gate, which is what is actually built.
