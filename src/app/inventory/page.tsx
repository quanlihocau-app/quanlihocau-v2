import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { InventoryMovementForm } from "./inventory-movement-form";
import { InventoryMovementList } from "./inventory-movement-list";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InventoryPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-red-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-red-700">
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền
                        hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    const canManageInventory =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    // Fetch active products
    const products = await prisma.product.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        orderBy: {
            name: "asc",
        },
    });

    // Group-by sum of inventory movements to calculate current stock per product
    const stockAggs = await prisma.inventoryMovement.groupBy({
        by: ["productId"],
        where: {
            lakeId: tenantContext.lakeId,
            product: {
                deletedAt: null,
            },
        },
        _sum: {
            quantity: true,
        },
    });

    const stockMap = new Map(
        stockAggs.map((s) => [
            s.productId,
            s._sum.quantity ? Number(s._sum.quantity) : 0,
        ]),
    );

    const stockItems = products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        priceVnd: p.priceVnd,
        currentStock: stockMap.get(p.id) ?? 0,
    }));

    // Fetch recent movements (including past products that were deactivated)
    const rawMovements = await prisma.inventoryMovement.findMany({
        where: {
            lakeId: tenantContext.lakeId,
        },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    deletedAt: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 100,
    });

    const movements = rawMovements.map((m) => ({
        id: m.id,
        productId: m.productId,
        productName: m.product.name,
        productSku: m.product.sku,
        isProductDeleted: m.product.deletedAt !== null,
        quantity: Number(m.quantity),
        type: (Number(m.quantity) >= 0 ? "IN" : "OUT") as "IN" | "OUT",
        reason: m.reason,
        createdBy: m.createdBy,
        createdAt: m.createdAt,
    }));

    return (
        <main className="mx-auto min-h-screen max-w-7xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {/* Header */}
            <PageHeader
                title="Quản lý kho hàng & Tồn kho"
                subtitle="Theo dõi biến động nhập/xuất và số lượng tồn kho của các mặt hàng dịch vụ tại hồ."
                backHref="/dashboard"
                backLabel="Bảng điều khiển"
                badge={<Badge variant="default">{tenantContext.lakeName}</Badge>}
            />

            {/* Content Grid */}
            <div
                className={`grid grid-cols-1 gap-6 ${
                    canManageInventory ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: Stock & Movements List */}
                <div className={canManageInventory ? "lg:col-span-2" : ""}>
                    <Card className="p-5 sm:p-6 space-y-4">
                        <InventoryMovementList
                            stockItems={stockItems}
                            movements={movements}
                        />
                    </Card>
                </div>

                {/* Right 1 Col: In/Out Form */}
                {canManageInventory && (
                    <div className="lg:col-span-1">
                        <Card className="p-5 sm:p-6 space-y-4">
                            <div className="border-b border-[#E2DDD2] pb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                    Tạo phiếu nhập / xuất kho
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Ghi nhận số lượng hàng nhập mới hoặc xuất kho bán hàng/hủy hỏng.
                                </p>
                            </div>

                            <InventoryMovementForm products={stockItems} />
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}
