import { EscPosBuilder } from "./escpos";
import {
    PaymentReceiptData,
    PrinterConfig,
    SessionTicketData,
    TestReceiptData,
} from "./types";

function formatVnd(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + "d";
}

function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(d);
}

export function buildSessionTicketEscPos(
    data: SessionTicketData,
    config?: Partial<PrinterConfig>,
): Uint8Array {
    const charsPerLine = config?.charsPerLine ?? 32;
    const encoding = config?.encoding ?? "ascii-normalized";
    const builder = new EscPosBuilder(charsPerLine, encoding);

    // 1. Header
    builder.align("center");
    if (data.organizationName) {
        builder.text(data.organizationName.toUpperCase()).feed(1);
    }
    builder.bold(true).size(2, 2).text(data.lakeName.toUpperCase()).feed(1);
    builder.bold(false).size(1, 1);
    builder.bold(true).text("--- PHIEU CAU CA ---").feed(1);
    if (data.isReprint) {
        builder.bold(true).text("*** BAN IN LAI ***").feed(1);
    }
    builder.bold(false);
    const displayTicketCode = data.ticketCode || `#${data.sessionId.slice(0, 8).toUpperCase()}`;
    builder.text(`Ma phien: ${displayTicketCode}`).feed(1);
    builder.divider("=");

    // 2. Info section
    builder.align("left");
    const hutList = data.huts.map((h) => h.areaName ? `${h.name} (${h.areaName})` : h.name).join(", ");
    builder.twoCols("Vi tri / Choi:", hutList || "Tu do");
    builder.twoCols("Goi cau:", data.packageName);
    builder.twoCols("Thoi luong:", `${data.durationMinutes} phut`);
    builder.twoCols("Gia goi:", formatVnd(data.packagePriceVnd));

    if (data.customerName) {
        builder.twoCols("Khach hang:", data.customerName);
        if (data.customerPhone) {
            builder.twoCols("SDT:", data.customerPhone);
        }
    }

    builder.divider("-");
    builder.twoCols("Gio bat dau:", formatDateTime(data.startAt));
    if (data.plannedEndAt) {
        builder.twoCols("Du kien het:", formatDateTime(data.plannedEndAt));
    }
    if (data.cashierName) {
        builder.twoCols("Nhan vien:", data.cashierName);
    }
    if (data.note) {
        builder.twoCols("Ghi chu:", data.note);
    }

    // 3. Initial products bought with session
    if (data.items && data.items.length > 0) {
        builder.divider("-");
        builder.bold(true).text("Hang mua kem:").bold(false).feed(1);
        for (const item of data.items) {
            builder.twoCols(`${item.name} x${item.quantity}`, formatVnd(item.totalVnd));
        }
    }

    // 4. Prepayment / Financials at ticket creation
    if (data.prepaidAmountVnd !== undefined) {
        builder.divider("-");
        builder.twoCols("Tam thu (Coc):", formatVnd(data.prepaidAmountVnd));
        if (data.paymentMethod) {
            const methodLabel =
                data.paymentMethod === "CASH"
                    ? "Tien mat"
                    : data.paymentMethod === "BANK_TRANSFER"
                    ? "Chuyen khoan"
                    : data.paymentMethod;
            builder.twoCols("Hinh thuc:", methodLabel);
        }
        if (data.balanceDueVnd !== undefined) {
            builder.bold(true);
            builder.twoCols("Con lai:", formatVnd(data.balanceDueVnd));
            builder.bold(false);
        }
    }

    builder.divider("=");

    // 5. QR Code for Ticket verification
    builder.align("center");
    builder.qrCode(`SESSION:${data.sessionId}`, 4);

    // 6. Footer
    builder.text("Chuc quy can thu giat ca moi tay!").feed(1);
    builder.text("Vui long giu phieu den het gio cau.").feed(1);
    builder.feed(3);
    builder.cut();

    return builder.build();
}

