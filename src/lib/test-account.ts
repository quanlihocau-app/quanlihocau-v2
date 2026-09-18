/**
 * Tiện ích phân loại tài khoản thử nghiệm / nội bộ vs khách thương mại thực tế
 * Dựa trên bằng chứng rõ ràng (tên hồ, email, số điện thoại)
 * Tuyệt đối không xóa dữ liệu, chỉ gắn nhãn để đo lường kinh doanh chính xác.
 */

export function isTestLake(name: string, email?: string | null): boolean {
    const n = (name || "").toLowerCase().trim();
    const e = (email || "").toLowerCase().trim();

    return (
        n.includes("test") ||
        n.includes("demo") ||
        n.includes("thử nghiệm") ||
        n.includes("thu nghiem") ||
        n.includes("sample") ||
        e.includes("test") ||
        e.includes("demo") ||
        e.includes("example.com") ||
        e.endsWith("@quanlihocau.internal")
    );
}

export function isTestUser(name?: string | null, email?: string | null, phone?: string | null): boolean {
    const n = (name || "").toLowerCase().trim();
    const e = (email || "").toLowerCase().trim();
    const p = (phone || "").trim();

    return (
        n.includes("test") ||
        n.includes("demo") ||
        n.includes("thử nghiệm") ||
        e.includes("test") ||
        e.includes("demo") ||
        e.includes("example.com") ||
        p === "0900000000" ||
        p === "0999999999" ||
        p.startsWith("000")
    );
}
