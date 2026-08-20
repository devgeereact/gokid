// Step 2. The 12-hour no-repeat rule on /api/quiz.
//
// A child must not be served the same question twice in a sitting. Once the fresh pool is exhausted
// the endpoint may top up from recently-seen questions, but it has to reach for the *oldest-seen*
// first. Also covers count= edge values (over-large, zero, negative, non-numeric).
import { summarise, expect, mintToken, call, readFixture, stepper } from "./lib.mjs"

const { t1: T1, ts: TS } = readFixture()
const SET = "place-value" // published pool = 11 (largest available)
const CHILD = `qa-sec-t1-quiz-child-${TS}`

const step = stepper(50)

console.log("minting T1 token...")
const token = await mintToken(T1)

await step(
  "quiz-setup-create-child",
  `POST /api/progress (as T1) creating quiz test child clientId=${CHILD}`,
  call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Quiz Kid", yearCode: "Y5" }, reviews: [], sessions: [] })
)

// call1: 4 fresh (pool=11, remain 7 fresh)
const r1 = await step("quiz-call1-count4", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=4 (call 1)`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=4`, token))
// call2: 4 more fresh (remain 3 fresh) - must not overlap call1
const r2 = await step("quiz-call2-count4", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=4 (call 2, immediately after call 1)`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=4`, token))
// call3: requests 4, only 3 fresh remain -> 1 topped up from "recent" (oldest = call1's, since call1 served before call2)
const r3 = await step("quiz-call3-count4-fallback", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=4 (call 3, pool nearly exhausted -> 1 forced repeat expected, oldest-seen)`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=4`, token))

// count edge cases
const r4 = await step("quiz-count-999", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=999`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=999`, token))
const r5 = await step("quiz-count-0", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=0`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=0`, token))
const r6 = await step("quiz-count-neg5", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=-5`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=-5`, token))
const r7 = await step("quiz-count-abc", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=abc`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=abc`, token))

function ids(json) { return (json?.questions ?? []).map((q) => q.id) }
function options(json, id) { return (json?.questions ?? []).find((x) => x.id === id)?.payload?.options }

console.log("\n=== SUMMARY ===")
console.log("call1 ids:", ids(r1.json), "repeated:", r1.json?.repeated, "poolSize:", r1.json?.poolSize, "count:", r1.json?.count)
console.log("call2 ids:", ids(r2.json), "repeated:", r2.json?.repeated, "poolSize:", r2.json?.poolSize, "count:", r2.json?.count)
console.log("call3 ids:", ids(r3.json), "repeated:", r3.json?.repeated, "poolSize:", r3.json?.poolSize, "count:", r3.json?.count)
const overlap12 = ids(r1.json).filter((x) => ids(r2.json).includes(x))
console.log("overlap(call1, call2):", overlap12, "(expect empty)")
const call3Repeats = ids(r3.json).filter((x) => ids(r1.json).includes(x) || ids(r2.json).includes(x))
console.log("call3 repeats seen before:", call3Repeats)
console.log("\n=== ASSERTIONS ===")

// The 12-hour no-repeat rule: two consecutive calls must not overlap at all.
expect("call1 and call2 share no questions", overlap12.length === 0, `overlap: ${JSON.stringify(overlap12)}`)

// Call 3 exhausts the pool and must fall back to the OLDEST-seen questions (call1's), never call2's.
// `every` on an empty array is vacuously true, so the emptiness case is asserted separately rather
// than being allowed to masquerade as a pass.
expect("call3 fell back to a non-empty repeat set", call3Repeats.length > 0, `got ${call3Repeats.length} repeats`)
expect(
  "call3 repeats come from call1 (oldest-seen first)",
  call3Repeats.length > 0 && call3Repeats.every((x) => ids(r1.json).includes(x)),
  `repeats: ${JSON.stringify(call3Repeats)}`
)
expect(
  "call3 does not re-serve call2's questions",
  !call3Repeats.some((x) => ids(r2.json).includes(x) && !ids(r1.json).includes(x)),
  "a call2 question was re-served before call1's were exhausted"
)
if (call3Repeats[0]) {
  console.log("repeated id:", call3Repeats[0])
  console.log("  options when first served:", JSON.stringify(options(ids(r1.json).includes(call3Repeats[0]) ? r1.json : r2.json, call3Repeats[0])))
  console.log("  options when re-served (call3):", JSON.stringify(options(r3.json, call3Repeats[0])))
}
console.log("count=999 -> served count:", r4.json?.count, "poolSize:", r4.json?.poolSize, "repeated:", r4.json?.repeated)
console.log("count=0   -> served count:", r5.json?.count)
console.log("count=-5  -> served count:", r6.json?.count)
console.log("count=abc -> served count:", r7.json?.count)
console.log("\nCHILD=", CHILD)

summarise("02-quiz-no-repeat")
