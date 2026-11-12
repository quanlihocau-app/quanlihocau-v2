import {
    canEnqueue,
    classifySyncResponse,
    enqueueJob,
    markConflict,
    readyJobs,
    removeJob,
    type TicketJob,
    type TicketJobKind,
} from "@/lib/offline/ticket-queue";

const KEY = "qlhc_ticket_queue_v1";

type Store = Pick<Storage, "getItem" | "setItem">;

function isJob(value: unknown): value is TicketJob {
    if (!value || typeof value !== "object") return false;
    const job = value as TicketJob;
    return (
        typeof job.id === "string" &&
        (job.kind === "open-session" || job.kind === "close-session") &&
        typeof job.url === "string" &&
        (job.method === "POST" || job.method === "PATCH") &&
        typeof job.idempotencyKey === "string" &&
        typeof job.summary === "string" &&
        Array.isArray(job.hutIds) &&
        (job.status === "pending" || job.status === "conflict")
    );
}

export function readTicketJobs(storage: Store | null): TicketJob[] {
    if (!storage) return [];
    try {
        const raw = storage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.filter(isJob) : [];
    } catch {
        return [];
    }
}

export function writeTicketJobs(storage: Store | null, jobs: TicketJob[]): void {
    if (!storage) return;
    storage.setItem(KEY, JSON.stringify(jobs));
}

export interface SubmitTicketInput {
    kind: TicketJobKind;
    url: string;
    method: "POST" | "PATCH";
    body: unknown;
    idempotencyKey: string;
    summary: string;
    hutIds?: string[];
    dependsOn?: string;
}

export type SubmitTicketResult =
    | { queued: true; job: TicketJob }
    | { queued: false; blocked: true; message: string }
    | { queued: false; blocked: false; response: Response };

function browserStorage(): Store | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function queueJob(input: SubmitTicketInput, storage: Store | null): SubmitTicketResult {
    const jobs = readTicketJobs(storage);
    const job: TicketJob = {
        id: input.idempotencyKey,
        kind: input.kind,
        url: input.url,
        method: input.method,
        body: input.body,
        idempotencyKey: input.idempotencyKey,
        summary: input.summary,
        hutIds: input.hutIds ?? [],
        dependsOn: input.dependsOn,
        status: "pending",
        createdAt: new Date().toISOString(),
    };
    const gate = canEnqueue(jobs, job);
    if (!gate.ok) return { queued: false, blocked: true, message: gate.message };
    writeTicketJobs(storage, enqueueJob(jobs, job));
    return { queued: true, job };
}

export async function submitTicketAction(
    input: SubmitTicketInput,
    options?: { online?: boolean; fetchImpl?: typeof fetch; storage?: Store | null },
): Promise<SubmitTicketResult> {
    const storage = options?.storage === undefined ? browserStorage() : options.storage;
    const online = options?.online ?? (typeof navigator === "undefined" ? true : navigator.onLine);
    if (!online) return queueJob(input, storage);

    const fetchImpl = options?.fetchImpl ?? fetch;
    let response: Response;
    try {
        response = await fetchImpl(input.url, {
            method: input.method,
            headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": input.idempotencyKey,
            },
            body: JSON.stringify(input.body),
        });
    } catch {
        return queueJob(input, storage);
    }

    if (classifySyncResponse(response.status) === "retry") {
        return queueJob(input, storage);
    }
    return { queued: false, blocked: false, response };
}

export async function syncTicketJobs(options?: {
    fetchImpl?: typeof fetch;
    storage?: Store | null;
    online?: boolean;
}): Promise<{ done: string[]; conflict: string[]; pending: number }> {
    const storage = options?.storage === undefined ? browserStorage() : options.storage;
    const online = options?.online ?? (typeof navigator === "undefined" ? true : navigator.onLine);
    if (!online) {
        const pending = readTicketJobs(storage).filter((job) => job.status === "pending").length;
        return { done: [], conflict: [], pending };
    }
    const fetchImpl = options?.fetchImpl ?? fetch;
    let jobs = readTicketJobs(storage);
    const done: string[] = [];
    const conflict: string[] = [];

    for (let guard = 0; guard < 20; guard += 1) {
        const next = readyJobs(jobs)[0];
        if (!next) break;
        let response: Response;
        try {
            response = await fetchImpl(next.url, {
                method: next.method,
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": next.idempotencyKey,
                },
                body: JSON.stringify(next.body),
            });
        } catch {
            break;
        }
        const outcome = classifySyncResponse(response.status);
        if (outcome === "retry") break;
        if (outcome === "done") {
            jobs = removeJob(jobs, next.id);
            done.push(next.id);
            continue;
        }
        let message = "Máy chủ từ chối lệnh này. Kiểm tra lại trước khi gửi.";
        try {
            const body = (await response.json()) as { error?: unknown };
            if (typeof body.error === "string" && body.error.trim()) message = body.error;
            else if (body.error && typeof body.error === "object" && "message" in body.error) {
                const text = (body.error as { message?: unknown }).message;
                if (typeof text === "string" && text.trim()) message = text;
            }
        } catch {
            // Giữ câu mặc định.
        }
        jobs = markConflict(jobs, next.id, message);
        conflict.push(next.id);
    }

    writeTicketJobs(storage, jobs);
    return {
        done,
        conflict,
        pending: jobs.filter((job) => job.status === "pending").length,
    };
}

export function dismissTicketJob(id: string, storage?: Store | null): TicketJob[] {
    const store = storage === undefined ? browserStorage() : storage;
    const jobs = removeJob(readTicketJobs(store), id);
    writeTicketJobs(store, jobs);
    return jobs;
}
