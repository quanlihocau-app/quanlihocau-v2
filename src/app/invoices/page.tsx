import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { InvoiceStatus, SessionStatus } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { SalesPos, type ActiveSession } from "./sales-pos";

export default async function InvoicesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
                <div className="w-full rounded-2xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-8 text-center">
                    <h1 className="text-xl font-bold text-[#8B1E1E]">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-[#8B1E1E]">
                        Tài khoản ({session.user.email}) hiện chưa được gán quyền
                        hoặc hồ câu đã bị xóa. Vui lòng liên hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    // Fetch active sessions to display in dropdown for mode "Thêm vào vé câu"
    const activeSessions = await prisma.fishingSession.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            status: SessionStatus.ACTIVE,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                },
            },
            hutLinks: {
                include: {
                    hut: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            invoices: {
                where: {
                    status: InvoiceStatus.DRAFT,
                },
                select: {
                    id: true,
                },
                take: 1,
            },
        },
        orderBy: {
            startAt: "desc",
        },
    });

    // Serialize sessions for Client Component
    const serializedSessions: ActiveSession[] = activeSessions.map((s) => ({
        id: s.id,
        plannedEndAt: s.plannedEndAt.toISOString(),
        customerName: s.customer?.name ?? null,
        hutLabel: s.hutLinks.map((hl) => hl.hut.name).join(" + ") || "—",
        invoiceId: s.invoices[0]?.id ?? null,
    }));

    return (
        <main className="mx-auto min-h-screen max-w-lg bg-[#F4F2EE] px-4 pb-24 pt-5 sm:px-6">
            <MobileAppHeader lakeName={tenantContext.lakeName} />

            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-[22px] font-bold tracking-tight text-[#27231F]">
                        Bán hàng
                    </h1>
                </div>
                <span className="badge-pill bg-[#8A5A20] text-white">
                    Thêm vào vé
                </span>
            </div>

            {/* Sales POS Client Interface */}
            <SalesPos activeSessions={serializedSessions} />

            <MobileBottomNav />
        </main>
    );
}
