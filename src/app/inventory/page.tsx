import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { InventoryMovementForm } from "./inventory-movement-form";
import { InventoryMovementList } from "./inventory-movement-list";

export default async function InventoryPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-amber-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-sm text-amber-700">
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
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Quản lý kho hàng & Tồn kho
                        </h1>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {tenantContext.lakeName}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        Theo dõi biến động nhập/xuất và số lượng tồn kho của các
                        mặt hàng dịch vụ tại hồ.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                            />
                        </svg>
                        <span>Bảng điều khiển</span>
                    </Link>
                </div>
            </div>

            {/* Content Grid */}
            <div
                className={`grid grid-cols-1 gap-8 ${
                    canManageInventory ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: Stock & Movements List */}
                <div className={canManageInventory ? "lg:col-span-2" : ""}>
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <InventoryMovementList
                            stockItems={stockItems}
                            movements={movements}
                        />
                    </section>
                </div>

                {/* Right 1 Col: In/Out Form (OWNER & MANAGER only) */}
                {canManageInventory && (
                    <div className="lg:col-span-1">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Tạo phiếu nhập / xuất kho
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Ghi nhận số lượng hàng nhập mới hoặc xuất kho bán hàng/hủy hỏng.
                                </p>
                            </div>

                            <div className="mt-4">
                                <InventoryMovementForm products={stockItems} />
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
