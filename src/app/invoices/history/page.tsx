import { getPageSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { HistoryView } from "./history-view";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";

export default async function InvoiceHistoryPage({
    searchParams,
}: {
    searchParams?: Promise<{ tab?: string }>;
}) {
    const session = await getPageSession();

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

    const resolvedParams = searchParams ? await searchParams : undefined;
    const initialTab = resolvedParams?.tab === "audit" ? "audit" : "orders";

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
                NOT: { lines: { some: { name: { startsWith: "Thu khác: " } } } },
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

    // Parse audit payloads to resolve IDs to human-readable names
    const packageIdsSet = new Set<string>();
    const customerIdsSet = new Set<string>();
    const hutIdsSet = new Set<string>();
    const productIdsSet = new Set<string>();
    const invoiceIdsSet = new Set<string>();
    const userIdsSet = new Set<string>(auditEvents.map((a) => a.createdBy).filter(Boolean));
    const sessionIdsSet = new Set<string>(
        auditEvents
            .filter((a) => a.entityType === "FishingSession")
            .map((a) => a.entityId)
            .filter(Boolean),
    );

    for (const a of auditEvents) {
        if (a.entityType === "Invoice" && a.entityId) {
            invoiceIdsSet.add(a.entityId);
        }
        if (!a.payload) continue;
        try {
            const p = JSON.parse(a.payload);
            if (p.packageId && typeof p.packageId === "string") packageIdsSet.add(p.packageId);
            if (p.customerId && typeof p.customerId === "string") customerIdsSet.add(p.customerId);
            if (p.productId && typeof p.productId === "string") productIdsSet.add(p.productId);
            if (p.sessionId && typeof p.sessionId === "string") sessionIdsSet.add(p.sessionId);
            if (p.fishingSessionId && typeof p.fishingSessionId === "string") sessionIdsSet.add(p.fishingSessionId);
            if (p.invoiceId && typeof p.invoiceId === "string") invoiceIdsSet.add(p.invoiceId);
            if (p.actor?.id && typeof p.actor.id === "string") userIdsSet.add(p.actor.id);
            if (Array.isArray(p.hutIds)) {
                for (const hid of p.hutIds) {
                    if (typeof hid === "string") hutIdsSet.add(hid);
                }
            } else if (p.hutId && typeof p.hutId === "string") {
                hutIdsSet.add(p.hutId);
            }
        } catch {
            // ignore JSON parse error
        }
    }

    const [auditUsers, auditSessions, packages, customers, huts, products, auditInvoices] = await Promise.all([
        userIdsSet.size > 0
            ? prisma.user.findMany({
                  where: { id: { in: Array.from(userIdsSet) } },
                  select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                      memberships: {
                          where: { lakeId: tenantContext.lakeId },
                          select: { role: true },
                      },
                  },
              })
            : [],
        sessionIdsSet.size > 0
            ? prisma.fishingSession.findMany({
                  where: { id: { in: Array.from(sessionIdsSet) } },
                  include: {
                      customer: { select: { name: true } },
                      package: { select: { name: true } },
                      hutLinks: { include: { hut: { select: { name: true } } } },
                  },
              })
            : [],
        packageIdsSet.size > 0
            ? prisma.package.findMany({
                  where: { id: { in: Array.from(packageIdsSet) } },
                  select: { id: true, name: true },
              })
            : [],
        customerIdsSet.size > 0
            ? prisma.customer.findMany({
                  where: { id: { in: Array.from(customerIdsSet) } },
                  select: { id: true, name: true },
              })
            : [],
        hutIdsSet.size > 0
            ? prisma.hut.findMany({
                  where: { id: { in: Array.from(hutIdsSet) } },
                  select: { id: true, name: true },
              })
            : [],
        productIdsSet.size > 0
            ? prisma.product.findMany({
                  where: { id: { in: Array.from(productIdsSet) } },
                  select: { id: true, name: true, sku: true },
              })
            : [],
        invoiceIdsSet.size > 0
            ? prisma.invoice.findMany({
                  where: { id: { in: Array.from(invoiceIdsSet) } },
                  include: {
                      lines: {
                          select: {
                              id: true,
                              name: true,
                              quantity: true,
                              unitPrice: true,
                              totalVnd: true,
                          },
                      },
                      customer: { select: { name: true } },
                  },
              })
            : [],
    ]);

    const usersMap: Record<string, string> = {};
    for (const u of auditUsers) {
        const rawName = u.name || (u.email ? u.email.split("@")[0] : "Nhân viên");
        const role = u.memberships[0]?.role;
        const roleLabel =
            role === Role.OWNER
                ? "Chủ hồ"
                : role === Role.MANAGER
                ? "Quản lý"
                : role === Role.STAFF
                ? "Nhân viên"
                : "";
        usersMap[u.id] = roleLabel ? `${rawName} (${roleLabel})` : rawName;
    }

    const sessionsMap: Record<string, { customerName: string; huts: string; packageName?: string }> = {};
    for (const s of auditSessions) {
        sessionsMap[s.id] = {
            customerName: s.customer?.name || "Khách vãng lai",
            huts: s.hutLinks.map((hl) => hl.hut.name).filter(Boolean).join(", "),
            packageName: s.package?.name || s.packageNameSnapshot,
        };
    }

    const packagesMap: Record<string, string> = {};
    for (const p of packages) {
        packagesMap[p.id] = p.name;
    }

    const customersMap: Record<string, string> = {};
    for (const c of customers) {
        customersMap[c.id] = c.name;
    }

    const hutsMap: Record<string, string> = {};
    for (const h of huts) {
        hutsMap[h.id] = h.name.startsWith("Chòi") || h.name.startsWith("Ô") ? h.name : `Chòi ${h.name}`;
    }

    const productsMap: Record<string, string> = {};
    for (const p of products) {
        productsMap[p.id] = p.sku ? `${p.name} (Mã: ${p.sku})` : p.name;
    }

    const invoicesMap: Record<
        string,
        {
            customerName?: string;
            linesSummary: string;
            lines: Array<{ name: string; quantity: number; unitPrice: number; totalVnd: number }>;
        }
    > = {};
    for (const inv of auditInvoices) {
        const linesList = inv.lines.map((l) => ({
            name: l.name,
            quantity: Number(l.quantity),
            unitPrice: l.unitPrice,
            totalVnd: l.totalVnd,
        }));
        invoicesMap[inv.id] = {
            customerName: inv.customer?.name,
            linesSummary: linesList.map((l) => `${l.name} x${l.quantity}`).join(", "),
            lines: linesList,
        };
    }

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

                <main className="flex-1 overflow-y-auto p-4 space-y-4 has-bottom-nav">
                    <div className="flex items-center justify-between">
                        <h1 className="text-[22px] font-bold tracking-tight text-[#17201A]">
                            Nhật ký
                        </h1>
                        <span className="rounded-full bg-[#E8F3E5] px-3 py-1 text-xs font-semibold text-[#246B38]">
                            Giao dịch & Hoạt động
                        </span>
                    </div>

                    <HistoryView
                        invoices={formattedInvoices}
                        auditEvents={formattedAuditEvents}
                        usersMap={usersMap}
                        sessionsMap={sessionsMap}
                        packagesMap={packagesMap}
                        hutsMap={hutsMap}
                        customersMap={customersMap}
                        productsMap={productsMap}
                        invoicesMap={invoicesMap}
                        canManageInvoices={canManageInvoices}
                        canReversePayments={canReversePayments}
                        lakeName={tenantContext.lakeName}
                        initialTab={initialTab}
                    />
                </main>

                <MobileBottomNav />
            </div>
        </div>
    );
}
