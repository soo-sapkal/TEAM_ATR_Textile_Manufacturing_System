import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

const globalForPool = globalThis as unknown as { pgPool?: Pool };

export const pool = globalForPool.pgPool || new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}
