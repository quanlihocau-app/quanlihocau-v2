import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { NegativeInventoryToggle } from "./negative-inventory-toggle";

export default async function SettingsPage() {
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

    const lake = await prisma.lake.findUnique({
        where: { id: tenantContext.lakeId },
        select: {
            id: true,
            name: true,
            allowNegativeInventory: true,
        },
    });

    const isOwner = tenantContext.role === Role.OWNER;

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Cài đặt hồ câu
                        </h1>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {tenantContext.lakeName}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        Quản lý các thiết lập vận hành, kho hàng và phân quyền hệ thống.
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

            <div className="space-y-8">
                {/* Section: Sản phẩm và kho */}
                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Sản phẩm và kho
                        </h2>
                        <p className="text-xs text-slate-500">
                            Cấu hình quy tắc kiểm tra số lượng tồn kho khi nhân viên bán hàng trên hóa đơn.
                        </p>
                    </div>

                    <NegativeInventoryToggle
                        initialAllowNegative={
                            lake?.allowNegativeInventory ?? false
                        }
                        canEdit={isOwner}
                    />
                </section>

                {/* Section: Quản lý Nhân sự */}
                {isOwner && (
                    <section className="border-t border-slate-200 pt-8">
                        <div className="flex flex-col justify-between gap-4 rounded-xl border border-purple-200 bg-purple-50/40 p-5 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-base font-semibold text-purple-950">
                                    Quản lý thành viên & Nhân sự
                                </h2>
                                <p className="text-xs text-purple-700">
                                    Thêm, gán quyền và vô hiệu hóa thành viên trong hồ câu.
                                </p>
                            </div>
                            <Link
                                href="/settings/members"
                                className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700"
                            >
                                Đi đến Quản lý nhân sự →
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
