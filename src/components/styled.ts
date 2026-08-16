// NativeWind only auto-maps React Native's own components. Anything from a library
// needs its `className` wired to `style` once, here, so screens can stay className-only.
import { Image } from "expo-image"
import { SymbolView } from "expo-symbols"
import { cssInterop } from "nativewind"
import { SafeAreaView } from "react-native-safe-area-context"

cssInterop(Image, { className: "style" })
cssInterop(SafeAreaView, { className: "style" })
// Without this entry, `SymbolView` was the one component screens could not position with a class, so
// every icon that needed a margin reached for `style={{ marginLeft: 8 }}` — nine inline styles across
// six screens, all of them AGENTS.md §2 violations that no one could fix locally because the fix
// belonged here. Wiring it once removes the reason to write them.
cssInterop(SymbolView, { className: "style" })

export { Image, SafeAreaView, SymbolView }
