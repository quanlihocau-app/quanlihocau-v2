import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { CreateFishTypeForm } from "./create-fish-type-form";
import { FishTypeList } from "./fish-type-list";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function FishTypesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
                <div className="w-full rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
                    <h1 className="text-lg font-bold text-rose-900">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-rose-700 leading-relaxed">
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
        <main className="min-h-screen bg-[#F8FAFC] pb-24 pt-4 sm:pt-6">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                {/* Header Flat Navy/Blue */}
                <div className="mb-6 space-y-3 border-b border-slate-200 pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href="/settings"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            <span>Quay lại Cài đặt</span>
                        </Link>

                        <div className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            <span>{tenantContext.lakeName}</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">
                            Quản lý loại cá
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
                            Cấu hình danh mục loại cá và bảng giá thu mua tính theo từng kg từ cần thủ.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Section 1: Thêm loại cá mới (Flat Panel, Compact) */}
                    {canManageFishTypes && (
                        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0f172a]">
                                    Thêm loại cá mới
                                </h2>
                                <p className="text-xs text-slate-500 font-normal mt-0.5">
                                    Nhập tên loại cá và đơn giá thu mua cố định theo kg.
                                </p>
                            </div>

                            <CreateFishTypeForm />
                        </section>
                    )}

                    {/* Section 2: Danh sách loại cá hiện có (Flat Panel) */}
                    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0f172a]">
                                Danh mục loại cá hiện có
                            </h2>
                            <p className="text-xs text-slate-500 font-normal mt-0.5">
                                Các loại cá đang được kích hoạt và áp dụng tính tiền bù trừ tự động khi kết ca.
                            </p>
                        </div>

                        <FishTypeList
                            fishTypes={fishTypes}
                            canManage={canManageFishTypes}
                        />
                    </section>
                </div>
            </div>

            <MobileBottomNav />
        </main>
    );
}
