import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withLakeQuota } from "@/lib/subscription-guard";
import { Role } from "@/generated/prisma/client";
import { AuthenticationError, ForbiddenError, requireSuperAdmin } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET – list members of a lake
export async function GET(request: Request, { params }: { params: Promise<{ lakeId: string }> }) {
  try {
    await requireSuperAdmin();
    const { lakeId } = await params;
    const members = await prisma.membership.findMany({
      where: { lakeId },
      include: { user: true },
    });
    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Lỗi hệ thống khi tải thành viên hồ." }, { status: 500 });
  }
}

// POST – add a member (owner/manager/staff)
export async function POST(request: Request, { params }: { params: Promise<{ lakeId: string }> }) {
  try {
    await requireSuperAdmin();
    const { lakeId } = await params;
    const { email, role } = await request.json();
    if (!email || ![Role.OWNER, Role.MANAGER, Role.STAFF].includes(role)) {
      return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }
    // Find user by email (must exist)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const membership = await withLakeQuota(lakeId, role === Role.OWNER ? "owner" : "staff", async (tx) => {
      if (role === Role.OWNER && await tx.membership.findFirst({ where: { lakeId, role: Role.OWNER, deletedAt: null } })) {
        throw new ForbiddenError("Lake already has an OWNER");
      }
      return tx.membership.create({ data: { userId: user.id, lakeId, role },
        include: { user: { select: { id: true, name: true, email: true } } } });
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    const message = error instanceof Error ? error.message : "Lỗi thêm thành viên";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE – remove a member (by membership id)
export async function DELETE(request: Request, { params }: { params: Promise<{ lakeId: string }> }) {
  try {
    await requireSuperAdmin();
    const { lakeId } = await params;
    const { membershipId } = await request.json();
    if (!membershipId) {
      return NextResponse.json({ error: "membershipId required" }, { status: 400 });
    }
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.lakeId !== lakeId) {
      return NextResponse.json({ error: "Membership not found for this lake" }, { status: 404 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: membershipId }, data: { deletedAt: new Date() } });
      await tx.user.update({ where: { id: membership.userId }, data: { sessionVersion: { increment: 1 } } });
    });
    return NextResponse.json({ message: "Removed" });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Lỗi xóa thành viên" }, { status: 500 });
  }
}
