import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateProductForm } from "./create-product-form";
import { ProductList } from "./product-list";

export default async function ProductsPage() {
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

    const canManageProducts =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    const products = await prisma.product.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Danh mục sản phẩm & dịch vụ
                        </h1>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {tenantContext.lakeName}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        Quản lý các mặt hàng bán kèm, nước giải khát, mồi câu và
                        dịch vụ tại hồ câu.
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

            {/* Content Layout */}
            <div
                className={`grid grid-cols-1 gap-8 ${
                    canManageProducts ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: Product List with Search & Actions */}
                <div className={canManageProducts ? "lg:col-span-2" : ""}>
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 border-b border-slate-100 pb-3">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Danh sách mặt hàng ({products.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                Các sản phẩm đang hoạt động có thể thêm vào hóa đơn dịch vụ.
                            </p>
                        </div>

                        <ProductList
                            products={products}
                            canManage={canManageProducts}
                        />
                    </section>
                </div>

                {/* Right 1 Col: Create Product Form (OWNER & MANAGER only) */}
                {canManageProducts && (
                    <div className="lg:col-span-1">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Thêm sản phẩm mới
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Thêm mặt hàng mới vào danh mục của hồ câu này.
                                </p>
                            </div>

                            <div className="mt-4">
                                <CreateProductForm />
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
