import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

// GET: returns vans with their current stop list for this event, plus
// unassigned pickup-required children with a suggested van based on the
// child's most recent prior route assignment (recurring transportation).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const vans = await prisma.van.findMany({
    where: { activeStatus: true },
    include: {
      driver: true,
      routeAssignments: {
        where: { eventId: params.id },
        orderBy: { stopOrder: "asc" },
        include: { child: { include: { family: true } } },
      },
    },
    orderBy: { vanName: "asc" },
  });

  const assignedChildIds = new Set(
    vans.flatMap((v) => v.routeAssignments.map((a) => a.childId))
  );

  const pickupChildren = await prisma.child.findMany({
    where: { activeStatus: true, pickupRequired: true },
    include: { family: true },
    orderBy: { childName: "asc" },
  });

  const unassigned = [];
  for (const child of pickupChildren) {
    if (assignedChildIds.has(child.id)) continue;

    const previous = await prisma.routeAssignment.findFirst({
      where: { childId: child.id, vanId: { not: null }, eventId: { not: params.id } },
      orderBy: { event: { eventDate: "desc" } },
      include: { van: { include: { driver: true } } },
    });

    unassigned.push({
      childId: child.id,
      childName: child.childName,
      parentName: child.family.parentName,
      pickupNotes: child.pickupNotes,
      address: `${child.family.address}, ${child.family.city}, ${child.family.state} ${child.family.zip}`,
      suggestedVanId: previous?.vanId ?? null,
      suggestedVanName: previous?.van?.vanName ?? null,
    });
  }

  return NextResponse.json({ event, vans, unassigned });
}

// POST: upsert route assignments for this event.
// body: { assignments: [{ childId, vanId, driverId, stopOrder }], unassign: [childId, ...] }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const assignments: { childId: string; vanId: string; driverId?: string | null; stopOrder: number }[] =
    body.assignments ?? [];
  const unassign: string[] = body.unassign ?? [];

  await prisma.$transaction(async (tx) => {
    for (const childId of unassign) {
      await tx.routeAssignment.deleteMany({ where: { eventId: params.id, childId } });
    }

    for (const a of assignments) {
      const van = a.vanId ? await tx.van.findUnique({ where: { id: a.vanId } }) : null;

      await tx.routeAssignment.upsert({
        where: { eventId_childId: { eventId: params.id, childId: a.childId } },
        create: {
          eventId: params.id,
          childId: a.childId,
          vanId: a.vanId || null,
          driverId: van?.driverId ?? a.driverId ?? null,
          stopOrder: a.stopOrder,
          status: "ASSIGNED",
        },
        update: {
          vanId: a.vanId || null,
          driverId: van?.driverId ?? a.driverId ?? null,
          stopOrder: a.stopOrder,
          status: "ASSIGNED",
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
