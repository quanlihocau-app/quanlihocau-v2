import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { error: "Xác minh SMS đã được tắt. Vui lòng đăng nhập bằng email và mật khẩu." },
        { status: 410 },
    );
}
