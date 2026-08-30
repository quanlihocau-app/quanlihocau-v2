import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
    InvoiceStatus,
    PaymentDirection,
    PaymentMethod,
} from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { InvoiceLinesSection } from "./invoice-lines-section";
import { PrintReceiptButton } from "./print-receipt-button";

const uuidSchema = z.string().uuid();

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
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Bản nháp (DRAFT)
                </span>
            );
        case InvoiceStatus.PAID:
            return (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Đã thanh toán (PAID)
                </span>
            );
        case InvoiceStatus.PARTIALLY_PAID:
            return (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Thanh toán 1 phần
                </span>
            );
        case InvoiceStatus.VOIDED:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                    Đã hủy (VOIDED)
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {status}
                </span>
            );
    }
}

function getInvoiceTitle(status: InvoiceStatus): string {
    switch (status) {
        case InvoiceStatus.DRAFT:
            return "HÓA ĐƠN TẠM";
        case InvoiceStatus.PARTIALLY_PAID:
            return "HÓA ĐƠN / PHIẾU THU MỘT PHẦN";
        case InvoiceStatus.PAID:
            return "HÓA ĐƠN / PHIẾU THU";
        case InvoiceStatus.VOIDED:
            return "HÓA ĐƠN ĐÃ HỦY";
        default:
            return "HÓA ĐƠN / PHIẾU THU";
    }
}

function getPaymentMethodLabel(method: PaymentMethod): string {
    switch (method) {
        case PaymentMethod.CASH:
            return "Tiền mặt";
        case PaymentMethod.BANK_TRANSFER:
            return "Chuyển khoản";
        default:
            return method;
    }
}

interface InvoiceDetailPageProps {
    params: Promise<{
        invoiceId: string;
    }>;
}

