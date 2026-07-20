import Constants from "expo-constants"
import * as Sentry from "@sentry/react-native"
import { useCallback, useEffect, useState } from "react"

import type { MixedQuestion } from "@/lib/study"

/**
 * Client → API layer. The app never touches Postgres directly (AGENTS.md); it calls the Expo Router
 * API routes, which own the Drizzle/Neon access.
 *
 * Base URL: in development the API is served by the same dev server that served the bundle, so it is
 * derived from `hostUri` rather than hard-coded — that keeps it correct whether the client connected
 * over localhost or a LAN IP. In a release build it comes from `EXPO_PUBLIC_API_URL` (client-safe by
 * definition: it is a public origin, never a secret).
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL
  if (configured) return configured.replace(/\/$/, "")
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) return `http://${hostUri}`
  throw new Error("No API base URL. Set EXPO_PUBLIC_API_URL for release builds.")
}

/**
 * What went wrong, as a kind rather than a string (design/gokid-screens.md §16 → Errors).
 *
 * Every failure used to arrive as `Error("GET /api/sets failed: HTTP 500")`, so every screen could
 * only say "couldn't load". These are the cases a screen genuinely needs to treat differently:
 *
 *  - `offline` / `timeout` — the child's connection. Retrying is the right advice.
 *  - `auth` — the session expired. Retrying is useless; they must sign in again.
 *  - `maintenance` — 503, the server is deliberately down. Retrying *later* is the advice.
 *  - `server` — a genuine 5xx. Not the parent's fault and not fixable by them, so the copy must not
 *    tell them to check their connection, which is the classic misleading fallback.
 */
export type ApiErrorKind = "offline" | "timeout" | "auth" | "maintenance" | "server" | "unknown"

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.kind = kind
    this.status = status
  }
}

/** A request that hangs forever is a spinner that never stops — worse than a clear failure. */
const TIMEOUT_MS = 12_000

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return "auth"
  if (status === 503) return "maintenance"
  if (status >= 500) return "server"
  return "unknown"
}

/** Human copy per kind, so every screen says the same thing about the same failure. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again."
  switch (error.kind) {
    case "offline":
      return "No connection. Check your internet and try again."
    case "timeout":
      return "That took too long. Check your connection and try again."
    case "auth":
      return "You’ve been signed out. Sign in again to carry on."
    case "maintenance":
      return "GoKid is having a quick tidy-up. Please try again in a few minutes."
    case "server":
      // Deliberately does not blame the parent's connection — this one is ours.
      return "Something went wrong at our end. It isn’t you — please try again shortly."
    default:
      return "Something went wrong. Please try again."
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${resolveBaseUrl()}${path}`
  // AbortController rather than Promise.race: race leaves the request running in the background,
  // which on a flaky connection stacks up sockets the app can never use.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      throw new ApiError(kindForStatus(response.status), `${path} failed: HTTP ${response.status}`, response.status)
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("timeout", `${path} timed out after ${TIMEOUT_MS}ms`)
    }
    // fetch rejects with a TypeError when the device cannot reach the host at all.
    throw new ApiError("offline", error instanceof Error ? error.message : "Network request failed")
  } finally {
    clearTimeout(timer)
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

/**
 * Authed variants for the progress API. The token is a Clerk session JWT obtained by the caller via
 * `getToken()` — it is deliberately passed in rather than fetched here, so this module stays free of
 * auth state and a route that forgets to authenticate cannot silently fall back to an anonymous call.
 */
export async function apiGetAuthed<T>(path: string, token: string): Promise<T> {
  return request<T>(path, { headers: { Authorization: `Bearer ${token}` } })
}

