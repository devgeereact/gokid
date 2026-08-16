# Handoff — what needs you, and how to do it

Everything in this list is blocked on a credential, a human tap, an Apple account, or a judgement
call. Everything that wasn't is already done and merged into `main` locally.

Ordered so that each step unblocks the next. **Steps 1–6 are the release path**; 7–9 are quality
work that can happen in parallel; 10 is decisions.

---

## 1. Push to GitHub — 30 seconds

My push was denied by the permission classifier, so `main` is merged locally but not on the remote.

```bash
cd ~/WebstormProjects/gokid
git push origin main
git push -u origin qa/audit-fixes-2026-08     # optional: keeps the branch for review
```

Nothing else in this list depends on it, but nothing is backed up until you do.

To let me push next time, add a Bash permission rule for `git push` in `.claude/settings.local.json`.

---

## 2. Log in to EAS — 2 minutes

`eas-cli` 22.0.0 is installed (I did that). You are not logged in, and the prompt is interactive.

```bash
eas login
```

`app.json` already carries `"owner": "gakinz"` and an EAS `projectId`, so use that account or one
with access to it.

**Alternative that removes the interactive step permanently:** create an access token at
expo.dev → Account settings → Access tokens, and add `EXPO_TOKEN=...` to `.env`. With that set, I can
run deploys without you.

---

## 3. Create ADMIN_TOKEN — 1 minute, and do it before deploying

```bash
openssl rand -hex 32
```

Add to `.env` as `ADMIN_TOKEN=<that value>`, and set the same value on the deploy host.

**Why it matters more than it looks.** `src/db/admin-auth.ts` opens the admin routes when
`ADMIN_TOKEN` is unset *and* `NODE_ENV === "development"`. The guard is correct as written, but with
no token you are relying on the host's `NODE_ENV` being exactly what you expect for
`POST /api/admin/generate` to stay shut — and that route spends OpenRouter credit on every call. It
is a billable hole, not just a data risk.

---

## 4. Deploy the API — the last P0

Full detail in [DEPLOY.md](DEPLOY.md). Short version:

```bash
npx eas deploy
```

Then take the hostname it returns and put it in **three** places:

| Where | Key |
| --- | --- |
| `.env` | `EXPO_PUBLIC_API_URL=https://<host>` |
| `eas.json` → `build.preview.env` | replace `https://REPLACE-ME.example.com` |
| `eas.json` → `build.production.env` | replace `https://REPLACE-ME.example.com` |

Set these secrets on the host too: `DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENROUTER_API_KEY`,
`ADMIN_TOKEN`.

**One constraint that will bite if ignored** (from `PLAN.md`): EAS Hosting runs on Cloudflare Workers
with `nodejs_compat`, **not Node**. The Neon HTTP driver is already the right choice for that;
anything added later that assumes real Node APIs will not be.

### Then verify — and two of these must FAIL

```bash
curl -s  https://<host>/api/health                    # {"ok":true,"db":"connected","tables":11,...}
curl -s  https://<host>/api/sets | head -c 200        # non-empty catalogue
curl -si https://<host>/api/progress                  # MUST be 401
curl -si -X POST https://<host>/api/admin/seed        # MUST be 401 without the token
```

A deployment that serves child progress openly, or that lets anyone trigger paid AI generation, is a
worse outcome than one that does not work at all.

### And seed the deployed database

```bash
npm run db:migrate                                     # against the deployed DATABASE_URL
curl -X POST https://<host>/api/admin/seed -H "x-admin-token: $ADMIN_TOKEN"
```

There is no migration hook, deploy step or app-boot call that seeds content — a fresh environment
starts with an empty catalogue and no in-product way to fill it. Migration `0004` sat committed but
unapplied for weeks and silently disabled `/api/sets/:id`, `/api/quiz`, the admin routes and offline
download; check `drizzle.__drizzle_migrations` row count against the files in `drizzle/` after every
deploy.

