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
    }).format(new Date(date));
}

function getInvoiceStatusBadge(status: InvoiceStatus) {
    switch (status) {
        case InvoiceStatus.DRAFT:
            return (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Bản nháp
                </span>
            );
        case InvoiceStatus.PAID:
            return (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Đã thanh toán
                </span>
            );
        case InvoiceStatus.PARTIALLY_PAID:
            return (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Thanh toán 1 phần
                </span>
            );
        case InvoiceStatus.VOIDED:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                    Đã hủy
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {status}
                </span>
            );
    }
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
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header with Lake & User Info */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Bảng điều khiển vận hành
                        </h1>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {tenantContext.lakeName}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                        Đơn vị:{" "}
                        <span className="font-medium text-slate-800">
                            {tenantContext.organizationName}
                        </span>{" "}
                        • Đang đăng nhập:{" "}
                        <span className="font-medium text-slate-800">
                            {tenantContext.userName}
                        </span>{" "}
                        ({tenantContext.role})
                    </p>
                </div>

                {/* Primary Action */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/sessions/new"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800"
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
                </div>
            </div>

            {/* Navigation Quick Links */}
            <div
                className={`mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
                    tenantContext.role === Role.OWNER
                        ? "xl:grid-cols-10"
                        : "xl:grid-cols-9"
                }`}
            >
                <Link
                    href="/sessions"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Phiên câu
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Quản lý phiên câu
                    </span>
                </Link>

                <Link
                    href="/invoices"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Hóa đơn
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Thu & Hoàn tiền
                    </span>
                </Link>

                <Link
                    href="/customers"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Khách hàng
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Danh bạ khách
                    </span>
                </Link>

                <Link
                    href="/facilities"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Chòi & Khu vực
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Sơ đồ hồ câu
                    </span>
                </Link>

                <Link
                    href="/pricing"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Bảng giá gói
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Cấu hình giá câu
                    </span>
                </Link>

                <Link
                    href="/products"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Sản phẩm
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Danh mục & Giá
                    </span>
                </Link>

                <Link
                    href="/inventory"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Kho hàng
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Nhập / Xuất kho
                    </span>
                </Link>

                <Link
                    href="/fish-types"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Loại cá
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Giá thu mua
                    </span>
                </Link>

                <Link
                    href="/fish-buybacks"
                    className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                    <span className="text-sm font-semibold text-slate-900">
                        Thu mua cá
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500">
                        Sổ cân & Tiền cá
                    </span>
                </Link>

                {tenantContext.role === Role.OWNER && (
                    <Link
                        href="/settings/members"
                        className="flex flex-col items-center justify-center rounded-xl border border-purple-200 bg-purple-50/40 p-3 text-center shadow-sm transition hover:border-purple-500 hover:bg-purple-100/60"
                    >
                        <span className="text-sm font-semibold text-purple-900">
                            Nhân sự
                        </span>
                        <span className="mt-0.5 text-xs text-purple-700">
                            Quản lý nhân viên
                        </span>
                    </Link>
                )}

                <Link
                    href="/sessions/new"
                    className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center shadow-sm transition hover:border-emerald-500 hover:bg-emerald-100/60"
                >
                    <span className="text-sm font-semibold text-emerald-900">
                        + Tạo phiên
                    </span>
                    <span className="mt-0.5 text-xs text-emerald-700">
                        Check-in chòi
                    </span>
                </Link>
            </div>

            {/* 4 KPI Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* KPI 1: Active Sessions */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Phiên đang hoạt động
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
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
                        <span className="text-3xl font-bold tracking-tight text-slate-900">
                            {activeSessionsCount}
                        </span>
                        <Link
                            href="/sessions"
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                            Xem phiên câu →
                        </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Khách đang câu tại các chòi
                    </p>
                </div>

                {/* KPI 2: Completed Sessions Pending Invoice */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Chờ lập hóa đơn
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
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
                        <span className="text-3xl font-bold tracking-tight text-amber-600">
                            {pendingInvoicesCount}
                        </span>
                        <Link
                            href="/invoices"
                            className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
                        >
                            Tạo hóa đơn →
                        </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Phiên đã kết thúc chưa thanh toán
                    </p>
                </div>

                {/* KPI 3: Remaining Debt */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Công nợ còn lại
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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
                        <span className="text-2xl font-bold tracking-tight text-slate-900">
                            {formatVnd(totalRemainingDebtVnd)}
                        </span>
                        <Link
                            href="/invoices"
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Thu tiền →
                        </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Hóa đơn nháp / thanh toán 1 phần
                    </p>
                </div>

                {/* KPI 4: Paid Invoices */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Hóa đơn đã thu đủ
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
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
                        <span className="text-3xl font-bold tracking-tight text-slate-900">
                            {paidInvoicesCount}
                        </span>
                        <Link
                            href="/invoices"
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                        >
                            Lịch sử →
                        </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        Tổng số hóa đơn trạng thái PAID
                    </p>
                </div>
            </div>

            {/* 2 Main Sections: Recent Active Sessions & Recent Invoices */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left Section: Recent Active Sessions */}
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Phiên câu đang hoạt động ({recentActiveSessions.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                5 phiên câu gần nhất đang diễn ra
                            </p>
                        </div>
                        <Link
                            href="/sessions"
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                            Xem tất cả ({activeSessionsCount})
                        </Link>
                    </div>

                    {recentActiveSessions.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            Hiện không có phiên câu nào đang hoạt động.
                        </div>
                    ) : (
                        <div className="mt-4 divide-y divide-slate-100">
                            {recentActiveSessions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                                >
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900">
                                                {s.customer?.name ?? "Khách vãng lai"}
                                            </span>
                                            {s.customer?.phoneNormalized && (
                                                <span className="text-xs text-slate-400">
                                                    ({s.customer.phoneNormalized})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600">
                                            Gói:{" "}
                                            <span className="font-medium text-slate-800">
                                                {s.packageNameSnapshot}
                                            </span>{" "}
                                            • Chòi:{" "}
                                            <span className="font-medium text-slate-800">
                                                {s.hutLinks
                                                    .map(
                                                        (hl) =>
                                                            `${hl.hut.name} (${hl.hut.area.name})`,
                                                    )
                                                    .join(", ") || "—"}
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            Bắt đầu: {formatDateTime(s.startAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center sm:self-center">
                                        <Link
                                            href="/sessions"
                                            className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100"
                                        >
                                            Chi tiết
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Right Section: Recent Invoices */}
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Hóa đơn gần đây ({recentInvoices.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                5 hóa đơn tạo gần nhất của hồ câu
                            </p>
                        </div>
                        <Link
                            href="/invoices"
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                            Quản lý hóa đơn →
                        </Link>
                    </div>

                    {recentInvoices.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            Chưa có hóa đơn nào được tạo.
                        </div>
                    ) : (
                        <div className="mt-4 divide-y divide-slate-100">
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
                                                    className="font-mono text-xs font-semibold text-emerald-600 hover:underline"
                                                >
                                                    {inv.id.slice(0, 8)}...
                                                </Link>
                                                <span className="text-sm font-medium text-slate-900">
                                                    {inv.customer?.name ??
                                                        "Khách vãng lai"}
                                                </span>
                                                {getInvoiceStatusBadge(inv.status)}
                                            </div>
                                            <p className="text-xs text-slate-600">
                                                Tổng tiền:{" "}
                                                <span className="font-semibold text-slate-900">
                                                    {formatVnd(inv.totalAmountVnd)}
                                                </span>
                                                {remaining > 0 ? (
                                                    <span className="ml-2 font-medium text-amber-600">
                                                        (Còn lại: {formatVnd(remaining)})
                                                    </span>
                                                ) : (
                                                    <span className="ml-2 font-medium text-emerald-600">
                                                        (Đã thu đủ)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Ngày tạo: {formatDateTime(inv.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center sm:self-center">
                                            <Link
                                                href={`/invoices/${inv.id}`}
                                                className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100"
                                            >
                                                Xem HĐ
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
