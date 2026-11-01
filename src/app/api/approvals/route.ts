import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const createApprovalSchema = z.object({
  type: z.enum(["EXPENSE", "INVENTORY_OUT", "PRICE_OVERRIDE", "INVOICE_VOID"]),
  note: z.string().trim().min(3, "Ghi chú/lý do bắt buộc, ít nhất 3 ký tự.").max(500),
  payload: z.record(z.string(), z.any()),
});

// GET: Lấy danh sách yêu cầu phê duyệt (Chỉ OWNER)
export async function GET(request: Request) {
  try {
    const tenantContext = await requireTenantContext([Role.OWNER]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const approvals = await prisma.approvalRequest.findMany({
      where: {
        lakeId: tenantContext.lakeId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ approvals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Không có quyền" }, { status: 403 });
  }
}

// POST: Nhân viên gửi yêu cầu phê duyệt mới
export async function POST(request: Request) {
  try {
    const tenantContext = await requireTenantContext([Role.OWNER, Role.MANAGER, Role.STAFF]);
    const body = await request.json();
    const parsed = createApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const { type, note, payload } = parsed.data;

    // Lấy tên người yêu cầu
    const user = await prisma.user.findUnique({
      where: { id: tenantContext.userId },
      select: { name: true },
    });

    const approval = await prisma.approvalRequest.create({
      data: {
        lakeId: tenantContext.lakeId,
        type,
        status: "PENDING",
        requestedBy: tenantContext.userId,
        requestedByName: user?.name || "Nhân viên",
        note,
        payload: JSON.stringify(payload),
      },
    });

    // Ghi nhận vào AuditEvent để lưu nhật ký
    await prisma.auditEvent.create({
      data: {
        lakeId: tenantContext.lakeId,
        entityType: "ApprovalRequest",
        entityId: approval.id,
        action: `REQUEST_${type}`,
        payload: JSON.stringify({
          approvalId: approval.id,
          type,
          note,
          details: payload,
          status: "PENDING",
        }),
        createdBy: tenantContext.userId,
      },
    });

    return NextResponse.json({
      message: "Đã gửi yêu cầu phê duyệt tới chủ hồ thành công.",
      approval,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi tạo yêu cầu" }, { status: 500 });
  }
}

