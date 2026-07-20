// Read-only inventory of the remote database, so nothing is dropped blind.
// Prints schemas, tables, row counts and enum types. Never prints the connection string.
import "dotenv/config"
import { neon } from "@neondatabase/serverless"

const url = process.env.DATABASE_URL
if (!url) {
  console.log("DATABASE_URL not set")
  process.exit(2)
}
const sql = neon(url)
console.log("host:", new URL(url).host)

const schemas = await sql`
  select schema_name from information_schema.schemata
  where schema_name not in ('pg_catalog','information_schema','pg_toast')
  order by schema_name`
console.log("\nschemas:", schemas.map((s) => s.schema_name).join(", ") || "(none)")

const tables = await sql`
  select table_schema, table_name from information_schema.tables
  where table_schema not in ('pg_catalog','information_schema','pg_toast')
  order by table_schema, table_name`

console.log("\ntables (" + tables.length + "):")
for (const t of tables) {
  let n = "?"
  try {
    const r = await sql(`select count(*)::int as n from "${t.table_schema}"."${t.table_name}"`)
    n = r[0].n
  } catch {
    /* view or no access */
  }
  console.log(`  ${t.table_schema}.${t.table_name.padEnd(28)} rows=${n}`)
}

const enums = await sql`
  select t.typname, n.nspname from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where t.typtype = 'e' and n.nspname not in ('pg_catalog','information_schema')
  order by n.nspname, t.typname`
console.log("\nenum types (" + enums.length + "):", enums.map((e) => `${e.nspname}.${e.typname}`).join(", ") || "(none)")
