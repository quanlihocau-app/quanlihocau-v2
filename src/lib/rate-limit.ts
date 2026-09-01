import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export class RateLimitUnavailableError extends Error {
    constructor(message = "Rate limit store is currently unavailable.") {
        super(message);
        this.name = "RateLimitUnavailableError";
    }
}

export interface RateLimitOptions {
    namespace: string;
    identifier: string;
    maxRequests: number;
    windowSeconds: number;
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfterSeconds: number;
    currentCount: number;
}

/**
 * SHA-256 hash an identifier to avoid storing raw IP, email or phone numbers in database.
 */
function hashIdentifier(namespace: string, identifier: string): string {
    const raw = `${namespace}:${identifier.trim().toLowerCase()}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Server-only atomic rate limit consumer using PostgreSQL.
 * Safely handles concurrent requests without race conditions using tagged Prisma.sql.
 *
 * NOTE: Expired bucket records in "RateLimitBucket" will be pruned by a scheduled
 * background cleanup job (to be implemented in a subsequent maintenance phase).
 */
export async function consumeRateLimit({
    namespace,
    identifier,
    maxRequests,
    windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
    if (!namespace || namespace.trim() === "") {
        throw new TypeError("RateLimit namespace cannot be empty.");
    }
    if (!identifier || identifier.trim() === "") {
        throw new TypeError("RateLimit identifier cannot be empty.");
    }
    if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
        throw new RangeError("RateLimit maxRequests must be a positive integer.");
    }
    if (!Number.isInteger(windowSeconds) || windowSeconds <= 0) {
        throw new RangeError("RateLimit windowSeconds must be a positive integer.");
    }

    const hashedKey = `rl:${namespace}:${hashIdentifier(namespace, identifier)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

    try {
        // Atomic Upsert and increment using parameterized Prisma.sql
        const rows = await prisma.$queryRaw<
            Array<{ count: number; expiresAt: Date }>
        >(Prisma.sql`
            INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "expiresAt", "updatedAt")
            VALUES (${hashedKey}, ${now}, 1, ${expiresAt}, ${now})
            ON CONFLICT ("key") DO UPDATE
            SET "count" = CASE
                WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN 1
                ELSE "RateLimitBucket"."count" + 1
            END,
            "windowStart" = CASE
                WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN EXCLUDED."windowStart"
                ELSE "RateLimitBucket"."windowStart"
            END,
            "expiresAt" = CASE
                WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN EXCLUDED."expiresAt"
                ELSE "RateLimitBucket"."expiresAt"
            END,
            "updatedAt" = ${now}
            RETURNING "count", "expiresAt";
        `);

        if (!rows || rows.length === 0) {
            return { allowed: true, retryAfterSeconds: 0, currentCount: 1 };
        }

        const currentCount = Number(rows[0].count);
        const bucketExpiresAt = new Date(rows[0].expiresAt);
        const remainingMs = Math.max(0, bucketExpiresAt.getTime() - now.getTime());
        const retryAfterSeconds = Math.ceil(remainingMs / 1000);

        if (currentCount > maxRequests) {
            return {
                allowed: false,
                retryAfterSeconds: Math.max(1, retryAfterSeconds),
                currentCount,
            };
        }

        return {
            allowed: true,
            retryAfterSeconds: 0,
            currentCount,
        };
    } catch (err: unknown) {
        // Fail-closed: Log concise non-sensitive diagnostic message and throw typed error
        console.error("Rate limit store query failed:", err instanceof Error ? err.message : "DB error");
        throw new RateLimitUnavailableError();
    }
}
