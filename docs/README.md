# GoKid documentation

## Start here

| File | What it is | Trust |
| --- | --- | --- |
| [`LAUNCH.md`](LAUNCH.md) | **Production readiness.** Current blockers, environment variables, the deploy sequence, and the manual QA still needing a human | ✅ Verified 20 Aug 2026 against HEAD `21c2d5a` |
| [`QA.md`](QA.md) | **How to test this app so the result means something.** The clean-start procedure (a stale Metro bundle has already cost this project a QA cycle), the four gates that run without a device, the Maestro suite, the offline journey, API/authorisation probing, accessibility, and what a device pass cannot cover | ✅ Written and exercised 24 Aug 2026 |
| [`HOOKS.md`](HOOKS.md) | The four rule-enforcement hooks in `scripts/hooks/`, why each exists, and how they differ from the proposal | ✅ Installed and verified |

Repo-root documents that outrank anything here:

- [`../AGENTS.md`](../AGENTS.md) — binding rules, stack, UI non-negotiables, forbidden actions, definition of done
- [`../CLAUDE.md`](../CLAUDE.md) — architecture: routing guards, the `lib/*` data seam, client/server boundary
- [`../PLAN.md`](../PLAN.md) — the original design plan **plus a §Divergences section** recording where the build differs from it

## QA evidence

Dated, immutable runs. Each report states its own coverage and what it could *not* prove.

| Run | Tiers | Contents |
| --- | --- | --- |
| [`qa/2026-08-14/`](qa/2026-08-14/) | 0 (code truth) + 1 (API/security) | 7 worker reports, 31 request/response transcripts, CRUD and curriculum matrices |
| [`qa/2026-08-15/`](qa/2026-08-15/) | 2 (device render) + 3 (interaction) | Device worker report, 58 security/fix transcripts, 6 verification screenshots. **Supersedes the 14 Aug run** — read this first, then that for static and API detail |

> **Screenshots are local-only.** `qa/2026-08-15/shots/` holds the 87 captures the 15 Aug report
> cites, but they are gitignored (35MB), exactly as `design/.audit/` is. A fresh clone will not have
> them and the report's `shots/` links will not resolve. The six in `shots-verify/` **are** committed
> — they are the proof for two P0 fixes, so they travel with the repo.

The security probes those runs used are committed and re-runnable: `scripts/qa/` (`npm run qa:sec`,
then always `npm run qa:cleanup`).

### Resolving paths cited inside the QA runs

Those reports are immutable and still cite the paths that existed when they were written. Current
locations:

| Cited as | Now at |
| --- | --- |
| `ceoaudit.md` | [`archive/2026-07-17-ceo-audit.md`](archive/2026-07-17-ceo-audit.md) |
| `docs/Report.md` | [`archive/2026-07-20-diagnostic-report.md`](archive/2026-07-20-diagnostic-report.md) |
| `docs/DEPLOY.md`, `docs/ENV.md`, `docs/HANDOFF.md` | merged into [`LAUNCH.md`](LAUNCH.md) |
| `docs/Working-Agent.md`, `docs/Working-Agent-Squad.md` | deleted; the briefs are now `.claude/agents/gokid-qa-*.md` |

## Archive

Superseded, kept for history. **Do not act on these** — most of what they flag is fixed. They are
still cited by the QA agents as regression anchors ("this was once shipping").

| File | Date | Superseded by |
| --- | --- | --- |
| [`archive/2026-07-17-ceo-audit.md`](archive/2026-07-17-ceo-audit.md) | 17 Jul 2026 | `qa/2026-08-14/` |
| [`archive/2026-07-20-diagnostic-report.md`](archive/2026-07-20-diagnostic-report.md) | 20 Jul 2026 | `LAUNCH.md` (launch blockers) + `qa/2026-08-14/` (findings) |

## Conventions

- **Every document carries a date and the commit it was verified against.** A doc without one is
  presumed stale.
- **Dated QA directories are immutable.** New findings go in a new dated run, never as an edit to an
  old one.
- **A claim needs evidence.** The QA reports mark each finding VERIFIED, INFERRED or NOT TESTABLE,
  and an unassessed category is left unscored rather than guessed at. Keep that.
