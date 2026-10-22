import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";
import { assertClientIdsInLake } from "@/lib/tenant-scope";
import { ensureDefaultFinancialData } from "@/lib/financial/seed-defaults";

const createCategorySchema = z.object({
    name: z.string().trim().min(1, "Tên danh mục không được để trống.").max(100),
    type: z.enum(["IN", "OUT"], { message: "Loại danh mục phải là Thu (IN) hoặc Chi (OUT)." }),
    code: z.string().trim().max(50).optional(),
    color: z.string().trim().max(30).optional(),
    icon: z.string().trim().max(50).optional(),
    parentId: z.string().uuid().nullable().optional(),
    displayOrder: z.number().int().default(0),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        const lakeId = tenantContext.lakeId;

        // Đảm bảo hồ có sẵn danh mục mặc định
        await ensureDefaultFinancialData(prisma, lakeId);

        const url = new URL(request.url);
        const type = url.searchParams.get("type"); // "IN" | "OUT" | null
        const isActiveOnly = url.searchParams.get("activeOnly") === "true";

        const where: Prisma.FinancialCategoryWhereInput = { lakeId };
        if (type === "IN" || type === "OUT") {
            where.type = type;
        }
        if (isActiveOnly) {
            where.isActive = true;
        }

        const categories = await prisma.financialCategory.findMany({
            where,
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
            include: {
                parent: {
                    select: { id: true, name: true },
                },
                children: {
                    select: { id: true, name: true, type: true, color: true, icon: true, isActive: true },
                },
                _count: {
                    select: { transactions: true },
                },
            },
        });

        return NextResponse.json({ categories });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải danh mục thu chi." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_CATEGORIES");
        const lakeId = tenantContext.lakeId;

        const body = await request.json().catch(() => null);
        const parsed = createCategorySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { name, type, code, color, icon, parentId, displayOrder } = parsed.data;

        // Kiểm tra trùng tên danh mục trong cùng loại thu/chi của hồ
        const existing = await prisma.financialCategory.findUnique({
            where: {
                lakeId_type_name: {
                    lakeId,
                    type,
                    name,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Danh mục "${name}" đã tồn tại trong nhóm ${type === "IN" ? "Thu" : "Chi"}.` },
                { status: 409 },
            );
        }

        if (parentId) {
            await assertClientIdsInLake(prisma, lakeId, { parentCategoryId: parentId });
        }

        const category = await prisma.financialCategory.create({
            data: {
                lakeId,
                name,
                type,
                code: code || null,
                color: color || (type === "IN" ? "#10b981" : "#ef4444"),
                icon: icon || "Tag",
                parentId: parentId || null,
                displayOrder,
                isSystem: false,
                isActive: true,
            },
        });

        return NextResponse.json(
            { message: "Đã tạo danh mục thành công.", category },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi tạo danh mục." }, { status: 500 });
    }
}
