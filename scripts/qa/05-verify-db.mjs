// Step 5. Read back what the earlier steps actually wrote.
//
// Read-only. The API responses alone cannot prove isolation or last-write-wins — only the rows can.
// Everything here is scoped to client_id like 'qa-sec-%', so real children are never listed.
//
// What to check in the output:
//   - every qa-sec child's clerk_user_id matches the identity that created it (no cross-tenant row)
//   - the ABUSE post produced a SECOND row under the other user, not an edit of the original
//   - session dedupe count is 1, not 2
//   - card-a ended on box 3 / gotit, card-b ended on box 3 / gotit (the earlier ts did not win)
import "dotenv/config"
import { neon } from "@neondatabase/serverless"
import { readFixture } from "./lib.mjs"

const sql = neon(process.env.DATABASE_URL)
const { ts: TS } = readFixture()

console.log("--- children (qa-sec-*) ---")
const kids = await sql`select id, clerk_user_id, client_id, name, year_code, created_at from children where client_id like 'qa-sec-%' order by client_id, created_at`
for (const k of kids) console.log(JSON.stringify(k))

console.log("\n--- reviews for those children ---")
const revs = await sql`select r.child_id, c.client_id, c.clerk_user_id, r.card_id, r.box, r.last_rating, r.last_reviewed_at from reviews r join children c on c.id = r.child_id where c.client_id like 'qa-sec-%' order by r.card_id, r.last_reviewed_at`
for (const r of revs) console.log(JSON.stringify(r))

console.log("\n--- sessions for those children ---")
const sess = await sql`select s.child_id, c.client_id, s.client_id as session_client_id, s.at, s.cards_reviewed from sessions s join children c on c.id = s.child_id where c.client_id like 'qa-sec-%' order by s.client_id`
for (const s of sess) console.log(JSON.stringify(s))

const dedupeId = `qa-sec-dedupe-session-${TS}`
console.log(`\n--- session dedupe count for ${dedupeId} (expect 1) ---`)
const dedupe = await sql`select count(*)::int as n from sessions where client_id = ${dedupeId}`
console.log(JSON.stringify(dedupe[0]))

console.log("\n--- quiz_questions not published for place-value (should be 0 unless mid-test) ---")
const draft = await sql`select id, status from quiz_questions where set_id = 'place-value' and status != 'published'`
for (const d of draft) console.log(JSON.stringify(d))

console.log("\n--- question_impressions for qa-sec quiz child ---")
const imp = await sql`select i.child_id, c.client_id, i.question_id, i.served_at from question_impressions i join children c on c.id = i.child_id where c.client_id like 'qa-sec-%' order by i.served_at`
for (const i of imp) console.log(JSON.stringify(i))
