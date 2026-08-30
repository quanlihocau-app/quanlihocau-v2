import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CustomerManager } from "./customer-manager";

export default async function CustomersPage() {
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
        orderBy: {
            createdAt: "desc",
        },
    });

    const canDelete =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Quản lý Khách hàng
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Hồ câu: <span className="font-semibold text-slate-800">{tenantContext.lakeName}</span> ({tenantContext.organizationName})
                    </p>
                </div>
                <div className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800">
                    Vai trò: {tenantContext.role}
                </div>
            </header>

            <CustomerManager
                initialCustomers={customers}
                canDelete={canDelete}
            />
        </main>
    );
}
