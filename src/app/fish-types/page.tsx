import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateFishTypeForm } from "./create-fish-type-form";
import { FishTypeList } from "./fish-type-list";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FishTypesPage() {
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

    const canManageFishTypes =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    const fishTypes = await prisma.fishType.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        orderBy: {
            name: "asc",
        },
    });

    return (
        <main className="mx-auto min-h-screen max-w-7xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {/* Header */}
            <PageHeader
                title="Danh mục loại cá & Giá thu mua"
                subtitle="Cấu hình bảng giá thu mua cá từ cần thủ tính theo kg tại hồ câu."
                backHref="/dashboard"
                backLabel="Bảng điều khiển"
                badge={<Badge variant="default">{tenantContext.lakeName}</Badge>}
            />

            {/* Content Grid */}
            <div
                className={`grid grid-cols-1 gap-6 ${
                    canManageFishTypes ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: List */}
                <div className={canManageFishTypes ? "lg:col-span-2" : ""}>
                    <Card className="p-5 sm:p-6 space-y-4">
                        <div className="border-b border-[#E2DDD2] pb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Bảng giá thu mua ({fishTypes.length})
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Các loại cá đang được thu mua và tính bù trừ vào hóa đơn kết ca.
                            </p>
                        </div>

                        <FishTypeList
                            fishTypes={fishTypes}
                            canManage={canManageFishTypes}
                        />
                    </Card>
                </div>

                {/* Right 1 Col: Create Form */}
                {canManageFishTypes && (
                    <div className="lg:col-span-1">
                        <Card className="p-5 sm:p-6 space-y-4">
                            <div className="border-b border-[#E2DDD2] pb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                    Thêm loại cá mới
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Cấu hình đơn giá thu mua tính theo từng kg.
                                </p>
                            </div>

                            <CreateFishTypeForm />
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}
