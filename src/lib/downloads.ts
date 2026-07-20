import * as Sentry from "@sentry/react-native"
import { Directory, File, Paths } from "expo-file-system"
import { useCallback, useSyncExternalStore } from "react"

import { apiGet, type ApiSet } from "./api"

/**
 * Offline downloads (design/gokid-screens.md §14 → "Download Manager", "Download Progress",
 * "Download Queue", "Storage Full", "Download Complete"; §3/§5/§10/§12 → Downloads).
 *
 * This is the pipeline the app has never had. Before it, the Download Set screen shipped a button
 * wired to `router.back()` under the words "Available offline" — a child tapped it, was told the set
 * was saved, and would have found nothing on a train.
 *
 * ## What a download actually is
 *
 * A set's content as JSON on disk: the set record, every card in `position` order, and the quiz
 * questions — fetched from `GET /api/sets/:id`, which exists for this purpose. There is no media to
 * fetch (set artwork is bundled with the app, not remote), so a download is one request and one
 * file. That keeps "downloaded" a binary fact rather than a partially-satisfied promise.
 *
 * ## API notes (expo-file-system SDK 57)
 *
 * SDK 57 uses the `File` / `Directory` / `Paths` API, **not** the legacy `documentDirectory` +
 * `downloadAsync` functions. `file.text()` is async; `create`, `write`, `delete`, `exists` and
 * `size` are synchronous. Verified against the installed type definitions rather than written from
 * memory, per AGENTS.md.
 *
 * Files live under `Paths.document` (not `Paths.cache`): a download is something the child asked for
 * and expects to survive, and the OS may evict the cache directory whenever it likes.
 */

/** One folder, so a wipe is one delete and the manifest can be rebuilt by listing it. */
const FOLDER = "downloads"

export type DownloadState = "idle" | "downloading" | "done" | "error"

export type DownloadedSet = {
  set: ApiSet
  cards: { id: string; question: string; answer: string }[]
  quiz: { id: string; kind: string; payload: unknown }[]
  /** Epoch ms the download finished. */
  at: number
}

type Entry = {
  state: DownloadState
  bytes: number
  at: number
  error?: string
  /** Copied out of the downloaded file so the manager can name a set without the catalogue loaded —
   *  which is the whole point, since the manager is most useful when there is no connection. */
  title?: string
  subject?: string
  topic?: string
}

/** setId → entry. Mirrors what is on disk; rebuilt from the folder on first use. */
let index: Record<string, Entry> = {}
let hydrated = false
let hydrating: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function root(): Directory {
  const dir = new Directory(Paths.document, FOLDER)
  if (!dir.exists) dir.create({ intermediates: true })
  return dir
}

function fileFor(setId: string): File {
  // setId comes from our own catalogue, but it lands in a filesystem path — anything that is not a
  // plain identifier is stripped so a crafted id cannot walk out of the downloads folder.
  const safe = setId.replace(/[^a-zA-Z0-9._-]/g, "_")
  return new File(root(), `${safe}.json`)
}

/**
 * Rebuild the index by listing the folder. The disk is the source of truth, not a separate manifest
 * that could disagree with it — a manifest saying "downloaded" for a file the OS removed is exactly
 * the failure this whole feature exists to avoid.
 */
async function hydrate() {
  try {
    const next: Record<string, Entry> = {}
    for (const item of root().list()) {
      if (!(item instanceof File) || item.extension !== ".json") continue
      const setId = item.name.replace(/\.json$/, "")
      let meta: Pick<Entry, "title" | "subject" | "topic" | "at"> = { at: 0 }
      try {
        // Read the set record back out of the file itself. A download has to be listable offline,
        // and the catalogue that would otherwise supply the title needs a connection.
        const body = JSON.parse(await item.text()) as DownloadedSet
        meta = { title: body.set?.title, subject: body.set?.subject, topic: body.set?.topic, at: body.at ?? 0 }
      } catch {
        // A file we cannot parse is still on disk taking up space, so it is listed — but without a
        // title, rather than with a guessed one. The manager offers to remove it.
      }
      next[setId] = { state: "done", bytes: item.size ?? 0, ...meta }
    }
    index = next
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "downloads-hydrate" } })
  } finally {
    hydrated = true
    hydrating = null
    emit()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!hydrated && !hydrating) hydrating = hydrate()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return index
}

function set(setId: string, entry: Entry) {
  index = { ...index, [setId]: entry }
  emit()
}

/** Save a set for offline use. Resolves true on success; never throws at the caller. */
export async function downloadSet(setId: string): Promise<boolean> {
  if (index[setId]?.state === "downloading") return false
  set(setId, { state: "downloading", bytes: 0, at: 0 })
  try {
    const payload = await apiGet<{
      ok: boolean
      set: ApiSet
      cards: DownloadedSet["cards"]
      quiz: DownloadedSet["quiz"]
    }>(`/api/sets/${encodeURIComponent(setId)}`)

    const body: DownloadedSet = {
      set: payload.set,
      cards: payload.cards,
      quiz: payload.quiz,
      at: Date.now(),
    }
    const json = JSON.stringify(body)
    const file = fileFor(setId)
    file.create({ overwrite: true })
    file.write(json)
    set(setId, {
      state: "done",
      bytes: file.size ?? json.length,
      at: body.at,
      title: body.set.title,
      subject: body.set.subject,
      topic: body.set.topic,
    })
    return true
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "downloads-write", setId } })
    // "Storage full" is not a special case worth its own screen: the OS reports it as a write
    // failure like any other, and the honest message is the same — it did not save, try again.
    set(setId, {
      state: "error",
      bytes: 0,
      at: 0,
      error: error instanceof Error ? error.message : "Download failed",
    })
    return false
  }
}

/** Remove a downloaded set (§12 → "Delete Download"). */
export function removeDownload(setId: string) {
  try {
    const file = fileFor(setId)
    if (file.exists) file.delete()
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "downloads-delete", setId } })
  }
  const next = { ...index }
  delete next[setId]
  index = next
  emit()
}

/** Read a downloaded set back — the point of the whole feature. */
export async function readDownload(setId: string): Promise<DownloadedSet | null> {
  try {
    const file = fileFor(setId)
    if (!file.exists) return null
    return JSON.parse(await file.text()) as DownloadedSet
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "downloads-read", setId } })
    return null
  }
}

/** Delete every download — called by the account-deletion path alongside the other stores. */
export function clearAllDownloads() {
  try {
    const dir = root()
    if (dir.exists) dir.delete()
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "downloads-clear" } })
  }
  index = {}
  hydrated = true
  emit()
}

export function useDownloads() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const stateOf = useCallback((setId: string): DownloadState => snapshot[setId]?.state ?? "idle", [snapshot])
  const isDownloaded = useCallback((setId: string) => snapshot[setId]?.state === "done", [snapshot])

  const totalBytes = Object.values(snapshot).reduce((sum, e) => sum + e.bytes, 0)
  const ids = Object.keys(snapshot).filter((id) => snapshot[id].state === "done")

  return { entries: snapshot, ids, totalBytes, stateOf, isDownloaded, download: downloadSet, remove: removeDownload }
}
