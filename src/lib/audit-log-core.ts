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
    notification?: {
        create: (args: { data: { lakeId?: string | null; title?: string | null; body?: string | null; read?: boolean } }) => Promise<unknown>;
    };
};

export type AuditRiskLevel = "NORMAL" | "ATTENTION" | "SUSPICIOUS";

export function assessAuditRisk(input: {
    action: string;
    actorRole?: string | null;
    createdAt?: Date | string | null;
    before?: JsonObject | null;
    after?: JsonObject | null;
    extra?: JsonObject | null;
}): { level: AuditRiskLevel; reason: string | null } {
    const role = (input.actorRole ?? "").toUpperCase();
    const action = input.action;

    let isNightTime = false;
    if (input.createdAt) {
        try {
            const date = new Date(input.createdAt);
            const vnHour = (date.getUTCHours() + 7) % 24;
            if (vnHour >= 23 || vnHour < 5) {
                isNightTime = true;
            }
        } catch {}
    }

    if (action === "INVOICE_VOIDED") {
        if (role === "STAFF" || role === "MANAGER") {
            return { level: "SUSPICIOUS", reason: "Nhân viên hủy hóa đơn đã tạo" };
        }
        if (isNightTime) {
            return { level: "SUSPICIOUS", reason: "Hủy hóa đơn ngoài giờ hoạt động" };
        }
        return { level: "ATTENTION", reason: "Hủy hóa đơn" };
    }

    if (action === "INVOICE_PRODUCT_LINE_REMOVED") {
        if (role === "STAFF") {
            return { level: "SUSPICIOUS", reason: "Nhân viên xóa món / gỡ sản phẩm khỏi bill" };
        }
        return { level: "ATTENTION", reason: "Gỡ sản phẩm khỏi hóa đơn" };
    }

    if (action === "FISHING_SESSION_CANCELLED") {
        if (role === "STAFF" || role === "MANAGER") {
            return { level: "SUSPICIOUS", reason: "Hủy phiên câu đang diễn ra" };
        }
        return { level: "ATTENTION", reason: "Hủy phiên câu" };
    }

    if (action === "EXPENSE_CREATED") {
        if (role === "STAFF") {
            return { level: "SUSPICIOUS", reason: "Nhân viên tự tạo phiếu chi rút tiền két" };
        }
        return { level: "NORMAL", reason: null };
    }

    if (action === "PAYMENT_REVERSED") {
        return { level: "SUSPICIOUS", reason: "Hoàn / đảo tiền thanh toán" };
    }

    if (action === "PRODUCT_UPDATED" || action === "PACKAGE_UPDATED") {
        if (role === "STAFF") {
            return { level: "SUSPICIOUS", reason: "Nhân viên sửa biểu giá niêm yết" };
        }
        return { level: "ATTENTION", reason: "Thay đổi biểu giá niêm yết" };
    }

    if (action === "LOGIN_FAILED") {
        return { level: "ATTENTION", reason: "Đăng nhập thất bại" };
    }

    return { level: "NORMAL", reason: null };
}

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

        const risk = assessAuditRisk({
            action: input.action,
            actorRole: input.actorRole,
            before: input.before,
            after: input.after,
            extra: input.extra,
        });

        if (risk.level === "SUSPICIOUS" && input.lakeId && db.notification) {
            try {
                await db.notification.create({
                    data: {
                        lakeId: input.lakeId,
                        title: `⚠️ Cảnh báo: ${risk.reason ?? actionLabel(input.action)}`,
                        body: `${input.actorName || "Nhân viên"} (${input.actorRole || "STAFF"}) vừa ${actionLabel(input.action).toLowerCase()} trên ${input.entityType} #${input.entityId.slice(0, 8)}`,
                        read: false,
                    },
                });
            } catch (notifErr) {
                console.error("[audit] auto notification skipped:", notifErr);
            }
        }
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
    riskLevel?: AuditRiskLevel;
    riskReason?: string | null;
};

