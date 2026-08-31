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

import { CreateInvoiceButton } from "./create-invoice-button";
import { PaymentHistory } from "./payment-history";
import { RecordPaymentButton } from "./record-payment-button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/ui/badge";

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

export default async function InvoicesPage() {
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

    const canManageInvoices =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    const canReversePayments =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    // Fetch invoices for current tenant including all payments
    const invoices = await prisma.invoice.findMany({
        where: {
            lakeId: tenantContext.lakeId,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    phoneNormalized: true,
                },
            },
            fishingSession: {
                select: {
                    id: true,
                    startAt: true,
                    endedAt: true,
                    packageNameSnapshot: true,
                    packagePriceVndSnapshot: true,
                },
            },
            lines: {
                select: {
                    id: true,
                    name: true,
                    unitPrice: true,
                    quantity: true,
                    totalVnd: true,
                },
            },
            payments: {
                where: {
                    lakeId: tenantContext.lakeId,
                },
                select: {
                    id: true,
                    amountVnd: true,
                    method: true,
                    direction: true,
                    reversalOfId: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Fetch COMPLETED fishing sessions without an invoice
    const pendingSessions = await prisma.fishingSession.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            status: SessionStatus.COMPLETED,
            invoices: {
                none: {},
            },
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    phoneNormalized: true,
                },
            },
            package: {
                select: {
                    id: true,
                    name: true,
                    priceVnd: true,
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
            endedAt: "desc",
        },
    });

    return (
        <main className="mx-auto min-h-screen max-w-5xl bg-[#F8F6F0] px-4 pb-24 pt-6">
            <PageHeader
                title="Bán hàng & Hóa đơn"
                subtitle={`Hồ: ${tenantContext.lakeName}`}
            />

            {/* Section 1: Sessions pending invoice creation */}
            {pendingSessions.length > 0 && (
                <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-orange-200/80 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-800">
                                {pendingSessions.length}
                            </span>
                            <h2 className="text-sm font-bold text-orange-950">
                                Phiên câu đã kết thúc cần lập hóa đơn
                            </h2>
                        </div>
                    </div>

                    <div className="mt-3 space-y-3">
                        {pendingSessions.map((sessionItem) => (
                            <div
                                key={sessionItem.id}
                                className="flex flex-col justify-between gap-3 rounded-xl border border-orange-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900">
                                            {sessionItem.package.name}
                                        </span>
                                        <span className="text-xs font-extrabold text-[#0D9488] tabular-nums">
                                            {formatVnd(
                                                sessionItem.packagePriceVndSnapshot ??
                                                    sessionItem.package.priceVnd,
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        Khách:{" "}
                                        <span className="font-semibold text-slate-800">
                                            {sessionItem.customer?.name ??
                                                "Khách vãng lai"}
                                        </span>
                                        {" • "}
                                        Chòi:{" "}
                                        <span className="font-semibold text-slate-800">
                                            {sessionItem.hutLinks
                                                .map(
                                                    (hl) =>
                                                        `${hl.hut.name} (${hl.hut.area.name})`,
                                                )
                                                .join(", ") || "—"}
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        Kết thúc:{" "}
                                        {formatDateTime(sessionItem.endedAt)}
                                    </p>
                                </div>

                                {canManageInvoices && (
                                    <CreateInvoiceButton
                                        fishingSessionId={sessionItem.id}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Section 2: Invoices list */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-[#102A43]">
                            Danh sách hóa đơn ({invoices.length})
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                            Tất cả hóa đơn và tiến độ thanh toán của hồ câu.
                        </p>
                    </div>
                </div>

                {invoices.length === 0 ? (
                    <Card className="p-8 text-center text-sm text-slate-500">
                        Chưa có hóa đơn nào được tạo.
                    </Card>
                ) : (
                    <>
                        {/* Mobile View: Cards */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {invoices.map((invoice) => {
                                const netPaid = invoice.payments.reduce(
                                    (sum, p) =>
                                        p.direction === PaymentDirection.IN
                                            ? sum + p.amountVnd
                                            : sum - p.amountVnd,
                                    0,
                                );
                                const paidAmount = Math.max(0, netPaid);
                                const remaining = Math.max(
                                    0,
                                    invoice.totalAmountVnd - paidAmount,
                                );
                                const isPayable =
                                    (invoice.status === InvoiceStatus.DRAFT ||
                                        invoice.status ===
                                            InvoiceStatus.PARTIALLY_PAID) &&
                                    remaining > 0;

                                return (
                                    <Card
                                        key={invoice.id}
                                        className="space-y-3 p-4 hover:border-slate-300 transition-all"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <Link
                                                    href={`/invoices/${invoice.id}`}
                                                    className="text-xs font-bold text-[#102A43] hover:underline"
                                                >
                                                    HĐ #{invoice.id.slice(0, 8)}
                                                </Link>
                                                <p className="text-sm font-bold text-slate-900 mt-0.5">
                                                    {invoice.customer?.name ?? "Khách vãng lai"}
                                                </p>
                                                {invoice.customer?.phoneNormalized && (
                                                    <p className="text-[11px] text-slate-400 font-mono">
                                                        {invoice.customer.phoneNormalized}
                                                    </p>
                                                )}
                                            </div>
                                            <InvoiceStatusBadge status={invoice.status} />
                                        </div>

                                        <div className="rounded-xl bg-[#F8F6F0] p-3 space-y-1.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Tổng tiền:</span>
                                                <span className="font-extrabold text-slate-900 tabular-nums">
                                                    {formatVnd(invoice.totalAmountVnd)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Đã thu:</span>
                                                <span className="font-bold text-[#0D9488] tabular-nums">
                                                    {formatVnd(paidAmount)}
                                                </span>
                                            </div>
                                            {remaining > 0 && (
                                                <div className="flex justify-between border-t border-[#E2DDD2] pt-1 font-bold">
                                                    <span className="text-orange-700">Còn lại:</span>
                                                    <span className="text-orange-700 tabular-nums">
                                                        {formatVnd(remaining)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] text-slate-400">
                                                {formatDateTime(invoice.createdAt)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/invoices/${invoice.id}`}
                                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2DDD2] bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-[#F8F6F0]"
                                                >
                                                    Chi tiết
                                                </Link>
                                                {canManageInvoices && isPayable && (
                                                    <RecordPaymentButton
                                                        invoiceId={invoice.id}
                                                        remainingAmountVnd={remaining}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden overflow-hidden rounded-2xl border border-[#E2DDD2] bg-white shadow-xs md:block">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3.5">Mã HĐ</th>
                                        <th className="px-4 py-3.5">Khách hàng</th>
                                        <th className="px-4 py-3.5">Tổng tiền</th>
                                        <th className="px-4 py-3.5">Đã thu</th>
                                        <th className="px-4 py-3.5">Còn lại</th>
                                        <th className="px-4 py-3.5">Trạng thái</th>
                                        <th className="px-4 py-3.5">Ngày tạo</th>
                                        <th className="px-4 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DDD2]">
                                    {invoices.map((invoice) => {
                                        const netPaid = invoice.payments.reduce(
                                            (sum, p) =>
                                                p.direction === PaymentDirection.IN
                                                ? sum + p.amountVnd
                                                : sum - p.amountVnd,
                                            0,
                                        );
                                        const paidAmount = Math.max(0, netPaid);
                                        const remaining = Math.max(
                                            0,
                                            invoice.totalAmountVnd - paidAmount,
                                        );
                                        const isPayable =
                                            (invoice.status === InvoiceStatus.DRAFT ||
                                                invoice.status ===
                                                    InvoiceStatus.PARTIALLY_PAID) &&
                                            remaining > 0;

                                        return (
                                            <tr
                                                key={invoice.id}
                                                className="transition hover:bg-slate-50/60"
                                            >
                                                <td className="px-4 py-3.5 font-mono font-bold text-[#102A43] align-middle">
                                                    <Link
                                                        href={`/invoices/${invoice.id}`}
                                                        className="hover:underline"
                                                    >
                                                        #{invoice.id.slice(0, 8)}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <p className="font-bold text-slate-900">
                                                        {invoice.customer?.name ??
                                                            "Khách vãng lai"}
                                                    </p>
                                                    {invoice.customer?.phoneNormalized && (
                                                        <p className="text-[11px] text-slate-400 font-mono">
                                                            {invoice.customer.phoneNormalized}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 font-extrabold text-slate-900 tabular-nums align-middle">
                                                    {formatVnd(invoice.totalAmountVnd)}
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <p className="font-bold text-[#0D9488] tabular-nums">
                                                        {formatVnd(paidAmount)}
                                                    </p>
                                                    <PaymentHistory
                                                        payments={invoice.payments}
                                                        canReverse={canReversePayments}
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 font-bold text-orange-700 tabular-nums align-middle">
                                                    {formatVnd(remaining)}
                                                </td>
                                                <td className="px-4 py-3.5 align-middle">
                                                    <InvoiceStatusBadge status={invoice.status} />
                                                </td>
                                                <td className="px-4 py-3.5 text-[11px] text-slate-400 align-middle">
                                                    {formatDateTime(invoice.createdAt)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right align-middle">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            href={`/invoices/${invoice.id}`}
                                                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[#E2DDD2] bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-[#F8F6F0]"
                                                        >
                                                            Xem chi tiết
                                                        </Link>
                                                        {canManageInvoices && isPayable && (
                                                            <RecordPaymentButton
                                                                invoiceId={invoice.id}
                                                                remainingAmountVnd={remaining}
                                                                size="sm"
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            <MobileBottomNav />
        </main>
    );
}
