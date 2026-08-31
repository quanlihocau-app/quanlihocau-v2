import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { PackageManager } from "./package-manager";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export default async function PricingPage() {
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
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    const packages = await prisma.package.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    const canManage =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    return (
        <main className="mx-auto min-h-screen max-w-5xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6">
            <PageHeader
                title="Bảng giá & Gói câu"
                subtitle={`Hồ câu: ${tenantContext.lakeName} (${tenantContext.organizationName})`}
                backHref="/dashboard"
                backLabel="Bảng điều khiển"
                badge={<Badge variant="default">Vai trò: {tenantContext.role}</Badge>}
            />

            <PackageManager packages={packages} canManage={canManage} />
        </main>
    );
}
