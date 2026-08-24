// Step 6. The write verbs, called without credentials, with a malformed token, and with a
// well-formed but expired one — plus the cross-user delete.
//
// 01-idor covers the reads and the progress POST. This covers the rest of the verb surface, because
// authorisation enforced on GET and forgotten on DELETE is the normal shape of the bug: the
// destructive route is the one nobody probes, and it is the one that matters.
//
// Run it against production as well as the dev server:
//   QA_API=https://gokid.expo.app node scripts/qa/06-unauth-methods.mjs
import { Buffer } from "node:buffer"

import { API, call, expect, mintToken, readFixture, stepper, summarise } from "./lib.mjs"

const { t1: T1, t2: T2, ts: TS } = readFixture()

const CHILD = `qa-sec-verbs-child-${TS}`
const step = stepper(80)

/**
 * A structurally valid JWT that expired in 2021. It exists to separate two different checks that
 * look the same from outside: "is there a Bearer header" and "is this token currently valid". A
 * route that only does the first accepts this one.
 */
const EXPIRED =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  Buffer.from(JSON.stringify({ sub: "user_expired", exp: 1609459200, iat: 1609455600 })).toString("base64url") +
  ".ZmFrZXNpZ25hdHVyZQ"

console.log(`probing ${API}`)
console.log("minting T1 token...")
const t1Token = await mintToken(T1)
console.log("minting T2 token...")
const t2Token = await mintToken(T2)

// T1 creates a child to be the target of everything below.
await step(
  "verbs-setup-create-child",
  `POST /api/progress (as T1) creating "${CHILD}"`,
  call("POST", "/api/progress", t1Token, {
    child: { clientId: CHILD, name: "QA Verbs Kid", yearCode: "Y3" },
    reviews: [],
    sessions: [],
  })
)

// ------------------------------------------------------------------ no credentials at all
const noauthDelete = await step("noauth-DELETE-child", `DELETE /api/children/${CHILD} with no Authorization header`, call("DELETE", `/api/children/${CHILD}`))
const noauthGetProgress = await step("noauth-GET-progress", "GET /api/progress with no Authorization header", call("GET", `/api/progress?clientId=${CHILD}`))
const noauthPostProgress = await step("noauth-POST-progress", "POST /api/progress with no Authorization header", call("POST", "/api/progress", undefined, { clientId: CHILD, reviews: [], sessions: [] }))
const noauthQuiz = await step("noauth-GET-quiz", "GET /api/quiz with no Authorization header", call("GET", `/api/quiz?setId=place-value&clientId=${CHILD}&count=5`))
const noauthReport = await step("noauth-POST-report-card", "POST /api/report-card with no Authorization header", call("POST", "/api/report-card", undefined, { cardId: "pv-c1", setId: "place-value", reason: "wrong" }))
const noauthAccount = await step("noauth-DELETE-account", "DELETE /api/account with no Authorization header", call("DELETE", "/api/account"))

// PATCH is a verb no route implements. 401, 404 and 405 are all correct answers; a 200 would mean a
// route is answering a method it never declared.
const noauthPatch = await step("noauth-PATCH-progress", "PATCH /api/progress with no Authorization header", call("PATCH", "/api/progress", undefined, {}))

// ------------------------------------------------------------------ bad credentials
const malformedDelete = await step("malformed-DELETE-child", `DELETE /api/children/${CHILD} with Bearer not-a-jwt`, call("DELETE", `/api/children/${CHILD}`, "not-a-jwt"))
const expiredDelete = await step("expired-DELETE-child", `DELETE /api/children/${CHILD} with an expired JWT`, call("DELETE", `/api/children/${CHILD}`, EXPIRED))
const expiredProgress = await step("expired-GET-progress", "GET /api/progress with an expired JWT", call("GET", `/api/progress?clientId=${CHILD}`, EXPIRED))
const expiredQuiz = await step("expired-GET-quiz", "GET /api/quiz with an expired JWT", call("GET", `/api/quiz?setId=place-value&clientId=${CHILD}&count=5`, EXPIRED))

// ------------------------------------------------------------------ admin routes
// These gate on ADMIN_SEED_TOKEN and must fail closed. A 500 here would also be a failure: it means
// the route got far enough to throw, and a stack trace is not an authorisation decision.
const adminSeed = await step("noauth-POST-admin-seed", "POST /api/admin/seed with no admin token", call("POST", "/api/admin/seed", undefined, {}))
const adminQuestions = await step("noauth-POST-admin-questions", "POST /api/admin/questions with no admin token", call("POST", "/api/admin/questions", undefined, {}))
const adminGenerate = await step("badtoken-POST-admin-generate", "POST /api/admin/generate with a wrong admin token", call("POST", "/api/admin/generate", "wrong-admin-token", {}))

