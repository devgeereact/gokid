import { SymbolView } from "expo-symbols"
import { View } from "react-native"

import { Image } from "@/components/styled"
import type { Subject } from "@/lib/subjects"

/**
 * A subject's mark — its illustration, or its SF Symbol when there is no illustration for it yet
 * (design/GoKid-design-system.png §01 → SUBJECT TINTS, which draws subjects as rounded-square tiles,
 * and §11 → ILLUSTRATION STYLE).
 *
 * Why this exists: the same art-in-a-circle pattern was copy-pasted across seven screens, and it was
 * wrong in all seven. The eight subject illustrations are fully opaque squares — 68×68 for most of
 * them — with no alpha at all. Dropping a square into `rounded-full` left the art's own background
 * showing in the disc's corners, and scaling a 68px source into a 64pt slot on a 3x screen upscaled
 * it about three times, which is why the art read as blurry next to the crisp SF Symbols.
 *
 * The fix is `cover` inside a circle. Every one of these assets is a subject drawn centred on the
 * app's own cream page colour, so the square's corners are background, not artwork: a circle
 * inscribed in the square crops them away and loses nothing that matters. `contain` was the actual
 * bug — it shrank the whole square inside the disc, which is what put the corners on screen — and
 * filling the frame also stops the 68px source being upscaled into a much larger slot.
 *
 * The symbol fallback keeps the subject's wash and ink, so a subject without art (Music, Religious
 * Education) reads as a deliberate treatment rather than a hole where a picture should be. Replacing
 * either fallback is a one-line change here plus the asset — see `ART` in lib/subjects.ts.
 */
export function SubjectMark({
  subject,
  className = "h-12 w-12",
  radius = "rounded-full",
  symbolSize = 22,
}: {
  subject: Pick<Subject, "art" | "symbol" | "wash" | "ink">
  /** Tile size. The art fills it, so this is the only sizing knob callers need. */
  className?: string
  /** Clip shape. Circular by default, which is what crops these assets' background corners away. */
  radius?: string
  /** Only used by the symbol fallback; the illustration scales with the tile. */
  symbolSize?: number
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden ${radius} ${subject.wash} ${className}`}
    >
      {subject.art ? (
        // `cover`, not `contain` — see the note above: `contain` is what exposed the corners.
        <Image
          accessibilityIgnoresInvertColors
          className="h-full w-full"
          contentFit="cover"
          source={subject.art}
        />
      ) : (
        <SymbolView name={subject.symbol} size={symbolSize} tintColor={subject.ink} weight="semibold" />
      )}
    </View>
  )
}
