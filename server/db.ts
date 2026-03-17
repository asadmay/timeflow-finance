// Load env variables first (before any checks)
import "./env";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env variable is not set");
}

// Use Neon pooler URL (?pgbouncer=true disables prepared statements for serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : false,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
