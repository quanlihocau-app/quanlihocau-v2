import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";
import { assertClientIdsInLake } from "@/lib/tenant-scope";

const updateCategorySchema = z.object({
    name: z.string().trim().min(1, "Tên danh mục không được để trống.").max(100).optional(),
    color: z.string().trim().max(30).optional(),
    icon: z.string().trim().max(50).optional(),
    parentId: z.string().uuid().nullable().optional(),
    displayOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
});

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ categoryId: string }> },
) {
    try {
        const { categoryId } = await params;
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_CATEGORIES");
        const lakeId = tenantContext.lakeId;

        const category = await prisma.financialCategory.findFirst({
            where: { id: categoryId, lakeId },
        });

        if (!category) {
            return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });
        }

        const body = await request.json().catch(() => null);
        const parsed = updateCategorySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        if (parsed.data.parentId) {
            if (parsed.data.parentId === categoryId) {
                return NextResponse.json({ error: "Danh mục không thể là cha của chính nó." }, { status: 400 });
            }
            await assertClientIdsInLake(prisma, lakeId, { parentCategoryId: parsed.data.parentId });
        }

        const updated = await prisma.financialCategory.update({
            where: { id: categoryId },
            data: {
                ...(parsed.data.name ? { name: parsed.data.name } : {}),
                ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
                ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
                ...(parsed.data.parentId !== undefined ? { parentId: parsed.data.parentId } : {}),
                ...(parsed.data.displayOrder !== undefined ? { displayOrder: parsed.data.displayOrder } : {}),
                ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
            },
        });

        return NextResponse.json({ message: "Cập nhật danh mục thành công.", category: updated });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi cập nhật danh mục." }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ categoryId: string }> },
) {
    try {
        const { categoryId } = await params;
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_MANAGE_CATEGORIES");
        const lakeId = tenantContext.lakeId;

        const category = await prisma.financialCategory.findFirst({
            where: { id: categoryId, lakeId },
            include: {
                _count: {
                    select: { transactions: true, children: true },
                },
            },
        });

        if (!category) {
            return NextResponse.json({ error: "Không tìm thấy danh mục." }, { status: 404 });
        }

        // Kiểm tra danh mục hệ thống mặc định
        if (category.isSystem) {
            return NextResponse.json(
                { error: "Danh mục mặc định của hệ thống không thể xóa. Bạn có thể chọn tắt (Vô hiệu hóa) danh mục." },
                { status: 400 },
            );
        }

        // BẢO VỆ DỮ LIỆU KẾ TOÁN: Danh mục đã phát sinh giao dịch không được xóa làm mất lịch sử
        if (category._count.transactions > 0) {
            return NextResponse.json(
                {
                    error: `Danh mục "${category.name}" đã phát sinh ${category._count.transactions} giao dịch. Để bảo toàn số liệu kế toán lịch sử, không được xóa danh mục này. Hãy tắt hoạt động (Vô hiệu hóa) thay vì xóa.`,
                },
                { status: 400 },
            );
        }

        if (category._count.children > 0) {
            return NextResponse.json(
                { error: "Danh mục này đang có danh mục con trực thuộc. Vui lòng chuyển hoặc xóa danh mục con trước." },
                { status: 400 },
            );
        }

        await prisma.financialCategory.delete({
            where: { id: categoryId },
        });

        return NextResponse.json({ message: "Đã xóa danh mục thành công." });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi khi xóa danh mục." }, { status: 500 });
    }
}
