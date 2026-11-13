import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { ensureDefaultFinancialData } from "@/lib/financial/seed-defaults";

/**
 * Khởi tạo bộ dữ liệu mẫu (Onboarding Sample Data) cho hồ câu của tài khoản mới.
 * 
 * Quy tắc an toàn (AGENTS.md):
 * - Chỉ tạo khi đăng ký tài khoản mới; tuyệt đối không can thiệp vào hồ hoặc tài khoản đang hoạt động.
 * - Chạy trong cùng transaction của luồng tạo hồ/tài khoản.
 * - Có cơ chế kiểm tra idempotent (nếu hồ đã có chòi hoặc gói câu thì lập tức bỏ qua).
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

    // 3. Tạo 10 ô số mẫu: "Ô số 1" đến "Ô số 10"
    const hutData = Array.from({ length: 10 }, (_, i) => ({
        lakeId,
        areaId: sampleArea.id,
        name: `Ô số ${i + 1}`,
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

    // 8. Tạo 2 phiên câu mẫu (1 Đang câu + 1 Quá giờ) để chủ hồ mới mở app là thấy ngay màn hình sống động
    try {
        await createSampleSessions(tx, lakeId);
    } catch (err) {
        console.warn("[seedSampleLakeData] Không thể tạo phiên câu mẫu:", err);
    }
}

/**
 * Tạo 2 phiên câu mẫu đang chạy thực tế trên hồ để chủ hồ trải nghiệm trọn vẹn POS:
 * - Vé 1 (Chòi 2): Nguyễn Văn Tuấn (Cần thủ VIP) · Ca 4 tiếng · Còn 2h30p · Đã gọi 1 Sting
 * - Vé 2 (Chòi 5): Trần Hải (Khách quen) · Ca 2 tiếng · Quá giờ 15p (+phụ thu tự động)
 */
