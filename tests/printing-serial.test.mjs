import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup(ports = []) {
    const writes = [];
    const requests = [];
    const port = {
        writable: null,
        getInfo: () => ({ usbVendorId: 123, usbProductId: 456 }),
        async open(options) {
            assert.equal(options.baudRate, 115200);
            this.writable = new WritableStream({ write: bytes => { writes.push(bytes); } });
        },
        async close() { this.writable = null; },
    };
    const exports = {};
    const source = ts.transpileModule(readFileSync('src/lib/printing/web-serial-printer.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, { exports, navigator: { serial: {
        getPorts: async () => ports, requestPort: async options => { requests.push(options); return port; },
    } }, Uint8Array, atob });
    return { printer: exports.webSerialPrinter, port, writes, requests };
}

test('selected serial port receives complete bytes in order and closes', async () => {
    const { printer, writes } = setup();
    const { devices } = await printer.listUsbDevices();
    assert.equal(devices[0].connectionType, 'USB');
    await printer.connectUsb();
    const bytes = Buffer.alloc(1300, 42);
    assert.equal((await printer.printRaw({ data: bytes.toString('base64') })).success, true);
    assert.deepEqual(Buffer.concat(writes.map(b => Buffer.from(b))), bytes);
    await printer.disconnect();
    await assert.rejects(printer.printRaw({ data: 'AA==' }), /ngắt kết nối/);
});

test('cannot claim success without opening a selected port', async () => {
    const { printer } = setup();
    await assert.rejects(printer.connectBluetooth(), /Chọn cổng/);
    await assert.rejects(printer.connectWifi(), /Wi-Fi/);
});

test('automatic restore refuses ambiguous authorized ports', async () => {
    const { printer, port } = setup();
    const { devices } = await printer.scanBluetooth();
    const other = setup([port, port]).printer;
    assert.equal(await other.restore(devices[0]), false);
});

test('automatic restore opens a unique previously authorized matching port', async () => {
    const { printer, port } = setup();
    const { devices } = await printer.listUsbDevices();
    const restored = setup([port]).printer;
    assert.equal(await restored.restore(devices[0]), true);
    await restored.connectUsb();
    assert.equal((await restored.getStatus()).isConnected, true);
});


test('permission selection opens the real port immediately and classifies USB', async () => {
    const { printer, requests } = setup();
    const device = await printer.requestConnection();
    assert.equal(device.connectionType, 'USB');
    assert.equal((await printer.getStatus()).isConnected, true);
    assert.equal(requests.length, 1);
});

test('Bluetooth permission chooser filters Classic SPP rather than BLE', async () => {
    const { printer, requests } = setup();
    await printer.requestConnection('BLUETOOTH');
    assert.equal(requests[0].filters[0].bluetoothServiceClassId, 0x1101);
});

test('failed write rejects and clears connection instead of claiming success', async () => {
    const { printer, port } = setup();
    await printer.requestConnection();
    port.writable = new WritableStream({ write() { throw new Error('unplugged'); } });
    await assert.rejects(printer.printRaw({ data: 'AQID' }), /unplugged/);
    assert.equal((await printer.getStatus()).isConnected, false);
});
