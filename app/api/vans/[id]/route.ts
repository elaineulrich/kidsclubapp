import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { syncVanDriverChange } from "@/lib/recurringEvents";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { vanName, driverId, capacity, activeStatus } = body;
  const newDriverId = driverId === "" ? null : driverId;

  const van = await prisma.van.update({
    where: { id: params.id },
    data: {
      vanName,
      driverId: newDriverId,
      capacity: capacity ? Number(capacity) : undefined,
      activeStatus: activeStatus ?? undefined,
    },
  });

  // Carries the new driver onto stops already published for this van, so an
  // existing route doesn't keep showing the van's previous driver until someone
  // happens to re-publish it.
  await syncVanDriverChange(params.id, newDriverId);

  return NextResponse.json(van);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.van.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
