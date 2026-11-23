import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Automatically configure SSL for Cloud PostgreSQL on Vercel (Neon, Supabase, RDS, etc.)
const isCloudPostgres =
  databaseUrl.includes("neon.tech") ||
  databaseUrl.includes("supabase.co") ||
  databaseUrl.includes("pooler.supabase.com") ||
  databaseUrl.includes("vercel-storage.com") ||
  databaseUrl.includes("sslmode=require") ||
  databaseUrl.includes("ssl=true") ||
  process.env.DATABASE_SSL === "true";

if (isCloudPostgres && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1")) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
