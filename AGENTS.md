# GoKid — Agent Rules

## 0. Expo HAS CHANGED — read the docs first

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ **before writing any code.**

Your training data is Expo SDK 50-era. SDK 57 renamed, moved, or replaced large parts of the API surface. Do not write Expo/React Native code from memory — look it up. Same rule for every library below: check the installed version's docs, not remembered ones.

---

## 1. Tech stack

### Installed (in `package.json` today)

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Expo SDK 57, React Native 0.86, React 19.2 | |
| Routing | `expo-router` — file-based, routes live in `src/app/` | `typedRoutes` and `reactCompiler` are ON (`app.json` → `experiments`) |
| Native UI | `@expo/ui` | Real SwiftUI / Jetpack Compose components |
| Styling | NativeWind 4 + Tailwind 3 | `className` only. Tokens in `tailwind.config.js` |
| Icons | `expo-symbols` | SF Symbols |
| Glass / iOS 26 | `expo-glass-effect` | |
| Errors | `@sentry/react-native` | Wired through `metro.config.js` + config plugin |
| Language | TypeScript (strict) | |

### Target stack — NOT installed yet

Do not import these until they are actually added to `package.json`. When adding one, follow its current official docs.

| Layer | Choice | Notes |
|---|---|---|
| Database | **Postgres on Neon** | Serverless driver over HTTP/WebSocket — not `pg` over raw TCP |
| ORM | **Drizzle** | Schema lives in `src/db/schema.ts`. Migrations via `drizzle-kit`, committed to the repo |
| Auth | **Clerk** | Use `@clerk/clerk-expo`. Skills in `.agents/skills/clerk-*` are the source of truth — read them before writing auth code |
| Images | **ImageKit** | All remote images go through ImageKit URL transforms (resize / format / quality). Render with `expo-image`, never bare `<Image>` from `react-native` |
| Background jobs | **Inngest** | Anything async, retryable, scheduled, or fan-out. Never a `setTimeout` in a component or a fire-and-forget `fetch` |
| Monitoring | Sentry | Already installed |

**Never put the Neon connection string or the Clerk secret key in the app bundle.** Drizzle and Neon run server-side only (route handlers / Inngest functions). The client talks to an API, never to Postgres directly. Client-safe values only under `EXPO_PUBLIC_*`.

---

## 2. UI non-negotiables

- **Native tabs. Always.** Use `NativeTabs` from `expo-router/unstable-native-tabs`. Never a JavaScript tab bar, never `@react-navigation` tabs, never a hand-rolled `<View>` tab strip. This is not negotiable and does not get "temporarily" swapped out to unblock something — if native tabs are fighting you, fix the native tabs.
- Prefer `@expo/ui` native components over reimplementing a control in RN views.
- iOS 26 surfaces use `expo-glass-effect`. Degrade gracefully on older iOS and on Android — check availability, don't assume.
- **No `StyleSheet.create`. No inline `style={{}}`.** NativeWind `className` only.
- No raw color, spacing, or font-size literals. Extend `tailwind.config.js` theme and use the token.
- Design source of truth: the mockups in `design/`. Match them; don't improvise a different layout.

---

## 3. Forbidden

- `npm install <expo-package>` — use `npx expo install` so versions stay aligned with the SDK.
- Hand-editing `ios/` or `android/`. This project uses Continuous Native Generation — express native config as config plugins in `app.json`.
- Importing `@react-navigation/*` directly. Go through `expo-router`.
- Swallowing errors (`catch {}`). Report to Sentry with context.
- Secrets in code, in `app.json`, or in anything `EXPO_PUBLIC_*`. Secrets live in `.env` (gitignored).
- Querying Postgres from the client. Ever.

---

## 4. Commands

```bash
npm start           # dev server
npm run ios         # dev client build (NOT Expo Go — native modules are in use)
npm run android
npm run lint
npx tsc --noEmit    # must pass before any task is "done"
```

**Do not start the app yourself.** The dev server is typically already running in another terminal. Ask before launching one.

---

## 5. Definition of done

1. `npx tsc --noEmit` clean.
2. `npm run lint` clean.
3. The changed screen actually renders on a simulator. A passing typecheck is not a rendering screen — router and native-module errors only show up at runtime.

If you cannot run the app (see above), say what you could not verify instead of claiming it works.
