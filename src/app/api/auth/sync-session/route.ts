import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/navigation";
import { getAppSession } from "@/lib/server-session";

function getCanonicalBase(request: Request): string {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost && !forwardedHost.includes("0.0.0.0") && !forwardedHost.startsWith("app:")) {
        return `${forwardedProto}://${forwardedHost}`;
    }
    const host = request.headers.get("host");
    if (
        host &&
        !host.includes("0.0.0.0") &&
        !host.includes("localhost") &&
        !host.includes("127.0.0.1") &&
        !host.startsWith("app:")
    ) {
        return `${forwardedProto}://${host}`;
    }
    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }
    return "https://quanlihocau.com";
}

export async function GET(request: Request) {
    const canonicalBase = getCanonicalBase(request);
    const session = await getAppSession();
    const user = session?.user;

    if (!user?.id || !user.email) {
        return NextResponse.redirect(new URL("/login?error=GoogleSignIn", canonicalBase));
    }

    try {
        await setSessionCookie({
            userId: user.id,
            email: user.email,
            role: user.systemRole ?? "USER",
            name: user.name ?? user.email,
            sessionVersion: user.sessionVersion,
        });
    } catch {
        return NextResponse.redirect(new URL("/login?error=GoogleSignIn", canonicalBase));
    }

    const requestedPath = new URL(request.url).searchParams.get("next") ?? "/dashboard";
    return NextResponse.redirect(new URL(safeRedirectPath(requestedPath), canonicalBase));
}
