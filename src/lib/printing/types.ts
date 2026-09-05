export type PrinterConnectionType = "BLUETOOTH" | "USB" | "WIFI";

export type PrinterStatus =
    | "disconnected"
    | "scanning"
    | "connecting"
    | "connected"
    | "printing"
    | "error";

export type PrintErrorCode =
    | "PRINTER_NOT_CONNECTED"
    | "BLUETOOTH_DISABLED"
    | "PERMISSION_DENIED"
    | "DEVICE_NOT_FOUND"
    | "CONNECTION_TIMEOUT"
    | "OUT_OF_PAPER"
    | "PRINT_FAILED"
    | "UNSUPPORTED_PLATFORM"
    | "JOB_IN_PROGRESS";

export interface PrinterDevice {
    id: string; // MAC address for BT, USB ID for USB, IP:Port for WiFi
    name: string;
    connectionType: PrinterConnectionType;
    address: string;
    isConnected?: boolean;
    vendorId?: number; // for USB
    productId?: number; // for USB
    port?: number; // for WiFi
}

export interface PrinterTemplateConfig {
    headerTitle: string; // "Vé câu" / "Hóa đơn thanh toán"
    footerNote: string; // "Cảm ơn quý khách & Hẹn gặp lại!"
    showLakeName: boolean;
    showLogo: boolean;
    showPhone: boolean;
    showAddress: boolean;
    showCashierName: boolean;
    autoPrintSession: boolean;
    autoPrintPayment: boolean;
    paperWidthMm: 58 | 80;
    copiesCount: number; // 1 to 3
}

export const DEFAULT_TEMPLATE_CONFIG: PrinterTemplateConfig = {
    headerTitle: "Vé câu",
    footerNote: "Cảm ơn quý khách & Hẹn gặp lại!",
    showLakeName: true,
    showLogo: true,
    showPhone: true,
    showAddress: true,
    showCashierName: true,
    autoPrintSession: true,
    autoPrintPayment: true,
    paperWidthMm: 58,
    copiesCount: 1,
};

export interface PrinterConfig {
    connectionType: PrinterConnectionType;
    device: PrinterDevice;
    paperWidthMm: number; // default 58
    charsPerLine: number; // default 32
    encoding: "utf-8" | "ascii-normalized";
    template: PrinterTemplateConfig;
}

export interface SessionTicketData {
    sessionId: string;
    ticketCode?: string;
    lakeName: string;
    organizationName?: string;
    huts: Array<{ name: string; areaName?: string }>;
    packageName: string;
    packagePriceVnd: number;
    durationMinutes: number;
    customerName?: string | null;
    customerPhone?: string | null;
    startAt: Date | string;
    plannedEndAt?: Date | string | null;
    cashierName?: string | null;
    items?: Array<{ name: string; quantity: number; unitPrice: number; totalVnd: number }>;
    prepaidAmountVnd?: number;
    paymentMethod?: string;
    balanceDueVnd?: number;
    isReprint?: boolean;
    note?: string | null;
}

export interface PaymentReceiptLineItem {
    name: string;
    quantity: number;
    unitPrice: number;
    totalVnd: number;
}

export interface PaymentReceiptData {
    invoiceId: string;
    sessionId?: string;
    paymentId?: string;
    lakeName: string;
    organizationName?: string;
    customerName?: string | null;
    customerPhone?: string | null;
    hutNames?: string | null;
    packageName?: string | null;
    lines: PaymentReceiptLineItem[];
    totalAmountVnd: number;
    paidAmountVnd: number;
    paymentAmountVnd?: number;
    remainingVnd: number;
    refundAmountVnd?: number;
    paymentMethod: string;
    paymentTime: Date | string;
    cashierName?: string | null;
    isReprint?: boolean;
}

export interface TestReceiptData {
    lakeName?: string;
    connectionType: PrinterConnectionType;
    deviceName: string;
    time: Date | string;
}

export type PrintJobType =
    | "SESSION_TICKET"
    | "PAYMENT_RECEIPT"
    | "TEST_RECEIPT";

export interface PrintJob {
    jobId: string;
    type: PrintJobType;
    data: SessionTicketData | PaymentReceiptData | TestReceiptData;
    createdAt: number;
}

export interface PrintResult {
    success: boolean;
    jobId: string;
    error?: string;
    errorCode?: PrintErrorCode;
}
