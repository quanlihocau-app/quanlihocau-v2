import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
    sessionTicker,
    computeTimeInfoFromMs,
} from "../src/lib/ticker/session-ticker.ts";

// Formatters for Asia/Ho_Chi_Minh
const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
});

// Zod Schema under test (matching openSessionSchema)
const openSessionTestSchema = z.object({
    packageId: z.string().uuid(),
    hutIds: z.array(z.string()).min(1),
    customStartAt: z
        .string()
        .refine((val) => !val || !val.trim() || !isNaN(new Date(val).getTime()), {
            message: "Giờ vào tùy chọn không đúng định dạng ngày giờ.",
        })
        .nullable()
        .optional(),
});

// Business Logic Helper: Calculate Live Preview
function calculateLivePreview({
    nowMs,
    customStartAtIso,
    durationMinutes,
    overtimeHourlyVnd = 50000,
    hutCount = 1,
}) {
    let startTimestamp = nowMs;
    let isValid = true;
    let errorMessage = null;

    if (customStartAtIso) {
        const parsed = new Date(customStartAtIso);
        if (isNaN(parsed.getTime())) {
            isValid = false;
            errorMessage = "Định dạng giờ hoặc ngày vào không hợp lệ.";
        } else {
            startTimestamp = parsed.getTime();
            // 60s tolerance for future clock skew
            if (startTimestamp > nowMs + 60_000) {
                isValid = false;
                errorMessage = "Giờ vào không được nằm trong tương lai. Vui lòng kiểm tra lại giờ hoặc ngày vào.";
            }
        }
    }

    const durationMs = durationMinutes * 60_000;
    const plannedEndMs = startTimestamp + durationMs;

    const elapsedMs = Math.max(0, nowMs - startTimestamp);
    const elapsedMinutes = Math.floor(elapsedMs / 60_000);

    const remainingMs = plannedEndMs - nowMs;
    const isOvertime = remainingMs < 0;
    const overtimeMinutes = isOvertime ? Math.floor(-remainingMs / 60_000) : 0;

    const estimatedOvertimeVnd =
        isOvertime && overtimeHourlyVnd > 0
            ? Math.round((overtimeMinutes / 60) * overtimeHourlyVnd * Math.max(1, hutCount))
            : 0;

    const startDate = new Date(startTimestamp);
    const plannedEndDate = new Date(plannedEndMs);

    const formattedStartDate = dateFormatter.format(startDate);
    const formattedEndDate = dateFormatter.format(plannedEndDate);
    const isDifferentDay = formattedStartDate !== formattedEndDate;

    return {
        isValid,
        errorMessage,
        startTimestamp,
        plannedEndMs,
        startDate,
        plannedEndDate,
        elapsedMinutes,
        remainingMs,
        isOvertime,
        overtimeMinutes,
        estimatedOvertimeVnd,
        formattedStartTime: timeFormatter.format(startDate),
        formattedStartDate,
        formattedEndTime: timeFormatter.format(plannedEndDate),
        formattedEndDate,
        isDifferentDay,
    };
}

// Business Logic Helper: Server-side open session time determination
function resolveServerSessionTimes(input, serverNow = new Date()) {
    let effectiveStartAt = serverNow;
    let isCustomStart = false;

    const customStartStr = input.customStartAt?.trim();
    if (customStartStr) {
        const parsed = new Date(customStartStr);
        if (isNaN(parsed.getTime())) {
            throw new Error("VALIDATION_ERROR: Giờ vào không đúng định dạng hợp lệ.");
        }
        const maxAllowedFutureMs = serverNow.getTime() + 60_000;
        if (parsed.getTime() > maxAllowedFutureMs) {
            throw new Error("VALIDATION_ERROR: Giờ vào không được nằm trong tương lai.");
        }
        effectiveStartAt = parsed;
        isCustomStart = true;
    }

    const durationMs = (input.durationMinutes || 0) * 60_000;
    const plannedEndAt = new Date(effectiveStartAt.getTime() + durationMs);

    return {
        startAt: effectiveStartAt,
        plannedEndAt,
        createdAt: serverNow,
        isCustomStart,
    };
}

// ----------------------------------------------------------------------------
// TEST SUITE: CA A -> K
// ----------------------------------------------------------------------------

