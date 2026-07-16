import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useCallback, useRef, useState } from "react"
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native"

import { RoundedHeading } from "@/components/rounded-heading"
import { Image, SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { markIntroSeen } from "@/lib/intro"

/**
 * First Launch Introduction (gokid-screens.md → Authentication & Account).
 *
 * No mockup was drawn for it. Surface, type scale, radius and the hero/heading/subtitle/button
 * stack are inherited from design/GoKid-auth-screen.png so the carousel reads as the same screen
 * paging under the parent — only the page dots and the Skip/Next controls are new, and both are
 * logged as inferred in design/.loop/intro-log.md.
 *
 * Root stack, not (auth): the carousel reads no Clerk state, and (auth)'s guard redirects a
 * signed-in session away — which would make the screen unreachable for anyone already logged in.
 *
 * Line breaks are hand-set, as they are on sign-in: fixed copy on a fixed layout.
 */

const SLIDES = [
  {
    key: "curriculum",
    image: require("../../assets/images/gokid-auth-hero.png"),
    alt: "Two children sitting in the grass, reading a book together",
    title: "Built for their\nschool year.",
    body: "Every set maps to the UK\nNational Curriculum,\nReception to Year 6.",
  },
  {
    key: "practice",
    image: require("../../assets/images/gokid-lion.png"),
    alt: "The GoKid lion sitting in the grass",
    title: "Practice that\nsticks.",
    body: "Cards come back exactly\nwhen they are about to\nbe forgotten.",
  },
  {
    key: "progress",
    image: require("../../assets/images/gokid-intro-progress.png"),
    alt: "A child cheering with their arms in the air",
    title: "See it working,\nweek by week.",
    body: "Progress by subject, in\nplain English, in the\nparent zone.",
  },
] as const

export default function Intro() {
  const router = useRouter()
  const scroller = useRef<ScrollView>(null)
  const width = useRef(0)
  const [index, setIndex] = useState(0)
  const isLast = index === SLIDES.length - 1

  const finish = useCallback(() => {
    markIntroSeen()
    // replace, not push: the carousel must not sit under sign-in in the back stack.
    router.replace("/sign-in")
  }, [router])

  const next = useCallback(() => {
    if (isLast) return finish()
    scroller.current?.scrollTo({ x: width.current * (index + 1), animated: true })
  }, [finish, index, isLast])

  // The pager's own width, not the window's — SafeAreaView insets are horizontal in landscape,
  // and the page offset has to be measured against what actually scrolls.
  const onScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = event.nativeEvent.layoutMeasurement.width
    if (page > 0) setIndex(Math.round(event.nativeEvent.contentOffset.x / page))
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <View className="h-11 flex-row items-center justify-end px-6">
        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={finish}>
          <Text className="font-text text-body-lg font-semibold text-text-secondary">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        className="flex-1"
        onLayout={(event) => {
          width.current = event.nativeEvent.layout.width
        }}
        onMomentumScrollEnd={onScrollEnd}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {SLIDES.map((slide) => (
          <View className="h-full w-screen" key={slide.key}>
            <Image
              accessibilityLabel={slide.alt}
              className="mt-8 aspect-hero w-full"
              contentFit="contain"
              source={slide.image}
            />

            {/* Spacers above AND below the copy. Sign-in gets away with a single one because its
                block runs to the bottom of the screen (two buttons + legal); this block is a third
                of that, so one spacer would dump all the slack into a single gap under the hero. */}
            <View className="flex-1" />

            <View className="px-12">
              <RoundedHeading
                color={colors.ink}
                fallbackClassName="text-center text-display font-bold text-ink"
                size={34}
                weight="bold"
              >
                {slide.title}
              </RoundedHeading>

              <View className="mt-2">
                <RoundedHeading
                  color={colors["text-secondary"]}
                  fallbackClassName="text-center text-subtitle font-semibold text-text-secondary"
                  size={21}
                  weight="semibold"
                >
                  {slide.body}
                </RoundedHeading>
              </View>
            </View>

            <View className="flex-1" />
          </View>
        ))}
      </ScrollView>

      {/* Dots and the button sit outside the pager: they are chrome for the carousel, not part
          of a page, so they must not slide with it. */}
      <View className="flex-row items-center justify-center gap-2 pb-5">
        {SLIDES.map((slide, dot) => (
          <View
            className={dot === index ? "h-2 w-5 rounded-sm bg-primary" : "h-2 w-2 rounded-sm bg-border"}
            key={slide.key}
          />
        ))}
      </View>

      <View className="px-12 pb-2">
        <Pressable
          accessibilityRole="button"
          className="h-14 flex-row items-center justify-center rounded-button bg-primary active:opacity-80"
          onPress={next}
        >
          <Text className="font-text text-body-lg font-semibold text-white">{isLast ? "Get started" : "Next"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
