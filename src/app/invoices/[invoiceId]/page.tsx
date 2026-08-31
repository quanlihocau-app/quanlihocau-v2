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
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/ui/badge";

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
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(date));
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
                <Card className="w-full p-8 text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
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
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            Không tìm thấy hóa đơn
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 font-medium">
                            Hóa đơn không tồn tại hoặc bạn không có quyền truy cập hóa đơn thuộc hồ câu này.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Link
                            href="/invoices"
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#102A43] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E3A5F]"
                        >
                            Quay lại danh sách hóa đơn
                        </Link>
                    </div>
                </Card>
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
        <div className="min-h-screen bg-[#F8F6F0] py-6 pb-24 print:bg-white print:py-0">
            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
                {/* Navigation and Actions - Hidden when printing */}
                <div className="print:hidden">
                    <PageHeader
                        title={getInvoiceTitle(invoice.status)}
                        subtitle={`Hồ câu: ${tenantContext.lakeName}`}
                        backHref="/invoices"
                        backLabel="Danh sách hóa đơn"
                        badge={<InvoiceStatusBadge status={invoice.status} />}
                        action={<PrintReceiptButton />}
                    />
                </div>

                {/* Printable Invoice Card Body */}
                <Card className="p-6 sm:p-8 print:border-none print:shadow-none print:p-0 space-y-6">
                    {/* Hồ & Thông tin cơ bản */}
                    <div className="flex flex-col justify-between gap-4 border-b border-[#E2DDD2] pb-6 sm:flex-row sm:items-start">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#102A43]">
                                {tenantContext.organizationName}
                            </span>
                            <h1 className="text-xl font-black text-[#102A43] sm:text-2xl mt-0.5">
                                {tenantContext.lakeName}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Mã hóa đơn: <span className="font-mono font-bold text-slate-700">{invoice.id}</span>
                            </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                            <div className="text-xs text-slate-500 font-medium">
                                Ngày tạo: <span className="font-bold text-slate-800">{formatDateTime(invoice.createdAt)}</span>
                            </div>
                            <div className="mt-2">
                                <InvoiceStatusBadge status={invoice.status} />
                            </div>
                        </div>
                    </div>

                    {/* Customer & Fishing Session Info Grid */}
                    <div className="grid grid-cols-1 gap-6 rounded-2xl bg-[#F8F6F0]/60 p-4 border border-[#E2DDD2] sm:grid-cols-2 text-xs">
                        <div className="space-y-1">
                            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                                Khách hàng
                            </span>
                            <p className="text-sm font-bold text-slate-900">
                                {invoice.customer?.name ?? "Khách vãng lai"}
                            </p>
                            {invoice.customer?.phoneNormalized && (
                                <p className="font-mono text-slate-600">
                                    {invoice.customer.phoneNormalized}
                                </p>
                            )}
                        </div>

                        {invoice.fishingSession && (
                            <div className="space-y-1">
                                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                                    Phiên câu liên kết
                                </span>
                                <p className="text-sm font-bold text-slate-900">
                                    {invoice.fishingSession.packageNameSnapshot}
                                </p>
                                <p className="text-slate-600 font-medium">
                                    Chòi:{" "}
                                    <span className="font-bold text-slate-800">
                                        {invoice.fishingSession.hutLinks
                                            .map(
                                                (hl) =>
                                                    `${hl.hut.name} (${hl.hut.area.name})`,
                                            )
                                            .join(", ") || "—"}
                                    </span>
                                </p>
                                <p className="text-slate-500 font-mono text-[11px]">
                                    {formatDateTime(invoice.fishingSession.startAt)} →{" "}
                                    {formatDateTime(invoice.fishingSession.endedAt)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Line Items Section */}
                    <div>
                        <InvoiceLinesSection
                            invoiceId={invoice.id}
                            isDraft={isDraft}
                            lines={safeLines}
                            availableProducts={availableProducts}
                        />
                    </div>

                    {/* Financial Summary */}
                    <div className="border-t border-[#E2DDD2] pt-4">
                        <div className="flex flex-col items-end">
                            <div className="w-full space-y-2 text-xs sm:w-72">
                                <div className="flex justify-between text-slate-600 font-medium">
                                    <span>Tổng hóa đơn:</span>
                                    <span className="font-bold text-slate-900 tabular-nums text-sm">
                                        {formatVnd(invoice.totalAmountVnd)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[#0D9488] font-medium">
                                    <span>Đã thu (số ròng):</span>
                                    <span className="font-bold tabular-nums">
                                        {formatVnd(paidAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-[#E2DDD2] pt-2 text-sm font-black text-slate-900">
                                    <span>Còn lại:</span>
                                    <span className={`tabular-nums ${remaining > 0 ? "text-orange-700" : "text-[#0D9488]"}`}>
                                        {formatVnd(remaining)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Transactions History */}
                    <div className="border-t border-[#E2DDD2] pt-6 space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Lịch sử giao dịch thanh toán ({invoice.payments.length})
                        </h2>
                        {invoice.payments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic font-medium">
                                Chưa có giao dịch thanh toán nào được ghi nhận.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-[#E2DDD2] bg-white">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="border-b border-[#E2DDD2] bg-[#F8F6F0] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Loại giao dịch</th>
                                            <th className="px-3.5 py-2.5">Phương thức</th>
                                            <th className="px-3.5 py-2.5 text-right">Số tiền</th>
                                            <th className="px-3.5 py-2.5">Thời gian</th>
                                            <th className="px-3.5 py-2.5">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2DDD2]">
                                        {invoice.payments.map((payment) => {
                                            const isReversal =
                                                payment.direction ===
                                                    PaymentDirection.OUT ||
                                                Boolean(payment.reversalOfId);

                                            return (
                                                <tr key={payment.id} className="hover:bg-[#F8F6F0]/60 transition-colors">
                                                    <td className="px-3.5 py-2.5 font-bold">
                                                        {isReversal ? (
                                                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-red-700 border border-red-200">
                                                                Chi ra (Hoàn tác)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[#0D9488] border border-teal-200">
                                                                Thu vào (IN)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 font-medium">
                                                        {getPaymentMethodLabel(payment.method)}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-right font-extrabold tabular-nums">
                                                        {isReversal ? (
                                                            <span className="text-red-600">
                                                                -{formatVnd(payment.amountVnd)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#0D9488]">
                                                                +{formatVnd(payment.amountVnd)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-500">
                                                        {formatDateTime(payment.createdAt)}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-400 font-mono text-[11px]">
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
                            <p className="font-bold uppercase text-slate-700">Người in phiếu</p>
                            <p className="mt-1 text-[11px] text-slate-400 font-medium">(Ký và ghi rõ họ tên)</p>
                            <div className="mt-16 text-slate-800 font-bold">{tenantContext.userName}</div>
                        </div>
                        <div>
                            <p className="font-bold uppercase text-slate-700">Khách hàng</p>
                            <p className="mt-1 text-[11px] text-slate-400 font-medium">(Ký và ghi rõ họ tên)</p>
                            <div className="mt-16 text-slate-800 font-bold">
                                {invoice.customer?.name ?? "Khách hàng"}
                            </div>
                        </div>
                    </div>
                </Card>
            </main>
        </div>
    );
}
