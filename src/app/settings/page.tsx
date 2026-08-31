import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { NegativeInventoryToggle } from "./negative-inventory-toggle";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
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
        <main className="mx-auto min-h-screen max-w-4xl bg-[#F8F6F0] px-4 pb-24 pt-6 sm:px-6">
            <PageHeader
                title="Cài đặt hồ câu"
                subtitle="Quản lý các thiết lập vận hành, kho hàng và phân quyền hệ thống."
                badge={<Badge variant="default">{tenantContext.lakeName}</Badge>}
                action={
                    <Link
                        href="/dashboard"
                        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#E2DDD2] bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-[#F8F6F0]"
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
                }
            />

            <div className="space-y-6">
                {/* Section: Sản phẩm và kho */}
                <section className="space-y-3">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                            Sản phẩm và kho
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
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
                    <section className="space-y-3 pt-2">
                        <Card className="flex flex-col justify-between gap-4 border-[#102A43]/20 bg-[#102A43]/5 p-5 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-sm font-bold text-[#102A43]">
                                    Quản lý thành viên & Phân quyền
                                </h2>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                    Thêm, gán quyền OWNER/MANAGER/STAFF và vô hiệu hóa tài khoản nhân viên.
                                </p>
                            </div>
                            <Link
                                href="/settings/members"
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#102A43] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1E3A5F] active:scale-95"
                            >
                                Quản lý nhân sự →
                            </Link>
                        </Card>
                    </section>
                )}
            </div>

            <MobileBottomNav />
        </main>
    );
}
