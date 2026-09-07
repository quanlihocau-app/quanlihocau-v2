// Date Utilities for Reporting System in Asia/Ho_Chi_Minh (UTC+7)

export type DatePreset =
    | "today"
    | "yesterday"
    | "last7days"
    | "last30days"
    | "thisWeek"
    | "lastWeek"
    | "thisMonth"
    | "lastMonth"
    | "thisQuarter"
    | "lastQuarter"
    | "thisYear"
    | "lastYear"
    | "allTime"
    | "custom";

export type CompareMode =
    | "none"
    | "previousPeriod"
    | "samePeriodLastMonth"
    | "samePeriodLastQuarter"
    | "samePeriodLastYear"
    | "custom";

export interface DateRange {
    from: Date;
    to: Date;
    label: string;
}

const VN_TIMEZONE_OFFSET_HOURS = 7;

/**
 * Creates a Date in UTC that corresponds to yyyy-mm-dd hh:mm:ss in Asia/Ho_Chi_Minh (+07:00)
 */
export function createVnDate(
    year: number,
    month: number, // 1-indexed (1 = Jan, 12 = Dec)
    day: number,
    hours = 0,
    minutes = 0,
    seconds = 0,
    ms = 0
): Date {
    return new Date(Date.UTC(year, month - 1, day, hours - VN_TIMEZONE_OFFSET_HOURS, minutes, seconds, ms));
}

/**
 * Extracts VN year, month (1-indexed), day, hours, minutes, seconds from a given UTC Date
 */
export function getVnParts(date: Date) {
    // Shift by +7 hours to inspect local VN components
    const vnTime = new Date(date.getTime() + VN_TIMEZONE_OFFSET_HOURS * 3600 * 1000);
    return {
        year: vnTime.getUTCFullYear(),
        month: vnTime.getUTCMonth() + 1, // 1-indexed
        day: vnTime.getUTCDate(),
        hours: vnTime.getUTCHours(),
        minutes: vnTime.getUTCMinutes(),
        seconds: vnTime.getUTCSeconds(),
        dayOfWeek: vnTime.getUTCDay(), // 0 = Sun, 1 = Mon ...
    };
}

/**
 * Format a Date to "YYYY-MM-DD" in VN time
 */
export function formatVnDateInput(date: Date): string {
    const p = getVnParts(date);
    const mm = String(p.month).padStart(2, "0");
    const dd = String(p.day).padStart(2, "0");
    return `${p.year}-${mm}-${dd}`;
}

/**
 * Format a Date to "HH:mm" in VN time
 */
export function formatVnTimeInput(date: Date): string {
    const p = getVnParts(date);
    const hh = String(p.hours).padStart(2, "0");
    const mi = String(p.minutes).padStart(2, "0");
    return `${hh}:${mi}`;
}

/**
 * Format Date to "dd/MM/yyyy"
 */
export function formatVnDateDisplay(date: Date): string {
    const p = getVnParts(date);
    const mm = String(p.month).padStart(2, "0");
    const dd = String(p.day).padStart(2, "0");
    return `${dd}/${mm}/${p.year}`;
}

/**
 * Format Date to "dd/MM/yyyy HH:mm"
 */
export function formatVnDateTimeDisplay(date: Date): string {
    const p = getVnParts(date);
    const mm = String(p.month).padStart(2, "0");
    const dd = String(p.day).padStart(2, "0");
    const hh = String(p.hours).padStart(2, "0");
    const mi = String(p.minutes).padStart(2, "0");
    return `${dd}/${mm}/${p.year} ${hh}:${mi}`;
}

/**
 * Format integer VND with dot grouping (e.g. 1.250.000 đ)
 */
export function formatVnd(amount: number): string {
    if (!Number.isFinite(amount)) return "0 đ";
    const rounded = Math.round(amount);
    return `${new Intl.NumberFormat("vi-VN").format(rounded)} đ`;
}

/**
 * Calculate DateRange for preset based on reference Date (default now)
 */
