import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  // Thrown lazily (on first query) rather than at import time, so that
  // `next build` — which imports route modules to collect metadata — does not
  // fail on machines/CI where DATABASE_URL is only present at runtime.
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it in .env.local for local development, " +
        "or in your hosting provider's environment variables for production.",
    );
  }

  // Hosted Postgres (Neon, Supabase, Heroku, RDS...) requires TLS, and most of
  // them present a certificate that is not in the container's trust store.
  const needsSsl =
    /[?&]sslmode=require/.test(databaseUrl) ||
    (process.env.NODE_ENV === "production" && !/localhost|127\.0\.0\.1/.test(databaseUrl));

  return new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });
}

/**
 * A single pool per process. In development Next.js hot-reload re-evaluates
 * modules, so we stash the pool on globalThis to avoid leaking connections.
 */
export function getPool(): Pool {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    const pool = createPool();
    // Never let an idle-client error take the whole server down.
    pool.on("error", (error) => {
      console.error("[db] idle client error", error);
    });
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

/**
 * Lazy proxy: the pool (and therefore the DATABASE_URL check) is only created
 * the first time a query actually runs.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    const value = Reflect.get(getPool(), property, receiver);
    return typeof value === "function" ? value.bind(getPool()) : value;
  },
});

type DrizzleDb = ReturnType<typeof drizzle>;

let dbInstance: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  if (!dbInstance) dbInstance = drizzle(getPool());
  return dbInstance;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
