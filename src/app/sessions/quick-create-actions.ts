"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";
import { assertSpotLimit } from "@/lib/subscription-guard";

export interface QuickActionResult<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
    redirectTo?: string;
}

/**
 * Hàm trợ giúp chuẩn hóa việc bắt lỗi Session và Phân quyền
 */
function handleAuthAndError(err: unknown): QuickActionResult<never> {
    if (err instanceof AuthenticationError) {
        return {
            ok: false,
            error: "Yêu cầu đăng nhập lại",
            redirectTo: "http://localhost:3000/sessions/new",
        };
    }
    if (err instanceof ForbiddenError) {
        return {
            ok: false,
            error: err.message || "Bạn không có quyền xóa danh mục gốc, vui lòng liên hệ quản lý!",
        };
    }
    const message = err instanceof Error ? err.message : "Đã có lỗi hệ thống xảy ra.";
    return {
        ok: false,
        error: message,
    };
}

// =============================================================================
// 1. NHÓM TÁC VỤ Ô CÂU (HUT)
// =============================================================================

/**
 * Tạo nhanh ô câu (Hut): [Chủ hồ], [Quản lý], [Nhân viên thu ngân]
 */
export async function addQuickHutAction(input: {
    name: string;
    areaId?: string;
}): Promise<QuickActionResult<{ id: string; name: string; areaId: string; areaName: string }>> {
    try {
        // Kiểm tra quyền: Cả 3 vai trò đều được phép thêm nhanh
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const trimmedName = input.name.trim();
        if (!trimmedName || trimmedName.length < 2) {
            return { ok: false, error: "Tên ô câu tối thiểu 2 ký tự." };
        }

        // Kiểm tra giới hạn số ô câu của gói cước SaaS
        await assertSpotLimit(tenantContext.lakeId);

        // Lấy hoặc tự tạo khu vực mặc định nếu chưa có
        let targetAreaId = input.areaId;

        if (targetAreaId) {
            const existingArea = await prisma.area.findFirst({
                where: {
                    id: targetAreaId,
                    lakeId: tenantContext.lakeId,
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (!existingArea) {
                targetAreaId = undefined;
            }
        }

        if (!targetAreaId) {
            let defaultArea = await prisma.area.findFirst({
                where: {
                    lakeId: tenantContext.lakeId,
                    deletedAt: null,
                },
                orderBy: { createdAt: "asc" },
                select: { id: true },
            });

            if (!defaultArea) {
                defaultArea = await prisma.area.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        name: "Khu chính",
                    },
                    select: { id: true },
                });
            }

            targetAreaId = defaultArea.id;
        }

        // Tạo ô câu mới
        const newHut = await prisma.hut.create({
            data: {
                lakeId: tenantContext.lakeId,
                areaId: targetAreaId,
                name: trimmedName,
            },
            include: {
                area: {
                    select: { id: true, name: true },
                },
            },
        });

        // Ghi Audit log
        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "Hut",
                entityId: newHut.id,
                action: "HUT_QUICK_CREATED",
                payload: JSON.stringify({ name: newHut.name, areaId: targetAreaId }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");
        revalidatePath("/sessions");

        return {
            ok: true,
            data: {
                id: newHut.id,
                name: newHut.name,
                areaId: newHut.area.id,
                areaName: newHut.area.name,
            },
        };
    } catch (err: unknown) {
        return handleAuthAndError(err);
    }
}

/**
 * XÓA MỀM (Soft Delete) ô câu: CHỈ [Chủ hồ] HOẶC [Quản lý]
 * Nhân viên thu ngân bị chặn nghiêm ngặt.
 */
export async function deleteQuickHutAction(input: {
    hutId: string;
}): Promise<QuickActionResult<{ id: string }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const hut = await prisma.hut.findFirst({
            where: {
                id: input.hutId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!hut) {
            return { ok: false, error: "Ô câu không tồn tại hoặc đã được xóa trước đó." };
        }

        // Không cho phép xóa ô đang có khách câu
        if (hut.currentSessionId) {
            return { ok: false, error: "Ô câu này đang có khách câu, không thể xóa lúc này." };
        }

        // Soft Delete: Cập nhật deletedAt thay vì xóa khỏi DB
        await prisma.hut.update({
            where: { id: hut.id },
            data: { deletedAt: new Date() },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "Hut",
                entityId: hut.id,
                action: "HUT_SOFT_DELETED",
                payload: JSON.stringify({ name: hut.name }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");
        revalidatePath("/sessions");

        return { ok: true, data: { id: hut.id } };
    } catch (err: unknown) {
        if (err instanceof ForbiddenError) {
            return {
                ok: false,
                error: "Bạn không có quyền xóa danh mục gốc, vui lòng liên hệ quản lý!",
            };
        }
        return handleAuthAndError(err);
    }
}

// =============================================================================
// 2. NHÓM TÁC VỤ GÓI CÂU / CA CÂU (PACKAGE)
// =============================================================================

/**
 * Tạo nhanh gói câu: [Chủ hồ], [Quản lý], [Nhân viên thu ngân]
 */
export async function addQuickPackageAction(input: {
    name: string;
    durationMinutes: number;
    priceVnd: number;
    overtimeHourlyVnd?: number;
}): Promise<QuickActionResult<{ id: string; name: string; durationMinutes: number; priceVnd: number }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const trimmedName = input.name.trim();
        if (!trimmedName || trimmedName.length < 2) {
            return { ok: false, error: "Tên gói câu tối thiểu 2 ký tự." };
        }
        if (input.durationMinutes < 15 || input.durationMinutes > 1440) {
            return { ok: false, error: "Thời lượng từ 15 đến 1440 phút (24h)." };
        }
        if (input.priceVnd < 0) {
            return { ok: false, error: "Giá gói câu không được âm." };
        }

        const overtime = input.overtimeHourlyVnd ?? Math.round(input.priceVnd / (input.durationMinutes / 60));

        const newPkg = await prisma.package.create({
            data: {
                lakeId: tenantContext.lakeId,
                name: trimmedName,
                durationMinutes: input.durationMinutes,
                priceVnd: input.priceVnd,
                overtimeHourlyVnd: Math.max(0, overtime),
            },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "Package",
                entityId: newPkg.id,
                action: "PACKAGE_QUICK_CREATED",
                payload: JSON.stringify({
                    name: newPkg.name,
                    durationMinutes: newPkg.durationMinutes,
                    priceVnd: newPkg.priceVnd,
                }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");
        revalidatePath("/sessions");

        return {
            ok: true,
            data: {
                id: newPkg.id,
                name: newPkg.name,
                durationMinutes: newPkg.durationMinutes,
                priceVnd: newPkg.priceVnd,
            },
        };
    } catch (err: unknown) {
        return handleAuthAndError(err);
    }
}

/**
 * XÓA MỀM (Soft Delete) gói câu: CHỈ [Chủ hồ] HOẶC [Quản lý]
 * Nhân viên thu ngân bị chặn nghiêm ngặt.
 */
export async function deleteQuickPackageAction(input: {
    packageId: string;
}): Promise<QuickActionResult<{ id: string }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const pkg = await prisma.package.findFirst({
            where: {
                id: input.packageId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!pkg) {
            return { ok: false, error: "Gói câu không tồn tại hoặc đã bị xóa." };
        }

        // Soft Delete: Gán deletedAt để ẩn khỏi danh mục tạo vé, giữ nguyên lịch sử báo cáo
        await prisma.package.update({
            where: { id: pkg.id },
            data: { deletedAt: new Date() },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "Package",
                entityId: pkg.id,
                action: "PACKAGE_SOFT_DELETED",
                payload: JSON.stringify({ name: pkg.name }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");
        revalidatePath("/sessions");

        return { ok: true, data: { id: pkg.id } };
    } catch (err: unknown) {
        if (err instanceof ForbiddenError) {
            return {
                ok: false,
                error: "Bạn không có quyền xóa danh mục gốc, vui lòng liên hệ quản lý!",
            };
        }
        return handleAuthAndError(err);
    }
}

// =============================================================================
// 3. NHÓM TÁC VỤ SẢN PHẨM / DỊCH VỤ (PRODUCT)
// =============================================================================

/**
 * Tạo nhanh sản phẩm: [Chủ hồ], [Quản lý], [Nhân viên thu ngân]
 */
export async function addQuickProductAction(input: {
    name: string;
    priceVnd: number;
    initialStock?: number;
}): Promise<QuickActionResult<{ id: string; name: string; priceVnd: number; stock: number; sku: string | null }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const trimmedName = input.name.trim();
        if (!trimmedName || trimmedName.length < 1) {
            return { ok: false, error: "Tên sản phẩm không được để trống." };
        }
        if (input.priceVnd < 0) {
            return { ok: false, error: "Giá bán sản phẩm không hợp lệ." };
        }

        const stock = Math.max(0, input.initialStock ?? 0);

        const result = await prisma.$transaction(
            async (tx) => {
                const totalProducts = await tx.product.count({
                    where: { lakeId: tenantContext.lakeId },
                });
                let nextSeq = totalProducts + 1;
                let generatedSku = `SP-${String(nextSeq).padStart(4, "0")}`;

                let attempts = 0;
                while (attempts < 20) {
                    const existing = await tx.product.findFirst({
                        where: {
                            lakeId: tenantContext.lakeId,
                            sku: generatedSku,
                        },
                    });
                    if (!existing) break;
                    nextSeq++;
                    generatedSku = `SP-${String(nextSeq).padStart(4, "0")}`;
                    attempts++;
                }

                const createdProduct = await tx.product.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        name: trimmedName,
                        priceVnd: input.priceVnd,
                        sku: generatedSku,
                    },
                });

                if (stock > 0) {
                    await tx.inventoryMovement.create({
                        data: {
                            lakeId: tenantContext.lakeId,
                            productId: createdProduct.id,
                            quantity: stock,
                            reason: "Nhập kho ban đầu khi tạo nhanh sản phẩm",
                            createdBy: tenantContext.userId,
                        },
                    });
                }

                await tx.auditEvent.create({
                    data: {
                        lakeId: tenantContext.lakeId,
                        entityType: "Product",
                        entityId: createdProduct.id,
                        action: "PRODUCT_QUICK_CREATED",
                        payload: JSON.stringify({
                            name: createdProduct.name,
                            priceVnd: createdProduct.priceVnd,
                            sku: createdProduct.sku,
                            initialStock: stock,
                        }),
                        createdBy: tenantContext.userId,
                    },
                });

                return {
                    id: createdProduct.id,
                    name: createdProduct.name,
                    priceVnd: createdProduct.priceVnd,
                    stock,
                    sku: createdProduct.sku,
                };
            },
            { isolationLevel: "Serializable" },
        );

        revalidatePath("/sessions/new");

        return {
            ok: true,
            data: result,
        };
    } catch (err: unknown) {
        return handleAuthAndError(err);
    }
}

/**
 * XÓA MỀM (Soft Delete) sản phẩm: CHỈ [Chủ hồ] HOẶC [Quản lý]
 */
export async function deleteQuickProductAction(input: {
    productId: string;
}): Promise<QuickActionResult<{ id: string }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const product = await prisma.product.findFirst({
            where: {
                id: input.productId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!product) {
            return { ok: false, error: "Sản phẩm không tồn tại hoặc đã bị xóa." };
        }

        await prisma.product.update({
            where: { id: product.id },
            data: { deletedAt: new Date() },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "Product",
                entityId: product.id,
                action: "PRODUCT_SOFT_DELETED",
                payload: JSON.stringify({ name: product.name }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");

        return { ok: true, data: { id: product.id } };
    } catch (err: unknown) {
        if (err instanceof ForbiddenError) {
            return {
                ok: false,
                error: "Bạn không có quyền xóa danh mục gốc, vui lòng liên hệ quản lý!",
            };
        }
        return handleAuthAndError(err);
    }
}

// =============================================================================
// 4. NHÓM TÁC VỤ QUY ĐỊNH THU LẠI CÁ (FISH TYPE)
// =============================================================================

/**
 * Tạo nhanh loại cá & giá thu lại: [Chủ hồ], [Quản lý], [Nhân viên thu ngân]
 */
export async function addQuickFishTypeAction(input: {
    name: string;
    pricePerKg: number;
}): Promise<QuickActionResult<{ id: string; name: string; pricePerKg: number }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const trimmedName = input.name.trim();
        if (!trimmedName || trimmedName.length < 1) {
            return { ok: false, error: "Tên loại cá không được để trống." };
        }
        if (input.pricePerKg <= 0) {
            return { ok: false, error: "Đơn giá thu mua/kg phải lớn hơn 0đ." };
        }

        const existing = await prisma.fishType.findFirst({
            where: {
                lakeId: tenantContext.lakeId,
                name: trimmedName,
                deletedAt: null,
            },
        });

        if (existing) {
            return {
                ok: true,
                data: {
                    id: existing.id,
                    name: existing.name,
                    pricePerKg: existing.pricePerKg,
                },
            };
        }

        const newFish = await prisma.fishType.create({
            data: {
                lakeId: tenantContext.lakeId,
                name: trimmedName,
                pricePerKg: input.pricePerKg,
            },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "FishType",
                entityId: newFish.id,
                action: "FISH_TYPE_QUICK_CREATED",
                payload: JSON.stringify({
                    name: newFish.name,
                    pricePerKg: newFish.pricePerKg,
                }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");

        return {
            ok: true,
            data: {
                id: newFish.id,
                name: newFish.name,
                pricePerKg: newFish.pricePerKg,
            },
        };
    } catch (err: unknown) {
        return handleAuthAndError(err);
    }
}

/**
 * XÓA MỀM (Soft Delete) quy định cá: CHỈ [Chủ hồ] HOẶC [Quản lý]
 */
export async function deleteQuickFishTypeAction(input: {
    fishTypeId: string;
}): Promise<QuickActionResult<{ id: string }>> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const fish = await prisma.fishType.findFirst({
            where: {
                id: input.fishTypeId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!fish) {
            return { ok: false, error: "Quy định cá không tồn tại hoặc đã bị xóa." };
        }

        await prisma.fishType.update({
            where: { id: fish.id },
            data: { deletedAt: new Date() },
        });

        await prisma.auditEvent.create({
            data: {
                lakeId: tenantContext.lakeId,
                entityType: "FishType",
                entityId: fish.id,
                action: "FISH_TYPE_SOFT_DELETED",
                payload: JSON.stringify({ name: fish.name }),
                createdBy: tenantContext.userId,
            },
        });

        revalidatePath("/sessions/new");

        return { ok: true, data: { id: fish.id } };
    } catch (err: unknown) {
        if (err instanceof ForbiddenError) {
            return {
                ok: false,
                error: "Bạn không có quyền xóa danh mục gốc, vui lòng liên hệ quản lý!",
            };
        }
        return handleAuthAndError(err);
    }
}