export default async function InvoiceDetailPage({
    params,
}: InvoiceDetailPageProps) {
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

    const { invoiceId } = await params;
    const isValidUuid = uuidSchema.safeParse(invoiceId).success;

    const invoice = isValidUuid
        ? await prisma.invoice.findFirst({
              where: {
                  id: invoiceId,
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
                          packageDurationMinutesSnapshot: true,
                          overtimeHourlyVndSnapshot: true,
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
                  },
                  lines: {
                      select: {
                          id: true,
                          productId: true,
                          fishBuybackId: true,
                          name: true,
                          unitPrice: true,
                          quantity: true,
                          totalVnd: true,
                      },
                      orderBy: {
                          createdAt: "asc",
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
          })
        : null;

    if (!invoice) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Không tìm thấy hóa đơn
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Hóa đơn không tồn tại hoặc bạn không có quyền truy cập hóa đơn thuộc hồ câu này.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/invoices"
                            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                        >
                            Quay lại danh sách hóa đơn
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const netPaid = invoice.payments.reduce(
        (sum, p) =>
            p.direction === PaymentDirection.IN
                ? sum + p.amountVnd
                : sum - p.amountVnd,
        0,
    );
    const paidAmount = Math.max(0, netPaid);
    const remaining = Math.max(0, invoice.totalAmountVnd - paidAmount);

    // Fetch active products & their stock if invoice is DRAFT
    const isDraft = invoice.status === InvoiceStatus.DRAFT;
    let availableProducts: Array<{
        id: string;
        name: string;
        sku: string | null;
        priceVnd: number;
        currentStock: number;
    }> = [];

    if (isDraft) {
        const rawProducts = await prisma.product.findMany({
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
                sku: true,
                priceVnd: true,
            },
        });

        const productStocks = await prisma.inventoryMovement.groupBy({
            by: ["productId"],
            where: {
                lakeId: tenantContext.lakeId,
                productId: {
                    in: rawProducts.map((p) => p.id),
                },
            },
            _sum: {
                quantity: true,
            },
        });

        const stockMap = new Map<string, number>();
        for (const ps of productStocks) {
            stockMap.set(
                ps.productId,
                ps._sum.quantity ? Number(ps._sum.quantity) : 0,
            );
        }

        availableProducts = rawProducts.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            priceVnd: p.priceVnd,
            currentStock: stockMap.get(p.id) ?? 0,
        }));
    }

    const safeLines = invoice.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        fishBuybackId: l.fishBuybackId,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: Number(l.quantity),
        totalVnd: l.totalVnd,
    }));

    return (
        <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
                {/* Navigation and Actions - Hidden when printing */}
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/invoices"
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
                            <span>Danh sách hóa đơn</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <PrintReceiptButton />
                    </div>
                </div>

                {/* Printable Invoice / Receipt Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-none print:p-0 print:shadow-none">
                    {/* Header */}
                    <div className="border-b border-slate-200 pb-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div>
                                <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900 sm:text-3xl">
                                    {getInvoiceTitle(invoice.status)}
                                </h1>
                                <p className="mt-1 text-base font-semibold text-emerald-700">
                                    {tenantContext.lakeName}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Đơn vị: {tenantContext.organizationName}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <div className="inline-block">{getStatusBadge(invoice.status)}</div>
                                <p className="mt-2 font-mono text-xs text-slate-500">
                                    Mã HĐ: <span className="font-semibold text-slate-800">{invoice.id}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    Ngày tạo: {formatDateTime(invoice.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Customer and Session Information */}
                    <div className="mt-6 grid grid-cols-1 gap-6 border-b border-slate-200 pb-6 sm:grid-cols-2">
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Thông tin khách hàng
                            </h2>
                            <div className="mt-2 space-y-1 text-sm">
                                <p className="font-medium text-slate-900">
                                    {invoice.customer?.name ?? "Khách vãng lai"}
                                </p>
                                {invoice.customer?.phoneNormalized ? (
                                    <p className="text-slate-600">
                                        Số điện thoại: {invoice.customer.phoneNormalized}
                                    </p>
                                ) : (
                                    <p className="text-slate-400 italic">Không có số điện thoại</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Thông tin phiên câu
                            </h2>
                            {invoice.fishingSession ? (
                                <div className="mt-2 space-y-1 text-sm text-slate-600">
                                    <p>
                                        Gói câu:{" "}
                                        <span className="font-medium text-slate-900">
                                            {invoice.fishingSession.packageNameSnapshot}
                                        </span>{" "}
                                        ({formatVnd(invoice.fishingSession.packagePriceVndSnapshot)})
                                    </p>
                                    <p>
                                        Chòi câu:{" "}
                                        <span className="font-medium text-slate-900">
                                            {invoice.fishingSession.hutLinks
                                                .map(
                                                    (hl) =>
                                                        `${hl.hut.name} (${hl.hut.area.name})`,
                                                )
                                                .join(", ") || "—"}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Thời gian:{" "}
                                        {formatDateTime(invoice.fishingSession.startAt)} →{" "}
                                        {formatDateTime(invoice.fishingSession.endedAt)}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-slate-400 italic">
                                    Không gắn với phiên câu cụ thể
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Invoice Lines Section */}
                    <div className="mt-6">
                        <InvoiceLinesSection
                            invoiceId={invoice.id}
                            isDraft={isDraft}
                            lines={safeLines}
                            availableProducts={availableProducts}
                        />
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-6 border-t border-slate-200 pt-4">
                        <div className="flex flex-col items-end">
                            <div className="w-full space-y-2 text-sm sm:w-72">
                                <div className="flex justify-between text-slate-600">
                                    <span>Tổng hóa đơn:</span>
                                    <span className="font-semibold text-slate-900">
                                        {formatVnd(invoice.totalAmountVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-emerald-700">
                                    <span>Đã thu (số ròng):</span>
                                    <span className="font-semibold">
                                        {formatVnd(paidAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                                    <span>Còn lại:</span>
                                    <span className={remaining > 0 ? "text-amber-600" : "text-emerald-600"}>
                                        {formatVnd(remaining)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Transactions History */}
                    <div className="mt-8 border-t border-slate-200 pt-6">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Lịch sử giao dịch thanh toán ({invoice.payments.length})
                        </h2>
                        {invoice.payments.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-400 italic">
                                Chưa có giao dịch thanh toán nào được ghi nhận.
                            </p>
                        ) : (
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 print:bg-slate-100">
                                        <tr>
                                            <th className="px-3 py-2">Loại giao dịch</th>
                                            <th className="px-3 py-2">Phương thức</th>
                                            <th className="px-3 py-2 text-right">Số tiền</th>
                                            <th className="px-3 py-2">Thời gian</th>
                                            <th className="px-3 py-2">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoice.payments.map((payment) => {
                                            const isReversal =
                                                payment.direction ===
                                                    PaymentDirection.OUT ||
                                                Boolean(payment.reversalOfId);

                                            return (
                                                <tr key={payment.id}>
                                                    <td className="px-3 py-2.5">
                                                        {isReversal ? (
                                                            <span className="inline-flex items-center rounded bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                                                Chi ra (Hoàn tác)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                                Thu vào (IN)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {getPaymentMethodLabel(payment.method)}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right font-medium">
                                                        {isReversal ? (
                                                            <span className="text-red-600">
                                                                -{formatVnd(payment.amountVnd)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-600">
                                                                +{formatVnd(payment.amountVnd)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-500">
                                                        {formatDateTime(payment.createdAt)}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-400 font-mono">
                                                        {payment.reversalOfId ? (
                                                            <span>Hoàn tiền GD #{payment.reversalOfId.slice(0, 8)}</span>
                                                        ) : (
                                                            <span>GD #{payment.id.slice(0, 8)}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Receipt Signatures Area for Printing */}
                    <div className="mt-12 hidden grid-cols-2 gap-8 pt-8 text-center text-xs text-slate-600 print:grid">
                        <div>
                            <p className="font-semibold uppercase text-slate-700">Người in phiếu</p>
                            <p className="mt-1 text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                            <div className="mt-16 text-slate-800 font-medium">{tenantContext.userName}</div>
                        </div>
                        <div>
                            <p className="font-semibold uppercase text-slate-700">Khách hàng</p>
                            <p className="mt-1 text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                            <div className="mt-16 text-slate-800 font-medium">
                                {invoice.customer?.name ?? "Khách hàng"}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