// ------------------------------------------------------------------ cross-user delete
// The catastrophic one: T2's real, valid session deleting T1's child.
//
// The status to expect here is 200, not 403. The route answers `{ok:true, deleted:false}` for a
// clientId the caller does not own, deliberately: deletion has to be idempotent (a retry after a
// dropped connection must not fail), and a distinct "no such child" answer would let a caller probe
// which ids exist. So the assertion is on `deleted`, not on the status — asserting a non-200 here
// would fail a correctly-built route, and asserting only the status would pass a broken one.
const crossDelete = await step("CROSS-t2-deletes-t1-child", `DELETE /api/children/${CHILD} as T2 (a real session, wrong owner)`, call("DELETE", `/api/children/${CHILD}`, t2Token))

// Still readable by its owner afterwards — proof the delete did not half-happen.
const stillThere = await step("t1-child-survives-cross-delete", `GET /api/progress?clientId=${CHILD} as T1`, call("GET", `/api/progress?clientId=${CHILD}`, t1Token))

// And the owner's own delete must work, or the route is broken rather than secure.
const ownDelete = await step("t1-deletes-own-child", `DELETE /api/children/${CHILD} as T1 (the owner)`, call("DELETE", `/api/children/${CHILD}`, t1Token))

console.log("\n=== SUMMARY ===")
for (const [label, r] of [
  ["noauth DELETE child", noauthDelete],
  ["noauth GET progress", noauthGetProgress],
  ["noauth POST progress", noauthPostProgress],
  ["noauth GET quiz", noauthQuiz],
  ["noauth POST report-card", noauthReport],
  ["noauth DELETE account", noauthAccount],
  ["noauth PATCH progress", noauthPatch],
  ["malformed DELETE child", malformedDelete],
  ["expired DELETE child", expiredDelete],
  ["expired GET progress", expiredProgress],
  ["expired GET quiz", expiredQuiz],
  ["admin seed, no token", adminSeed],
  ["admin questions, no token", adminQuestions],
  ["admin generate, wrong token", adminGenerate],
  ["cross-user DELETE", crossDelete],
  ["owner's own DELETE", ownDelete],
]) {
  console.log(`  ${String(r.status).padEnd(4)} ${label}`)
}

console.log("\n=== ASSERTIONS ===")
expect("unauthenticated DELETE of a child is rejected", noauthDelete.status === 401, `status ${noauthDelete.status}`)
expect("unauthenticated GET progress is rejected", noauthGetProgress.status === 401, `status ${noauthGetProgress.status}`)
expect("unauthenticated POST progress is rejected", noauthPostProgress.status === 401, `status ${noauthPostProgress.status}`)
expect("unauthenticated GET quiz is rejected", noauthQuiz.status === 401, `status ${noauthQuiz.status}`)
expect("unauthenticated POST report-card is rejected", noauthReport.status === 401, `status ${noauthReport.status}`)
expect("unauthenticated DELETE account is rejected", noauthAccount.status === 401, `status ${noauthAccount.status}`)
expect("PATCH on a route that does not implement it is not answered 200", noauthPatch.status !== 200, `status ${noauthPatch.status}`)
expect("a malformed token is rejected", malformedDelete.status === 401, `status ${malformedDelete.status}`)
expect("an expired token is rejected on DELETE", expiredDelete.status === 401, `status ${expiredDelete.status}`)
expect("an expired token is rejected on GET progress", expiredProgress.status === 401, `status ${expiredProgress.status}`)
expect("an expired token is rejected on GET quiz", expiredQuiz.status === 401, `status ${expiredQuiz.status}`)
expect("admin seed fails closed", adminSeed.status === 401 || adminSeed.status === 403, `status ${adminSeed.status}`)
expect("admin questions fails closed", adminQuestions.status === 401 || adminQuestions.status === 403, `status ${adminQuestions.status}`)
expect("admin generate fails closed on a wrong token", adminGenerate.status === 401 || adminGenerate.status === 403, `status ${adminGenerate.status}`)
expect("T2's delete of T1's child removes nothing", crossDelete.status === 200 && crossDelete.json?.deleted === false, `status ${crossDelete.status} deleted=${crossDelete.json?.deleted}`)
expect("T1 can still read their child afterwards", stillThere.status === 200, `status ${stillThere.status}`)
expect("T1 CAN delete their own child", ownDelete.status === 200 && ownDelete.json?.deleted === true, `status ${ownDelete.status} deleted=${ownDelete.json?.deleted}`)

summarise("06-unauth-methods")
