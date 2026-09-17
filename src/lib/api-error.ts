import { NextResponse } from "next/server";

export interface SafeInternalErrorPayload {
    ok: false;
    error: {
        code: "INTERNAL_ERROR";
        message: string;
    };
    requestId: string;
}

/**
 * Tạo HTTP response 500 an toàn cho client theo PRD:
 * - Không gửi stack trace, raw exception message hay database details về client.
 * - Sinh requestId duy nhất để tra cứu trong server log / monitoring.
 * - Ghi log chi tiết lỗi nội bộ lên server cùng requestId.
 */
export function createInternalErrorResponse(
    logTag: string,
    error: unknown,
    friendlyMessage = "Có lỗi hệ thống xảy ra. Vui lòng thử lại.",
): NextResponse<SafeInternalErrorPayload> {
    const requestId = crypto.randomUUID();
    console.error(`[${logTag}]`, {
        requestId,
        error,
    });

    return NextResponse.json(
        {
            ok: false,
            error: {
                code: "INTERNAL_ERROR",
                message: friendlyMessage,
            },
            requestId,
        },
        { status: 500 },
    );
}
