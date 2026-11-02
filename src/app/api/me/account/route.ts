import { NextResponse } from "next/server";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const tenant = await requireTenantContext();

        const [user, lake] = await Promise.all([
            prisma.user.findUnique({
                where: { id: tenant.userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    phoneVerified: true,
                    sessionVersion: true,
                    lastLoginAt: true,
                    passwordHash: true,
                },
            }),
            prisma.lake.findUnique({
                where: { id: tenant.lakeId },
                select: {
                    id: true,
                    name: true,
                    contactPhone: true,
                },
            }),
        ]);

        if (!user || !lake) {
            return NextResponse.json({ error: "Không tìm thấy thông tin tài khoản hoặc hồ câu." }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                phoneVerified: user.phoneVerified,
                role: tenant.role,
                sessionVersion: user.sessionVersion,
                lastLoginAt: user.lastLoginAt,
                hasPassword: Boolean(user.passwordHash),
            },
            lake: {
                id: lake.id,
                name: lake.name,
                contactPhone: lake.contactPhone,
            },
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không tải được thông tin tài khoản." }, { status: 500 });
    }
}

