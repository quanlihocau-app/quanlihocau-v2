export interface PlannedNotification {
    id: number;
    at: string;
    title: string;
    body: string;
    sessionId: string;
}

export function notificationId(sessionId: string, kind: "soon" | "end"): number {
    let hash = kind === "soon" ? 17 : 31;
    for (let index = 0; index < sessionId.length; index += 1) {
        hash = (Math.imul(hash, 33) + sessionId.charCodeAt(index)) >>> 0;
    }
    return (hash % 1_900_000_000) + 1;
}

export function planSessionNotifications(
    sessions: { id: string; plannedEndAt: string; label: string }[],
    leadMinutes: number,
    now: Date,
): PlannedNotification[] {
    const lead = Number.isFinite(leadMinutes) && leadMinutes > 0 ? leadMinutes : 10;
    const planned: PlannedNotification[] = [];
    for (const session of sessions) {
        const endMs = new Date(session.plannedEndAt).getTime();
        if (!Number.isFinite(endMs)) continue;
        const soonMs = endMs - lead * 60_000;
        if (soonMs > now.getTime() + 5_000) {
            planned.push({
                id: notificationId(session.id, "soon"),
                at: new Date(soonMs).toISOString(),
                title: "Sắp hết giờ",
                body: `${session.label} còn khoảng ${lead} phút.`,
                sessionId: session.id,
            });
        }
        if (endMs > now.getTime() + 5_000) {
            planned.push({
                id: notificationId(session.id, "end"),
                at: new Date(endMs).toISOString(),
                title: "Hết giờ câu",
                body: `${session.label} đã tới giờ. Hỏi khách gia hạn hay kết thúc.`,
                sessionId: session.id,
            });
        }
    }
    return planned;
}
