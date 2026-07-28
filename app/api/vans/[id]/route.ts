import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { vanName, driverId, capacity, activeStatus } = body;

  const van = await prisma.van.update({
    where: { id: params.id },
    data: {
      vanName,
      driverId: driverId === "" ? null : driverId,
      capacity: capacity ? Number(capacity) : undefined,
      activeStatus: activeStatus ?? undefined,
    },
  });

  return NextResponse.json(van);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.van.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
