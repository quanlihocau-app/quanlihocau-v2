import { createHash, randomBytes } from "node:crypto";

/**
 * Pure helpers for the staff audit log.
 * Rows live in the existing AuditEvent table. New payloads are a compact
 * { before, after } diff plus the fields older readers already depend on.
 * Legacy rows stay valid: the viewer treats a missing before/after as the old shape.
 *
 * Retention is a policy, not a job: keep about 90 days and delete by hand
 * after selling hours, once anh Huân has approved it.
 */

export const AUDIT_RETENTION_DAYS = 90;
export const AUDIT_DEFAULT_RANGE_DAYS = 7;
export const AUDIT_PAGE_SIZE = 40;

const SENSITIVE_KEY = /password|secret|token|authorization|cookie|hash/i;
const ACTION_PATTERN = /^[A-Z0-9_]{1,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTOR_PATTERN = /^[A-Za-z0-9@._:+|-]{1,80}$/;
const MAX_PAYLOAD_CHARS = 3500;

export const AUDIT_VIEW_ROLES = ["OWNER", "MANAGER"] as const;

export type JsonObject = Record<string, unknown>;

export type StaffAuditInput = {
    lakeId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    createdBy: string;
    actorName?: string | null;
    actorRole?: string | null;
    before?: JsonObject | null;
    after?: JsonObject | null;
    /** Top-level keys kept for readers that already parse this action. */
    extra?: JsonObject | null;
    ip?: string | null;
    userAgent?: string | null;
};

export type AuditEventRow = {
    lakeId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    payload: string;
    createdBy: string;
};

export type AuditListFilters = {
    actorId?: string | null;
    action?: string | null;
    entityId?: string | null;
    from?: string | null;
    to?: string | null;
    now?: Date;
};

export function loginAuditTargets(
    success: boolean,
    memberships: Array<{ lakeId?: string | null; role?: string | null }> | null | undefined,
): Array<{ lakeId: string | null; role: string | null }> | null {
    const known = (memberships ?? [])
        .filter((membership) => Boolean(membership.lakeId))
        .slice(0, 3)
        .map((membership) => ({ lakeId: membership.lakeId ?? null, role: membership.role ?? null }));
    if (!success && known.length === 0) return null;
    if (known.length === 0) return [{ lakeId: null, role: null }];
    return known;
}

export function canViewStaffAudit(role: string | null | undefined): boolean {
    return role === "OWNER" || role === "MANAGER";
}

function stable(value: unknown): string {
    if (value === undefined) return "undefined";
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export function compactChange(
    before: JsonObject | null | undefined,
    after: JsonObject | null | undefined,
): { before: JsonObject | null; after: JsonObject | null } {
    const left = stripSensitive(before);
    const right = stripSensitive(after);
    if (!left && !right) return { before: null, after: null };
    if (!left) return { before: null, after: right };
    if (!right) return { before: left, after: null };

    const changedBefore: JsonObject = {};
    const changedAfter: JsonObject = {};
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
        if (stable(left[key]) === stable(right[key])) continue;
        if (Object.prototype.hasOwnProperty.call(left, key)) changedBefore[key] = left[key];
        if (Object.prototype.hasOwnProperty.call(right, key)) changedAfter[key] = right[key];
    }
    return {
        before: Object.keys(changedBefore).length > 0 ? changedBefore : null,
        after: Object.keys(changedAfter).length > 0 ? changedAfter : null,
    };
}

export function stripSensitive(value: JsonObject | null | undefined): JsonObject | null {
    if (!value) return null;
    const clean: JsonObject = {};
    for (const [key, entry] of Object.entries(value)) {
        if (SENSITIVE_KEY.test(key)) continue;
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            const nested = stripSensitive(entry as JsonObject);
            if (nested && Object.keys(nested).length > 0) clean[key] = nested;
            continue;
        }
        clean[key] = entry;
    }
    return Object.keys(clean).length > 0 ? clean : null;
}

function clip(value: string | null | undefined, max: number): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

type AuditClient = {
    auditEvent: {
        create: (args: { data: AuditEventRow }) => Promise<unknown>;
    };
};

/**
 * One insert. A payload mistake returns before any query, so a surrounding
 * transaction stays usable. Pass bestEffort outside a transaction.
 * Inside a transaction a failed INSERT already aborts Postgres, so the error
 * is rethrown and the action rolls back with the log.
 */
