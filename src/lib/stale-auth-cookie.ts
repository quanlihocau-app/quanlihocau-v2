import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { sessionSecret, verifySignedSession } from "@/lib/session-signature";

const SESSION_FAMILIES = ["next-auth.session-token", "__Secure-next-auth.session-token"] as const;

function familyMembers(names: string[], family: string): string[] {
    return names.filter((name) => name === family || name.startsWith(`${family}.`));
}

/**
 * Cookie names that are present but cannot be decrypted with the current
 * secret. A valid cookie is left untouched. When the secret is missing we
 * do not guess, so a misconfigured dev server does not wipe a good session.
 */
export async function classifyAuthCookies(request: NextRequest): Promise<{ stale: string[]; authenticated: boolean }> {
    const names = request.cookies.getAll().map((cookie) => cookie.name);
    const stale: string[] = [];
    let authenticated = false;
    const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

    for (const family of SESSION_FAMILIES) {
        const members = familyMembers(names, family);
        if (members.length === 0) continue;
        if (!jwtSecret) continue;
        let token: unknown = null;
        try {
            token = await getToken({
                req: request,
                secret: jwtSecret,
                secureCookie: family.startsWith("__Secure-"),
                cookieName: family,
            });
        } catch {
            token = null;
        }
        if (token) authenticated = true;
        else stale.push(...members);
    }

    if (names.includes("qa_session")) {
        const raw = request.cookies.get("qa_session")?.value ?? "";
        let valid = false;
        try {
            valid = Boolean(raw && verifySignedSession(raw, sessionSecret()));
        } catch {
            valid = false;
        }
        if (valid) authenticated = true;
        else stale.push("qa_session");
    }

    return { stale, authenticated };
}
