import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const createPackageSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Tên gói câu tối thiểu 2 ký tự")
        .max(100, "Tên gói câu tối đa 100 ký tự"),
    durationMinutes: z
        .number({ message: "Thời lượng phải là số" })
        .int("Thời lượng phải là số nguyên")
        .min(15, "Thời lượng tối thiểu 15 phút")
        .max(1440, "Thời lượng tối đa 1440 phút (24 giờ)"),
    priceVnd: z
        .number({ message: "Giá gói phải là số" })
        .int("Giá gói phải là số nguyên")
        .min(0, "Giá gói không được âm"),
    overtimeHourlyVnd: z
        .number({ message: "Giá quá giờ phải là số" })
        .int("Giá quá giờ phải là số nguyên")
        .min(0, "Giá quá giờ không được âm"),
});

export async function GET() {
    try {
        const tenantContext = await requireTenantContext();

        const packages = await prisma.package.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return NextResponse.json(packages, { status: 200 });
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

export async function POST(request: Request) {
    try {
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

        const parsed = createPackageSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const newPackage = await prisma.package.create({
            data: {
                lakeId: tenantContext.lakeId,
                name: parsed.data.name,
                durationMinutes: parsed.data.durationMinutes,
                priceVnd: parsed.data.priceVnd,
                overtimeHourlyVnd: parsed.data.overtimeHourlyVnd,
            },
        });

        return NextResponse.json(newPackage, { status: 201 });
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
