import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";

const querySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày bắt đầu YYYY-MM-DD không đúng."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày kết thúc YYYY-MM-DD không đúng."),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_REPORTS");
        const lakeId = tenantContext.lakeId;

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
            from: url.searchParams.get("from") || "",
            to: url.searchParams.get("to") || "",
        });

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        }

        const { from, to } = parsed.data;

        const currentStart = new Date(`${from}T00:00:00+07:00`);
        const currentEnd = new Date(`${to}T23:59:59.999+07:00`);

        // Tính khoảng thời gian tương ứng của kỳ trước (Previous Period) để so sánh tăng/giảm %
        const durationMs = currentEnd.getTime() - currentStart.getTime();
        const prevEnd = new Date(currentStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);

        // 1. Dữ liệu kỳ hiện tại
        const [
            receiptsAgg,
            expensesAgg,
            invoicesList,
            debtsReceivableAgg,
            debtsPayableAgg,
            accountsList,
            categoriesList,
        ] = await Promise.all([
            // Tổng thực thu trong kỳ
            prisma.financialTransaction.aggregate({
                where: {
                    lakeId,
                    type: "RECEIPT",
                    status: "APPROVED",
                    transactionDate: { gte: currentStart, lte: currentEnd },
                },
                _sum: { amountVnd: true },
            }),
            // Tổng thực chi trong kỳ
            prisma.financialTransaction.aggregate({
                where: {
                    lakeId,
                    type: "EXPENSE",
                    status: "APPROVED",
                    transactionDate: { gte: currentStart, lte: currentEnd },
                },
                _sum: { amountVnd: true },
            }),
            // Doanh thu bán hàng / vé câu / dịch vụ
            prisma.invoice.findMany({
                where: {
                    lakeId,
                    createdAt: { gte: currentStart, lte: currentEnd },
                    status: { not: "VOIDED" },
                },
                include: {
                    lines: true,
                },
            }),
            // Công nợ phải thu (khách còn nợ)
            prisma.debt.aggregate({
                where: {
                    lakeId,
                    type: "RECEIVABLE",
                    status: { notIn: ["SETTLED", "CANCELLED"] },
                },
                _sum: { remainingAmountVnd: true },
            }),
            // Công nợ phải trả (hồ còn nợ ncc)
            prisma.debt.aggregate({
                where: {
                    lakeId,
                    type: "PAYABLE",
                    status: { notIn: ["SETTLED", "CANCELLED"] },
                },
                _sum: { remainingAmountVnd: true },
            }),
            // Danh sách quỹ và số dư hiện tại
            prisma.financialAccount.findMany({
                where: { lakeId, isActive: true },
                select: { id: true, name: true, accountType: true, initialBalanceVnd: true },
            }),
            // Danh sách danh mục
            prisma.financialCategory.findMany({
                where: { lakeId },
                select: { id: true, name: true, type: true, color: true, icon: true },
            }),
        ]);

        // 2. Dữ liệu kỳ trước để so sánh %
        const [prevReceiptsAgg, prevExpensesAgg, prevInvoicesList] = await Promise.all([
            prisma.financialTransaction.aggregate({
                where: {
                    lakeId,
                    type: "RECEIPT",
                    status: "APPROVED",
                    transactionDate: { gte: prevStart, lte: prevEnd },
                },
                _sum: { amountVnd: true },
            }),
            prisma.financialTransaction.aggregate({
                where: {
                    lakeId,
                    type: "EXPENSE",
                    status: "APPROVED",
                    transactionDate: { gte: prevStart, lte: prevEnd },
                },
                _sum: { amountVnd: true },
            }),
            prisma.invoice.findMany({
                where: {
                    lakeId,
                    createdAt: { gte: prevStart, lte: prevEnd },
                    status: { not: "VOIDED" },
                },
                select: { totalAmountVnd: true },
            }),
        ]);

        // Tính tổng doanh thu ghi nhận từ hóa đơn (Invoiced Revenue)
        const totalRevenueVnd = invoicesList.reduce((sum, inv) => sum + inv.totalAmountVnd, 0);
        const prevRevenueVnd = prevInvoicesList.reduce((sum, inv) => sum + inv.totalAmountVnd, 0);

        const totalReceiptsVnd = receiptsAgg._sum.amountVnd || 0;
        const totalExpensesVnd = expensesAgg._sum.amountVnd || 0;
        const netCashFlowVnd = totalReceiptsVnd - totalExpensesVnd;

        const prevReceiptsVnd = prevReceiptsAgg._sum.amountVnd || 0;
        const prevExpensesVnd = prevExpensesAgg._sum.amountVnd || 0;
        const prevNetCashFlowVnd = prevReceiptsVnd - prevExpensesVnd;

        // Lợi nhuận ước tính = Doanh thu - Chi phí
        const estimatedProfitVnd = totalRevenueVnd - totalExpensesVnd;
        const prevEstimatedProfitVnd = prevRevenueVnd - prevExpensesVnd;

        // Hàm tính tỷ lệ % tăng/giảm an toàn
        function computeGrowth(current: number, previous: number) {
            if (previous === 0) {
                return current > 0 ? 100 : 0;
            }
            return Math.round(((current - previous) / Math.abs(previous)) * 100);
        }

        // Tính số dư thực tế các quỹ
        let totalFundBalanceVnd = 0;
        const accountsWithBalance = await Promise.all(
            accountsList.map(async (acc) => {
                const [rSum, eSum, tOutSum, tInSum] = await Promise.all([
                    prisma.financialTransaction.aggregate({
                        where: { lakeId, accountId: acc.id, type: "RECEIPT", status: "APPROVED" },
                        _sum: { amountVnd: true },
                    }),
                    prisma.financialTransaction.aggregate({
                        where: { lakeId, accountId: acc.id, type: "EXPENSE", status: "APPROVED" },
                        _sum: { amountVnd: true },
                    }),
                    prisma.fundTransfer.aggregate({
                        where: { lakeId, fromAccountId: acc.id },
                        _sum: { amountVnd: true, feeAmountVnd: true },
                    }),
                    prisma.fundTransfer.aggregate({
                        where: { lakeId, toAccountId: acc.id },
                        _sum: { amountVnd: true },
                    }),
                ]);

                const balance =
                    acc.initialBalanceVnd +
                    (rSum._sum.amountVnd || 0) -
                    (eSum._sum.amountVnd || 0) +
                    (tInSum._sum.amountVnd || 0) -
                    ((tOutSum._sum.amountVnd || 0) + (tOutSum._sum.feeAmountVnd || 0));

                totalFundBalanceVnd += balance;
                return {
                    id: acc.id,
                    name: acc.name,
                    accountType: acc.accountType,
                    balanceVnd: balance,
                };
            }),
        );

        // 3. Chuỗi thời gian (Daily Trend) cho biểu đồ
        const dailyTransactions = await prisma.financialTransaction.findMany({
            where: {
                lakeId,
                status: "APPROVED",
                transactionDate: { gte: currentStart, lte: currentEnd },
            },
            select: {
                type: true,
                amountVnd: true,
                transactionDate: true,
            },
        });

        const dailyMap = new Map<string, { date: string; receipts: number; expenses: number; net: number }>();

        // Khởi tạo các mốc ngày trong khoảng lọc
        const curDate = new Date(currentStart);
        while (curDate <= currentEnd) {
            const dateKey = curDate.toISOString().split("T")[0];
            dailyMap.set(dateKey, { date: dateKey, receipts: 0, expenses: 0, net: 0 });
            curDate.setDate(curDate.getDate() + 1);
        }

        for (const tx of dailyTransactions) {
            const dateKey = new Date(tx.transactionDate).toISOString().split("T")[0];
            const entry = dailyMap.get(dateKey) || { date: dateKey, receipts: 0, expenses: 0, net: 0 };
            if (tx.type === "RECEIPT") {
                entry.receipts += tx.amountVnd;
            } else {
                entry.expenses += tx.amountVnd;
            }
            entry.net = entry.receipts - entry.expenses;
            dailyMap.set(dateKey, entry);
        }

        const chartTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // 4. Cơ cấu chi tiêu theo danh mục (Top Expense Categories)
        const expenseCategoryAgg = await prisma.financialTransaction.groupBy({
            by: ["categoryId"],
            where: {
                lakeId,
                type: "EXPENSE",
                status: "APPROVED",
                transactionDate: { gte: currentStart, lte: currentEnd },
            },
            _sum: { amountVnd: true },
        });

        const categoryMap = new Map(categoriesList.map((c) => [c.id, c]));

        const topExpenseCategories = expenseCategoryAgg
            .map((item) => {
                const cat = item.categoryId ? categoryMap.get(item.categoryId) : null;
                return {
                    categoryId: item.categoryId,
                    name: cat?.name || "Chi khác",
                    color: cat?.color || "#ef4444",
                    totalVnd: item._sum.amountVnd || 0,
                };
            })
            .sort((a, b) => b.totalVnd - a.totalVnd);

        return NextResponse.json({
            kpis: {
                totalRevenue: {
                    valueVnd: totalRevenueVnd,
                    growthPct: computeGrowth(totalRevenueVnd, prevRevenueVnd),
                    tooltip: "Tổng giá trị ghi nhận từ vé câu, sản phẩm và dịch vụ đã phát sinh trong kỳ.",
                },
                totalExpenses: {
                    valueVnd: totalExpensesVnd,
                    growthPct: computeGrowth(totalExpensesVnd, prevExpensesVnd),
                    tooltip: "Tổng tiền đã thực chi theo các phiếu chi hợp lệ trong kỳ.",
                },
                estimatedProfit: {
                    valueVnd: estimatedProfitVnd,
                    growthPct: computeGrowth(estimatedProfitVnd, prevEstimatedProfitVnd),
                    tooltip: "Lợi nhuận ước tính = Tổng doanh thu ghi nhận - Tổng chi phí thực tế phát sinh.",
                },
                totalReceipts: {
                    valueVnd: totalReceiptsVnd,
                    growthPct: computeGrowth(totalReceiptsVnd, prevReceiptsVnd),
                    tooltip: "Tổng số tiền thực tế đã thu vào các quỹ/tài khoản ngân hàng.",
                },
                totalActualExpenses: {
                    valueVnd: totalExpensesVnd,
                    growthPct: computeGrowth(totalExpensesVnd, prevExpensesVnd),
                    tooltip: "Tổng số tiền thực tế đã xuất ra khỏi các quỹ tiền.",
                },
                netCashFlow: {
                    valueVnd: netCashFlowVnd,
                    growthPct: computeGrowth(netCashFlowVnd, prevNetCashFlowVnd),
                    tooltip: "Dòng tiền thuần = Thực thu - Thực chi trong khoảng thời gian đã chọn.",
                },
                receivableDebt: {
                    valueVnd: debtsReceivableAgg._sum.remainingAmountVnd || 0,
                    tooltip: "Tổng các khoản khách hàng còn nợ hồ tính đến hiện tại.",
                },
                payableDebt: {
                    valueVnd: debtsPayableAgg._sum.remainingAmountVnd || 0,
                    tooltip: "Tổng các khoản hồ còn nợ nhà cung cấp tính đến hiện tại.",
                },
                totalFundBalance: {
                    valueVnd: totalFundBalanceVnd,
                    tooltip: "Tổng số dư khả dụng thực tế của tất cả quỹ tiền mặt và tài khoản ngân hàng.",
                },
            },
            accounts: accountsWithBalance,
            chartTrend,
            topExpenseCategories,
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống khi tải dữ liệu tổng quan tài chính." }, { status: 500 });
    }
}
