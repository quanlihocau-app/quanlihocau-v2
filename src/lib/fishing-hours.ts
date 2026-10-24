/**
 * Fishing time comes from when the session started and when it ended.
 * An open session counts up to `now`, and only the part inside the report
 * window is included. A missing end time is not treated as zero hours.
 */

export function fishingSpan(input: {
    startAt: Date | string;
    endedAt?: Date | string | null;
    plannedEndAt?: Date | string | null;
    status: string;
    now: Date | string;
    windowFrom?: Date | string | null;
    windowTo?: Date | string | null;
}): { minutes: number; overtimeMinutes: number } {
    const startMs = new Date(input.startAt).getTime();
    const nowMs = new Date(input.now).getTime();
    const endedMs = input.endedAt ? new Date(input.endedAt).getTime() : Number.NaN;
    const plannedMs = input.plannedEndAt ? new Date(input.plannedEndAt).getTime() : Number.NaN;
    const open = input.status === "ACTIVE";

    let endMs: number;
    if (open) endMs = nowMs;
    else if (Number.isFinite(endedMs)) endMs = endedMs;
    else if (Number.isFinite(plannedMs)) endMs = plannedMs;
    else endMs = nowMs;

    let fromMs = startMs;
    let toMs = endMs;
    if (input.windowFrom) fromMs = Math.max(fromMs, new Date(input.windowFrom).getTime());
    if (input.windowTo) toMs = Math.min(toMs, new Date(input.windowTo).getTime());
    toMs = Math.min(toMs, nowMs);

    const minutes = Number.isFinite(fromMs) && Number.isFinite(toMs)
        ? Math.max(0, Math.round((toMs - fromMs) / 60000))
        : 0;

    let overtimeMinutes = 0;
    if (Number.isFinite(plannedMs) && endMs > plannedMs) {
        let overtimeFrom = plannedMs;
        let overtimeTo = endMs;
        if (input.windowFrom) overtimeFrom = Math.max(overtimeFrom, new Date(input.windowFrom).getTime());
        if (input.windowTo) overtimeTo = Math.min(overtimeTo, new Date(input.windowTo).getTime());
        overtimeTo = Math.min(overtimeTo, nowMs);
        overtimeMinutes = Math.max(0, Math.round((overtimeTo - overtimeFrom) / 60000));
    }

    return { minutes, overtimeMinutes };
}

export function fishingHoursFromMinutes(minutes: number): number {
    return Math.round((minutes / 60) * 10) / 10;
}
