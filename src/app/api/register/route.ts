import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/app/actions/auth";

const registerSchema = z.object({
    name: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(100),
    email: z.string().trim().email("Email không hợp lệ."),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.").max(128),
    phone: z.string().trim().optional(),
    lakeName: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ.",
                    error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ.",
                },
                { status: 400 },
            );
        }

        const result = await registerUser(parsed.data);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: result.message,
                    error: result.message,
                },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: result.message,
                data: result.data,
                userId: result.data?.id,
                lakeId: result.data?.lakeId,
                organizationId: result.data?.organizationId,
            },
            { status: 201 },
        );
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "Dữ liệu yêu cầu không hợp lệ.",
                error: "Dữ liệu yêu cầu không hợp lệ.",
            },
            { status: 400 },
        );
    }
}
