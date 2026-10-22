import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/tenant";

type ScopeClient = Prisma.TransactionClient | typeof prisma;

export function belongsToLake(recordLakeId: string | null | undefined, lakeId: string): boolean {
    return typeof recordLakeId === "string" && recordLakeId.length > 0 && recordLakeId === lakeId;
}

export function publicCustomer(
    customer: { id: string; name: string; phoneNormalized: string | null; lakeId: string } | null | undefined,
    lakeId: string,
): { id: string; name: string; phoneNormalized: string | null } | null {
    if (!customer || !belongsToLake(customer.lakeId, lakeId)) return null;
    return {
        id: customer.id,
        name: customer.name,
        phoneNormalized: customer.phoneNormalized,
    };
}

/**
 * Mọi id do client gửi phải thuộc đúng hồ của phiên đăng nhập.
 * Không tìm thấy hoặc thuộc hồ khác đều bị từ chối, không tiết lộ dữ liệu hồ kia.
 */
export async function assertClientIdsInLake(
    client: ScopeClient,
    lakeId: string,
    ids: {
        categoryId?: string | null;
        accountId?: string | null;
        customerId?: string | null;
        invoiceId?: string | null;
        parentCategoryId?: string | null;
    },
): Promise<void> {
    if (ids.categoryId) {
        const row = await client.financialCategory.findFirst({
            where: { id: ids.categoryId, lakeId },
            select: { id: true },
        });
        if (!row) throw new ForbiddenError("Danh mục không thuộc hồ câu hiện tại.");
    }

    if (ids.parentCategoryId) {
        const row = await client.financialCategory.findFirst({
            where: { id: ids.parentCategoryId, lakeId },
            select: { id: true },
        });
        if (!row) throw new ForbiddenError("Danh mục cha không thuộc hồ câu hiện tại.");
    }

    if (ids.accountId) {
        const row = await client.financialAccount.findFirst({
            where: { id: ids.accountId, lakeId },
            select: { id: true },
        });
        if (!row) throw new ForbiddenError("Tài khoản quỹ không thuộc hồ câu hiện tại.");
    }

    if (ids.customerId) {
        const row = await client.customer.findFirst({
            where: { id: ids.customerId, lakeId, deletedAt: null },
            select: { id: true },
        });
        if (!row) throw new ForbiddenError("Khách hàng không thuộc hồ câu hiện tại.");
    }

    if (ids.invoiceId) {
        const row = await client.invoice.findFirst({
            where: { id: ids.invoiceId, lakeId },
            select: { id: true },
        });
        if (!row) throw new ForbiddenError("Hóa đơn không thuộc hồ câu hiện tại.");
    }
}
