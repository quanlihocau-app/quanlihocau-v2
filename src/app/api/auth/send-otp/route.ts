import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { error: "Đăng nhập hiện sử dụng email và mật khẩu; xác minh SMS đã được tắt." },
        { status: 410 },
    );
}
