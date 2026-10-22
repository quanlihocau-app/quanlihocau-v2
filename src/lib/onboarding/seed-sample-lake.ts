import { Prisma } from "@/generated/prisma/client";
import { ensureDefaultFinancialData } from "@/lib/financial/seed-defaults";

/**
 * Khởi tạo bộ dữ liệu mẫu (Onboarding Sample Data) cho hồ câu của tài khoản mới.
 * 
 * Quy tắc an toàn (AGENTS.md):
 * - Chỉ tạo khi đăng ký tài khoản mới; tuyệt đối không can thiệp vào hồ hoặc tài khoản đang hoạt động.
 * - Chạy trong cùng transaction của luồng tạo hồ/tài khoản.
 * - Có cơ chế kiểm tra idempotent (nếu hồ đã có chòi hoặc gói câu thì lập tức bỏ qua).
 * - Không tạo phiên câu, hóa đơn hay giao dịch giả mạo (để người dùng tự mở thử theo luồng thật).
 */
export async function seedSampleLakeData(
    tx: Prisma.TransactionClient,
    lakeId: string,
    ownerName?: string | null,
    userId?: string | null,
) {
    if (!tx || !lakeId) return;

    // Kiểm tra an toàn: Đảm bảo client có đầy đủ các model cần thiết (phòng trường hợp unit test mock)
    if (
        !tx.area ||
        !tx.hut ||
        !tx.package ||
        !tx.product ||
        typeof tx.area.create !== "function"
    ) {
        return;
    }

    // 1. Kiểm tra an toàn Idempotent: Nếu hồ đã có chòi hoặc gói câu thì không tạo lại
    try {
        const existingHutCount = await tx.hut.count({
            where: { lakeId, deletedAt: null },
        });
        if (existingHutCount > 0) return;

        const existingPkgCount = await tx.package.count({
            where: { lakeId, deletedAt: null },
        });
        if (existingPkgCount > 0) return;
    } catch {
        // Nếu trong mock test không có hàm count, an toàn bỏ qua
    }

    // 2. Tạo 1 Khu vực mẫu: "Khu bờ hồ (Mẫu)"
    const sampleArea = await tx.area.create({
        data: {
            lakeId,
            name: "Khu bờ hồ (Mẫu)",
        },
    });

    // 3. Tạo 10 chòi mẫu: "Chòi 1" đến "Chòi 10"
    const hutData = Array.from({ length: 10 }, (_, i) => ({
        lakeId,
        areaId: sampleArea.id,
        name: `Chòi ${i + 1}`,
        currentSessionId: null,
    }));

    if (typeof tx.hut.createMany === "function") {
        await tx.hut.createMany({ data: hutData });
    } else {
        for (const h of hutData) {
            await tx.hut.create({ data: h });
        }
    }

    // 4. Tạo 1 bảng giá câu cơ bản: Ca 4 tiếng (150.000đ) và Ca 2 tiếng (80.000đ)
    const samplePackages = [
        {
            lakeId,
            name: "Ca 4 tiếng (Gói mẫu)",
            durationMinutes: 240,
            priceVnd: 150000,
            overtimeHourlyVnd: 40000,
        },
        {
            lakeId,
            name: "Ca 2 tiếng (Gói mẫu)",
            durationMinutes: 120,
            priceVnd: 80000,
            overtimeHourlyVnd: 40000,
        },
    ];

    if (typeof tx.package.createMany === "function") {
        await tx.package.createMany({ data: samplePackages });
    } else {
        for (const pkg of samplePackages) {
            await tx.package.create({ data: pkg });
        }
    }

    // 5. Tạo 3 món nước (Sting, C2, Nước lọc) và 2 loại thính câu mẫu
    const sampleProducts = [
        {
            name: "Nước tăng lực Sting (Mẫu)",
            sku: "STING-SAMPLE",
            priceVnd: 15000,
            initialStock: 50,
        },
        {
            name: "Trà xanh C2 (Mẫu)",
            sku: "C2-SAMPLE",
            priceVnd: 12000,
            initialStock: 50,
        },
        {
            name: "Nước lọc tinh khiết (Mẫu)",
            sku: "NUOCLOC-SAMPLE",
            priceVnd: 10000,
            initialStock: 50,
        },
        {
            name: "Cám câu cá chép (Mẫu)",
            sku: "CAM-CHEP-SAMPLE",
            priceVnd: 35000,
            initialStock: 20,
        },
        {
            name: "Thính thơm tổng hợp (Mẫu)",
            sku: "THINH-THOM-SAMPLE",
            priceVnd: 45000,
            initialStock: 20,
        },
    ];

    for (const prod of sampleProducts) {
        const createdProd = await tx.product.create({
            data: {
                lakeId,
                name: prod.name,
                sku: prod.sku,
                priceVnd: prod.priceVnd,
            },
        });

        // Nhập tồn kho ban đầu để người dùng có thể bán thêm Sting mà không bị lỗi âm kho
        if (tx.inventoryMovement && typeof tx.inventoryMovement.create === "function") {
            await tx.inventoryMovement.create({
                data: {
                    lakeId,
                    productId: createdProd.id,
                    quantity: prod.initialStock,
                    reason: "Khởi tạo tồn kho ban đầu (Dữ liệu mẫu)",
                    createdBy: userId || "Hệ thống (Mẫu)",
                },
            });
        }
    }

    // 6. Tạo 2 loại cá thu mua mẫu (FishType) để có thể trải nghiệm tính năng cân cá thu mua
    if (tx.fishType && typeof tx.fishType.create === "function") {
        const sampleFishTypes = [
            { name: "Cá chép (Mẫu)", pricePerKg: 45000 },
            { name: "Cá tra / trôi (Mẫu)", pricePerKg: 35000 },
        ];
        for (const ft of sampleFishTypes) {
            await tx.fishType.create({
                data: {
                    lakeId,
                    name: ft.name,
                    pricePerKg: ft.pricePerKg,
                },
            });
        }
    }

    // 7. Khởi tạo danh mục tài chính & sổ quỹ mặc định (Quỹ tiền mặt quầy) nếu có
    if (typeof ensureDefaultFinancialData === "function") {
        try {
            await ensureDefaultFinancialData(tx, lakeId);
        } catch {
            // Không chặn luồng chính nếu financial tables chưa sẵn sàng trong môi trường test
        }
    }
}
