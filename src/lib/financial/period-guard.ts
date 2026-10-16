import { PrismaClient } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/tenant";

type TransactionDb = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Kiểm tra xem một thời điểm giao dịch có rơi vào kỳ kế toán đã khóa sổ hay không
 */
export async function assertPeriodNotLocked(
    db: TransactionDb,
    lakeId: string,
    transactionDate: Date = new Date(),
): Promise<void> {
    const lockedPeriod = await db.financialPeriod.findFirst({
        where: {
            lakeId,
            isLocked: true,
            startDate: { lte: transactionDate },
            endDate: { gte: transactionDate },
        },
        select: {
            name: true,
            lockedAt: true,
        },
    });

    if (lockedPeriod) {
        throw new ForbiddenError(
            `Kỳ tài chính "${lockedPeriod.name}" đã được khóa sổ. Bạn không thể thực hiện thêm, sửa hoặc hủy giao dịch trong kỳ này.`,
        );
    }
}
