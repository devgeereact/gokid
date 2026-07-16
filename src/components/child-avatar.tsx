import { useState } from "react"
import { type LayoutChangeEvent, Text, View } from "react-native"

import { Image } from "@/components/styled"
import type { Avatar } from "@/lib/children"

// Static requires so Metro bundles the preset art. Keyed by Avatar["preset"].value.
// Transparent cutouts (no wash) so the animal sits on the ring's tint / the card wash with
// no visible box — see design/GoKid-addchild-screen.png (fox on the lavender ring).
const PRESET_ART = {
  fox: require("../../assets/images/gokid-cut-fox.png"),
  elephant: require("../../assets/images/gokid-cut-elephant.png"),
  lion: require("../../assets/images/gokid-lion.png"),
} as const

export const PRESET_KEYS = ["fox", "elephant", "lion"] as const

/**
 * Emoji glyph size per disc width. An emoji is text: it does not scale with its container the way
 * the preset art does, so a single hard-coded size clips in a small disc and floats in a large one.
 * ChildAvatar measures the disc and picks the largest step that still leaves the glyph inside it.
 *
 * A glyph renders roughly 1.17x its font size wide, so each step is ~60-70% of the disc it serves —
 * the face fills the circle without touching the edge. Ordered largest-first; the first match wins.
 * `text-avatar` (64px) is the top step, which keeps the add-child ring looking exactly as it did.
 */
const GLYPH_STEPS = [
  { minWidth: 100, className: "text-avatar" }, // 64px
  { minWidth: 72, className: "text-avatar-md" }, // 44px
  { minWidth: 56, className: "text-h1" }, // 34px
  { minWidth: 40, className: "text-h2" }, // 28px
  { minWidth: 0, className: "text-h3" }, // 22px
] as const

function glyphFor(width: number) {
  return GLYPH_STEPS.find((step) => width >= step.minWidth)!.className
}

/**
 * A child's picture inside the lavender ring from design/GoKid-addchild-screen.png. Renders
 * whichever avatar kind is set: a preset illustration, an emoji, or an uploaded image.
 * Sizing/positioning is left to the caller via className (default fills its parent).
 *
 * Presets and images scale with the disc, but an emoji is text and does not — so the disc measures
 * itself and sizes the glyph to match (see GLYPH_STEPS). Callers set the disc size and nothing else;
 * there is no way to pass a glyph size that clips, because there is no way to pass one at all.
 *
 * `fit` picks how the preset art sits in the disc:
 * - `"cover"` (default) crops it to fill, anchored to the top so the face stays in frame. Right
 *   for a small disc, where a whole bust would be unreadable.
 * - `"contain"` fits the whole animal inside, centred and uncropped. Right for a large disc,
 *   where cover reads as a zoomed-in crop of the face.
 */
export function ChildAvatar({
  avatar,
  className = "h-full w-full",
  fit = "cover",
}: {
  avatar: Avatar
  className?: string
  fit?: "cover" | "contain"
}) {
  // Measured, not declared: the disc is sized by a caller's className, which this component cannot
  // read. Only emoji need it — the other two kinds scale themselves.
  const [discWidth, setDiscWidth] = useState(0)
  function onLayout(event: LayoutChangeEvent) {
    setDiscWidth(event.nativeEvent.layout.width)
  }

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full bg-subject-geography ${className}`}
      onLayout={avatar.kind === "emoji" ? onLayout : undefined}
    >
      {avatar.kind === "image" ? (
        // A photo is always cropped to fill — a contained photo would letterbox inside the circle.
        <Image
          accessibilityIgnoresInvertColors
          className="h-full w-full"
          contentFit="cover"
          source={{ uri: avatar.uri }}
        />
      ) : avatar.kind === "emoji" ? (
        // Hidden until measured: rendering at a default size first would show one frame of a
        // clipped glyph snapping to size on every mount.
        discWidth > 0 ? (
          <Text className={`${glyphFor(discWidth)} leading-none`}>{avatar.value}</Text>
        ) : null
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          className="h-full w-full"
          contentFit={fit}
          contentPosition={fit === "cover" ? "top" : "center"}
          source={PRESET_ART[avatar.value]}
        />
      )}
    </View>
  )
}
