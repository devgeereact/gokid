import { Text } from "react-native"

type Weight = "semibold" | "bold"

type Props = {
  children: string
  /** Point size. Must match the corresponding `text-*` token. */
  size: number
  weight: Weight
  color: string
  /** Tailwind classes carrying the size / weight / colour for the rendered Text. */
  fallbackClassName: string
}

/**
 * Centred heading.
 *
 * The design system's heading face is SF Pro Rounded. iOS ships it but exposes no
 * font-family name React Native can resolve — the only route is SwiftUI's
 * `Font.system(design: .rounded)` via `@expo/ui`'s `Host`. On the SDK 57 dev client that
 * `Host` hard-crashes the app the moment it mounts (drops straight back to the Expo
 * launcher), taking every screen that renders a heading down with it — so `@expo/ui` was
 * uninstalled rather than left as dead native weight, and this degrades to a plain RN
 * `Text` (system SF Pro, not rounded). `size`/`weight`/`color` are carried by
 * `fallbackClassName`; the extra props are kept so callers don't change when the package
 * is reinstated and `Host` returns.
 */
export function RoundedHeading({ children, fallbackClassName }: Props) {
  return <Text className={fallbackClassName}>{children}</Text>
}