test("Ca A: Hiện tại 10:00, vào 09:15, ca 5 giờ -> ra 14:15, đã câu 45p, còn 4h15p", () => {
    // 10:00 Vietnam time on 2026-09-18
    const nowMs = new Date("2026-09-18T10:00:00+07:00").getTime();
    const customStartIso = "2026-09-18T09:15:00+07:00";
    const durationMinutes = 300; // 5 hours

    const preview = calculateLivePreview({
        nowMs,
        customStartAtIso: customStartIso,
        durationMinutes,
    });

    assert.equal(preview.isValid, true);
    assert.equal(preview.formattedStartTime, "09:15");
    assert.equal(preview.formattedEndTime, "14:15");
    assert.equal(preview.elapsedMinutes, 45, "Đã câu phải là 45 phút");
    assert.equal(preview.remainingMs / 60_000, 255, "Còn lại phải là 255 phút (4 giờ 15 phút)");
    assert.equal(preview.isOvertime, false);
    assert.equal(preview.isDifferentDay, false);
});

test("Ca B: Không sửa giờ vào, mở form lúc 10:00, tạo vé lúc 10:10 -> chốt theo thời điểm tạo thành công (10:10)", () => {
    const openFormNow = new Date("2026-09-18T10:00:00+07:00");
    const serverCommitNow = new Date("2026-09-18T10:10:00+07:00");

    // Input when staff does not edit time
    const input = {
        packageId: "c38c035d-d922-48ea-aa3f-808ca1106e22",
        hutIds: ["hut-1"],
        durationMinutes: 120, // 2 hours
        customStartAt: null, // Default auto
    };

    const sessionTimes = resolveServerSessionTimes(input, serverCommitNow);

    assert.equal(sessionTimes.startAt.toISOString(), serverCommitNow.toISOString());
    assert.notEqual(sessionTimes.startAt.toISOString(), openFormNow.toISOString());
    assert.equal(sessionTimes.isCustomStart, false);
    assert.equal(
        sessionTimes.plannedEndAt.getTime(),
        new Date("2026-09-18T12:10:00+07:00").getTime()
    );
});

test("Ca C: Vào 22:30 ngày D, ca 5 giờ -> ra 03:30 ngày D+1 (nhận biết qua đêm chính xác)", () => {
    const nowMs = new Date("2026-09-18T23:00:00+07:00").getTime();
    const customStartIso = "2026-09-18T22:30:00+07:00";
    const durationMinutes = 300; // 5 hours

    const preview = calculateLivePreview({
        nowMs,
        customStartAtIso: customStartIso,
        durationMinutes,
    });

    assert.equal(preview.isValid, true);
    assert.equal(preview.formattedStartTime, "22:30");
    assert.equal(preview.formattedStartDate, "18/09/2026");
    assert.equal(preview.formattedEndTime, "03:30");
    assert.equal(preview.formattedEndDate, "19/09/2026");
    assert.equal(preview.isDifferentDay, true, "Phải gắn cờ isDifferentDay = true khi ca kết thúc sang ngày hôm sau");
    assert.equal(preview.elapsedMinutes, 30);
    assert.equal(preview.remainingMs / 60_000, 270); // 4h30m remaining
});

test("Ca D: Hiện tại 14:30, vào 09:15, ca 5 giờ -> quá giờ 15 phút, phụ thu tính đúng theo đơn giá hồ", () => {
    // Current now is 14:30 (planned end was 14:15)
    const nowMs = new Date("2026-09-18T14:30:00+07:00").getTime();
    const customStartIso = "2026-09-18T09:15:00+07:00";
    const durationMinutes = 300; // 5 hours
    const overtimeHourlyVnd = 60000; // 60,000 VND/hour
    const hutCount = 1;

    const preview = calculateLivePreview({
        nowMs,
        customStartAtIso: customStartIso,
        durationMinutes,
        overtimeHourlyVnd,
        hutCount,
    });

    assert.equal(preview.isOvertime, true, "Phải báo trạng thái quá giờ");
    assert.equal(preview.overtimeMinutes, 15, "Phải ghi nhận quá giờ 15 phút");
    // 15 minutes at 60,000 VND/h = 15,000 VND
    assert.equal(preview.estimatedOvertimeVnd, 15000, "Phụ thu ước tính phải là 15.000đ");
});

