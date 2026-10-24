import { NextResponse } from "next/server";

import { Role } from "@/generated/prisma/client";
import { loadShiftReport } from "@/lib/reports/shift-report";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const ALLOWED_ROLES = [Role.OWNER, Role.MANAGER, Role.STAFF];

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext(ALLOWED_ROLES);
        const requestedShiftId = new URL(request.url).searchParams.get("shiftId");
        const report = await loadShiftReport(tenantContext.lakeId, requestedShiftId);
        return NextResponse.json(report);
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Đã xảy ra lỗi khi tải báo cáo ca." }, { status: 500 });
    }
}
