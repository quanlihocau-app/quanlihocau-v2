import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantContext, AuthenticationError, ForbiddenError } from "@/lib/tenant";
import { assertFinancialPermission, FINANCE_ROLES } from "@/lib/financial/permissions";
import { assertClientIdsInLake, publicCustomer } from "@/lib/tenant-scope";
import { generateFinancialCode } from "@/lib/financial/code-generator";
import { assertPeriodNotLocked } from "@/lib/financial/period-guard";
import { csvCell } from "@/lib/finance";
import type { Prisma } from "@/generated/prisma/client";

const createTransactionSchema = z.object({
    type: z.enum(["RECEIPT", "EXPENSE"], { message: "Loại giao dịch phải là RECEIPT (Phiếu thu) hoặc EXPENSE (Phiếu chi)." }),
    amountVnd: z.number().int().positive("Số tiền phải là số nguyên dương lớn hơn 0.").max(2147483647),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]).default("CASH"),
    categoryId: z.string().uuid("Danh mục không hợp lệ.").optional().nullable(),
    accountId: z.string().uuid("Tài khoản quỹ không hợp lệ.").optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    supplierName: z.string().trim().max(100).optional().nullable(),
    payerOrReceiver: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().min(1, "Nội dung giao dịch không được để trống.").max(255),
    note: z.string().trim().max(500).optional().nullable(),
    status: z.enum(["DRAFT", "APPROVED"]).default("APPROVED"),
    transactionDate: z.string().datetime().optional(),
    attachments: z.string().optional().nullable(), // JSON string or URLs
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_VIEW_TRANSACTIONS");
        const lakeId = tenantContext.lakeId;

        const url = new URL(request.url);
        const type = url.searchParams.get("type"); // RECEIPT | EXPENSE | null
        const status = url.searchParams.get("status");
        const categoryId = url.searchParams.get("categoryId");
        const accountId = url.searchParams.get("accountId");
        const customerId = url.searchParams.get("customerId");
        const q = url.searchParams.get("q")?.trim();
        const fromDateStr = url.searchParams.get("from");
        const toDateStr = url.searchParams.get("to");
        const isExport = url.searchParams.get("export") === "csv";
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = isExport ? 10000 : 30;

        const where: Prisma.FinancialTransactionWhereInput = { lakeId };

        if (type === "RECEIPT" || type === "EXPENSE") {
            where.type = type;
        }
        if (status) {
            if (status === "DRAFT" || status === "APPROVED" || status === "CANCELLED") {
                where.status = status;
            }
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (accountId) {
            where.accountId = accountId;
        }
        if (customerId) {
            where.customerId = customerId;
        }
        if (fromDateStr || toDateStr) {
            where.transactionDate = {};
            if (fromDateStr) {
                where.transactionDate.gte = new Date(`${fromDateStr}T00:00:00+07:00`);
            }
            if (toDateStr) {
                where.transactionDate.lte = new Date(`${toDateStr}T23:59:59.999+07:00`);
            }
        }
        if (q) {
            where.OR = [
                { code: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { payerOrReceiver: { contains: q, mode: "insensitive" } },
                { supplierName: { contains: q, mode: "insensitive" } },
            ];
        }

        const [total, transactions, summaryReceipts, summaryExpenses] = await Promise.all([
            prisma.financialTransaction.count({ where }),
            prisma.financialTransaction.findMany({
                where,
                orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
                skip: isExport ? 0 : (page - 1) * limit,
                take: limit,
                include: {
                    category: { select: { id: true, name: true, color: true, icon: true } },
                    account: { select: { id: true, name: true, accountType: true } },
                    customer: { select: { id: true, name: true, phoneNormalized: true, lakeId: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            }),
            prisma.financialTransaction.aggregate({
                where: { ...where, type: "RECEIPT", status: "APPROVED" },
                _sum: { amountVnd: true },
            }),
            prisma.financialTransaction.aggregate({
                where: { ...where, type: "EXPENSE", status: "APPROVED" },
                _sum: { amountVnd: true },
            }),
        ]);

        const totalReceiptsVnd = summaryReceipts._sum.amountVnd || 0;
        const totalExpensesVnd = summaryExpenses._sum.amountVnd || 0;
        const netCashFlowVnd = totalReceiptsVnd - totalExpensesVnd;

        if (isExport) {
            const rows: (string | number)[][] = [
                ["Mã phiếu", "Ngày giao dịch", "Loại", "Số tiền (VNĐ)", "Phương thức", "Danh mục", "Quỹ/Tài khoản", "Người nộp/nhận", "Nội dung", "Trạng thái", "Người tạo"],
            ];
            for (const t of transactions) {
                rows.push([
                    t.code,
                    new Date(t.transactionDate).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
                    t.type === "RECEIPT" ? "Thu" : "Chi",
                    t.amountVnd,
                    t.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản",
                    t.category?.name || "Khác",
                    t.account?.name || "Mặc định",
                    t.payerOrReceiver || publicCustomer(t.customer, lakeId)?.name || t.supplierName || "",
                    t.description,
                    t.status,
                    t.createdBy?.name || "Hệ thống",
                ]);
            }
            return new NextResponse("\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="phieu-thu-chi-${fromDateStr || "all"}-${toDateStr || "all"}.csv"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        const safeTransactions = transactions.map((transaction) => ({
            ...transaction,
            customer: publicCustomer(transaction.customer, lakeId),
        }));

        return NextResponse.json({
            transactions: safeTransactions,
            summary: {
                totalReceiptsVnd,
                totalExpensesVnd,
                netCashFlowVnd,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Không thể tải danh sách giao dịch tài chính." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext(FINANCE_ROLES);
        assertFinancialPermission(tenantContext, "FINANCIAL_CREATE_TRANSACTIONS");
        const lakeId = tenantContext.lakeId;

        // Idempotency Key validation
        const idempotencyKey =
            request.headers.get("idempotency-key") || request.headers.get("Idempotency-Key");

        if (!idempotencyKey) {
            return NextResponse.json(
                { error: "Header 'Idempotency-Key' là bắt buộc để chống tạo phiếu trùng." },
                { status: 400 },
            );
        }

        const parsedKey = z.string().uuid().safeParse(idempotencyKey.trim());
        if (!parsedKey.success) {
            return NextResponse.json(
                { error: "Idempotency-Key phải là chuỗi UUID hợp lệ." },
                { status: 400 },
            );
        }

        // Kiểm tra xem IdempotencyKey đã được xử lý chưa
        const existingTx = await prisma.financialTransaction.findFirst({
            where: {
                lakeId,
                idempotencyKey: parsedKey.data,
            },
            include: {
                category: true,
                account: true,
            },
        });

        if (existingTx) {
            return NextResponse.json(
                {
                    message: "Yêu cầu đã được xử lý trước đó (Idempotent).",
                    transaction: existingTx,
                },
                { status: 200 },
            );
        }

        const body = await request.json().catch(() => null);
        const parsed = createTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ." },
                { status: 400 },
            );
        }

        const {
            type,
            amountVnd,
            paymentMethod,
            categoryId,
            accountId,
            customerId,
            supplierName,
            payerOrReceiver,
            description,
            note,
            status,
            transactionDate: txDateStr,
            attachments,
        } = parsed.data;

        const txDate = txDateStr ? new Date(txDateStr) : new Date();

        // Kiểm tra khóa sổ kỳ tài chính
        await assertPeriodNotLocked(prisma, lakeId, txDate);

        const result = await prisma.$transaction(async (tx) => {
            // Kiểm tra lại idempotency trong transaction
            const duplicateCheck = await tx.financialTransaction.findFirst({
                where: { lakeId, idempotencyKey: parsedKey.data },
            });
            if (duplicateCheck) {
                return duplicateCheck;
            }

            await assertClientIdsInLake(tx, lakeId, { categoryId, accountId, customerId });

            // Tìm hoặc chọn quỹ mặc định nếu không truyền
            let targetAccountId = accountId;
            if (!targetAccountId) {
                const defaultAcc = await tx.financialAccount.findFirst({
                    where: { lakeId, isDefault: true },
                });
                targetAccountId = defaultAcc?.id || null;
            }

            const codePrefix = type === "RECEIPT" ? "PT" : "PC";
            const code = await generateFinancialCode(tx, lakeId, codePrefix);

            // Tạo phiếu giao dịch tài chính
            const createdTx = await tx.financialTransaction.create({
                data: {
                    lakeId,
                    code,
                    type,
                    amountVnd,
                    paymentMethod,
                    status,
                    categoryId: categoryId || null,
                    accountId: targetAccountId,
                    customerId: customerId || null,
                    supplierName: supplierName || null,
                    payerOrReceiver: payerOrReceiver || null,
                    description,
                    note: note || null,
                    idempotencyKey: parsedKey.data,
                    attachments: attachments || null,
                    transactionDate: txDate,
                    createdById: tenantContext.userId,
                    approvedById: status === "APPROVED" ? tenantContext.userId : null,
                },
                include: {
                    category: true,
                    account: true,
                    customer: true,
                },
            });

            // Tương thích ngược: Đồng bộ với bảng Payment & Expense/Invoice để các báo cáo ca/kết ca không bị lệch
            if (type === "RECEIPT") {
                const invoice = await tx.invoice.create({
                    data: {
                        lakeId,
                        status: "PAID",
                        totalAmountVnd: amountVnd,
                        subtotalVnd: amountVnd,
                        paidAmountVnd: amountVnd,
                        balanceDueVnd: 0,
                        lines: {
                            create: {
                                name: `Thu khác: [${code}] ${description}`,
                                quantity: 1,
                                unitPrice: amountVnd,
                                totalVnd: amountVnd,
                            },
                        },
                    },
                });

                const payment = await tx.payment.create({
                    data: {
                        lakeId,
                        invoiceId: invoice.id,
                        amountVnd,
                        method: paymentMethod,
                        direction: "IN",
                        idempotencyKey: parsedKey.data,
                    },
                });

                await tx.financialTransaction.update({
                    where: { id: createdTx.id },
                    data: { invoiceId: invoice.id, paymentId: payment.id },
                });
            } else {
                // EXPENSE
                const expense = await tx.expense.create({
                    data: {
                        lakeId,
                        description: `[${code}] ${description}`,
                        amountVnd,
                    },
                });

                const payment = await tx.payment.create({
                    data: {
                        lakeId,
                        expenseId: expense.id,
                        amountVnd,
                        method: paymentMethod,
                        direction: "OUT",
                        idempotencyKey: parsedKey.data,
                    },
                });

                await tx.financialTransaction.update({
                    where: { id: createdTx.id },
                    data: { expenseId: expense.id, paymentId: payment.id },
                });
            }

            // Ghi AuditEvent
            await tx.auditEvent.create({
                data: {
                    lakeId,
                    entityType: "FinancialTransaction",
                    entityId: createdTx.id,
                    action: type === "RECEIPT" ? "RECEIPT_CREATED" : "EXPENSE_CREATED",
                    payload: JSON.stringify({
                        code,
                        type,
                        amountVnd,
                        paymentMethod,
                        description,
                        categoryId,
                        accountId: targetAccountId,
                    }),
                    createdBy: tenantContext.userId,
                },
            });

            return createdTx;
        });

        return NextResponse.json(
            {
                message: `Đã tạo ${result.type === "RECEIPT" ? "phiếu thu" : "phiếu chi"} ${result.code} thành công.`,
                transaction: result,
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { error: (error instanceof Error ? error.message : null) || "Lỗi hệ thống khi tạo phiếu tài chính." },
            { status: 500 },
        );
    }
}
