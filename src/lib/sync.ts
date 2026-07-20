import { useAuth } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { useCallback, useState } from "react"

import { apiGetAuthed, apiPostAuthed } from "./api"
import type { Child } from "./children"
import { mergeRemoteProgress, type ReviewCard, type SessionRecord, snapshotFor } from "./reviews"

/**
 * Progress sync, client side (design/gokid-screens.md §14 → "Sync Conflict", "Retry Sync").
 *
 * The problem this solves is not multi-device convenience, it is loss: a child's whole
 * spaced-repetition history lived in SecureStore on one phone, so a lost, replaced or reinstalled
 * device took months of learning with it and nothing could bring it back.
 *
 * ## How it behaves
 *
 * - **Push then pull, in that order.** Uploading first means the server has this device's work before
 *   we ask what it knows, so a first sync from a device with history cannot be overwritten by an
 *   empty server.
 * - **Merged, never replaced.** `mergeRemoteProgress` keeps whichever record of a card was reviewed
 *   later, matching the server's own last-write-wins rule (see app/api/progress+api.ts). The two
 *   sides therefore agree without a conversation.
 * - **Manual and explicit.** Sync runs when a parent asks, not on a timer. Automatic background sync
 *   needs a conflict story that has actually been exercised, and quietly mutating a child's record
 *   while they study is not something to switch on untested.
 *
 * Failure is reported to the caller rather than swallowed: a sync that silently did nothing is
 * exactly how a parent ends up believing their child's progress is backed up when it is not.
 */

export type SyncState = "idle" | "syncing" | "done" | "error"

type ProgressPayload = {
  ok: boolean
  reviews: ReviewCard[]
  sessions: SessionRecord[]
}

export function useSync() {
  const { getToken } = useAuth()
  const [state, setState] = useState<SyncState>("idle")
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sync = useCallback(
    async (child: Child): Promise<boolean> => {
      setState("syncing")
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("Not signed in.")

        const local = snapshotFor(child.id)

        // Push first — see the note above on ordering.
        await apiPostAuthed("/api/progress", token, {
          child: { clientId: child.id, name: child.name, yearCode: child.yearGroup },
          reviews: local.cards,
          sessions: local.sessions,
        })

        const remote = await apiGetAuthed<ProgressPayload>(
          `/api/progress?child=${encodeURIComponent(child.id)}`,
          token
        )
        mergeRemoteProgress(child.id, remote.reviews ?? [], remote.sessions ?? [])

        setLastSyncedAt(Date.now())
        setState("done")
        return true
      } catch (err) {
        Sentry.captureException(err, { tags: { flow: "progress-sync" } })
        setError(err instanceof Error ? err.message : "Sync failed")
        setState("error")
        return false
      }
    },
    [getToken]
  )

  return { state, error, lastSyncedAt, sync }
}
