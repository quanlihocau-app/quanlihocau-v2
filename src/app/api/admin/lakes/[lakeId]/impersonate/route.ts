import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ lakeId: string }> }
) {
    try {
        const admin = await requireSuperAdmin();
        const { lakeId } = await context.params;

        const lake = await prisma.lake.findUnique({
            where: { id: lakeId, deletedAt: null },
            select: {
                id: true,
                name: true,
                organization: {
                    select: { name: true },
                },
            },
        });

        if (!lake) {
            return NextResponse.json({ error: "Không tìm thấy hồ câu." }, { status: 404 });
        }

        const logMessage = `System Admin đang truy cập hồ ${lake.name} để hỗ trợ`;

        // Output server warning log
        console.warn(`[SECURITY_ALERT] ${logMessage} (Admin: ${admin.email}, LakeId: ${lake.id})`);

        // Record AuditEvent into DB
        await prisma.auditEvent.create({
            data: {
                lakeId: lake.id,
                entityType: "SUPPORT_SESSION",
                entityId: lake.id,
                action: "START_IMPERSONATE",
                payload: JSON.stringify({
                    message: logMessage,
                    adminEmail: admin.email,
                    adminId: admin.id,
                    lakeName: lake.name,
                    organizationName: lake.organization.name,
                    startedAt: new Date().toISOString(),
                }),
                createdBy: admin.id,
            },
        });

        const response = NextResponse.json({
            success: true,
            message: logMessage,
            redirectUrl: "/sessions",
        });

        // Set temporary support cookie (valid for 2 hours)
        response.cookies.set("support_lake_id", lake.id, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            maxAge: 7200, // 2 hours
        });

        return response;
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === "AuthenticationError") {
            return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
        }
        if (error.name === "ForbiddenError") {
            return NextResponse.json({ error: "Yêu cầu quyền SUPER_ADMIN." }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Lỗi hệ thống khi khởi tạo phiên hỗ trợ." },
            { status: 500 }
        );
    }
}
