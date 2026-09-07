"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/tenant";
import { openSession, type OpenSessionInput } from "@/lib/services/open-session.service";

export interface ServerActionResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
    code?: string;
}

/**
 * Server Action mở vé câu trực tiếp từ Server,
 * bỏ qua Webview fetch proxy của Capacitor và hỗ trợ Next.js 16 Server Actions.
 */
export async function createSessionAction(
    input: OpenSessionInput,
    idempotencyKey?: string,
): Promise<ServerActionResponse> {
    try {
        const tenantContext = await requireTenantContext([
            Role.OWNER,
            Role.MANAGER,
            Role.STAFF,
        ]);

        const key = idempotencyKey || crypto.randomUUID();
        const result = await openSession(input, tenantContext, key);

        // Revalidate các view hiển thị phiên câu tức thì
        revalidatePath("/sessions");
        revalidatePath("/");

        return {
            ok: true,
            data: result,
        };
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (errorMessage.startsWith("VALIDATION_ERROR:")) {
            return {
                ok: false,
                error: errorMessage.replace("VALIDATION_ERROR: ", ""),
                code: "VALIDATION_ERROR",
            };
        }

        if (errorMessage === "SPOT_OCCUPIED") {
            return {
                ok: false,
                error: "Ô câu đã có khách đang câu.",
                code: "SPOT_OCCUPIED",
            };
        }

        if (
            errorMessage.startsWith("PACKAGE_NOT_FOUND:") ||
            errorMessage.startsWith("CUSTOMER_NOT_FOUND:") ||
            errorMessage.startsWith("PRODUCT_NOT_FOUND:")
        ) {
            return {
                ok: false,
                error: errorMessage.split(": ")[1] || "Tài nguyên không tìm thấy.",
                code: "NOT_FOUND",
            };
        }

        console.error("[createSessionAction error]:", err);
        return {
            ok: false,
            error: "Không thể mở phiên câu do lỗi hệ thống.",
            code: "INTERNAL_ERROR",
        };
    }
}
