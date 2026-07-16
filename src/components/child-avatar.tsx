import { Text, View } from "react-native"

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
 * A child's picture inside the lavender ring from design/GoKid-addchild-screen.png. Renders
 * whichever avatar kind is set: a preset illustration, an emoji, or an uploaded image.
 * Sizing/positioning is left to the caller via className (default fills its parent).
 */
export function ChildAvatar({ avatar, className = "h-full w-full" }: { avatar: Avatar; className?: string }) {
  return (
    <View className={`items-center justify-center overflow-hidden rounded-full bg-subject-geography ${className}`}>
      {avatar.kind === "image" ? (
        <Image
          accessibilityIgnoresInvertColors
          className="h-full w-full"
          contentFit="cover"
          source={{ uri: avatar.uri }}
        />
      ) : avatar.kind === "emoji" ? (
        // Emoji faces are round and read edge-to-edge; leave them uncropped and centred.
        <Text className="text-avatar leading-none">{avatar.value}</Text>
      ) : (
        // Preset animals: fill the ring like a profile picture (cover) rather than floating
        // small inside it — matches the polished look of the emoji faces. Anchored to the top so
        // the head/face stays in frame (the art is a head-and-chest bust) instead of centring on
        // the chest.
        <Image
          accessibilityIgnoresInvertColors
          className="h-full w-full"
          contentFit="cover"
          contentPosition="top"
          source={PRESET_ART[avatar.value]}
        />
      )}
    </View>
  )
}
