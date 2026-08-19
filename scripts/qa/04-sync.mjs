// Step 4. Sync idempotency and last-write-wins on /api/progress.
//
// Two properties matter when a device syncs the same batch twice, or syncs out of order after being
// offline:
//   - replaying an identical session batch must not duplicate the session row (dedupe on client id)
//   - a review carrying an EARLIER lastReviewedAt must not overwrite one already stored with a
//     later timestamp, no matter which order the requests arrive in
//
// This script only POSTs. Run 05-verify-db.mjs afterwards to read back what actually landed.
import { mintToken, call, readFixture, stepper } from "./lib.mjs"

const { t2: T2, ts: TS } = readFixture() // T2 here, distinct from the quiz-phase child under T1
const CHILD = `qa-sec-t2-sync-child-${TS}`
const SESSION_ID = `qa-sec-dedupe-session-${TS}`

const step = stepper(70)

const token = await mintToken(T2)

await step("sync-setup-create-child", `POST /api/progress (as T2) creating sync test child clientId=${CHILD}`, call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Sync Kid", yearCode: "Y3" }, reviews: [], sessions: [] }))

const sessionBody = {
  child: { clientId: CHILD, name: "QA Sync Kid", yearCode: "Y3" },
  reviews: [],
  sessions: [{ id: SESSION_ID, setId: "place-value", setTitle: "Place value", subject: "Maths", at: Date.now(), cardsReviewed: 4, minutes: 3, score: 3, scoreTotal: 4 }],
}

await step("sync-post-session-first", `POST /api/progress (as T2) sessions=[{id:"${SESSION_ID}", ...}] (FIRST post)`, call("POST", "/api/progress", token, sessionBody))
await step("sync-post-session-replay", `POST /api/progress (as T2) SAME sessions=[{id:"${SESSION_ID}", ...}] (REPLAY of identical batch)`, call("POST", "/api/progress", token, sessionBody))

// Order A: normal arrival order (later timestamp arrives second).
await step(
  "sync-lww-orderA-first",
  `POST cardId="qa-sec-card-a" lastReviewedAt=T1(earlier) box=1 rating=tricky [arrives FIRST]`,
  call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Sync Kid", yearCode: "Y3" }, reviews: [{ setId: "place-value", cardId: "qa-sec-card-a", box: 1, dueAt: Date.now() + 86400000, lastRating: "tricky", lastReviewedAt: Date.now() - 20000 }], sessions: [] })
)
await step(
  "sync-lww-orderA-second",
  `POST cardId="qa-sec-card-a" lastReviewedAt=T2(LATER) box=3 rating=gotit [arrives SECOND, later ts]`,
  call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Sync Kid", yearCode: "Y3" }, reviews: [{ setId: "place-value", cardId: "qa-sec-card-a", box: 3, dueAt: Date.now() + 86400000, lastRating: "gotit", lastReviewedAt: Date.now() }], sessions: [] })
)

// Order B: out-of-order arrival (later timestamp arrives FIRST, earlier arrives second and must NOT win).
const laterTs = Date.now()
const earlierTs = Date.now() - 30000
await step(
  "sync-lww-orderB-first-is-later-ts",
  `POST cardId="qa-sec-card-b" lastReviewedAt=T4=${laterTs} (LATER) box=3 rating=gotit [arrives FIRST, carries LATER ts]`,
  call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Sync Kid", yearCode: "Y3" }, reviews: [{ setId: "place-value", cardId: "qa-sec-card-b", box: 3, dueAt: Date.now() + 86400000, lastRating: "gotit", lastReviewedAt: laterTs }], sessions: [] })
)
await step(
  "sync-lww-orderB-second-is-earlier-ts",
  `POST cardId="qa-sec-card-b" lastReviewedAt=T3=${earlierTs} (EARLIER) box=1 rating=tricky [arrives SECOND, carries EARLIER ts -- must NOT overwrite]`,
  call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Sync Kid", yearCode: "Y3" }, reviews: [{ setId: "place-value", cardId: "qa-sec-card-b", box: 1, dueAt: Date.now() + 86400000, lastRating: "tricky", lastReviewedAt: earlierTs }], sessions: [] })
)

console.log("\nSync POSTs complete. Now run: node scripts/qa/05-verify-db.mjs")
console.log("CHILD=", CHILD, "SESSION_ID=", SESSION_ID)