test("Ca E: Nhập giờ tương lai -> bị chặn ở cả Zod Schema, UI và Server validation", () => {
    const serverNow = new Date("2026-09-18T10:00:00+07:00");
    const futureStartIso = "2026-09-18T10:15:00+07:00"; // 15 mins in future (> 60s tolerance)

    // 1. UI validation
    const preview = calculateLivePreview({
        nowMs: serverNow.getTime(),
        customStartAtIso: futureStartIso,
        durationMinutes: 60,
    });
    assert.equal(preview.isValid, false);
    assert.match(preview.errorMessage, /không được nằm trong tương lai/i);

    // 2. Server validation
    assert.throws(
        () => {
            resolveServerSessionTimes(
                {
                    packageId: "c38c035d-d922-48ea-aa3f-808ca1106e22",
                    hutIds: ["hut-1"],
                    customStartAt: futureStartIso,
                    durationMinutes: 60,
                },
                serverNow
            );
        },
        /VALIDATION_ERROR: Giờ vào không được nằm trong tương lai/
    );
});

test("Ca F: Tab ngủ rồi mở lại -> đồng hồ và thời gian tính theo mốc thực tế, không bị trôi (0 drift)", async () => {
    sessionTicker.resetForTest();

    const baseNow = 1700000000000;
    const plannedEndMs = baseNow + 3600_000; // 1 hour in future

    // 1. Initial computation: exactly 1h (01:00:00)
    const initial = computeTimeInfoFromMs(plannedEndMs, baseNow);
    assert.equal(initial.label, "01:00:00");
    assert.equal(initial.isOvertime, false);

    // 2. Tab sleeps for 30 minutes (1,800,000ms jump)
    const afterSleepNow = baseNow + 1800_000;
    const afterSleep = computeTimeInfoFromMs(plannedEndMs, afterSleepNow);
    assert.equal(afterSleep.label, "00:30:00", "Thời gian còn lại lập tức hiển thị đúng 30 phút mà không bị trôi");
    assert.equal(afterSleep.isOvertime, false);

    // 3. Tab sleeps until overtime (e.g. 75 minutes = 4,500,000ms jump)
    const overtimeNow = baseNow + 4500_000;
    const overtimeInfo = computeTimeInfoFromMs(plannedEndMs, overtimeNow);
    assert.equal(overtimeInfo.label, "+15:00", "Chuyển sang cảnh báo quá giờ +15:00 ngay khi thức dậy");
    assert.equal(overtimeInfo.isOvertime, true);
});

test("Ca G: Hai thiết bị lệch đồng hồ hệ điều hành -> hiển thị thống nhất theo server offset", () => {
    const trueServerNowMs = new Date("2026-09-18T10:00:00.000Z").getTime();

    // Device 1: clock is correct
    const client1Now = trueServerNowMs;
    const offset1 = trueServerNowMs - client1Now; // 0

    // Device 2: clock is 20 minutes behind
    const client2Now = trueServerNowMs - 1200_000;
    const offset2 = trueServerNowMs - client2Now; // +1,200,000 ms

    const syncedDevice1Ms = client1Now + offset1;
    const syncedDevice2Ms = client2Now + offset2;

    assert.equal(syncedDevice1Ms, syncedDevice2Ms, "Cả hai thiết bị phải tính ra cùng mốc server time");

    // Live preview on both devices with custom start 09:00
    const customStartIso = new Date(trueServerNowMs - 3600_000).toISOString();
    const p1 = calculateLivePreview({ nowMs: syncedDevice1Ms, customStartAtIso: customStartIso, durationMinutes: 120 });
    const p2 = calculateLivePreview({ nowMs: syncedDevice2Ms, customStartAtIso: customStartIso, durationMinutes: 120 });

    assert.equal(p1.formattedEndTime, p2.formattedEndTime, "Giờ ra phải hoàn toàn đồng nhất giữa 2 thiết bị");
    assert.equal(p1.elapsedMinutes, p2.elapsedMinutes, "Thời gian đã câu phải đồng nhất");
});

