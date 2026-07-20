import * as Sentry from "@sentry/react-native"
import { type SFSymbol, SymbolView } from "expo-symbols"
import { useState } from "react"
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native"

import { AlertBanner } from "@/components/alert-banner"
import { colors } from "@/design/tokens"
import { apiPost } from "@/lib/api"

/**
 * Report an incorrect card (design/gokid-screens.md §5 → "Report Incorrect Card").
 *
 * Written for the person most likely to spot the problem: the child looking at the card. So the
 * reasons are plain sentences a Year-2 reader can pick from, there is no free-text box to fill in,
 * and the whole thing is two taps. An adult-worded form behind a settings menu would collect nothing.
 *
 * A wrong card is worth this much care because the spaced-repetition engine will keep bringing it
 * back and reinforcing the wrong answer until a human fixes it — see app/api/report-card+api.ts.
 *
 * The confirmation is deliberately modest: it thanks them and says a person will check. It does not
 * promise the card will change, because that is not this screen's to promise.
 */

type Reason = { key: string; label: string; symbol: SFSymbol }

const REASONS: Reason[] = [
  { key: "wrong-answer", label: "The answer is wrong", symbol: "xmark.circle" },
  { key: "confusing", label: "The question is confusing", symbol: "questionmark.circle" },
  { key: "typo", label: "There is a spelling mistake", symbol: "textformat.abc" },
  { key: "not-curriculum", label: "This isn’t what we learn at school", symbol: "book.closed" },
  { key: "other", label: "Something else", symbol: "ellipsis.circle" },
]

export function ReportCardSheet({
  visible,
  cardId,
  setId,
  onClose,
}: {
  visible: boolean
  cardId: string
  setId: string
  onClose: () => void
}) {
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  async function send(reason: string) {
    if (sending) return
    setSending(reason)
    setFailed(false)
    try {
      await apiPost("/api/report-card", { cardId, setId, reason })
      setSent(true)
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "report-card" } })
      setFailed(true)
    } finally {
      setSending(null)
    }
  }

  function close() {
    // Reset so reopening the sheet on another card does not show the last card's confirmation.
    setSent(false)
    setFailed(false)
    onClose()
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-background px-5 pb-10 pt-5">
          <View className="mb-4 flex-row items-center">
            <Text className="flex-1 font-text text-h3 font-bold text-ink">
              {sent ? "Thank you" : "What’s wrong with this card?"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-9 w-9 items-center justify-center active:opacity-60"
              hitSlop={8}
              onPress={close}
            >
              <SymbolView name="xmark" size={16} tintColor={colors.ink} weight="semibold" />
            </Pressable>
          </View>

          {sent ? (
            <>
              <View className="items-center py-4">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-badge-strong">
                  <SymbolView
                    name="checkmark"
                    size={28}
                    tintColor={colors.badge["strong-ink"]}
                    weight="bold"
                  />
                </View>
                <Text className="mt-4 text-center font-text text-body-lg text-text-secondary">
                  A person will check this card. You can carry on studying.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                className="mt-2 h-14 items-center justify-center rounded-button bg-primary active:opacity-80"
                onPress={close}
              >
                <Text className="font-text text-body-lg font-bold text-white">Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              {failed ? (
                <View className="mb-3">
                  <AlertBanner
                    title="We couldn’t send that"
                    body="Check your connection and try again."
                    onDismiss={() => setFailed(false)}
                  />
                </View>
              ) : null}

              {REASONS.map((reason) => (
                <Pressable
                  key={reason.key}
                  accessibilityRole="button"
                  accessibilityLabel={reason.label}
                  accessibilityState={{ busy: sending === reason.key, disabled: sending !== null }}
                  className={`mb-3 h-14 flex-row items-center rounded-2xl border border-border bg-white px-4 active:opacity-70 ${
                    sending !== null && sending !== reason.key ? "opacity-40" : ""
                  }`}
                  disabled={sending !== null}
                  onPress={() => void send(reason.key)}
                >
                  {sending === reason.key ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <SymbolView name={reason.symbol} size={20} tintColor={colors.primary} weight="semibold" />
                  )}
                  <Text className="ml-3 flex-1 font-text text-body-lg text-ink">{reason.label}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}
