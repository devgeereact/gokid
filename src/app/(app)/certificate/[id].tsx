import * as Sentry from "@sentry/react-native"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import * as Print from "expo-print"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { Alert, Pressable, ScrollView, Text, View } from "react-native"

import { BackButton } from "@/components/primitives"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { certificateHtml } from "@/lib/certificate-print"
import { shareAboutChild } from "@/lib/share"
import { useChildren } from "@/lib/children"
import { useParentGate } from "@/lib/parent-gate"
import { getCertificate } from "@/lib/rewards"
import { getStudySet } from "@/lib/study"

/**
 * Certificate Earned (design/gokid-screens.md §9, Rewards). The award a child receives for
 * finishing a study set: a framed certificate artefact, the curriculum objectives it attests, the
 * stats it was earned with, and print / share actions.
 *
 * INFERRED — no mockup covers this screen. The design set's only certificate artwork is the
 * "WELL DONE!" card the child holds on design/GoKid-congratulations-screen.png, so the artefact is
 * built to that: ivory sheet, gold double rule, rosette seal (`cert.*` in src/design/tokens.js).
 * Everything around it reuses that screen's language verbatim — cream page, `rounded-2xl` white
 * cards on `border`, `gamify-green-wash` banners, a pinned teal action.
 *
 * Also inferred: the rosette is an SF Symbol (`rosette`) rather than the reference's illustration —
 * the app ships no rosette asset. "Print certificate" has no print pipeline yet (a PDF export needs
 * the server-side render that lands with Neon/Drizzle), so it shares the same sheet as "Share" and
 * is labelled as such rather than pretending to print.
 */

