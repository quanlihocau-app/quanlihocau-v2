import type { PrinterDevice } from "./types";

interface SerialPort {
    writable: WritableStream<Uint8Array> | null;
    getInfo(): { usbVendorId?: number; usbProductId?: number };
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
}
interface SerialApi {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: { filters: Array<{ bluetoothServiceClassId: number }> }): Promise<SerialPort>;
}

class WebSerialPrinter {
    private port: SerialPort | null = null;
    private device: PrinterDevice | undefined;
    private api(): SerialApi | undefined {
        return typeof navigator === "undefined" ? undefined :
            (navigator as Navigator & { serial?: SerialApi }).serial;
    }
    isSupported(): boolean { return Boolean(this.api()); }

    private async select(connectionType?: "USB" | "BLUETOOTH") {
        const api = this.api();
        if (!api) throw new Error("Trình duyệt không hỗ trợ cổng máy in.");
        let port: SerialPort;
        try {
            port = await api.requestPort(connectionType === "BLUETOOTH"
                ? { filters: [{ bluetoothServiceClassId: 0x1101 }] } : undefined);
        } catch (error) {
            if (error instanceof Error && error.name === "NotFoundError") {
                throw new Error("Bạn chưa chọn máy in. Bật MP210, chọn RPP02N hoặc cổng USB rồi bấm Kết nối.");
            }
            throw error;
        }
        const info = port.getInfo();
        const transport = connectionType ?? (info.usbVendorId !== undefined ? "USB" : "BLUETOOTH");
        const device: PrinterDevice = {
            id: `serial:${info.usbVendorId ?? "bt"}:${info.usbProductId ?? "spp"}`,
            address: "serial",
            name: transport === "USB" ? "MP210 (USB)" : "RPP02N / MP210 (Bluetooth)",
            connectionType: transport,
            vendorId: info.usbVendorId,
            productId: info.usbProductId,
        };
        await this.disconnect();
        this.port = port;
        this.device = device;
        return { devices: [device] };
    }
    async requestConnection(connectionType?: "USB" | "BLUETOOTH"): Promise<PrinterDevice> {
        const { devices } = await this.select(connectionType);
        await this.connect();
        return devices[0];
    }
    scanBluetooth() { return this.select("BLUETOOTH"); }
    listUsbDevices() { return this.select("USB"); }

    async restore(device: PrinterDevice): Promise<boolean> {
        if (this.port && this.device?.id === device.id) return true;
        if (!device.id.startsWith("serial:")) return false;
        const ports = await this.api()?.getPorts() ?? [];
        // A USB VID/PID or SPP service is not a unique physical identity.
        // Only reconnect when there is exactly one authorized port.
        if (ports.length !== 1) return false;
        const info = ports[0].getInfo();
        if (`serial:${info.usbVendorId ?? "bt"}:${info.usbProductId ?? "spp"}` !== device.id) return false;
        this.port = ports[0];
        this.device = device;
        return true;
    }
    private async connect() {
        if (!this.port) throw new Error("Chọn cổng máy in trước khi kết nối.");
        if (!this.port.writable) await this.port.open({ baudRate: 115200 });
        if (!this.port.writable) throw new Error("Không mở được cổng ghi máy in.");
        return { success: true, deviceName: this.device?.name };
    }
    // Selection is retained in memory; persisted settings cannot grant device access.
    connectBluetooth() { return this.connect(); }
    connectUsb() { return this.connect(); }
    async connectWifi(): Promise<{ success: boolean }> {
        throw new Error("In Wi-Fi trực tiếp cần ứng dụng Android hoặc dịch vụ in cài trên Windows.");
    }
    async printRaw({ data }: { data: string }) {
        if (!this.port?.writable) throw new Error("Máy in đã ngắt kết nối.");
        const writer = this.port.writable.getWriter();
        try {
            const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
            for (let offset = 0; offset < bytes.length; offset += 512) {
                await writer.write(bytes.slice(offset, offset + 512));
            }
            return { success: true };
        } catch (error) {
            // A partial write must not be retried automatically: it can duplicate tickets.
            writer.releaseLock();
            try { await this.disconnect(); } catch { this.port = null; }
            throw error;
        } finally {
            if (this.port?.writable?.locked) writer.releaseLock();
        }
    }
    async disconnect() {
        if (this.port?.writable) await this.port.close();
        this.port = null;
        this.device = undefined;
        return { success: true };
    }
    async getStatus() {
        const isConnected = Boolean(this.port?.writable);
        return { status: isConnected ? "connected" as const : "disconnected" as const, isConnected, device: this.device };
    }
}
export const webSerialPrinter = new WebSerialPrinter();
