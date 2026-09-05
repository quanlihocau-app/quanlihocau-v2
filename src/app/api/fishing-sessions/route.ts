import { NextResponse } from "next/server";
import { Role, SessionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";
import { openSession } from "@/lib/services/open-session.service";

const validStatuses = Object.values(SessionStatus);

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
                { ok: false, error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const idempotencyKeyHeader =
            request.headers.get("idempotency-key") ||
            request.headers.get("Idempotency-Key");

        try {
            const result = await openSession(body, tenantContext, idempotencyKeyHeader);
            return NextResponse.json(result, { status: 201 });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage.startsWith("VALIDATION_ERROR:")) {
                return NextResponse.json(
                    { ok: false, error: errorMessage.replace("VALIDATION_ERROR: ", "") },
                    { status: 400 },
                );
            }

            if (errorMessage === "SPOT_OCCUPIED") {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Ô câu đã có khách đang câu.",
                        code: "SPOT_OCCUPIED",
                    },
                    { status: 409 },
                );
            }

            if (
                errorMessage.startsWith("PACKAGE_NOT_FOUND:") ||
                errorMessage.startsWith("CUSTOMER_NOT_FOUND:") ||
                errorMessage.startsWith("PRODUCT_NOT_FOUND:")
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: errorMessage.split(": ")[1] || "Tài nguyên không tìm thấy.",
                    },
                    { status: 404 },
                );
            }

            console.error("[openSession error]:", err);
            return NextResponse.json(
                { ok: false, error: "Không thể mở phiên câu do lỗi hệ thống." },
                { status: 500 },
            );
        }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
        }
        return NextResponse.json({ ok: false, error: "Lỗi hệ thống." }, { status: 500 });
    }
}
