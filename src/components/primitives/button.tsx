import { type SFSymbol, SymbolView } from "expo-symbols"
import { ActivityIndicator, Pressable, Text } from "react-native"

import { colors } from "@/design/tokens"

/**
 * The one pill button. Before this, the CTA `h-14 … rounded-full bg-study-teal active:opacity-90`
 * (and its outline twin) was copy-pasted across ~29 screens, so a change to the button — radius,
 * height, pressed opacity — meant editing 29 files. Every variant and size below is the exact class
 * string those screens already used, so adoption is a swap, not a restyle.
 *
 * NativeWind only emits classes it can read as literal source text, so variant/size are looked up in
 * the static maps below rather than interpolated — the reason each class appears here in full.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "lg" | "md"

const CONTAINER: Record<Variant, string> = {
  primary: "bg-study-teal active:opacity-90",
  secondary: "border border-primary bg-white active:opacity-70",
  ghost: "active:opacity-60",
  danger: "bg-error active:opacity-90",
}

const LABEL: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-primary",
  ghost: "text-primary",
  danger: "text-white",
}

/** SF Symbol / spinner tint per variant — the one place a colour token is needed as a prop value. */
const TINT: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.primary,
  ghost: colors.primary,
  danger: colors.white,
}

const HEIGHT: Record<Size, string> = {
  lg: "h-14",
  md: "h-12",
}

export type ButtonProps = {
  label: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  /** Leading or trailing SF Symbol. `iconPosition` defaults to trailing (the app's dominant pattern). */
  icon?: SFSymbol
  iconPosition?: "leading" | "trailing"
  loading?: boolean
  disabled?: boolean
  /** Extra layout classes (margins, `flex-1`) — never colour or radius; those come from the variant. */
  className?: string
  accessibilityLabel?: string
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  iconPosition = "trailing",
  loading = false,
  disabled = false,
  className = "",
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading
  const glyph = icon ? (
    <SymbolView name={icon} size={18} tintColor={TINT[variant]} weight="bold" />
  ) : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-full ${HEIGHT[size]} ${CONTAINER[variant]} ${inactive ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={TINT[variant]} />
      ) : (
        <>
          {iconPosition === "leading" ? glyph : null}
          <Text className={`font-text text-body-lg font-bold ${LABEL[variant]}`}>{label}</Text>
          {iconPosition === "trailing" ? glyph : null}
        </>
      )}
    </Pressable>
  )
}
