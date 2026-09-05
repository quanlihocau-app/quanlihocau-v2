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
import { assertStaffLimit } from "@/lib/subscription-guard";

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
                message: "Email không được để trống.",
            })
            .trim()
            .email("Định dạng email không hợp lệ.")
            .max(255, "Email tối đa 255 ký tự."),
        password: z
            .string({
                message: "Mật khẩu không được để trống.",
            })
            .min(8, "Mật khẩu phải từ 8 ký tự trở lên.")
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

        // Kiểm tra giới hạn số lượng nhân viên của gói cước (SILVER max 1)
        await assertStaffLimit(tenantContext.lakeId);

        const data = parsed.data;
        const normalizedEmail = data.email.toLowerCase();

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email này đã được sử dụng trên hệ thống." },
                { status: 409 },
            );
        }

        const passwordHash = await bcrypt.hash(data.password, 12);

        const result = await prisma.$transaction(async (tx) => {
            // Double check existing user in transaction
            const duplicate = await tx.user.findUnique({
                where: { email: normalizedEmail },
                select: { id: true },
            });

            if (duplicate) {
                throw new Error("EMAIL_EXISTS");
            }

            const newUser = await tx.user.create({
                data: {
                    name: data.name,
                    email: normalizedEmail,
                    passwordHash,
                },
            });

            const newMembership = await tx.membership.create({
                data: {
                    userId: newUser.id,
                    lakeId: tenantContext.lakeId,
                    role: data.role,
                },
            });

            // Create AuditEvent (never logging password)
            await tx.auditEvent.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    entityType: "Membership",
                    entityId: newMembership.id,
                    action: "MEMBER_CREATED",
                    payload: JSON.stringify({
                        userId: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        role: newMembership.role,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return {
                id: newMembership.id,
                userId: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newMembership.role,
                createdAt: newMembership.createdAt,
            };
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
