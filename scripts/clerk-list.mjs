// Read-only: lists the Clerk users on this instance so nothing is deleted blind.
// Prints ids/emails/created dates — never the secret key.
import "dotenv/config"

const key = process.env.CLERK_SECRET_KEY
if (!key) {
  console.log("CLERK_SECRET_KEY not set")
  process.exit(2)
}

const r = await fetch("https://api.clerk.com/v1/users?limit=100", {
  headers: { Authorization: `Bearer ${key}` },
})
if (!r.ok) {
  console.log("Clerk API error:", r.status, (await r.text()).slice(0, 200))
  process.exit(1)
}
const users = await r.json()
console.log("instance:", key.startsWith("sk_test") ? "TEST (development)" : "LIVE (production)")
console.log("users:", users.length)
for (const u of users) {
  const email = u.email_addresses?.[0]?.email_address ?? "(no email)"
  const kids = u.unsafe_metadata?.children
  console.log(
    `  ${u.id}  ${email.padEnd(32)} created=${new Date(u.created_at).toISOString().slice(0, 10)}  children=${
      Array.isArray(kids) ? kids.length : 0
    }`
  )
  if (Array.isArray(kids)) for (const k of kids) console.log(`      └ ${k.name} (${k.yearGroup})`)
}
