import type { Metadata } from "next";
import { Suspense } from "react";
import { getPageSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

import { getTenantContext } from "@/lib/tenant";
import { privateRouteMetadata } from "@/lib/metadata";

import { ReportsView } from "./reports-view";

export const metadata: Metadata = {
    ...privateRouteMetadata,
    title: "Báo cáo & Đối soát",
};

export default async function ReportsPage() {
    const [session, tenantContext] = await Promise.all([
        getPageSession(),
        getTenantContext(),
    ]);

    if (!session?.user?.email) {
        redirect("/login");
    }

    if (!tenantContext?.lakeId) {
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

    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#F6F8F5]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
        }>
            <ReportsView
                lakeName={tenantContext.lakeName || "Hồ câu"}
                lakeId={tenantContext.lakeId}
                userEmail={session.user.email}
                userRole={tenantContext.role}
            />
        </Suspense>
    );
}
