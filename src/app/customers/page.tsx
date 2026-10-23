import { getPageSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

import type { Metadata } from "next";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { privateRouteMetadata } from "@/lib/metadata";

import { Suspense } from "react";
import { CustomerManager } from "./customer-manager";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
    ...privateRouteMetadata,
    title: "Quản lý khách hàng",
};

export default async function CustomersPage() {
    const session = await getPageSession();

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
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    const customers = await prisma.customer.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        include: {
            _count: {
                select: {
                    fishingSessions: true,
                    invoices: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const canDelete =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    return (
        <main className="mx-auto min-h-screen max-w-5xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6 font-serif">
            <PageHeader
                title="Quản lý Khách hàng"
                subtitle={`Hồ câu: ${tenantContext.lakeName} (${tenantContext.organizationName})`}
                backHref="/home"
                backLabel="Quay lại Trang chủ"
                badge={<Badge variant="default">Vai trò: {tenantContext.role}</Badge>}
            />

            <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400">Đang tải danh sách khách hàng...</div>}>
                <CustomerManager
                    initialCustomers={customers}
                    canDelete={canDelete}
                />
            </Suspense>
        </main>
    );
}
