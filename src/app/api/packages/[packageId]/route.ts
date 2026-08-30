import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const updatePackageSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Tên gói câu tối thiểu 2 ký tự")
        .max(100, "Tên gói câu tối đa 100 ký tự")
        .optional(),
    durationMinutes: z
        .number({ message: "Thời lượng phải là số" })
        .int("Thời lượng phải là số nguyên")
        .min(15, "Thời lượng tối thiểu 15 phút")
        .max(1440, "Thời lượng tối đa 1440 phút (24 giờ)")
        .optional(),
    priceVnd: z
        .number({ message: "Giá gói phải là số" })
        .int("Giá gói phải là số nguyên")
        .min(0, "Giá gói không được âm")
        .optional(),
    overtimeHourlyVnd: z
        .number({ message: "Giá quá giờ phải là số" })
        .int("Giá quá giờ phải là số nguyên")
        .min(0, "Giá quá giờ không được âm")
        .optional(),
});

interface RouteParams {
    params: Promise<{
        packageId: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { packageId } = await params;
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = updatePackageSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const existingPackage = await prisma.package.findFirst({
            where: {
                id: packageId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existingPackage) {
            return NextResponse.json(
                { error: "Gói câu không tồn tại hoặc đã bị vô hiệu hóa." },
                { status: 404 },
            );
        }

        const updatedPackage = await prisma.package.update({
            where: {
                id: packageId,
            },
            data: parsed.data,
        });

        return NextResponse.json(updatedPackage, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const { packageId } = await params;
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const existingPackage = await prisma.package.findFirst({
            where: {
                id: packageId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existingPackage) {
            return NextResponse.json(
                { error: "Gói câu không tồn tại hoặc đã bị vô hiệu hóa." },
                { status: 404 },
            );
        }

        await prisma.package.update({
            where: {
                id: packageId,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return NextResponse.json(
            { message: "Đã vô hiệu hóa gói câu thành công." },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}
