import { Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { colors } from "@/design/tokens"

/**
 * The "Overall" mastery ring drawn on design/GoKid-subjectprogress-screen.png (screen 17): a full
 * grey track with a single rounded arc over it, percentage and caption centred inside.
 *
 * Geometry is measured off that reference (96pt box, r=40, 9pt stroke) and kept as the defaults, so
 * the Subject Progress screen it was matched against is unchanged. The Subject Hub passes its own
 * subject accent.
 *
 * `size` is a union, not a free number, because the wrapper's box has to be a Tailwind class
 * (AGENTS.md — no inline `style`), and NativeWind only emits classes it can see in the source.
 */
const BOX: Record<number, string> = {
  80: "h-20 w-20",
  96: "h-24 w-24",
}

export function ProgressRing({
  pct,
  label = "Overall",
  size = 96,
  stroke = 9,
  color = colors.study.teal,
}: {
  pct: number
  label?: string
  size?: 80 | 96
  stroke?: number
  color?: string
}) {
  const r = size / 2 - stroke / 2 - 3
  const circumference = 2 * Math.PI * r
  const len = (pct / 100) * circumference
  const centre = size / 2

  return (
    <View className={`items-center justify-center ${BOX[size]}`}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={centre} cy={centre} r={r} fill="none" stroke={colors.gamify.track} strokeWidth={stroke} />
        <Circle
          cx={centre}
          cy={centre}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len} ${circumference - len}`}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-text text-h3 font-bold text-ink">{pct}%</Text>
        <Text className="font-text text-caption text-text-secondary">{label}</Text>
      </View>
    </View>
  )
}
