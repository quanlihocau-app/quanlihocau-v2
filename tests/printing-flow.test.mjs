import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

export function loadPrinting(plugin, savedConfig, options = {}) {
    const cache = new Map();
    const storage = new Map(savedConfig ? [['quanlihocau_printer_config', JSON.stringify(savedConfig)]] : []);
    if (options.token) storage.set('quanlihocau_windows_print_token', options.token);
    function load(file) {
        file = path.resolve(file);
        if (cache.has(file)) return cache.get(file);
        const exports = {};
        cache.set(file, exports);
        const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
            module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        } }).outputText;
        vm.runInNewContext(source, { exports,
            require: name => name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => options.native ?? true }, registerPlugin: () => plugin } : load(path.join(path.dirname(file), name + '.ts')),
            window: { btoa: value => Buffer.from(value, 'binary').toString('base64') },
            localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
            Buffer, Uint8Array, TextEncoder, Date: options.Date || Date, Intl, console, AbortSignal, fetch: options.fetch,
        }, { filename: file });
        return exports;
    }
    return load;
}
const config = { connectionType: 'USB', device: { id: '1', address: '/dev/usb', name: 'MP210', connectionType: 'USB' }, paperWidthMm: 58, charsPerLine: 32, encoding: 'ascii-normalized' };
export const ticket = { sessionId: 'test-session', ticketCode: 'TEST-USB', lakeName: 'HO CAU - IN THU', huts: [{ name: 'Choi 1' }], packageName: 'Goi thu 1 gio', packagePriceVnd: 100000, durationMinutes: 60, startAt: '2026-10-13T05:00:00Z', plannedEndAt: '2026-10-13T06:00:00Z', paymentTiming: 'PREPAID', prepaidAmountVnd: 100000, balanceDueVnd: 0 };
export const receipt = { invoiceId: 'test-invoice', sessionId: 'test-session', lakeName: 'HO CAU - IN THU', lines: [{ name: 'Goi cau', quantity: 1, unitPrice: 100000, totalVnd: 100000 }], totalAmountVnd: 100000, prepaidAmountVnd: 100000, paidAmountVnd: 100000, remainingVnd: 0, paymentMethod: 'CASH', paymentTime: '2026-10-13T06:00:00Z' };

test('opening and settling a session reconnects and sends genuine ESC/POS payloads', async () => {
    let connections = 0;
    const writes = [];
    const plugin = { connectUsb: async ({ deviceId }) => { assert.equal(deviceId, '1'); connections++; return { success: true }; }, printRaw: async ({ data }) => { writes.push(Buffer.from(data, 'base64')); return { success: true }; } };
    const manager = loadPrinting(plugin, config)('src/lib/printing/print-manager.ts').printManager;
    assert.equal((await manager.printSessionTicket(ticket, { jobId: 'open-test' })).success, true);
    assert.equal((await manager.printPaymentReceipt(receipt, { jobId: 'complete-test' })).success, true);
    assert.equal(connections, 1);
    assert.equal(writes.length, 2);
    assert.equal(writes[0][0], 0x1b);
    assert.match(writes[0].toString('ascii'), /TEST-USB/);
    assert.match(writes[0].toString('ascii'), /DA THANH TOAN/);
    assert.match(writes[1].toString('ascii'), /100/);
});

test('simultaneous jobs are queued and duplicate successful job is suppressed', async () => {
    let active = 0, maxActive = 0, writes = 0;
    const plugin = { connectUsb: async () => ({ success: true }), printRaw: async () => { active++; maxActive = Math.max(maxActive, active); writes++; await new Promise(resolve => setTimeout(resolve, 10)); active--; return { success: true }; } };
    const manager = loadPrinting(plugin, config)('src/lib/printing/print-manager.ts').printManager;
    const results = await Promise.all([manager.printSessionTicket(ticket, { jobId: 'same' }), manager.printSessionTicket(ticket, { jobId: 'same' }), manager.printPaymentReceipt(receipt, { jobId: 'complete' })]);
    assert.ok(results.every(result => result.success));
    assert.equal(maxActive, 1);
    assert.equal(writes, 2);
});

