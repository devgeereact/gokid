# Launching GoKid

**Last verified against the codebase:** 20 August 2026, HEAD `21c2d5a`.

This is the single launch document. It replaces the four that used to cover the same ground and
disagreed with each other (`Report.md`, `DEPLOY.md`, `ENV.md`, `HANDOFF.md`). The July diagnostic
report is kept for history in [`archive/2026-07-20-diagnostic-report.md`](archive/2026-07-20-diagnostic-report.md);
most of what it flagged is now fixed, so do not act on it directly.

---

## 1. Where the project actually stands

**Not shippable yet, and the reason is deployment, not the app.** The client is built, audited and
proven on a simulator. Nothing server-side has ever run outside the Metro dev server.

### Done and verified

| Item | Evidence |
| --- | --- |
| `eas.json` | Exists — `development` / `preview` / `production` profiles, `appVersionSource: "remote"`, `autoIncrement` on production |
| `ios.buildNumber` / `android.versionCode` | `"1"` / `1` in `app.json` |
| `ITSAppUsesNonExemptEncryption` | Declared `false` in `ios.infoPlist` — stops every submission prompting manually |
| Unused `RECORD_AUDIO` permission | Removed. `android.permissions` is `[]` |
| Tab-bar clipping | Fixed across all 12 pushed screens (`4e1d9bf`) |
| Interaction testing | 14 Maestro flows in `.maestro/`, 14/14 passing twice consecutively |
| Security regression suite | 7 scripts in `scripts/qa/` — IDOR, 12-hour no-repeat, published-only, sync replay, DB verify, cleanup |
| Server-side erasure | `DELETE /api/children/:clientId` and `DELETE /api/account`; cascade verified 1/1/1 → 0/0/0 |
| Rule enforcement | 4 hooks in `scripts/hooks/`, wired in `.claude/settings.json` |

### Blocking submission

| # | Blocker | Why it is fatal |
| --- | --- | --- |
| **P0-1** | API server never deployed; `EXPO_PUBLIC_API_URL` unset | `src/lib/api.ts:21` throws `"No API base URL"` in any release build. In dev the base URL falls back to Metro's `hostUri`, which is exactly why this has stayed invisible. In TestFlight every content, sync and progress screen dies immediately after the splash — a Guideline 2.1 rejection a reviewer hits within two minutes |
| **P0-2** | `eas.json` still carries `https://REPLACE-ME.example.com` in both `preview` and `production` | Deliberately obvious placeholder; a build made today points at nothing |
| **P0-3** | Apple Developer Program not enrolled | Blocks device builds, TestFlight and any future billing. ~24–48h to approve, $99/yr — start it early even if the deploy is not ready |

