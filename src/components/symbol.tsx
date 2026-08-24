import { SymbolView as ExpoSymbolView, type SymbolViewProps } from "expo-symbols"

import "@/components/styled"

/**
 * Every SF Symbol in the app, wrapped once so icons are decorative by default.
 *
 * ## Why this exists
 *
 * `expo-symbols` renders a native `UIImageView` whose accessibility label falls back to the symbol's
 * own name. Inside a button that already has a label, iOS concatenates the two, so VoiceOver read
 * out implementation detail:
 *
 *   - "apple dot logo, Continue with Apple"        (sign-in)
 *   - "Month, go down"                             (add-child's month picker — `chevron.down`)
 *   - "person dot badge dot plus, Add your child"  (welcome)
 *   - "square and arrow up, Export your data first, …, chevron right"  (delete account)
 *
 * None of those icons carry meaning the surrounding text does not already carry: they are ornament,
 * and ornament should not be spoken. Fixing it per-button would mean touching ~300 call sites and
 * would silently regress the moment someone adds the 301st, so the default lives here instead.
 *
 * ## The contract
 *
 * - No `accessibilityLabel` → the icon is decorative and is removed from the accessibility tree.
 *   Whatever label its parent `Pressable` carries is what gets announced, undiluted.
 * - An explicit `accessibilityLabel` → the icon is meaningful (it is the *only* carrier of some
 *   information, e.g. a bare status glyph) and is exposed as a labelled element.
 *
 * Screens import `SymbolView` from here, never from `expo-symbols` directly — importing the raw
 * component brings the symbol-name leak straight back. `scripts/check-symbols.mjs` enforces that.
 *
 * `@/components/styled` is imported for its side effect: it registers the `cssInterop` that makes
 * `className` work on the underlying native view, and this wrapper forwards `className` down to it.
 */
export function SymbolView({ accessibilityLabel, ...props }: SymbolViewProps) {
  if (accessibilityLabel) {
    return <ExpoSymbolView {...props} accessible accessibilityLabel={accessibilityLabel} accessibilityRole="image" />
  }
  // `no-hide-descendants` rather than `no`: a symbol has no children to preserve, and it is the only
  // value that reliably keeps the native image out of the tree on both platforms.
  return <ExpoSymbolView {...props} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
}

export type { SymbolViewProps }