export async function createSampleSessions(
    tx: Prisma.TransactionClient,
    lakeId: string,
): Promise<{ count: number; error?: string }> {
    if (
        !tx.fishingSession ||
        !tx.fishingSessionHut ||
        !tx.invoice ||
        !tx.invoiceLine ||
        !tx.hut ||
        !tx.package
    ) {
        return { count: 0, error: "Thiếu client models cần thiết" };
    }

    // 1. Tìm hoặc tạo 2 khách hàng mẫu
    let customer1: { id: string; name: string } | null = null;
    let customer2: { id: string; name: string } | null = null;

    if (tx.customer && typeof tx.customer.findFirst === "function") {
        try {
            customer1 = await tx.customer.findFirst({
                where: { lakeId, phoneNormalized: "+84987654321", deletedAt: null },
            });
            customer2 = await tx.customer.findFirst({
                where: { lakeId, phoneNormalized: "+84912345678", deletedAt: null },
            });

            if (!customer1 && typeof tx.customer.create === "function") {
                customer1 = await tx.customer.create({
                    data: {
                        lakeId,
                        name: "Nguyễn Văn Tuấn (Cần thủ VIP)",
                        phoneNormalized: "+84987654321",
                        isSample: true,
                    },
                });
            }

            if (!customer2 && typeof tx.customer.create === "function") {
                customer2 = await tx.customer.create({
                    data: {
                        lakeId,
                        name: "Trần Hải (Khách quen)",
                        phoneNormalized: "+84912345678",
                        isSample: true,
                    },
                });
            }
        } catch {
            // Fallback an toàn nếu có xung đột số điện thoại
            customer1 = await tx.customer.findFirst({ where: { lakeId, deletedAt: null } });
        }
    }

    // 2. Tìm chòi trống (ưu tiên Chòi 2 và Chòi 5 nếu trống, hoặc 2 chòi trống bất kỳ)
    const emptyHuts = await tx.hut.findMany({
        where: {
            lakeId,
            deletedAt: null,
            currentSessionId: null,
        },
        orderBy: { name: "asc" },
    });

    if (emptyHuts.length === 0) {
        return { count: 0, error: "Hồ hiện không còn ô số nào trống để mở vé mẫu." };
    }

    const hut1 = emptyHuts.find((h) => h.name.includes("2")) || emptyHuts[0];
    const hut2 =
        emptyHuts.find((h) => h.name.includes("5") && h.id !== hut1.id) ||
        emptyHuts.find((h) => h.id !== hut1.id);

    // 3. Tìm gói câu (ưu tiên gói 4h và gói 2h)
    const packages = await tx.package.findMany({
        where: { lakeId, deletedAt: null },
        orderBy: { durationMinutes: "desc" },
    });

    if (packages.length === 0) {
        return { count: 0, error: "Hồ chưa có bảng giá gói câu." };
    }

    const pkg1 = packages.find((p) => p.durationMinutes >= 240) || packages[0];
    const pkg2 =
        packages.find((p) => p.durationMinutes <= 120 && p.id !== pkg1.id) ||
        packages[packages.length - 1] ||
        packages[0];

    // 4. Tìm sản phẩm mẫu (Sting)
    let stingProd: { id: string; name: string; priceVnd: number } | null = null;
    if (tx.product && typeof tx.product.findFirst === "function") {
        stingProd = await tx.product.findFirst({
            where: { lakeId, deletedAt: null, name: { contains: "Sting" } },
        });
    }

    const now = Date.now();
    let createdCount = 0;

    // --- Tạo Vé Mẫu 1 (Đang câu bình thường, còn ~2h30p, có gọi 1 Sting) ---
    if (hut1) {
        const duration1 = pkg1.durationMinutes || 240;
        // Đã câu 90 phút (1h30p)
        const startAt1 = new Date(now - 90 * 60 * 1000);
        const plannedEndAt1 = new Date(startAt1.getTime() + duration1 * 60 * 1000);

        const session1 = await tx.fishingSession.create({
            data: {
                lakeId,
                customerId: customer1?.id || null,
                packageId: pkg1.id,
                startAt: startAt1,
                plannedEndAt: plannedEndAt1,
                status: "ACTIVE",
                packageNameSnapshot: pkg1.name,
                packageDurationMinutesSnapshot: duration1,
                packagePriceVndSnapshot: pkg1.priceVnd,
                overtimeHourlyVndSnapshot: pkg1.overtimeHourlyVnd,
                paymentTiming: "POSTPAID",
                isSample: true,
            },
        });

        await tx.fishingSessionHut.create({
            data: {
                lakeId,
                fishingSessionId: session1.id,
                hutId: hut1.id,
            },
        });

        await tx.hut.update({
            where: { id: hut1.id },
            data: { currentSessionId: session1.id },
        });

        const stingPrice = stingProd ? stingProd.priceVnd : 15000;
        const total1 = pkg1.priceVnd + stingPrice;

        const inv1 = await tx.invoice.create({
            data: {
                lakeId,
                customerId: customer1?.id || null,
                fishingSessionId: session1.id,
                status: InvoiceStatus.DRAFT,
                totalAmountVnd: total1,
                subtotalVnd: total1,
                balanceDueVnd: total1,
                isSample: true,
            },
        });

        await tx.invoiceLine.create({
            data: {
                invoiceId: inv1.id,
                name: `${pkg1.name} (1 cần)`,
                unitPrice: pkg1.priceVnd,
                quantity: 1,
                totalVnd: pkg1.priceVnd,
            },
        });

        if (stingProd) {
            await tx.invoiceLine.create({
                data: {
                    invoiceId: inv1.id,
                    productId: stingProd.id,
                    name: stingProd.name,
                    unitPrice: stingProd.priceVnd,
                    quantity: 1,
                    totalVnd: stingProd.priceVnd,
                },
            });
        }

        createdCount++;
    }

    // --- Tạo Vé Mẫu 2 (Quá giờ 15 phút để thấy phụ thu) ---
    if (hut2) {
        const duration2 = pkg2.durationMinutes || 120;
        // Đã vào trước (duration2 + 15) phút -> Quá giờ 15 phút
        const startAt2 = new Date(now - (duration2 + 15) * 60 * 1000);
        const plannedEndAt2 = new Date(startAt2.getTime() + duration2 * 60 * 1000);

        const session2 = await tx.fishingSession.create({
            data: {
                lakeId,
                customerId: customer2?.id || null,
                packageId: pkg2.id,
                startAt: startAt2,
                plannedEndAt: plannedEndAt2,
                status: "ACTIVE",
                packageNameSnapshot: pkg2.name,
                packageDurationMinutesSnapshot: duration2,
                packagePriceVndSnapshot: pkg2.priceVnd,
                overtimeHourlyVndSnapshot: pkg2.overtimeHourlyVnd,
                paymentTiming: "POSTPAID",
                isSample: true,
            },
        });

        await tx.fishingSessionHut.create({
            data: {
                lakeId,
                fishingSessionId: session2.id,
                hutId: hut2.id,
            },
        });

        await tx.hut.update({
            where: { id: hut2.id },
            data: { currentSessionId: session2.id },
        });

        const inv2 = await tx.invoice.create({
            data: {
                lakeId,
                customerId: customer2?.id || null,
                fishingSessionId: session2.id,
                status: InvoiceStatus.DRAFT,
                totalAmountVnd: pkg2.priceVnd,
                subtotalVnd: pkg2.priceVnd,
                balanceDueVnd: pkg2.priceVnd,
                isSample: true,
            },
        });

        await tx.invoiceLine.create({
            data: {
                invoiceId: inv2.id,
                name: `${pkg2.name} (1 cần)`,
                unitPrice: pkg2.priceVnd,
                quantity: 1,
                totalVnd: pkg2.priceVnd,
            },
        });

        createdCount++;
    }

    return { count: createdCount };
}

