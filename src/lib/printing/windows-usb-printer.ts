import type { PrinterDevice } from "./types";

const BRIDGE_URL = "http://127.0.0.1:17858";
const TOKEN_KEY = "quanlihocau_windows_print_token";

class WindowsUsbPrinter {
    private selected = false;
    isSelected(): boolean {
        if (this.selected) return true;
        if (typeof window === "undefined") return false;
        try {
            const config = JSON.parse(localStorage.getItem("quanlihocau_printer_config") || "null");
            return Boolean(config?.device?.id?.startsWith("windows-usb"));
        } catch { return false; }
    }
    activate() { this.selected = true; }
    deactivate() { this.selected = false; }
    private async request<T>(path: string, body: object = {}, pairing = false): Promise<T> {
        let token = "";
        try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch { /* Storage may be disabled. */ }
        if (!pairing && !token) throw new Error("Bấm Kết nối máy in PT-210 để cho phép app sử dụng máy in.");
        let response: Response;
        try {
            response = await fetch(`${BRIDGE_URL}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(!pairing ? { "X-Print-Token": token } : {}) },
                body: JSON.stringify(body),
                // Routine checks remain short; connection/print have safe timeouts
                signal: AbortSignal.timeout(path === "/pair" || (path === "/health" && pairing) ? 10000 : path === "/print" ? 30000 : 5000),
                // Supported Chrome/Edge versions can prompt for loopback access.
                targetAddressSpace: "loopback",
            } as RequestInit);
        } catch {
            throw new Error(path === "/print"
                ? "Mất liên lạc khi gửi vé. Kiểm tra giấy trước khi bấm in lại để tránh in trùng."
                : "Chưa kết nối được bộ hỗ trợ in. Hãy tải và mở QuanLiHoCau-PrintBridge.exe trên máy tính này rồi bấm Kết nối lại.");
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Kết nối máy in Windows thất bại.");
        return result as T;
    }
    async authorize() {
        const health = await this.request<{ version?: string }>("/health", {}, true);
        if (!health.version || parseInt(health.version, 10) < 2) throw new Error("Hãy tải và mở bản hỗ trợ in Windows từ mục Máy in trước khi kết nối.");
        const result = await this.request<{ token: string }>("/pair", {}, true);
        localStorage.setItem(TOKEN_KEY, result.token);
    }
    listUsbDevices() { return this.request<{ devices: PrinterDevice[] }>("/devices"); }
    async connectUsb() {
        const result = await this.request<{ success: boolean }>("/connect");
        return { ...result, deviceName: "Máy in PT210 / MP210 (USB Windows)" };
    }
    printRaw(options: { data: string }) { return this.request<{ success: boolean }>("/print", options); }
    disconnect() { return this.request<{ success: boolean }>("/disconnect"); }
    getStatus() { return this.request<{ status: "connected" | "disconnected"; isConnected: boolean }>("/status"); }
    async scanBluetooth(): Promise<{ devices: PrinterDevice[] }> { throw new Error("Dùng nút Bluetooth để kết nối RPP02N."); }
    async connectBluetooth(): Promise<{ success: boolean }> { throw new Error("Kết nối này chỉ dành cho MP210 USB."); }
    async connectWifi(): Promise<{ success: boolean }> { throw new Error("Kết nối này chỉ dành cho MP210 USB."); }
}
export const windowsUsbPrinter = new WindowsUsbPrinter();
