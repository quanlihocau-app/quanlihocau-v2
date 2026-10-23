import { NextResponse } from "next/server";

import { Role } from "@/generated/prisma/client";
import {
    AUDIT_PAGE_SIZE,
    AUDIT_RETENTION_DAYS,
    auditsToCsv,
    buildAuditEventWhere,
    hashAuditReadToken,
    parseBearerToken,
    presentAuditEntry,
} from "@/lib/audit-log-core";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Read-only staff audit feed.
 * Session: OWNER or MANAGER of the current pond.
 * Bot: Authorization: Bearer qlh_... issued on /settings/nhat-ky.
 * There is no POST, PATCH, or DELETE.
 */
export async function GET(request: Request) {
    try {
        const lake = await resolveAuditLake(request);
        const url = new URL(request.url);
        const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
        const requestedLimit = Number(url.searchParams.get("limit") ?? "");
        const pageSize = format === "csv"
            ? clamp(requestedLimit, 500, 500)
            : clamp(requestedLimit, AUDIT_PAGE_SIZE, 100);
        const page = clamp(Number(url.searchParams.get("page") ?? "1"), 1, 200);

        const query = buildAuditEventWhere(lake.lakeId, {
            actorId: url.searchParams.get("actor"),
            action: url.searchParams.get("action"),
            entityId: url.searchParams.get("entity"),
            from: url.searchParams.get("from"),
            to: url.searchParams.get("to"),
        });

        const rows = await prisma.auditEvent.findMany({
            where: query.where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize + 1,
            select: {
                id: true,
                createdAt: true,
                action: true,
                entityType: true,
                entityId: true,
                payload: true,
                createdBy: true,
            },
        });
        const hasNext = rows.length > pageSize;
        const entries = rows.slice(0, pageSize).map(presentAuditEntry);

        if (format === "csv") {
            return new NextResponse(`\uFEFF${auditsToCsv(entries)}`, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": "attachment; filename=\"nhat-ky-hoat-dong.csv\"",
                    "Cache-Control": "no-store",
                },
            });
        }

        return NextResponse.json({
            lakeId: lake.lakeId,
            from: query.from,
            to: query.to,
            clamped: query.clamped,
            page,
            pageSize,
            hasNext,
            retentionDays: AUDIT_RETENTION_DAYS,
            entries,
        }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        console.error("[audit] read", error instanceof Error ? error.message : "failed");
        return NextResponse.json({ error: "Không đọc được nhật ký." }, { status: 500 });
    }
}

async function resolveAuditLake(request: Request): Promise<{ lakeId: string; lakeName: string }> {
    const token = parseBearerToken(request.headers.get("authorization"));
    if (token === "") {
        throw new AuthenticationError("Token đọc nhật ký không hợp lệ.");
    }
    if (token) {
        const lake = await prisma.lake.findUnique({
            where: { auditReadTokenHash: hashAuditReadToken(token) },
            select: { id: true, name: true, deletedAt: true },
        });
        if (!lake || lake.deletedAt) {
            throw new AuthenticationError("Token đọc nhật ký không hợp lệ.");
        }
        return { lakeId: lake.id, lakeName: lake.name };
    }

    const tenant = await requireTenantContext([Role.OWNER, Role.MANAGER]);
    return { lakeId: tenant.lakeId, lakeName: tenant.lakeName };
}

function clamp(value: number, fallback: number, max: number): number {
    if (!Number.isFinite(value) || value < 1) return fallback;
    return Math.min(max, Math.floor(value));
}
