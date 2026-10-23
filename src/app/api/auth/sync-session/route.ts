import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/navigation";
import { getAppSession } from "@/lib/server-session";

export async function GET(request: Request) {
    const session = await getAppSession();
    const user = session?.user;

    if (!user?.id || !user.email) {
        return NextResponse.redirect(new URL("/login?error=GoogleSignIn", request.url));
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
        return NextResponse.redirect(new URL("/login?error=GoogleSignIn", request.url));
    }

    const requestedPath = new URL(request.url).searchParams.get("next") ?? "/dashboard";
    return NextResponse.redirect(new URL(safeRedirectPath(requestedPath), request.url));
}
