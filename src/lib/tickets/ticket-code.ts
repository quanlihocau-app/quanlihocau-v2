export const TICKET_QR_PREFIX = "QLHC:";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ticketQrPayload(sessionId: string): string {
    return `${TICKET_QR_PREFIX}${sessionId}`;
}

export function parseTicketScan(raw: string): { sessionId: string } | null {
    const text = raw.trim();
    const prefixed = text.match(/^QLHC:([0-9a-f-]{36})$/i);
    if (prefixed && UUID.test(prefixed[1])) return { sessionId: prefixed[1].toLowerCase() };
    if (UUID.test(text)) return { sessionId: text.toLowerCase() };
    return null;
}
