import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const uuidSchema = z.string().uuid({
    message: "ID nhân sự không đúng định dạng UUID.",
});

const deactivateBodySchema = z
    .object({
        action: z.literal("DEACTIVATE", {
            message: "Hành động không hợp lệ, yêu cầu DEACTIVATE.",
        }),
    })
    .strict();

interface RouteParams {
    params: Promise<{
        membershipId: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const tenantContext = await requireTenantContext([Role.OWNER]);

        const { membershipId } = await params;
        const idParse = uuidSchema.safeParse(membershipId);
        if (!idParse.success) {
            return NextResponse.json(
                { error: "ID nhân sự không hợp lệ." },
                { status: 400 },
            );
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = deactivateBodySchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        // Find membership in current lake (including soft-deleted ones)
        const membership = await prisma.membership.findFirst({
            where: {
                id: membershipId,
                lakeId: tenantContext.lakeId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!membership) {
            return NextResponse.json(
                { error: "Không tìm thấy thông tin nhân sự trong hồ câu này." },
                { status: 404 },
            );
        }

        // If already deactivated, return 200 with flag
        if (membership.deletedAt !== null) {
            return NextResponse.json(
                {
                    message: "Tài khoản nhân sự này đã bị vô hiệu hóa trước đó.",
                    alreadyDeactivated: true,
                    member: {
                        id: membership.id,
                        userId: membership.userId,
                        name: membership.user.name,
                        email: membership.user.email,
                        role: membership.role,
                        deletedAt: membership.deletedAt,
                    },
                },
                { status: 200 },
            );
        }

        // Prevent OWNER from deactivating themselves
        if (membership.userId === tenantContext.userId) {
            return NextResponse.json(
                { error: "Bạn không thể tự vô hiệu hóa tài khoản của chính mình." },
                { status: 403 },
            );
        }

        // Prevent deactivating any OWNER membership
        if (membership.role === Role.OWNER) {
            return NextResponse.json(
                { error: "Không thể vô hiệu hóa tài khoản Chủ sở hữu (OWNER)." },
                { status: 403 },
            );
        }

        // Soft-delete membership in transaction and record AuditEvent atomically
        const now = new Date();
        const result = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.membership.updateMany({
                where: {
                    id: membership.id,
                    lakeId: tenantContext.lakeId,
                    deletedAt: null,
                },
                data: {
                    deletedAt: now,
                },
            });

            if (updateResult.count === 1) {
                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "Membership",
                        entityId: membership.id,
                        action: "MEMBER_DEACTIVATED",
                        payload: JSON.stringify({
                            userId: membership.userId,
                            name: membership.user.name,
                            email: membership.user.email,
                            role: membership.role,
                            deactivatedAt: now.toISOString(),
                        }),
                        createdBy: tenantContext.userId,
                    },
                });

                return {
                    alreadyDeactivated: false,
                    deletedAt: now,
                };
            }

            return {
                alreadyDeactivated: true,
                deletedAt: membership.deletedAt ?? now,
            };
        });

        if (result.alreadyDeactivated) {
            return NextResponse.json(
                {
                    message: "Tài khoản nhân sự này đã bị vô hiệu hóa trước đó.",
                    alreadyDeactivated: true,
                    member: {
                        id: membership.id,
                        userId: membership.userId,
                        name: membership.user.name,
                        email: membership.user.email,
                        role: membership.role,
                        deletedAt: result.deletedAt,
                    },
                },
                { status: 200 },
            );
        }

        return NextResponse.json(
            {
                message: `Đã vô hiệu hóa tài khoản nhân sự "${membership.user.name}" thành công.`,
                alreadyDeactivated: false,
                member: {
                    id: membership.id,
                    userId: membership.userId,
                    name: membership.user.name,
                    email: membership.user.email,
                    role: membership.role,
                    deletedAt: result.deletedAt,
                },
            },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi vô hiệu hóa nhân sự." },
            { status: 500 },
        );
    }
}
