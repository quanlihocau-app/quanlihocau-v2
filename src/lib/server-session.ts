import { cache } from "react";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { SystemRole } from "@/generated/prisma/client";
import { authOptions, getSessionCookie } from "@/lib/auth";

/**
 * NextAuth's JWT decrypt failure is caught inside getServerSession and comes
 * back as null, but a thrown decode error must not become a 500. Either way
 * the caller treats the request as logged out.
 */
export const getAppSession = cache(async (): Promise<Session | null> => {
    try {
        return (await getServerSession(authOptions)) ?? null;
    } catch (error) {
        console.error(
            "[auth] ignoring undecryptable session cookie:",
            error instanceof Error ? error.name : "unknown",
        );
        return null;
    }
});

/**
 * Page/API gate. A valid NextAuth session wins. When that cookie is missing
 * or undecryptable, a still-valid qa_session is enough to show the app
 * (staff credentials login sets qa_session before the NextAuth sync).
 */
export async function getPageSession(): Promise<Session | null> {
    const session = await getAppSession();
    if (session?.user?.email) return session;
    try {
        const app = await getSessionCookie();
        if (!app?.email) return null;
        return {
            user: {
                id: app.userId,
                name: app.name,
                email: app.email,
                systemRole: app.role as SystemRole,
            },
            expires: new Date(app.expiresAt ?? Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
    } catch {
        return null;
    }
}