`ADMIN_TOKEN` **is now set locally** (it appears in Expo's exported variable list) and must be set on
the deploy host too. `src/db/admin-auth.ts` opens the admin routes when `ADMIN_TOKEN` is unset *and*
`NODE_ENV === "development"`. The guard is written correctly — it tests `=== "development"`, not
`!== "production"`, so a preview deploy stays closed — but `POST /api/admin/generate` spends
OpenRouter credit on every call, so relying on the host's `NODE_ENV` rather than the token is a
billable hole as well as a data risk.

### Should be fixed before or shortly after launch

| # | Item | Note |
| --- | --- | --- |
| **P1-1** | No CI | `.github/` does not exist. Nothing keeps `tsc` and `lint` green except a human remembering |
| **P1-2** | No unit tests | Zero `*.test.*` files. The spaced-repetition fold (`src/lib/reviews.ts`) and quiz scoring are pure functions and are the highest-value things to test — quiz scoring already shipped a P0 that reported 1/5 for a perfect run |
| **P1-3** | In-app child delete unproven | The server cascade is proven at API and database level. The in-app path has never been driven by a real tap. See §5 |
| **P1-4** | Sentry tracing vs the privacy copy | `src/app/_layout.tsx:30` sets `tracesSampleRate: 0.2` in production. `src/app/data-usage.tsx` tells parents there is no third-party analytics or tracking. Every Sentry *call site* is error-scoped, and `sendDefaultPii` is `false`, so the claim holds in spirit — but tracing does send navigation and timing telemetry. Either add a line to the copy or turn tracing off. Small now, large if a regulator reads it closely |

---

## 2. Environment variables

`.env` is not readable from this workspace (a deliberate permission rule), so the list below is by
name, verified against the code that reads each one.

### Already set — 14 variables

Verified by name on 20 Aug 2026 from the variable list Expo prints on every command. That list is
independent evidence: it shows what the runtime actually loaded, without reading a value.

| Variable | Reaches the device? | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Publishable by design |
| `CLERK_SECRET_KEY` | **no** | `src/db/auth.ts` refuses to serve the progress API without it — fails closed |
| `DATABASE_URL` | **no** | The client never talks to Postgres; it goes through API routes |
| `OPENROUTER_API_KEY` / `_BASE_URL` / `_MODEL` / `_FALLBACK_MODEL` | **no** | Spends real money; reached only via `/api/admin/generate` |
| `EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT` / `_PUBLIC_KEY` | yes | |
| `IMAGEKIT_PRIVATE_KEY` | **no** | |
| `SENTRY_AUTH_TOKEN` | **no** | |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | **no** | Present in `.env` but **Inngest is not installed** — see `PLAN.md` §Divergences |
| `ADMIN_TOKEN` | **no** | Gates `/api/admin/*`. Set locally; **still has to be set on the deploy host** |

The `EXPO_PUBLIC_` prefix is the whole mechanism: Metro inlines those into the app bundle and leaves
everything else on the server. **Never add the prefix to a secret.**

### Still missing — append these two

```dotenv
# (a) Expo access token, so a deploy can run without an interactive login.
#     https://expo.dev → Account settings → Access tokens → Create token.
#     Optional: `eas login` interactively does the same job for a human.
EXPO_TOKEN=

# (b) The deployed API origin. Circular on purpose: leave empty until the first deploy returns a
#     hostname, then set it here AND in eas.json's preview/production env blocks.
EXPO_PUBLIC_API_URL=
```

Add both to `.env.example` too, along with `ADMIN_TOKEN` — it is the file a new contributor copies, and an example file
missing `EXPO_PUBLIC_API_URL` is a plausible explanation for how P0-1 survived from 20 July onward.

---

## 3. The deploy, in order

`eas-cli` is installed (`eas-cli/22.0.0`). You are not logged in, and that prompt is interactive.

```bash
eas login          # or set EXPO_TOKEN in .env and skip this permanently
```

`app.json` carries `"owner": "gakinz"` and an EAS `projectId`, so use that account or one with
access to it.

### Step 1 — deploy the API

```bash
npx eas deploy
```

`app.json` sets `web.output: "server"`, so the Expo Router API routes need a hosted runtime.

> **The constraint that shapes everything:** EAS Hosting runs on Cloudflare Workers (workerd) with
> `nodejs_compat`, **not Node**. The Neon HTTP driver is already the right choice for that; anything
> added later that assumes real Node APIs will not be. Full rationale in `PLAN.md` §Architecture.

### Step 2 — set the hostname in three places

| Where | Key |
| --- | --- |
| `.env` | `EXPO_PUBLIC_API_URL=https://<host>` |
| `eas.json` → `build.preview.env` | replace `https://REPLACE-ME.example.com` |
| `eas.json` → `build.production.env` | replace `https://REPLACE-ME.example.com` |

### Step 3 — set the server-side secrets on the host

`DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENROUTER_API_KEY`, `ADMIN_TOKEN`.

On EAS these must be created with **`--visibility sensitive`**, not `secret` — variables marked
`secret` are not readable by API routes at runtime.

### Step 4 — migrate, *then* seed

Order matters. Seeding an unmigrated database fails.

```bash
npm run db:migrate                                              # against the deployed DATABASE_URL
curl -X POST https://<host>/api/admin/seed -H "x-admin-token: $ADMIN_TOKEN"
```

There is no migration hook, deploy step or app-boot call that seeds content — a fresh environment
starts with an empty catalogue and no in-product way to fill it.

**Check the migration count after every deploy.** Migration `0004` sat committed but unapplied for
weeks and silently disabled `/api/sets/:id`, `/api/quiz`, the admin routes and offline download.
Compare `drizzle.__drizzle_migrations` row count against the file count in `drizzle/` (5 today).

### Step 5 — verify, and two of these must FAIL

```bash
curl -s  https://<host>/api/health              # {"ok":true,"db":"connected","tables":11,...}
curl -s  https://<host>/api/sets | head -c 200  # non-empty catalogue
curl -si https://<host>/api/progress            # MUST be 401
curl -si -X POST https://<host>/api/admin/seed  # MUST be 401 without the token
```

The last two are the ones worth being fussy about. A deployment that serves child progress openly, or
that lets anyone trigger paid AI generation, is a worse outcome than one that does not work at all.

### Step 6 — first TestFlight build

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

This is also the first time the backend is exercised from a compiled client rather than the Metro dev
server. Expect that to surface something.

**Reviewer notes are not optional.** The app is SSO-only (Apple + Google), with no email/password, so
a reviewer who cannot get past sign-in will reject it. Tell them explicitly how to authenticate.

---

## 4. Decisions only you can make

**Kids Category — recommendation: do not enrol.** The required adult SSO sign-in is fundamentally
incompatible with the Kids Category's restrictions on sign-in flows and third-party SDKs. Submit as
**Education** with a parental gate — which is what is actually built — and a conventional age rating.

The UK Children's Code posture is genuinely strong for this stage: `sendDefaultPii: false` is
deliberate and commented with the ICO framework named, data lives in London (`eu-west-2`), child data
is limited to first name and year group, and the certificate-share and child-delete paths were both
gated citing the Children's Code specifically. See P1-4 above for the one loose thread.

**Billing.** There is no billing SDK. `useEntitlement()` honestly returns `free` and `useHasPlus()`
has zero call sites, so no feature is gated today. When you wire RevenueCat, the seam is
`src/lib/subscription.ts` and the `subscriptions` table already has the columns. `DELETE /api/account`
already erases that row, so the promise made to parents stays true once billing lands.

**A `taught` flag on curriculum objectives.** Today an objective describing content that no set
teaches is indistinguishable in the data from one that does. A boolean removes the ambiguity
permanently instead of relying on a written rule. Roughly half a day.

**App Privacy / Data Safety questionnaires** must match what `src/app/data-usage.tsx` tells parents
(no ad SDK, no analytics SDK, no third-party tracker — true as of today, verified against
`package.json`). Worth a CI check that fails if `package.json` gains an SDK without that copy being
updated; `scripts/hooks/privacy-claim.mjs` already does this locally.

---

## 5. Manual QA that still needs a human

| What | Why it needs you |
| --- | --- |
| **Type a child's name in Add a child** | Maestro could not get text into that field. The input is wired correctly (`add-child.tsx:422-427`, `value` + `onChangeText`), so this is very likely a simulator keyboard-focus quirk — but if text genuinely does not enter on a device it is a P1: a parent who cannot type a name cannot onboard. Two minutes to settle |
| **Delete a child, end to end** | Server-side erasure is proven at the API and database level. The in-app path has never been driven by a real tap. Add a throwaway child, delete it, confirm it disappears |
| **VoiceOver pass** | Label *coverage* is complete (31/31 images, ~20 newly-named controls). Focus order and announcement quality need a human ear, especially on the quiz |
| **Dynamic Type at large sizes** | Tile labels now wrap instead of truncating; worth eyeballing at the largest accessibility sizes |
| **Android, and a physical device** | Neither has ever been run. `app.json` pins portrait, so landscape is out of scope by design |

### Simulator state left behind

- **Parent passcode is `1234`** — none existed before; change or clear it.
- **Jacob K has real study progress** recorded from testing (flashcards and quizzes). Isaac is clean.
- Jacob's avatar was changed to 🐨 by a test worker and **restored to 🐻**; incident note in
  [`qa/2026-08-15/REPORT.md`](qa/2026-08-15/REPORT.md) §3c.