---

## 5. Enrol in the Apple Developer Program — ~24–48h to approve, $99/yr

Blocks device builds, TestFlight, and any future billing. Nothing after this point can start without
it, so start it early even if the deploy isn't ready.

---

## 6. First TestFlight build

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

This is also the first time the backend is exercised from a compiled client rather than the Metro dev
server — expect that to surface something.

**Reviewer notes are not optional here.** The app is SSO-only (Apple + Google), with no
email/password, so a reviewer who cannot get past sign-in will reject it. Tell them explicitly how to
authenticate.

---

## 7. Manual QA I could not do

| What | Why it needs you |
| --- | --- |
| **Type a child's name in Add a child** | Maestro could not get text into that field. The input is wired correctly (`value` + `onChangeText`), so this is very likely a simulator keyboard-focus quirk — but if text genuinely doesn't enter on a device, it's a P1: a parent who can't type a name can't onboard. Two minutes to settle. |
| **Delete a child, end to end** | The server-side erasure is proven at the API and database level (cascade 1/1/1 → 0/0/0), but the in-app path has never been driven by a real tap, because I was barred from touching Jacob or Isaac. Add a throwaway child, delete it, confirm it disappears. |
| **VoiceOver pass** | Label *coverage* is now complete (31/31 images, ~20 newly-named controls). Focus order and announcement quality need a human ear, especially on the quiz. |
| **Dynamic Type at large sizes** | Tile labels now wrap instead of truncating; worth eyeballing at the largest accessibility sizes. |
| **Android, and a physical device** | Neither has ever been run. `app.json` pins portrait, so landscape is out of scope by design. |

---

## 8. Simulator state I left behind

- **Parent passcode is `1234`** — none existed before; change or clear it.
- **Jacob K has real study progress** recorded from testing (flashcards and quizzes). Isaac is clean.
- Jacob's avatar was changed to 🐨 by a test worker and **restored to 🐻**; see the incident note in
  `docs/qa/2026-08-15/REPORT.md` §3c.

---

## 9. Worth confirming: `.env.example`

I cannot read `.env*` (permission rule), so I could not check it. If it is missing
`EXPO_PUBLIC_API_URL`, that is plausibly *how* this blocker survived from 20 July to now — it is the
file a new contributor copies. Add all three new keys to it: `EXPO_TOKEN`, `ADMIN_TOKEN`,
`EXPO_PUBLIC_API_URL`.

---

## 10. Decisions only you can make

**Kids Category.** Recommendation from `docs/Report.md`, unchanged: **do not enrol.** The required
adult SSO sign-in is fundamentally incompatible with its restrictions on sign-in flows and
third-party SDKs. Submit as **Education** with a parental gate — which is what is actually built —
and a conventional age rating.

**Billing.** There is no billing SDK, `useEntitlement()` honestly returns `free`, and `useHasPlus()`
has zero call sites — so no feature is gated today. When you wire RevenueCat, the seam is
`src/lib/subscription.ts` and the `subscriptions` table already has the columns. Note the deletion
route already erases that row, so the promise made to parents stays true once billing lands.

**A `taught` flag on curriculum objectives.** The content worker's sharpest observation: today an
objective that describes content no set teaches is indistinguishable in the data from one that does.
A boolean would remove the ambiguity permanently instead of relying on a written rule. Half a day.

**Promote the security harness.** `.qa-sec-scratch/` holds reusable scripts that mint throwaway
identities and exercise IDOR, sync dedupe and the no-repeat rule. Currently gitignored. If you want
those runnable on demand, they belong in `scripts/` with a README.

**Sentry tracing vs the privacy copy.** `src/app/data-usage.tsx` tells parents there is no
third-party analytics or tracking. That holds — every Sentry call site is error-scoped — but
`tracesSampleRate` does send navigation/timing telemetry. Either add a line to the copy or turn
tracing off; it is a small thing that becomes a large thing if a regulator reads it closely.
