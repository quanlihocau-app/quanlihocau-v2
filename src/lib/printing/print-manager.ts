import { Capacitor } from "@capacitor/core";

import {
    buildPaymentReceiptEscPos,
    buildSessionTicketEscPos,
    buildTestReceiptEscPos,
} from "./receipt-builder";
import {
    DEFAULT_TEMPLATE_CONFIG,
    PaymentReceiptData,
    PrinterConfig,
    PrinterConnectionType,
    PrinterDevice,
    PrinterStatus,
    PrinterTemplateConfig,
    PrintResult,
    SessionTicketData,
} from "./types";

const STORAGE_KEY = "quanlihocau_printer_config";
const TEMPLATE_KEY = "quanlihocau_printer_template";

// Interface for Capacitor native plugin
interface ThermalPrinterPlugin {
    scanBluetooth(): Promise<{ devices: PrinterDevice[] }>;
    connectBluetooth(options: { address: string }): Promise<{ success: boolean; deviceName?: string }>;
    listUsbDevices(): Promise<{ devices: PrinterDevice[] }>;
    connectUsb(options: { deviceId: string | number }): Promise<{ success: boolean; deviceName?: string }>;
    connectWifi(options: { ip: string; port: number }): Promise<{ success: boolean; deviceName?: string }>;
    printRaw(options: { data: string }): Promise<{ success: boolean }>;
    disconnect(): Promise<{ success: boolean }>;
    getStatus(): Promise<{ status: PrinterStatus; isConnected: boolean; device?: PrinterDevice }>;
}

function getNativePlugin(): ThermalPrinterPlugin | null {
    if (typeof window === "undefined") return null;
    const cap = (window as unknown as { Capacitor?: { Plugins?: { ThermalPrinter?: ThermalPrinterPlugin } } })?.Capacitor;
    return cap?.Plugins?.ThermalPrinter ?? null;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    if (typeof window !== "undefined" && window.btoa) {
        return window.btoa(binary);
    }
    return Buffer.from(binary, "binary").toString("base64");
}

