import { router } from "expo-router"
import type { SFSymbol } from "expo-symbols"

import { EmptyState } from "@/components/empty-state"
import type { ApiErrorKind } from "@/lib/api"

/**
 * The failure state for a screen whose data came from the API (design/gokid-screens.md §16 → Errors:
 * "Server Error", "Timeout", "Maintenance", "Session Expired", "Authentication Failed").
 *
 * Every screen used to render the same "Couldn't load sets — check your connection and try again",
 * whatever had actually happened. That copy is wrong in three of the five cases and actively
 * misleading in two of them: a 500 is not the parent's connection, and a expired session cannot be
 * fixed by retrying at all — a parent could sit there pressing Try again forever.
 *
 * So the kind chooses the icon, the words, and crucially **the action**:
 *  - session expired → sign in, because retry is useless
 *  - maintenance → no retry button at all; "in a few minutes" is the honest advice
 *  - everything else → retry
 */

const PRESENTATION: Record<
  ApiErrorKind,
  { symbol: SFSymbol; title: string; body: string; action: "retry" | "signin" | "none" }
> = {
  offline: {
    symbol: "wifi.slash",
    title: "No connection",
    body: "GoKid needs the internet to load new sets. Anything downloaded still works.",
    action: "retry",
  },
  timeout: {
    symbol: "clock.badge.exclamationmark",
    title: "That took too long",
    body: "The connection is slow or dropped out. Have another go.",
    action: "retry",
  },
  auth: {
    symbol: "person.crop.circle.badge.exclamationmark",
    title: "You’ve been signed out",
    body: "Your session ended. Sign in again and everything will be where you left it.",
    action: "signin",
  },
  maintenance: {
    symbol: "wrench.and.screwdriver",
    title: "Back shortly",
    body: "GoKid is having a quick tidy-up. Nothing has been lost — try again in a few minutes.",
    action: "none",
  },
  server: {
    symbol: "exclamationmark.triangle",
    title: "Something went wrong at our end",
    // Explicitly not "check your connection" — this one is ours, and telling a parent to go and
    // check their router for a bug we caused wastes their time.
    body: "It isn’t you, and nothing has been lost. Please try again shortly.",
    action: "retry",
  },
  unknown: {
    symbol: "exclamationmark.triangle",
    title: "Couldn’t load that",
    body: "Something went wrong. Please try again.",
    action: "retry",
  },
}

export function ApiErrorState({ kind, onRetry }: { kind: ApiErrorKind | null; onRetry?: () => void }) {
  const view = PRESENTATION[kind ?? "unknown"]

  if (view.action === "signin") {
    return (
      <EmptyState
        symbol={view.symbol}
        title={view.title}
        body={view.body}
        actionLabel="Sign in"
        onAction={() => router.replace("/sign-in")}
      />
    )
  }

  return (
    <EmptyState
      symbol={view.symbol}
      title={view.title}
      body={view.body}
      actionLabel={view.action === "retry" ? "Try again" : undefined}
      onAction={view.action === "retry" ? onRetry : undefined}
    />
  )
}
