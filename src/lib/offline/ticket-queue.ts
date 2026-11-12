export type TicketJobKind = "open-session" | "close-session";
export type TicketJobStatus = "pending" | "conflict";

export interface TicketJob {
    id: string;
    kind: TicketJobKind;
    url: string;
    method: "POST" | "PATCH";
    body: unknown;
    idempotencyKey: string;
    summary: string;
    hutIds: string[];
    dependsOn?: string;
    status: TicketJobStatus;
    conflictMessage?: string;
    createdAt: string;
}

export type SyncClass = "done" | "retry" | "conflict";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function classifySyncResponse(status: number): SyncClass {
    if (status >= 200 && status < 300) return "done";
    if (status === 408 || status === 429 || status >= 500) return "retry";
    return "conflict";
}

export function canEnqueue(
    jobs: TicketJob[],
    next: { kind: TicketJobKind; hutIds: string[]; idempotencyKey: string },
): { ok: true } | { ok: false; message: string } {
    if (!UUID.test(next.idempotencyKey)) {
        return { ok: false, message: "Thiếu mã chống gửi trùng. Không lưu lệnh này trên máy." };
    }
    if (next.kind !== "open-session") return { ok: true };
    const blocked = jobs.some(
        (job) => job.kind === "open-session" && job.hutIds.some((hutId) => next.hutIds.includes(hutId)),
    );
    if (blocked) {
        return {
            ok: false,
            message: "Ô này đang có vé chờ gửi. Hãy gửi hoặc bỏ vé chờ trước khi mở vé mới.",
        };
    }
    return { ok: true };
}

export function enqueueJob(jobs: TicketJob[], job: TicketJob): TicketJob[] {
    const gate = canEnqueue(jobs, job);
    if (!gate.ok) return jobs;
    return [...jobs, job];
}

export function markConflict(jobs: TicketJob[], id: string, message: string): TicketJob[] {
    return jobs.map((job) => {
        if (job.id === id || job.dependsOn === id) {
            return {
                ...job,
                status: "conflict",
                conflictMessage: job.id === id ? message : job.conflictMessage || "Lệnh phía trước bị kẹt. Chưa gửi lệnh này.",
            };
        }
        return job;
    });
}

export function removeJob(jobs: TicketJob[], id: string): TicketJob[] {
    return jobs.filter((job) => job.id !== id);
}

export function readyJobs(jobs: TicketJob[]): TicketJob[] {
    const ids = new Set(jobs.map((job) => job.id));
    return jobs.filter((job) => {
        if (job.status !== "pending") return false;
        if (!job.dependsOn) return true;
        return !ids.has(job.dependsOn);
    });
}
