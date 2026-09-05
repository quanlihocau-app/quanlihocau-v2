/**
 * ESC/POS Command generator and text formatter for 58mm Thermal Printers (32 chars/line).
 */

export function removeVietnameseTones(str: string): string {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

export function formatTwoColumns(
    left: string,
    right: string,
    width = 32,
): string {
    const totalLen = left.length + right.length;
    if (totalLen >= width) {
        // Truncate left or return on two lines if too long
        const availableLeft = Math.max(1, width - right.length - 1);
        const truncatedLeft = left.length > availableLeft ? left.slice(0, availableLeft - 1) + "…" : left;
        const spaces = Math.max(1, width - truncatedLeft.length - right.length);
        return truncatedLeft + " ".repeat(spaces) + right;
    }
    const spaces = width - totalLen;
    return left + " ".repeat(spaces) + right;
}

export function formatDivider(char = "-", width = 32): string {
    return char.repeat(width);
}

export class EscPosBuilder {
    private buffer: number[] = [];
    private charsPerLine: number;
    private defaultEncoding: "utf-8" | "ascii-normalized";

    constructor(charsPerLine = 32, defaultEncoding: "utf-8" | "ascii-normalized" = "ascii-normalized") {
        this.charsPerLine = charsPerLine;
        this.defaultEncoding = defaultEncoding;
        this.init();
    }

    /**
     * ESC @ - Initialize printer
     */
    init(): this {
        this.buffer.push(0x1b, 0x40);
        return this;
    }

    /**
     * ESC a n - Select justification
     */
    align(alignment: "left" | "center" | "right"): this {
        let n = 0;
        if (alignment === "center") n = 1;
        if (alignment === "right") n = 2;
        this.buffer.push(0x1b, 0x61, n);
        return this;
    }

    /**
     * ESC E n - Turn emphasized mode on/off
     */
    bold(enable = true): this {
        this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
        return this;
    }

    /**
     * GS ! n - Select character size (1 to 2)
     */
    size(widthMul = 1, heightMul = 1): this {
        const w = Math.min(2, Math.max(1, widthMul)) - 1;
        const h = Math.min(2, Math.max(1, heightMul)) - 1;
        const n = (w << 4) | h;
        this.buffer.push(0x1d, 0x21, n);
        return this;
    }

    /**
     * Invert colors (white on black)
     */
    invert(enable = true): this {
        this.buffer.push(0x1d, 0x42, enable ? 1 : 0);
        return this;
    }

    /**
     * Append text with encoding
     */
    text(
        content: string,
        options?: { encoding?: "utf-8" | "ascii-normalized" },
    ): this {
        const encoding = options?.encoding ?? this.defaultEncoding;
        const formatted = encoding === "ascii-normalized" ? removeVietnameseTones(content) : content;

        const bytes = new TextEncoder().encode(formatted);
        for (let i = 0; i < bytes.length; i++) {
            this.buffer.push(bytes[i]);
        }
        return this;
    }

    /**
     * Append a line of text followed by newline (LF)
     */
    line(
        content = "",
        options?: { encoding?: "utf-8" | "ascii-normalized" },
    ): this {
        if (content) {
            this.text(content, options);
        }
        this.buffer.push(0x0a);
        return this;
    }

    /**
     * Append two columns of text justified left and right
     */
    twoCols(
        left: string,
        right: string,
        options?: { encoding?: "utf-8" | "ascii-normalized" },
    ): this {
        const encoding = options?.encoding ?? this.defaultEncoding;
        const normLeft = encoding === "ascii-normalized" ? removeVietnameseTones(left) : left;
        const normRight = encoding === "ascii-normalized" ? removeVietnameseTones(right) : right;
        const formatted = formatTwoColumns(normLeft, normRight, this.charsPerLine);
        return this.line(formatted, { encoding: "utf-8" }); // already normalized if needed
    }

    /**
     * Divider line (e.g. --------------------------------)
     */
    divider(char = "-"): this {
        return this.line(formatDivider(char, this.charsPerLine));
    }

    /**
     * Feed n lines
     */
    feed(lines = 1): this {
        for (let i = 0; i < lines; i++) {
            this.buffer.push(0x0a);
        }
        return this;
    }

    /**
     * Standard ESC/POS QR Code (Model 2)
     */
    qrCode(data: string, size = 5): this {
        const bytes = new TextEncoder().encode(data);
        const len = bytes.length + 3;
        const pL = len % 256;
        const pH = Math.floor(len / 256);

        this.align("center");

        // Set QR model 2
        this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
        // Set QR size (1-16)
        this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);
        // Set error correction level M (48=L, 49=M, 50=Q, 51=H)
        this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
        // Store data in symbol storage area
        this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
        for (let i = 0; i < bytes.length; i++) {
            this.buffer.push(bytes[i]);
        }
        // Print symbol
        this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
        this.feed(1);
        this.align("left");
        return this;
    }

    /**
     * GS V 66 0 - Partial paper cut (if supported)
     */
    cut(): this {
        this.buffer.push(0x1d, 0x56, 0x42, 0x00);
        return this;
    }

    /**
     * Get compiled ESC/POS byte array
     */
    build(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}
