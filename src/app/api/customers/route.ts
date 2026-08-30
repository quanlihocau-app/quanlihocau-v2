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

const createCustomerSchema = z.object({
    name: z
        .string({ message: "Tên khách hàng là bắt buộc" })
        .trim()
        .min(2, "Tên khách hàng tối thiểu 2 ký tự")
        .max(100, "Tên khách hàng tối đa 100 ký tự"),
    phone: z.string().nullable().optional(),
});

export async function GET(request: Request) {
    try {
        const tenantContext = await requireTenantContext();
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q")?.trim();

        type PhoneOrClause = {
            name?: { contains: string; mode: "insensitive" };
            phoneNormalized?: { contains: string };
        };

        const whereCondition: {
            lakeId: string;
            deletedAt: null;
            OR?: PhoneOrClause[];
        } = {
            lakeId: tenantContext.lakeId,
            deletedAt: null,
        };

        if (query) {
            // Build phone search variants so that entering "090...", "84...", "+84..."
            // all match the stored E.164 form "+84...". Partial matching is supported.
            const phoneSearchTerms = new Set<string>([query]);

            const cleaned = query.replace(/[\s.\-()]/g, "");
            if (cleaned.startsWith("+84")) {
                // "+8490..." → also search bare digits "84..." and "90..."
                phoneSearchTerms.add(cleaned); // +8490...
                phoneSearchTerms.add(cleaned.slice(1)); // 8490...
                phoneSearchTerms.add("0" + cleaned.slice(3)); // 090...
            } else if (cleaned.startsWith("84") && cleaned.length > 2) {
                // "8490..." → also search "+8490..." and "090..."
                phoneSearchTerms.add("+" + cleaned); // +8490...
                phoneSearchTerms.add("0" + cleaned.slice(2)); // 090...
            } else if (cleaned.startsWith("0") && cleaned.length > 1) {
                // "090..." → stored as "+8490..."
                const e164 = "+84" + cleaned.slice(1);
                phoneSearchTerms.add(e164); // +8490...
                phoneSearchTerms.add("84" + cleaned.slice(1)); // 8490...
            }

            const orClauses: PhoneOrClause[] = [
                { name: { contains: query, mode: "insensitive" } },
            ];

            for (const term of phoneSearchTerms) {
                orClauses.push({ phoneNormalized: { contains: term } });
            }

            whereCondition.OR = orClauses;
        }

        const customers = await prisma.customer.findMany({
            where: whereCondition,
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(customers, { status: 200 });
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

export async function POST(request: Request) {
    try {
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

        const parsed = createCustomerSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        let phoneNormalized: string | null = null;
        try {
            phoneNormalized = normalizeVietnamesePhone(parsed.data.phone);
        } catch (phoneErr) {
            const message =
                phoneErr instanceof Error
                    ? phoneErr.message
                    : "Số điện thoại không hợp lệ.";
            return NextResponse.json({ error: message }, { status: 400 });
        }

        if (phoneNormalized) {
            const existingCustomer = await prisma.customer.findFirst({
                where: {
                    lakeId: tenantContext.lakeId,
                    phoneNormalized,
                    deletedAt: null,
                },
            });

            if (existingCustomer) {
                return NextResponse.json(
                    {
                        error: "Số điện thoại này đã được đăng ký cho khách hàng khác tại hồ câu.",
                    },
                    { status: 409 },
                );
            }
        }

        try {
            const customer = await prisma.customer.create({
                data: {
                    lakeId: tenantContext.lakeId,
                    name: parsed.data.name,
                    phoneNormalized,
                },
            });

            return NextResponse.json(customer, { status: 201 });
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
