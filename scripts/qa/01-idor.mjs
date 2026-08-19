// Step 1. Cross-tenant isolation (IDOR) on /api/progress and /api/quiz.
//
// The client sends a child clientId it chose itself. A clientId alone must never be enough to read
// or write another parent's child — the server has to scope every row by the Clerk user id in the
// bearer token. This drives both directions plus the abuse case where one parent posts another
// parent's known clientId, and finishes on the unauthenticated / malformed-token edges.
import { mintToken, call, readFixture, stepper } from "./lib.mjs"

const { t1: T1, t2: T2, ts: TS } = readFixture()

const T1_CHILD = `qa-sec-t1-child-${TS}`
const T2_CHILD = `qa-sec-t2-child-${TS}`
const UNKNOWN_CHILD = `qa-sec-unknown-${TS}`

const step = stepper(30)

console.log("minting T1 token...")
const t1Token = await mintToken(T1)
console.log("minting T2 token...")
const t2Token = await mintToken(T2)

// 1. T1 creates its own child.
await step(
  "t1-create-own-child",
  `POST /api/progress (as T1) body: {child:{clientId:"${T1_CHILD}",name:"QA T1 Kid",yearCode:"Y3"}, reviews:[1], sessions:[1]}`,
  call("POST", "/api/progress", t1Token, {
    child: { clientId: T1_CHILD, name: "QA T1 Kid", yearCode: "Y3" },
    reviews: [
      { setId: "place-value", cardId: "t1-card", box: 1, dueAt: Date.now() + 86400000, lastRating: "tricky", lastReviewedAt: Date.now() },
    ],
    sessions: [
      { id: `qa-sec-t1-session-${TS}`, setId: "place-value", setTitle: "Place value", subject: "Maths", at: Date.now(), cardsReviewed: 3, minutes: 2 },
    ],
  })
)

// 2. T2 creates its own child.
await step(
  "t2-create-own-child",
  `POST /api/progress (as T2) body: {child:{clientId:"${T2_CHILD}",name:"QA T2 Kid",yearCode:"Y5"}, reviews:[1], sessions:[1]}`,
  call("POST", "/api/progress", t2Token, {
    child: { clientId: T2_CHILD, name: "QA T2 Kid", yearCode: "Y5" },
    reviews: [
      { setId: "place-value", cardId: "t2-card", box: 1, dueAt: Date.now() + 86400000, lastRating: "tricky", lastReviewedAt: Date.now() },
    ],
    sessions: [
      { id: `qa-sec-t2-session-${TS}`, setId: "place-value", setTitle: "Place value", subject: "Maths", at: Date.now(), cardsReviewed: 3, minutes: 2 },
    ],
  })
)

// 3. CROSS: T1 token reads T2's clientId -> must be empty.
const r3 = await step(
  "CROSS-t1-token-reads-t2-child",
  `GET /api/progress?child=${T2_CHILD} (as T1, but that clientId belongs to T2)`,
  call("GET", `/api/progress?child=${T2_CHILD}`, t1Token)
)

// 4. CROSS: T2 token reads T1's clientId -> must be empty.
const r4 = await step(
  "CROSS-t2-token-reads-t1-child",
  `GET /api/progress?child=${T1_CHILD} (as T2, but that clientId belongs to T1)`,
  call("GET", `/api/progress?child=${T1_CHILD}`, t2Token)
)

// 5. CROSS on quiz: T1 token + T2's clientId -> must not serve T2's child's quiz.
const r5 = await step(
  "CROSS-t1-token-quiz-t2-child",
  `GET /api/quiz?setId=place-value&clientId=${T2_CHILD}&count=3 (as T1, but that clientId belongs to T2)`,
  call("GET", `/api/quiz?setId=place-value&clientId=${T2_CHILD}&count=3`, t1Token)
)

// 6. ABUSE: T1 sends T2's KNOWN clientId in a sync POST, different name/yearCode, plus a review.
//    Must create a brand-new row scoped under T1 (never touch T2's actual row).
const r6 = await step(
  "ABUSE-t1-posts-t2-clientId",
  `POST /api/progress (as T1) with child.clientId="${T2_CHILD}" (T2's known clientId), name="HACKED", yearCode="Y6", plus a review cardId="hack-card"`,
  call("POST", "/api/progress", t1Token, {
    child: { clientId: T2_CHILD, name: "HACKED", yearCode: "Y6" },
    reviews: [
      { setId: "place-value", cardId: "hack-card", box: 0, dueAt: Date.now() + 86400000, lastRating: "tricky", lastReviewedAt: Date.now() },
    ],
    sessions: [],
  })
)

// 7. UNKNOWN clientId (exists nowhere) with T2's token -> creates under T2 only.
const r7 = await step(
  "UNKNOWN-clientId-creates-under-caller-only",
  `POST /api/progress (as T2) with a brand-new clientId nobody has used ("${UNKNOWN_CHILD}")`,
  call("POST", "/api/progress", t2Token, {
    child: { clientId: UNKNOWN_CHILD, name: "QA Unknown Kid", yearCode: "Y2" },
    reviews: [],
    sessions: [],
  })
)

// 8. Auth edge cases (repeat quickly here while we have request infra warm).
const r8 = await step("no-auth-progress", "GET /api/progress?child=x (no Authorization header)", call("GET", "/api/progress?child=x"))
const r9 = await step("malformed-token-progress", "GET /api/progress?child=x (Authorization: Bearer not-a-real-jwt)", call("GET", "/api/progress?child=x", "not-a-real-jwt"))
const r10 = await step("no-auth-quiz", "GET /api/quiz?setId=place-value&clientId=x (no Authorization header)", call("GET", "/api/quiz?setId=place-value&clientId=x"))

console.log("\n=== SUMMARY ===")
console.log("r3 (T1 reads T2 child):", r3.status, r3.text.slice(0, 200))
console.log("r4 (T2 reads T1 child):", r4.status, r4.text.slice(0, 200))
console.log("r5 (T1 quiz w/ T2 clientId):", r5.status, r5.text.slice(0, 200))
console.log("r6 (T1 abuse-posts T2 clientId):", r6.status, r6.text.slice(0, 200))
console.log("r7 (T2 unknown clientId create):", r7.status, r7.text.slice(0, 200))
console.log("r8 (no auth progress):", r8.status, r8.text.slice(0, 200))
console.log("r9 (malformed token progress):", r9.status, r9.text.slice(0, 200))
console.log("r10 (no auth quiz):", r10.status, r10.text.slice(0, 200))
console.log("\nT1_CHILD=", T1_CHILD, "T2_CHILD=", T2_CHILD, "UNKNOWN_CHILD=", UNKNOWN_CHILD)