export async function apiPostAuthed<T>(path: string, token: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

/** What `GET /api/sets` returns per set. Content only — a child's progress is layered on separately. */
export type ApiSet = {
  id: string
  title: string
  subject: string
  topic: string
  yearCode: string
  description: string
  minutes: number
  /** Derived server-side from the real row count, so it can never drift from the cards that exist. */
  cardsTotal: number
  quizCount: number
}

type Query<T> = {
  data: T | null
  loading: boolean
  /** Human copy for the failure, already mapped from the error kind. */
  error: string | null
  /** The kind behind `error`, so a screen can act differently (e.g. send an expired session to sign-in). */
  errorKind: ApiErrorKind | null
  reload: () => void
}

/**
 * Minimal fetch-on-mount hook. No cache layer yet — one screen, one request; add one when a second
 * screen needs the same data in the same session.
 *
 * State is written only from the async callbacks, never synchronously in the effect body: the result
 * is stamped with the request it belongs to, and `loading` is DERIVED by comparing that stamp to the
 * current request. Setting loading/error synchronously inside the effect would trigger the cascading
 * re-render the React Compiler's `set-state-in-effect` rule warns about.
 */
function useQuery<T>(path: string, enabled = true): Query<T> {
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<{
    key: string
    data: T | null
    error: string | null
    errorKind: ApiErrorKind | null
  } | null>(null)

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const key = `${path}#${nonce}`

  useEffect(() => {
    if (!enabled) return
    let active = true
    apiGet<T>(path)
      .then((data) => {
        if (active) setResult({ key, data, error: null, errorKind: null })
      })
      .catch((err: unknown) => {
        if (!active) return
        Sentry.captureException(err, { tags: { flow: "api-get" }, extra: { path } })
        setResult({
          key,
          data: null,
          // The screen shows copy chosen by kind, not a raw HTTP string — see apiErrorMessage.
          error: apiErrorMessage(err),
          errorKind: err instanceof ApiError ? err.kind : "unknown",
        })
      })
    return () => {
      active = false
    }
  }, [path, enabled, key])

  // Fresh only when the settled result belongs to the request currently being asked for.
  const fresh = result?.key === key
  return {
    data: fresh ? result.data : null,
    loading: enabled && !fresh,
    error: fresh ? result.error : null,
    errorKind: fresh ? result.errorKind : null,
    reload,
  }
}

/**
 * A no-repeat quiz served for a specific child — `GET /api/quiz` (see api/quiz+api.ts).
 *
 * Unlike `getStudySet`, which returns a set's fixed question list identical for everyone, this asks
 * the server for questions this child has NOT seen in the last 12 hours, already shuffled and with
 * option positions re-randomised. The server owns the no-repeat rule; the client just renders what it
 * is handed. `repeated > 0` means the pool was exhausted inside the window and some questions were
 * re-served — the signal to grow the pool with the generator.
 */
export type ServedQuiz = {
  ok: boolean
  setId: string
  count: number
  repeated: number
  poolSize: number
  questions: {
    id: string
    kind: MixedQuestion["kind"]
    prompt: string
    explanation: string | null
    topic: string | null
    difficulty: number
    payload: Record<string, unknown>
  }[]
}

/**
 * Reassemble a served row into the flat `MixedQuestion` the quiz runner consumes. The server stores
 * the kind-specific fields under `payload` (options/answer, accept, items, pairs …); the client union
 * carries them at the top level, so this is the inverse of the server's `toStoredColumns` split.
 */
export function servedToMixed(row: ServedQuiz["questions"][number]): MixedQuestion {
  const base = {
    id: row.id,
    prompt: row.prompt,
    ...(row.explanation ? { explanation: row.explanation } : {}),
    ...(row.topic ? { topic: row.topic } : {}),
  }
  return { ...base, kind: row.kind, ...row.payload } as MixedQuestion
}

/**
 * Fetch a no-repeat quiz for a child. `token` is a Clerk session JWT the caller obtains via
 * `getToken()` (same contract as the progress API), and `clientId` is the child's on-device id. Kept
 * a plain async function, not a hook, so the quiz screen can call it once on entry and thread the
 * resulting questions through its existing results/review pipeline.
 */
export async function fetchServedQuiz(
  params: { setId: string; clientId: string; count?: number },
  token: string
): Promise<MixedQuestion[]> {
  const q = new URLSearchParams({ setId: params.setId, clientId: params.clientId })
  if (params.count) q.set("count", String(params.count))
  const res = await apiGetAuthed<ServedQuiz>(`/api/quiz?${q.toString()}`, token)
  return res.questions.map(servedToMixed)
}

/** The study catalogue for a year group, straight from the database. */
export function useSets(yearCode?: string) {
  const path = yearCode ? `/api/sets?year=${encodeURIComponent(yearCode)}` : "/api/sets"
  const { data, loading, error, errorKind, reload } = useQuery<{ ok: boolean; count: number; sets: ApiSet[] }>(path)
  return { sets: data?.sets ?? [], loading, error, errorKind, reload }
}
