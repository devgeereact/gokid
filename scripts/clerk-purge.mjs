// Destructive: deletes every user on the Clerk instance (dev instance only, guarded).
import "dotenv/config"
const key = process.env.CLERK_SECRET_KEY
if (!key) { console.log("CLERK_SECRET_KEY not set"); process.exit(2) }
if (!key.startsWith("sk_test")) {
  console.log("REFUSING: not a development instance (sk_test). Aborting to avoid deleting live users.")
  process.exit(3)
}
const list = await (await fetch("https://api.clerk.com/v1/users?limit=100", { headers: { Authorization: `Bearer ${key}` } })).json()
for (const u of list) {
  const email = u.email_addresses?.[0]?.email_address ?? "(no email)"
  const r = await fetch(`https://api.clerk.com/v1/users/${u.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` } })
  console.log(`${r.ok ? "deleted" : "FAILED "} ${u.id}  ${email}`)
}
const after = await (await fetch("https://api.clerk.com/v1/users?limit=100", { headers: { Authorization: `Bearer ${key}` } })).json()
console.log("users remaining:", after.length)
