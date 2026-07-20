import "dotenv/config"
import type { Config } from "drizzle-kit"

/**
 * drizzle-kit config — generates SQL migrations from src/db/schema.ts and applies them to Neon.
 * Migrations are committed to the repo (AGENTS.md). Run `npm run db:generate` after a schema change,
 * then `npm run db:migrate` to apply. Needs `DATABASE_URL` in the environment.
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Keep generated SQL readable in review.
  verbose: true,
  strict: true,
} satisfies Config
