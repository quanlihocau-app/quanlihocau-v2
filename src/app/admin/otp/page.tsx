import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";
import { OtpAdminClient, OtpLogItem } from "./otp-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminOtpPage() {
    await requireSuperAdmin();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
        totalCount,
        totalVerified,
        totalFailed,
        sentToday,
        costAggregate,
        logs,
    ] = await Promise.all([
        prisma.otpDeliveryLog.count(),
        prisma.otpDeliveryLog.count({ where: { status: "VERIFIED" } }),
        prisma.otpDeliveryLog.count({ where: { status: "FAILED" } }),
        prisma.otpDeliveryLog.count({
            where: { createdAt: { gte: startOfToday } },
        }),
        prisma.otpDeliveryLog.aggregate({
            _sum: { costVnd: true },
        }),
        prisma.otpDeliveryLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 15,
        }),
    ]);

    const initialLogs: OtpLogItem[] = logs.map((l) => ({
        id: l.id,
        phone: l.phone,
        maskedPhone: l.maskedPhone,
        provider: l.provider,
        status: l.status,
        ipAddress: l.ipAddress,
        deviceHash: l.deviceHash,
        costVnd: l.costVnd,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt.toISOString(),
        verifiedAt: l.verifiedAt ? l.verifiedAt.toISOString() : null,
    }));

    const totalCostVnd = costAggregate._sum.costVnd || 0;
    const verificationRate =
        totalCount > 0 ? Math.round((totalVerified / totalCount) * 100) : 0;

    const initialStats = {
        totalCount,
        totalVerified,
        totalFailed,
        sentToday,
        totalCostVnd,
        verificationRate,
    };

    const initialPagination = {
        page: 1,
        limit: 15,
        totalCount,
        totalPages: Math.ceil(totalCount / 15) || 1,
    };

    return (
        <OtpAdminClient
            initialLogs={initialLogs}
            initialStats={initialStats}
            initialPagination={initialPagination}
        />
    );
}
