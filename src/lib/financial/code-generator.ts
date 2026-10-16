import { PrismaClient } from "@/generated/prisma/client";

type TransactionDb = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Tạo mã giao dịch tự động theo định dạng [PREFIX]-[YYYYMMDD]-[XXXX]
 * Đảm bảo tính duy nhất và tăng dần trong ngày của từng hồ câu
 */
export async function generateFinancialCode(
    db: TransactionDb,
    lakeId: string,
    prefix: "PT" | "PC" | "CK" | "CN",
): Promise<string> {
    const now = new Date();
    // Sử dụng múi giờ Việt Nam (UTC+7)
    const vnDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now).replace(/-/g, ""); // e.g. "20261013"

    const basePrefix = `${prefix}-${vnDateStr}-`;

    if (prefix === "PT" || prefix === "PC") {
        const lastTx = await db.financialTransaction.findFirst({
            where: {
                lakeId,
                code: { startsWith: basePrefix },
            },
            orderBy: { code: "desc" },
            select: { code: true },
        });

        let nextSeq = 1;
        if (lastTx?.code) {
            const parts = lastTx.code.split("-");
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) {
                nextSeq = lastNum + 1;
            }
        }
        return `${basePrefix}${String(nextSeq).padStart(4, "0")}`;
    }

    if (prefix === "CK") {
        const lastTransfer = await db.fundTransfer.findFirst({
            where: {
                lakeId,
                code: { startsWith: basePrefix },
            },
            orderBy: { code: "desc" },
            select: { code: true },
        });

        let nextSeq = 1;
        if (lastTransfer?.code) {
            const parts = lastTransfer.code.split("-");
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) {
                nextSeq = lastNum + 1;
            }
        }
        return `${basePrefix}${String(nextSeq).padStart(4, "0")}`;
    }

    // CN: Công nợ
    const lastDebt = await db.debt.findFirst({
        where: {
            lakeId,
            code: { startsWith: basePrefix },
        },
        orderBy: { code: "desc" },
        select: { code: true },
    });

    let nextSeq = 1;
    if (lastDebt?.code) {
        const parts = lastDebt.code.split("-");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
        }
    }
    return `${basePrefix}${String(nextSeq).padStart(4, "0")}`;
}
