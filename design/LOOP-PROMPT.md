# GoKid — Design-Match Loop Prompt

Paste the block below into `/loop`. Swap `<SCREEN>` and `<REF>` per screen.

Screens available:

| `<SCREEN>` | `<REF>` |
|---|---|
| splash | `design/GoKid-splash-screen.png` |
| auth | `design/GoKid-auth-screen.png` |
| addchild | `design/GoKid-addchild-screen.png` |
| whoisstudying | `design/GoKid-whoisstudying-screen.png` |
| studydashboard | `design/GoKid-studydashboard-screen.png` |
| lessondetails | `design/GoKid-lessondetails-screen.png` |
| progress | `design/GoKid-progress-screen.png` |
| result | `design/GoKid-result-screen.png` |
| quiz | `design/GoKid-quiz-screen.png` |
| flashcard | `design/GoKid-flashcard-screen.png` |
| parentzone | `design/GoKid-parentzone-screen.png` |
| parentcontent | `design/GoKid-parentcontent-screen.png` |
| paywall | `design/GoKid-paywall-screen.png` |
| offlinesync | `design/GoKid-offlinesync-screen.png` |
| downloadset | `design/GoKid-downloadset-screen.png` |
| progressoverview | `design/GoKid-progressoverview-screen.png` |
| subjectprogress | `design/GoKid-subjectprogress-screen.png` |
| setresult | `design/GoKid-setresult-screen.png` |
| studysection | `design/GoKid-studysection-screen.png` |
| answerresult | `design/GoKid-answerresult-screen.png` |
| sectionsummary | `design/GoKid-sectionsummary-screen.png` |
| achievements | `design/GoKid-achievements-screen.png` |
| congratulations | `design/GoKid-congratulations-screen.png` |

---

| app shell (tabs) | `design/GoKid-app-ui.png` |
| tokens only | `design/GoKid-design-system.png` |


## The prompt

ONE SCREEN AT A TIME.

PICK A SCREEN AND BUILD

Build the **<SCREEN>** screen so it visually matches `<REF>` as closely as possible.


### Ground rules (read before writing code)

1. Read `AGENTS.md`. It is binding. Notably: Expo SDK 57 docs at
   https://docs.expo.dev/versions/v57.0.0/ — do not write Expo/RN from memory;
   NativeWind `className` only (no `StyleSheet.create`, no inline `style={{}}`);
   native tabs via `expo-router/unstable-native-tabs` only.
2. **Tokens before pixels.** `tailwind.config.js` `theme.extend` is currently empty.
   Before touching any screen, read `<REF>` and extract
   its colors, spacing scale, radii, shadows, and type scale into
   `tailwind.config.js` as named tokens. Every value you use afterwards must be a
   token — no raw hex, no arbitrary `p-[13px]`. If the design system PNG does not
   define a value the screen needs, add the token and note it in the log (below)
   as an inferred value.
3. **You may run the simulator for this task.** The usual "don't start the app"
   rule is lifted here — you need screenshots. Reuse an already-booted simulator
   if one exists; do not boot a second one.

### Match target

Layout · spacing · typography (family, size, weight, line height, letter spacing) ·
colors and gradients · button styles and heights · input fields · border radius ·
shadows and elevation · icons (SF Symbols via `expo-symbols`) · imagery and its
cropping · alignment and padding · safe-area behavior · visual hierarchy.

Do not redesign or improvise. If the reference is ambiguous or something is
missing from it, implement the closest reasonable thing **and log it** rather than
inventing a different layout.

### The loop

Each iteration:

1. Implement / refine the screen.
2. `npx tsc --noEmit` and `npm run lint` — both must be clean before you screenshot.
   A type error means the iteration is not done.
3. Screenshot the running simulator:
   ```bash
   xcrun simctl io booted screenshot design/.loop/<AUTH>-<N>.png
   ```
   (`<N>` = iteration number, starting at 1. Create `design/.loop/` if absent.)
4. **Read your own screenshot back** with the Read tool, side by side with
   `<REF>`. Do not trust the code — trust the pixels.
5. Write the diffs to `design/.loop/<SCREEN>-log.md`, appending a section per
   iteration: what differed, what you changed, what is still off, what you
   deliberately inferred. Read this log at the start of every iteration so you do
   not re-fix the same thing or oscillate between two wrong values.
6. Repeat.

Be strict. Look for: text baseline and vertical centering, button height and
horizontal padding, gap between stacked elements, corner radius (4 vs 8 vs 12 is
visible), shadow spread and opacity, icon weight and size, image crop and aspect,
exact font weight (500 vs 600 is visible), status-bar style, and color accuracy
(sample the hex from both images, do not eyeball it).

### Stop conditions — stop when ANY of these is true

- The screenshot and the reference are indistinguishable at a glance, and the last
  two iterations produced no new fixable diffs.
- You have completed **8 iterations**.
- The remaining diffs are all things you cannot fix from code (e.g. the reference
  uses an asset you do not have, or a font not in the project).

On stop, output: a short list of what still differs and why, plus every value you
inferred rather than read from the design system. If you could not run the
simulator, say so plainly — do not claim the screen renders.

Every info of the child is a demo.
After CONNECT THE WIREFRAME OF ALL THE SCREENS TO WORK IN ORDER
IMPORT DEMO QUIZE AND CORICULUM OF CHILD OF EVERY AGE