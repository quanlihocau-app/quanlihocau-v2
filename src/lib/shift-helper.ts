export interface ParsedShiftCloseMetadata {
    actualCashVnd: number | null;
    cashDifferenceVnd: number;
    differenceReason: string | null;
    receivedBy: string | null;
    cleanNote: string | null;
}

/**
 * Encodes metadata into the shift note string safely
 */
export function formatShiftCloseNote(params: {
    note?: string | null;
    actualCashVnd?: number | null;
    cashDifferenceVnd?: number;
    differenceReason?: string | null;
    receivedBy?: string | null;
}): string | null {
    const parts: string[] = [];
    if (params.note?.trim()) {
        parts.push(params.note.trim());
    }
    const meta: Record<string, unknown> = {};
    if (params.actualCashVnd !== undefined && params.actualCashVnd !== null) {
        meta.actualCashVnd = params.actualCashVnd;
        parts.push(`Tiền đếm thực tế: ${params.actualCashVnd.toLocaleString("vi-VN")} đ`);
    }
    if (params.cashDifferenceVnd !== undefined && params.cashDifferenceVnd !== 0) {
        meta.cashDifferenceVnd = params.cashDifferenceVnd;
        parts.push(`Chênh lệch: ${params.cashDifferenceVnd.toLocaleString("vi-VN")} đ`);
    }
    if (params.differenceReason?.trim()) {
        meta.differenceReason = params.differenceReason.trim();
        parts.push(`Lý do: ${params.differenceReason.trim()}`);
    }
    if (params.receivedBy?.trim()) {
        meta.receivedBy = params.receivedBy.trim();
        parts.push(`Người nhận bàn giao: ${params.receivedBy.trim()}`);
    }

    if (Object.keys(meta).length > 0) {
        parts.push(`[META:${JSON.stringify(meta)}]`);
    }

    return parts.length > 0 ? parts.join(" | ") : null;
}

/**
 * Parses shift close metadata from note
 */
export function parseShiftCloseNote(note: string | null | undefined): ParsedShiftCloseMetadata {
    if (!note) {
        return {
            actualCashVnd: null,
            cashDifferenceVnd: 0,
            differenceReason: null,
            receivedBy: null,
            cleanNote: null,
        };
    }

    // Try parsing [META:{...}] tag first
    const metaMatch = note.match(/\[META:(\{.*?\})\]/);
    if (metaMatch && metaMatch[1]) {
        try {
            const data = JSON.parse(metaMatch[1]);
            const cleanNote = note.replace(/\s*\|\s*\[META:\{.*?\}\]/, "").replace(/\[META:\{.*?\}\]/, "").trim();
            return {
                actualCashVnd: typeof data.actualCashVnd === "number" ? data.actualCashVnd : null,
                cashDifferenceVnd: typeof data.cashDifferenceVnd === "number" ? data.cashDifferenceVnd : 0,
                differenceReason: typeof data.differenceReason === "string" ? data.differenceReason : null,
                receivedBy: typeof data.receivedBy === "string" ? data.receivedBy : null,
                cleanNote: cleanNote || null,
            };
        } catch {
            // fallback to regex
        }
    }

    // Regex fallback
    let actualCashVnd: number | null = null;
    let cashDifferenceVnd = 0;
    let differenceReason: string | null = null;
    let receivedBy: string | null = null;

    const actualMatch = note.match(/Tiền đếm thực tế:\s*([0-9.,]+)\s*đ/i);
    if (actualMatch && actualMatch[1]) {
        actualCashVnd = parseInt(actualMatch[1].replace(/[^0-9]/g, ""), 10);
    }

    const diffMatch = note.match(/Chênh lệch:\s*([+-]?[0-9.,]+)\s*đ/i);
    if (diffMatch && diffMatch[1]) {
        cashDifferenceVnd = parseInt(diffMatch[1].replace(/[^0-9-]/g, ""), 10) || 0;
    }

    const reasonMatch = note.match(/Lý do:\s*([^|]+)/i);
    if (reasonMatch && reasonMatch[1]) {
        differenceReason = reasonMatch[1].trim();
    }

    const recMatch = note.match(/Người nhận bàn giao:\s*([^|]+)/i);
    if (recMatch && recMatch[1]) {
        receivedBy = recMatch[1].trim();
    }

    return {
        actualCashVnd,
        cashDifferenceVnd,
        differenceReason,
        receivedBy,
        cleanNote: note,
    };
}