export default function CertificateEarned() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const set = getStudySet(id)
  const cert = getCertificate(id)
  const { children } = useChildren()
  const { unlocked } = useParentGate()

  if (!set || !cert) return <Redirect href="/home" />

  const name = children[0]?.name ?? "Amara"

  // The certificate is reached at the end of the child's own study flow, and Share.share posts the
  // child's name and year group to any app on the device — a child publishing their own identifying
  // data with no adult in the loop (UK Children's Code). So the share is gated: a child sees the
  // certificate and is told to fetch a grown-up; a parent who has passed the passcode gate this session
  // can share. Nothing about the certificate itself is hidden — only the outbound share.
  const onShare = () =>
    shareAboutChild({
      unlocked,
      message: `${name} earned a GoKid certificate for ${cert.award} (${set.yearGroup} ${set.subject}) — ${cert.issued}.`,
    })

  /**
   * §9 "Printable Certificate". Real now that `expo-print` is installed — this control previously
   * said "Save or print" behind a printer icon and only opened a share sheet.
   *
   * Gated like every other outbound action on this screen: the sheet renders the child's first name
   * and year group onto a page and hands it to AirPrint or a PDF, which is publishing. Same rule as
   * the share (UK Children's Code) — see lib/share.ts.
   */
  const onPrint = async () => {
    if (!unlocked) {
      Alert.alert("Ask a grown-up", "Printing is a grown-up job — open the Parent area first.")
      return
    }
    try {
      await Print.printAsync({
        html: certificateHtml({
          name,
          award: cert.award,
          subject: set.subject,
          yearGroup: set.yearGroup,
          setTitle: set.title,
          issued: cert.issued,
        }),
      })
    } catch (error) {
      // Dismissing the print sheet rejects on iOS, which is a decision rather than a failure — only
      // a genuine error is worth reporting.
      if (error instanceof Error && /cancel|dismiss/i.test(error.message)) return
      Sentry.captureException(error, { tags: { flow: "certificate-print" } })
      Alert.alert("Couldn’t print", "Something went wrong preparing the certificate. Please try again.")
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-background px-5">
      <StatusBar style="dark" />

      {/* Header — back / centred title / share */}
      <View className="mt-1 h-11 flex-row items-center">
        <BackButton />
        <Text className="flex-1 text-center font-text text-h3 font-bold text-ink">Certificate</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share certificate"
          className="-mr-2 h-11 w-11 items-center justify-center active:opacity-60"
          hitSlop={8}
          onPress={onShare}
        >
          <SymbolView name="square.and.arrow.up" size={20} tintColor={colors.study.teal} weight="semibold" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-2" showsVerticalScrollIndicator={false}>
        {/* The certificate artefact — ivory sheet, gold frame, rosette seal */}
        <View className="items-center rounded-2xl border-2 border-cert-frame bg-cert-paper px-5 py-6">
          <Text className="font-text text-caption font-bold uppercase tracking-eyebrow text-cert-ink">
            Certificate of Achievement
          </Text>
          <View className="mt-3 h-px w-full bg-cert-rule" />
          <View className="mt-1 h-px w-full bg-cert-rule" />

          {/* The rosette's ring sits above its ribbon tails, so the star centres on the ring rather
              than on the symbol's bounding box — hence the offset row instead of a plain overlay. */}
          <View className="mt-5 h-20 w-20 items-center justify-center">
            <SymbolView name="rosette" size={72} tintColor={colors.cert.seal} weight="semibold" />
            <View className="absolute -mt-4">
              <SymbolView name="star.fill" size={22} tintColor={colors.cert.seal} weight="bold" />
            </View>
          </View>
          <View className="mt-2 rounded-full bg-cert-seal px-3 py-1">
            <Text className="font-text text-caption font-bold uppercase tracking-ribbon text-white">{cert.tier}</Text>
          </View>

          <Text className="mt-5 font-text text-body text-text-secondary">This certifies that</Text>
          <Text className="mt-1 font-text text-h1 font-bold text-gamify-green">{name}</Text>
          <Text className="mt-2 font-text text-body text-text-secondary">has successfully completed</Text>
          <Text className="mt-1 text-center font-text text-h3 font-bold text-ink">{cert.award}</Text>
          <Text className="mt-2 font-text text-caption text-text-secondary">
            {set.yearGroup} · {set.subject}
          </Text>

          <View className="mt-5 h-px w-full bg-cert-rule" />
          <View className="mt-5 w-full flex-row items-end">
            <View className="flex-1">
              <Text className="font-text text-caption text-text-secondary">Awarded</Text>
              <Text className="mt-1 font-text text-body font-semibold text-ink">{cert.issued}</Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="font-text text-caption text-text-secondary">Issued by</Text>
              <Text className="mt-1 font-text text-body font-semibold text-primary">GoKid</Text>
            </View>
          </View>
          <Text className="mt-4 font-text text-caption text-text-secondary">{cert.reference}</Text>
        </View>

        {/* What this certificate covers */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <Text className="font-text text-h3 font-bold text-ink">What this covers</Text>
          <Text className="mt-1 font-text text-body text-text-secondary">
            National Curriculum objectives {name} demonstrated.
          </Text>
          {cert.objectives.map((o) => (
            <View key={o.title} className="mt-4 flex-row items-start">
              <View className="mt-0.5">
                <SymbolView name="checkmark.circle.fill" size={22} tintColor={colors.gamify.green} weight="regular" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-text text-body font-semibold text-ink">{o.title}</Text>
                <Text className="mt-0.5 font-text text-caption text-text-secondary">{o.strand}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* How it was earned */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <Text className="mb-4 font-text text-h3 font-bold text-ink">How you earned it</Text>
          <View className="flex-row">
            {cert.stats.map((s) => (
              <View key={s.label} className="flex-1 items-center">
                <Text numberOfLines={1} className="font-text text-tile text-text-secondary">
                  {s.label}
                </Text>
                <Text className="mt-1 font-text text-h3 font-bold text-ink">{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Keep it — print / share actions */}
        <View className="mt-4 rounded-2xl border border-border bg-white p-5">
          <Text className="font-text text-h3 font-bold text-ink">Keep it</Text>
          <Text className="mt-1 font-text text-body text-text-secondary">
            Print it for the fridge, or send it to someone who&apos;ll be proud.
          </Text>
          {/* Both controls now do what they say. "Save or print" used to be a printer icon over a
              plain Share.share call; printing is real since `expo-print` landed. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Print certificate"
            className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90"
            onPress={() => void onPrint()}
          >
            <SymbolView name="printer.fill" size={18} tintColor={colors.white} weight="semibold" />
            <Text className="font-text text-body-lg font-bold text-white">Print or save as PDF</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share certificate"
            className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full border border-primary bg-white active:opacity-70"
            onPress={onShare}
          >
            <SymbolView name="square.and.arrow.up" size={18} tintColor={colors.primary} weight="semibold" />
            <Text className="font-text text-body-lg font-bold text-primary">Share certificate</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all achievements"
            className="mt-3 items-center active:opacity-60"
            onPress={() => router.push("/progress/achievements")}
          >
            <Text className="font-text text-body font-semibold text-study-teal underline">See all achievements</Text>
          </Pressable>
        </View>

        {/* Encouragement banner */}
        <View className="mt-4 flex-row items-center rounded-2xl bg-gamify-green-wash p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-gamify-green">
            <SymbolView name="hands.clap.fill" size={22} tintColor={colors.white} weight="semibold" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-text text-body-lg font-bold text-gamify-green">Well done, {name}!</Text>
            <Text className="mt-1 font-text text-body text-text-secondary">{cert.encouragement}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Done — pinned full-width action */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done"
        className="mb-2 mt-3 h-14 flex-row items-center justify-center gap-2 rounded-full bg-study-teal active:opacity-90"
        onPress={() => router.back()}
      >
        <Text className="font-text text-body-lg font-bold text-white">Done</Text>
      </Pressable>
    </SafeAreaView>
  )
}
