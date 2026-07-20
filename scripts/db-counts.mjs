import "dotenv/config"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL)
const tables = await sql`
  select table_schema s, table_name t from information_schema.tables
  where table_schema in ('public','neon_auth','auth','pgrst','drizzle')
  order by table_schema, table_name`
for (const {s,t} of tables) {
  try {
    const r = await sql.query(`select count(*)::int as n from "${s}"."${t}"`)
    const rows = Array.isArray(r) ? r : r.rows
    console.log(`${(s+"."+t).padEnd(38)} rows=${rows[0].n}`)
  } catch (e) { console.log(`${(s+"."+t).padEnd(38)} ERR ${e.message.slice(0,60)}`) }
}
