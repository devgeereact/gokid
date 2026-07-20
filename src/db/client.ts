import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

/**
 * The database handle. SERVER-SIDE ONLY — imported by Expo Router API routes (`+api.ts`) and Inngest
 * functions, never by a screen (AGENTS.md: "The client talks to an API, never to Postgres directly").
 * Uses the Neon serverless driver over HTTP, not `pg` over raw TCP, so it works in the stateless
 * request handlers the API is built from.
 *
 * `DATABASE_URL` is a server secret and must NOT carry the `EXPO_PUBLIC_` prefix — that would inline
 * it into the app bundle. It is read here, in server code, where Metro never looks.
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("Missing DATABASE_URL. Set it in .env (Neon → connection string). Server-side only — never EXPO_PUBLIC_.")
}

const sql = neon(connectionString)

export const db = drizzle(sql, { schema })
export { schema }
