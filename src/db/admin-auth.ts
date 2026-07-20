/**
 * Shared guard for admin-only API routes (content seeding, question generation). These routes write
 * to shared content or spend money on model calls, so they must never be openly callable.
 *
 * Fail closed. When `ADMIN_TOKEN` is set the header must match it everywhere, including locally; only
 * when no token is configured does an explicit `NODE_ENV === "development"` open the route for local
 * work. Keying the open path off `!== "production"` would leave these routes world-callable on any
 * hosted runtime that does not set NODE_ENV to exactly "production" (a preview deploy, say).
 *
 * SERVER-SIDE ONLY — reads a secret env var, imported by `+api.ts` routes.
 */
export function isAdmin(request: Request): boolean {
  const token = process.env.ADMIN_TOKEN
  if (token) return request.headers.get("x-admin-token") === token
  return process.env.NODE_ENV === "development"
}
