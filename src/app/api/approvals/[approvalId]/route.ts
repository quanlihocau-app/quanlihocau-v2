import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().max(500).optional(),
});

interface RouteParams {
  params: Promise<{ approvalId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const tenantContext = await requireTenantContext([Role.OWNER]);
    const { approvalId } = await params;
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
    }

    const { action, reviewNote } = parsed.data;

    const approval = await prisma.approvalRequest.findFirst({
      where: { id: approvalId, lakeId: tenantContext.lakeId },
    });

    if (!approval) {
      return NextResponse.json({ error: "Không tìm thấy yêu cầu phê duyệt." }, { status: 404 });
    }

    if (approval.status !== "PENDING") {
      return NextResponse.json({ error: "Yêu cầu này đã được xử lý trước đó." }, { status: 400 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const payloadData = JSON.parse(approval.payload);

    // Xử lý thực thi nếu chủ hồ Approve
    if (action === "APPROVE") {
      if (approval.type === "EXPENSE") {
        // Thực thi tạo phiếu chi vào quỹ
        const { description, amountVnd, paymentMethod } = payloadData;
        const createdExpense = await prisma.expense.create({
          data: {
            lakeId: tenantContext.lakeId,
            description: `${description} (Duyệt theo YC: ${approval.note})`,
            amountVnd: Number(amountVnd),
          },
        });
        await prisma.payment.create({
          data: {
            lakeId: tenantContext.lakeId,
            expenseId: createdExpense.id,
            amountVnd: Number(amountVnd),
            method: paymentMethod || "CASH",
            direction: "OUT",
          },
        });
      } else if (approval.type === "INVENTORY_OUT") {
        // Thực thi trừ kho
        const { productId, quantity, reason } = payloadData;
        await prisma.inventoryMovement.create({
          data: {
            lakeId: tenantContext.lakeId,
            productId,
            quantity: -Math.abs(Number(quantity)),
            reason: `${reason} (Duyệt theo YC: ${approval.note})`,
            createdBy: approval.requestedBy,
          },
        });
      }
    }

    // Cập nhật trạng thái phiếu duyệt
    const updated = await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        reviewedBy: tenantContext.userId,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
      },
    });

    // Ghi nhật ký kiểm toán (Audit Event)
    await prisma.auditEvent.create({
      data: {
        lakeId: tenantContext.lakeId,
        entityType: "ApprovalRequest",
        entityId: approval.id,
        action: `APPROVAL_${newStatus}`,
        payload: JSON.stringify({
          approvalId: approval.id,
          type: approval.type,
          originalNote: approval.note,
          decision: newStatus,
          reviewNote: reviewNote || null,
          details: payloadData,
        }),
        createdBy: tenantContext.userId,
      },
    });

    return NextResponse.json({
      message: action === "APPROVE" ? "Đã phê duyệt yêu cầu thành công." : "Đã từ chối yêu cầu.",
      approval: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi xử lý duyệt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

