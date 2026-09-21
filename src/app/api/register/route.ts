import { NextResponse } from "next/server";
import { registerUser } from "@/app/actions/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const input = {
            name: body.name || body.fullName || "",
            email: body.email || "",
            password: body.password || "",
            phone: body.phone || undefined,
            lakeName: body.lakeName || undefined,
        };

        const result = await registerUser(input);

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
