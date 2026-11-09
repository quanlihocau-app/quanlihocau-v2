import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";
import {
    loadLakeRolePermissionsConfig,
    saveLakeRolePermissionsConfig,
} from "@/lib/role-permissions-server";

const uuidSchema = z.string().uuid({
    message: "ID nhân sự không đúng định dạng UUID.",
});

const patchMemberSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("DEACTIVATE"),
    }),
    z.object({
        action: z.literal("RESET_PASSWORD"),
        newPassword: z
            .string({ message: "Vui lòng nhập mật khẩu mới." })
            .min(4, "Mật khẩu mới phải từ 4 ký tự trở lên.")
            .max(128, "Mật khẩu tối đa 128 ký tự."),
    }),
    z.object({
        action: z.literal("UPDATE_ROLE"),
        role: z.enum([Role.STAFF, Role.MANAGER], {
            message: "Vai trò chỉ được là NHÂN VIÊN (STAFF) hoặc QUẢN LÝ (MANAGER).",
        }),
        customRoleId: z.string().max(100).optional().nullable(),
    }),
]);

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

        const parsed = patchMemberSchema.safeParse(body);
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
                        systemRole: true,
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

        // Handle UPDATE_ROLE action
        if (parsed.data.action === "UPDATE_ROLE") {
            if (
                membership.role === Role.OWNER ||
                membership.user.systemRole === "SUPER_ADMIN" ||
                membership.userId === tenantContext.userId
            ) {
                return NextResponse.json(
                    { error: "Không thể thay đổi vai trò của Chủ sở hữu hoặc Quản trị viên." },
                    { status: 403 },
                );
            }

            const { role: requestedRole, customRoleId: requestedCustomRoleId } = parsed.data;
            const currentConfig = await loadLakeRolePermissionsConfig(tenantContext.lakeId);
            const matchedCustomRole = requestedCustomRoleId
                ? currentConfig.customRoles.find((r) => r.id === requestedCustomRoleId)
                : undefined;
            const targetRole = matchedCustomRole ? matchedCustomRole.baseRole : requestedRole;

            await prisma.$transaction(async (tx) => {
                await tx.membership.update({
                    where: { id: membership.id },
                    data: { role: targetRole },
                });

                await tx.user.update({
                    where: { id: membership.userId },
                    data: { sessionVersion: { increment: 1 } },
                });

                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "Membership",
                        entityId: membership.id,
                        action: "MEMBER_ROLE_UPDATED",
                        payload: JSON.stringify({
                            userId: membership.userId,
                            name: membership.user.name,
                            email: membership.user.email,
                            previousRole: membership.role,
                            newRole: targetRole,
                            customRoleId: matchedCustomRole?.id ?? null,
                            customRoleName: matchedCustomRole?.name ?? null,
                        }),
                        createdBy: tenantContext.userId,
                    },
                });
            });

            const nextMap = { ...currentConfig.memberCustomRoleMap };
            if (matchedCustomRole) {
                nextMap[membership.id] = matchedCustomRole.id;
            } else {
                delete nextMap[membership.id];
            }

            await saveLakeRolePermissionsConfig(
                tenantContext.lakeId,
                tenantContext.userId,
                {
                    ...currentConfig,
                    memberCustomRoleMap: nextMap,
                },
            );

            return NextResponse.json(
                {
                    success: true,
                    message: `Đã cập nhật phân quyền cho "${membership.user.name}" thành công.`,
                    member: {
                        id: membership.id,
                        role: targetRole,
                        customRoleId: matchedCustomRole?.id ?? null,
                        customRoleName: matchedCustomRole?.name ?? null,
                    },
                },
                { status: 200 },
            );
        }

        // Handle RESET_PASSWORD action
        if (parsed.data.action === "RESET_PASSWORD") {
            // Prevent resetting password of an OWNER, SUPER_ADMIN or self
            if (membership.role === Role.OWNER || membership.user.systemRole === "SUPER_ADMIN" || membership.userId === tenantContext.userId) {
                return NextResponse.json(
                    { error: "Không thể đặt lại mật khẩu cho tài khoản Chủ sở hữu hoặc Quản trị viên." },
                    { status: 403 },
                );
            }

            const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);
            await prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${membership.userId} FOR UPDATE`;
                const user = await tx.user.findUniqueOrThrow({ where: { id: membership.userId }, include: { memberships: true } });
                if (user.isLocked || user.systemRole !== "USER" || user.memberships.some((m) => m.lakeId !== tenantContext.lakeId || m.role === Role.OWNER)) {
                    throw new ForbiddenError("Không thể đổi mật khẩu tài khoản dùng chung hoặc tài khoản bị khóa. Liên hệ quản trị viên.");
                }
                await tx.user.update({
                    where: { id: membership.userId },
                    data: {
                        passwordHash: newPasswordHash,
                        sessionVersion: { increment: 1 },
                    },
                });

                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "Membership",
                        entityId: membership.id,
                        action: "MEMBER_PASSWORD_RESET",
                        payload: JSON.stringify({
                            userId: membership.userId,
                            name: membership.user.name,
                            email: membership.user.email,
                        }),
                        createdBy: tenantContext.userId,
                    },
                });
            });

            return NextResponse.json(
                {
                    success: true,
                    message: `Đã đặt lại mật khẩu mới cho "${membership.user.name}" (${membership.user.email}) thành công.`,
                },
                { status: 200 },
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

        // Prevent deactivating any OWNER or SUPER_ADMIN membership
        if (membership.role === Role.OWNER || membership.user.systemRole === "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Không thể vô hiệu hóa tài khoản Chủ sở hữu hoặc Quản trị viên." },
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
                // Invalidate any active sessions for the deactivated user
                await tx.user.update({
                    where: { id: membership.userId },
                    data: {
                        sessionVersion: { increment: 1 },
                    },
                });

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
            { error: "Đã xảy ra lỗi khi cập nhật nhân sự." },
            { status: 500 },
        );
    }
}
