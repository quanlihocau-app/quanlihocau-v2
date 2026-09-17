import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
    confirmManualSubscriptionOrder,
    DUMMY_BANK_REF_REGEX,
} from "@/lib/services/manual-subscription-confirm.service";
import { requireSuperAdmin } from "@/lib/tenant";

const confirmOrderSchema = z
    .object({
        reconciliationMethod: z
            .enum(["BANK_STATEMENT", "CASH", "DIRECT_VERIFICATION", "OTHER"])
            .default("BANK_STATEMENT"),
        reason: z
            .string()
            .min(5, "Vui lòng nhập lý do xác nhận (ít nhất 5 ký tự).")
            .max(500, "Lý do không được vượt quá 500 ký tự."),
        bankRef: z.string().max(100).optional().nullable(),
        expectedAmountVnd: z.number().positive().optional(),
        expectedPlanCode: z.string().optional(),
        expectedOrganizationId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        const trimmedBankRef = data.bankRef?.trim();
        const trimmedReason = data.reason.trim();

        if (trimmedBankRef) {
            if (DUMMY_BANK_REF_REGEX.test(trimmedBankRef)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        "Mã giao dịch ngân hàng không được là giá trị giả mạo (none, n/a, null, test...). Nếu không có mã giao dịch, vui lòng để trống và nêu rõ lý do đối soát thực tế.",
                    path: ["bankRef"],
                });
            } else if (trimmedBankRef.length < 3) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Mã giao dịch ngân hàng thực tế phải có ít nhất 3 ký tự.",
                    path: ["bankRef"],
                });
            }
        }

        if (!trimmedBankRef && trimmedReason.length < 10) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "Khi để trống mã giao dịch ngân hàng, vui lòng nhập lý do đối soát chi tiết (tối thiểu 10 ký tự).",
                path: ["reason"],
            });
        }
    });

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ orderId: string }> },
) {
    try {
        const admin = await requireSuperAdmin();
        const { orderId } = await context.params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Dữ liệu JSON không hợp lệ." },
                { status: 400 },
            );
        }

        const parsed = confirmOrderSchema.safeParse(body);
        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Dữ liệu xác nhận không hợp lệ.";
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const {
            reason,
            bankRef,
            reconciliationMethod,
            expectedAmountVnd,
            expectedPlanCode,
            expectedOrganizationId,
        } = parsed.data;

        const result = await confirmManualSubscriptionOrder({
            orderId,
            admin,
            reconciliationMethod,
            reason,
            bankRef,
            expectedAmountVnd,
            expectedPlanCode,
            expectedOrganizationId,
        });

        if (result.alreadyPaid) {
            return NextResponse.json(
                {
                    success: false,
                    alreadyPaid: true,
                    message: result.message,
                    order: result.order,
                },
                { status: 409 },
            );
        }

        const formattedDate = result.newExpiresAt
            ? result.newExpiresAt.toLocaleDateString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
              })
            : "kỳ tiếp theo";

        return NextResponse.json(
            {
                success: true,
                message: `Đã xác nhận thanh toán thủ công và gia hạn thành công đến ${formattedDate}.`,
                order: result.order,
                lake: result.lake,
                newExpiresAt: result.newExpiresAt,
            },
            { status: 200 },
        );
    } catch (err: unknown) {
        const error = err as Error;
        if (error.name === "AuthenticationError") {
            return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
        }
        if (error.name === "ForbiddenError") {
            return NextResponse.json(
                { error: "Yêu cầu quyền Quản trị viên hệ thống (SUPER_ADMIN)." },
                { status: 403 },
            );
        }
        if (error.message === "ORDER_NOT_FOUND") {
            return NextResponse.json(
                { error: "Không tìm thấy đơn hàng." },
                { status: 404 },
            );
        }
        if (error.message === "ORDER_CANCELLED") {
            return NextResponse.json(
                { error: "Đơn hàng đã bị hủy, không thể xác nhận thanh toán." },
                { status: 400 },
            );
        }
        if (error.message === "ORDER_EXPIRED") {
            return NextResponse.json(
                { error: "Đơn hàng đã hết hạn thanh toán, vui lòng tạo đơn mới." },
                { status: 400 },
            );
        }
        if (error.message === "INVALID_ORDER_STATUS") {
            return NextResponse.json(
                { error: "Trạng thái đơn hàng không hợp lệ để xác nhận." },
                { status: 400 },
            );
        }
        if (error.message === "INVALID_LAKE_OR_ORG" || error.message === "ORG_MISMATCH") {
            return NextResponse.json(
                { error: "Dữ liệu hồ câu hoặc tổ chức liên kết của đơn hàng không hợp lệ." },
                { status: 400 },
            );
        }
        if (error.message === "PLAN_NOT_FOUND") {
            return NextResponse.json(
                { error: "Gói cước của đơn hàng không tồn tại trên hệ thống." },
                { status: 400 },
            );
        }
        if (error.message === "INVALID_AMOUNT") {
            return NextResponse.json(
                { error: "Số tiền đơn hàng không hợp lệ so với giá gói cước." },
                { status: 400 },
            );
        }
        if (error.message === "AMOUNT_MISMATCH" || error.message === "PLAN_MISMATCH") {
            return NextResponse.json(
                { error: "Thông tin đơn hàng không khớp với dữ liệu trên hệ thống." },
                { status: 400 },
            );
        }
        if (error.message === "INVALID_BANK_REF_DUMMY") {
            return NextResponse.json(
                {
                    error: "Mã giao dịch ngân hàng không được là giá trị giả mạo (none, n/a, null...). Nếu không có mã, vui lòng để trống.",
                },
                { status: 400 },
            );
        }
        if (error.message === "DETAILED_REASON_REQUIRED_WITHOUT_BANK_REF") {
            return NextResponse.json(
                {
                    error: "Khi để trống mã giao dịch ngân hàng, vui lòng nhập lý do đối soát chi tiết (tối thiểu 10 ký tự).",
                },
                { status: 400 },
            );
        }

        console.error("Admin confirm order error:", err);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi xác nhận đơn hàng." },
            { status: 500 },
        );
    }
}
