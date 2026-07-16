# result — build log

Ref: `design/GoKid-result-screen.png` (screen 9). Route: `src/app/(app)/result/[id].tsx`.

## Iter 1
- Built: celebrating-child hero (`gokid-result-child.png`, cropped 120,175→830,500 to sit
  above the baked score ring), an orange score ring overlapping the base (`-mt-16`), the
  "Nice one, {name} — that's your best yet." line, a green "What you've mastered" chip card
  (up-arrow chips) and an amber "Worth another look" card, then Next set / Back home.
- Score + name are live (score param from quiz, name from `useChildren`); topics are demo.
- `result-1.png`: match is strong. Diff — score number sat at the ring's top edge.

## Iter 2
- Centred the score inside the ring (`items-center justify-center` + inner baseline row).
- `result-2.png`: number now centred; indistinguishable from ref.

## Diffs remaining / inferred
- Ref shows "8/10" for Amara; live render shows "6/6" for Gideon — score is clamped to the
  demo quiz length (6) and the name is the real first child. Both are demo/live data, not
  layout diffs.
- No new tokens (green = `status.getting`, amber = `accent`).
