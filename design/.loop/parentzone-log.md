# parentzone — build log

Ref: `design/GoKid-parentzone-screen.png` (screen 11). Route: `src/app/(app)/(tabs)/parent.tsx`.

## Iter 1
- Built the maths gate: a dimmed (`opacity-40`) parent-zone preview (title, "Your children"
  rows from `useChildren`, Subscription card) behind a centred white modal — "Parent area",
  "What is 7 × 8?", answer box, and a 1–9 / 0 / delete keypad.
- Logic (read, not tapped): keypad appends to a 2-char entry; when it equals "56"
  → `router.push('/parent-content')`. Native tab bar (Parent active) shows below.
- `parentzone-1.png`: modal, keypad, dimmed backdrop, tab bar all match the ref.

## Diffs remaining / inferred
- Gate uses "7 × 8" from the ref (answer 56) rather than a stored PIN — keeps kids out with
  no setup. Once a wrong 2-digit value is typed the user must delete to retry (acceptable
  for a demo gate).
- No new tokens.
