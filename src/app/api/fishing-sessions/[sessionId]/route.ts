import { NextResponse } from "next/server";
import { z } from "zod";

import { Role, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const actionSchema = z.object({
    action: z.enum(["COMPLETE", "CANCEL"], {
        message: 'Hành động phải là "COMPLETE" hoặc "CANCEL".',
    }),
});

interface RouteParams {
    params: Promise<{
        sessionId: string;
    }>;
}

const ROLE_COMPLETE = [Role.OWNER, Role.MANAGER, Role.STAFF];
const ROLE_CANCEL = [Role.OWNER, Role.MANAGER];

const MAX_RETRIES = 3;

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { sessionId } = await params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = actionSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { action } = parsed.data;

        // RBAC: CANCEL requires OWNER/MANAGER; COMPLETE allows STAFF too
        const allowedRoles = action === "CANCEL" ? ROLE_CANCEL : ROLE_COMPLETE;
        const tenantContext = await requireTenantContext(allowedRoles);

        // Retry loop for Serializable P2034 conflicts
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await prisma.$transaction(
                    async (tx) => {
                        // 1. Find ACTIVE session belonging to this tenant
                        const session = await tx.fishingSession.findFirst({
                            where: {
                                id: sessionId,
                                lakeId: tenantContext.lakeId,
                                status: SessionStatus.ACTIVE,
                            },
                            include: {
                                hutLinks: {
                                    select: { hutId: true },
                                },
                            },
                        });

                        if (!session) {
                            throw new Error("SESSION_NOT_ACTIVE");
                        }

                        const hutIds = session.hutLinks.map((hl) => hl.hutId);
                        const endedAt = new Date();

                        // 2. Update session status
                        const newStatus =
                            action === "COMPLETE"
                                ? SessionStatus.COMPLETED
                                : SessionStatus.CANCELLED;

                        await tx.fishingSession.update({
                            where: { id: session.id },
                            data: {
                                status: newStatus,
                                endedAt,
                            },
                        });

                        // 3. Release huts — only where currentSessionId matches exactly
                        if (hutIds.length > 0) {
                            const released = await tx.hut.updateMany({
                                where: {
                                    id: { in: hutIds },
                                    lakeId: tenantContext.lakeId,
                                    currentSessionId: sessionId,
                                },
                                data: {
                                    currentSessionId: null,
                                    version: { increment: 1 },
                                },
                            });

                            if (released.count !== hutIds.length) {
                                throw new Error("HUT_RELEASE_MISMATCH");
                            }
                        }

                        // 4. Audit event
                        const auditAction =
                            action === "COMPLETE"
                                ? "FISHING_SESSION_COMPLETED"
                                : "FISHING_SESSION_CANCELLED";

                        await tx.auditEvent.create({
                            data: {
                                lakeId: tenantContext.lakeId,
                                entityType: "FishingSession",
                                entityId: session.id,
                                action: auditAction,
                                payload: JSON.stringify({
                                    endedAt: endedAt.toISOString(),
                                    hutIds,
                                }),
                                createdBy: tenantContext.userId,
                            },
                        });

                        // 5. Return updated session with relations
                        const updatedSession =
                            await tx.fishingSession.findUniqueOrThrow({
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

                        return updatedSession;
                    },
                    {
                        isolationLevel: "Serializable",
                    },
                );

                return NextResponse.json(result, { status: 200 });
            } catch (txError) {
                // Business errors — never retry
                if (
                    txError instanceof Error &&
                    txError.message === "SESSION_NOT_ACTIVE"
                ) {
                    return NextResponse.json(
                        {
                            error: "Phiên câu không còn hoạt động hoặc không tồn tại.",
                        },
                        { status: 409 },
                    );
                }

                if (
                    txError instanceof Error &&
                    txError.message === "HUT_RELEASE_MISMATCH"
                ) {
                    return NextResponse.json(
                        {
                            error: "Dữ liệu chòi không nhất quán. Không thể đóng phiên an toàn. Vui lòng liên hệ quản trị viên.",
                        },
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
                        {
                            error: "Dữ liệu chòi vừa thay đổi bởi người khác. Vui lòng tải lại trang và thử lại.",
                        },
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