export function getDateRangeForPreset(
    preset: DatePreset,
    referenceDate = new Date(),
    customFrom?: string, // YYYY-MM-DD or ISO
    customTo?: string,   // YYYY-MM-DD or ISO
    customFromTime = "00:00",
    customToTime = "23:59"
): DateRange {
    const p = getVnParts(referenceDate);
    const year = p.year;
    const month = p.month;
    const day = p.day;

    switch (preset) {
        case "today": {
            const from = createVnDate(year, month, day, 0, 0, 0, 0);
            const to = createVnDate(year, month, day, 23, 59, 59, 999);
            return { from, to, label: "Hôm nay" };
        }
        case "yesterday": {
            const yesterdayRef = new Date(createVnDate(year, month, day, 12, 0, 0).getTime() - 86400 * 1000);
            const yp = getVnParts(yesterdayRef);
            const from = createVnDate(yp.year, yp.month, yp.day, 0, 0, 0, 0);
            const to = createVnDate(yp.year, yp.month, yp.day, 23, 59, 59, 999);
            return { from, to, label: "Hôm qua" };
        }
        case "last7days": {
            // 7 days ending today
            const fromRef = new Date(createVnDate(year, month, day, 0, 0, 0).getTime() - 6 * 86400 * 1000);
            const fp = getVnParts(fromRef);
            const from = createVnDate(fp.year, fp.month, fp.day, 0, 0, 0, 0);
            const to = createVnDate(year, month, day, 23, 59, 59, 999);
            return { from, to, label: "7 ngày qua" };
        }
        case "last30days": {
            // 30 days ending today
            const fromRef = new Date(createVnDate(year, month, day, 0, 0, 0).getTime() - 29 * 86400 * 1000);
            const fp = getVnParts(fromRef);
            const from = createVnDate(fp.year, fp.month, fp.day, 0, 0, 0, 0);
            const to = createVnDate(year, month, day, 23, 59, 59, 999);
            return { from, to, label: "30 ngày qua" };
        }
        case "thisWeek": {
            // Monday to Sunday (ISO week in Vietnam)
            // dayOfWeek: 0 = Sun, 1 = Mon ...
            const dayOffset = p.dayOfWeek === 0 ? 6 : p.dayOfWeek - 1;
            const monRef = new Date(createVnDate(year, month, day, 0, 0, 0).getTime() - dayOffset * 86400 * 1000);
            const mp = getVnParts(monRef);
            const sunRef = new Date(monRef.getTime() + 6 * 86400 * 1000);
            const sp = getVnParts(sunRef);
            const from = createVnDate(mp.year, mp.month, mp.day, 0, 0, 0, 0);
            const to = createVnDate(sp.year, sp.month, sp.day, 23, 59, 59, 999);
            return { from, to, label: "Tuần này" };
        }
        case "lastWeek": {
            const dayOffset = p.dayOfWeek === 0 ? 6 : p.dayOfWeek - 1;
            const lastMonRef = new Date(createVnDate(year, month, day, 0, 0, 0).getTime() - (dayOffset + 7) * 86400 * 1000);
            const mp = getVnParts(lastMonRef);
            const lastSunRef = new Date(lastMonRef.getTime() + 6 * 86400 * 1000);
            const sp = getVnParts(lastSunRef);
            const from = createVnDate(mp.year, mp.month, mp.day, 0, 0, 0, 0);
            const to = createVnDate(sp.year, sp.month, sp.day, 23, 59, 59, 999);
            return { from, to, label: "Tuần trước" };
        }
        case "thisMonth": {
            const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
            const from = createVnDate(year, month, 1, 0, 0, 0, 0);
            const to = createVnDate(year, month, lastDay, 23, 59, 59, 999);
            return { from, to, label: `Tháng ${month}/${year}` };
        }
        case "lastMonth": {
            const lastMonthY = month === 1 ? year - 1 : year;
            const lastMonthM = month === 1 ? 12 : month - 1;
            const lastDay = new Date(Date.UTC(lastMonthY, lastMonthM, 0)).getUTCDate();
            const from = createVnDate(lastMonthY, lastMonthM, 1, 0, 0, 0, 0);
            const to = createVnDate(lastMonthY, lastMonthM, lastDay, 23, 59, 59, 999);
            return { from, to, label: `Tháng trước (${lastMonthM}/${lastMonthY})` };
        }
        case "thisQuarter": {
            const q = Math.floor((month - 1) / 3) + 1; // 1, 2, 3, 4
            const qStartMonth = (q - 1) * 3 + 1;
            const qEndMonth = qStartMonth + 2;
            const lastDay = new Date(Date.UTC(year, qEndMonth, 0)).getUTCDate();
            const from = createVnDate(year, qStartMonth, 1, 0, 0, 0, 0);
            const to = createVnDate(year, qEndMonth, lastDay, 23, 59, 59, 999);
            return { from, to, label: `Quý ${q}/${year}` };
        }
        case "lastQuarter": {
            const q = Math.floor((month - 1) / 3) + 1;
            const lastQ = q === 1 ? 4 : q - 1;
            const lastQYear = q === 1 ? year - 1 : year;
            const qStartMonth = (lastQ - 1) * 3 + 1;
            const qEndMonth = qStartMonth + 2;
            const lastDay = new Date(Date.UTC(lastQYear, qEndMonth, 0)).getUTCDate();
            const from = createVnDate(lastQYear, qStartMonth, 1, 0, 0, 0, 0);
            const to = createVnDate(lastQYear, qEndMonth, lastDay, 23, 59, 59, 999);
            return { from, to, label: `Quý ${lastQ}/${lastQYear}` };
        }
        case "thisYear": {
            const from = createVnDate(year, 1, 1, 0, 0, 0, 0);
            const to = createVnDate(year, 12, 31, 23, 59, 59, 999);
            return { from, to, label: `Năm ${year}` };
        }
        case "lastYear": {
            const lastY = year - 1;
            const from = createVnDate(lastY, 1, 1, 0, 0, 0, 0);
            const to = createVnDate(lastY, 12, 31, 23, 59, 59, 999);
            return { from, to, label: `Năm ${lastY}` };
        }
        case "allTime": {
            // From 2020 to end of current year + 1
            const from = createVnDate(2020, 1, 1, 0, 0, 0, 0);
            const to = createVnDate(year + 1, 12, 31, 23, 59, 59, 999);
            return { from, to, label: "Tất cả thời gian" };
        }
        case "custom": {
            if (customFrom && customTo) {
                const parseDateParts = (str: string) => {
                    // Accepts YYYY-MM-DD or full ISO
                    const dateOnly = str.split("T")[0];
                    const [y, m, d] = dateOnly.split("-").map(Number);
                    return { y, m, d };
                };
                const [fromHour, fromMin] = (customFromTime || "00:00").split(":").map(Number);
                const [toHour, toMin] = (customToTime || "23:59").split(":").map(Number);

                const fp = parseDateParts(customFrom);
                const tp = parseDateParts(customTo);

                const from = createVnDate(fp.y, fp.m, fp.d, fromHour || 0, fromMin || 0, 0, 0);
                const to = createVnDate(tp.y, tp.m, tp.d, toHour || 23, toMin || 59, 59, 999);

                return {
                    from,
                    to,
                    label: `${formatVnDateDisplay(from)} - ${formatVnDateDisplay(to)}`,
                };
            }
            // fallback to today
            const from = createVnDate(year, month, day, 0, 0, 0, 0);
            const to = createVnDate(year, month, day, 23, 59, 59, 999);
            return { from, to, label: "Tùy chỉnh" };
        }
    }
}

