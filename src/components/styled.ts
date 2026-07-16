// NativeWind only auto-maps React Native's own components. Anything from a library
// needs its `className` wired to `style` once, here, so screens can stay className-only.
import { Image } from "expo-image"
import { cssInterop } from "nativewind"
import { SafeAreaView } from "react-native-safe-area-context"

cssInterop(Image, { className: "style" })
cssInterop(SafeAreaView, { className: "style" })

export { Image, SafeAreaView }
