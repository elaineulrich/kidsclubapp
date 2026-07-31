import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { Role } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { name, role, activeStatus, password } = body;

  if (role && !Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      name,
      role: role ?? undefined,
      activeStatus: activeStatus ?? undefined,
      ...(password
        ? {
            passwordHash: await bcrypt.hash(password, 10),
            passwordSetAt: new Date(),
            inviteTokenHash: null,
            inviteTokenExpiresAt: null,
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activeStatus: true,
      createdDate: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireRole(["ADMIN"]);
  if (error) return error;

  if (session.user.id === params.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
