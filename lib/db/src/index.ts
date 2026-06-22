import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
// Supabase usually requires SSL; also support URLs that explicitly request it.
const isSupabase = connectionString.includes("supabase");
const urlRequestsSsl = connectionString.includes("sslmode=require") || connectionString.includes("ssl=true");
const needsSsl = isSupabase || urlRequestsSsl || process.env.PGSSLMODE === "require";

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