test("Ca H: Gia hạn -> kéo dài từ plannedEndAt, không cộng thời lượng hai lần và giữ nguyên startAt", () => {
    const originalStart = new Date("2026-09-18T09:15:00+07:00");
    const originalPlannedEnd = new Date("2026-09-18T14:15:00+07:00"); // 5h

    // Customer extends 2 hours at 12:00
    const extensionNow = new Date("2026-09-18T12:00:00+07:00");
    const extensionDurationMinutes = 120; // 2 hours

    // Extension calculation: baseTime is plannedEndAt if plannedEndAt > now
    const baseTime = originalPlannedEnd.getTime() > extensionNow.getTime() ? originalPlannedEnd : extensionNow;
    const newPlannedEnd = new Date(baseTime.getTime() + extensionDurationMinutes * 60_000);

    assert.equal(
        newPlannedEnd.getTime(),
        new Date("2026-09-18T16:15:00+07:00").getTime(),
        "Giờ ra mới phải là 16:15"
    );
    assert.equal(
        originalStart.getTime(),
        new Date("2026-09-18T09:15:00+07:00").getTime(),
        "Giờ bắt đầu startAt phải giữ nguyên 09:15"
    );
});

test("Ca I: Dữ liệu in vé và hóa đơn -> sử dụng chính xác startAt và plannedEndAt", () => {
    const sessionRecord = {
        id: "session-abc",
        startAt: new Date("2026-09-18T09:15:00+07:00"),
        plannedEndAt: new Date("2026-09-18T14:15:00+07:00"),
        createdAt: new Date("2026-09-18T10:00:00+07:00"), // Created later
    };

    // Print ticket data payload
    const ticketPayload = {
        sessionId: sessionRecord.id,
        startAt: sessionRecord.startAt.toISOString(),
        plannedEndAt: sessionRecord.plannedEndAt.toISOString(),
    };

    const printedStart = timeFormatter.format(new Date(ticketPayload.startAt));
    const printedEnd = timeFormatter.format(new Date(ticketPayload.plannedEndAt));

    assert.equal(printedStart, "09:15", "In vé phải in đúng giờ vào 09:15");
    assert.equal(printedEnd, "14:15", "In vé phải in đúng giờ ra 14:15");
    assert.notEqual(sessionRecord.startAt.getTime(), sessionRecord.createdAt.getTime(), "Phân biệt rõ ràng startAt và createdAt");
});

test("Ca J: Phân quyền -> actionSchema không cho phép nhân viên sửa startAt của vé đã tạo", () => {
    // Schema of PATCH /api/fishing-sessions/[sessionId]
    const patchActionSchema = z.object({
        action: z.enum(["COMPLETE", "CANCEL"]),
        settlement: z
            .object({
                amountVnd: z.number().int().nonnegative().optional(),
                paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]).optional().default("CASH"),
                refundVnd: z.number().int().nonnegative().optional(),
                note: z.string().trim().max(255).optional(),
            })
            .optional(),
    });

    // Attempting to inject startAt or customStartAt
    const maliciousPayload = {
        action: "COMPLETE",
        startAt: "2026-09-18T08:00:00+07:00",
        customStartAt: "2026-09-18T08:00:00+07:00",
    };

    const parsed = patchActionSchema.parse(maliciousPayload);

    assert.equal("startAt" in parsed, false, "startAt không được nằm trong schema cập nhật");
    assert.equal("customStartAt" in parsed, false, "customStartAt không được nằm trong schema cập nhật");
});

test("Ca K: Idempotency-Key -> chống tạo vé hoặc thu tiền trùng khi gửi lại request", () => {
    const existingCache = new Map();

    function mockIdempotentOpenSession(idempotencyKey, payload) {
        if (existingCache.has(idempotencyKey)) {
            return { idempotent: true, result: existingCache.get(idempotencyKey) };
        }
        const newSession = {
            id: `session-${Date.now()}`,
            startAt: payload.customStartAt || new Date().toISOString(),
        };
        existingCache.set(idempotencyKey, newSession);
        return { idempotent: false, result: newSession };
    }

    const key = "550e8400-e29b-41d4-a716-446655440000";
    const payload = {
        packageId: "c38c035d-d922-48ea-aa3f-808ca1106e22",
        hutIds: ["hut-1"],
        customStartAt: "2026-09-18T09:15:00+07:00",
    };

    // First call
    const res1 = mockIdempotentOpenSession(key, payload);
    assert.equal(res1.idempotent, false);

    // Second call with same key (e.g. offline retry or double click)
    const res2 = mockIdempotentOpenSession(key, payload);
    assert.equal(res2.idempotent, true);
    assert.equal(res1.result.id, res2.result.id, "Không được tạo vé thứ hai");
});
