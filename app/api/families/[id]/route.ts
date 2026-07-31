import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const family = await prisma.family.findUnique({
    where: { id: params.id },
    include: { children: true },
  });
  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(family);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const {
    parentName, phone, email, address, addressLine2, city, state, zip,
    emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
  } = body;

  const family = await prisma.family.update({
    where: { id: params.id },
    data: {
      parentName, phone, email, address, addressLine2, city, state, zip,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
    },
  });

  return NextResponse.json(family);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.family.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
