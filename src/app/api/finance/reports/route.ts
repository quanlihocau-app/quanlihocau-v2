import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission } from "@/lib/financial/permissions";
import { csvCell } from "@/lib/finance";

const reportQuerySchema = z.object({
    type: z.enum(["pnl", "cashflow", "debt", "expense", "revenue"]),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    export: z.enum(["csv"]).optional(),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_REPORTS");
        const lakeId = tenantContext.lakeId;

        const url = new URL(request.url);
        const parsed = reportQuerySchema.safeParse({
            type: url.searchParams.get("type"),
            from: url.searchParams.get("from") || "",
            to: url.searchParams.get("to") || "",
            export: url.searchParams.get("export") || undefined,
        });

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || "Tham số báo cáo không hợp lệ." }, { status: 400 });
        }

        const { type, from, to, export: exportFormat } = parsed.data;
        const fromDate = new Date(`${from}T00:00:00+07:00`);
        const toDate = new Date(`${to}T23:59:59.999+07:00`);

        // BÁO CÁO 1: KẾT QUẢ KINH DOANH (P&L)
        if (type === "pnl") {
            const [invoices, expenses] = await Promise.all([
                prisma.invoice.findMany({
                    where: { lakeId, createdAt: { gte: fromDate, lte: toDate }, status: { not: "VOIDED" } },
                    include: { lines: true },
                }),
                prisma.financialTransaction.findMany({
                    where: { lakeId, type: "EXPENSE", status: "APPROVED", transactionDate: { gte: fromDate, lte: toDate } },
                    include: { category: true },
                }),
            ]);

            let ticketRevenue = 0;
            let productRevenue = 0;
            let otherRevenue = 0;
            let discounts = 0;

            for (const inv of invoices) {
                discounts += inv.discountAmountVnd || 0;
                for (const line of inv.lines) {
                    if (line.fishBuybackId) continue;
                    if (line.productId) productRevenue += line.totalVnd;
                    else if (inv.fishingSessionId) ticketRevenue += line.totalVnd;
                    else otherRevenue += line.totalVnd;
                }
            }

            const totalRevenue = ticketRevenue + productRevenue + otherRevenue - discounts;

            // Gom nhóm chi phí theo danh mục
            const expenseMap = new Map<string, number>();
            let totalExpense = 0;
            for (const exp of expenses) {
                const catName = exp.category?.name || "Chi khác";
                const current = expenseMap.get(catName) || 0;
                expenseMap.set(catName, current + exp.amountVnd);
                totalExpense += exp.amountVnd;
            }

            const expenseBreakdown = Array.from(expenseMap.entries()).map(([name, amountVnd]) => ({
                name,
                amountVnd,
                ratioPct: totalExpense > 0 ? Math.round((amountVnd / totalExpense) * 100) : 0,
            }));

            const estimatedProfit = totalRevenue - totalExpense;

            if (exportFormat === "csv") {
                const rows: (string | number)[][] = [
                    ["BÁO CÁO KẾT QUẢ KINH DOANH ƯỚC TÍNH", `Kỳ: ${from} đến ${to}`, ""],
                    ["Khoản mục", "Số tiền (VNĐ)", "Tỷ trọng"],
                    ["1. DOANH THU", totalRevenue, "100%"],
                    ["- Doanh thu vé câu", ticketRevenue, ""],
                    ["- Doanh thu bán hàng (mồi, f&b, phụ kiện)", productRevenue, ""],
                    ["- Doanh thu dịch vụ & thu khác", otherRevenue, ""],
                    ["- Các khoản giảm trừ", -discounts, ""],
                    ["2. CHI PHÍ HOẠT ĐỘNG", totalExpense, "100%"],
                    ...expenseBreakdown.map((e) => [`- ${e.name}`, e.amountVnd, `${e.ratioPct}%`]),
                    ["3. LỢI NHUẬN ƯỚC TÍNH", estimatedProfit, ""],
                ];

                return new NextResponse("\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), {
                    headers: {
                        "Content-Type": "text/csv; charset=utf-8",
                        "Content-Disposition": `attachment; filename="bao-cao-kqkd-${from}-${to}.csv"`,
                        "Cache-Control": "no-store",
                    },
                });
            }

            return NextResponse.json({
                period: { from, to },
                revenue: {
                    ticketRevenue,
                    productRevenue,
                    otherRevenue,
                    discounts,
                    totalRevenue,
                },
                expenses: {
                    breakdown: expenseBreakdown,
                    totalExpense,
                },
                estimatedProfit,
            });
        }

        // BÁO CÁO 2: DÒNG TIỀN (CASH FLOW)
        if (type === "cashflow") {
            const [receiptsBefore, expensesBefore, receiptsIn, expensesIn] = await Promise.all([
                // Tiền vào trước kỳ
                prisma.financialTransaction.aggregate({
                    where: { lakeId, type: "RECEIPT", status: "APPROVED", transactionDate: { lt: fromDate } },
                    _sum: { amountVnd: true },
                }),
                // Tiền ra trước kỳ
                prisma.financialTransaction.aggregate({
                    where: { lakeId, type: "EXPENSE", status: "APPROVED", transactionDate: { lt: fromDate } },
                    _sum: { amountVnd: true },
                }),
                // Tiền vào trong kỳ
                prisma.financialTransaction.aggregate({
                    where: { lakeId, type: "RECEIPT", status: "APPROVED", transactionDate: { gte: fromDate, lte: toDate } },
                    _sum: { amountVnd: true },
                }),
                // Tiền ra trong kỳ
                prisma.financialTransaction.aggregate({
                    where: { lakeId, type: "EXPENSE", status: "APPROVED", transactionDate: { gte: fromDate, lte: toDate } },
                    _sum: { amountVnd: true },
                }),
            ]);

            // Tổng số dư đầu kỳ của tất cả các quỹ
            const accounts = await prisma.financialAccount.findMany({
                where: { lakeId, isActive: true },
                select: { initialBalanceVnd: true },
            });
            const allInitialBalance = accounts.reduce((s, a) => s + a.initialBalanceVnd, 0);

            const beginningBalance =
                allInitialBalance + (receiptsBefore._sum.amountVnd || 0) - (expensesBefore._sum.amountVnd || 0);
            const totalCashIn = receiptsIn._sum.amountVnd || 0;
            const totalCashOut = expensesIn._sum.amountVnd || 0;
            const netCashFlow = totalCashIn - totalCashOut;
            const endingBalance = beginningBalance + netCashFlow;

            if (exportFormat === "csv") {
                const rows: (string | number)[][] = [
                    ["BÁO CÁO LƯU CHUYỂN TIỀN TỆ (DÒNG TIỀN)", `Kỳ: ${from} đến ${to}`],
                    ["Chỉ tiêu", "Số tiền (VNĐ)"],
                    ["1. Số dư tiền đầu kỳ", beginningBalance],
                    ["2. Tiền thu trong kỳ", totalCashIn],
                    ["3. Tiền chi trong kỳ", totalCashOut],
                    ["4. Lưu chuyển tiền thuần (Dòng tiền ròng)", netCashFlow],
                    ["5. Số dư tiền cuối kỳ", endingBalance],
                ];

                return new NextResponse("\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), {
                    headers: {
                        "Content-Type": "text/csv; charset=utf-8",
                        "Content-Disposition": `attachment; filename="bao-cao-dong-tien-${from}-${to}.csv"`,
                        "Cache-Control": "no-store",
                    },
                });
            }

            return NextResponse.json({
                period: { from, to },
                beginningBalance,
                totalCashIn,
                totalCashOut,
                netCashFlow,
                endingBalance,
            });
        }

        // BÁO CÁO 3: CÔNG NỢ & TUỔI NỢ
        if (type === "debt") {
            const debts = await prisma.debt.findMany({
                where: {
                    lakeId,
                    status: { notIn: ["SETTLED", "CANCELLED"] },
                },
                include: { customer: true },
                orderBy: { dueDate: "asc" },
            });

            const now = new Date();
            const categorized = debts.map((d) => {
                let ageCategory = "Trong hạn";
                if (d.dueDate && new Date(d.dueDate) < now) {
                    const daysOver = Math.floor((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    ageCategory = daysOver <= 30 ? "Quá hạn ≤ 30 ngày" : "Quá hạn > 30 ngày";
                }
                return {
                    id: d.id,
                    code: d.code,
                    type: d.type,
                    title: d.title,
                    debtor: d.customer?.name || d.supplierName || "Đối tác",
                    totalAmountVnd: d.totalAmountVnd,
                    paidAmountVnd: d.paidAmountVnd,
                    remainingAmountVnd: d.remainingAmountVnd,
                    dueDate: d.dueDate ? d.dueDate.toISOString().split("T")[0] : null,
                    ageCategory,
                };
            });

            if (exportFormat === "csv") {
                const rows: (string | number)[][] = [
                    ["BÁO CÁO CÔNG NỢ & TUỔI NỢ", `Xuất lúc: ${now.toLocaleString("vi-VN")}`],
                    ["Mã nợ", "Loại", "Đối tượng", "Nội dung", "Tổng tiền", "Đã trả", "Còn nợ", "Hạn thanh toán", "Tuổi nợ"],
                    ...categorized.map((d) => [
                        d.code,
                        d.type === "RECEIVABLE" ? "Phải thu" : "Phải trả",
                        d.debtor,
                        d.title,
                        d.totalAmountVnd,
                        d.paidAmountVnd,
                        d.remainingAmountVnd,
                        d.dueDate || "Không có",
                        d.ageCategory,
                    ]),
                ];

                return new NextResponse("\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), {
                    headers: {
                        "Content-Type": "text/csv; charset=utf-8",
                        "Content-Disposition": `attachment; filename="bao-cao-cong-no.csv"`,
                        "Cache-Control": "no-store",
                    },
                });
            }

            return NextResponse.json({ debts: categorized });
        }

        return NextResponse.json({ error: "Loại báo cáo không hợp lệ." }, { status: 400 });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi khi tạo báo cáo tài chính." }, { status: 500 });
    }
}
