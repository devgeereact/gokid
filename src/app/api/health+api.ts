import { sql } from "drizzle-orm"

import { db } from "@/db/client"

/**
 * Health check — the first API route (design/gokid-screens.md → backend). Confirms the server-output
 * API layer is live and can reach Neon through Drizzle. No auth: it exposes nothing but a heartbeat
 * and the table count. Hit it at `/api/health` on the dev server.
 *
 * This is an Expo Router API route (`+api.ts`), which only runs because `app.json` web.output is now
 * "server". It executes server-side, so importing the Drizzle client (and the Neon secret it reads)
 * here never touches the app bundle.
 */
export async function GET(): Promise<Response> {
  try {
    const rows = await db.execute(
      sql`select count(*)::int as tables from information_schema.tables where table_schema = 'public'`
    )
    const tables = (rows.rows?.[0]?.tables as number | undefined) ?? 0
    return Response.json({ ok: true, db: "connected", tables, at: new Date().toISOString() })
  } catch (error) {
    return Response.json(
      { ok: false, db: "error", message: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    )
  }
}
