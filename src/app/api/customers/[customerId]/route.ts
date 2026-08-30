import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@/generated/prisma/client";
import { normalizeVietnamesePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import {
    AuthenticationError,
    ForbiddenError,
    requireTenantContext,
} from "@/lib/tenant";

const updateCustomerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Tên khách hàng tối thiểu 2 ký tự")
        .max(100, "Tên khách hàng tối đa 100 ký tự")
        .optional(),
    phone: z.string().nullable().optional(),
});

interface RouteParams {
    params: Promise<{
        customerId: string;
    }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { customerId } = await params;
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = updateCustomerSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existingCustomer) {
            return NextResponse.json(
                { error: "Khách hàng không tồn tại hoặc đã bị xóa." },
                { status: 404 },
            );
        }

        const updateData: {
            name?: string;
            phoneNormalized?: string | null;
        } = {};

        if (parsed.data.name !== undefined) {
            updateData.name = parsed.data.name;
        }

        if (parsed.data.phone !== undefined) {
            try {
                updateData.phoneNormalized = normalizeVietnamesePhone(
                    parsed.data.phone,
                );
            } catch (phoneErr) {
                const message =
                    phoneErr instanceof Error
                        ? phoneErr.message
                        : "Số điện thoại không hợp lệ.";
                return NextResponse.json({ error: message }, { status: 400 });
            }

            if (
                updateData.phoneNormalized &&
                updateData.phoneNormalized !== existingCustomer.phoneNormalized
            ) {
                const duplicate = await prisma.customer.findFirst({
                    where: {
                        id: { not: customerId },
                        lakeId: tenantContext.lakeId,
                        phoneNormalized: updateData.phoneNormalized,
                        deletedAt: null,
                    },
                });

                if (duplicate) {
                    return NextResponse.json(
                        {
                            error: "Số điện thoại này đã được đăng ký cho khách hàng khác tại hồ câu.",
                        },
                        { status: 409 },
                    );
                }
            }
        }

        try {
            const updatedCustomer = await prisma.customer.update({
                where: {
                    id: customerId,
                },
                data: updateData,
            });

            return NextResponse.json(updatedCustomer, { status: 200 });
        } catch (dbError: unknown) {
            if (
                typeof dbError === "object" &&
                dbError !== null &&
                "code" in dbError &&
                dbError.code === "P2002"
            ) {
                return NextResponse.json(
                    {
                        error: "Số điện thoại này đã tồn tại trong hệ thống của hồ.",
                    },
                    { status: 409 },
                );
            }
            throw dbError;
        }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const { customerId } = await params;
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
        ]);

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                lakeId: tenantContext.lakeId,
                deletedAt: null,
            },
        });

        if (!existingCustomer) {
            return NextResponse.json(
                { error: "Khách hàng không tồn tại hoặc đã bị xóa." },
                { status: 404 },
            );
        }

        await prisma.customer.update({
            where: {
                id: customerId,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return NextResponse.json(
            { message: "Đã vô hiệu hóa khách hàng thành công." },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
    }
}