export async function writeStaffAudit(
    db: AuditClient,
    input: StaffAuditInput,
    options?: { bestEffort?: boolean },
): Promise<void> {
    let data: AuditEventRow;
    try {
        data = buildStaffAuditRow(input);
    } catch (error) {
        console.error("[audit] payload", input.action, error instanceof Error ? error.message : "failed");
        return;
    }

    try {
        await db.auditEvent.create({ data });
    } catch (error) {
        console.error("[audit] write", input.action, error instanceof Error ? error.message : "failed");
        if (!options?.bestEffort) throw error;
    }
}

export function buildStaffAuditRow(input: StaffAuditInput): AuditEventRow {
    const diff = compactChange(input.before, input.after);
    const extra = stripSensitive(input.extra) ?? {};
    const actorId = clip(input.createdBy, 80) || "anonymous";
    const payload: JsonObject = {
        ...extra,
        before: diff.before,
        after: diff.after,
        actor: {
            id: actorId,
            name: clip(input.actorName, 80),
            role: clip(input.actorRole, 32),
        },
    };
    const ip = clip(input.ip, 64);
    const userAgent = clip(input.userAgent, 160);
    if (ip) payload.ip = ip;
    if (userAgent) payload.ua = userAgent;

    let encoded = JSON.stringify(payload);
    if (encoded.length > MAX_PAYLOAD_CHARS) {
        delete payload.ua;
        delete payload.ip;
        encoded = JSON.stringify(payload);
    }
    if (encoded.length > MAX_PAYLOAD_CHARS) {
        encoded = JSON.stringify({
            before: payload.before ?? null,
            after: { truncated: true },
            actor: payload.actor,
        });
    }

    return {
        lakeId: input.lakeId ?? null,
        entityType: clip(input.entityType, 40) || "Unknown",
        entityId: clip(input.entityId, 80) || "unknown",
        action: clip(input.action, 64) || "UNKNOWN",
        payload: encoded,
        createdBy: actorId,
    };
}

function parseDay(value: string | null | undefined, end: boolean): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const suffix = end ? "T23:59:59.999+07:00" : "T00:00:00.000+07:00";
    const date = new Date(`${value}${suffix}`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatVnDate(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

export type AuditWhere = {
    lakeId: string;
    createdBy?: string;
    action?: string;
    createdAt: { gte: Date; lte: Date };
    AND?: Array<{ OR: Array<{ entityId: string } | { payload: { contains: string } }> }>;
};

/**
 * Always pins lakeId to the caller's pond. Filter fields cannot replace it.
 * Date window defaults to 7 days and never exceeds the 90-day retention window.
 */
export function buildAuditEventWhere(lakeId: string, filters: AuditListFilters = {}): {
    where: AuditWhere;
    from: string;
    to: string;
    clamped: boolean;
} {
    const pondId = lakeId.trim();
    if (!pondId) {
        throw new Error("lakeId is required");
    }

    const now = filters.now ?? new Date();
    const defaultFrom = new Date(now.getTime() - AUDIT_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    let from = parseDay(filters.from, false) ?? defaultFrom;
    let to = parseDay(filters.to, true) ?? now;
    if (from.getTime() > to.getTime()) {
        const swap = from;
        from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
        to = swap;
    }

    const maxSpan = AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let clamped = false;
    if (to.getTime() - from.getTime() > maxSpan) {
        from = new Date(to.getTime() - maxSpan);
        clamped = true;
    }

    const where: AuditWhere = {
        lakeId: pondId,
        createdAt: { gte: from, lte: to },
    };

    const actorId = filters.actorId?.trim() ?? "";
    if (actorId && ACTOR_PATTERN.test(actorId)) {
        where.createdBy = actorId;
    }
    const action = filters.action?.trim() ?? "";
    if (action && action !== "ALL" && ACTION_PATTERN.test(action)) {
        where.action = action;
    }
    const entityId = filters.entityId?.trim() ?? "";
    if (entityId && UUID_PATTERN.test(entityId)) {
        where.AND = [{
            OR: [
                { entityId },
                { payload: { contains: entityId } },
            ],
        }];
    }

    return {
        where,
        from: formatVnDate(from),
        to: formatVnDate(to),
        clamped,
    };
}

export type PresentedAudit = {
    id: string;
    createdAt: string;
    action: string;
    actionLabel: string;
    entityType: string;
    entityId: string;
    actorId: string;
    actorName: string | null;
    actorRole: string | null;
    before: JsonObject | null;
    after: JsonObject | null;
    legacy: JsonObject | null;
    ip: string | null;
    userAgent: string | null;
};

const ACTION_LABELS: Record<string, string> = {
    FISHING_SESSION_OPENED: "Mở phiên",
    FISHING_SESSION_COMPLETED: "Đóng phiên",
    FISHING_SESSION_CANCELLED: "Hủy phiên",
    FISHING_SESSION_EXTENDED: "Gia hạn",
    FISH_BUYBACK_CREATED: "Thu cá / trừ bill",
    INVOICE_CREATED: "Tạo hóa đơn",
    INVOICE_PREPAID: "Thu trước",
    INVOICE_PRODUCT_LINE_ADDED: "Sửa bill (thêm dòng)",
    INVOICE_PRODUCT_LINE_REMOVED: "Sửa bill (xóa dòng)",
    LOGIN_SUCCEEDED: "Đăng nhập thành công",
    LOGIN_FAILED: "Đăng nhập thất bại",
    AUDIT_READ_TOKEN_ROTATED: "Đổi token đọc nhật ký",
};

export function actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action.replaceAll("_", " ");
}

export function presentAuditEntry(row: {
    id: string;
    createdAt: Date;
    action: string;
    entityType: string;
    entityId: string;
    payload: string;
    createdBy: string;
}): PresentedAudit {
    let parsed: JsonObject = {};
    try {
        const value = JSON.parse(row.payload);
        if (value && typeof value === "object" && !Array.isArray(value)) {
            parsed = value as JsonObject;
        }
    } catch {
        parsed = { raw: row.payload.slice(0, 180) };
    }

    const before = parsed.before && typeof parsed.before === "object" && !Array.isArray(parsed.before)
        ? parsed.before as JsonObject
        : null;
    const after = parsed.after && typeof parsed.after === "object" && !Array.isArray(parsed.after)
        ? parsed.after as JsonObject
        : null;
    const actor = parsed.actor && typeof parsed.actor === "object" && !Array.isArray(parsed.actor)
        ? parsed.actor as JsonObject
        : null;

    const legacy: JsonObject = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (key === "before" || key === "after" || key === "actor" || key === "ip" || key === "ua") continue;
        legacy[key] = value;
    }

    return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        action: row.action,
        actionLabel: actionLabel(row.action),
        entityType: row.entityType,
        entityId: row.entityId,
        actorId: typeof actor?.id === "string" ? actor.id : row.createdBy,
        actorName: typeof actor?.name === "string" ? actor.name : null,
        actorRole: typeof actor?.role === "string" ? actor.role : null,
        before,
        after,
        legacy: Object.keys(legacy).length > 0 ? legacy : null,
        ip: typeof parsed.ip === "string" ? parsed.ip : null,
        userAgent: typeof parsed.ua === "string" ? parsed.ua : null,
    };
}

