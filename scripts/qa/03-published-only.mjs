// Step 3. Draft questions must never reach a child.
//
// Precondition: insert a temporary draft row so there is something to leak, e.g.
//   insert into quiz_questions (id, set_id, status, ...) values ('qa-sec-draft-probe','place-value','draft', ...)
// 99-cleanup.mjs removes any quiz_questions row whose id starts with qa-sec-.
//
// The probe asks for more questions than the published pool holds, so a status filter that is
// missing (or applied only after the take) shows up as a draft id in the served list, or as an
// inflated poolSize.
import { mintToken, call, readFixture, stepper } from "./lib.mjs"

const { t1: T1, ts: TS } = readFixture()
const SET = "place-value"
const CHILD = `qa-sec-t1-draftprobe-child-${TS}`

const step = stepper(60)

const token = await mintToken(T1)

await step("draftprobe-setup-create-child", `POST /api/progress (as T1) creating fresh child clientId=${CHILD}`, call("POST", "/api/progress", token, { child: { clientId: CHILD, name: "QA Draftprobe Kid", yearCode: "Y5" }, reviews: [], sessions: [] }))

const r1 = await step("draftprobe-quiz-count20", `GET /api/quiz?setId=${SET}&clientId=${CHILD}&count=20 (DB has a temp status='draft' row 'qa-sec-draft-probe' inserted for this set; must never appear, poolSize must reflect published-only count)`, call("GET", `/api/quiz?setId=${SET}&clientId=${CHILD}&count=20`, token))

const ids = (r1.json?.questions ?? []).map((q) => q.id)
console.log("served ids:", ids)
console.log("poolSize reported:", r1.json?.poolSize, "(expect the published-only count, draft excluded)")
console.log("draft probe id present in served list?", ids.includes("qa-sec-draft-probe"), "(expect false)")
