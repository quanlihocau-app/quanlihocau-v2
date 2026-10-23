import { getPageSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { loadShiftReport } from "@/lib/reports/shift-report";
import { getTenantContext } from "@/lib/tenant";

import { DailyReportView } from "./daily-report-view";

interface PageProps {
    searchParams: Promise<{
        shiftId?: string;
    }>;
}

export default async function DailyReportPage({ searchParams }: PageProps) {
    const session = await getPageSession();

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

    const { shiftId } = await searchParams;
    const report = await loadShiftReport(tenantContext.lakeId, shiftId);
    const canCloseShift = tenantContext.role === Role.OWNER || tenantContext.role === Role.MANAGER;

    return (
        <DailyReportView
            shift={report.shift}
            summary={report.summary}
            breakdown={report.breakdown}
            reconciliation={report.reconciliation}
            shiftClose={report.shiftClose}
            canCloseShift={canCloseShift}
            lakeName={tenantContext.lakeName}
            recentShifts={report.recentShifts}
        />
    );
}
