import { NextResponse } from "next/server";

import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

export async function GET() {
    try {
        const tenantContext = await requireTenantContext();
        return NextResponse.json(tenantContext, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json(
                { error: error.message },
                { status: 401 },
            );
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 },
            );
        }
        return NextResponse.json(
            { error: "Lỗi hệ thống." },
            { status: 500 },
        );
    }
}
