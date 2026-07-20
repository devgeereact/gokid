import { Pressable, Text, View } from "react-native"

/**
 * The one section heading. `SectionHeading` (an h3 title, sometimes with a trailing "View all"
 * action) was redefined in settings.tsx and achievements.tsx and hand-rolled inline elsewhere.
 * Without an action it is a plain heading; with `onAction` it grows the trailing link.
 */

export type SectionProps = {
  title: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function Section({ title, actionLabel = "View all", onAction, className = "" }: SectionProps) {
  if (!onAction) {
    return <Text className={`font-text text-h3 font-bold text-ink ${className}`}>{title}</Text>
  }
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <Text className="font-text text-h3 font-bold text-ink">{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} — ${title}`}
        className="active:opacity-60"
        onPress={onAction}
      >
        <Text className="font-text text-body-lg font-bold text-primary">{actionLabel}</Text>
      </Pressable>
    </View>
  )
}
