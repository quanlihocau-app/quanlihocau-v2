import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, cache = new Map()) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        require: (name) => {
            if (!name.startsWith(".")) throw new Error(`Unexpected import ${name}`);
            return load(path.resolve(path.dirname(absolute), name.endsWith(".ts") ? name : `${name}.ts`), cache);
        },
    }, { filename: absolute });
    cache.set(absolute, exports);
    return exports;
}

const queue = load("src/lib/offline/ticket-queue.ts");
const notes = load("src/lib/native/session-notifications.ts");
const tickets = load("src/lib/tickets/ticket-code.ts");

test("hàng đợi không nhận vé trùng ô và không nhận lệnh thiếu khóa", () => {
    const jobs = [];
    const first = {
        id: "11111111-1111-4111-8111-111111111111",
        kind: "open-session",
        url: "/api/fishing-sessions",
        method: "POST",
        body: {},
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        summary: "Ô 1",
        hutIds: ["hut-a"],
        status: "pending",
        createdAt: "2026-11-12T00:00:00.000Z",
    };
    assert.equal(queue.canEnqueue(jobs, { kind: "open-session", hutIds: ["hut-a"], idempotencyKey: "nope" }).ok, false);
    const stored = queue.enqueueJob(jobs, first);
    assert.equal(stored.length, 1);
    assert.equal(queue.canEnqueue(stored, {
        kind: "open-session",
        hutIds: ["hut-a"],
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
    }).ok, false);
});

test("409 là xung đột và được giữ, 200 thì xóa, 500 thì thử lại", () => {
    assert.equal(queue.classifySyncResponse(200), "done");
    assert.equal(queue.classifySyncResponse(500), "retry");
    assert.equal(queue.classifySyncResponse(409), "conflict");
    const job = {
        id: "job",
        kind: "close-session",
        url: "/api/fishing-sessions/x",
        method: "PATCH",
        body: {},
        idempotencyKey: "33333333-3333-4333-8333-333333333333",
        summary: "Đóng",
        hutIds: [],
        status: "pending",
        createdAt: "2026-11-12T00:00:00.000Z",
    };
    const conflicted = queue.markConflict([job], "job", "Ô đã có khách");
    assert.equal(conflicted[0].status, "conflict");
    assert.equal(conflicted[0].conflictMessage, "Ô đã có khách");
    assert.equal(queue.removeJob(conflicted, "job").length, 0);
    assert.equal(queue.canEnqueue([], {
        kind: "close-session",
        hutIds: [],
        idempotencyKey: "",
    }).ok, false);
});

test("thông báo hẹn trước giờ hết và mã vé QR", () => {
    const now = new Date("2026-11-12T10:00:00.000Z");
    const planned = notes.planSessionNotifications([
        { id: "s1", plannedEndAt: "2026-11-12T11:00:00.000Z", label: "Ô 3" },
    ], 10, now);
    assert.equal(planned.length, 2);
    assert.equal(planned[0].title, "Sắp hết giờ");
    const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    assert.equal(tickets.parseTicketScan(tickets.ticketQrPayload(id))?.sessionId, id);
    assert.equal(tickets.parseTicketScan("không phải vé"), null);
});
