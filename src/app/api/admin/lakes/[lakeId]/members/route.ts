// Next.js 13 Route Handler for Lake Membership Management

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

// GET – list members of a lake
export async function GET(request: Request, { params }: { params: Promise<{ lakeId: string }> }) {
  const { lakeId } = await params;
  const members = await prisma.membership.findMany({
    where: { lakeId },
    include: { user: true },
  });
  return NextResponse.json({ members });
}

// POST – add a member (owner/manager/staff)
export async function POST(request: Request, { params }: { params: Promise<{ lakeId: string }> }) {
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
  try {
    const membership = await prisma.membership.create({
      data: { userId: user.id, lakeId, role },
      include: { user: true },
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE – remove a member (by membership id)
export async function DELETE(request: Request, { params }: { params: Promise<{ lakeId: string }> }) {
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
}

