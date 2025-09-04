import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const pool = global.pgPool || new Pool({ connectionString });

// Reuse pool in dev to avoid exhausting connections on hot reloads
if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

export default pool;

