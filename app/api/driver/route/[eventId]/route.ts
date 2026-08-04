import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgTimezone, classifyDay } from "@/lib/orgTime";
import { getOrSetCache } from "@/lib/redis";
import { driverRouteDetailKey } from "@/lib/driverRouteCache";
import { applyCheckAction, CheckAction } from "@/lib/attendanceSync";

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only the successful shape is cached - a 404 (no route yet) is never worth caching,
  // since it'd keep telling a driver they have no route even after one shows up.
  const result = await getOrSetCache(
    driverRouteDetailKey(params.eventId, session.user.id),
    8,
    () => buildRouteDetail(params.eventId, session.user.id)
  );

  if (!result) return NextResponse.json({ error: "No route assigned to you for this event" }, { status: 404 });
  return NextResponse.json(result);
}

async function buildRouteDetail(eventId: string, driverId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });

  if (!event || !driver) return null;

  const assignments = await prisma.routeAssignment.findMany({
    where: { eventId: event.id, driverId: driver.id },
    orderBy: { stopOrder: "asc" },
    include: { child: { include: { family: true } }, van: true },
  });

  if (assignments.length === 0) return null;

  const stops = assignments.map((a) => ({
    id: a.id,
    stopOrder: a.stopOrder,
    status: a.status,
    childId: a.childId,
    childName: a.child.childName,
    parentName: a.child.family.parentName,
    parentPhone: a.child.bestContactPhone || a.child.family.phone,
    address: [
      a.child.family.address,
      a.child.family.addressLine2,
      `${a.child.family.city}, ${a.child.family.state} ${a.child.family.zip}`,
    ].filter(Boolean).join(", "),
    pickupNotes: a.child.pickupNotes,
    vanName: a.van?.vanName ?? null,
  }));

  const timeZone = await getOrgTimezone();
  const timing = classifyDay(event.eventDate, timeZone);

  return {
    event,
    driver: { id: driver.id, name: driver.name },
    stops,
    timing,
    churchAddress: process.env.CHURCH_ADDRESS ?? "",
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { assignmentId, status } = body as {
    assignmentId: string;
    status: "PICKED_UP" | "COMPLETED" | "SKIPPED" | "ASSIGNED";
  };

  const assignment = await prisma.routeAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.driverId !== session.user.id || assignment.eventId !== params.eventId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const actionByStatus: Record<typeof status, CheckAction> = {
    PICKED_UP: "in",
    COMPLETED: "out",
    SKIPPED: "skip",
    ASSIGNED: "undo",
  };

  // Also keeps the shared Attendance record in sync (and busts this driver's cached
  // route) - a driver picking a child up from home, or dropping them back off, is the
  // same real-world event as the check-in desk marking them present or checked out.
  const { assignment: updated } = await applyCheckAction(params.eventId, assignment.childId, actionByStatus[status]);

  return NextResponse.json(updated);
}
