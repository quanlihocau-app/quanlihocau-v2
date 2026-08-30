import { NextResponse } from "next/server";
import { z } from "zod";

import { Role, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const validStatuses = Object.values(SessionStatus);

const createSessionSchema = z.object({
    customerId: z.string().uuid("ID khách hàng không hợp lệ.").nullable().optional(),
    packageId: z.string().uuid("ID gói câu không hợp lệ."),
    hutIds: z
        .array(z.string().uuid("ID chòi không hợp lệ."))
        .min(1, "Phải chọn ít nhất 1 chòi.")
        .max(10, "Tối đa 10 chòi mỗi phiên.")
        .refine(
            (ids) => new Set(ids).size === ids.length,
            "Danh sách chòi không được trùng lặp.",
        ),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get("status")?.trim();

        let statusFilter: SessionStatus = SessionStatus.ACTIVE;
        if (statusParam) {
            if (!validStatuses.includes(statusParam as SessionStatus)) {
                return NextResponse.json(
                    { error: `Trạng thái không hợp lệ. Giá trị cho phép: ${validStatuses.join(", ")}.` },
                    { status: 400 },
                );
            }
            statusFilter = statusParam as SessionStatus;
        }

        const sessions = await prisma.fishingSession.findMany({
            where: {
                lakeId: tenantContext.lakeId,
                status: statusFilter,
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
            },
            orderBy: {
                startAt: "desc",
            },
        });

        return NextResponse.json(sessions, { status: 200 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = createSessionSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { customerId, packageId, hutIds } = parsed.data;

        // Validate Package belongs to this lake and is not deleted
        const pkg = await prisma.package.findFirst({
            where: {
                id: packageId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!pkg) {
            return NextResponse.json(
                { error: "Gói câu không tồn tại hoặc không thuộc hồ câu này." },
                { status: 404 },
            );
        }

        // Validate Customer belongs to this lake and is not deleted (if provided)
        if (customerId) {
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    lakeId: tenantContext.lakeId,
                    deletedAt: null,
                },
                select: { id: true },
            });

            if (!customer) {
                return NextResponse.json(
                    { error: "Khách hàng không tồn tại hoặc không thuộc hồ câu này." },
                    { status: 404 },
                );
            }
        }

        // Validate all Huts belong to this lake and are not deleted
        const huts = await prisma.hut.findMany({
            where: {
                id: { in: hutIds },
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (huts.length !== hutIds.length) {
            return NextResponse.json(
                { error: "Một hoặc nhiều chòi không tồn tại hoặc không thuộc hồ câu này." },
                { status: 404 },
            );
        }

        // Interactive transaction with Serializable isolation + retry on P2034
        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const now = new Date();
            const plannedEndAt = new Date(
                now.getTime() + pkg.durationMinutes * 60 * 1000,
            );

            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // 1. Create FishingSession
                        const session = await tx.fishingSession.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                customerId: customerId ?? null,
                                packageId,
                                startAt: now,
                                plannedEndAt,
                                status: SessionStatus.ACTIVE,
                            },
                        });

                        // 2. Atomically claim each hut — only succeeds if currentSessionId is null
                        for (const hutId of hutIds) {
                            const updated = await tx.hut.updateMany({
                                where: {
                                    id: hutId,
                                    lakeId: tenantContext.lakeId,
                                    currentSessionId: null,
                                    deletedAt: null,
                                },
                                data: {
                                    currentSessionId: session.id,
                                    version: { increment: 1 },
                                },
                            });

                            if (updated.count === 0) {
                                throw new Error("HUT_OCCUPIED");
                            }
                        }

                        // 3. Create FishingSessionHut records
                        await tx.fishingSessionHut.createMany({
                            data: hutIds.map((hutId) => ({
                                lakeId: tenantContext.lakeId,
                                fishingSessionId: session.id,
                                hutId,
                            })),
                        });

                        // 4. Create AuditEvent
                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "FishingSession",
                                entityId: session.id,
                                action: "FISHING_SESSION_OPENED",
                                payload: JSON.stringify({
                                    packageId,
                                    hutIds,
                                    customerId: customerId ?? null,
                                    startAt: now.toISOString(),
                                    plannedEndAt: plannedEndAt.toISOString(),
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        // Fetch the full session with relations for the response
                        const fullSession = await tx.fishingSession.findUniqueOrThrow({
                            where: { id: session.id },
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
                            },
                        });

                        return fullSession;
                    },
                    {
                        isolationLevel: "Serializable",
                    },
                );

                return NextResponse.json(result, { status: 201 });
            } catch (txError) {
                // HUT_OCCUPIED is a business error — never retry
                if (
                    txError instanceof Error &&
                    txError.message === "HUT_OCCUPIED"
                ) {
                    return NextResponse.json(
                        { error: "Một hoặc nhiều chòi đã có phiên đang hoạt động. Vui lòng chọn chòi khác." },
                        { status: 409 },
                    );
                }

                // P2034: serialization conflict — retry if attempts remain
                const isSerializationConflict =
                    typeof txError === "object" &&
                    txError !== null &&
                    "code" in txError &&
                    (txError as { code: string }).code === "P2034";

                if (isSerializationConflict && attempt < MAX_RETRIES) {
                    continue;
                }

                if (isSerializationConflict) {
                    return NextResponse.json(
                        { error: "Dữ liệu chòi vừa thay đổi bởi người khác. Vui lòng tải lại trang và thử lại." },
                        { status: 409 },
                    );
                }

                throw txError;
            }
        }

        // Unreachable — loop always returns or throws — but satisfies TypeScript
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}
