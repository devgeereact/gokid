// Step 0. Create two throwaway Clerk users (T1, T2) on the dev instance and record their ids in
// fixture.json, so the later scripts can pick up where this left off without re-minting (the
// sign-in-ticket endpoint is rate-limited).
//
// Run 99-cleanup.mjs when the pass is finished — it deletes both users and their database rows.
import fs from "node:fs"

import { bapi, save, writeFixture, FIXTURE } from "./lib.mjs"

const TS = Date.now()

async function createUser(tag) {
  const email = `gokid-qa-sec+${tag}-${TS}@gakinz.com`
  const r = await bapi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      first_name: "QA",
      last_name: `Sec${tag.toUpperCase()}`,
      skip_password_requirement: true,
      skip_password_checks: true,
    }),
  })
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`create ${tag} failed: ${r.status} ${r.body}`)
  }
  const u = JSON.parse(r.body)
  console.log(tag, "created:", u.id, email)
  return u.id
}

// If the second mint fails, the first user is already live on the instance and no fixture has been
// written yet — so 99-cleanup has nothing to find and the account is orphaned. Record T1 as soon as
// it exists, and tear it down if T2 cannot be created.
const t1 = await createUser("t1")
writeFixture({ ts: TS, t1 })

let t2
try {
  t2 = await createUser("t2")
} catch (err) {
  console.error("second mint failed — removing the first user so nothing is left behind")
  const r = await bapi(`/users/${t1}`, { method: "DELETE" })
  if (r.status === 200 || r.status === 404) {
    fs.rmSync(FIXTURE, { force: true })
    console.error(`rolled back ${t1}`)
  } else {
    console.error(`COULD NOT roll back ${t1} (status ${r.status}) — it is recorded in ${FIXTURE}; run 99-cleanup.mjs`)
  }
  throw err
}

const file = writeFixture({ ts: TS, t1, t2 })
console.log("fixture written:", file)
save(
  "00-throwaway-users-created",
  `Created throwaway users\nT1=${t1}\nT2=${t2}\n(emails: gokid-qa-sec+t1-${TS}@gakinz.com, gokid-qa-sec+t2-${TS}@gakinz.com)\n`
)
