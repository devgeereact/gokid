import { Alert, Share } from "react-native"

/**
 * Sharing anything about a child, from anywhere in the app (design/gokid-screens.md §5 → "Share
 * Progress", §11 → Certificate).
 *
 * This exists to make the *gate* impossible to forget. `Share.share` posts to any app on the device,
 * and everything worth sharing here carries a child's first name, year group and attainment. A child
 * publishing their own identifying data with no adult in the loop is precisely what the UK
 * Children's Code is about, so every outbound share is behind the parent passcode.
 *
 * The certificate screen already got this right and the Congratulations screen shipped with a Share
 * button that did nothing at all — which is the safer of the two failure modes, but only by accident.
 * Wiring it up by copying the certificate's handler would have made a third place for the rule to
 * live and a third place to forget it. It lives here instead.
 *
 * Nothing about a child's own achievement is hidden from them — only the outbound share is gated.
 */
export function shareAboutChild({ unlocked, message }: { unlocked: boolean; message: string }) {
  if (!unlocked) {
    Alert.alert("Ask a grown-up", "Sharing is a grown-up job — open the Parent area first.")
    return
  }
  Share.share({ message }).catch(() => {
    // The parent dismissed the sheet. That is a decision, not a failure.
  })
}
