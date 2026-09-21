import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: Pool | undefined;
};

// Cấu hình pool kết nối tối ưu cho Neon Serverless Postgres
export const pool =
    globalForPrisma.pool ??
    new Pool({
        connectionString: databaseUrl,
        max: process.env.NODE_ENV === "production" ? 10 : 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

function createPrismaClient() {
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.pool = pool;
}