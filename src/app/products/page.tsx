import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateProductForm } from "./create-product-form";
import { ProductList } from "./product-list";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage() {
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
        <main className="mx-auto min-h-screen max-w-7xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {/* Header */}
            <PageHeader
                title="Danh mục sản phẩm & dịch vụ"
                subtitle="Quản lý các mặt hàng bán kèm, nước giải khát, mồi câu và dịch vụ tại hồ câu."
                backHref="/dashboard"
                backLabel="Bảng điều khiển"
                badge={<Badge variant="default">{tenantContext.lakeName}</Badge>}
            />

            {/* Content Layout */}
            <div
                className={`grid grid-cols-1 gap-6 ${
                    canManageProducts ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: Product List */}
                <div className={canManageProducts ? "lg:col-span-2" : ""}>
                    <Card className="p-5 sm:p-6 space-y-4">
                        <div className="border-b border-[#E2DDD2] pb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Danh sách mặt hàng ({products.length})
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Các sản phẩm đang hoạt động có thể thêm vào hóa đơn bán hàng.
                            </p>
                        </div>

                        <ProductList
                            products={products}
                            canManage={canManageProducts}
                        />
                    </Card>
                </div>

                {/* Right 1 Col: Create Product Form */}
                {canManageProducts && (
                    <div className="lg:col-span-1">
                        <Card className="p-5 sm:p-6 space-y-4">
                            <div className="border-b border-[#E2DDD2] pb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                    Thêm sản phẩm mới
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Thêm mặt hàng mới vào danh mục của hồ câu này.
                                </p>
                            </div>

                            <CreateProductForm />
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}
