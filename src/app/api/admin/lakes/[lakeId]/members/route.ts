import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    if (!email || !role) {
      return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }
    // Find user by email (must exist)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Enforce single OWNER rule
    if (role === Role.OWNER) {
      const existingOwner = await prisma.membership.findFirst({
        where: { lakeId, role: Role.OWNER },
      });
      if (existingOwner) {
        return NextResponse.json({ error: "Lake already has an OWNER" }, { status: 400 });
      }
    }
    // Create membership (unique constraint prevents duplicate user‑lake pair)
    const membership = await prisma.membership.create({
      data: { userId: user.id, lakeId, role },
      include: { user: true },
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
    await prisma.membership.delete({ where: { id: membershipId } });
    return NextResponse.json({ message: "Removed" });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Lỗi xóa thành viên" }, { status: 500 });
  }
}
