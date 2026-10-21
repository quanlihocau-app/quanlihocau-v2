import { EscPosBuilder, removeVietnameseTones } from "./escpos";
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
    // Standard Font A is readable on the MP210's 48 mm printable area.
    // Omit QR and redundant lines to keep ordinary tickets near 12 cm or less.
    const charsPerLine = config?.paperWidthMm === 80 ? 48 : 32;
    const encoding = config?.encoding ?? "ascii-normalized";
    const builder = new EscPosBuilder(charsPerLine, encoding);
    builder.font("A").size(1, 1).lineSpacing(26);

    // Wrap customer text instead of truncating names, huts or important notes.
    const line = (value: string) => {
        let remaining = encoding === "ascii-normalized" ? removeVietnameseTones(value) : value;
        for (const paragraph of remaining.split(/\r?\n/)) {
            remaining = paragraph;
            while (remaining.length > charsPerLine) {
                const breakAt = remaining.lastIndexOf(" ", charsPerLine);
                const end = breakAt > 0 ? breakAt : charsPerLine;
                builder.line(remaining.slice(0, end));
                remaining = remaining.slice(end).trimStart();
            }
            builder.line(remaining);
        }
    };

    const isPrepaid = data.paymentTiming === "PREPAID" ||
        (data.prepaidAmountVnd !== undefined && data.prepaidAmountVnd > 0);
    builder.align("center").bold(true);
    if (data.organizationName && data.organizationName !== data.lakeName) line(data.organizationName.toUpperCase());
    line(data.lakeName.toUpperCase());
    line(isPrepaid ? "VE CAU - DA THANH TOAN" : "VE CAU - THU SAU");
    builder.bold(false);
    if (data.isReprint) line("*** BAN IN LAI ***");
    line(`Ma ve: ${data.ticketCode || data.sessionId.slice(0, 8).toUpperCase()}`);
    builder.align("left").divider("-");

    const huts = data.huts.map(h => h.areaName ? `${h.name} (${h.areaName})` : h.name).join(", ");
    line(`Choi: ${huts || "Tu do"}`);
    line(`Goi: ${data.packageName}`);
    builder.twoCols(`${data.durationMinutes} phut`, formatVnd(data.packagePriceVnd));
    if (data.customerName) line(`Khach: ${data.customerName}`);
    if (data.customerPhone) line(`SDT: ${data.customerPhone}`);
    line(`Vao: ${formatDateTime(data.startAt)}`);
    if (data.plannedEndAt) line(`Het: ${formatDateTime(data.plannedEndAt)}`);
    if (data.cashierName && config?.template?.showCashierName !== false) line(`NV: ${data.cashierName}`);
    if (data.note) line(`Ghi chu: ${data.note}`);
    if (data.items?.length) {
        builder.divider("-");
        line("SAN PHAM / DICH VU:");
        for (const item of data.items) {
            builder.twoCols(`${item.name} x${item.quantity}`, formatVnd(item.totalVnd));
        }
    }
    builder.divider("-");
    const itemsTotal = data.items?.reduce((sum, item) => sum + item.totalVnd, 0) || 0;
    const totalBill = data.packagePriceVnd + itemsTotal;
    builder.bold(true).twoCols("Tong cong:", formatVnd(totalBill)).bold(false);
    const paidAmount = data.prepaidAmountVnd ?? (isPrepaid ? totalBill : 0);
    const remainingAmount = data.balanceDueVnd ?? Math.max(0, totalBill - paidAmount);
    builder.twoCols("Da thu:", formatVnd(paidAmount));
    builder.bold(true).twoCols("Con thu:", formatVnd(remainingAmount)).bold(false);
    if (data.paymentMethod) {
        const method = data.paymentMethod === "CASH" ? "Tien mat" : data.paymentMethod === "BANK_TRANSFER" ? "Chuyen khoan" : data.paymentMethod;
        line(`Thanh toan: ${method}`);
    }
    builder.align("center");
    line("Giu ve den het ca. Cam on quy khach!");
    builder.feed(1).cut();
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

    // 4. Financial Summary — show the complete charge, then clarify prior payments and the remaining balance.
    const hourTotal =
        (data.packageTotalVnd ?? 0) +
        (data.extensionsTotalVnd ?? 0) +
        (data.overtimeTotalVnd ?? 0);
    const itemsTotal = data.itemsTotalVnd ?? 0;
    const fishTotal = data.fishBuybackTotalVnd ?? 0;
    // prepaidAmountVnd is the portion of total paid before checkout; don't deduct it twice.
    const prepaidTotal = data.prepaidAmountVnd ?? 0;

    if (hourTotal > 0) {
        builder.twoCols("Tien gio cau:", formatVnd(hourTotal));
    }
    if (itemsTotal > 0) {
        builder.twoCols("+ San pham/Moi:", formatVnd(itemsTotal));
    }
    if (fishTotal > 0) {
        builder.twoCols("Tru tien ca thu lai:", `-${formatVnd(fishTotal)}`);
    }
    builder.divider("-");
    builder.bold(true).twoCols("TONG HOA DON:", formatVnd(data.invoiceTotalVnd ?? data.totalAmountVnd)).bold(false);
    if (prepaidTotal > 0) {
        builder.twoCols("Ve da thanh toan:", formatVnd(prepaidTotal));
    }
    const supplementaryPaid = Math.max(0, (data.paidAmountVnd ?? 0) - prepaidTotal);
    if (supplementaryPaid > 0) {
        builder.twoCols("Da thu them:", formatVnd(supplementaryPaid));
    }
    builder.divider("-");
    if (data.refundAmountVnd && data.refundAmountVnd > 0) {
        builder.bold(true);
        builder.twoCols("THOI LAI KHACH:", formatVnd(data.refundAmountVnd));
        builder.bold(false);
    } else if (data.remainingVnd > 0) {
        builder.bold(true);
        builder.twoCols("= CAN THU:", formatVnd(data.remainingVnd));
        builder.bold(false);
    } else {
        builder.bold(true);
        builder.twoCols("= THANH TOAN DU", "0d");
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
