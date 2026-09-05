import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { HistoryView } from "./history-view";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";

export default async function InvoiceHistoryPage() {
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

    const canManageInvoices =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    const canReversePayments =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    // Fetch invoices and audit events in parallel
    const [invoices, auditEvents] = await Promise.all([
        prisma.invoice.findMany({
            where: {
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
                        name: true,
                        unitPrice: true,
                        quantity: true,
                        totalVnd: true,
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
            orderBy: {
                createdAt: "desc",
            },
        }),

        prisma.auditEvent.findMany({
            where: {
                lakeId: tenantContext.lakeId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        }),
    ]);

    // Format dates and decimals for client serialization
    const formattedInvoices = invoices.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt.toISOString(),
        fishingSession: inv.fishingSession
            ? {
                  ...inv.fishingSession,
                  startAt: inv.fishingSession.startAt.toISOString(),
                  endedAt: inv.fishingSession.endedAt
                      ? inv.fishingSession.endedAt.toISOString()
                      : null,
              }
            : null,
        lines: inv.lines.map((l) => ({
            ...l,
            quantity: Number(l.quantity),
        })),
        payments: inv.payments.map((p) => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
        })),
    }));

    const formattedAuditEvents = auditEvents.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
    }));

    return (
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame">
                <MobileAppHeader lakeName={tenantContext.lakeName} />

                <div className="p-4 space-y-4 pb-28">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Nhật ký
                        </h1>
                        <span className="rounded-full bg-[#EAE2CE] px-2.5 py-0.5 text-xs font-bold text-[#8A5B00]">
                            Giao dịch & Hoạt động
                        </span>
                    </div>

                    <HistoryView
                        invoices={formattedInvoices}
                        auditEvents={formattedAuditEvents}
                        canManageInvoices={canManageInvoices}
                        canReversePayments={canReversePayments}
                        lakeName={tenantContext.lakeName}
                    />
                </div>

                <MobileBottomNav />
            </div>
        </div>
    );
}
