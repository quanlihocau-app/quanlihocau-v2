import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

export async function POST(request: NextRequest) {
    try {
        const admin = await requireSuperAdmin();
        const supportLakeId = request.cookies.get("support_lake_id")?.value;

        if (supportLakeId) {
            await prisma.auditEvent.create({
                data: {
                    lakeId: supportLakeId,
                    entityType: "SUPPORT_SESSION",
                    entityId: supportLakeId,
                    action: "END_IMPERSONATE",
                    payload: JSON.stringify({
                        message: "System Admin đã kết thúc phiên hỗ trợ kỹ thuật",
                        adminEmail: admin.email,
                        adminId: admin.id,
                        endedAt: new Date().toISOString(),
                    }),
                    createdBy: admin.id,
                },
            });
        }

        const response = NextResponse.json({
            success: true,
            redirectUrl: "/admin/lakes",
        });

        // Clear support cookie
        response.cookies.delete("support_lake_id");

        return response;
    } catch {
        const response = NextResponse.json({
            success: true,
            redirectUrl: "/admin/lakes",
        });
        response.cookies.delete("support_lake_id");
        return response;
    }
}
