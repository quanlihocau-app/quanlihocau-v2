import { windowsUsbPrinter } from "./windows-usb-printer";
import { webSerialPrinter } from "./web-serial-printer";

import { Capacitor, registerPlugin } from "@capacitor/core";

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

const nativePrinter = registerPlugin<ThermalPrinterPlugin>("ThermalPrinter");

function getNativePlugin(): ThermalPrinterPlugin | null {
    if (typeof window === "undefined") return null;
    if (Capacitor.isNativePlatform()) return nativePrinter;
    if (windowsUsbPrinter.isSelected()) return windowsUsbPrinter;
    return webSerialPrinter.isSupported() ? webSerialPrinter : null;
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
    private autoReconnectEnabled = true;
    private lastUsbCheck = 0;
    private usbCheck: Promise<void> | null = null;

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

    private autoConnection: Promise<boolean> | null = null;

    public autoConnect(): Promise<boolean> {
        if (!this.autoReconnectEnabled) return Promise.resolve(false);
        if (this.isConnected()) return Promise.resolve(true);
        if (this.autoConnection) return this.autoConnection;
        if (this.status === "connecting" || this.status === "scanning" || this.isPrinting) return Promise.resolve(false);
        this.autoConnection = this.restoreConnection().finally(() => { this.autoConnection = null; });
        return this.autoConnection;
    }

    public refreshUsbConnection(): Promise<void> {
        if (this.usbCheck) return this.usbCheck;
        if (this.isNative() || !this.autoReconnectEnabled || this.isPrinting || this.status === "connecting" ||
            !this.config?.device.id?.startsWith("windows-usb") || Date.now() - this.lastUsbCheck < 4000) return Promise.resolve();
        this.lastUsbCheck = Date.now();
        this.usbCheck = (async () => {
            try {
                const current = await windowsUsbPrinter.getStatus();
                if (!current.isConnected) {
                    this.status = "disconnected";
                    if (this.config) this.config.device.isConnected = false;
                    this.notify();
                    await this.autoConnect();
                }
            } catch {
                this.status = "disconnected";
                if (this.config) this.config.device.isConnected = false;
                this.notify();
            }
        })().finally(() => { this.usbCheck = null; });
        return this.usbCheck;
    }

    private async restoreConnection(): Promise<boolean> {
        if (!this.config) {
            if (!this.isNative()) return false;
            const target = /(?:MP[ -]?210|RPP[ -]?02N)/i;
            try {
                const usb = (await this.listUsbDevices()).filter(device => target.test(device.name));
                if (usb.length === 1) return await this.connectUsb(usb[0]);
                if (usb.length > 1) return false;
                const bluetooth = (await this.scanBluetooth()).filter(device => target.test(device.name));
                if (bluetooth.length === 1) return await this.connectBluetooth(bluetooth[0]);
            } catch {
                this.status = "disconnected";
                this.notify();
            }
            return false;
        }
        try {
            // Never show a device chooser automatically on the web.
            if (!this.isNative() && !this.config.device.id?.startsWith("windows-usb") && !await webSerialPrinter.restore(this.config.device)) return false;
            if (this.config.device.id?.startsWith("windows-usb")) windowsUsbPrinter.activate();
            if (this.config.connectionType === "USB") return await this.connectUsb(this.config.device);
            if (this.config.connectionType === "BLUETOOTH") return await this.connectBluetooth(this.config.device);
            return await this.connectWifi(this.config.device.address, this.config.device.port);
        } catch {
            this.status = "disconnected";
            this.notify();
            return false;
        }
    }

    public async connectWithConsent(connectionType?: "USB" | "BLUETOOTH"): Promise<boolean> {
        this.autoReconnectEnabled = true;
        if (this.isPrinting) throw new Error("Đợi máy in gửi xong vé hiện tại trước khi đổi kết nối.");
        if (this.isNative()) return this.autoConnect();
        if (connectionType !== "BLUETOOTH") return this.connectWindowsUsbWithConsent();
        if (!webSerialPrinter.isSupported()) {
            throw new Error("Hãy mở app bằng Chrome hoặc Edge trên Windows để kết nối máy in trực tiếp.");
        }
        this.status = "connecting";
        this.notify();
        try {
            // requestPort is invoked before any await to preserve the button's user gesture.
            const device = await webSerialPrinter.requestConnection(connectionType);
            windowsUsbPrinter.deactivate();
            this.templateConfig = { ...this.templateConfig, paperWidthMm: 58 };
            this.status = "connected";
            this.saveConfig({ connectionType: device.connectionType, device: { ...device, isConnected: true },
                paperWidthMm: 58, charsPerLine: 32, encoding: "ascii-normalized", template: this.templateConfig });
            return true;
        } catch (error) {
            this.status = "disconnected";
            if (this.config) this.config.device.isConnected = false;
            this.notify();
            throw error;
        }
    }

    private async connectWindowsUsbWithConsent(): Promise<boolean> {
        this.status = "connecting";
        this.notify();
        try {
            await windowsUsbPrinter.authorize();
            const { devices } = await windowsUsbPrinter.listUsbDevices();
            if (devices.length !== 1) throw new Error("Chưa thấy máy in PT210 USB. Bật nguồn máy in, cắm dây USB vào PC rồi thử lại.");
            const result = await windowsUsbPrinter.connectUsb();
            if (!result.success) throw new Error("Không mở được kết nối máy in USB Windows.");
            windowsUsbPrinter.activate();
            this.templateConfig = { ...this.templateConfig, paperWidthMm: 58 };
            this.status = "connected";
            this.saveConfig({ connectionType: "USB", device: { ...devices[0], isConnected: true },
                paperWidthMm: 58, charsPerLine: 32, encoding: "ascii-normalized", template: this.templateConfig });
            return true;
        } catch (error) {
            this.status = "disconnected";
            this.notify();
            throw error;
        }
    }

    // --- Connect methods ---

    public async scanBluetooth(): Promise<PrinterDevice[]> {
        const plugin = getNativePlugin();
        if (plugin) {
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

        throw new Error("Kết nối trực tiếp cần Chrome/Edge trên Windows hoặc ứng dụng Android có plugin máy in.");
    }

    public async connectBluetooth(device: PrinterDevice): Promise<boolean> {
        this.autoReconnectEnabled = true;
        const plugin = getNativePlugin();
        if (!plugin) {
            throw new Error("Không có kết nối máy in trực tiếp. Hãy dùng Chrome/Edge trên Windows hoặc app Android.");
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
        this.autoReconnectEnabled = true;
        const plugin = getNativePlugin();
        if (!plugin) {
            throw new Error("Không có kết nối máy in trực tiếp. Hãy dùng Chrome/Edge trên Windows hoặc app Android.");
        }

        this.status = "connecting";
        this.notify();

        try {
            const res = await plugin.connectUsb({ deviceId: device.id });
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
            throw new Error("Không có kết nối máy in trực tiếp. Hãy dùng Chrome/Edge trên Windows hoặc app Android.");
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
        this.autoReconnectEnabled = false;
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

    private printQueue: Promise<void> = Promise.resolve();

    private enqueuePrint(action: () => Promise<PrintResult>): Promise<PrintResult> {
        const result = this.printQueue.then(action);
        this.printQueue = result.then(() => undefined, () => undefined);
        return result;
    }

    public printSessionTicket(data: SessionTicketData, options?: { jobId?: string; manual?: boolean }): Promise<PrintResult> {
        // Nếu thiết bị này không kết nối máy in trực tiếp, tự động gửi về Trạm in bàn (Cloud Spooler)
        if (!this.isConnected() && !this.isNative() && !options?.manual) {
            return this.sendToCloudSpooler("SESSION_TICKET", `Vé #${data.ticketCode || data.sessionId}`, data);
        }

        const consent = options?.manual && !this.isConnected() && !this.isNative() && !this.isPrinting
            ? this.connectWithConsent(this.config?.connectionType === "BLUETOOTH" ? "BLUETOOTH" : undefined).then(() => null, error => error) : null;
        return this.enqueuePrint(async () => {
            try { 
                if (consent) { 
                    const error = await consent; 
                    if (error) {
                        // Nếu bấm in thủ công nhưng không nối được máy in tại máy, gửi lên Trạm in bàn
                        return await this.sendToCloudSpooler("SESSION_TICKET", `Vé #${data.ticketCode || data.sessionId}`, data);
                    } 
                } 
            }
            catch { 
                return await this.sendToCloudSpooler("SESSION_TICKET", `Vé #${data.ticketCode || data.sessionId}`, data);
            }
            return this.performSessionTicket(data, options);
        });
    }

    public printPaymentReceipt(data: PaymentReceiptData, options?: { jobId?: string; manual?: boolean }): Promise<PrintResult> {
        // Nếu thiết bị này không kết nối máy in trực tiếp, tự động gửi về Trạm in bàn (Cloud Spooler)
        if (!this.isConnected() && !this.isNative() && !options?.manual) {
            return this.sendToCloudSpooler("PAYMENT_RECEIPT", `Hóa đơn #${data.invoiceId}`, data);
        }

        const consent = options?.manual && !this.isConnected() && !this.isNative() && !this.isPrinting
            ? this.connectWithConsent(this.config?.connectionType === "BLUETOOTH" ? "BLUETOOTH" : undefined).then(() => null, error => error) : null;
        return this.enqueuePrint(async () => {
            try { 
                if (consent) { 
                    const error = await consent; 
                    if (error) {
                        return await this.sendToCloudSpooler("PAYMENT_RECEIPT", `Hóa đơn #${data.invoiceId}`, data);
                    } 
                } 
            }
            catch { 
                return await this.sendToCloudSpooler("PAYMENT_RECEIPT", `Hóa đơn #${data.invoiceId}`, data);
            }
            return this.performPaymentReceipt(data, options);
        });
    }

    public printTest(): Promise<PrintResult> {
        return this.enqueuePrint(() => this.performTest());
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
                throw new Error("Không có kết nối máy in thật để gửi vé.");
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

    private async performSessionTicket(
        data: SessionTicketData,
        options?: { jobId?: string; manual?: boolean },
    ): Promise<PrintResult> {
        const jobId = options?.jobId || `ticket-${data.sessionId}-${Date.now()}`;

        if (this.completedJobIds.has(jobId)) {
            return { success: true, jobId };
        }

        if (!this.isConnected()) {
            try {
                if (options?.manual && !this.isNative()) await this.connectWithConsent(this.config?.connectionType === "BLUETOOTH" ? "BLUETOOTH" : undefined);
                else await this.autoConnect();
            } catch (error) {
                return { success: false, jobId, error: error instanceof Error ? error.message : "Không thể kết nối máy in.", errorCode: "PRINTER_NOT_CONNECTED" };
            }
        }
        if (!this.isConnected()) {
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
            if (this.completedJobIds.has(`${jobId}-${i}`)) continue;
            const bytes = buildSessionTicketEscPos(data, this.config || undefined);
            lastRes = await this.executeEscPosBytes(bytes, `${jobId}-${i}`);
            if (!lastRes.success) break;
        }

        if (lastRes.success) this.completedJobIds.add(jobId);
        return { ...lastRes, jobId };
    }

    private async performPaymentReceipt(
        data: PaymentReceiptData,
        options?: { jobId?: string; manual?: boolean },
    ): Promise<PrintResult> {
        const jobId = options?.jobId || `receipt-${data.invoiceId}-${Date.now()}`;

        if (this.completedJobIds.has(jobId)) {
            return { success: true, jobId };
        }

        if (!this.isConnected()) {
            try {
                if (options?.manual && !this.isNative()) await this.connectWithConsent(this.config?.connectionType === "BLUETOOTH" ? "BLUETOOTH" : undefined);
                else await this.autoConnect();
            } catch (error) {
                return { success: false, jobId, error: error instanceof Error ? error.message : "Không thể kết nối máy in.", errorCode: "PRINTER_NOT_CONNECTED" };
            }
        }
        if (!this.isConnected()) {
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
            if (this.completedJobIds.has(`${jobId}-${i}`)) continue;
            const bytes = buildPaymentReceiptEscPos(data, this.config || undefined);
            lastRes = await this.executeEscPosBytes(bytes, `${jobId}-${i}`);
            if (!lastRes.success) break;
        }

        if (lastRes.success) this.completedJobIds.add(jobId);
        return { ...lastRes, jobId };
    }

    private isDeskStation = false;
    private deskStationPollTimer: number | null = null;
    private deskStationListeners: Set<(isStation: boolean) => void> = new Set();

    public isStation(): boolean {
        if (typeof window !== "undefined" && !this.isDeskStation) {
            try {
                this.isDeskStation = localStorage.getItem("quanlihocau_desk_print_station") === "true";
            } catch {
                this.isDeskStation = false;
            }
        }
        return this.isDeskStation;
    }

    public subscribeDeskStation(listener: (isStation: boolean) => void): () => void {
        this.deskStationListeners.add(listener);
        listener(this.isStation());
        return () => {
            this.deskStationListeners.delete(listener);
        };
    }

    private notifyDeskStation(): void {
        const val = this.isStation();
        for (const l of this.deskStationListeners) {
            l(val);
        }
    }

    public setDeskStation(enabled: boolean): void {
        this.isDeskStation = enabled;
        try {
            if (enabled) {
                localStorage.setItem("quanlihocau_desk_print_station", "true");
            } else {
                localStorage.removeItem("quanlihocau_desk_print_station");
            }
        } catch {
            // Ignore storage errors
        }
        this.notifyDeskStation();
        if (enabled) {
            this.startDeskStationPolling();
        } else {
            this.stopDeskStationPolling();
        }
    }

    public startDeskStationPolling(): void {
        if (typeof window === "undefined") return;
        this.stopDeskStationPolling();
        // Lấy lệnh in mới mỗi 2 giây
        this.deskStationPollTimer = window.setInterval(() => {
            void this.pollCloudJobs();
        }, 2000);
        void this.pollCloudJobs();
    }

    public stopDeskStationPolling(): void {
        if (this.deskStationPollTimer !== null) {
            clearInterval(this.deskStationPollTimer);
            this.deskStationPollTimer = null;
        }
    }

    private isPollingJobs = false;

    public async pollCloudJobs(): Promise<void> {
        if (!this.isStation() || this.isPollingJobs || typeof window === "undefined") return;
        this.isPollingJobs = true;
        try {
            const res = await fetch("/api/print-jobs?poll=true");
            if (!res.ok) return;
            const data = await res.json();
            const jobs = data.jobs || [];

            for (const job of jobs) {
                try {
                    const payload = JSON.parse(job.payloadJson);
                    let printRes: PrintResult;

                    if (job.jobType === "SESSION_TICKET") {
                        printRes = await this.performSessionTicket(payload, { jobId: job.id });
                    } else if (job.jobType === "PAYMENT_RECEIPT") {
                        printRes = await this.performPaymentReceipt(payload, { jobId: job.id });
                    } else {
                        printRes = await this.performTest();
                    }

                    if (printRes.success) {
                        await fetch(`/api/print-jobs/${job.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                status: "PRINTED",
                                printedBy: "Trạm in bàn (" + (this.config?.device.name || "Máy in bàn") + ")",
                            }),
                        });
                    } else {
                        await fetch(`/api/print-jobs/${job.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                status: "FAILED",
                                error: printRes.error || "In thất bại tại trạm in bàn.",
                            }),
                        });
                    }
                } catch (jobErr) {
                    await fetch(`/api/print-jobs/${job.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            status: "FAILED",
                            error: jobErr instanceof Error ? jobErr.message : "Lỗi xử lý lệnh in.",
                        }),
                    });
                }
            }
        } catch {
            // Lỗi mạng hoặc server gián đoạn, tự thử lại ở lần sau
        } finally {
            this.isPollingJobs = false;
        }
    }

    /**
     * Đẩy lệnh in lên Hàng đợi Cloud Spooler khi in từ điện thoại di động
     */
    public async sendToCloudSpooler(
        jobType: "SESSION_TICKET" | "PAYMENT_RECEIPT" | "TEST",
        targetName: string,
        payload: SessionTicketData | PaymentReceiptData | object,
    ): Promise<PrintResult> {
        try {
            const res = await fetch("/api/print-jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobType,
                    targetName,
                    payload,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data.error || "Không thể gửi lệnh in tới trạm in bàn.");
            }

            return {
                success: true,
                jobId: data.job?.id || `cloud-${Date.now()}`,
            };
        } catch (err) {
            return {
                success: false,
                jobId: `cloud-err-${Date.now()}`,
                error: err instanceof Error ? err.message : "Lỗi khi gửi lệnh in đám mây.",
                errorCode: "PRINT_FAILED",
            };
        }
    }

    private async performTest(): Promise<PrintResult> {
        const jobId = `test-${Date.now()}`;
        if (!this.isConnected()) await this.autoConnect();
        if (!this.isConnected()) return { success: false, jobId, error: "Chưa kết nối máy in nhiệt.", errorCode: "PRINTER_NOT_CONNECTED" };
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

