// Screens must import `SymbolView` from `@/components/symbol`, never from `expo-symbols` directly.
//
// The raw component renders a native image whose accessibility label falls back to the SF Symbol's
// own name, and iOS concatenates that into the surrounding button's label. VoiceOver announced
// "apple dot logo, Continue with Apple" on sign-in, "Month, go down" on the add-child month picker,
// and "square and arrow up, Export your data first, …, chevron right" on delete-account — symbol
// identifiers read aloud to a blind parent as if they were part of the control's name.
//
// `src/components/symbol.tsx` wraps the component so an icon with no `accessibilityLabel` is removed
// from the accessibility tree. That default only holds while every call site goes through it, and
// there are ~300 of them: one raw import reintroduces the bug on whichever screen it lands. This
// script is the thing that notices.
//
// Type-only imports (`import { type SFSymbol } from "expo-symbols"`) are fine — a type cannot render.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = new URL("../src", import.meta.url).pathname
// Two files legitimately touch the raw component: the wrapper itself, and `styled.ts`, which
// registers the `cssInterop` that gives the native view its `className`.
const ALLOWED = new Set([join(SRC, "components", "symbol.tsx"), join(SRC, "components", "styled.ts")])

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const offenders = []
for (const file of walk(SRC)) {
  if (!/\.tsx?$/.test(file) || ALLOWED.has(file)) continue
  const source = readFileSync(file, "utf8")
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"expo-symbols"/g)) {
    const names = match[1].split(",").map((n) => n.trim())
    // `SymbolView` alone is the value import; `type SFSymbol` and friends are erased at compile time.
    if (names.some((n) => n === "SymbolView")) {
      const line = source.slice(0, match.index).split("\n").length
      offenders.push(`${file.replace(`${SRC}/`, "src/")}:${line}`)
    }
  }
}

if (offenders.length > 0) {
  console.error("SymbolView imported straight from expo-symbols — use @/components/symbol instead:")
  for (const o of offenders) console.error(`  ${o}`)
  console.error("\nThe raw component leaks its SF Symbol name into the parent control's VoiceOver label.")
  process.exit(1)
}

console.log("check:symbols — every SymbolView import goes through @/components/symbol")