/**
 * Dọn dẹp an toàn các vé mẫu trải nghiệm khi chủ hồ muốn làm sạch quầy
 * Tuân thủ yêu cầu BƯỚC 2:
 * - Dữ liệu mẫu có cờ isSample riêng
 * - Xóa sạch 100%, không phụ thuộc hay lọc theo tên/SĐT
 */
export async function clearSampleSessions(
    tx: Prisma.TransactionClient,
    lakeId: string,
): Promise<{ clearedCount: number }> {
    if (!tx.fishingSession || !tx.hut || !tx.invoice) {
        return { clearedCount: 0 };
    }

    // Tìm tất cả phiên câu mẫu gắn cờ isSample: true của hồ
    const sampleSessions = await tx.fishingSession.findMany({
        where: {
            lakeId,
            isSample: true,
        },
        include: {
            hutLinks: true,
            invoices: true,
        },
    });

    // Tìm tất cả hóa đơn mẫu gắn cờ isSample: true của hồ
    const sampleInvoices = await tx.invoice.findMany({
        where: {
            lakeId,
            isSample: true,
        },
        select: { id: true },
    });

    const sessionIds = sampleSessions.map((s) => s.id);
    const invoiceIds = Array.from(
        new Set([
            ...sampleInvoices.map((inv) => inv.id),
            ...sampleSessions.flatMap((s) => s.invoices.map((inv) => inv.id)),
        ]),
    );

    if (sessionIds.length === 0 && invoiceIds.length === 0) {
        return { clearedCount: 0 };
    }

    // 1. Giải phóng chòi về trạng thái trống
    await tx.hut.updateMany({
        where: {
            lakeId,
            currentSessionId: { in: sessionIds },
        },
        data: { currentSessionId: null },
    });

    // 2. Xóa các bảng phụ thuộc hóa đơn mẫu
    if (invoiceIds.length > 0) {
        if (tx.financialTransaction && typeof tx.financialTransaction.deleteMany === "function") {
            await tx.financialTransaction.deleteMany({
                where: { invoiceId: { in: invoiceIds } },
            });
        }
        if (tx.debt && typeof tx.debt.deleteMany === "function") {
            await tx.debt.deleteMany({
                where: { invoiceId: { in: invoiceIds } },
            });
        }
        if (tx.payment && typeof tx.payment.deleteMany === "function") {
            await tx.payment.deleteMany({
                where: { invoiceId: { in: invoiceIds } },
            });
        }
        if (tx.invoiceLine && typeof tx.invoiceLine.deleteMany === "function") {
            await tx.invoiceLine.deleteMany({
                where: { invoiceId: { in: invoiceIds } },
            });
        }
        await tx.invoice.deleteMany({
            where: { id: { in: invoiceIds } },
        });
    }

    // 3. Xóa các phiên câu mẫu
    if (sessionIds.length > 0) {
        if (tx.fishingSessionHut && typeof tx.fishingSessionHut.deleteMany === "function") {
            await tx.fishingSessionHut.deleteMany({
                where: { fishingSessionId: { in: sessionIds } },
            });
        }
        await tx.fishingSession.deleteMany({
            where: { id: { in: sessionIds } },
        });
    }

    // 4. Xóa khách hàng mẫu
    if (tx.customer && typeof tx.customer.deleteMany === "function") {
        await tx.customer.deleteMany({
            where: {
                lakeId,
                isSample: true,
            },
        });
    }

    return { clearedCount: sessionIds.length || invoiceIds.length };
}
