import crypto from "crypto";

export interface SignedSessionPayload {
    userId: string;
    email: string;
    role: string;
    name: string;
    sessionVersion?: number;
    expiresAt?: number;
}

/** Same secret the app uses to sign qa_session. Throws in production when unset. */
export function sessionSecret(): string {
    const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET or NEXTAUTH_SECRET must be set in production");
    }
    return "dev-secret-change-in-production";
}

/** Returns null for a missing, tampered, expired, or undecryptable app session. */
export function verifySignedSession(token: string, secret = sessionSecret()): SignedSessionPayload | null {
    try {
        const [data, signature, extra] = token.split(".");
        if (!data || !signature || extra !== undefined) return null;
        const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
        const actual = Buffer.from(signature);
        const expected = Buffer.from(expectedSig);
        if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
        const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as SignedSessionPayload;
        if (!payload || typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
        if (payload.expiresAt !== undefined && (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now())) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}
