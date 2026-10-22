import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Lazy initialization helpers **/
function getPool(): Pool {
  const globalCache = globalThis as unknown as { __pool?: Pool };
  if (globalCache.__pool) return globalCache.__pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Defer error until first use (e.g., build step without DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  globalCache.__pool = pool;
  return pool;
}

function getPrisma(): PrismaClient {
  const globalCache = globalThis as unknown as { __prisma?: PrismaClient };
  if (globalCache.__prisma) return globalCache.__prisma;

  const adapter = new PrismaPg(getPool());
  const client = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalCache.__prisma = client;
  }
  return client;
}

/** Export proxies that delegate to the lazy instances */
export const pool = new Proxy({} as Pool, {
  get(_, prop) {
    return getPool()[prop as keyof Pool];
  },
});

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  },
});

// Optional explicit getters for direct use (e.g., tests)
export { getPrisma, getPool };