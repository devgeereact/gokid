// Shared plumbing for the API security / correctness harness in this directory.
//
// Everything here talks to the *dev* Clerk instance and the local Expo Router API server. It never
// prints a secret: tokens, sign-in tickets and the Clerk secret key are redacted before anything is
// logged or written to disk.
import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Buffer } from "node:buffer"

const HERE = path.dirname(fileURLToPath(import.meta.url))

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const PK = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!CLERK_SECRET_KEY || !PK) {
  throw new Error("CLERK_SECRET_KEY and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be set in .env")
}
if (!CLERK_SECRET_KEY.startsWith("sk_test")) {
  throw new Error("REFUSING: CLERK_SECRET_KEY is not a development instance (sk_test). This harness creates and deletes users.")
}

/** Local API server. `npm start` serves the +api.ts routes here. */
export const API = process.env.QA_API ?? "http://localhost:5062"

/** Where request/response transcripts land. Point QA_OUT at docs/qa/<date>/... for a formal audit. */
export const OUT = process.env.QA_OUT ?? path.join(HERE, ".transcripts")
fs.mkdirSync(OUT, { recursive: true })

/** Throwaway identities minted by 00-mint-users.mjs, consumed by every later script. */
export const FIXTURE = path.join(HERE, "fixture.json")

export function writeFixture(data) {
  fs.writeFileSync(FIXTURE, JSON.stringify(data, null, 2))
  return FIXTURE
}

export function readFixture() {
  if (!fs.existsSync(FIXTURE)) {
    throw new Error("No fixture.json — run `node scripts/qa/00-mint-users.mjs` first.")
  }
  return JSON.parse(fs.readFileSync(FIXTURE, "utf8"))
}

function frontendHost() {
  const b64 = PK.split("_").slice(2).join("_")
  return Buffer.from(b64, "base64").toString("utf8").replace(/\$$/, "")
}
const FAPI = `https://${frontendHost()}`

export function redact(str) {
  return str
    .replace(/sk_test_[A-Za-z0-9]+/g, "sk_test_[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED_JWT]")
    .replace(/"token":"[^"]+"/g, '"token":"[REDACTED_TICKET]"')
}

export function log(...args) {
  console.log(...args.map((a) => (typeof a === "string" ? redact(a) : redact(JSON.stringify(a)))))
}

export function save(name, content) {
  const file = path.join(OUT, `${name}.txt`)
  fs.writeFileSync(file, redact(typeof content === "string" ? content : JSON.stringify(content, null, 2)))
  return file
}

/** Clerk Backend API call. */
export async function bapi(pathname, opts = {}) {
  const r = await fetch(`https://api.clerk.com/v1${pathname}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  })
  const text = await r.text()
  return { status: r.status, body: text }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mint a fresh ~60s session JWT for a given Clerk user id. Never logs the token itself.
 * Frontend API sign-in creation is rate-limited to 5/10s (dev instance) — retries with backoff on
 * a 429 rather than minting in a tight loop.
 */
export async function mintToken(userId) {
  let lastErr
  for (let attempt = 0; attempt < 5; attempt++) {
    const tokenResp = await bapi("/sign_in_tokens", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, expires_in_seconds: 60 }),
    })
    if (tokenResp.status !== 200) throw new Error("sign_in_token mint failed: " + redact(tokenResp.body))
    const ticket = JSON.parse(tokenResp.body).token

    const exResp = await fetch(`${FAPI}/v1/client/sign_ins?_is_native=1`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ strategy: "ticket", ticket }).toString(),
    })
    const exJson = await exResp.json()
    const jwt = exJson?.client?.sessions?.[0]?.last_active_token?.jwt
    if (jwt) return jwt
    lastErr = new Error("ticket exchange did not yield a session jwt: " + redact(JSON.stringify(exJson)))
    if (exJson?.errors?.[0]?.code === "too_many_requests") {
      await sleep(3000)
      continue
    }
    throw lastErr
  }
  throw lastErr
}

/** Call the local API with a bearer token, return {status, json, text}. */
export async function call(method, pathAndQuery, token, body) {
  const r = await fetch(`${API}${pathAndQuery}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: r.status, text, json }
}

export function transcript(reqDesc, result) {
  return `${reqDesc}\n\n--- response ---\nstatus: ${result.status}\n${result.text}\n`
}

/** Numbered step runner shared by the phase scripts. */
export function stepper(startAt) {
  let n = startAt
  return async function step(name, desc, resultPromise) {
    n++
    const id = String(n).padStart(2, "0")
    const result = await resultPromise
    const file = save(`${id}-${name}`, transcript(desc, result))
    log(`[${id}] ${name} -> status ${result.status}`, file)
    return result
  }
}


/**
 * Assertions, so a failing security check actually fails the run.
 *
 * Before this existed every script printed its expectation as prose — `console.log("...(expect
 * false)")` — and exited 0 regardless. `npm run qa:sec` chains the scripts with `&&`, so the exit
 * code was the only pass/fail signal, and nothing ever set it. A genuine cross-family read, a
 * repeated question or a leaked draft row would have produced a clean, green run.
 *
 * A security suite that cannot fail is worse than no suite, because it manufactures confidence.
 * Call `expect()` for every documented expectation and `summarise()` at the end of each script.
 */
const failures = []

export function expect(name, condition, detail = "") {
  const ok = Boolean(condition)
  if (!ok) failures.push(detail ? `${name} — ${detail}` : name)
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`)
  return ok
}

/** Print the tally and exit non-zero if anything failed. Call at the end of every check script. */
export function summarise(scriptName) {
  if (failures.length === 0) {
    console.log(`\n=== ${scriptName}: PASS ===`)
    return
  }
  console.log(`\n=== ${scriptName}: FAIL (${failures.length}) ===`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
