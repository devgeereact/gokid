# Seed-data audit — 14 August 2026

Classification per the orchestrator's rule: every finding is `SEED-GAP (unintended)`,
`SCOPE (intended, per PLAN.md)`, or `DEMO-STANDIN` (a documented seam, reported with its swap cost and
the user-visible consequence of not swapping). An unclassified list of "seed data issues" is noise.

## The central fact

`src/lib/study.ts` holds the entire curriculum as bundled constants — 27 sets, 160 cards, 140 quiz
questions. The Postgres content was seeded *from* that file via `POST /api/admin/seed`. Therefore:

> **No user journey anywhere in GoKid creates a study set, a flashcard or a quiz question.**

`PLAN.md` puts manual set creation explicitly out of scope for v1 and names AI generation
(`/api/admin/generate`) as the intended creation path. So this is `SCOPE`, not a defect — *except* that
the AI path is currently non-functional (REPORT.md P0-1), which means today there is no working content
creation path at all, intended or otherwise.

## Classification

| Item | Class | Swap cost | User-visible consequence today |
| --- | --- | --- | --- |
| Whole curriculum in `study.ts` (27 sets / 160 cards / 140 questions) | **DEMO-STANDIN** | `lib/*` only — screens call `useStudySets`/`getStudySet`, never the arrays. The module documents itself as "the single seam to swap" | None visible. Content renders. But it cannot grow without a code change and a redeploy |
| `subjects.ts` strand percentages and set counts | **DEMO-STANDIN** | `lib/*` only | Compounded by a real bug — see P1-2: 4 of 9 Rec–Y2 sets match no strand by string equality, so real content is invisible to coverage screens |
| Children in Clerk `unsafeMetadata` (`children.ts`) | **SCOPE** | Documented as the seam for when the DB lands | Works. But the DB mirror never updates and never deletes — REPORT.md P0-2 / P1-4 |
| SRS progress in SecureStore (`reviews.ts`) | **SCOPE** | Server sync already exists alongside it | Works. Server copy is orphaned on child deletion |
| `certificates` table — zero writers | **DEMO-STANDIN**, correctly self-documented in `lib/rewards.ts` | `lib/*` swap | **One thing to fix now:** every certificate hardcodes `Accuracy 90%` (`rewards.ts:76,103`) rather than reading the child's real `sessions.score`. On a printable, shareable artefact, a specific round number reads as a real statistic. That is a design-honesty violation the rest of the codebase would not tolerate |
| `subscriptions` table — zero writers, no RevenueCat webhook | **DEMO-STANDIN**, correctly self-documented in `lib/subscription.ts` | `useEntitlement()` is the only seam | None — every screen reads the seam and states honestly that nothing can be purchased |
| `curriculum_objectives` — no write path anywhere, not even the seed route | **SEED-GAP (unintended)** | Needs a seed written | The table's own doc comment calls it "the prompt spine for AI generation". Since no row can exist, `admin/generate`'s `objectiveId` branch is permanently dead code and generation always falls through to the `topic + description` fallback |
| Database seeding itself | **SEED-GAP (operational)** | — | `study_sets`/`cards`/`quiz_questions` are empty until a human `POST`s `/api/admin/seed` with the admin token. There is no migration hook, deploy step, or app-boot call anywhere in the repo. A genuinely fresh environment starts with an empty catalogue and no in-product way to fill it |
| Re-seeding after a content edit | **SEED-GAP (drift)** | `onConflictDoNothing` → `onConflictDoUpdate` | Editing `study.ts` changes what the bundled flashcard UI shows *immediately*, but re-running the seed does **not** update already-seeded rows. So the catalogue (`useSets`, from Postgres) and the flashcard content (bundled) can silently drift apart for the same set id |

## The split that matters for testing

Two populations of screen behave completely differently against an empty database. Any future Tier 2
empty-state pass must treat them separately, and **both** outcomes are findings:

**API-backed — will show a real empty state:** `(tabs)/study/index`, `(tabs)/progress/index`,
`progress/overview`, `progress/journey`, `progress/mastery-timeline`, `progress/statistics`, `bookmarks`,
`notifications`, `quiz/[id]`, `(parent)/study-goal`.

**Bundled-constant-backed — will show full content regardless, which is itself the finding:**
`lesson/[id]`, `flashcard/[id]`, `download/[id]`, `curriculum`, `search`, `subject/[subject]`,
`result/[id]`, `certificate/[id]`, every `study/*` result screen, `quiz/review`, `quiz/final-review`,
`progress/achievements`, `progress/history`.

A parent looking at a fresh install would see a fully-populated curriculum and an empty progress
section. Nothing about that is dishonest — but it means "the app looks like it has content" proves
nothing about whether the backend works, which is exactly how P0-1 stayed invisible.
