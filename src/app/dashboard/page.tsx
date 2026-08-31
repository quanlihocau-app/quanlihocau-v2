import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
    InvoiceStatus,
    PaymentDirection,
    Role,
    SessionStatus,
} from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, InvoiceStatusBadge } from "@/components/ui/badge";

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function formatDateTime(date: Date | null): string {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(date));
}

export default async function DashboardPage() {
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

    const lakeId = tenantContext.lakeId;

    // 1. KPI 1: Active fishing sessions count
    const activeSessionsCount = await prisma.fishingSession.count({
        where: {
            lakeId,
            status: SessionStatus.ACTIVE,
        },
    });

    // 2. KPI 2: Completed fishing sessions waiting for invoice
    const pendingInvoicesCount = await prisma.fishingSession.count({
        where: {
            lakeId,
            status: SessionStatus.COMPLETED,
            invoices: {
                none: {},
            },
        },
    });

    // 3. KPI 3: Remaining unpaid debt (DRAFT or PARTIALLY_PAID invoices)
    const unpaidInvoices = await prisma.invoice.findMany({
        where: {
            lakeId,
            status: {
                in: [InvoiceStatus.DRAFT, InvoiceStatus.PARTIALLY_PAID],
            },
        },
        select: {
            totalAmountVnd: true,
            payments: {
                where: {
                    lakeId,
                },
                select: {
                    amountVnd: true,
                    direction: true,
                },
            },
        },
    });

    const totalRemainingDebtVnd = unpaidInvoices.reduce((acc, inv) => {
        const netPaid = inv.payments.reduce(
            (sum, p) =>
                p.direction === PaymentDirection.IN
                    ? sum + p.amountVnd
                    : sum - p.amountVnd,
            0,
        );
        const paidAmount = Math.max(0, netPaid);
        const remaining = Math.max(0, inv.totalAmountVnd - paidAmount);
        return acc + remaining;
    }, 0);

    // 4. KPI 4: Paid invoices count
    const paidInvoicesCount = await prisma.invoice.count({
        where: {
            lakeId,
            status: InvoiceStatus.PAID,
        },
    });

    // Fetch up to 5 latest ACTIVE sessions
    const recentActiveSessions = await prisma.fishingSession.findMany({
        where: {
            lakeId,
            status: SessionStatus.ACTIVE,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    phoneNormalized: true,
                },
            },
            hutLinks: {
                include: {
                    hut: {
                        select: {
                            id: true,
                            name: true,
                            area: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: {
            startAt: "desc",
        },
        take: 5,
    });

    // Fetch up to 5 latest Invoices
    const recentInvoices = await prisma.invoice.findMany({
        where: {
            lakeId,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    phoneNormalized: true,
                },
            },
            payments: {
                where: {
                    lakeId,
                },
                select: {
                    amountVnd: true,
                    direction: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 5,
    });

    return (
        <main className="mx-auto min-h-screen max-w-7xl bg-[#F8F6F0] px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <PageHeader
                title="Bảng điều khiển vận hành"
                subtitle={`Đơn vị: ${tenantContext.organizationName} • ${tenantContext.userName} (${tenantContext.role})`}
                badge={<Badge variant="default">{tenantContext.lakeName}</Badge>}
                action={
                    <Link
                        href="/sessions/new"
                        className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#102A43] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E3A5F] active:scale-95"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                        <span>Mở phiên câu mới</span>
                    </Link>
                }
            />

            {/* Navigation Quick Links */}
            <div
                className={`mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
                    tenantContext.role === Role.OWNER
                        ? "xl:grid-cols-10"
                        : "xl:grid-cols-9"
                }`}
            >
                <Link
                    href="/sessions"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Phiên câu
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Quản lý phiên câu
                    </span>
                </Link>

                <Link
                    href="/invoices"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Hóa đơn
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Thu & Bán hàng
                    </span>
                </Link>

                <Link
                    href="/customers"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Khách hàng
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Danh bạ khách
                    </span>
                </Link>

                <Link
                    href="/facilities"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Chòi & Khu vực
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Sơ đồ hồ câu
                    </span>
                </Link>

                <Link
                    href="/pricing"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Bảng giá gói
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Cấu hình ca câu
                    </span>
                </Link>

                <Link
                    href="/products"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Sản phẩm
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Danh mục & Giá
                    </span>
                </Link>

                <Link
                    href="/inventory"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Kho hàng
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Nhập / Xuất kho
                    </span>
                </Link>

                <Link
                    href="/fish-types"
                    className="flex flex-col items-center justify-center rounded-2xl border border-[#E2DDD2] bg-white p-3.5 text-center shadow-2xs transition hover:border-[#102A43] hover:shadow-xs active:scale-98"
                >
                    <span className="text-xs font-bold text-[#102A43]">
                        Loại cá
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-500 font-medium">
                        Giá thu mua
                    </span>
                </Link>

                <Link
                    href="/reports/daily"
                    className="flex flex-col items-center justify-center rounded-2xl border border-teal-200 bg-teal-50/50 p-3.5 text-center shadow-2xs transition hover:border-[#0D9488] active:scale-98"
                >
                    <span className="text-xs font-bold text-teal-950">
                        Báo cáo ngày
                    </span>
                    <span className="mt-0.5 text-[10px] text-teal-700 font-medium">
                        Doanh thu & Chốt ca
                    </span>
                </Link>

                <Link
                    href="/expenses"
                    className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-3.5 text-center shadow-2xs transition hover:border-red-500 active:scale-98"
                >
                    <span className="text-xs font-bold text-red-950">
                        Chi phí khác
                    </span>
                    <span className="mt-0.5 text-[10px] text-red-700 font-medium">
                        Quản lý khoản chi
                    </span>
                </Link>

                {tenantContext.role === Role.OWNER && (
                    <Link
                        href="/settings"
                        className="flex flex-col items-center justify-center rounded-2xl border border-[#102A43]/20 bg-[#102A43]/5 p-3.5 text-center shadow-2xs transition hover:border-[#102A43] active:scale-98"
                    >
                        <span className="text-xs font-bold text-[#102A43]">
                            Cài đặt
                        </span>
                        <span className="mt-0.5 text-[10px] text-slate-600 font-medium">
                            Kho & Nhân sự
                        </span>
                    </Link>
                )}
            </div>

            {/* 4 KPI Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* KPI 1: Active Sessions */}
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Phiên đang hoạt động
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0D9488]">
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
                                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                            {activeSessionsCount}
                        </span>
                        <Link
                            href="/sessions"
                            className="text-xs font-bold text-[#0D9488] hover:underline"
                        >
                            Xem phiên câu →
                        </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        Khách đang câu tại các chòi
                    </p>
                </Card>

                {/* KPI 2: Completed Sessions Pending Invoice */}
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Chờ lập hóa đơn
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
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
                                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                                />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black tracking-tight text-orange-600 tabular-nums">
                            {pendingInvoicesCount}
                        </span>
                        <Link
                            href="/invoices"
                            className="text-xs font-bold text-orange-700 hover:underline"
                        >
                            Tạo hóa đơn →
                        </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        Phiên đã kết thúc chưa thanh toán
                    </p>
                </Card>

                {/* KPI 3: Remaining Debt */}
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Công nợ còn lại
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#102A43]/10 text-[#102A43]">
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
                                    d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v12m0 0h19.5m0 0v-6.75A60.067 60.067 0 0 0 6 4.5H3.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
                            {formatVnd(totalRemainingDebtVnd)}
                        </span>
                        <Link
                            href="/invoices"
                            className="text-xs font-bold text-[#102A43] hover:underline"
                        >
                            Thu tiền →
                        </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        Hóa đơn nháp / thanh toán 1 phần
                    </p>
                </Card>

                {/* KPI 4: Paid Invoices */}
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Hóa đơn đã thu đủ
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0D9488]">
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
                                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                            {paidInvoicesCount}
                        </span>
                        <Link
                            href="/invoices"
                            className="text-xs font-bold text-slate-500 hover:underline"
                        >
                            Lịch sử →
                        </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        Tổng số hóa đơn trạng thái PAID
                    </p>
                </Card>
            </div>

            {/* 2 Main Sections: Recent Active Sessions & Recent Invoices */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Section: Recent Active Sessions */}
                <Card className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-4">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Phiên câu đang hoạt động ({recentActiveSessions.length})
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium">
                                5 phiên câu gần nhất đang diễn ra
                            </p>
                        </div>
                        <Link
                            href="/sessions"
                            className="text-xs font-bold text-[#0D9488] hover:underline"
                        >
                            Xem tất cả ({activeSessionsCount})
                        </Link>
                    </div>

                    {recentActiveSessions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 font-medium">
                            Hiện không có phiên câu nào đang hoạt động.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E2DDD2]">
                            {recentActiveSessions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                                >
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900">
                                                {s.customer?.name ?? "Khách vãng lai"}
                                            </span>
                                            {s.customer?.phoneNormalized && (
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    ({s.customer.phoneNormalized})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium">
                                            Gói:{" "}
                                            <span className="font-bold text-slate-800">
                                                {s.packageNameSnapshot}
                                            </span>{" "}
                                            • Chòi:{" "}
                                            <span className="font-bold text-slate-800">
                                                {s.hutLinks
                                                    .map(
                                                        (hl) =>
                                                            `${hl.hut.name} (${hl.hut.area.name})`,
                                                    )
                                                    .join(", ") || "—"}
                                            </span>
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Bắt đầu: {formatDateTime(s.startAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center sm:self-center">
                                        <Link
                                            href="/sessions"
                                            className="inline-flex h-8 items-center rounded-lg border border-[#E2DDD2] bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-[#F8F6F0]"
                                        >
                                            Chi tiết
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Right Section: Recent Invoices */}
                <Card className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-4">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-[#102A43]">
                                Hóa đơn gần đây ({recentInvoices.length})
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium">
                                5 hóa đơn tạo gần nhất của hồ câu
                            </p>
                        </div>
                        <Link
                            href="/invoices"
                            className="text-xs font-bold text-[#102A43] hover:underline"
                        >
                            Quản lý hóa đơn →
                        </Link>
                    </div>

                    {recentInvoices.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 font-medium">
                            Chưa có hóa đơn nào được tạo.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E2DDD2]">
                            {recentInvoices.map((inv) => {
                                const netPaid = inv.payments.reduce(
                                    (sum, p) =>
                                        p.direction === PaymentDirection.IN
                                            ? sum + p.amountVnd
                                            : sum - p.amountVnd,
                                    0,
                                );
                                const paidAmount = Math.max(0, netPaid);
                                const remaining = Math.max(
                                    0,
                                    inv.totalAmountVnd - paidAmount,
                                );

                                return (
                                    <div
                                        key={inv.id}
                                        className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/invoices/${inv.id}`}
                                                    className="font-mono text-xs font-bold text-[#102A43] hover:underline"
                                                >
                                                    #{inv.id.slice(0, 8)}
                                                </Link>
                                                <span className="text-xs font-bold text-slate-900">
                                                    {inv.customer?.name ??
                                                        "Khách vãng lai"}
                                                </span>
                                                <InvoiceStatusBadge status={inv.status} />
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium">
                                                Tổng:{" "}
                                                <span className="font-bold text-slate-900 tabular-nums">
                                                    {formatVnd(inv.totalAmountVnd)}
                                                </span>
                                                {remaining > 0 ? (
                                                    <span className="ml-2 font-bold text-orange-700 tabular-nums">
                                                        (Còn: {formatVnd(remaining)})
                                                    </span>
                                                ) : (
                                                    <span className="ml-2 font-bold text-[#0D9488]">
                                                        (Đã thu đủ)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                Ngày: {formatDateTime(inv.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center sm:self-center">
                                            <Link
                                                href={`/invoices/${inv.id}`}
                                                className="inline-flex h-8 items-center rounded-lg border border-[#E2DDD2] bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-[#F8F6F0]"
                                            >
                                                Xem HĐ
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </main>
    );
}