class PrintManager {
    private status: PrinterStatus = "disconnected";
    private config: PrinterConfig | null = null;
    private templateConfig: PrinterTemplateConfig = DEFAULT_TEMPLATE_CONFIG;
    private listeners: Set<(status: PrinterStatus, config: PrinterConfig | null, template: PrinterTemplateConfig) => void> = new Set();
    private completedJobIds: Set<string> = new Set();
    private isPrinting = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.loadStoredConfig();
        }
    }

    public isNative(): boolean {
        return typeof window !== "undefined" && Capacitor.isNativePlatform();
    }

    public getStatus(): PrinterStatus {
        return this.status;
    }

    public getConfig(): PrinterConfig | null {
        return this.config;
    }

    public getTemplateConfig(): PrinterTemplateConfig {
        return this.templateConfig;
    }

    public isConnected(): boolean {
        return this.status === "connected" && this.config !== null;
    }

    public subscribe(listener: (status: PrinterStatus, config: PrinterConfig | null, template: PrinterTemplateConfig) => void): () => void {
        this.listeners.add(listener);
        listener(this.status, this.config, this.templateConfig);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener(this.status, this.config, this.templateConfig);
        }
    }

    private loadStoredConfig(): void {
        try {
            const rawTpl = localStorage.getItem(TEMPLATE_KEY);
            if (rawTpl) {
                this.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, ...JSON.parse(rawTpl) };
            }
        } catch {
            this.templateConfig = DEFAULT_TEMPLATE_CONFIG;
        }

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.config = JSON.parse(raw);
                this.status = "disconnected";
            }
        } catch {
            this.config = null;
        }
    }

    public saveConfig(config: PrinterConfig): void {
        this.config = config;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch {
            // Ignore storage errors
        }
        this.notify();
    }

    public saveTemplateConfig(template: PrinterTemplateConfig): void {
        this.templateConfig = template;
        if (this.config) {
            this.config.template = template;
            this.config.paperWidthMm = template.paperWidthMm;
            this.config.charsPerLine = template.paperWidthMm === 80 ? 48 : 32;
            this.saveConfig(this.config);
        } else {
            try {
                localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
            } catch {
                // Ignore storage errors
            }
            this.notify();
        }
    }

    public clearConfig(): void {
        this.config = null;
        this.status = "disconnected";
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }
        this.notify();
    }

    // --- Connect methods ---

    public async scanBluetooth(): Promise<PrinterDevice[]> {
        const plugin = getNativePlugin();
        if (!plugin) {
            if (!this.isNative()) {
                throw new Error("Trình duyệt web chưa hỗ trợ quét Bluetooth trực tiếp. Vui lòng mở trên ứng dụng Android.");
            }
            throw new Error("Không tìm thấy native plugin ThermalPrinter.");
        }

        this.status = "scanning";
        this.notify();

        try {
            const res = await plugin.scanBluetooth();
            this.status = "disconnected";
            this.notify();
            return res.devices || [];
        } catch (err: unknown) {
            this.status = "error";
            this.notify();
            const msg = err instanceof Error ? err.message : "Lỗi khi quét Bluetooth.";
            throw new Error(msg);
        }
    }

    public async connectBluetooth(device: PrinterDevice): Promise<boolean> {
        const plugin = getNativePlugin();
        if (!plugin) {
            if (!this.isNative()) {
                // In web preview mode, simulate saving the device config
                this.saveConfig({
                    connectionType: "BLUETOOTH",
                    device,
                    paperWidthMm: this.templateConfig.paperWidthMm,
                    charsPerLine: this.templateConfig.paperWidthMm === 80 ? 48 : 32,
                    encoding: "ascii-normalized",
                    template: this.templateConfig,
                });
                this.status = "connected";
                this.notify();
                return true;
            }
            throw new Error("Không tìm thấy native plugin ThermalPrinter.");
        }

        this.status = "connecting";
        this.notify();

        try {
            const res = await plugin.connectBluetooth({ address: device.address });
            if (res.success) {
                this.status = "connected";
                this.saveConfig({
                    connectionType: "BLUETOOTH",
                    device: { ...device, isConnected: true },
                    paperWidthMm: this.templateConfig.paperWidthMm,
                    charsPerLine: this.templateConfig.paperWidthMm === 80 ? 48 : 32,
                    encoding: "ascii-normalized",
                    template: this.templateConfig,
                });
                return true;
            }
            this.status = "error";
            this.notify();
            return false;
        } catch (err: unknown) {
            this.status = "error";
            this.notify();
            const msg = err instanceof Error ? err.message : "Không thể kết nối máy in Bluetooth.";
            throw new Error(msg);
        }
    }

    public async listUsbDevices(): Promise<PrinterDevice[]> {
        const plugin = getNativePlugin();
        if (!plugin) {
            if (!this.isNative()) {
                return [];
            }
            throw new Error("Không tìm thấy native plugin ThermalPrinter.");
        }

        try {
            const res = await plugin.listUsbDevices();
            return res.devices || [];
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi tìm thiết bị USB-OTG.";
            throw new Error(msg);
        }
    }

    public async connectUsb(device: PrinterDevice): Promise<boolean> {
        const plugin = getNativePlugin();
        if (!plugin) {
            if (!this.isNative()) {
                this.saveConfig({
                    connectionType: "USB",
                    device,
                    paperWidthMm: this.templateConfig.paperWidthMm,
                    charsPerLine: this.templateConfig.paperWidthMm === 80 ? 48 : 32,
                    encoding: "ascii-normalized",
                    template: this.templateConfig,
                });
                this.status = "connected";
                this.notify();
                return true;
            }
            throw new Error("Không tìm thấy native plugin ThermalPrinter.");
        }

        this.status = "connecting";
        this.notify();

        try {
            const res = await plugin.connectUsb({ deviceId: device.address });
            if (res.success) {
                this.status = "connected";
                this.saveConfig({
                    connectionType: "USB",
                    device: { ...device, isConnected: true },
                    paperWidthMm: this.templateConfig.paperWidthMm,
                    charsPerLine: this.templateConfig.paperWidthMm === 80 ? 48 : 32,
                    encoding: "ascii-normalized",
                    template: this.templateConfig,
                });
                return true;
            }
            this.status = "error";
            this.notify();
            return false;
        } catch (err: unknown) {
            this.status = "error";
            this.notify();
            const msg = err instanceof Error ? err.message : "Không thể kết nối máy in USB-OTG.";
            throw new Error(msg);
        }
    }

    public async connectWifi(ip: string, port = 9100, name = "Máy in Wi-Fi"): Promise<boolean> {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip.trim())) {
            throw new Error("Địa chỉ IP không hợp lệ (Ví dụ: 192.168.1.200).");
        }
        if (isNaN(port) || port <= 0 || port > 65535) {
            throw new Error("Cổng Port không hợp lệ (thường là 9100).");
        }

        const device: PrinterDevice = {
            id: `${ip}:${port}`,
            name: `${name} (${ip}:${port})`,
            connectionType: "WIFI",
            address: ip,
            port,
        };

        const plugin = getNativePlugin();
        if (!plugin) {
            this.saveConfig({
                connectionType: "WIFI",
                device,
                paperWidthMm: this.templateConfig.paperWidthMm,
                charsPerLine: this.templateConfig.paperWidthMm === 80 ? 48 : 32,
                encoding: "ascii-normalized",
                template: this.templateConfig,
            });
            this.status = "connected";
            this.notify();
            return true;
        }

        this.status = "connecting";
        this.notify();

        try {
            const res = await plugin.connectWifi({ ip: ip.trim(), port });
            if (res.success) {
                this.status = "connected";
                this.saveConfig({
                    connectionType: "WIFI",
                    device: { ...device, isConnected: true },
                    paperWidthMm: this.templateConfig.paperWidthMm,
                    charsPerLine: this.templateConfig.paperWidthMm === 80 ? 48 : 32,
                    encoding: "ascii-normalized",
                    template: this.templateConfig,
                });
                return true;
            }
            this.status = "error";
            this.notify();
            return false;
        } catch (err: unknown) {
            this.status = "error";
            this.notify();
            const msg = err instanceof Error ? err.message : "Không thể kết nối máy in qua Wi-Fi/LAN.";
            throw new Error(msg);
        }
    }

    public async disconnect(): Promise<void> {
        const plugin = getNativePlugin();
        if (plugin) {
            try {
                await plugin.disconnect();
            } catch {
                // Ignore disconnect errors
            }
        }
        this.status = "disconnected";
        if (this.config) {
            this.config.device.isConnected = false;
        }
        this.notify();
    }

    // --- Printing execution ---

    private async executeEscPosBytes(bytes: Uint8Array, jobId: string): Promise<PrintResult> {
        if (this.isPrinting) {
            return {
                success: false,
                jobId,
                error: "Máy in đang bận xử lý lượt in trước.",
                errorCode: "JOB_IN_PROGRESS",
            };
        }

        const plugin = getNativePlugin();
        const base64 = uint8ArrayToBase64(bytes);

        this.isPrinting = true;
        this.status = "printing";
        this.notify();

        try {
            if (plugin) {
                const res = await plugin.printRaw({ data: base64 });
                if (!res.success) {
                    throw new Error("Lệnh in thất bại từ thiết bị.");
                }
            } else {
                // In browser fallback mode, simulate short delay
                await new Promise((resolve) => setTimeout(resolve, 600));
            }

            this.completedJobIds.add(jobId);
            this.status = "connected";
            this.notify();
            return { success: true, jobId };
        } catch (err: unknown) {
            this.status = "error";
            this.notify();
            const errorMsg = err instanceof Error ? err.message : "Lỗi không xác định khi in.";
            return {
                success: false,
                jobId,
                error: errorMsg,
                errorCode: "PRINT_FAILED",
            };
        } finally {
            this.isPrinting = false;
        }
    }

    public async printSessionTicket(
        data: SessionTicketData,
        options?: { jobId?: string; manual?: boolean },
    ): Promise<PrintResult> {
        const jobId = options?.jobId || `ticket-${data.sessionId}-${Date.now()}`;

        if (this.completedJobIds.has(jobId)) {
            return { success: true, jobId };
        }

        if (!this.isConnected()) {
            if (options?.manual && typeof window !== "undefined") {
                window.print();
                return { success: true, jobId };
            }
            return {
                success: false,
                jobId,
                error: "Chưa kết nối máy in nhiệt.",
                errorCode: "PRINTER_NOT_CONNECTED",
            };
        }

        const copies = this.templateConfig.copiesCount || 1;
        let lastRes: PrintResult = { success: true, jobId };

        for (let i = 0; i < copies; i++) {
            const bytes = buildSessionTicketEscPos(data, this.config || undefined);
            lastRes = await this.executeEscPosBytes(bytes, `${jobId}-${i}`);
            if (!lastRes.success) break;
        }

        return lastRes;
    }

    public async printPaymentReceipt(
        data: PaymentReceiptData,
        options?: { jobId?: string; manual?: boolean },
    ): Promise<PrintResult> {
        const jobId = options?.jobId || `receipt-${data.invoiceId}-${Date.now()}`;

        if (this.completedJobIds.has(jobId)) {
            return { success: true, jobId };
        }

        if (!this.isConnected()) {
            if (options?.manual && typeof window !== "undefined") {
                window.print();
                return { success: true, jobId };
            }
            return {
                success: false,
                jobId,
                error: "Chưa kết nối máy in nhiệt.",
                errorCode: "PRINTER_NOT_CONNECTED",
            };
        }

        const copies = this.templateConfig.copiesCount || 1;
        let lastRes: PrintResult = { success: true, jobId };

        for (let i = 0; i < copies; i++) {
            const bytes = buildPaymentReceiptEscPos(data, this.config || undefined);
            lastRes = await this.executeEscPosBytes(bytes, `${jobId}-${i}`);
            if (!lastRes.success) break;
        }

        return lastRes;
    }

    public async printTest(): Promise<PrintResult> {
        const jobId = `test-${Date.now()}`;
        const deviceName = this.config?.device.name || "Máy in thử nghiệm";
        const connectionType: PrinterConnectionType = this.config?.connectionType || "BLUETOOTH";

        const bytes = buildTestReceiptEscPos(
            {
                deviceName,
                connectionType,
                time: new Date(),
                lakeName: "QUẢN LÍ HỒ CÂU",
            },
            this.config || undefined,
        );

        return this.executeEscPosBytes(bytes, jobId);
    }
}

// Global singleton instance
export const printManager = new PrintManager();
