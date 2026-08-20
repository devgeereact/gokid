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

// fixture.json holds the ONLY record of these throwaway Clerk user ids. If a delete fails and the
// fixture is removed anyway, the user is orphaned on the instance with nothing left to identify it.
// So: track failures, and keep the fixture unless every delete succeeded.
const undeleted = []
for (const id of [t1, t2].filter(Boolean)) {
  const r = await bapi(`/users/${id}`, { method: "DELETE" })
  const gone = r.status === 200 || r.status === 404 // 404 = already deleted, which is success here
  if (!gone) undeleted.push(id)
  console.log(`${gone ? "deleted" : "FAILED "} clerk user ${id} (status ${r.status})`)
}

const after = await sql`select count(*)::int as n from children where client_id like 'qa-sec-%'`
console.log("children matching qa-sec-% after delete:", after[0].n)

if (undeleted.length > 0) {
  console.error(`\nKEEPING ${FIXTURE} — ${undeleted.length} Clerk user(s) were not deleted:`)
  for (const id of undeleted) console.error(`  - ${id}`)
  console.error("Re-run this script once the instance is reachable, or delete them by hand.")
  process.exit(1)
}

fs.rmSync(FIXTURE, { force: true })
console.log("fixture removed:", FIXTURE)
