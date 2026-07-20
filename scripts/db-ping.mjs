// Read-only DB connectivity check. Prints ONLY status and table names — never the connection string
// or any secret. `.env` is loaded by dotenv here because plain node (unlike the Expo CLI) does not.
import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const url = process.env.DATABASE_URL
if (!url) {
  console.log("RESULT: DATABASE_URL not set in the environment")
  process.exit(2)
}

// Show only the host, never credentials, so we can confirm which DB without leaking the secret.
let host = "unknown"
try {
  host = new URL(url).host
} catch {
  /* ignore */
}

try {
  const sql = neon(url)
  const one = await sql`select 1 as ok`
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`
  const migrations = await sql`select exists (
    select 1 from information_schema.tables
    where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
  ) as has_journal`

  console.log("RESULT: connected to", host)
  console.log("select 1 →", one[0]?.ok === 1 ? "ok" : "unexpected")
  console.log("public tables (" + tables.length + "):", tables.map((t) => t.table_name).join(", ") || "(none)")
  console.log("drizzle migrations table:", migrations[0]?.has_journal ? "present (migrated)" : "absent (not migrated yet)")
} catch (err) {
  console.log("RESULT: connection FAILED to", host)
  console.log("error:", err?.message ?? String(err))
  process.exit(1)
}
