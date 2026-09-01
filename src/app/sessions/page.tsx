import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { InvoiceStatus, Role, SessionStatus } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
// Import main client controller for session POS grid
import { SessionsClient, type SerializableSession, type SerializablePackage } from "./sessions-client";

export default async function SessionsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    const tenantContext = await getTenantContext();

    if (!tenantContext) {
        return (
            <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
                <div className="w-full rounded-2xl border border-[#8B1E1E]/30 bg-[#FAECEC] p-6 text-center">
                    <h1 className="text-lg font-bold text-[#8B1E1E]">
                        Chưa có quyền truy cập
                    </h1>
                    <p className="mt-2 text-xs text-[#8B1E1E]">
                        Tài khoản ({session.user.email}) hiện chưa được
                        gán quyền hoặc hồ câu đã bị xóa. Vui lòng liên
                        hệ quản trị viên.
                    </p>
                </div>
            </main>
        );
    }

    // ── Fetch active sessions with all relations ────────────────────────
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
                    phoneNormalized: true,
                },
            },
            package: {
                select: {
                    id: true,
                    name: true,
                    durationMinutes: true,
                    priceVnd: true,
                    overtimeHourlyVnd: true,
                },
            },
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
            invoices: {
                where: {
                    status: InvoiceStatus.DRAFT,
                },
                include: {
                    lines: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    priceVnd: true,
                                },
                            },
                            fishBuyback: {
                                include: {
                                    fishType: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                    payments: {
                        select: {
                            id: true,
                            amountVnd: true,
                            method: true,
                            direction: true,
                            createdAt: true,
                        },
                    },
                },
                take: 1,
            },
        },
        orderBy: {
            startAt: "desc",
        },
    });

    // ── Fetch active packages for extensions ─────────────────────────────
    const packages = await prisma.package.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            durationMinutes: true,
            priceVnd: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    // ── Fetch active fish types for buybacks ─────────────────────────────
    const fishTypes = await prisma.fishType.findMany({
        where: {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            pricePerKg: true,
        },
        orderBy: {
            name: "asc",
        },
    });

    const canOpenSession =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER ||
        tenantContext.role === Role.STAFF;

    const canComplete = canOpenSession;
    const canCancel =
        tenantContext.role === Role.OWNER ||
        tenantContext.role === Role.MANAGER;

    // ── Serialize: convert Date → ISO string and Decimal/BigInt for client ────────
    const serializedSessions: SerializableSession[] = activeSessions.map((s) => ({
        id: s.id,
        startAt: s.startAt.toISOString(),
        plannedEndAt: s.plannedEndAt.toISOString(),
        customer: s.customer
            ? {
                  id: s.customer.id,
                  name: s.customer.name,
                  phoneNormalized: s.customer.phoneNormalized,
              }
            : null,
        package: {
            id: s.package.id,
            name: s.package.name,
            durationMinutes: s.package.durationMinutes,
            priceVnd: Number(s.package.priceVnd),
        },
        packageNameSnapshot: s.packageNameSnapshot,
        packageDurationMinutesSnapshot: s.packageDurationMinutesSnapshot,
        packagePriceVndSnapshot: s.packagePriceVndSnapshot,
        hutLinks: s.hutLinks.map((hl) => ({
            hut: {
                id: hl.hut.id,
                name: hl.hut.name,
                area: hl.hut.area
                    ? { id: hl.hut.area.id, name: hl.hut.area.name }
                    : null,
            },
        })),
        invoices: s.invoices.map((inv) => ({
            id: inv.id,
            totalAmountVnd: Number(inv.totalAmountVnd),
            lines: inv.lines.map((l) => ({
                id: l.id,
                productId: l.productId,
                fishBuybackId: l.fishBuybackId,
                name: l.name,
                unitPrice: l.unitPrice,
                quantity: Number(l.quantity),
                totalVnd: l.totalVnd,
                createdAt: l.createdAt.toISOString(),
                product: l.product ? {
                    id: l.product.id,
                    name: l.product.name,
                    priceVnd: l.product.priceVnd,
                } : null,
                fishBuyback: l.fishBuyback ? {
                    id: l.fishBuyback.id,
                    weight: Number(l.fishBuyback.weight),
                    pricePerKg: l.fishBuyback.pricePerKg,
                    totalVnd: l.fishBuyback.totalVnd,
                    fishType: {
                        id: l.fishBuyback.fishType.id,
                        name: l.fishBuyback.fishType.name,
                    },
                } : null,
            })),
            payments: inv.payments.map((p) => ({
                id: p.id,
                amountVnd: p.amountVnd,
                method: p.method,
                direction: p.direction,
                createdAt: p.createdAt.toISOString(),
            })),
        })),
    }));

    const serializedPackages: SerializablePackage[] = packages.map((p) => ({
        id: p.id,
        name: p.name,
        durationMinutes: p.durationMinutes,
        priceVnd: Number(p.priceVnd),
    }));

    const activeHutCount = serializedSessions.reduce(
        (total, s) => total + s.hutLinks.length,
        0,
    );

    return (
        <div className="mobile-pos-shell">
            <div className="mobile-pos-frame pb-24">
                {/* ── App Header ───────────────────────────────────────────── */}
                <MobileAppHeader lakeName={tenantContext.lakeName} isOnline={true} />

                {/* ── Main Content Area ───────────────────────────────────── */}
                <main className="flex-1 px-4 sm:px-5 py-4 overflow-y-auto">
                    {/* ── Section header ──────────────────────────────────────── */}
                    <div className="mb-4 flex items-center justify-between">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                            Đang câu
                        </h1>
                        <span className="inline-flex items-center rounded-full bg-[#EAE2CE] px-3 py-1 text-xs font-semibold text-[#8A5B00]">
                            {serializedSessions.length} vé · {activeHutCount} ô
                        </span>
                    </div>

                    {/* ── Client Component: handles selection, modals, actions ── */}
                    <SessionsClient
                        activeSessions={serializedSessions}
                        packages={serializedPackages}
                        fishTypes={fishTypes}
                        canComplete={canComplete}
                        canCancel={canCancel}
                        canOpenSession={canOpenSession}
                    />
                </main>

                <MobileBottomNav />
            </div>
        </div>
    );
}
