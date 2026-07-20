// Verifies that the third-party API keys in .env actually authenticate. Prints ONLY the key name,
// whether it's present, and the HTTP status of an auth probe — never any key value.
import "dotenv/config"

const line = (name, present, detail) =>
  console.log(`${present ? "SET " : "MISS"}  ${name.padEnd(28)} ${detail ?? ""}`)

// --- OpenRouter (AI) — GET /key echoes the key's own metadata; 200 = valid.
{
  const key = process.env.OPENROUTER_API_KEY
  const base = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
  if (!key) line("OPENROUTER_API_KEY", false)
  else {
    try {
      const r = await fetch(`${base.replace(/\/$/, "")}/key`, { headers: { Authorization: `Bearer ${key}` } })
      line("OPENROUTER_API_KEY", true, `→ ${base}/key : HTTP ${r.status} ${r.ok ? "(valid)" : "(rejected)"}`)
    } catch (e) {
      line("OPENROUTER_API_KEY", true, `→ request failed: ${e?.message ?? e}`)
    }
  }
}

// --- ImageKit — the private key authenticates via HTTP Basic against the account endpoint.
{
  const key = process.env.IMAGEKIT_PRIVATE_KEY
  if (!key) line("IMAGEKIT_PRIVATE_KEY", false)
  else {
    try {
      const auth = Buffer.from(`${key}:`).toString("base64")
      const r = await fetch("https://api.imagekit.io/v1/files?limit=1", { headers: { Authorization: `Basic ${auth}` } })
      line("IMAGEKIT_PRIVATE_KEY", true, `→ imagekit files api : HTTP ${r.status} ${r.ok ? "(valid)" : "(rejected)"}`)
    } catch (e) {
      line("IMAGEKIT_PRIVATE_KEY", true, `→ request failed: ${e?.message ?? e}`)
    }
  }
}

// --- Presence-only for the rest (no cheap unauthenticated probe, or needs a served endpoint).
line("EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT", !!process.env.EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT, "(client, presence only)")
line("INNGEST_EVENT_KEY", !!process.env.INNGEST_EVENT_KEY, "(needs a served /api/inngest endpoint to exercise)")
line("INNGEST_SIGNING_KEY", !!process.env.INNGEST_SIGNING_KEY, "(needs a served /api/inngest endpoint to exercise)")
line("CLERK_SECRET_KEY", !!process.env.CLERK_SECRET_KEY, "(client SSO already verified working in-app)")
line("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, "(client SSO already verified working in-app)")
