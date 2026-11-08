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
import { withLakeQuota } from "@/lib/subscription-guard";

const createMemberSchema = z
    .object({
        name: z
            .string({
                message: "Tên nhân sự không được để trống.",
            })
            .trim()
            .min(1, "Tên nhân sự không được để trống.")
            .max(100, "Tên nhân sự tối đa 100 ký tự."),
        email: z
            .string({
                message: "Email hoặc tên đăng nhập không được để trống.",
            })
            .trim()
            .min(2, "Email hoặc tên đăng nhập tối thiểu 2 ký tự.")
            .max(255, "Tối đa 255 ký tự."),
        password: z
            .string({
                message: "Mật khẩu không được để trống.",
            })
            .min(4, "Mật khẩu phải từ 4 ký tự trở lên.")
            .max(128, "Mật khẩu tối đa 128 ký tự."),
        role: z.enum([Role.STAFF, Role.MANAGER], {
            message: "Vai trò chỉ được là NHÂN VIÊN (STAFF) hoặc QUẢN LÝ (MANAGER).",
        }),
    })
    .strict();

export async function GET() {
    try {
        const tenantContext = await requireTenantContext([Role.OWNER]);

        const memberships = await prisma.membership.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
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
            orderBy: {
                createdAt: "asc",
            },
        });

        const safeMembers = memberships.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            createdAt: m.createdAt,
        }));

        return NextResponse.json({ members: safeMembers }, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi lấy danh sách nhân sự." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext([Role.OWNER]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = createMemberSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const data = parsed.data;
        const rawInput = data.email.toLowerCase().trim();
        const normalizedEmail = rawInput.includes("@") ? rawInput : `${rawInput}@hocau.vn`;
        const passwordHash = await bcrypt.hash(data.password, 12);
        const result = await withLakeQuota(tenantContext.lakeId, "staff", async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "User" WHERE "email" = ${normalizedEmail} FOR UPDATE`;
            const existing = await tx.user.findUnique({
                where: { email: normalizedEmail }, include: { memberships: true },
            });
            if (existing && (existing.systemRole !== "USER" || existing.isLocked ||
                existing.memberships.some((m) => m.lakeId !== tenantContext.lakeId || m.role === Role.OWNER) ||
                !existing.memberships.length || existing.memberships.some((m) => m.deletedAt === null))) {
                throw new Error("EMAIL_EXISTS");
            }
            const user = existing
                ? await tx.user.update({ where: { id: existing.id }, data: {
                    name: data.name, passwordHash, sessionVersion: { increment: 1 },
                } })
                : await tx.user.create({ data: { name: data.name, email: normalizedEmail, passwordHash } });
            const membership = existing
                ? await tx.membership.update({ where: { userId_lakeId: { userId: user.id, lakeId: tenantContext.lakeId } },
                    data: { role: data.role, deletedAt: null } })
                : await tx.membership.create({ data: { userId: user.id, lakeId: tenantContext.lakeId, role: data.role } });
            await tx.auditEvent.create({ data: {
                lakeId: tenantContext.lakeId, entityType: "Membership", entityId: membership.id,
                action: "MEMBER_CREATED", createdBy: tenantContext.userId,
                payload: JSON.stringify({ userId: user.id, name: user.name, email: user.email, role: membership.role, reactivated: Boolean(existing) }),
            } });
            return { id: membership.id, userId: user.id, name: user.name, email: user.email, role: membership.role, createdAt: membership.createdAt };
        });

        return NextResponse.json(
            {
                message: "Thêm nhân sự mới thành công.",
                member: result,
            },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof Error && error.message === "EMAIL_EXISTS") {
            return NextResponse.json(
                { error: "Email này đã được sử dụng trên hệ thống." },
                { status: 409 },
            );
        }
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Email này đã được sử dụng trên hệ thống." },
                { status: 409 },
            );
        }
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tạo nhân sự." },
            { status: 500 },
        );
    }
}