/**
 * Get date range for a specific month and year (quick select)
 */
export function getDateRangeForMonthYear(month: number, year: number): DateRange {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const from = createVnDate(year, month, 1, 0, 0, 0, 0);
    const to = createVnDate(year, month, lastDay, 23, 59, 59, 999);
    return { from, to, label: `Tháng ${month}/${year}` };
}

/**
 * Calculate comparative date range based on primary range and compare mode
 */
export function getComparativeRange(
    primary: DateRange,
    mode: CompareMode,
    customCompareFrom?: string,
    customCompareTo?: string
): DateRange | null {
    if (mode === "none") return null;

    const durationMs = primary.to.getTime() - primary.from.getTime();

    if (mode === "previousPeriod") {
        // Immediate previous period of exact duration
        const to = new Date(primary.from.getTime() - 1);
        const from = new Date(to.getTime() - durationMs);
        return {
            from,
            to,
            label: `Kỳ trước (${formatVnDateDisplay(from)} - ${formatVnDateDisplay(to)})`,
        };
    }

    const pf = getVnParts(primary.from);
    const pt = getVnParts(primary.to);

    if (mode === "samePeriodLastMonth") {
        const lastMonthY = pf.month === 1 ? pf.year - 1 : pf.year;
        const lastMonthM = pf.month === 1 ? 12 : pf.month - 1;
        const from = createVnDate(lastMonthY, lastMonthM, Math.min(pf.day, 28), pf.hours, pf.minutes, 0);

        const toMonthY = pt.month === 1 ? pt.year - 1 : pt.year;
        const toMonthM = pt.month === 1 ? 12 : pt.month - 1;
        const to = createVnDate(toMonthY, toMonthM, Math.min(pt.day, 28), pt.hours, pt.minutes, 59);

        return {
            from,
            to,
            label: `Cùng kỳ tháng trước (${formatVnDateDisplay(from)} - ${formatVnDateDisplay(to)})`,
        };
    }

    if (mode === "samePeriodLastQuarter") {
        // Shift 3 months back
        const shiftQuarter = (y: number, m: number) => {
            let ny = y;
            let nm = m - 3;
            if (nm <= 0) {
                ny -= 1;
                nm += 12;
            }
            return { y: ny, m: nm };
        };
        const sFrom = shiftQuarter(pf.year, pf.month);
        const sTo = shiftQuarter(pt.year, pt.month);

        const from = createVnDate(sFrom.y, sFrom.m, Math.min(pf.day, 28), pf.hours, pf.minutes, 0);
        const to = createVnDate(sTo.y, sTo.m, Math.min(pt.day, 28), pt.hours, pt.minutes, 59);

        return {
            from,
            to,
            label: `Cùng kỳ quý trước (${formatVnDateDisplay(from)} - ${formatVnDateDisplay(to)})`,
        };
    }

    if (mode === "samePeriodLastYear") {
        const from = createVnDate(pf.year - 1, pf.month, Math.min(pf.day, 28), pf.hours, pf.minutes, 0);
        const to = createVnDate(pt.year - 1, pt.month, Math.min(pt.day, 28), pt.hours, pt.minutes, 59);

        return {
            from,
            to,
            label: `Cùng kỳ năm trước (${formatVnDateDisplay(from)} - ${formatVnDateDisplay(to)})`,
        };
    }

    if (mode === "custom" && customCompareFrom && customCompareTo) {
        const [cfY, cfM, cfD] = customCompareFrom.split("T")[0].split("-").map(Number);
        const [ctY, ctM, ctD] = customCompareTo.split("T")[0].split("-").map(Number);
        const from = createVnDate(cfY, cfM, cfD, 0, 0, 0);
        const to = createVnDate(ctY, ctM, ctD, 23, 59, 59);
        return {
            from,
            to,
            label: `Kỳ so sánh (${formatVnDateDisplay(from)} - ${formatVnDateDisplay(to)})`,
        };
    }

    return null;
}

/**
 * Safe delta calculation with percentage and presentation indicators
 */
export interface DeltaComparison {
    current: number;
    previous: number;
    diff: number;
    percent: number | null; // null if previous === 0
    isPositive: boolean;
    isZero: boolean;
    displayText: string;
}

export function calculateDelta(current: number, previous: number): DeltaComparison {
    const diff = current - previous;
    const isZero = diff === 0;
    const isPositive = diff > 0;

    if (previous === 0) {
        return {
            current,
            previous,
            diff,
            percent: null,
            isPositive,
            isZero,
            displayText: previous === 0 && current === 0 ? "0%" : "Chưa có dữ liệu để so sánh",
        };
    }

    const percent = Math.round((diff / Math.abs(previous)) * 1000) / 10; // 1 decimal place
    const sign = percent > 0 ? "+" : "";
    return {
        current,
        previous,
        diff,
        percent,
        isPositive,
        isZero,
        displayText: `${sign}${percent}%`,
    };
}
