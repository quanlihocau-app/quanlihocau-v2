import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateBuybackForm } from "./create-buyback-form";
import { FishBuybackList } from "./fish-buyback-list";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FishBuybacksPage() {
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

    const canManageBuybacks =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    // Fetch active fish types for form
    const fishTypes = await prisma.fishType.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        orderBy: {
            name: "asc",
        },
        select: {
            id: true,
            name: true,
            pricePerKg: true,
        },
    });

    // Fetch recent buybacks
    const rawBuybacks = await prisma.fishBuyback.findMany({
        where: {
            lakeId: tenantContext.lakeId,
        },
        include: {
            fishType: {
                select: {
                    id: true,
                    name: true,
                    deletedAt: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 100,
    });

    const buybacks = rawBuybacks.map((b) => ({
        id: b.id,
        fishTypeId: b.fishTypeId,
        fishTypeName: b.fishType.name,
        isFishTypeDeleted: b.fishType.deletedAt !== null,
        weight: Number(b.weight),
        pricePerKg: b.pricePerKg,
        totalVnd: b.totalVnd,
        createdAt: b.createdAt,
    }));

    return (
        <main className="mx-auto min-h-screen max-w-7xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {/* Header */}
            <PageHeader
                title="Sổ thu mua cá cần thủ"
                subtitle="Ghi nhận khối lượng cá câu được và tính tiền thu mua bù trừ theo bảng giá hiện hành của hồ."
                backHref="/settings"
                backLabel="Quay lại Cài đặt"
                badge={<Badge variant="default">{tenantContext.lakeName}</Badge>}
            />

            {/* Content Grid */}
            <div
                className={`grid grid-cols-1 gap-6 ${
                    canManageBuybacks ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: Buybacks History List */}
                <div className={canManageBuybacks ? "lg:col-span-2" : ""}>
                    <Card className="p-5 sm:p-6 space-y-4">
                        <div className="border-b border-[#E2DDD2] pb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Lịch sử thu mua gần đây ({buybacks.length})
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Danh sách các lượt cân và tính tiền cá đã ghi nhận.
                            </p>
                        </div>

                        <FishBuybackList buybacks={buybacks} />
                    </Card>
                </div>

                {/* Right 1 Col: Create Buyback Form */}
                {canManageBuybacks && (
                    <div className="lg:col-span-1">
                        <Card className="p-5 sm:p-6 space-y-4">
                            <div className="border-b border-[#E2DDD2] pb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                    Ghi nhận thu mua cá
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Cân cá và tính thành tiền tự động theo giá niêm yết.
                                </p>
                            </div>

                            <CreateBuybackForm fishTypes={fishTypes} />
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}
