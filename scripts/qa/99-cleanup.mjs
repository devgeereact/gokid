// Step 99. Tear down everything this harness created. DRY RUN by default — pass --yes to act.
//
// Scope is deliberately narrow and never widened:
//   - children whose client_id starts with 'qa-sec-' (cascades to reviews / sessions /
//     question_impressions / certificates)
//   - quiz_questions whose id starts with 'qa-sec-' (the temporary draft probe row)
//   - the two throwaway Clerk users recorded in fixture.json, by id — nothing else on the instance
//
// It cannot touch a real child or a real account: no query here selects outside those prefixes, and
// the Clerk deletes are by explicit id. Compare with scripts/clerk-purge.mjs, which deletes every
// user and is guarded for that reason.
import "dotenv/config"
import fs from "node:fs"
import { neon } from "@neondatabase/serverless"
import { bapi, readFixture, FIXTURE } from "./lib.mjs"

const GO = process.argv.includes("--yes")
const sql = neon(process.env.DATABASE_URL)
const { t1, t2 } = readFixture()

const kids = await sql`select id, client_id, name from children where client_id like 'qa-sec-%'`
const drafts = await sql`select id from quiz_questions where id like 'qa-sec-%'`

console.log(`children matching qa-sec-%: ${kids.length}`)
for (const k of kids) console.log("  -", k.client_id, k.name)
console.log(`quiz_questions matching qa-sec-%: ${drafts.length}`)
for (const d of drafts) console.log("  -", d.id)
console.log(`clerk users to delete: ${t1}, ${t2}`)

if (!GO) {
  console.log("\nDRY RUN — nothing deleted. Re-run with --yes to remove the rows and users listed above.")
  process.exit(0)
}

const deleted = await sql`delete from children where client_id like 'qa-sec-%' returning client_id`
console.log("deleted children rows:", deleted.length)
const draftDeleted = await sql`delete from quiz_questions where id like 'qa-sec-%' returning id`
console.log("deleted temp quiz_questions:", draftDeleted.length)

for (const id of [t1, t2]) {
  const r = await bapi(`/users/${id}`, { method: "DELETE" })
  console.log(`${r.status === 200 ? "deleted" : "FAILED "} clerk user ${id} (status ${r.status})`)
}

const after = await sql`select count(*)::int as n from children where client_id like 'qa-sec-%'`
console.log("children matching qa-sec-% after delete:", after[0].n)

fs.rmSync(FIXTURE, { force: true })
console.log("fixture removed:", FIXTURE)
