import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { name, phone, email, loginCode, activeStatus, smsOptIn } = body;

  const driver = await prisma.driver.update({
    where: { id: params.id },
    data: {
      name,
      phone,
      email,
      loginCode: loginCode ? loginCode.trim().toUpperCase() : undefined,
      activeStatus: activeStatus ?? undefined,
      smsOptIn: smsOptIn ?? undefined,
    },
  });

  return NextResponse.json(driver);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.driver.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
