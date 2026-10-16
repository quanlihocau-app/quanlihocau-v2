import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup(respond) {
    const storage = new Map();
    const calls = [];
    const exports = {};
    const source = ts.transpileModule(readFileSync('src/lib/printing/windows-usb-printer.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
        exports, window: {}, AbortSignal,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        fetch: async (url, options) => { calls.push({ url, options }); return url.endsWith('/health') ? { ok: true, json: async () => ({ version: '2' }) } : respond(url, options); },
    });
    return { printer: exports.windowsUsbPrinter, storage, calls };
}

test('requires explicit approval before contacting USB endpoints', async () => {
    const { printer, calls } = setup(() => { throw new Error('must not fetch'); });
    await assert.rejects(printer.connectUsb(), /cho phép/);
    assert.equal(calls.length, 0);
});

test('consent saves token and subsequent USB writes use origin-bound authorization', async () => {
    const { printer, calls } = setup(url => ({ ok: true, json: async () => url.endsWith('/pair') ? { token: 'test-token' } : { success: true } }));
    await printer.authorize();
    await printer.connectUsb();
    await printer.printRaw({ data: 'G0BUZXN0Cg==' });
    assert.equal(calls[1].options.headers['X-Print-Token'], undefined);
    assert.equal(calls[2].options.headers['X-Print-Token'], 'test-token');
    assert.equal(calls[3].url, 'http://127.0.0.1:17858/print');
    assert.equal(JSON.parse(calls[3].options.body).data, 'G0BUZXN0Cg==');
    assert.equal(calls[3].options.targetAddressSpace, 'loopback');
});

test('bridge print failure is reported without retrying a potentially partial ticket', async () => {
    const { printer, calls } = setup(url => ({ ok: url.endsWith('/pair'), json: async () => url.endsWith('/pair') ? { token: 'test-token' } : { error: 'USB disconnected' } }));
    await printer.authorize();
    await assert.rejects(printer.printRaw({ data: 'AA==' }), /USB disconnected/);
    assert.equal(calls.filter(call => call.url.endsWith('/print')).length, 1);
});

test('network failure during print tells user to check paper before retry', async () => {
    const { printer } = setup(url => {
        if (url.endsWith('/pair')) return { ok: true, json: async () => ({ token: 'test-token' }) };
        throw new Error('network lost');
    });
    await printer.authorize();
    await assert.rejects(printer.printRaw({ data: 'AA==' }), /tránh in trùng/);
});
