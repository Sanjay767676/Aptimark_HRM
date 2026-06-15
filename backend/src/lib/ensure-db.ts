import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureDatabaseConnection(): Promise<void> {
  try {
    await pool.query("select 1");
    logger.info("Database connected");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      `Database connection failed: ${message}. Check DATABASE_URL in .env (Supabase password may have changed).`,
    );
    process.exit(1);
  }
}
