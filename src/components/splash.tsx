import { StatusBar } from "expo-status-bar"
import { View } from "react-native"

import { Image } from "./styled"

/** The launch artwork from design/GoKid-splash-screen.png. Doubles as the auth-loading state. */
export function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-background pt-4">
      <StatusBar style="dark" />
      <Image
        accessibilityLabel="GoKid"
        className="h-wordmark w-wordmark"
        contentFit="contain"
        source={require("../../assets/images/gokid-wordmark.png")}
      />
      <Image
        accessibilityLabel="A friendly lion sitting in the grass"
        className="mt-8 h-lion w-lion"
        contentFit="contain"
        source={require("../../assets/images/gokid-lion.png")}
      />
    </View>
  )
}
