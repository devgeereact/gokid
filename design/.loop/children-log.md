# children — design-match log

Route: `/children` (`src/app/(app)/children.tsx`). Reached from Parent Zone → "Children" and from
Account settings → "Manage children", so it sits behind the maths gate.

Covers `design/gokid-screens.md` §2 Child Profiles → **Multiple Children Manager**. Also carries
**Child Profile Empty State** (no children yet) and **Switch Child** (the per-row Switch control).

**There is no reference PNG for this screen.** Closest refs used for fidelity:
- `design/GoKid-parentcontent-screen.png` (screen 12) — the account-row card: white fill,
  `rounded-2xl border border-border`, hairline dividers, 24pt symbol, `chevron.right` at 18pt in
  `text-secondary`, and the `bg-badge-strong` / `text-badge-strong-ink` pill ("Strong" → "Studying").
- `design/GoKid-whoisstudying-screen.png` (screen 4) — child identity: avatar, name, year label.

## Iteration 1

Built the row card, the add-a-child row, the demo-seed row and the empty state.
Screenshot: `design/.loop/children-1.png` (deep link `gokid://children`). Read back against
`GoKid-parentcontent-screen.png`.

**Diffs found:**
- **Emoji avatars clipped.** `ChildAvatar` hard-coded its emoji glyph at `text-avatar` (64/72 —
  sized for the 160pt add-child ring). In a 44pt row disc the glyph overflowed and the circle
  cropped the face. Real bug, not just this screen: `settings.tsx` had it at `h-9 w-9` too.
- Action-row labels staggered — the symbols were left-aligned on the glyph, and SF Symbols vary in
  width.

## Iteration 2

- `ChildAvatar` gained a `glyphClassName` prop (default `text-avatar`, unchanged for existing
  callers). This screen passes `text-h2` for its 44pt disc. Screenshot `children-2.png`: emoji now
  sit inside the disc.
- Wrapped both action-row symbols in a fixed `w-6 items-center` column.

**Still off:** the labels remained staggered — `person.badge.plus` and `wand.and.stars` are wide
glyphs that overflow a 24pt column by *different* amounts, so the column alone did not fix it.

## Iteration 3

Swapped both to square-bounded symbols: `plus.circle` (also what `settings.tsx` uses for add-a-child)
and `sparkles`. Screenshot `children-3.png` — labels share a left edge, emoji fit, rows match the
reference's account-block geometry. No new diffs. **Stopped here.**

## Tokens

One new token: spacing `18: "72px"` — the child row height. **Inferred**: a 44pt avatar plus 14pt
above and below. The reference's account rows are `h-14` (56pt), but those carry a 24pt symbol, not
a face; 56 leaves 6pt of clearance around a 44pt disc, which reads cramped. Everything else on the
screen is an existing token.

## Deliberately inferred (not read from any reference)

- The whole screen structure: child rows → add a child → load demo children.
- The "Studying" pill reuses the `badge-strong` tokens, which the reference only uses for a
  curriculum-strength badge. No reference shows an active-profile indicator.
- The "Switch" control: an outlined `border-border` chip with a `primary` label. No reference
  defines a small secondary button.
- Row disc is 44pt (`h-11 w-11`), matching the parent-content child-switcher faces.

## Wiring changed

- `settings.tsx` previously rendered its **own** child list. Two screens rendering child rows would
  drift, so settings now shows a single "Manage children" row (with the count) pointing here. This
  screen is the one owner of the list.
- `parent-content.tsx` gained a "Children" account row between Subscription and Account settings.
  Not in the reference, which specifies only Subscription and Account settings — same class of
  deliberate addition as the Sign out row already documented there.

## Honest gaps

- **The demo seed was not tap-tested.** `Load demo children` calls `seedDemoChildren()`, which writes
  `DEMO_CHILDREN` (Rec → Y6, one per year group) to Clerk `unsafeMetadata` behind a confirm alert —
  same path `addChild`/`updateChild` already use, so it is wired, but I drove the screen by deep link
  and screenshot only and never fired the tap. Typecheck and lint are clean. Verify by hand.
- The screenshots show a real signed-in account with two children ("Gideon", "GIDEON"), not the demo
  set — that is this simulator's Clerk state, not a layout choice.
- The empty state (`children.length === 0`) was not screenshot: the account has children and the seed
  is additive-by-replacement, so reaching the empty branch means deleting real profiles.