const ACTION_LABELS: Record<string, string> = {
    FISHING_SESSION_OPENED: "Mở phiên",
    FISHING_SESSION_COMPLETED: "Đóng phiên",
    FISHING_SESSION_CANCELLED: "Hủy phiên câu",
    FISHING_SESSION_EXTENDED: "Gia hạn giờ câu",
    FISHING_SESSION_SPOT_CHANGED: "Đổi ô số câu",
    FISH_BUYBACK_CREATED: "Thu cá / trừ bill",
    INVOICE_CREATED: "Tạo hóa đơn",
    INVOICE_PREPAID: "Thu tiền trước",
    INVOICE_PRODUCT_LINE_ADDED: "Sửa bill (thêm món)",
    INVOICE_PRODUCT_LINE_REMOVED: "Sửa bill (xóa món)",
    INVOICE_VOIDED: "Hủy hóa đơn",
    RECEIPT_CREATED: "Tạo phiếu thu tiền",
    RECEIPT_UPDATED: "Sửa phiếu thu tiền",
    EXPENSE_CREATED: "Tạo phiếu chi tiền",
    EXPENSE_UPDATED: "Sửa phiếu chi tiền",
    PRODUCT_UPDATED: "Sửa giá / sản phẩm",
    PACKAGE_UPDATED: "Sửa giá / gói câu",
    PAYMENT_REVERSED: "Hoàn / đảo tiền thanh toán",
    RETAIL_SALE_COMPLETED: "Bán lẻ dịch vụ",
    PAYMENT_RECORDED: "Thu tiền hóa đơn",
    SHIFT_CLOSED: "Chốt ca bàn giao quỹ",
    SHIFT_OPENED: "Mở ca trực mới",
    INVENTORY_MOVEMENT_CREATED: "Xuất / nhập kho",
    INVENTORY_OUT: "Xuất kho sản phẩm",
    INVENTORY_IN: "Nhập kho sản phẩm",
    STOCK_ADJUSTED: "Điều chỉnh tồn kho",
    APPROVAL_REQUESTED: "Gửi yêu cầu phê duyệt",
    APPROVAL_REVIEWED: "Xử lý duyệt yêu cầu",
    REQUEST_EXPENSE: "Yêu cầu duyệt chi tiền",
    REQUEST_INVOICE_VOID: "Yêu cầu duyệt hủy đơn",
    REQUEST_PRICE_OVERRIDE: "Yêu cầu duyệt sửa giá",
    REQUEST_INVENTORY_OUT: "Yêu cầu duyệt xuất kho",
    MEMBER_CREATED: "Tạo tài khoản nhân sự",
    MEMBER_ROLE_UPDATED: "Đổi phân quyền nhân sự",
    MEMBER_DEACTIVATED: "Vô hiệu hóa nhân sự",
    MEMBER_PASSWORD_RESET: "Đặt lại mật khẩu nhân sự",
    LAKE_ROLE_PERMISSIONS_UPDATED: "Cập nhật bảng phân quyền",
    LOGIN_SUCCEEDED: "Đăng nhập thành công",
    LOGIN_FAILED: "Đăng nhập thất bại",
    AUDIT_READ_TOKEN_ROTATED: "Đổi token đọc nhật ký",
};

export function actionLabel(action: string): string {
    const normalized = action.trim().toUpperCase().replaceAll(" ", "_");
    return ACTION_LABELS[normalized] ?? ACTION_LABELS[action] ?? action.replaceAll("_", " ");
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

    const actorRole = typeof actor?.role === "string" ? actor.role : null;
    const risk = assessAuditRisk({
        action: row.action,
        actorRole,
        createdAt: row.createdAt,
        before,
        after,
        extra: legacy,
    });

    return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        action: row.action,
        actionLabel: actionLabel(row.action),
        entityType: row.entityType,
        entityId: row.entityId,
        actorId: typeof actor?.id === "string" ? actor.id : row.createdBy,
        actorName: typeof actor?.name === "string" ? actor.name : null,
        actorRole,
        before,
        after,
        legacy: Object.keys(legacy).length > 0 ? legacy : null,
        ip: typeof parsed.ip === "string" ? parsed.ip : null,
        userAgent: typeof parsed.ua === "string" ? parsed.ua : null,
        riskLevel: risk.level,
        riskReason: risk.reason,
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
    { value: "SUSPICIOUS_ONLY", label: "⚠️ Chỉ xem đáng nghi / Cảnh báo" },
    { value: "INVOICE_VOIDED", label: "Hủy hóa đơn" },
    { value: "INVOICE_PRODUCT_LINE_REMOVED", label: "Xóa món trên bill" },
    { value: "INVOICE_PRODUCT_LINE_ADDED", label: "Thêm món vào bill" },
    { value: "FISHING_SESSION_CANCELLED", label: "Hủy phiên câu" },
    { value: "FISHING_SESSION_OPENED", label: "Mở phiên" },
    { value: "FISHING_SESSION_COMPLETED", label: "Đóng phiên" },
    { value: "FISHING_SESSION_EXTENDED", label: "Gia hạn" },
    { value: "EXPENSE_CREATED", label: "Phiếu chi tiền" },
    { value: "PRODUCT_UPDATED", label: "Sửa giá / sản phẩm" },
    { value: "PACKAGE_UPDATED", label: "Sửa giá / gói câu" },
    { value: "FISH_BUYBACK_CREATED", label: "Thu cá / trừ bill" },
    { value: "LOGIN_FAILED", label: "Đăng nhập thất bại" },
] as const;
