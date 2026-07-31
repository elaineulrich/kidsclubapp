import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const child = await prisma.child.findUnique({
    where: { id: params.id },
    include: { family: true },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(child);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { childName, birthday, grade, medicalNotes, pickupRequired, pickupNotes, bestContactPhone, activeStatus } = body;

  const child = await prisma.child.update({
    where: { id: params.id },
    data: {
      childName,
      birthday: birthday ? new Date(birthday) : null,
      grade,
      medicalNotes,
      pickupRequired: !!pickupRequired,
      pickupNotes,
      bestContactPhone,
      activeStatus: activeStatus ?? undefined,
    },
  });

  return NextResponse.json(child);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.child.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
