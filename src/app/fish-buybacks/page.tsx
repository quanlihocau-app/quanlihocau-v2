import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateBuybackForm } from "./create-buyback-form";
import { FishBuybackList } from "./fish-buyback-list";

export default async function FishBuybacksPage() {
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
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Sổ thu mua cá cần thủ
                        </h1>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {tenantContext.lakeName}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        Ghi nhận khối lượng cá câu được và tính tiền thu mua bù
                        trừ theo bảng giá hiện hành của hồ.
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
                    canManageBuybacks ? "lg:grid-cols-3" : ""
                }`}
            >
                {/* Left 2 Cols: Buybacks History List */}
                <div className={canManageBuybacks ? "lg:col-span-2" : ""}>
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 border-b border-slate-100 pb-3">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Lịch sử thu mua gần đây ({buybacks.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                Danh sách các lượt cân và tính tiền cá đã ghi nhận.
                            </p>
                        </div>

                        <FishBuybackList buybacks={buybacks} />
                    </section>
                </div>

                {/* Right 1 Col: Create Buyback Form (OWNER & MANAGER only) */}
                {canManageBuybacks && (
                    <div className="lg:col-span-1">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Ghi nhận thu mua cá
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Cân cá và tính thành tiền tự động theo giá niêm yết.
                                </p>
                            </div>

                            <div className="mt-4">
                                <CreateBuybackForm fishTypes={fishTypes} />
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
