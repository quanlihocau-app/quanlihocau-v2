import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { NegativeInventoryToggle } from "./negative-inventory-toggle";
import { PrinterSettingsSection } from "./printer-settings";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";

// Arrow icon for menu rows
function ChevronRight() {
    return (
        <svg
            className="h-4 w-4 shrink-0 text-[#D9D2C8]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
    );
}

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-2xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-8 text-center">
                    <h1 className="text-xl font-bold text-[#8B1E1E]">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-[#8B1E1E]">
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
    const isManager = tenantContext.role === Role.MANAGER;
    const roleBadge = isOwner ? "Chủ hồ" : isManager ? "Quản lý" : "Nhân viên";

    return (
        <main className="mx-auto min-h-screen max-w-lg bg-[#F4F2EE] px-4 pb-24 pt-5 sm:px-6">
            {/* ── App Header ─────────────────────────────────────────── */}
            <MobileAppHeader
                lakeName={tenantContext.lakeName}
                isOnline={true}
            />

            {/* ── Page title + role badge ─────────────────────────────── */}
            <div className="mb-5 flex items-center justify-between">
                <h1 className="text-[22px] font-bold tracking-tight text-[#27231F]">
                    Cài đặt
                </h1>
                <span className="badge-pill">{roleBadge}</span>
            </div>

            {/* ── Menu list ─────────────────────────────────────────── */}
            <div className="space-y-2.5">
                {/* Khách hàng */}
                <Link href="/customers" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#27231F]">Khách hàng</p>
                        <p className="text-[12px] text-[#766F67] mt-0.5">
                            Tên, số điện thoại và lịch sử tự động
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Hồ và ô câu */}
                <Link href="/facilities" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#27231F]">Hồ và ô câu</p>
                        <p className="text-[12px] text-[#766F67] mt-0.5">
                            Khu A, khu B và các ô
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Ca và bảng giá */}
                <Link href="/pricing" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#27231F]">Ca và bảng giá</p>
                        <p className="text-[12px] text-[#766F67] mt-0.5">
                            5 giờ, 10 giờ, phụ thu theo giờ
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Loại cá & giá thu mua */}
                <Link href="/fish-types" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#27231F]">Loại cá &amp; giá thu mua</p>
                        <p className="text-[12px] text-[#766F67] mt-0.5">
                            Quản lý loại cá và đơn giá thu mua theo kg
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Sản phẩm và kho */}
                <Link href="/products" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#27231F]">Sản phẩm và kho</p>
                        <p className="text-[12px] text-[#766F67] mt-0.5">
                            Cho bán âm có cảnh báo
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Nhân viên và quyền */}
                {(isOwner || isManager) && (
                    <Link href="/settings/members" className="menu-row">
                        <div>
                            <p className="text-[14px] font-semibold text-[#27231F]">Nhân viên và quyền</p>
                            <p className="text-[12px] text-[#766F67] mt-0.5">
                                Chỉ chủ hồ được sửa giờ, hủy vé
                            </p>
                        </div>
                        <ChevronRight />
                    </Link>
                )}

                {/* Máy in */}
                <div className="rounded-[0.875rem] border border-[#D9D2C8] bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                        <div>
                            <p className="text-[14px] font-semibold text-[#27231F]">Máy in</p>
                            <p className="text-[12px] text-[#766F67] mt-0.5">Hóa đơn 58 mm</p>
                        </div>
                    </div>
                    <div className="px-4 pb-4">
                        <PrinterSettingsSection />
                    </div>
                </div>

                {/* Sản phẩm và kho - negative inventory toggle (inline) */}
                {lake && (
                    <div className="rounded-[0.875rem] border border-[#D9D2C8] bg-white px-4 py-3.5">
                        <p className="text-[13px] font-semibold text-[#27231F] mb-2">
                            Cho phép bán âm kho
                        </p>
                        <NegativeInventoryToggle
                            initialAllowNegative={lake.allowNegativeInventory ?? false}
                            canEdit={isOwner}
                        />
                    </div>
                )}
            </div>

            {/* ── Save config button ─────────────────────────────────── */}
            <div className="mt-6">
                <Link
                    href="/dashboard"
                    className="flex w-full items-center justify-center rounded-2xl bg-[#8A5A20] py-3.5 text-sm font-semibold text-white hover:bg-[#704716] active:scale-[0.99] transition-all"
                >
                    Lưu cấu hình
                </Link>
            </div>

            <MobileBottomNav />
        </main>
    );
}
