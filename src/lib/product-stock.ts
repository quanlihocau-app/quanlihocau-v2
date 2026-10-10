import { prisma } from "@/lib/prisma";

/** Return one aggregate per product instead of loading every stock movement. */
export async function getProductStockMap(lakeId: string): Promise<Map<string, number>> {
    const totals = await prisma.inventoryMovement.groupBy({
        by: ["productId"],
        where: { lakeId },
        _sum: { quantity: true },
    });
    return new Map(totals.map((total) => [total.productId, Number(total._sum.quantity ?? 0)]));
}
