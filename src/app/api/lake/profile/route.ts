import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { readRequestMeta, writeStaffAudit } from "@/lib/audit-log";
import { bankNameForCode, VIETQR_BANKS } from "@/lib/vietqr";
import { prisma } from "@/lib/prisma";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { AuthenticationError, ForbiddenError, requireTenantContext } from "@/lib/tenant";

const bankCodes = VIETQR_BANKS.map((bank) => bank.code) as [string, ...string[]];

const patchSchema = z.object({
    name: z.string().trim().min(1, "Tên hồ không được để trống.").max(200),
    contactPhone: z.string().trim().max(20).nullable().optional(),
    bankCode: z.enum(bankCodes).nullable().optional(),
    bankAccountNumber: z.string().trim().max(30).nullable().optional(),
    bankAccountName: z.string().trim().max(100).nullable().optional(),
});

function publicBank(lake: {
    bankCode: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
}) {
    if (!lake.bankCode || !lake.bankAccountNumber || !lake.bankAccountName) return null;
    return {
        bankCode: lake.bankCode,
        bankName: lake.bankName || bankNameForCode(lake.bankCode),
        accountNumber: lake.bankAccountNumber,
        accountName: lake.bankAccountName,
    };
}

export async function GET() {
    try {
        const tenant = await requireTenantContext([Role.OWNER, Role.MANAGER, Role.STAFF]);
        const lake = await prisma.lake.findUnique({
            where: { id: tenant.lakeId },
            select: {
                name: true,
                contactPhone: true,
                bankCode: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
            },
        });
        if (!lake) return NextResponse.json({ error: "Không tìm thấy hồ." }, { status: 404 });
        return NextResponse.json({
            name: lake.name,
            contactPhone: lake.contactPhone,
            bank: publicBank(lake),
            banks: VIETQR_BANKS,
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không tải được thông tin hồ." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const tenant = await requireTenantContext([Role.OWNER]);
        const parsed = patchSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
        }

        let contactPhone: string | null = null;
        if (parsed.data.contactPhone) {
            try {
                contactPhone = normalizeVietnamesePhone(parsed.data.contactPhone);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Số điện thoại không hợp lệ.";
                return NextResponse.json({ error: message }, { status: 400 });
            }
        }

        const bankCode = parsed.data.bankCode ?? null;
        const bankAccountNumber = parsed.data.bankAccountNumber?.replace(/\s/g, "") || null;
        const bankAccountName = parsed.data.bankAccountName?.trim() || null;
        const bankFilled = [bankCode, bankAccountNumber, bankAccountName].filter(Boolean).length;
        if (bankFilled > 0 && bankFilled < 3) {
            return NextResponse.json(
                { error: "Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản, hoặc để trống cả ba." },
                { status: 400 },
            );
        }

        const before = await prisma.lake.findUnique({
            where: { id: tenant.lakeId },
            select: { name: true, contactPhone: true, bankCode: true, bankAccountNumber: true, bankAccountName: true },
        });
        const updated = await prisma.$transaction(async (tx) => {
            const lake = await tx.lake.update({
                where: { id: tenant.lakeId },
                data: {
                    name: parsed.data.name,
                    contactPhone,
                    bankCode,
                    bankName: bankNameForCode(bankCode),
                    bankAccountNumber,
                    bankAccountName,
                },
                select: {
                    name: true,
                    contactPhone: true,
                    bankCode: true,
                    bankName: true,
                    bankAccountNumber: true,
                    bankAccountName: true,
                },
            });
            const meta = await readRequestMeta();
            await writeStaffAudit(tx, {
                lakeId: tenant.lakeId,
                entityType: "Lake",
                entityId: tenant.lakeId,
                action: "LAKE_PROFILE_UPDATED",
                createdBy: tenant.userId,
                actorName: tenant.userName,
                actorRole: tenant.role,
                before,
                after: lake,
                ip: meta.ip,
                userAgent: meta.userAgent,
            });
            return lake;
        });

        return NextResponse.json({
            message: "Đã lưu thông tin hồ.",
            name: updated.name,
            contactPhone: updated.contactPhone,
            bank: publicBank(updated),
        });
    } catch (error) {
        if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
        if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
        return NextResponse.json({ error: "Không lưu được thông tin hồ." }, { status: 500 });
    }
}