test('failed print returns failure and never becomes a completed job', async () => {
    let writes = 0;
    const plugin = { connectUsb: async () => ({ success: true }), printRaw: async () => { writes++; return { success: false }; } };
    const manager = loadPrinting(plugin, config)('src/lib/printing/print-manager.ts').printManager;
    const result = await manager.printSessionTicket(ticket, { jobId: 'fail' });
    assert.equal(result.success, false);
    assert.equal(result.errorCode, 'PRINT_FAILED');
    assert.equal(manager.getStatus(), 'error');
    assert.equal(writes, 1);
});

test('compact 58 mm ticket uses readable standard font without QR and limited line feeds', () => {
    const builder = loadPrinting({}, null)('src/lib/printing/receipt-builder.ts');
    const bytes = Buffer.from(builder.buildSessionTicketEscPos({ ...ticket, customerName: 'Nguyen Van A', customerPhone: '0901234567', cashierName: 'Thu ngan', paymentMethod: 'CASH' }));
    assert.ok(bytes.includes(Buffer.from([0x1b, 0x4d, 0])));
    assert.ok(bytes.includes(Buffer.from([0x1d, 0x21, 0])));
    assert.ok(!bytes.includes(Buffer.from([0x1d, 0x21, 0x11])));
    assert.ok(bytes.includes(Buffer.from([0x1b, 0x33, 26])));
    assert.ok(!bytes.includes(Buffer.from([0x1d, 0x28, 0x6b])));
    assert.ok([...bytes].filter(byte => byte === 10).length <= 25);
    for (const field of ['TEST-USB', 'Choi 1', 'Goi thu 1 gio', '0901234567', 'Da thu:', 'Con thu:']) assert.match(bytes.toString('utf8'), new RegExp(field));
});

test('compact ticket wraps long customer text and preserves outstanding balance', () => {
    const builder = loadPrinting({}, null)('src/lib/printing/receipt-builder.ts');
    const note = 'abcdefghij'.repeat(7);
    const bytes = Buffer.from(builder.buildSessionTicketEscPos({ ...ticket, balanceDueVnd: 25000, note }));
    const text = bytes.toString('utf8');
    assert.match(text, /25\.000d/);
    assert.ok(text.replaceAll('\n', '').includes(note));
});


test('Windows USB hot-plug reconnects after unplug, and respects explicit disconnect', async () => {
    let present = true, connected = false, now = 10000, connects = 0;
    class Clock extends Date { static now() { return now; } }
    const fetch = async url => {
        let result = { success: true }, ok = true;
        if (url.endsWith('/status')) result = { isConnected: connected && present, status: connected && present ? 'connected' : 'disconnected' };
        if (url.endsWith('/connect')) { connects++; connected = present; ok = present; result = present ? { success: true } : { error: 'USB absent' }; }
        if (url.endsWith('/disconnect')) connected = false;
        return { ok, json: async () => result };
    };
    const saved = { ...config, device: { ...config.device, id: 'windows-usb:28e9:0289' } };
    const manager = loadPrinting({}, saved, { native: false, token: 'fixture', fetch, Date: Clock })('src/lib/printing/print-manager.ts').printManager;
    assert.equal(await manager.autoConnect(), true);
    present = false;
    await manager.refreshUsbConnection();
    assert.equal(manager.getStatus(), 'disconnected');
    present = true; now += 5000;
    await manager.refreshUsbConnection();
    assert.equal(manager.getStatus(), 'connected');
    await manager.disconnect();
    const previousConnects = connects; now += 5000;
    await manager.refreshUsbConnection();
    assert.equal(manager.getStatus(), 'disconnected');
    assert.equal(connects, previousConnects);
});
