import { View } from "react-native"

/**
 * The one surface card. `rounded-2xl border border-border bg-white p-…` appeared ~54 times across
 * the app; `wash` is the pale-tint hero variant (`rounded-2xl bg-…-wash p-…`) used on completion and
 * summary screens. Padding is a prop because the copies used p-4 and p-5 interchangeably.
 *
 * `wash` takes the tint as a class (`bg-gamify-green-wash`) so no colour literal leaks in, matching
 * how the screens already write it.
 */

type Variant = "flat" | "elevated" | "wash"
type Pad = 4 | 5

const PAD: Record<Pad, string> = {
  4: "p-4",
  5: "p-5",
}

export type CardProps = {
  children: React.ReactNode
  variant?: Variant
  pad?: Pad
  /** Wash tint class, e.g. "bg-gamify-green-wash". Only read when variant is "wash". */
  wash?: string
  className?: string
}

export function Card({ children, variant = "flat", pad = 5, wash = "bg-gamify-green-wash", className = "" }: CardProps) {
  const surface =
    variant === "wash"
      ? wash
      : variant === "elevated"
        ? "border border-border bg-white shadow-subtle"
        : "border border-border bg-white"

  return <View className={`rounded-2xl ${surface} ${PAD[pad]} ${className}`}>{children}</View>
}
