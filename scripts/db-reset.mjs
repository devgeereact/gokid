// Destructive: drops ONLY the GoKid objects this project created, by explicit name.
// Deliberately does NOT touch Neon's own `neon_auth` / `auth` / `pgrst` schemas.
import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

const TABLES = [
  "subscriptions",
  "certificates",
  "sessions",
  "reviews",
  "quiz_questions",
  "cards",
  "children",
  "study_sets",
]
const ENUMS = ["avatar_kind", "cert_tier", "quiz_kind", "rating", "sub_status"]

console.log("host:", new URL(process.env.DATABASE_URL).host)

for (const t of TABLES) {
  await sql.query(`drop table if exists "public"."${t}" cascade`)
  console.log("dropped table public." + t)
}
for (const e of ENUMS) {
  await sql.query(`drop type if exists "public"."${e}" cascade`)
  console.log("dropped enum  public." + e)
}
// The drizzle migration journal — so the next migrate runs from a clean slate.
await sql.query(`drop schema if exists "drizzle" cascade`)
console.log("dropped schema drizzle (migration journal)")

const left = await sql`
  select table_schema, table_name from information_schema.tables
  where table_schema not in ('pg_catalog','information_schema','pg_toast')
  order by table_schema, table_name`
console.log("\nremaining tables:")
for (const r of left) console.log("  " + r.table_schema + "." + r.table_name)
