import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

// GET: returns vans with their current stop list for this event, plus every active
// pickup-required child with a suggested van based on their default van (falls
// back to their most recent prior assignment if they don't have a default set).
// This includes children who ARE currently assigned - the admin page filters
// those out client-side against its own live edit state, so removing someone
// from a van shows them back in "Unassigned" immediately, without needing to
// publish and reload to see the server's view catch up.
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

  const pickupChildren = await prisma.child.findMany({
    where: { activeStatus: true, pickupRequired: true },
    include: { family: true, defaultVan: true },
    orderBy: { childName: "asc" },
  });

  const unassigned = [];
  for (const child of pickupChildren) {
    let suggestedVanId = child.defaultVanId;
    let suggestedVanName = child.defaultVan?.vanName ?? null;

    if (!suggestedVanId) {
      const previous = await prisma.routeAssignment.findFirst({
        where: { childId: child.id, vanId: { not: null }, eventId: { not: params.id } },
        orderBy: { event: { eventDate: "desc" } },
        include: { van: true },
      });
      suggestedVanId = previous?.vanId ?? null;
      suggestedVanName = previous?.van?.vanName ?? null;
    }

    unassigned.push({
      childId: child.id,
      childName: child.childName,
      parentName: child.family.parentName,
      pickupNotes: child.pickupNotes,
      address: [
        child.family.address,
        child.family.addressLine2,
        `${child.family.city}, ${child.family.state} ${child.family.zip}`,
      ].filter(Boolean).join(", "),
      suggestedVanId,
      suggestedVanName,
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
