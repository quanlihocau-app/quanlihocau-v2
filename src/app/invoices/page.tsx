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

function getStatusBadge(status: InvoiceStatus) {
    switch (status) {
        case InvoiceStatus.DRAFT:
            return (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Bản nháp (DRAFT)
                </span>
            );
        case InvoiceStatus.PAID:
            return (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Đã thanh toán (PAID)
                </span>
            );
        case InvoiceStatus.PARTIALLY_PAID:
            return (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Thanh toán 1 phần
                </span>
            );
        case InvoiceStatus.VOIDED:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                    Đã hủy (VOIDED)
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {status}
                </span>
            );
    }
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
        <main className="mx-auto min-h-screen max-w-6xl px-6 pb-24 pt-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Quản lý Hóa đơn & Thanh toán
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Hồ câu:{" "}
                        <span className="font-medium">{tenantContext.lakeName}</span>{" "}
                        | Vai trò:{" "}
                        <span className="font-medium">{tenantContext.role}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/sessions"
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Phiên câu đang mở
                    </Link>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        Bảng điều khiển
                    </Link>
                </div>
            </div>

            {/* Section 1: Completed sessions waiting for invoice */}
            <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Phiên câu đã hoàn tất chờ lập hóa đơn (
                            {pendingSessions.length})
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Các phiên câu đã kết thúc thành công và chưa được tạo hóa
                            đơn DRAFT.
                        </p>
                    </div>
                </div>

                {pendingSessions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                        Không có phiên câu nào đang chờ lập hóa đơn.
                    </div>
                ) : (
                    <div className="mt-4 divide-y divide-slate-100">
                        {pendingSessions.map((sessionItem) => (
                            <div
                                key={sessionItem.id}
                                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-900">
                                            {sessionItem.packageNameSnapshot}
                                        </span>
                                        <span className="text-xs font-medium text-emerald-600">
                                            {formatVnd(
                                                sessionItem.packagePriceVndSnapshot,
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        Khách:{" "}
                                        <span className="font-medium">
                                            {sessionItem.customer?.name ??
                                                "Khách vãng lai"}
                                        </span>
                                        {sessionItem.customer?.phoneNormalized && (
                                            <span className="text-slate-400">
                                                {" "}
                                                (
                                                {
                                                    sessionItem.customer
                                                        .phoneNormalized
                                                }
                                                )
                                            </span>
                                        )}
                                        {" • "}
                                        Chòi:{" "}
                                        <span className="font-medium">
                                            {sessionItem.hutLinks
                                                .map(
                                                    (hl) =>
                                                        `${hl.hut.name} (${hl.hut.area.name})`,
                                                )
                                                .join(", ") || "—"}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Bắt đầu: {formatDateTime(sessionItem.startAt)}{" "}
                                        • Kết thúc:{" "}
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
                )}
            </section>

            {/* Section 2: Invoices list */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Danh sách hóa đơn ({invoices.length})
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Tất cả hóa đơn và tiến độ thanh toán của hồ câu này.
                        </p>
                    </div>
                </div>

                {invoices.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                        Chưa có hóa đơn nào được tạo.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Mã HĐ</th>
                                    <th className="px-4 py-3">Khách hàng</th>
                                    <th className="px-4 py-3">Chi tiết mục gói</th>
                                    <th className="px-4 py-3">Tổng tiền</th>
                                    <th className="px-4 py-3">Đã thu</th>
                                    <th className="px-4 py-3">Còn lại</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Ngày tạo</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                                            className="transition hover:bg-slate-50/50"
                                        >
                                            <td className="px-4 py-3.5 font-mono text-xs text-slate-500 align-top">
                                                <Link
                                                    href={`/invoices/${invoice.id}`}
                                                    className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                                                    title="Xem chi tiết hóa đơn"
                                                >
                                                    {invoice.id.slice(0, 8)}...
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 align-top">
                                                <p className="font-medium text-slate-900">
                                                    {invoice.customer?.name ??
                                                        "Khách vãng lai"}
                                                </p>
                                                {invoice.customer
                                                    ?.phoneNormalized && (
                                                    <p className="text-xs text-slate-400">
                                                        {
                                                            invoice.customer
                                                                .phoneNormalized
                                                        }
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-top">
                                                {invoice.lines.length > 0 ? (
                                                    <ul className="space-y-0.5 text-xs">
                                                        {invoice.lines.map((line) => (
                                                            <li key={line.id}>
                                                                <span className="font-medium text-slate-800">
                                                                    {line.name}
                                                                </span>{" "}
                                                                <span className="text-slate-400">
                                                                    x
                                                                    {line.quantity.toString()}{" "}
                                                                    (
                                                                    {formatVnd(
                                                                        line.unitPrice,
                                                                    )}
                                                                    )
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-slate-900 align-top">
                                                {formatVnd(invoice.totalAmountVnd)}
                                            </td>
                                            <td className="px-4 py-3.5 align-top">
                                                <p className="font-medium text-emerald-600">
                                                    {formatVnd(paidAmount)}
                                                </p>
                                                <PaymentHistory
                                                    payments={invoice.payments}
                                                    canReverse={canReversePayments}
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 font-medium text-amber-600 align-top">
                                                {formatVnd(
                                                    remaining > 0 ? remaining : 0,
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-top">
                                                {getStatusBadge(invoice.status)}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-500 align-top">
                                                {formatDateTime(invoice.createdAt)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/invoices/${invoice.id}`}
                                                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                                                    >
                                                        Xem chi tiết
                                                    </Link>
                                                    {canManageInvoices && isPayable && (
                                                        <RecordPaymentButton
                                                            invoiceId={invoice.id}
                                                            remainingAmountVnd={
                                                                remaining
                                                            }
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
                )}
            </section>

            <MobileBottomNav />
        </main>
    );
}
