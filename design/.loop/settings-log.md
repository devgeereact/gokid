# settings — design-match log

Route: `/settings` (`src/app/(app)/settings.tsx`). Reached from Parent Zone → "Account settings",
so it sits behind the maths gate.

**There is no reference PNG for this screen.** `design/mvp1.md` requires "Account settings",
"Subscription management" and "Restore purchases"; no mockup was drawn. Closest ref used for
fidelity: `design/GoKid-parentcontent-screen.png` (screen 12) — its account rows are the only
settings-shaped surface in the design set.

## Iteration 1

**Built from** the parent-content account rows, reusing verbatim:
- Row geometry: `h-14`, 24pt SF Symbol, `ml-4`, `text-body-lg font-semibold text-ink`,
  `chevron.right` at 18pt in `text-secondary`, `border-b border-border` between rows.
- Card surface: `rounded-2xl border border-border bg-white px-4` on the `bg-background` page.
- Section headings: `text-h3 font-bold text-ink`, `mb-3 mt-8` — same rhythm as "Progress overview" /
  "Curriculum strengths" on screen 12.

**Screenshot:** `design/.loop/settings-1.png` (deep link `gokid://settings`, rebuilt dev client).
Read back against `GoKid-parentcontent-screen.png`. Rows, card radius, borders and type match the
reference's account block. No new tokens were needed — every value is an existing token.

**Deliberately inferred (not read from any reference):**
- The whole screen structure: identity card → Children → Subscription → Learning → Privacy → Sign out.
- Identity card: 12pt avatar disc in `bg-study-wash` with a `person.fill` in `primary`. The wash/disc
  pairing is lifted from the EmptyState symbol disc, itself inferred.
- Destructive row tint: `text-error` + `error`-tinted symbol for "Sign out". No reference shows a
  destructive row; `add-child.tsx` uses an `Alert` for delete, and this matches that confirm-first
  behaviour.
- Child rows show `ChildAvatar` at `h-9 w-9` — smaller than any avatar in the design set.

**Honest gaps (cannot be fixed from code):**
- **Billing is not wired.** No StoreKit / RevenueCat in `package.json` (AGENTS.md lists billing as
  target stack, not installed). "Restore purchases" therefore runs a 600ms placeholder and reports
  *"Nothing to restore"* rather than faking a success. "Plan · GoKid Plus" and "Billing · Apple" are
  demo copy carried over from screen 12. Swap both when the billing SDK lands.
- Privacy / Terms open `https://gokid.app/{privacy,terms}` via `expo-web-browser` — placeholder URLs;
  the real pages do not exist yet.
- Sign-out and the child rows are real (Clerk `signOut`, `useChildren`).

**Verified:** renders on the booted sim (iPhone 17 Pro, iOS 26.5) with real Clerk identity and both
child rows. `npx tsc --noEmit` and `npm run lint` clean. `simctl` cannot tap, so the restore-purchases
alert and the sign-out confirm were verified by reading the handlers, not by pressing them.

**Stop reason:** no reference to converge on — one build pass, verified against the closest ref's row
geometry. Nothing left that a further iteration could measure.
