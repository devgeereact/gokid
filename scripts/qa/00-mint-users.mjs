// Step 0. Create two throwaway Clerk users (T1, T2) on the dev instance and record their ids in
// fixture.json, so the later scripts can pick up where this left off without re-minting (the
// sign-in-ticket endpoint is rate-limited).
//
// Run 99-cleanup.mjs when the pass is finished — it deletes both users and their database rows.
import { bapi, save, writeFixture } from "./lib.mjs"

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

const t1 = await createUser("t1")
const t2 = await createUser("t2")

const file = writeFixture({ ts: TS, t1, t2 })
console.log("fixture written:", file)
save(
  "00-throwaway-users-created",
  `Created throwaway users\nT1=${t1}\nT2=${t2}\n(emails: gokid-qa-sec+t1-${TS}@gakinz.com, gokid-qa-sec+t2-${TS}@gakinz.com)\n`
)