export function csvCell(value: unknown): string {
    const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
    const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
    if (/[",\n\r]/.test(guarded)) {
        return `"${guarded.replaceAll('"', '""')}"`;
    }
    return guarded;
}

export function auditsToCsv(rows: PresentedAudit[]): string {
    const header = ["createdAt", "actorId", "actorName", "actorRole", "action", "entityType", "entityId", "before", "after", "ip", "userAgent"];
    const lines = [header.join(",")];
    for (const row of rows) {
        lines.push([
            row.createdAt,
            row.actorId,
            row.actorName,
            row.actorRole,
            row.action,
            row.entityType,
            row.entityId,
            row.before,
            row.after,
            row.ip,
            row.userAgent,
        ].map(csvCell).join(","));
    }
    return lines.join("\n");
}

/** null when the header is absent. Empty string when it is present but not a pond token. */
export function parseBearerToken(header: string | null): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header.trim());
    if (!match?.[1]?.startsWith("qlh_")) return "";
    return match[1];
}

export function hashAuditReadToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function generateAuditReadToken(): string {
    return `qlh_${randomBytes(32).toString("base64url")}`;
}

export const AUDIT_ACTION_OPTIONS = [
    { value: "ALL", label: "Mọi thao tác" },
    { value: "FISHING_SESSION_OPENED", label: "Mở phiên" },
    { value: "FISHING_SESSION_COMPLETED", label: "Đóng phiên" },
    { value: "FISHING_SESSION_CANCELLED", label: "Hủy phiên" },
    { value: "FISHING_SESSION_EXTENDED", label: "Gia hạn" },
    { value: "FISH_BUYBACK_CREATED", label: "Thu cá / trừ bill" },
    { value: "INVOICE_PRODUCT_LINE_ADDED", label: "Sửa bill (thêm)" },
    { value: "INVOICE_PRODUCT_LINE_REMOVED", label: "Sửa bill (xóa dòng)" },
    { value: "INVOICE_CREATED", label: "Tạo hóa đơn" },
    { value: "LOGIN_SUCCEEDED", label: "Đăng nhập thành công" },
    { value: "LOGIN_FAILED", label: "Đăng nhập thất bại" },
] as const;
