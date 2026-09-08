import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { NegativeInventoryToggle } from "./negative-inventory-toggle";
import { SubscriptionBanner } from "./subscription-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";

// Arrow icon for menu rows
function ChevronRight() {
    return (
        <svg
            className="h-4 w-4 shrink-0 text-[#8A938D]"
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
                <div className="w-full rounded-2xl border border-[#D9534F]/30 bg-[#FCEEED] p-8 text-center">
                    <h1 className="text-xl font-bold text-[#D9534F]">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-[#D9534F]">
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền
                        hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    const [lake, spotsCount, staffCount, currentUser] = await Promise.all([
        prisma.lake.findUnique({
            where: { id: tenantContext.lakeId },
            select: {
                id: true,
                name: true,
                allowNegativeInventory: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true,
            },
        }),
        prisma.hut.count({
            where: { lakeId: tenantContext.lakeId, deletedAt: null },
        }),
        prisma.membership.count({
            where: {
                lakeId: tenantContext.lakeId,
                deletedAt: null,
                role: { in: [Role.STAFF, Role.MANAGER] },
            },
        }),
        prisma.user.findUnique({
            where: { id: tenantContext.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                phoneVerified: true,
            },
        }),
    ]);

    const isOwner = tenantContext.role === Role.OWNER;
    const isManager = tenantContext.role === Role.MANAGER;
    const roleBadge = isOwner ? "Chủ hồ" : isManager ? "Quản lý" : "Nhân viên";

    return (
        <main className="mx-auto min-h-screen max-w-lg bg-transparent px-4 pb-24 pt-5 sm:px-6">
            {/* ── App Header ─────────────────────────────────────────── */}
            <MobileAppHeader
                lakeName={tenantContext.lakeName}
                isSupportMode={tenantContext.isSupportMode}
            />

            {/* ── Page title + role badge ─────────────────────────────── */}
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-[22px] font-black tracking-tight text-white drop-shadow-sm">
                    Cài đặt
                </h1>
                <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-400/30 backdrop-blur-md shadow-xs">
                    {roleBadge}
                </span>
            </div>

            {/* ── Owner Account & Phone Verification Card ────────────── */}
            {currentUser && (
                <div className="mb-4 rounded-2xl border border-[#E3E8E3] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F3E5] text-[#246B38] font-bold text-sm">
                                {currentUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#17201A] leading-tight">{currentUser.name}</h2>
                                <p className="text-[11px] text-[#66716A]">{currentUser.email}</p>
                            </div>
                        </div>

                        {currentUser.phoneVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF6ED] border border-[#3E9B4F]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#3E9B4F]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#3E9B4F]" />
                                ✓ Đã xác thực SĐT
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF6E9] border border-[#D99A32]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#D99A32]">
                                Chưa xác thực SĐT
                            </span>
                        )}
                    </div>

                    {currentUser.phone && (
                        <div className="mt-3 flex items-center justify-between border-t border-[#E3E8E3] pt-2.5 text-xs">
                            <span className="text-[#66716A]">Số điện thoại đăng ký:</span>
                            <span className="font-mono font-bold text-[#17201A]">{currentUser.phone}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── SaaS Subscription Status Card ──────────────────────── */}
            {lake && (
                <div className="mb-4">
                    <SubscriptionBanner
                        plan={lake.subscriptionPlan}
                        status={lake.subscriptionStatus}
                        expiresAt={lake.subscriptionExpiresAt ? lake.subscriptionExpiresAt.toISOString() : null}
                        spotsCount={spotsCount}
                        staffCount={staffCount}
                        canManage={isOwner}
                    />
                </div>
            )}

            {/* ── Menu list ─────────────────────────────────────────── */}
            <div className="space-y-2.5">
                {/* Hướng dẫn sử dụng & Cẩm nang */}
                <Link href="/settings/guide" className="menu-row bg-[#E8F3E5]/60 border-[#4F9D5A]/40 hover:bg-[#E8F3E5]">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-[#4F9D5A] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                11 BÀI
                            </span>
                            <p className="text-[14px] font-bold text-[#246B38]">
                                Hướng dẫn sử dụng & Onboarding
                            </p>
                        </div>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            Cẩm nang 10 phút cho nhân viên & quản lý mới
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Khách hàng */}
                <Link href="/customers" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Khách hàng</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            Tên, số điện thoại và lịch sử tự động
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Hồ và ô câu */}
                <Link href="/facilities" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Hồ và ô câu</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            Khu A, khu B và các ô
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Ca và bảng giá */}
                <Link href="/pricing" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Ca và bảng giá</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            5 giờ, 10 giờ, phụ thu theo giờ
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Loại cá & giá thu mua */}
                <Link href="/fish-types" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Loại cá &amp; giá thu mua</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            Quản lý loại cá và đơn giá thu mua theo kg
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Sản phẩm và kho */}
                <Link href="/products" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Sản phẩm và kho</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            Cho bán âm có cảnh báo
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Nhân viên và quyền */}
                {(isOwner || isManager) && (
                    <Link href="/settings/members" className="menu-row">
                        <div>
                            <p className="text-[14px] font-semibold text-[#17201A]">Nhân viên và quyền</p>
                            <p className="text-[12px] text-[#66716A] mt-0.5">
                                Chỉ chủ hồ được sửa giờ, hủy vé
                            </p>
                        </div>
                        <ChevronRight />
                    </Link>
                )}

                {/* Máy in & Mẫu vé */}
                <Link href="/settings/printer" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Máy in &amp; Mẫu vé</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            Hóa đơn 58 mm, kết nối Bluetooth, USB-OTG, Wi-Fi
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Hướng dẫn & Cẩm nang sử dụng */}
                <Link href="/settings/guide" className="menu-row">
                    <div>
                        <p className="text-[14px] font-semibold text-[#17201A]">Cẩm nang &amp; Hướng dẫn sử dụng</p>
                        <p className="text-[12px] text-[#66716A] mt-0.5">
                            11 bài hướng dẫn vận hành quầy, mở ca, in bill, xử lý sự cố
                        </p>
                    </div>
                    <ChevronRight />
                </Link>

                {/* Sản phẩm và kho - negative inventory toggle (inline) */}
                {lake && (
                    <div className="rounded-2xl border border-[#E3E8E3] bg-white px-4 py-3.5 shadow-xs">
                        <p className="text-[13px] font-semibold text-[#17201A] mb-2">
                            Cho phép bán âm kho
                        </p>
                        <NegativeInventoryToggle
                            initialAllowNegative={lake.allowNegativeInventory ?? false}
                            canEdit={isOwner}
                        />
                    </div>
                )}
            </div>

            {/* ── Return to Sessions button ─────────────────────────── */}
            <div className="mt-6">
                <Link
                    href="/sessions"
                    className="flex w-full items-center justify-center rounded-full bg-[#4F9D5A] py-3.5 text-sm font-semibold text-white hover:bg-[#246B38] active:scale-[0.99] transition-all shadow-xs min-h-12"
                >
                    Về màn hình Đang câu
                </Link>
            </div>

            <MobileBottomNav />
        </main>
    );
}
