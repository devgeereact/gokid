import { Platform } from "react-native"

/**
 * Subscription entitlement (design/gokid-screens.md §11).
 *
 * **There is no billing SDK in this app.** No RevenueCat, no StoreKit, no products configured in App
 * Store Connect. This module exists so that fact is stated in exactly one place and every screen
 * reads the truth from it, rather than each screen hardcoding a guess.
 *
 * It replaces a genuine bug, not a missing nicety: Settings and the Parent area both displayed
 * `value="GoKid Plus"` as a literal, so every parent — including one who had never seen a payment
 * screen — was told they were on a paid plan. A false statement about a commercial relationship is
 * a different category of wrong from a wrong number: a parent could reasonably conclude they were
 * being charged, and go looking for a way to cancel something that does not exist.
 *
 * ## Adding real billing later
 *
 * `useEntitlement()` is the only seam. When RevenueCat lands:
 *   1. `npx expo install react-native-purchases` (native module — needs a dev-client rebuild).
 *   2. Configure products in App Store Connect / Play Console.
 *   3. Replace the body of `useEntitlement` with a read of `Purchases.getCustomerInfo()`, mapping
 *      entitlements onto the `Entitlement` union below.
 *   4. Reconcile server-side against the `subscriptions` table already in db/schema.ts, which has
 *      the columns for it (`status`, `plan`, `currentPeriodEnd`, `revenuecatId`).
 *
 * The union deliberately models the states §11 asks for — trial, active, expired, billing failure —
 * so those screens can be built against a real shape once there is a real source. What must not
 * happen before then is a "Trial ending soon" screen driven by a trial that does not exist.
 */

export type Entitlement =
  /** No purchase, no trial. Every user today. */
  | { status: "free" }
  | { status: "trial"; endsAt: number; plan: string }
  | { status: "active"; renewsAt: number | null; plan: string }
  | { status: "expired"; endedAt: number; plan: string }
  /** Payment failed but the subscription is in its grace period — access continues for now. */
  | { status: "grace"; retryUntil: number; plan: string }

/**
 * The current entitlement.
 *
 * Hardcoded to `free` because that is what is true: nothing in this app can take a payment, so no
 * user can hold anything else. This is not a placeholder pretending to be a lookup — it is the
 * correct answer until a billing SDK exists, and the screens that read it are written to be right
 * either way.
 */
export function useEntitlement(): Entitlement {
  return { status: "free" }
}

/** Everything currently free, because everything is. Kept so paywalled features read the seam. */
export function useHasPlus(): boolean {
  return useEntitlement().status !== "free"
}

/** Short label for a status row — never invents a plan name. */
export function entitlementLabel(entitlement: Entitlement): string {
  switch (entitlement.status) {
    case "free":
      return "Free"
    case "trial":
      return "Free trial"
    case "active":
      return entitlement.plan
    case "expired":
      return "Expired"
    case "grace":
      return "Payment issue"
  }
}

/**
 * Where a parent actually manages a subscription: the platform's own settings, not a screen in this
 * app. Apple and Google both require cancellation to go through them, and neither needs an SDK to
 * link to — so this works today and keeps working after billing lands.
 */
export function manageSubscriptionUrl(): string {
  return Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions"
}
