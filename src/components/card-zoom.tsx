import { SymbolView } from "expo-symbols"
import { Modal, Pressable, Text, View } from "react-native"

import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"

/**
 * Card Zoom / Illustration Viewer (design/gokid-screens.md §6 → "Card Zoom", "Illustration Viewer").
 *
 * On the flashcard the illustration shares the card face with the question, so on a small phone it
 * lands at a couple of centimetres — fine as decoration, not enough to *read* when the picture is
 * the thing being asked about (a diagram of the skeleton, a place-value block arrangement). This
 * opens it full-bleed.
 *
 * One viewer serves both entries in §6: "Card Zoom" and "Illustration Viewer" are the same need
 * stated twice, and building two would give a child two different ways to look at one picture.
 *
 * Deliberately not a pinch-zoom canvas. That needs a gesture library this project does not have, and
 * full-screen already solves the actual problem — the picture was too small to see. A caption keeps
 * the question in view so a child does not lose the thread of what they were being asked.
 */
export function CardZoom({
  visible,
  source,
  caption,
  onClose,
}: {
  visible: boolean
  source: number
  caption?: string
  onClose: () => void
}) {
  return (
    <Modal animationType="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
        <View className="mt-1 h-11 flex-row items-center justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close picture"
            className="-mr-2 h-11 w-11 items-center justify-center active:opacity-60"
            hitSlop={8}
            onPress={onClose}
          >
            <SymbolView name="xmark" size={22} tintColor={colors.ink} weight="semibold" />
          </Pressable>
        </View>

        {/* Tapping the picture closes it too — the same gesture that opened it, which is what a
            child reaches for first. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Close picture" className="flex-1" onPress={onClose}>
          <Image
            accessibilityIgnoresInvertColors
            className="h-full w-full"
            contentFit="contain"
            source={source}
          />
        </Pressable>

        {caption ? (
          <Text className="mb-4 mt-2 text-center font-text text-body-lg text-text-secondary">{caption}</Text>
        ) : null}
      </SafeAreaView>
    </Modal>
  )
}