export function buildPaymentReceiptEscPos(
    data: PaymentReceiptData,
    config?: Partial<PrinterConfig>,
): Uint8Array {
    const charsPerLine = config?.charsPerLine ?? 32;
    const encoding = config?.encoding ?? "ascii-normalized";
    const builder = new EscPosBuilder(charsPerLine, encoding);

    // 1. Header
    builder.align("center");
    if (data.organizationName) {
        builder.text(data.organizationName.toUpperCase()).feed(1);
    }
    builder.bold(true).size(2, 2).text(data.lakeName.toUpperCase()).feed(1);
    builder.bold(false).size(1, 1);
    builder.bold(true).text("--- BIEN LAI THANH TOAN ---").feed(1);
    if (data.isReprint) {
        builder.bold(true).text("*** BAN IN LAI ***").feed(1);
    }
    builder.bold(false);
    builder.text(`Hoa don: #${data.invoiceId.slice(0, 8).toUpperCase()}`).feed(1);
    if (data.sessionId) {
        builder.text(`Ma phien: #${data.sessionId.slice(0, 8).toUpperCase()}`).feed(1);
    }
    if (data.paymentId) {
        builder.text(`Ma GD: #${data.paymentId.slice(0, 8).toUpperCase()}`).feed(1);
    }
    builder.divider("=");

    // 2. Customer & Session info
    builder.align("left");
    if (data.customerName) {
        builder.twoCols("Khach hang:", data.customerName);
        if (data.customerPhone) {
            builder.twoCols("SDT:", data.customerPhone);
        }
    }
    if (data.hutNames) {
        builder.twoCols("Vi tri / Choi:", data.hutNames);
    }
    if (data.packageName) {
        builder.twoCols("Goi cau:", data.packageName);
    }

    builder.divider("-");

    // 3. Itemized lines
    builder.bold(true);
    builder.twoCols("Ten muc", "Thanh tien");
    builder.bold(false);
    builder.divider("-");

    for (const item of data.lines) {
        builder.twoCols(item.name, formatVnd(item.totalVnd));
        if (item.quantity > 1 || item.unitPrice !== item.totalVnd) {
            builder.text(`  x${item.quantity} @ ${formatVnd(item.unitPrice)}`).feed(1);
        }
    }

    builder.divider("=");

    // 4. Financial Summary
    builder.twoCols("Tong cong:", formatVnd(data.totalAmountVnd));
    if (data.paymentAmountVnd !== undefined && data.paymentAmountVnd > 0) {
        builder.bold(true);
        builder.twoCols("Thu lan nay:", formatVnd(data.paymentAmountVnd));
        builder.bold(false);
    }
    builder.twoCols("Da thanh toan:", formatVnd(data.paidAmountVnd));
    if (data.refundAmountVnd && data.refundAmountVnd > 0) {
        builder.bold(true);
        builder.twoCols("Hoan tra khach:", formatVnd(data.refundAmountVnd));
        builder.bold(false);
    } else {
        builder.bold(true);
        builder.twoCols("Con lai:", formatVnd(data.remainingVnd));
        builder.bold(false);
    }

    builder.divider("-");
    const methodLabel =
        data.paymentMethod === "CASH"
            ? "Tien mat"
            : data.paymentMethod === "BANK_TRANSFER"
            ? "Chuyen khoan"
            : data.paymentMethod;
    builder.twoCols("Phuong thuc:", methodLabel);
    builder.twoCols("Thoi gian:", formatDateTime(data.paymentTime));
    if (data.cashierName) {
        builder.twoCols("Thu ngan:", data.cashierName);
    }

    builder.divider("=");

    // 5. QR Code & Footer
    builder.align("center");
    builder.qrCode(`INVOICE:${data.invoiceId}`, 4);
    builder.text("Cam on quy khach & Hen gap lai!").feed(1);
    builder.feed(3);
    builder.cut();

    return builder.build();
}

export function buildTestReceiptEscPos(
    data: TestReceiptData,
    config?: Partial<PrinterConfig>,
): Uint8Array {
    const charsPerLine = config?.charsPerLine ?? 32;
    const encoding = config?.encoding ?? "ascii-normalized";
    const builder = new EscPosBuilder(charsPerLine, encoding);

    builder.align("center");
    builder.bold(true).size(2, 2).text("IN KIEM TRA MAY").feed(1);
    builder.bold(false).size(1, 1);
    if (data.lakeName) {
        builder.text(data.lakeName).feed(1);
    }
    builder.divider("=");

    builder.align("left");
    builder.twoCols("Ket noi:", data.connectionType);
    builder.twoCols("Thiet bi:", data.deviceName);
    builder.twoCols("Thoi gian:", formatDateTime(data.time));
    builder.twoCols("Kho giay:", `${charsPerLine} ky tu (58mm)`);
    builder.twoCols("Ma hoa:", encoding);
    builder.divider("-");

    builder.text("Kiem tra dinh dang chu:").feed(1);
    builder.bold(true).text("  -> Chu in dam (Bold)").feed(1).bold(false);
    builder.text("  -> Can giua / Can trai").feed(1);
    builder.divider("-");

    builder.align("center");
    builder.qrCode("QUANLIHOCAU-TEST-OK", 4);
    builder.bold(true).text("MAY IN SAN SANG HOAT DONG!").feed(1).bold(false);
    builder.feed(3);
    builder.cut();

    return builder.build();
}
